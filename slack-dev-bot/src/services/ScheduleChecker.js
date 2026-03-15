const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

// 예약 체크 후 재트리거 방지 쿨다운 (10분)
const RESERVATION_COOLDOWN_MS = 10 * 60 * 1000;

class ScheduleChecker {
  /**
   * @param {object} options
   * @param {import('./SupabaseService')} options.supabaseService
   * @param {import('./GitHubActionsService')} options.githubService
   * @param {import('./SsmService')} [options.ssmService] - SSM 상태 조회용 (선택)
   * @param {import('@slack/bolt').App} [options.slackApp] - 알림 전송용 (선택)
   * @param {string} [options.alertChannelId] - 알림 채널 ID (선택)
   */
  constructor({ supabaseService, githubService, ssmService, slackApp, alertChannelId }) {
    this.supabase = supabaseService;
    this.github = githubService;
    this.ssm = ssmService || null;
    this.slackApp = slackApp;
    this.alertChannelId = alertChannelId;

    // 예약 체크 중복 트리거 방지용 (in-memory)
    this._lastReservationAction = null; // 'start' | 'stop'
    this._lastReservationTriggerAt = 0;
  }

  /**
   * 활성화된 스케줄과 예약을 확인하고, 조건에 맞으면 GitHub Actions를 트리거한다.
   * EventBridge rate(1 minute)로 호출됨.
   */
  async run() {
    // 반복 스케줄 체크 (기존)
    await this._checkSchedules();

    // 예약 기반 자동 실행 체크
    await this._checkReservations();
  }

  /**
   * dev_schedules 기반 반복 스케줄을 확인한다. (기존 로직)
   */
  async _checkSchedules() {
    const schedules = await this.supabase.getEnabledSchedules();
    const now = new Date();

    for (const schedule of schedules) {
      try {
        if (this._shouldExecute(schedule, now)) {
          console.log(`[ScheduleChecker] 스케줄 실행: ${schedule.id} (${schedule.action})`);
          await this.github.triggerWorkflow(schedule.action);
          await this.supabase.markScheduleExecuted(schedule.id);
          await this._notify(schedule);
        }
      } catch (error) {
        console.error(`[ScheduleChecker] 스케줄 ${schedule.id} 실행 실패:`, error.message);
      }
    }
  }

  /**
   * dev_reservations 기반 예약을 확인하여 환경 시작/중지를 트리거한다.
   *
   * 로직:
   * - 현재 활성 예약이 있고 환경이 stopped → check-reservations 트리거 (시작)
   * - 현재 활성 예약이 없고 환경이 running → check-reservations 트리거 (중지)
   * - 쿨다운 내 동일 액션 재트리거 방지
   */
  async _checkReservations() {
    if (!this.ssm) {
      console.log('[ScheduleChecker] SSM 서비스 없음 — 예약 체크 스킵');
      return;
    }

    try {
      const [reservations, envStatus] = await Promise.all([
        this.supabase.getReservationsDueNow(),
        this.ssm.getEnvStatus(),
      ]);

      const state = envStatus.status; // 'running' | 'stopped' | 'unknown'
      const hasActiveReservations = reservations.length > 0;
      let neededAction = null;

      if (hasActiveReservations && state === 'stopped') {
        neededAction = 'start';
      } else if (!hasActiveReservations && state === 'running') {
        neededAction = 'stop';
      }

      if (!neededAction) return;

      // 쿨다운 체크: 동일 액션을 최근에 이미 트리거했으면 스킵
      const now = Date.now();
      if (
        this._lastReservationAction === neededAction &&
        now - this._lastReservationTriggerAt < RESERVATION_COOLDOWN_MS
      ) {
        console.log(`[ScheduleChecker] 예약 체크: ${neededAction} 쿨다운 중 — 스킵`);
        return;
      }

      console.log(
        `[ScheduleChecker] 예약 체크: 활성 예약 ${reservations.length}건, ` +
        `SSM 상태=${state} → ${neededAction} 트리거`
      );

      // check-reservations가 아닌 start/stop을 직접 트리거
      // (workflow의 check-reservations는 workflow_dispatch에서 skip_check=true로 동작하지 않음)
      await this.github.triggerWorkflow(neededAction);

      this._lastReservationAction = neededAction;
      this._lastReservationTriggerAt = now;

      await this._notifyReservation(neededAction, reservations);
    } catch (error) {
      console.error('[ScheduleChecker] 예약 체크 실패:', error.message);
    }
  }

  /**
   * 현재 시각이 스케줄 실행 조건에 맞는지 확인한다.
   * @param {object} schedule
   * @param {Date} now
   * @returns {boolean}
   */
  _shouldExecute(schedule, now) {
    const tz = schedule.timezone || 'Asia/Seoul';

    // 현재 시각을 스케줄 타임존으로 변환
    const localParts = this._getLocalTimeParts(now, tz);

    // 요일 확인 (0=일, 1=월, ..., 6=토)
    if (!schedule.days_of_week.includes(localParts.dayOfWeek)) {
      return false;
    }

    // 시간 확인 (1분 이내 매칭)
    const [scheduleHour, scheduleMinute] = schedule.time_utc.split(':').map(Number);
    if (localParts.hour !== scheduleHour || localParts.minute !== scheduleMinute) {
      return false;
    }

    // 최근 2분 이내 실행된 적 있으면 스킵 (중복 방지)
    if (schedule.last_executed_at) {
      const lastExecuted = new Date(schedule.last_executed_at);
      const diffMs = now.getTime() - lastExecuted.getTime();
      if (diffMs < 2 * 60 * 1000) {
        return false;
      }
    }

    return true;
  }

  /**
   * 특정 타임존의 현재 시간 구성요소를 반환한다.
   */
  _getLocalTimeParts(date, timezone) {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
      weekday: 'short',
    });

    const parts = formatter.formatToParts(date);
    const hour = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
    const minute = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);

    // dayOfWeek: 0=일, 1=월, ..., 6=토
    const weekdayStr = parts.find((p) => p.type === 'weekday')?.value || '';
    const weekdayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const dayOfWeek = weekdayMap[weekdayStr] ?? new Date().getDay();

    return { hour, minute, dayOfWeek };
  }

  /**
   * 스케줄 실행 알림을 Slack 채널로 전송한다.
   */
  async _notify(schedule) {
    const channelId = schedule.notify_channel_id || this.alertChannelId;
    if (!channelId || !this.slackApp) return;

    try {
      const actionLabel = schedule.action === 'start' ? '시작' : '중지';
      const days = schedule.days_of_week.map((d) => DAY_NAMES[d]).join(', ');
      await this.slackApp.client.chat.postMessage({
        channel: channelId,
        text: `:clock1: 반복 스케줄에 의해 Dev 환경 *${actionLabel}* 트리거됨\n` +
          `> ${days} ${schedule.time_utc} (${schedule.timezone})` +
          (schedule.description ? `\n> ${schedule.description}` : ''),
      });
    } catch (error) {
      console.error('[ScheduleChecker] 알림 전송 실패 (무시됨):', error.message);
    }
  }

  /**
   * 예약 기반 트리거 알림을 Slack 채널로 전송한다.
   */
  async _notifyReservation(action, reservations) {
    if (!this.alertChannelId || !this.slackApp) return;

    try {
      const actionLabel = action === 'start' ? '시작' : '중지';
      const reserverList = reservations
        .map((r) => `<@${r.reserved_by}>`)
        .join(', ');

      const text = action === 'start'
        ? `:calendar: 예약에 의해 Dev 환경 *${actionLabel}* 트리거됨\n> 예약자: ${reserverList} (${reservations.length}건)`
        : `:calendar: 활성 예약 없음 — Dev 환경 *${actionLabel}* 트리거됨`;

      await this.slackApp.client.chat.postMessage({
        channel: this.alertChannelId,
        text,
      });
    } catch (error) {
      console.error('[ScheduleChecker] 예약 알림 전송 실패 (무시됨):', error.message);
    }
  }
}

module.exports = ScheduleChecker;
