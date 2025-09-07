# FreeConversationHistory 테이블 관리 스크립트

AI-Navi FreeConversationHistory 테이블의 대화 기록 데이터를 관리하기 위한 스크립트 모음입니다.

## 📋 테이블 정보

- **테이블명**: `ai-navi-conversation-history-{env}`
- **용도**: AI-Navi의 자유 대화 히스토리 데이터 관리
- **환경**: development, staging, production

## 🛠️ 스크립트 목록

### 1. seed-conversations.js
초기 대화 데이터를 DynamoDB에 삽입합니다.

```bash
# 기본 실행 (development 환경)
node scripts/conversation/seed-conversations.js

# 특정 환경 지정
NODE_ENV=staging node scripts/conversation/seed-conversations.js

# AWS 프로파일 지정
AWS_PROFILE=meeta-ai-navi-prod NODE_ENV=production node scripts/conversation/seed-conversations.js
```

**시딩되는 데이터 (3개):**
1. **일반 질문 1**: 塾の講義 정보 문의
2. **일반 질문 2**: 영어 수업 문의  
3. **입학/체험 질문**: 나이 제한 문의

### 2. verify-conversations.js
삽입된 대화 데이터를 조회하고 검증합니다.

```bash
# 데이터 검증
node scripts/conversation/verify-conversations.js

# 특정 환경에서 검증
NODE_ENV=staging node scripts/conversation/verify-conversations.js
```

**검증 항목:**
- 클라이언트별 대화 목록
- 날짜별 대화 조회
- 사용자 속성별 대화 조회
- 월별 통계 및 분석
- 응답 시간, 성공률, 정확도 통계

### 3. delete-conversations.js
대화 데이터를 삭제합니다.

```bash
# 특정 클라이언트의 모든 대화 삭제
node scripts/conversation/delete-conversations.js --client=RS000001

# 특정 날짜의 대화 삭제
node scripts/conversation/delete-conversations.js --client=RS000001 --date=2025-08-26

# 모든 대화 삭제 (주의!)
node scripts/conversation/delete-conversations.js --all

# 특정 환경에서 삭제
NODE_ENV=staging node scripts/conversation/delete-conversations.js --client=RS000001
```

## 🔑 환경 변수

| 변수명 | 설명 | 기본값 |
|--------|------|--------|
| `NODE_ENV` | 실행 환경 (development/staging/production) | `development` |
| `AWS_REGION` | AWS 리전 | `ap-northeast-1` |
| `AWS_PROFILE` | AWS CLI 프로파일 | (시스템 기본값) |

## 📊 데이터 구조

### Primary Keys
- **PK (Partition Key)**: `CLIENT#<clientId>`
- **SK (Sort Key)**: `CONV#<conversationId>`

### Global Secondary Indexes
- **GSI1**: 날짜별 대화 조회 (`CLIENT#<clientId>#DATE#<date>`)
- **GSI2**: 속성별 대화 통계 (`CLIENT#<clientId>#ATTR#<targetAttribute>`)
- **GSI3**: 월별 통계 분석 (`YEARMONTH#<yearMonth>`)

### 주요 필드
- **conversationId**: 대화 고유 ID (예: FAQ202508260059)
- **question**: 사용자 질문
- **mainBubble**: 메인 답변
- **subBubble**: 보조 답변
- **ctaBubble**: CTA 메시지
- **responseTime**: 응답 시간 (ms)
- **accuracy**: 답변 정확도 (0.0~1.0)
- **attachments**: 첨부 파일 (이미지 등)

## 📈 통계 및 분석

verify-conversations.js 실행 시 다음 통계를 확인할 수 있습니다:

- **응답 시간 통계**: 평균, 최소, 최대 응답 시간
- **성공률**: 성공/실패 비율
- **정확도**: 평균 답변 정확도
- **카테고리별 분포**: 질문 카테고리별 통계

## 🚀 일반적인 사용 순서

1. **초기 데이터 시딩**
   ```bash
   npm run seed:conversation
   ```

2. **데이터 검증**
   ```bash
   npm run verify:conversation
   ```

3. **필요 시 삭제**
   ```bash
   npm run delete:conversation -- --client=RS000001
   ```

## 📝 데이터 보존 정책

| 데이터 유형 | 보존 기간 | 처리 방법 |
|------------|-----------|-----------|
| 일반 대화 | 90일 | TTL 자동 삭제 |
| 높은 정확도 대화 (> 0.9) | 180일 | 연장 보존 |
| 분석용 데이터 | 1년 | 아카이브 테이블 이동 |

## ⚠️ 주의사항

- Production 환경에서는 매우 신중하게 작업하세요
- 대량 삭제 전 반드시 백업을 권장합니다
- TTL 설정으로 90일 후 자동 삭제됩니다
- AWS 권한이 필요합니다 (DynamoDB 읽기/쓰기)
- 일본어 컨텐츠가 포함되어 있으므로 인코딩에 주의하세요

## 📚 참고 자료

- [Notion Schema Documentation](https://www.notion.so/FreeConversationHistory-25c45c9756f880ad954aea22ebd6879d)
- AI-Navi API Documentation
- DynamoDB Best Practices