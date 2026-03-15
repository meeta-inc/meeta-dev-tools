# Slack Dev Bot (`/dev`)

Dev 환경(ECS/CDK)을 Slack에서 관리하는 봇입니다.
GitHub Actions `workflow_dispatch`를 트리거하는 프록시 역할을 합니다.

## 커맨드

| 커맨드 | 설명 |
|--------|------|
| `/dev` 또는 `/dev status` | 환경 상태 + 예약 + 배포 현황 |
| `/dev start` | 환경 시작 (GitHub Actions 트리거) |
| `/dev stop` | 환경 중지 (GitHub Actions 트리거) |
| `/dev reserve` | 시간 예약 생성 (모달) |
| `/dev cancel` | 활성 예약 취소 |
| `/dev schedule` | 반복 스케줄 관리 |
| `/dev help` | 사용법 안내 |

## 아키텍처

```
Slack /dev → API Gateway → Lambda → GitHub Actions workflow_dispatch
                                   → SSM (상태 읽기)
                                   → Supabase (예약/배포/스케줄 CRUD)

EventBridge (1분) → Lambda → Supabase 스케줄 체크 → GitHub Actions 트리거
```

## 사전 준비

1. **GitHub Personal Access Token**: `repo`, `workflow` 스코프
2. **Supabase**: `dev_reservations`, `pending_deployments` 테이블 (기존) + `dev_schedules` (신규)
3. **SSM Parameter Store**: `/ai-bridge/dev/env-control/*` 파라미터 (기존 workflow에서 관리)
4. **Slack App**: Bot Token (`xoxb-`), Signing Secret, `/dev` 슬래시 커맨드 등록

## Supabase 마이그레이션

`migration.sql` 파일을 Supabase SQL Editor에서 실행합니다.

## 배포

```bash
# 첫 배포 (파라미터 입력)
cd slack-dev-bot
sam build && sam deploy --guided

# 이후 배포
sam build && sam deploy
```

배포 후 출력되는 `SlackEventsUrl`을 Slack App 설정의 Request URL에 입력합니다.

## 환경변수 (SAM Parameters)

| 파라미터 | 설명 |
|----------|------|
| `SlackBotToken` | Slack Bot User OAuth Token |
| `SlackSigningSecret` | Slack App Signing Secret |
| `GitHubToken` | GitHub Personal Access Token |
| `GitHubOwner` | GitHub 레포 소유자 |
| `GitHubRepo` | GitHub 레포 이름 (기본: `ai-bridge-infra`) |
| `GitHubWorkflowFile` | Workflow 파일명 (기본: `scheduled-env-control.yml`) |
| `GitHubRef` | 브랜치 (기본: `main`) |
| `SupabaseUrl` | Supabase 프로젝트 URL |
| `SupabaseServiceRoleKey` | Supabase Service Role Key |
| `SsmParameterPrefix` | SSM 접두사 (기본: `/ai-bridge/dev/env-control`) |
| `AlertChannelId` | 감사 로그 채널 ID (선택) |
| `AllowedChannelIds` | 허용 채널 ID, 쉼표 구분 (비우면 전체 허용) |
