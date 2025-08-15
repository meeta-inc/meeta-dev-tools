# DynamoDB Data Tools

AI Navi 프로젝트의 DynamoDB 데이터 관리 도구 모음입니다.

## 📁 폴더 구조

```
dynamodb-tools/
├── scripts/          # 실행 가능한 스크립트
│   ├── faq/         # FAQ 관련 스크립트
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
```

### FAQ 데이터 관리

#### 카테고리 데이터 시딩
```bash
node scripts/faq/seed-categories.js --env dev
```

#### FAQ 데이터 시딩
```bash
node scripts/faq/seed-faqs.js --env dev
```

#### 데이터 검증
```bash
node scripts/faq/validate-data.js --env dev
```

## 📊 지원 테이블

### FAQ 관련
- `ai-navi-faq-table-{env}` - FAQ 메인 테이블
- `ai-navi-faq-category-table-{env}` - FAQ 카테고리 테이블
- `ai-navi-faq-history-table-{env}` - FAQ 변경 이력 테이블

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