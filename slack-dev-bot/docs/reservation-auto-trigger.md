# dev_reservations 예약 자동 실행 기능 추가

> 작업일: 2026-03-15

## 배경

`/dev reserve` 커맨드로 Supabase `dev_reservations` 테이블에 예약을 생성할 수 있지만,
해당 시간이 되어도 Dev 환경이 자동으로 start/stop되지 않는 문제가 있었다.

### 기존 구조

- **ScheduleChecker** (EventBridge 1분 간격): `dev_schedules` 테이블만 체크하여 반복 스케줄 기반 workflow 트리거
- **ai-bridge-infra의 `scheduled-env-control.yml`**: `check-reservations` 액션에서 `dev_reservations`를 조회하여 start/stop 결정 가능하지만, 해당 크론은 **제거된 상태** (workflow_dispatch로만 동작)

결과적으로 `dev_reservations`에 예약을 생성해도 아무도 체크하지 않아 자동 실행이 되지 않았다.

## 변경 사항

### 1. SupabaseService — `getReservationsDueNow()` 추가

**파일**: `src/services/SupabaseService.js`

현재 시점에서 활성이어야 할 예약을 조회하는 메서드 추가:
- `status = 'active'`
- `start_time <= NOW + 5분` (CDK 배포 시간 확보를 위한 선행 트리거)
- `end_time > NOW` 또는 `end_time IS NULL`

### 2. ScheduleChecker — 예약 체크 로직 추가

**파일**: `src/services/ScheduleChecker.js`

`run()` 메서드에서 기존 스케줄 체크(`_checkSchedules`) 후 `_checkReservations()`를 추가 호출.

#### 동작 로직

1. `getReservationsDueNow()`로 활성 예약 조회
2. `SsmService.getEnvStatus()`로 현재 환경 상태 조회
3. 상태 비교:
   - 활성 예약 있음 + SSM `stopped` → `start` workflow 트리거
   - 활성 예약 없음 + SSM `running` → `stop` workflow 트리거
   - 그 외 → skip
4. **10분 쿨다운**: 동일 액션의 중복 트리거 방지 (in-memory)
5. Slack 알림: 트리거 시 예약자 정보와 함께 알림 채널로 전송

#### 생성자 변경

`ssmService` 파라미터 추가 (선택). 없으면 예약 체크를 스킵한다.

### 3. index.js — ssmService 주입

**파일**: `src/index.js`

```javascript
const scheduleChecker = new ScheduleChecker({
  supabaseService: supabase,
  githubService: github,
  ssmService: ssm,       // 추가
  slackApp: app,
  alertChannelId: process.env.ALERT_CHANNEL_ID || null,
});
```

### 4. GitHubActionsService — JSDoc 타입 확장

**파일**: `src/services/GitHubActionsService.js`

`triggerWorkflow` 파라미터 타입에 `'check-reservations'` 추가.

## 발견된 버그 및 수정

### 문제: `check-reservations` workflow_dispatch 시 skip

초기 구현에서는 `check-reservations` 액션을 workflow_dispatch로 트리거했으나,
`scheduled-env-control.yml`이 workflow_dispatch 시 `skip_check=true`를 설정하여
실제 Supabase 조회를 건너뛰었다.

최종 액션이 `check-reservations`로 남아 어떤 downstream job(start/stop/force-stop)도
매칭되지 않아 전부 skip 처리되었다.

### 수정

ScheduleChecker가 `check-reservations` 대신 **`start` 또는 `stop`을 직접 트리거**하도록 변경.
Lambda에서 이미 SSM 상태와 활성 예약을 확인하므로 workflow에 판단을 위임할 필요가 없다.

## 동작 흐름

```
EventBridge (1분 간격)
  │
  ▼
Lambda (ScheduleChecker.run())
  │
  ├── _checkSchedules()        dev_schedules 기반 반복 스케줄
  │
  └── _checkReservations()     dev_reservations + SSM 상태 체크
        │
        ├── 활성 예약 있음 + stopped → triggerWorkflow('start')
        ├── 활성 예약 없음 + running → triggerWorkflow('stop')
        └── 그 외 → skip
              │
              ▼
        GitHub Actions (scheduled-env-control.yml)
              │
              ├── start: VPC → Cluster → ECS → ALB → MS → ElastiCache → Route53 → Health check
              └── stop:  CDK destroy → SSM 상태 갱신
```

## 배포

```bash
cd slack-dev-bot
sam build && sam deploy --no-confirm-changeset
```

- 스택: `slack-dev-bot`
- 리전: `ap-northeast-2`
- 파라미터: 기존 CloudFormation 스택에서 유지 (별도 override 불필요)

## 검증 결과

| 시각 (KST) | 이벤트 |
|------------|--------|
| 17:48 | 1차 배포 (`check-reservations` 트리거 방식) |
| 17:49 | workflow 트리거 → `check-reservations` skip됨 (버그 발견) |
| 18:06 | 2차 배포 (`start`/`stop` 직접 트리거 방식) |
| 18:07 | workflow 트리거 → `start` 실행됨 |
| ~18:30 | Dev 환경 기동 완료, SSM 상태 `running` 확인 |
