# Source 테이블 관리 스크립트

AI-Navi Source 테이블의 데이터를 관리하기 위한 스크립트 모음입니다.

## 📋 테이블 정보

- **테이블명**: `ai-navi-sources-{env}`
- **용도**: AI-Navi의 참조 자료(링크, 파일 등) 관리
- **환경**: development, staging, production

## 🛠️ 스크립트 목록

### 1. seed-sources.js
초기 Source 데이터를 DynamoDB에 삽입합니다.

```bash
# 기본 실행 (development 환경)
node scripts/source/seed-sources.js

# 특정 환경 지정
NODE_ENV=staging node scripts/source/seed-sources.js

# AWS 프로파일 지정
AWS_PROFILE=meeta-ai-navi-prod NODE_ENV=production node scripts/source/seed-sources.js
```

**시딩되는 데이터:**
1. **FILE 타입**: rensei_pamplet.pdf (錬成会説明パンフレット)
2. **LINK 타입**: 3.14ホームページ (https://www.314community.com/)

### 2. verify-sources.js
삽입된 Source 데이터를 조회하고 검증합니다.

```bash
# 데이터 검증
node scripts/source/verify-sources.js

# 특정 환경에서 검증
NODE_ENV=staging node scripts/source/verify-sources.js
```

**검증 항목:**
- 클라이언트별 Source 목록
- 상태별 (ACTIVE) Source 조회
- 타입별 (FILE, LINK) Source 조회
- 우선순위 정렬 확인

### 3. delete-sources.js
Source 데이터를 삭제합니다. (소프트 삭제/하드 삭제 선택 가능)

```bash
# 특정 클라이언트의 모든 Source 삭제
node scripts/source/delete-sources.js --client=RS000001

# 모든 Source 삭제 (주의!)
node scripts/source/delete-sources.js --all

# 특정 환경에서 삭제
NODE_ENV=staging node scripts/source/delete-sources.js --client=RS000001
```

**삭제 옵션:**
- **소프트 삭제 (아카이브)**: 상태를 ARCHIVED로 변경, 90일 후 자동 삭제
- **하드 삭제**: DynamoDB에서 즉시 완전 삭제

## 🔑 환경 변수

| 변수명 | 설명 | 기본값 |
|--------|------|--------|
| `NODE_ENV` | 실행 환경 (development/staging/production) | `development` |
| `AWS_REGION` | AWS 리전 | `ap-northeast-1` |
| `AWS_PROFILE` | AWS CLI 프로파일 | (시스템 기본값) |

## 📊 데이터 구조

### Primary Keys
- **PK (Partition Key)**: `CLIENT#<clientId>`
- **SK (Sort Key)**: `SOURCE#<sourceId>`

### Global Secondary Indexes
- **GSI1**: 상태별 우선순위 정렬 조회
- **GSI2**: 타입별 최신순 조회
- **GSI3**: 클라이언트+타입별 필터링

### Source 타입
- **FILE**: 파일 타입 (PDF, DOC 등)
  - fileName, fileSize, mimeType, fileUrl
- **LINK**: 웹 링크
  - url, allowCrossDomain

### 상태값
- `ACTIVE`: 활성 상태 (LLM 참조 가능)
- `PROCESSING`: 처리 중
- `FAILED`: 처리 실패
- `ARCHIVED`: 아카이브됨 (소프트 삭제)

## 🚀 일반적인 사용 순서

1. **초기 데이터 시딩**
   ```bash
   node scripts/source/seed-sources.js
   ```

2. **데이터 검증**
   ```bash
   node scripts/source/verify-sources.js
   ```

3. **필요 시 삭제**
   ```bash
   node scripts/source/delete-sources.js --client=RS000001
   ```

## ⚠️ 주의사항

- Production 환경에서는 매우 신중하게 작업하세요
- 삭제 작업 전 반드시 백업을 권장합니다
- 하드 삭제는 복구가 불가능합니다
- AWS 권한이 필요합니다 (DynamoDB 읽기/쓰기)

## 📝 추가 기능 개발 시

새로운 Source 타입이나 기능 추가 시:
1. `seed-sources.js`에 샘플 데이터 추가
2. `verify-sources.js`에 검증 로직 추가
3. 필요시 GSI 활용한 조회 기능 추가