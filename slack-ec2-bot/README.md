# Slack EC2 Bot

Slack 슬래시 커맨드(`/ec2`)로 EC2 인스턴스를 시작/중지할 수 있는 봇입니다.
AWS Lambda + API Gateway로 동작하며, 하루 몇 번 호출 수준이므로 Lambda 프리티어 내 비용 ~$0입니다.

## 주요 기능

- `/ec2` 커맨드로 관리 대상 인스턴스 목록 조회
- 버튼 클릭으로 인스턴스 시작/중지
- 전이 중 상태(pending/stopping) 자동 표시
- 감사 로그 — 누가 언제 어떤 인스턴스를 제어했는지 채널에 기록
- 채널별 접근 제어

## 아키텍처

```
Slack → API Gateway → Lambda (Node.js 20.x) → EC2 API
```

- 단일 Lambda 함수로 슬래시 커맨드 + 버튼 인터랙션 모두 처리
- SAM(Serverless Application Model)으로 인프라 관리

## 배포

### 사전 요구사항

- [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) 설치 및 인증 설정
- [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html) 설치

### 첫 배포 (guided)

```bash
cd slack-ec2-bot
sam build
sam deploy --guided
```

배포 시 입력 항목:

| 파라미터 | 설명 |
|---------|------|
| Stack name | `slack-ec2-bot` |
| Region | `ap-northeast-2` |
| SlackBotToken | Slack Bot User OAuth Token (`xoxb-...`) |
| SlackSigningSecret | Slack App Signing Secret |
| AlertChannelId | 감사 로그 채널 ID (선택) |
| AllowedChannelIds | 허용 채널 ID, 쉼표 구분 (선택) |

### 이후 배포

```bash
sam build && sam deploy
```

### 배포 출력

배포가 완료되면 `SlackEventsUrl`이 출력됩니다. 이 URL을 Slack App에 설정합니다.

## Slack App 설정

1. https://api.slack.com/apps 에서 앱 선택
2. **Socket Mode** → OFF
3. **Slash Commands** → `/ec2` → Request URL: 배포 출력의 `SlackEventsUrl`
4. **Interactivity & Shortcuts** → ON → Request URL: 동일 URL
5. **OAuth & Permissions** → Bot Token Scopes: `commands`, `chat:write`

## 인스턴스 설정

`ec2-instances.json`에 관리할 인스턴스를 정의합니다:

```json
[
  {
    "instanceId": "i-0123456789abcdef0",
    "name": "dev-server",
    "description": "개발 서버",
    "emoji": ":computer:"
  }
]
```

인스턴스를 추가/변경한 후 `sam build && sam deploy`로 재배포합니다.

## 사용 방법

1. Slack에서 `/ec2` 입력
2. 인스턴스 목록과 상태가 표시됨
3. Start / Stop 버튼 클릭
4. 결과 메시지 + 감사 로그 자동 전송

## IAM 정책

Lambda에 자동으로 다음 IAM 권한이 부여됩니다 (template.yaml에 정의):

```json
{
  "Effect": "Allow",
  "Action": [
    "ec2:DescribeInstances",
    "ec2:StartInstances",
    "ec2:StopInstances"
  ],
  "Resource": "*"
}
```
