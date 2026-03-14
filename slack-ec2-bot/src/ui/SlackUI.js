// 상태별 표시 정보
const STATE_DISPLAY = {
  running: { label: 'Running', emoji: ':large_green_circle:' },
  stopped: { label: 'Stopped', emoji: ':red_circle:' },
  pending: { label: 'Starting...', emoji: ':hourglass_flowing_sand:' },
  stopping: { label: 'Stopping...', emoji: ':hourglass_flowing_sand:' },
  'shutting-down': { label: 'Shutting down', emoji: ':warning:' },
  terminated: { label: 'Terminated', emoji: ':skull:' },
  unknown: { label: 'Unknown', emoji: ':grey_question:' },
};

class SlackUI {
  /**
   * 인스턴스 목록 + 시작/중지 버튼 Block Kit 메시지를 생성한다.
   * @param {Array<{instanceId: string, name: string, description: string, emoji: string, state: string}>} instances
   * @returns {object[]} Block Kit blocks
   */
  instanceList(instances) {
    const blocks = [
      {
        type: 'header',
        text: { type: 'plain_text', text: 'EC2 Instance Manager' },
      },
      { type: 'divider' },
    ];

    for (const inst of instances) {
      const display = STATE_DISPLAY[inst.state] || STATE_DISPLAY.unknown;
      const isTransitioning = inst.state === 'pending' || inst.state === 'stopping';

      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `${inst.emoji} *${inst.name}*\n${inst.description}\n${display.emoji} ${display.label}`,
        },
        accessory: this._actionButton(inst, isTransitioning),
      });
    }

    // 새로고침 버튼
    blocks.push({ type: 'divider' });
    blocks.push({
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: 'Refresh' },
          action_id: 'ec2_refresh',
        },
      ],
    });

    return blocks;
  }

  /**
   * 인스턴스 상태에 따라 적절한 버튼을 생성한다.
   */
  _actionButton(inst, isTransitioning) {
    // 전이 중 상태 → 비활성 버튼
    if (isTransitioning) {
      const label = inst.state === 'pending' ? 'Starting...' : 'Stopping...';
      return {
        type: 'button',
        text: { type: 'plain_text', text: label },
        action_id: `ec2_wait_${inst.instanceId}`,
      };
    }

    if (inst.state === 'stopped') {
      return {
        type: 'button',
        text: { type: 'plain_text', text: 'Start' },
        style: 'primary',
        action_id: `ec2_start_${inst.instanceId}`,
        value: inst.name,
        confirm: {
          title: { type: 'plain_text', text: 'Confirm Start' },
          text: { type: 'mrkdwn', text: `*${inst.name}* 인스턴스를 시작하시겠습니까?` },
          confirm: { type: 'plain_text', text: 'Start' },
          deny: { type: 'plain_text', text: 'Cancel' },
        },
      };
    }

    if (inst.state === 'running') {
      return {
        type: 'button',
        text: { type: 'plain_text', text: 'Stop' },
        style: 'danger',
        action_id: `ec2_stop_${inst.instanceId}`,
        value: inst.name,
        confirm: {
          title: { type: 'plain_text', text: 'Confirm Stop' },
          text: { type: 'mrkdwn', text: `*${inst.name}* 인스턴스를 중지하시겠습니까?` },
          confirm: { type: 'plain_text', text: 'Stop' },
          deny: { type: 'plain_text', text: 'Cancel' },
        },
      };
    }

    // 그 외 상태 → 비활성 버튼
    return {
      type: 'button',
      text: { type: 'plain_text', text: '-' },
      action_id: `ec2_wait_${inst.instanceId}`,
    };
  }

  /**
   * 작업 결과 메시지를 생성한다.
   * @param {'start'|'stop'} action
   * @param {{name: string}} instance
   * @param {boolean} success
   * @param {string} [error]
   * @returns {object[]} Block Kit blocks
   */
  resultMessage(action, instance, success, error) {
    const verb = action === 'start' ? '시작' : '중지';

    if (success) {
      return [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `:white_check_mark: *${instance.name}* 인스턴스 ${verb} 요청 완료`,
          },
        },
      ];
    }

    return [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `:x: *${instance.name}* 인스턴스 ${verb} 실패\n\`\`\`${error}\`\`\``,
        },
      },
    ];
  }

  /**
   * 감사 로그 메시지를 생성한다.
   * @param {string} userId - Slack 유저 ID
   * @param {'start'|'stop'} action
   * @param {{instanceId: string, name: string}} instance
   * @returns {object[]} Block Kit blocks
   */
  alertMessage(userId, action, instance) {
    const verb = action === 'start' ? '시작' : '중지';
    return [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `:memo: <@${userId}>님이 *${instance.name}* (\`${instance.instanceId}\`) 인스턴스를 ${verb}했습니다.`,
        },
      },
    ];
  }
}

module.exports = SlackUI;
