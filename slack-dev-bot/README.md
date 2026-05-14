# Slack Dev Bot (`/dev`, `/ec2`, `/uat1`)

Dev / UAT1 환경(ECS/CDK)을 Slack에서 관리하는 봇입니다.
GitHub Actions `workflow_dispatch`를 트리거하는 프록시 역할을 합니다.

## 커맨드

### `/dev` (dev 환경)

| 커맨드 | 설명 |
|--------|------|
| `/dev` 또는 `/dev status` | 환경 상태 + 예약 + 배포 현황 |
| `/dev start` | 환경 시작 (GitHub Actions 트리거) |
| `/dev stop` | 환경 중지 (GitHub Actions 트리거) |
| `/dev reserve` | 시간 예약 생성 (모달) |
| `/dev cancel` | 활성 예약 취소 |
| `/dev schedule` | 반복 스케줄 관리 |
| `/dev help` | 사용법 안내 |

### `/uat1` (UAT1 환경, 2026-05-14 신설)

| 커맨드 | 설명 |
|--------|------|
| `/uat1` 또는 `/uat1 status` | 환경 상태 + 활성 예약 조회 |
| `/uat1 start` | 환경 시작 (JST 18:00 이전만) |
| `/uat1 stop` | 환경 중지 |
| `/uat1 reserve YYYY-MM-DD [사유]` | 예약 생성 (평일만, 1일 1건) |
| `/uat1 cancel <reservation_id>` | 예약 취소 |
| `/uat1 help` | 사용법 안내 |

UAT1 제약:
- **평일만** 예약 (월~금) — UI 사전 차단 + DB `chk_weekday_only` 이중 가드
- **JST 18시 이전 start 만** — UI 사전 차단 + workflow 측 거부
- **1일 1 active 예약** — DB `uq_uat1_active_per_day` UNIQUE 제약

### `/ec2` (EC2 인스턴스)

`/ec2` → EC2 인스턴스 목록 + 시작/중지 버튼.

## 아키텍처

```
Slack /dev   → API Gateway → Lambda → GitHub Actions (scheduled-env-control.yml)
Slack /uat1  → API Gateway → Lambda → GitHub Actions (uat1-env-control.yml)
                                    → SSM (상태 읽기, dev/uat1 prefix 분리)
                                    → Supabase (dev_*: 시간 예약 / 배포 / 스케줄,
                                               uat1_reservations: 날짜 단위 예약)

EventBridge (1분) → Lambda → Supabase 스케줄 체크 (dev_schedules) → GitHub Actions 트리거
   ※ UAT1 은 GHA cron(workflow 자체) 사용 — ScheduleChecker 무관
```

## 사전 준비

1. **GitHub Personal Access Token**: `repo`, `workflow` 스코프
2. **Supabase**:
   - `dev_reservations`, `pending_deployments`, `dev_schedules` (기존)
   - `uat1_reservations` (UAT1 — main branch)
3. **SSM Parameter Store**:
   - `/ai-bridge/dev/env-control/*` (dev)
   - `/ai-bridge/uat1/env-control/*` (UAT1)
4. **Slack App**: Bot Token (`xoxb-`), Signing Secret, 슬래시 커맨드 등록 (`/dev`, `/uat1`, `/ec2`)
5. **GitHub Actions workflow 파일**:
   - `scheduled-env-control.yml` (dev)
   - `uat1-env-control.yml` (UAT1)

## Supabase 마이그레이션

`migration.sql` 파일을 Supabase SQL Editor에서 실행합니다.
UAT1 예약 테이블은 ai-bridge-infra repo 측에서 신설됨 (PR #17 참조).

## 배포

```bash
# 첫 배포 (파라미터 입력)
cd slack-dev-bot
sam build && sam deploy --guided

# 이후 배포
sam build && sam deploy

# UAT1 파라미터 명시 (선택)
sam deploy \
  --parameter-overrides \
    Uat1WorkflowFile=uat1-env-control.yml \
    Uat1SsmParameterPrefix=/ai-bridge/uat1/env-control \
    Uat1ReservationsTable=uat1_reservations
```

배포 후 출력되는 `SlackEventsUrl`을 Slack App 설정의 Request URL에 입력합니다.

## 환경변수 (SAM Parameters)

### 공통

| 파라미터 | 설명 |
|----------|------|
| `SlackBotToken` | Slack Bot User OAuth Token |
| `SlackSigningSecret` | Slack App Signing Secret |
| `GitHubToken` | GitHub Personal Access Token |
| `GitHubOwner` | GitHub 레포 소유자 |
| `GitHubRepo` | GitHub 레포 이름 (기본: `ai-bridge-infra`) |
| `GitHubRef` | 브랜치 (기본: `main`) |
| `SupabaseUrl` | Supabase 프로젝트 URL |
| `SupabaseServiceRoleKey` | Supabase Service Role Key |
| `AlertChannelId` | 감사 로그 채널 ID (선택) |
| `AllowedChannelIds` | 허용 채널 ID, 쉼표 구분 (비우면 전체 허용) |

### Dev 전용

| 파라미터 | 설명 |
|----------|------|
| `GitHubWorkflowFile` | Workflow 파일명 (기본: `scheduled-env-control.yml`) |
| `SsmParameterPrefix` | SSM 접두사 (기본: `/ai-bridge/dev/env-control`) |

### UAT1 전용 (2026-05-14 신설)

| 파라미터 | 기본값 | 설명 |
|----------|--------|------|
| `Uat1WorkflowFile` | `uat1-env-control.yml` | UAT1 GitHub Actions workflow 파일 |
| `Uat1SsmParameterPrefix` | `/ai-bridge/uat1/env-control` | UAT1 SSM 접두사 |
| `Uat1ReservationsTable` | `uat1_reservations` | UAT1 예약 테이블 (Supabase main branch) |

### EC2 전용

| 파라미터 | 기본값 | 설명 |
|----------|--------|------|
| `Ec2Region` | `ap-northeast-1` | EC2 리전 |
| `Ec2NameFilter` | `devcontainer` | EC2 Name 태그 필터 |

## Slack App 슬래시 커맨드 등록

Workspace admin 권한으로 다음을 등록:

| Command | Request URL | Description | Usage Hint |
|---------|-------------|-------------|-----------|
| `/dev` | (배포 후 출력된 URL) | Dev 환경 관리 | `[status\|start\|stop\|reserve\|cancel\|schedule\|help]` |
| `/uat1` | (위와 동일 endpoint) | UAT1 환경 관리 | `[status\|start\|stop\|reserve\|cancel\|help]` |
| `/ec2` | (위와 동일 endpoint) | EC2 인스턴스 관리 | (인자 없음) |
