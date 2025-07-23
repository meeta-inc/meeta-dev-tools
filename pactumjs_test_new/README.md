# AI Navi Chat API Test Automation

AI Navi Chat API의 자동화된 테스트 도구입니다. PactumJS를 기반으로 구축되었으며, TypeScript로 작성되었습니다.

## 🚀 주요 기능

- **API 테스트 자동화**: AI Navi Chat API 엔드포인트 테스트
- **등급별 테스트**: 초등학교, 중학교, 고등학교 등급별 테스트 케이스
- **성능 모니터링**: 실시간 성능 메트릭 수집 및 분석
- **부하 테스트**: 동시성 및 처리량 테스트
- **CI/CD 통합**: GitHub Actions를 통한 자동화된 테스트 실행
- **다중 채널 알림**: Slack, 이메일, 웹훅을 통한 알림 시스템
- **실시간 대시보드**: HTML 기반 모니터링 대시보드

## 📁 프로젝트 구조

```
pactumjs_test_new/
├── src/
│   ├── api/              # API 클라이언트
│   ├── data/             # 테스트 데이터
│   ├── integrations/     # 외부 서비스 연동
│   ├── monitoring/       # 성능 모니터링
│   ├── tests/            # 테스트 케이스
│   ├── types/            # TypeScript 타입 정의
│   └── utils/            # 유틸리티 함수
├── config/               # 설정 파일
├── scripts/              # 실행 스크립트
├── reports/              # 테스트 리포트
├── .github/workflows/    # GitHub Actions 워크플로우
└── Makefile             # 편리한 명령어
```

## 🛠️ 설치 및 설정

### 1. 저장소 클론

```bash
git clone https://github.com/your-org/meeta-dev-tools.git
cd meeta-dev-tools/pactumjs_test_new
```

### 2. 의존성 설치

```bash
npm install
```

### 3. 환경 변수 설정

`.env` 파일을 생성하고 다음 내용을 입력:

```env
# API Configuration
API_BASE_URL=https://67hnjuna66.execute-api.ap-northeast-1.amazonaws.com/prd-1
API_TIMEOUT=30000
API_RETRIES=3

# Test Configuration
TEST_CONCURRENCY=5
REPORT_FORMAT=json
OUTPUT_DIR=./reports

# AWS Credentials
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=ap-northeast-1
S3_BUCKET_NAME=meeta-ai-navi-test
S3_TEST_CASES_KEY=test-cases.csv
S3_RESULTS_KEY=test-results.csv

# Google API Credentials
GOOGLE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SPREADSHEET_ID=your_spreadsheet_id
GOOGLE_SHEET_RANGE=LLM표준!A5:E1000
GOOGLE_SERVICE_ACCOUNT_PATH=./config/service-account.json

# Slack Webhook URL
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
SLACK_CHANNEL=#test-results
SLACK_USERNAME=Test Bot

# Default Test Parameters
DEFAULT_CLIENT_ID=AB123456
DEFAULT_APP_ID=1234
DEFAULT_USER_ID=test_user
```

### 4. TypeScript 빌드

```bash
npm run build
```

## 🎯 사용법

### 기본 명령어

```bash
# 모든 사용 가능한 명령어 보기
make help

# 개발 환경 설정
make dev-setup

# 환경 설정 검증
make validate-env

# API 연결 상태 확인
make check-api
```

### 테스트 실행

```bash
# 단일 테스트 케이스 실행
make test-single TEST_ID=ELEMENTARY_A-1

# 등급별 테스트 실행
make test-grade GRADE=elementary

# 카테고리별 테스트 실행
make test-category CATEGORY="授業・カリキュラム"

# 모든 테스트 실행
make test-all

# 드라이런 모드 (API 호출 없이 검증만)
make test-dry-run
```

### 부하 테스트

```bash
# 기본 부하 테스트
make load-test

# 가벼운 부하 테스트
make load-test-light

# 무거운 부하 테스트
make load-test-heavy

# 커스텀 부하 테스트
make load-test CONCURRENCY=10 DURATION=120 TARGET_RPS=5
```

### 고급 테스트 시나리오

```bash
# 연기 테스트 (핵심 기능)
make test-smoke

# 회귀 테스트 (포괄적 커버리지)
make test-regression

# 야간 테스트 스위트 (부하 테스트 포함)
make test-nightly
```

## 🤖 GitHub Actions 설정

### Repository Secrets 설정

GitHub 저장소 → Settings → Secrets → Actions에서 다음 시크릿을 추가:

- `AWS_ACCESS_KEY_ID`: AWS 액세스 키
- `AWS_SECRET_ACCESS_KEY`: AWS 시크릿 키
- `GOOGLE_PRIVATE_KEY`: Google Service Account private key
- `SLACK_WEBHOOK_URL`: Slack 웹훅 URL

### 자동화된 테스트

1. **수동 테스트 실행**: Actions 탭에서 "Manual Test Execution" 워크플로우 실행
2. **일일 테스트**: 매일 오전 2시 자동 실행
3. **주간 테스트**: 매주 일요일 오전 1시 포괄적 테스트 실행

## 📊 모니터링 및 알림

### 성능 모니터링

- **실시간 메트릭 수집**: 응답 시간, 처리량, 오류율
- **이상 감지**: 성능 저하 및 오류 패턴 자동 감지
- **인사이트 생성**: AI 기반 성능 분석 및 권장사항

### 대시보드

테스트 실행 후 생성되는 HTML 대시보드:

```bash
# 대시보드 위치
reports/dashboard/realtime-dashboard.html
reports/dashboard/session-{sessionId}-report.html
```

### 알림 시스템

- **Slack 통합**: 실시간 테스트 결과 및 알림
- **다중 채널**: 심각도에 따른 채널 분리
- **지능형 억제**: 중복 알림 방지 및 속도 제한

## 🔧 개발 가이드

### 새 테스트 케이스 추가

1. `src/data/csv/` 디렉토리에 CSV 파일 추가
2. `scripts/generate-faq-cases.js` 실행하여 JSON 변환
3. 테스트 실행으로 검증

### API 클라이언트 확장

```typescript
// src/api/client.ts
export class AINaviChatClient {
  async newEndpoint(params: NewParams): Promise<NewResponse> {
    // 새 엔드포인트 구현
  }
}
```

### 커스텀 검증 로직

```typescript
// src/tests/validators/
export class CustomValidator {
  validate(response: any): ValidationResult {
    // 커스텀 검증 로직
  }
}
```

## 📈 성능 기준

- **응답 시간**: 평균 5초 이하
- **성공률**: 95% 이상
- **동시 처리**: 최대 10개 요청
- **처리량**: 초당 2-5 요청

## 🚨 문제 해결

### 일반적인 문제

1. **환경 변수 오류**
   ```bash
   make validate-env
   ```

2. **API 연결 실패**
   ```bash
   make check-api
   ```

3. **빌드 오류**
   ```bash
   make clean && make build
   ```

### 로그 확인

```bash
# 실시간 로그
tail -f reports/logs/app.log

# 특정 세션 로그
grep "SESSION_ID" reports/logs/app.log
```

## 🤝 기여 가이드

1. 이슈 생성 또는 기존 이슈 확인
2. 피처 브랜치 생성: `git checkout -b feature/new-feature`
3. 변경사항 커밋: `git commit -m "Add new feature"`
4. 브랜치 푸시: `git push origin feature/new-feature`
5. Pull Request 생성

## 📝 라이선스

MIT License

## 📞 지원 및 연락처

- **이슈 리포팅**: GitHub Issues
- **문서**: [Wiki](https://github.com/your-org/meeta-dev-tools/wiki)
- **토론**: [Discussions](https://github.com/your-org/meeta-dev-tools/discussions)

---

### 빠른 시작

```bash
# 전체 설정 및 첫 테스트
make dev-setup
make test-single TEST_ID=ELEMENTARY_A-1

# 성공하면 더 많은 테스트 실행
make test-grade GRADE=elementary
```