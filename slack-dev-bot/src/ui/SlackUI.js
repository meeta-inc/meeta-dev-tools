const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

// EC2 인스턴스 상태별 표시 정보
const EC2_STATE_DISPLAY = {
  running: { label: 'Running', emoji: ':large_green_circle:' },
  stopped: { label: 'Stopped', emoji: ':red_circle:' },
  pending: { label: 'Starting...', emoji: ':hourglass_flowing_sand:' },
  stopping: { label: 'Stopping...', emoji: ':hourglass_flowing_sand:' },
  'shutting-down': { label: 'Shutting down', emoji: ':warning:' },
  terminated: { label: 'Terminated', emoji: ':skull:' },
  unknown: { label: 'Unknown', emoji: ':grey_question:' },
};

// Dev 환경 상태별 표시 정보
const ENV_STATUS_DISPLAY = {
  running: { label: 'Running', emoji: ':large_green_circle:' },
  stopped: { label: 'Stopped', emoji: ':red_circle:' },
  starting: { label: 'Starting...', emoji: ':hourglass_flowing_sand:' },
  stopping: { label: 'Stopping...', emoji: ':hourglass_flowing_sand:' },
  deploying: { label: 'Deploying...', emoji: ':rocket:' },
  unknown: { label: 'Unknown', emoji: ':grey_question:' },
};

class SlackUI {
  // ──────────────────────────────────────────
  // /dev status — 메인 상태 뷰
  // ──────────────────────────────────────────

  /**
   * 환경 상태 + 예약 + 배포 현황을 하나의 메시지로 생성한다.
   */
  statusView(envStatus, reservations, deployments) {
    const display = ENV_STATUS_DISPLAY[envStatus.status] || ENV_STATUS_DISPLAY.unknown;
    const blocks = [];

    // 헤더
    blocks.push(
      { type: 'header', text: { type: 'plain_text', text: 'Dev Environment Manager' } },
      { type: 'divider' },
    );

    // 환경 상태 섹션
    let statusText = `${display.emoji} *환경 상태:* ${display.label}`;
    if (envStatus.lastAction) {
      statusText += `\n:memo: 마지막 작업: \`${envStatus.lastAction}\``;
      if (envStatus.lastActionTime) statusText += ` (${envStatus.lastActionTime})`;
      if (envStatus.lastActionBy) statusText += ` by ${envStatus.lastActionBy}`;
    }
    blocks.push({ type: 'section', text: { type: 'mrkdwn', text: statusText } });

    // Start / Stop 버튼
    blocks.push({
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: 'Start' },
          style: 'primary',
          action_id: 'dev_start',
          confirm: {
            title: { type: 'plain_text', text: 'Dev 환경 시작' },
            text: { type: 'mrkdwn', text: 'Dev 환경을 *시작*하시겠습니까?\nGitHub Actions workflow가 트리거됩니다.' },
            confirm: { type: 'plain_text', text: 'Start' },
            deny: { type: 'plain_text', text: 'Cancel' },
          },
        },
        {
          type: 'button',
          text: { type: 'plain_text', text: 'Stop' },
          style: 'danger',
          action_id: 'dev_stop',
          confirm: {
            title: { type: 'plain_text', text: 'Dev 환경 중지' },
            text: { type: 'mrkdwn', text: 'Dev 환경을 *중지*하시겠습니까?\nGitHub Actions workflow가 트리거됩니다.' },
            confirm: { type: 'plain_text', text: 'Stop' },
            deny: { type: 'plain_text', text: 'Cancel' },
          },
        },
        {
          type: 'button',
          text: { type: 'plain_text', text: 'Refresh' },
          action_id: 'dev_refresh',
        },
      ],
    });

    // 활성 예약 섹션
    blocks.push({ type: 'divider' });
    if (reservations.length > 0) {
      blocks.push({
        type: 'section',
        text: { type: 'mrkdwn', text: `:calendar: *활성 예약* (${reservations.length}건)` },
      });
      for (const r of reservations.slice(0, 5)) {
        const startTime = this._formatTime(r.start_time);
        const endTime = r.end_time ? ` ~ ${this._formatTime(r.end_time)}` : '';
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `> *${startTime}${endTime}*\n> ${r.reason || '(사유 없음)'} — <@${r.reserved_by}>`,
          },
        });
      }
    } else {
      blocks.push({
        type: 'section',
        text: { type: 'mrkdwn', text: ':calendar: *활성 예약:* 없음' },
      });
    }

    // 대기 배포 섹션
    if (deployments.length > 0) {
      blocks.push({ type: 'divider' });
      blocks.push({
        type: 'section',
        text: { type: 'mrkdwn', text: `:package: *대기 배포* (${deployments.length}건)` },
      });
      for (const d of deployments.slice(0, 5)) {
        const createdAt = this._formatTime(d.created_at);
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `> \`${d.branch || d.action || 'N/A'}\` — ${d.status} (${createdAt})`,
          },
        });
      }
    }

    return blocks;
  }

  // ──────────────────────────────────────────
  // /dev reserve — 예약 생성 모달
  // ──────────────────────────────────────────

  reserveModal(channelId) {
    return {
      type: 'modal',
      callback_id: 'dev_reserve_modal',
      private_metadata: channelId || '',
      title: { type: 'plain_text', text: 'Dev 환경 예약' },
      submit: { type: 'plain_text', text: '예약하기' },
      close: { type: 'plain_text', text: '취소' },
      blocks: [
        {
          type: 'input',
          block_id: 'start_date',
          element: {
            type: 'datepicker',
            action_id: 'start_date_input',
            placeholder: { type: 'plain_text', text: '시작 날짜' },
          },
          label: { type: 'plain_text', text: '시작 날짜' },
        },
        {
          type: 'input',
          block_id: 'start_time',
          element: {
            type: 'timepicker',
            action_id: 'start_time_input',
            placeholder: { type: 'plain_text', text: '시작 시간' },
          },
          label: { type: 'plain_text', text: '시작 시간 (KST)' },
        },
        {
          type: 'input',
          block_id: 'end_date',
          element: {
            type: 'datepicker',
            action_id: 'end_date_input',
            placeholder: { type: 'plain_text', text: '종료 날짜' },
          },
          label: { type: 'plain_text', text: '종료 날짜' },
          optional: true,
        },
        {
          type: 'input',
          block_id: 'end_time',
          element: {
            type: 'timepicker',
            action_id: 'end_time_input',
            placeholder: { type: 'plain_text', text: '종료 시간' },
          },
          label: { type: 'plain_text', text: '종료 시간 (KST)' },
          optional: true,
        },
        {
          type: 'input',
          block_id: 'reason',
          element: {
            type: 'plain_text_input',
            action_id: 'reason_input',
            placeholder: { type: 'plain_text', text: '예약 사유를 입력하세요' },
          },
          label: { type: 'plain_text', text: '사유' },
          optional: true,
        },
      ],
    };
  }

  // ──────────────────────────────────────────
  // /dev cancel — 예약 취소 목록
  // ──────────────────────────────────────────

  cancelList(reservations) {
    if (reservations.length === 0) {
      return [
        { type: 'section', text: { type: 'mrkdwn', text: ':calendar: 취소할 수 있는 활성 예약이 없습니다.' } },
      ];
    }

    const blocks = [
      { type: 'header', text: { type: 'plain_text', text: '예약 취소' } },
      { type: 'divider' },
    ];

    for (const r of reservations) {
      const startTime = this._formatTime(r.start_time);
      const endTime = r.end_time ? ` ~ ${this._formatTime(r.end_time)}` : '';
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${startTime}${endTime}*\n${r.reason || '(사유 없음)'} — <@${r.reserved_by}>`,
        },
        accessory: {
          type: 'button',
          text: { type: 'plain_text', text: '취소' },
          style: 'danger',
          action_id: `dev_cancel_${r.id}`,
          confirm: {
            title: { type: 'plain_text', text: '예약 취소' },
            text: { type: 'mrkdwn', text: '이 예약을 취소하시겠습니까?' },
            confirm: { type: 'plain_text', text: '취소하기' },
            deny: { type: 'plain_text', text: '돌아가기' },
          },
        },
      });
    }

    return blocks;
  }

  // ──────────────────────────────────────────
  // /dev schedule — 반복 스케줄 목록
  // ──────────────────────────────────────────

  scheduleList(schedules) {
    const blocks = [
      { type: 'header', text: { type: 'plain_text', text: '반복 스케줄 관리' } },
      { type: 'divider' },
    ];

    if (schedules.length === 0) {
      blocks.push({
        type: 'section',
        text: { type: 'mrkdwn', text: ':clock1: 등록된 반복 스케줄이 없습니다.' },
      });
    } else {
      for (const s of schedules) {
        const actionLabel = s.action === 'start' ? ':arrow_forward: Start' : ':stop_button: Stop';
        const days = s.days_of_week.map((d) => DAY_NAMES[d]).join(', ');
        const enabledLabel = s.is_enabled ? ':white_check_mark: 활성' : ':no_entry_sign: 비활성';
        const desc = s.description ? `\n> ${s.description}` : '';
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `${actionLabel} — *${days}* ${s.time_utc} (${s.timezone})\n${enabledLabel} | <@${s.created_by}>${desc}`,
          },
        });
        blocks.push({
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: { type: 'plain_text', text: s.is_enabled ? '비활성화' : '활성화' },
              action_id: `dev_schedule_toggle_${s.id}`,
              value: String(!s.is_enabled),
            },
            {
              type: 'button',
              text: { type: 'plain_text', text: '삭제' },
              style: 'danger',
              action_id: `dev_schedule_delete_${s.id}`,
              confirm: {
                title: { type: 'plain_text', text: '스케줄 삭제' },
                text: { type: 'mrkdwn', text: '이 반복 스케줄을 삭제하시겠습니까?' },
                confirm: { type: 'plain_text', text: '삭제' },
                deny: { type: 'plain_text', text: '취소' },
              },
            },
          ],
        });
      }
    }

    // 추가 버튼
    blocks.push({ type: 'divider' });
    blocks.push({
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: '+ 스케줄 추가' },
          style: 'primary',
          action_id: 'dev_schedule_add',
        },
      ],
    });

    return blocks;
  }

  // ──────────────────────────────────────────
  // 스케줄 추가 모달
  // ──────────────────────────────────────────

  scheduleModal() {
    return {
      type: 'modal',
      callback_id: 'dev_schedule_modal',
      title: { type: 'plain_text', text: '반복 스케줄 추가' },
      submit: { type: 'plain_text', text: '추가하기' },
      close: { type: 'plain_text', text: '취소' },
      blocks: [
        {
          type: 'input',
          block_id: 'action',
          element: {
            type: 'static_select',
            action_id: 'action_input',
            placeholder: { type: 'plain_text', text: '액션 선택' },
            options: [
              { text: { type: 'plain_text', text: 'Start (환경 시작)' }, value: 'start' },
              { text: { type: 'plain_text', text: 'Stop (환경 중지)' }, value: 'stop' },
            ],
          },
          label: { type: 'plain_text', text: '액션' },
        },
        {
          type: 'input',
          block_id: 'days_of_week',
          element: {
            type: 'checkboxes',
            action_id: 'days_input',
            options: [
              { text: { type: 'plain_text', text: '월요일' }, value: '1' },
              { text: { type: 'plain_text', text: '화요일' }, value: '2' },
              { text: { type: 'plain_text', text: '수요일' }, value: '3' },
              { text: { type: 'plain_text', text: '목요일' }, value: '4' },
              { text: { type: 'plain_text', text: '금요일' }, value: '5' },
              { text: { type: 'plain_text', text: '토요일' }, value: '6' },
              { text: { type: 'plain_text', text: '일요일' }, value: '0' },
            ],
          },
          label: { type: 'plain_text', text: '요일 선택' },
        },
        {
          type: 'input',
          block_id: 'time',
          element: {
            type: 'timepicker',
            action_id: 'time_input',
            placeholder: { type: 'plain_text', text: '시간 선택' },
          },
          label: { type: 'plain_text', text: '실행 시간 (KST)' },
        },
        {
          type: 'input',
          block_id: 'description',
          element: {
            type: 'plain_text_input',
            action_id: 'description_input',
            placeholder: { type: 'plain_text', text: '스케줄 설명 (예: 업무 시간 자동 시작)' },
          },
          label: { type: 'plain_text', text: '설명' },
          optional: true,
        },
      ],
    };
  }

  // ──────────────────────────────────────────
  // 결과 메시지
  // ──────────────────────────────────────────

  resultMessage(action, success, error) {
    const actionLabels = {
      start: '환경 시작',
      stop: '환경 중지',
      reserve: '예약 생성',
      cancel: '예약 취소',
      schedule_add: '스케줄 추가',
      schedule_toggle: '스케줄 상태 변경',
      schedule_delete: '스케줄 삭제',
    };
    const label = actionLabels[action] || action;

    if (success) {
      return [
        { type: 'section', text: { type: 'mrkdwn', text: `:white_check_mark: *${label}* 요청 완료` } },
      ];
    }

    return [
      { type: 'section', text: { type: 'mrkdwn', text: `:x: *${label}* 실패\n\`\`\`${error}\`\`\`` } },
    ];
  }

  /**
   * 예약 생성 결과 메시지 (상세 내용 포함)
   */
  reserveResultMessage(userId, startTime, endTime, reason, success, error) {
    if (!success) {
      return [{ type: 'section', text: { type: 'mrkdwn', text: `:x: *예약 생성* 실패\n\`\`\`${error}\`\`\`` } }];
    }

    const endText = endTime ? ` ~ ${this._formatTime(endTime)}` : '';
    return [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `:white_check_mark: *예약이 생성되었습니다*\n` +
            `> :calendar: *${this._formatTime(startTime)}${endText}*\n` +
            `> :bust_in_silhouette: <@${userId}>` +
            (reason ? `\n> :memo: ${reason}` : ''),
        },
      },
    ];
  }

  // ──────────────────────────────────────────
  // 감사 로그
  // ──────────────────────────────────────────

  alertMessage(userId, action) {
    const actionLabels = { start: '시작', stop: '중지' };
    const label = actionLabels[action] || action;
    return [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `:memo: <@${userId}>님이 Dev 환경을 *${label}*했습니다.`,
        },
      },
    ];
  }

  // ──────────────────────────────────────────
  // /dev help
  // ──────────────────────────────────────────

  helpMessage() {
    return [
      { type: 'header', text: { type: 'plain_text', text: '/dev 사용법' } },
      { type: 'divider' },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: [
            '*기본 명령어*',
            '`/dev` 또는 `/dev status` — 환경 상태 + 예약 + 배포 현황',
            '`/dev start` — Dev 환경 시작 (GitHub Actions 트리거)',
            '`/dev stop` — Dev 환경 중지 (GitHub Actions 트리거)',
            '',
            '*예약 관리*',
            '`/dev reserve` — 시간 예약 생성 (모달)',
            '`/dev cancel` — 활성 예약 취소',
            '',
            '*반복 스케줄*',
            '`/dev schedule` — 반복 스케줄 목록 + 관리',
            '',
            '`/dev help` — 이 도움말 표시',
          ].join('\n'),
        },
      },
    ];
  }

  // ──────────────────────────────────────────
  // /ec2 — EC2 인스턴스 목록
  // ──────────────────────────────────────────

  ec2InstanceList(instances) {
    const blocks = [
      { type: 'header', text: { type: 'plain_text', text: 'EC2 Instance Manager' } },
      { type: 'divider' },
    ];

    for (const inst of instances) {
      const display = EC2_STATE_DISPLAY[inst.state] || EC2_STATE_DISPLAY.unknown;
      const isTransitioning = inst.state === 'pending' || inst.state === 'stopping';
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `${inst.emoji} *${inst.name}*\n${inst.description}\n${display.emoji} ${display.label}`,
        },
        accessory: this._ec2ActionButton(inst, isTransitioning),
      });
    }

    blocks.push({ type: 'divider' });
    blocks.push({
      type: 'actions',
      elements: [{ type: 'button', text: { type: 'plain_text', text: 'Refresh' }, action_id: 'ec2_refresh' }],
    });

    return blocks;
  }

  _ec2ActionButton(inst, isTransitioning) {
    if (isTransitioning) {
      const label = inst.state === 'pending' ? 'Starting...' : 'Stopping...';
      return { type: 'button', text: { type: 'plain_text', text: label }, action_id: `ec2_wait_${inst.instanceId}` };
    }
    if (inst.state === 'stopped') {
      return {
        type: 'button', text: { type: 'plain_text', text: 'Start' }, style: 'primary',
        action_id: `ec2_start_${inst.instanceId}`, value: inst.name,
        confirm: {
          title: { type: 'plain_text', text: 'Confirm Start' },
          text: { type: 'mrkdwn', text: `*${inst.name}* 인스턴스를 시작하시겠습니까?` },
          confirm: { type: 'plain_text', text: 'Start' }, deny: { type: 'plain_text', text: 'Cancel' },
        },
      };
    }
    if (inst.state === 'running') {
      return {
        type: 'button', text: { type: 'plain_text', text: 'Stop' }, style: 'danger',
        action_id: `ec2_stop_${inst.instanceId}`, value: inst.name,
        confirm: {
          title: { type: 'plain_text', text: 'Confirm Stop' },
          text: { type: 'mrkdwn', text: `*${inst.name}* 인스턴스를 중지하시겠습니까?` },
          confirm: { type: 'plain_text', text: 'Stop' }, deny: { type: 'plain_text', text: 'Cancel' },
        },
      };
    }
    return { type: 'button', text: { type: 'plain_text', text: '-' }, action_id: `ec2_wait_${inst.instanceId}` };
  }

  ec2ResultMessage(action, instance, success, error) {
    const verb = action === 'start' ? '시작' : '중지';
    if (success) {
      return [{ type: 'section', text: { type: 'mrkdwn', text: `:white_check_mark: *${instance.name}* 인스턴스 ${verb} 요청 완료` } }];
    }
    return [{ type: 'section', text: { type: 'mrkdwn', text: `:x: *${instance.name}* 인스턴스 ${verb} 실패\n\`\`\`${error}\`\`\`` } }];
  }

  ec2AlertMessage(userId, action, instance) {
    const verb = action === 'start' ? '시작' : '중지';
    return [{ type: 'section', text: { type: 'mrkdwn', text: `:memo: <@${userId}>님이 *${instance.name}* (\`${instance.instanceId}\`) 인스턴스를 ${verb}했습니다.` } }];
  }

  // ──────────────────────────────────────────
  // 내부 헬퍼
  // ──────────────────────────────────────────

  _formatTime(isoString) {
    if (!isoString) return 'N/A';
    try {
      const date = new Date(isoString);
      return date.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', dateStyle: 'short', timeStyle: 'short' });
    } catch {
      return isoString;
    }
  }
}

module.exports = SlackUI;
