const { App, AwsLambdaReceiver } = require('@slack/bolt');
const Ec2Service = require('./services/Ec2Service');
const SsmService = require('./services/SsmService');
const SupabaseService = require('./services/SupabaseService');
const GitHubActionsService = require('./services/GitHubActionsService');
const ScheduleChecker = require('./services/ScheduleChecker');
const SlackUI = require('./ui/SlackUI');

// ──────────────────────────────────────────
// 초기화
// ──────────────────────────────────────────

const awsLambdaReceiver = new AwsLambdaReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  receiver: awsLambdaReceiver,
});

const ec2 = new Ec2Service({
  region: process.env.EC2_REGION || 'ap-northeast-1',
  nameFilter: process.env.EC2_NAME_FILTER || '',
});

const ssm = new SsmService({
  region: process.env.SSM_REGION || 'ap-northeast-1',
  parameterPrefix: process.env.SSM_PARAMETER_PREFIX || '/ai-bridge/dev/env-control',
});

const supabase = new SupabaseService(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const github = new GitHubActionsService({
  token: process.env.GITHUB_TOKEN,
  owner: process.env.GITHUB_OWNER,
  repo: process.env.GITHUB_REPO || 'ai-bridge-infra',
  workflowFile: process.env.GITHUB_WORKFLOW_FILE || 'scheduled-env-control.yml',
  ref: process.env.GITHUB_REF || 'main',
});

const scheduleChecker = new ScheduleChecker({
  supabaseService: supabase,
  githubService: github,
  ssmService: ssm,
  slackApp: app,
  alertChannelId: process.env.ALERT_CHANNEL_ID || null,
});

const ui = new SlackUI();

// 설정
const alertChannelId = process.env.ALERT_CHANNEL_ID || null;
const allowedChannelIds = process.env.ALLOWED_CHANNEL_IDS
  ? process.env.ALLOWED_CHANNEL_IDS.split(',').map((id) => id.trim()).filter(Boolean)
  : [];

function isChannelAllowed(channelId) {
  if (allowedChannelIds.length === 0) return true;
  return allowedChannelIds.includes(channelId);
}

// ──────────────────────────────────────────
// /ec2 슬래시 커맨드
// ──────────────────────────────────────────

function extractInstance(action, prefix) {
  const instanceId = action.action_id.replace(prefix, '');
  const name = action.value || instanceId;
  return { instanceId, name, description: name, emoji: ':computer:' };
}

app.command('/ec2', async ({ command, ack, respond, logger }) => {
  await ack();
  if (!isChannelAllowed(command.channel_id)) {
    await respond({ response_type: 'ephemeral', text: '이 채널에서는 /ec2 커맨드를 사용할 수 없습니다.' });
    return;
  }
  try {
    const instances = await ec2.describeAll();
    const blocks = ui.ec2InstanceList(instances);
    await respond({ response_type: 'in_channel', blocks });
  } catch (error) {
    logger.error('EC2 인스턴스 조회 실패:', error);
    await respond({ response_type: 'ephemeral', text: `인스턴스 조회 실패: ${error.message}` });
  }
});

app.action(/^ec2_start_(.+)$/, async ({ action, body, ack, respond, client, logger }) => {
  await ack();
  const instance = extractInstance(action, 'ec2_start_');
  try {
    await ec2.start(instance.instanceId);
    await respond({ response_type: 'in_channel', replace_original: false, blocks: ui.ec2ResultMessage('start', instance, true) });
  } catch (error) {
    logger.error('EC2 시작 실패:', error);
    await respond({ response_type: 'in_channel', replace_original: false, blocks: ui.ec2ResultMessage('start', instance, false, error.message) });
    return;
  }
  await Promise.allSettled([
    sendEc2AuditLog(client, body.user.id, 'start', instance, logger),
    refreshEc2List(body, respond, logger),
  ]);
});

app.action(/^ec2_stop_(.+)$/, async ({ action, body, ack, respond, client, logger }) => {
  await ack();
  const instance = extractInstance(action, 'ec2_stop_');
  try {
    await ec2.stop(instance.instanceId);
    await respond({ response_type: 'in_channel', replace_original: false, blocks: ui.ec2ResultMessage('stop', instance, true) });
  } catch (error) {
    logger.error('EC2 중지 실패:', error);
    await respond({ response_type: 'in_channel', replace_original: false, blocks: ui.ec2ResultMessage('stop', instance, false, error.message) });
    return;
  }
  await Promise.allSettled([
    sendEc2AuditLog(client, body.user.id, 'stop', instance, logger),
    refreshEc2List(body, respond, logger),
  ]);
});

app.action(/^ec2_wait_(.+)$/, async ({ ack }) => { await ack(); });

app.action('ec2_refresh', async ({ body, ack, respond, logger }) => {
  await ack();
  await refreshEc2List(body, respond, logger);
});

async function sendEc2AuditLog(client, userId, action, instance, logger) {
  if (!alertChannelId) return;
  try {
    await client.chat.postMessage({
      channel: alertChannelId,
      blocks: ui.ec2AlertMessage(userId, action, instance),
      text: `${instance.name} 인스턴스 ${action === 'start' ? '시작' : '중지'} - by <@${userId}>`,
    });
  } catch (error) {
    logger.error('감사 로그 전송 실패 (무시됨):', error.message);
  }
}

async function refreshEc2List(body, respond, logger) {
  try {
    const instances = await ec2.describeAll();
    const blocks = ui.ec2InstanceList(instances);
    await respond({ response_type: 'in_channel', replace_original: true, blocks });
  } catch (error) {
    logger.error('EC2 목록 갱신 실패:', error);
  }
}

// ──────────────────────────────────────────
// /dev 슬래시 커맨드
// ──────────────────────────────────────────

app.command('/dev', async ({ command, ack, respond, client, logger }) => {
  await ack();

  if (!isChannelAllowed(command.channel_id)) {
    await respond({ response_type: 'ephemeral', text: '이 채널에서는 /dev 커맨드를 사용할 수 없습니다.' });
    return;
  }

  const subcommand = (command.text || '').trim().toLowerCase();

  try {
    switch (subcommand) {
      case '':
      case 'status':
        await handleStatus(respond, logger);
        break;
      case 'start':
        await handleStart(command, respond, client, logger);
        break;
      case 'stop':
        await handleStop(command, respond, client, logger);
        break;
      case 'reserve':
        await handleReserve(command, client, logger);
        break;
      case 'cancel':
        await handleCancel(respond, logger);
        break;
      case 'schedule':
        await handleSchedule(respond, logger);
        break;
      case 'help':
        await respond({ response_type: 'ephemeral', blocks: ui.helpMessage() });
        break;
      default:
        await respond({ response_type: 'ephemeral', text: `알 수 없는 명령어: \`${subcommand}\`\n\`/dev help\`로 사용법을 확인하세요.` });
    }
  } catch (error) {
    logger.error(`/dev ${subcommand} 처리 실패:`, error);
    await respond({ response_type: 'ephemeral', text: `처리 중 오류가 발생했습니다: ${error.message}` });
  }
});

// ──────────────────────────────────────────
// 서브커맨드 핸들러
// ──────────────────────────────────────────

async function handleStatus(respond, logger) {
  const [envStatus, reservations, deployments] = await Promise.all([
    ssm.getEnvStatus().catch((e) => { logger.error('SSM 조회 실패:', e); return { status: 'unknown' }; }),
    supabase.getActiveReservations().catch((e) => { logger.error('예약 조회 실패:', e); return []; }),
    supabase.getPendingDeployments().catch((e) => { logger.error('배포 조회 실패:', e); return []; }),
  ]);

  // pending_deployments 상태로 SSM 상태 보정
  if (deployments.length > 0) {
    const hasDeploying = deployments.some((d) => d.status === 'deploying');
    const hasPending = deployments.some((d) => d.status === 'pending' || d.status === 'queued');
    if (hasDeploying) {
      envStatus.status = 'deploying';
    } else if (hasPending && envStatus.status === 'stopped') {
      envStatus.status = 'starting';
    }
  }

  const blocks = ui.statusView(envStatus, reservations, deployments);
  await respond({ response_type: 'in_channel', blocks });
}

async function handleStart(command, respond, client, logger) {
  await github.triggerWorkflow('start');
  await respond({
    response_type: 'in_channel',
    blocks: ui.resultMessage('start', true),
  });
  await sendAuditLog(client, command.user_id, 'start', logger);
}

async function handleStop(command, respond, client, logger) {
  await github.triggerWorkflow('stop');
  await respond({
    response_type: 'in_channel',
    blocks: ui.resultMessage('stop', true),
  });
  await sendAuditLog(client, command.user_id, 'stop', logger);
}

async function handleReserve(command, client, logger) {
  await client.views.open({
    trigger_id: command.trigger_id,
    view: ui.reserveModal(command.channel_id),
  });
}

async function handleCancel(respond, logger) {
  const reservations = await supabase.getActiveReservations();
  const blocks = ui.cancelList(reservations);
  await respond({ response_type: 'ephemeral', blocks });
}

async function handleSchedule(respond, logger) {
  const schedules = await supabase.getSchedules();
  const blocks = ui.scheduleList(schedules);
  await respond({ response_type: 'in_channel', blocks });
}

// ──────────────────────────────────────────
// 버튼 액션 핸들러
// ──────────────────────────────────────────

// Start 버튼 (상태 뷰에서)
app.action('dev_start', async ({ body, ack, respond, client, logger }) => {
  await ack();
  try {
    await github.triggerWorkflow('start');
    await respond({ response_type: 'in_channel', replace_original: false, blocks: ui.resultMessage('start', true) });
    await sendAuditLog(client, body.user.id, 'start', logger);
  } catch (error) {
    logger.error('Dev 환경 시작 실패:', error);
    await respond({ response_type: 'in_channel', replace_original: false, blocks: ui.resultMessage('start', false, error.message) });
  }
});

// Stop 버튼 (상태 뷰에서)
app.action('dev_stop', async ({ body, ack, respond, client, logger }) => {
  await ack();
  try {
    await github.triggerWorkflow('stop');
    await respond({ response_type: 'in_channel', replace_original: false, blocks: ui.resultMessage('stop', true) });
    await sendAuditLog(client, body.user.id, 'stop', logger);
  } catch (error) {
    logger.error('Dev 환경 중지 실패:', error);
    await respond({ response_type: 'in_channel', replace_original: false, blocks: ui.resultMessage('stop', false, error.message) });
  }
});

// Refresh 버튼
app.action('dev_refresh', async ({ ack, respond, logger }) => {
  await ack();
  await handleStatus(respond, logger);
});

// 예약 취소 버튼
app.action(/^dev_cancel_(.+)$/, async ({ action, ack, respond, logger }) => {
  await ack();
  const reservationId = action.action_id.replace('dev_cancel_', '');
  try {
    await supabase.cancelReservation(reservationId);
    await respond({ response_type: 'ephemeral', replace_original: false, blocks: ui.resultMessage('cancel', true) });
  } catch (error) {
    logger.error('예약 취소 실패:', error);
    await respond({ response_type: 'ephemeral', replace_original: false, blocks: ui.resultMessage('cancel', false, error.message) });
  }
});

// 스케줄 토글 버튼
app.action(/^dev_schedule_toggle_(.+)$/, async ({ action, ack, respond, logger }) => {
  await ack();
  const scheduleId = action.action_id.replace('dev_schedule_toggle_', '');
  const newEnabled = action.value === 'true';
  try {
    await supabase.toggleSchedule(scheduleId, newEnabled);
    // 목록 갱신
    await handleSchedule(respond, logger);
  } catch (error) {
    logger.error('스케줄 토글 실패:', error);
    await respond({ response_type: 'ephemeral', replace_original: false, blocks: ui.resultMessage('schedule_toggle', false, error.message) });
  }
});

// 스케줄 삭제 버튼
app.action(/^dev_schedule_delete_(.+)$/, async ({ action, ack, respond, logger }) => {
  await ack();
  const scheduleId = action.action_id.replace('dev_schedule_delete_', '');
  try {
    await supabase.deleteSchedule(scheduleId);
    // 목록 갱신
    await handleSchedule(respond, logger);
  } catch (error) {
    logger.error('스케줄 삭제 실패:', error);
    await respond({ response_type: 'ephemeral', replace_original: false, blocks: ui.resultMessage('schedule_delete', false, error.message) });
  }
});

// 스케줄 추가 버튼 → 모달 오픈
app.action('dev_schedule_add', async ({ body, ack, client, logger }) => {
  await ack();
  try {
    await client.views.open({
      trigger_id: body.trigger_id,
      view: ui.scheduleModal(),
    });
  } catch (error) {
    logger.error('스케줄 모달 열기 실패:', error);
  }
});

// ──────────────────────────────────────────
// 모달 제출 핸들러
// ──────────────────────────────────────────

// 예약 생성 모달 제출
app.view('dev_reserve_modal', async ({ ack, body, view, logger }) => {
  await ack();
  const values = view.state.values;
  const userId = body.user.id;
  const channelId = view.private_metadata || userId;

  try {
    const startDate = values.start_date.start_date_input.selected_date;
    const startTime = values.start_time.start_time_input.selected_time;
    const endDate = values.end_date?.end_date_input?.selected_date || null;
    const endTime = values.end_time?.end_time_input?.selected_time || null;
    const reason = values.reason?.reason_input?.value || null;

    // KST → UTC 변환 (KST = UTC+9)
    const startIso = `${startDate}T${startTime}:00+09:00`;
    const endIso = endDate && endTime ? `${endDate}T${endTime}:00+09:00` : null;
    const startUtc = new Date(startIso).toISOString();
    const endUtc = endIso ? new Date(endIso).toISOString() : null;

    await supabase.createReservation({
      reserved_by: userId,
      start_time: startUtc,
      end_time: endUtc,
      reason,
      status: 'active',
    });

    await app.client.chat.postMessage({
      channel: channelId,
      blocks: ui.reserveResultMessage(userId, startUtc, endUtc, reason, true),
      text: '예약이 생성되었습니다.',
    });
  } catch (error) {
    logger.error('예약 생성 실패:', error);
    await app.client.chat.postMessage({
      channel: channelId,
      blocks: ui.reserveResultMessage(userId, null, null, null, false, error.message),
      text: '예약 생성에 실패했습니다.',
    });
  }
});

// 스케줄 추가 모달 제출
app.view('dev_schedule_modal', async ({ ack, body, view, logger }) => {
  await ack();
  const values = view.state.values;
  const userId = body.user.id;

  try {
    const action = values.action.action_input.selected_option.value;
    const daysOfWeek = values.days_of_week.days_input.selected_options.map((o) => parseInt(o.value, 10));
    const time = values.time.time_input.selected_time; // "HH:mm"
    const description = values.description?.description_input?.value || null;

    await supabase.createSchedule({
      action,
      days_of_week: daysOfWeek,
      time_utc: time,
      timezone: 'Asia/Seoul',
      description,
      is_enabled: true,
      created_by: userId,
      notify_channel_id: alertChannelId,
    });

    await app.client.chat.postMessage({
      channel: userId,
      blocks: ui.resultMessage('schedule_add', true),
      text: '반복 스케줄이 추가되었습니다.',
    });
  } catch (error) {
    logger.error('스케줄 추가 실패:', error);
    await app.client.chat.postMessage({
      channel: userId,
      blocks: ui.resultMessage('schedule_add', false, error.message),
      text: '스케줄 추가에 실패했습니다.',
    });
  }
});

// ──────────────────────────────────────────
// 감사 로그 헬퍼
// ──────────────────────────────────────────

async function sendAuditLog(client, userId, action, logger) {
  if (!alertChannelId) return;
  try {
    const actionLabel = action === 'start' ? '시작' : '중지';
    await client.chat.postMessage({
      channel: alertChannelId,
      blocks: ui.alertMessage(userId, action),
      text: `Dev 환경 ${actionLabel} — by <@${userId}>`,
    });
  } catch (error) {
    logger.error('감사 로그 전송 실패 (무시됨):', error.message);
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
  // EventBridge 스케줄 이벤트 처리
  if (event.source === 'aws.events') {
    if (event.action === 'schedule-check') {
      await scheduleChecker.run();
      return { statusCode: 200, body: 'schedule-check done' };
    }
    // keep-warm 또는 기타 → 즉시 반환
    return { statusCode: 200, body: 'warm' };
  }

  const handler = await awsLambdaReceiver.start();
  return handler(event, context, callback);
};
