const { createClient } = require('@supabase/supabase-js');

class SupabaseService {
  /**
   * @param {string} url - Supabase 프로젝트 URL
   * @param {string} serviceRoleKey - Supabase Service Role Key
   */
  constructor(url, serviceRoleKey) {
    this.supabase = createClient(url, serviceRoleKey);
  }

  // ──────────────────────────────────────────
  // dev_reservations
  // ──────────────────────────────────────────

  /**
   * 활성 예약 목록을 조회한다.
   */
  async getActiveReservations() {
    const { data, error } = await this.supabase
      .from('dev_reservations')
      .select('*')
      .eq('status', 'active')
      .order('start_time', { ascending: true });
    if (error) throw error;
    return data || [];
  }

  /**
   * 예약을 생성한다.
   * @param {{ reserved_by: string, start_time: string, end_time: string, reason: string }} reservation
   */
  async createReservation(reservation) {
    const { data, error } = await this.supabase
      .from('dev_reservations')
      .insert(reservation)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  /**
   * 현재 시점 기준으로 활성이어야 할 예약을 조회한다.
   * start_time이 5분 이내이고, end_time이 아직 안 지났거나 없는 예약.
   */
  async getReservationsDueNow() {
    const now = new Date().toISOString();
    const soon = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    const { data, error } = await this.supabase
      .from('dev_reservations')
      .select('id,reserved_by,start_time,end_time')
      .eq('status', 'active')
      .lte('start_time', soon)
      .or(`end_time.gt.${now},end_time.is.null`);
    if (error) throw error;
    return data || [];
  }

  /**
   * 예약을 취소한다.
   * @param {string} id - 예약 ID
   */
  async cancelReservation(id) {
    const { error } = await this.supabase
      .from('dev_reservations')
      .update({ status: 'cancelled' })
      .eq('id', id);
    if (error) throw error;
  }

  // ──────────────────────────────────────────
  // pending_deployments
  // ──────────────────────────────────────────

  /**
   * 대기 중인 배포 목록을 조회한다.
   */
  async getPendingDeployments() {
    const { data, error } = await this.supabase
      .from('pending_deployments')
      .select('*')
      .in('status', ['queued', 'deploying'])
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  }

  // ──────────────────────────────────────────
  // dev_schedules
  // ──────────────────────────────────────────

  /**
   * 전체 스케줄 목록을 조회한다.
   */
  async getSchedules() {
    const { data, error } = await this.supabase
      .from('dev_schedules')
      .select('*')
      .order('time_utc', { ascending: true });
    if (error) throw error;
    return data || [];
  }

  /**
   * 활성화된 스케줄만 조회한다.
   */
  async getEnabledSchedules() {
    const { data, error } = await this.supabase
      .from('dev_schedules')
      .select('*')
      .eq('is_enabled', true);
    if (error) throw error;
    return data || [];
  }

  /**
   * 스케줄을 생성한다.
   * @param {object} schedule
   */
  async createSchedule(schedule) {
    const { data, error } = await this.supabase
      .from('dev_schedules')
      .insert(schedule)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  /**
   * 스케줄 활성화/비활성화를 토글한다.
   * @param {string} id
   * @param {boolean} isEnabled
   */
  async toggleSchedule(id, isEnabled) {
    const { error } = await this.supabase
      .from('dev_schedules')
      .update({ is_enabled: isEnabled, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  }

  /**
   * 스케줄을 삭제한다.
   * @param {string} id
   */
  async deleteSchedule(id) {
    const { error } = await this.supabase
      .from('dev_schedules')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }

  /**
   * 스케줄 실행 시각을 기록한다.
   * @param {string} id
   */
  async markScheduleExecuted(id) {
    const { error } = await this.supabase
      .from('dev_schedules')
      .update({ last_executed_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  }

  // ──────────────────────────────────────────
  // uat1_reservations (UAT1 환경 예약)
  //
  // 스키마: id UUID, reservation_date DATE, reserved_by, reserved_via,
  // reason, status (active/cancelled/completed), created_at, updated_at,
  // cancelled_at, cancelled_by
  // 제약: chk_weekday_only (월~금만), chk_status_enum,
  //       uq_uat1_active_per_day (1일 1 active)
  // ──────────────────────────────────────────

  /**
   * UAT1 활성 예약 목록을 조회한다.
   * @param {string} [tableName] - 기본 'uat1_reservations'. env 로 override 가능.
   */
  async getActiveUat1Reservations(tableName = 'uat1_reservations') {
    const { data, error } = await this.supabase
      .from(tableName)
      .select('*')
      .eq('status', 'active')
      .order('reservation_date', { ascending: true });
    if (error) throw error;
    return data || [];
  }

  /**
   * UAT1 예약 단건 조회 (ID).
   * @param {string} id
   * @param {string} [tableName]
   */
  async getUat1Reservation(id, tableName = 'uat1_reservations') {
    const { data, error } = await this.supabase
      .from(tableName)
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data || null;
  }

  /**
   * UAT1 예약을 생성한다.
   * @param {{ reservation_date: string, reserved_by: string, reserved_via?: string, reason?: string }} reservation
   * @param {string} [tableName]
   */
  async createUat1Reservation(reservation, tableName = 'uat1_reservations') {
    const payload = {
      reservation_date: reservation.reservation_date,
      reserved_by: reservation.reserved_by,
      reserved_via: reservation.reserved_via || 'slack',
      reason: reservation.reason || null,
      status: 'active',
    };
    const { data, error } = await this.supabase
      .from(tableName)
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  /**
   * UAT1 예약을 취소한다.
   * @param {string} id - 예약 ID
   * @param {string} [cancelledBy] - 취소한 Slack user_id
   * @param {string} [tableName]
   */
  async cancelUat1Reservation(id, cancelledBy = null, tableName = 'uat1_reservations') {
    const patch = {
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
    };
    if (cancelledBy) patch.cancelled_by = cancelledBy;
    const { error } = await this.supabase
      .from(tableName)
      .update(patch)
      .eq('id', id);
    if (error) throw error;
  }
}

module.exports = SupabaseService;
