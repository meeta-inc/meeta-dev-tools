# Slack EC2 관리 봇 — 배포 가이드

> **프로젝트**: `slack-ec2-bot` | **레포**: `meeta-inc/meeta-dev-tools` | **이슈**: [#14](https://github.com/meeta-inc/meeta-dev-tools/issues/14)

---

## 1. Slack App 생성 절차

### 1.1 앱 생성

1. [Slack API](https://api.slack.com/apps) 접속
2. **Create New App** → **From a manifest** 선택
3. 워크스페이스 선택
4. 아래 manifest YAML 붙여넣기:

```yaml
display_information:
  name: EC2 Manager
  description: EC2 인스턴스 시작/중지 관리 봇
  background_color: "#232F3E"

features:
  bot_user:
    display_name: ec2-bot
    always_online: true
  slash_commands:
    - command: /ec2
      description: EC2 인스턴스 관리
      usage_hint: "[status]"
      should_escape: false

oauth_config:
  scopes:
    bot:
      - commands
      - chat:write
      - chat:write.public

settings:
  socket_mode_enabled: true
  org_deploy_enabled: false
  token_rotation_enabled: false
```

### 1.2 토큰 수집

| 토큰 | 위치 | 형식 |
|------|------|------|
| Bot Token | **OAuth & Permissions** → Bot User OAuth Token | `xoxb-...` |
| Signing Secret | **Basic Information** → App Credentials | 32자 hex |
| App-Level Token | **Basic Information** → App-Level Tokens → Generate (`connections:write` 스코프) | `xapp-...` |

### 1.3 워크스페이스 설치

1. **Install to Workspace** 클릭
2. 권한 승인
3. 봇을 사용할 채널에 `/invite @ec2-bot` (선택사항, 채널 알림용)

---

## 2. 환경변수

### 2.1 `.env` 파일

```env
# === Slack ===
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_SIGNING_SECRET=your-signing-secret
SLACK_APP_TOKEN=xapp-your-app-level-token

# === AWS ===
AWS_REGION=ap-northeast-1
AWS_ACCESS_KEY_ID=AKIA...          # IAM User 방식
AWS_SECRET_ACCESS_KEY=...           # IAM User 방식
# 또는 IAM Role (EC2에서 실행 시 자동 해결)

# === App ===
ALERT_CHANNEL_ID=C0123456789       # 알림 채널 ID (선택)
ALLOWED_CHANNEL_IDS=C01,C02        # 허용 채널 (쉼표 구분, 비우면 전체 허용)
PORT=3000
```

### 2.2 환경변수 설명

| 변수 | 필수 | 설명 |
|------|------|------|
| `SLACK_BOT_TOKEN` | ✅ | 봇 OAuth 토큰 |
| `SLACK_SIGNING_SECRET` | ✅ | 요청 서명 검증 |
| `SLACK_APP_TOKEN` | ✅ | Socket Mode 연결용 |
| `AWS_REGION` | — | 기본: `ap-northeast-1` |
| `AWS_ACCESS_KEY_ID` | △ | IAM Role 사용 시 불필요 |
| `AWS_SECRET_ACCESS_KEY` | △ | IAM Role 사용 시 불필요 |
| `ALERT_CHANNEL_ID` | — | 상태 변경 알림 채널 |
| `ALLOWED_CHANNEL_IDS` | — | 커맨드 허용 채널 목록 |
| `PORT` | — | 기본: 3000 |

---

## 3. IAM 정책

### 3.1 최소 권한 정책

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "SlackEc2BotAccess",
      "Effect": "Allow",
      "Action": [
        "ec2:DescribeInstances",
        "ec2:DescribeInstanceStatus",
        "ec2:StartInstances",
        "ec2:StopInstances"
      ],
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "ec2:ResourceTag/ManagedBy": "slack-ec2-bot"
        }
      }
    }
  ]
}
```

### 3.2 EC2 태그 설정

관리 대상 인스턴스에 태그를 추가합니다:

```bash
aws ec2 create-tags \
  --resources i-0995727d108c1e6d3 \
  --tags Key=ManagedBy,Value=slack-ec2-bot \
  --region ap-northeast-1 \
  --profile meeta-ai-navi-dev
```

### 3.3 IAM 옵션

| 방식 | 장점 | 단점 | 권장 환경 |
|------|------|------|----------|
| IAM User + AccessKey | 간단한 설정 | 키 로테이션 필요 | 로컬 개발 |
| EC2 Instance Profile | 키 관리 불필요, 자동 로테이션 | EC2에서만 동작 | **프로덕션** |

---

## 4. Docker 빌드 및 실행

### 4.1 Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD node -e "console.log('ok')" || exit 1

CMD ["node", "src/index.js"]
```

### 4.2 빌드 및 실행

```bash
# 빌드
cd meeta-dev-tools/slack-ec2-bot
docker build -t slack-ec2-bot .

# 실행
docker run -d \
  --name slack-ec2-bot \
  --env-file .env \
  --restart unless-stopped \
  slack-ec2-bot
```

### 4.3 로그 확인

```bash
docker logs -f slack-ec2-bot
```

---

## 5. Docker Compose 통합

기존 `meeta-dev-tools`의 Docker Compose에 통합하는 방법입니다.

### 5.1 docker-compose.yml

```yaml
services:
  slack-ec2-bot:
    build: ./slack-ec2-bot
    container_name: slack-ec2-bot
    restart: unless-stopped
    env_file:
      - ./slack-ec2-bot/.env
    healthcheck:
      test: ["CMD", "node", "-e", "console.log('ok')"]
      interval: 30s
      timeout: 5s
      retries: 3
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
```

### 5.2 기존 봇과 함께 실행

```yaml
services:
  slack-attendance-bot:
    build: ./slack-attendance-bot
    container_name: slack-attendance-bot
    # ...기존 설정

  slack-ec2-bot:
    build: ./slack-ec2-bot
    container_name: slack-ec2-bot
    restart: unless-stopped
    env_file:
      - ./slack-ec2-bot/.env
```

```bash
docker compose up -d
```

---

## 6. 배포 옵션 비교

| 옵션 | 장점 | 단점 | 비용 | 권장도 |
|------|------|------|------|--------|
| **EC2 Docker** | 기존 인프라 활용, Instance Profile 사용 가능 | 서버 관리 필요 | 기존 EC2 비용에 포함 | ⭐⭐⭐ |
| ECS Fargate | 서버리스, 자동 스케일링 | 상시 실행 비용, 설정 복잡 | ~$15/월 | ⭐⭐ |
| Lambda + API Gateway | 이벤트 기반 과금 | Socket Mode 불가 (HTTP 방식 필요) | ~$1/월 | ⭐ |

> **권장**: EC2에 Docker로 배포 — 기존 `slack-attendance-bot`과 동일한 방식으로, 추가 인프라 비용 없이 운영 가능

---

## 7. 배포 아키텍처 다이어그램

```mermaid
graph TB
    subgraph Slack["Slack Platform"]
        SlackAPI["Slack API<br/>(Socket Mode)"]
    end

    subgraph EC2["EC2 인스턴스<br/>(AI Bridge Dev or 별도)"]
        Docker["Docker Engine"]

        subgraph Containers["Docker Compose"]
            AttBot["slack-attendance-bot<br/>:3000"]
            EC2Bot["slack-ec2-bot<br/>:3001"]
        end
    end

    subgraph AWS_Services["AWS Services"]
        IAM["IAM Role<br/>(Instance Profile)"]
        EC2_Target1["🖥️ AI Bridge Dev<br/>i-0995727d108c1e6d3"]
        EC2_TargetN["🖥️ 기타 인스턴스"]
    end

    SlackAPI <-->|"WebSocket<br/>(Socket Mode)"| EC2Bot
    SlackAPI <-->|"WebSocket"| AttBot

    EC2Bot -->|"AWS SDK v3"| EC2_Target1
    EC2Bot -->|"AWS SDK v3"| EC2_TargetN

    Docker --> Containers
    IAM -.->|"자격증명 자동 제공"| EC2Bot

    style EC2Bot fill:#4A154B,color:#fff
    style AttBot fill:#4A154B,color:#fff
    style EC2_Target1 fill:#232F3E,color:#fff
    style EC2_TargetN fill:#232F3E,color:#fff
    style IAM fill:#FF9900,color:#000
```

---

## 8. 헬스체크

### 8.1 Docker 헬스체크

Dockerfile에 포함된 `HEALTHCHECK`:

```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD node -e "console.log('ok')" || exit 1
```

### 8.2 수동 확인

```bash
# 컨테이너 상태
docker ps --filter name=slack-ec2-bot

# 로그에서 시작 메시지 확인
docker logs slack-ec2-bot | head -5
# 출력: ⚡️ EC2 관리 봇이 실행 중입니다!

# Slack에서 확인
# /ec2 입력 → 인스턴스 목록 표시되면 정상
```

### 8.3 자동 재시작

`restart: unless-stopped` 설정으로 크래시 시 자동 재시작됩니다.

---

## 9. 문제 해결

### 9.1 자주 발생하는 문제

| 증상 | 원인 | 해결 |
|------|------|------|
| 봇이 시작되지 않음 | 환경변수 누락 | `.env` 파일 확인, 필수 값 3개 검증 |
| `/ec2` 응답 없음 | Socket Mode 미연결 | `SLACK_APP_TOKEN` 확인, 앱 설정에서 Socket Mode 활성화 |
| "not_allowed_token_type" | App-Level Token 스코프 누락 | `connections:write` 스코프로 재생성 |
| EC2 API 실패 | IAM 권한 부족 | IAM 정책 확인, EC2 태그 확인 |
| "channel_not_found" | 알림 채널 ID 오류 | 채널 ID 재확인, 봇이 채널에 초대되었는지 확인 |
| 인스턴스 목록 비어있음 | `ec2-instances.json` 미설정 | 파일에 인스턴스 추가 후 컨테이너 재시작 |

### 9.2 디버깅

```bash
# 실시간 로그 모니터링
docker logs -f slack-ec2-bot

# 컨테이너 내부 접속
docker exec -it slack-ec2-bot sh

# 환경변수 확인 (민감정보 주의)
docker exec slack-ec2-bot env | grep -E "^(SLACK|AWS_REGION|PORT)"

# AWS 자격증명 테스트
docker exec slack-ec2-bot node -e "
  const { EC2Client, DescribeInstancesCommand } = require('@aws-sdk/client-ec2');
  const client = new EC2Client({ region: 'ap-northeast-1' });
  client.send(new DescribeInstancesCommand({ InstanceIds: ['i-0995727d108c1e6d3'] }))
    .then(r => console.log('✅ AWS 연결 성공'))
    .catch(e => console.error('❌ AWS 연결 실패:', e.message));
"
```

### 9.3 업데이트 절차

```bash
cd meeta-dev-tools

# 최신 코드 풀
git pull origin main

# 재빌드 및 재시작
docker compose up -d --build slack-ec2-bot
```

---

## 10. 인스턴스 추가 방법

새로운 EC2 인스턴스를 관리 대상에 추가하려면:

1. **EC2 태그 추가**:
   ```bash
   aws ec2 create-tags \
     --resources i-NEW_INSTANCE_ID \
     --tags Key=ManagedBy,Value=slack-ec2-bot \
     --region ap-northeast-1
   ```

2. **`ec2-instances.json` 수정**:
   ```json
   [
     {
       "id": "i-0995727d108c1e6d3",
       "name": "AI Bridge Dev",
       "description": "AI Bridge 통합 개발 환경"
     },
     {
       "id": "i-NEW_INSTANCE_ID",
       "name": "New Service",
       "description": "새 서비스 설명"
     }
   ]
   ```

3. **컨테이너 재시작**:
   ```bash
   docker compose restart slack-ec2-bot
   ```

---

## 11. 관련 문서

| 문서 | 설명 |
|------|------|
| [01-overview.md](./01-overview.md) | 프로젝트 개요 및 배경 |
| [02-detailed-design.md](./02-detailed-design.md) | 모듈별 상세 구현 설계 |
