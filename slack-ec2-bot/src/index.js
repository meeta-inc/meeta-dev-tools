const { App, AwsLambdaReceiver } = require('@slack/bolt');
const Ec2Service = require('./services/Ec2Service');
const SlackUI = require('./ui/SlackUI');

// Lambda Receiver 초기화
const awsLambdaReceiver = new AwsLambdaReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  receiver: awsLambdaReceiver,
});

// 서비스 초기화 — Name 태그 필터로 동적 검색
const ec2 = new Ec2Service({
  region: process.env.EC2_REGION || 'ap-northeast-1',
  nameFilter: process.env.EC2_NAME_FILTER || '',
});
const ui = new SlackUI();

// 설정
const alertChannelId = process.env.ALERT_CHANNEL_ID || null;
const allowedChannelIds = process.env.ALLOWED_CHANNEL_IDS
  ? process.env.ALLOWED_CHANNEL_IDS.split(',').map((id) => id.trim()).filter(Boolean)
  : [];

// ──────────────────────────────────────────
// 채널 권한 확인 헬퍼
// ──────────────────────────────────────────
function isChannelAllowed(channelId) {
  if (allowedChannelIds.length === 0) return true;
  return allowedChannelIds.includes(channelId);
}

// ──────────────────────────────────────────
// 버튼에서 인스턴스 정보 추출 헬퍼
// ──────────────────────────────────────────
function extractInstance(action, prefix) {
  const instanceId = action.action_id.replace(prefix, '');
  const name = action.value || instanceId;
  return { instanceId, name, description: name, emoji: ':computer:' };
}

// ──────────────────────────────────────────
// /ec2 슬래시 커맨드
// ──────────────────────────────────────────
app.command('/ec2', async ({ command, ack, respond, logger }) => {
  await ack();

  if (!isChannelAllowed(command.channel_id)) {
    await respond({ response_type: 'ephemeral', text: '이 채널에서는 /ec2 커맨드를 사용할 수 없습니다.' });
    return;
  }

  try {
    const instances = await ec2.describeAll();
    const blocks = ui.instanceList(instances);
    await respond({ response_type: 'in_channel', blocks });
  } catch (error) {
    logger.error('EC2 인스턴스 조회 실패:', error);
    await respond({ response_type: 'ephemeral', text: `인스턴스 조회 실패: ${error.message}` });
  }
});

// ──────────────────────────────────────────
// 버튼 핸들러 — ec2_start_{id}
// ──────────────────────────────────────────
app.action(/^ec2_start_(.+)$/, async ({ action, body, ack, respond, client, logger }) => {
  await ack();
  const instance = extractInstance(action, 'ec2_start_');

  try {
    await ec2.start(instance.instanceId);
    await respond({ response_type: 'in_channel', replace_original: false, blocks: ui.resultMessage('start', instance, true) });
  } catch (error) {
    logger.error('EC2 시작 실패:', error);
    await respond({ response_type: 'in_channel', replace_original: false, blocks: ui.resultMessage('start', instance, false, error.message) });
    return;
  }

  // 감사 로그 + 목록 갱신 병렬 처리
  await Promise.allSettled([
    sendAuditLog(client, body.user.id, 'start', instance, logger),
    refreshList(body, respond, logger),
  ]);
});

// ──────────────────────────────────────────
// 버튼 핸들러 — ec2_stop_{id}
// ──────────────────────────────────────────
app.action(/^ec2_stop_(.+)$/, async ({ action, body, ack, respond, client, logger }) => {
  await ack();
  const instance = extractInstance(action, 'ec2_stop_');

  try {
    await ec2.stop(instance.instanceId);
    await respond({ response_type: 'in_channel', replace_original: false, blocks: ui.resultMessage('stop', instance, true) });
  } catch (error) {
    logger.error('EC2 중지 실패:', error);
    await respond({ response_type: 'in_channel', replace_original: false, blocks: ui.resultMessage('stop', instance, false, error.message) });
    return;
  }

  // 감사 로그 + 목록 갱신 병렬 처리
  await Promise.allSettled([
    sendAuditLog(client, body.user.id, 'stop', instance, logger),
    refreshList(body, respond, logger),
  ]);
});

// ──────────────────────────────────────────
// 버튼 핸들러 — ec2_wait_{id} (전이 중 no-op)
// ──────────────────────────────────────────
app.action(/^ec2_wait_(.+)$/, async ({ ack }) => {
  await ack();
});

// ──────────────────────────────────────────
// 버튼 핸들러 — ec2_refresh
// ──────────────────────────────────────────
app.action('ec2_refresh', async ({ body, ack, respond, logger }) => {
  await ack();
  await refreshList(body, respond, logger);
});

// ──────────────────────────────────────────
// 감사 로그 헬퍼 (실패해도 무시)
// ──────────────────────────────────────────
async function sendAuditLog(client, userId, action, instance, logger) {
  if (!alertChannelId) return;
  try {
    await client.chat.postMessage({
      channel: alertChannelId,
      blocks: ui.alertMessage(userId, action, instance),
      text: `${instance.name} 인스턴스 ${action === 'start' ? '시작' : '중지'} - by <@${userId}>`,
    });
  } catch (error) {
    logger.error('감사 로그 전송 실패 (무시됨):', error.message);
  }
}

// ──────────────────────────────────────────
// 목록 갱신 헬퍼
// ──────────────────────────────────────────
async function refreshList(body, respond, logger) {
  try {
    const instances = await ec2.describeAll();
    const blocks = ui.instanceList(instances);
    await respond({ response_type: 'in_channel', replace_original: true, blocks });
  } catch (error) {
    logger.error('EC2 목록 갱신 실패:', error);
  }
}

// ──────────────────────────────────────────
// 글로벌 에러 핸들러
// ──────────────────────────────────────────
app.error(async (error) => {
  console.error('Unhandled error:', error);
});

// ──────────────────────────────────────────
// Lambda 핸들러 export
// ──────────────────────────────────────────
module.exports.handler = async (event, context, callback) => {
  // Lambda warmer — 스케줄 이벤트는 즉시 반환
  if (event.source === 'aws.events') {
    return { statusCode: 200, body: 'warm' };
  }

  const handler = await awsLambdaReceiver.start();
  return handler(event, context, callback);
};
