# AI Navi Chat API Test Automation

PactumJS 기반의 AI Navi Chat API 테스트 자동화 도구입니다.

## 🚀 주요 기능

- **다양한 테스트 소스**: CSV, Excel, Google Sheets에서 테스트 케이스 로드
- **학년별 테스트**: preschool, elementary, middle, high 학년별 필터링
- **병렬 실행**: 설정 가능한 동시성으로 테스트 성능 최적화
- **자동 보고**: S3 업로드, Slack 알림, 구조화된 로깅
- **응답 검증**: API 응답 형식 자동 검증

## 📁 프로젝트 구조

```
pactumjs_test_new/
├── src/
│   ├── api/                  # API 클라이언트
│   │   ├── client.js         # AI Navi Chat API 클라이언트
│   │   └── Academy Management API-prd-1-oas30.json
│   ├── data/                 # 테스트 데이터
│   │   ├── csv/              # CSV 테스트 케이스
│   │   ├── json/             # JSON 테스트 케이스
│   │   └── test-case-loader.js
│   ├── integrations/         # 외부 서비스 연동
│   │   ├── gsheet/           # Google Sheets
│   │   ├── s3/               # AWS S3
│   │   └── slack/            # Slack 알림
│   ├── tests/                # 테스트 관련
│   │   ├── chat/             # Chat API 테스트
│   │   └── utils/            # 테스트 유틸리티
│   └── utils/                # 공통 유틸리티
│       └── logger.js         # 구조화된 로깅
├── config/                   # 설정 파일
│   └── default.js            # 기본 설정
├── scripts/                  # 실행 스크립트
│   ├── run-tests.js          # 메인 테스트 실행기
│   └── upload-to-gsheet.js   # Google Sheets 업로드
├── reports/                  # 테스트 결과 리포트
└── package.json
```

## 🛠️ 설치 및 설정

### 1. 의존성 설치

```bash
cd pactumjs_test_new
npm install
```

### 2. 환경 변수 설정

`.env` 파일을 생성하고 다음 환경 변수들을 설정하세요:

```bash
cp .env.example .env
# .env 파일 편집
```

### 3. Google Sheets 인증 (선택사항)

Google Sheets를 사용하는 경우 서비스 계정 JSON 파일을 `config/service-account.json`에 저장하세요.

## 🎯 사용법

### 기본 테스트 실행

```bash
# 모든 테스트 실행
npm test

# 또는 직접 실행
node scripts/run-tests.js
```

### 필터링 옵션

```bash
# 학년별 실행
npm run test:grade -- high
node scripts/run-tests.js --grade=high

# 카테고리별 실행
npm run test:category -- A
node scripts/run-tests.js --category=授業

# 특정 테스트 실행
npm run test:id -- HIGH_A_1
node scripts/run-tests.js --id=HIGH_A_1

# 소스별 실행
node scripts/run-tests.js --source=excel_faq
```

### S3에서 테스트 케이스 로드

```bash
node scripts/run-tests.js --from-s3 --bucket=my-bucket --key=test-cases.csv
```

### 기타 옵션

```bash
# 드라이런 (실제 API 호출 없이 테스트)
node scripts/run-tests.js --dry-run

# Slack 알림 비활성화
node scripts/run-tests.js --no-slack
```

### Google Sheets 업로드

```bash
# 기본 설정으로 업로드
node scripts/upload-to-gsheet.js

# 사용자 정의 옵션
node scripts/upload-to-gsheet.js --spreadsheet=YOUR_SHEET_ID --range=Sheet1!A:Z --output=custom-test-cases.csv
```

## 📊 테스트 케이스 형식

### CSV 형식
```csv
테스트번호,유저역할,유저아이디,테스트카테고리,메세지
HIGH_A_1,User_S,test_user_001,授業・カリキュラム,大学受験対策はどの科目に対応していますか？
```

### Excel 형식 (314CommunityFAQExample.xlsx)
- 학년별 시트: 高校生, 中学生, 小学生, 幼児
- 각 시트에 질문과 예상 답변 포함

## 🔧 설정

### config/default.js

주요 설정 옵션:

```javascript
module.exports = {
  api: {
    baseUrl: 'API_BASE_URL',
    timeout: 30000,
    concurrency: 5
  },
  aws: {
    region: 'ap-northeast-1',
    s3: {
      bucket: 'YOUR_BUCKET'
    }
  },
  defaults: {
    clientId: 'AB123456',
    appId: '1234'
  }
}
```

## 📈 결과 및 리포팅

### 테스트 결과

- **S3**: CSV 형식으로 자동 업로드
- **로컬**: `reports/` 디렉토리에 JSON 형식 저장
- **Slack**: 실시간 알림 및 요약 리포트

### 로그

- **combined.log**: 모든 로그
- **error.log**: 에러 로그만
- **콘솔**: 실시간 진행 상황

## 🚦 API 스펙

현재 지원하는 AI Navi Chat API:

```
POST /students/chat
{
  "clientId": "AB123456",    // 8자리 (2문자 + 6숫자)
  "appId": "1234",           // 4자리
  "gradeId": "high",         // preschool|elementary|middle|high
  "userId": "user_001",
  "message": "질문 내용",
  "sessionId": "optional"
}
```

### 응답 형식

```json
[
  {
    "type": "main",
    "text": "주요 답변 내용"
  },
  {
    "type": "sub", 
    "text": "부가 설명"
  },
  {
    "type": "cta",
    "text": "행동 유도 메시지"
  }
]
```

## 🧪 테스트 검증

각 테스트는 다음을 검증합니다:

- HTTP 응답 코드 (200 OK)
- 응답 본문 형식 (배열 형태)
- 버블 개수 (2-3개)
- 각 버블의 타입과 텍스트 존재

## 📝 개발

### 새로운 테스트 케이스 추가

1. CSV 파일에 직접 추가
2. Excel 파일 업데이트
3. Google Sheets에서 관리

### 새로운 API 엔드포인트 지원

1. `src/api/client.js`에서 메서드 추가
2. `scripts/run-tests.js`에서 테스트 로직 구현

## 🎯 성능 최적화

- **병렬 처리**: 기본 5개 동시 실행 (설정 가능)
- **타임아웃**: 30초 API 타임아웃
- **재시도**: 실패시 3회 재시도
- **로깅**: 구조화된 로깅으로 성능 모니터링

## 🔍 문제 해결

### 일반적인 오류

1. **인증 오류**: AWS 자격 증명 및 Google Sheets 설정 확인
2. **타임아웃**: API 응답 시간 확인, 타임아웃 값 조정
3. **테스트 케이스 로드 실패**: 파일 경로 및 형식 확인

### 로그 확인

```bash
# 에러 로그 확인
tail -f reports/logs/error.log

# 전체 로그 확인  
tail -f reports/logs/combined.log
```

## 📞 지원

문제가 발생하면 다음을 확인하세요:

1. 환경 변수 설정
2. 네트워크 연결
3. API 엔드포인트 상태
4. 로그 파일의 상세 오류 메시지