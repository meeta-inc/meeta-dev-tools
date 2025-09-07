# DynamoDB Data Tools

AI Navi 프로젝트의 DynamoDB 데이터 관리 도구 모음입니다.

## 📁 폴더 구조

```
dynamodb-tools/
├── scripts/          # 실행 가능한 스크립트
│   ├── faq/         # FAQ 관련 스크립트
│   ├── source/      # Source 테이블 관리 스크립트
│   ├── conversation/# 대화 기록 관리 스크립트
│   ├── user/        # 사용자 관련 스크립트
│   └── analytics/   # 분석 관련 스크립트
├── data/            # 초기 데이터 및 샘플 데이터
│   ├── faq/         # FAQ 초기 데이터
│   └── user/        # 사용자 초기 데이터
├── config/          # 설정 파일
│   └── environments/ # 환경별 설정
├── utils/           # 공통 유틸리티
└── README.md        # 이 파일
```

## 🚀 사용 방법

### 환경 설정

```bash
# AWS 프로파일 설정
export AWS_PROFILE=meeta-ai-navi-dev

# 또는 환경변수로 설정
export NODE_ENV=development
```

### FAQ 데이터 관리

#### 카테고리 데이터 시딩
```bash
node scripts/faq/seed-categories.js --env dev
# 또는
npm run seed:faq:categories
```

#### FAQ 데이터 시딩
```bash
node scripts/faq/seed-faqs.js --env dev
# 또는
npm run seed:faq:data
```

#### 데이터 검증
```bash
node scripts/faq/validate-data.js --env dev
# 또는
npm run validate:faq
```

### Source 데이터 관리 (참조 자료: 파일, 링크)

#### Source 데이터 시딩
```bash
npm run seed:source
```

#### Source 데이터 검증
```bash
npm run verify:source
```

#### Source 데이터 삭제
```bash
npm run delete:source -- --client=RS000001
```

### Conversation History 관리 (대화 기록)

#### 대화 기록 시딩
```bash
npm run seed:conversation
```

#### 대화 기록 검증 및 통계
```bash
npm run verify:conversation
```

#### 대화 기록 삭제
```bash
npm run delete:conversation -- --client=RS000001 --date=2025-08-26
```

## 📊 지원 테이블

### FAQ 관련
- `ai-navi-faq-table-{env}` - FAQ 메인 테이블
- `ai-navi-faq-category-table-{env}` - FAQ 카테고리 테이블
- `ai-navi-faq-history-table-{env}` - FAQ 변경 이력 테이블

### Source 관련
- `ai-navi-sources-{env}` - AI-Navi 참조 자료 테이블
  - FILE 타입: PDF, 문서 등
  - LINK 타입: 웹사이트, URL 등

### Conversation History 관련
- `ai-navi-conversation-history-{env}` - 자유 대화 히스토리 테이블
  - 질문/답변 기록
  - 응답 시간 및 정확도 통계
  - 첨부 파일 및 참조 소스

## 🔧 환경별 설정

### 개발 (dev)
- Profile: `meeta-ai-navi-dev`
- Region: `ap-northeast-1`

### UAT (uat1, uat2, uat3)
- Profile: `meeta-ai-navi-uat`
- Region: `ap-northeast-1`

### 프로덕션 (prd, prd1, prd2)
- Profile: `meeta-ai-navi-prod`
- Region: `ap-northeast-1`

## 📝 주의사항

- 프로덕션 환경 작업 시 반드시 승인 필요
- 데이터 삭제 작업은 백업 후 진행
- 대량 데이터 작업 시 배치 처리 사용

## 🛠️ 의존성

```json
{
  "@aws-sdk/client-dynamodb": "^3.x",
  "@aws-sdk/lib-dynamodb": "^3.x",
  "commander": "^11.x",
  "chalk": "^5.x"
}
```