# Source Version Test Data Script

## Overview
버전 형식 변경(001-999)에 따른 Source 테스트 데이터 생성 스크립트

## Version Format Change
- **이전**: 1.0.0, 1.0.1, 2.0.0 (Semantic Versioning)
- **현재**: 001, 002, 003 ~ 999 (3자리 숫자 형식)

## Test Versions
스크립트는 다음 버전들에 대한 테스트 데이터를 생성합니다:
- `001`: 초기 버전
- `002`: 첫 번째 업데이트
- `003`: 두 번째 업데이트
- `099`: 중간 버전 테스트
- `999`: 최대 버전 테스트

## Scripts

### 1. add-sources-with-versions.js
버전별 테스트 데이터를 생성하는 전용 스크립트

```bash
# 실행 방법
cd /Users/rimapa2025/workspace/meeta-dev-tools/dynamodb-tools
node scripts/source/add-sources-with-versions.js

# 환경별 실행
NODE_ENV=development node scripts/source/add-sources-with-versions.js
NODE_ENV=staging node scripts/source/add-sources-with-versions.js
```

#### 생성되는 데이터
- **FILE 타입**: 각 버전별 1개씩 (총 5개)
- **LINK 타입**: 각 버전별 1개씩 (총 5개)
- **다중 버전 히스토리**: 모든 이전 버전을 포함하는 샘플 1개

#### 상태 분포
- `ACTIVE`: 대부분의 데이터
- `PROCESSING`: 버전 099 LINK 타입
- `FAILED`: 버전 999 LINK 타입
- `ARCHIVED`: 버전 999 FILE 타입

### 2. 기존 스크립트 업데이트
다음 스크립트들이 새로운 버전 형식으로 업데이트되었습니다:

- **seed-sources.js**: 초기 데이터 시딩 (버전 001)
- **add-sources.js**: 추가 데이터 생성 (버전 002, 099, 999 포함)

## Database Schema Updates

### 새로운 필드
- `version`: "001" ~ "999" (3자리 문자열)
- `version_history`: 이전 버전 이력 배열
  ```javascript
  version_history: [
    {
      version: "002",
      content: { /* 해당 버전의 컨텐츠 */ },
      createdAt: "2025-01-15T10:00:00Z"
    },
    {
      version: "001",
      content: { /* 해당 버전의 컨텐츠 */ },
      createdAt: "2025-01-10T10:00:00Z"
    }
  ]
  ```
- `appId`: 애플리케이션 ID
- `metadata`: 추가 메타데이터 객체

### GSI 변경
- `GSI2SK`: `CLIENT#${clientId}#VERSION#${version}` (날짜 대신 버전 사용)

### S3 저장 경로 변경
- **이전**: `file/original/{filename}`
- **현재**: `source/{clientId}/{uuid}.{extension}`

## 테스트 시나리오

### 1. 버전 증가 테스트
```javascript
// 001 -> 002 -> 003 순차적 버전 업데이트
// version_history에 이전 버전들이 누적됨
```

### 2. 버전 점프 테스트
```javascript
// 003 -> 099 큰 폭의 버전 증가
// 중간 버전 없이 바로 점프
```

### 3. 최대 버전 테스트
```javascript
// 999: 최대 허용 버전
// 더 이상 버전 증가 불가능
```

### 4. 다양한 상태 테스트
- `ACTIVE`: 정상 활성 상태
- `PROCESSING`: 크롤링/업로드 진행 중
- `FAILED`: 처리 실패
- `ARCHIVED`: 아카이브됨

## 검증 방법

```bash
# 데이터 검증 스크립트 실행
node scripts/source/verify-sources.js

# AWS CLI로 직접 확인
aws dynamodb query \
  --table-name ai-navi-sources-dev \
  --key-condition-expression "PK = :pk" \
  --expression-attribute-values '{":pk":{"S":"CLIENT#RS000001"}}' \
  --profile meeta-ai-navi-dev
```

## 주의사항

1. **버전 형식**: 반드시 3자리 문자열 형식 사용 ("001", "002", ... "999")
2. **버전 히스토리**: 최신 버전이 먼저 오도록 정렬 (내림차순)
3. **S3 경로**: Source 파일은 `source/{clientId}/` 경로에 저장
4. **테이블명**: 환경에 따라 자동 선택
   - development: `ai-navi-sources-dev`
   - staging: `ai-navi-sources-staging`
   - production: `ai-navi-sources-prod`

## 관련 API Endpoints

새로운 버전 관리를 지원하는 API:
- `GET /sources/version-history/{sourceId}`: 버전 이력 조회
- `POST /files/upload/source`: Source 파일 업로드 (S3 source/ 경로)

## 문제 해결

### 스크립트 실행 오류
```bash
# AWS 프로파일 확인
export AWS_PROFILE=meeta-ai-navi-dev

# Node.js 버전 확인 (14.x 이상 필요)
node --version

# 의존성 설치
npm install
```

### 데이터 정리
```bash
# 테스트 데이터 삭제
node scripts/source/delete-sources.js
```