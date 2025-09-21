# AI-Navi Attributes DynamoDB 관리 스크립트

## 개요
AI-Navi 서비스의 속성(Attribute) 데이터를 관리하는 스크립트 모음입니다.
학년, 과목, 코스 등의 분류 체계를 DynamoDB에 저장하고 관리합니다.

## 테이블 구조

### 테이블명
- Development: `ai-navi-attributes-dev`
- Staging: `ai-navi-attributes-stg`
- Production: `ai-navi-attributes`

### Primary Key
- **PK**: `CLIENT#<clientId>` (예: `CLIENT#RS000001`)
- **SK**: `ATTRIBUTE#<attributeId>` (예: `ATTRIBUTE#elementary`)

### Global Secondary Indexes
1. **GSI1**: 그룹별 우선순위 정렬 조회
   - PK: `GROUP#<attributeGroup>`
   - SK: `PRIORITY#<priority>#ATTRIBUTE#<attributeId>`

2. **GSI2**: 상태별 필터링
   - PK: `STATUS#<status>`
   - SK: `CLIENT#<clientId>#GROUP#<attributeGroup>`

3. **GSI3**: 클라이언트+상태별 복합 필터링
   - PK: `CLIENT#<clientId>#STATUS#<status>`
   - SK: `GROUP#<attributeGroup>#NAME#<attributeName>`

## 스크립트 사용법

### 1. 속성 데이터 추가 (add-attributes.js)
기존 데이터를 유지하면서 새로운 속성 데이터를 추가합니다.

```bash
# Development 환경 (기본값)
node scripts/attribute/add-attributes.js

# Staging 환경
NODE_ENV=staging AWS_PROFILE=meeta-ai-navi-stg node scripts/attribute/add-attributes.js

# Production 환경
NODE_ENV=production AWS_PROFILE=meeta-ai-navi-prod node scripts/attribute/add-attributes.js
```

#### 추가되는 속성 데이터:
- **학년(grade) 그룹**: 幼児, 小学生, 中学生, 高校生
- **과목(subject) 그룹**: 数学, 英語, 国語, 理科, 社会
- **코스(course) 그룹**: 基礎コース, 標準コース, 発展コース

### 2. 속성 조회 (verify-attributes.js)
테이블에 저장된 속성 데이터를 조회하고 검증합니다.

```bash
node scripts/attribute/verify-attributes.js
```

### 3. 속성 삭제 (delete-attributes.js)
특정 클라이언트의 속성 데이터를 삭제합니다.

```bash
# 특정 클라이언트의 모든 속성 삭제
node scripts/attribute/delete-attributes.js --clientId RS000001
```

## 환경 변수

- `NODE_ENV`: 실행 환경 (development | staging | production)
- `AWS_PROFILE`: AWS 프로파일 이름
- `AWS_REGION`: AWS 리전 (기본값: ap-northeast-1)

## 데이터 구조 예시

### 학년 속성 (幼児)
```json
{
  "PK": "CLIENT#RS000001",
  "SK": "ATTRIBUTE#preschool",
  "attributeId": "preschool",
  "clientId": "RS000001",
  "attributeGroup": "grade",
  "attributeName": "幼児",
  "attributeIcon": {
    "type": "emoji",
    "value": "🐣"
  },
  "subAttributes": [
    {"id": "3years", "name": "3歳", "order": 1},
    {"id": "4years", "name": "4歳", "order": 2},
    {"id": "5years", "name": "5歳", "order": 3}
  ],
  "priority": 1,
  "status": "ACTIVE",
  "createdAt": "2025-01-16T10:00:00Z",
  "createdBy": "admin@example.com"
}
```

### 서브 속성 구조
각 메인 속성은 하위 서브 속성을 가질 수 있습니다:
- **幼児**: 3歳, 4歳, 5歳
- **小学生**: 小1 ~ 小6
- **中学生**: 中1 ~ 中3
- **高校生**: 高1 ~ 高3

## 주의사항

1. **중복 방지**: 이미 존재하는 속성은 건너뜁니다 (ConditionalCheckFailedException)
2. **환경 확인**: Production 환경 작업 시 주의하세요
3. **권한 확인**: AWS 프로파일에 DynamoDB 읽기/쓰기 권한이 있는지 확인하세요
4. **데이터 백업**: Production 데이터 수정 전 백업을 권장합니다

## 관련 문서
- [Notion - Attributes 데이터베이스 스키마](https://www.notion.so/27045c9756f880de9849f6eff263cf82)
- [GitHub Issue #25 - DynamoDB 테이블 생성 요청](https://github.com/meeta-inc/ai-navi-infrastructure/issues/25)