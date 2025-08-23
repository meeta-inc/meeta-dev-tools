# AI Model 테스트 가이드

## 개요
AI Navi Chat API 테스트에서 이제 `anthropic`과 `openai` 두 가지 모델을 선택하여 테스트할 수 있습니다.

## 모델 파라미터
- **anthropic** (기본값): Claude 모델 사용
- **openai**: GPT 모델 사용

## 사용 방법

### 1. 단일 테스트 실행

#### Anthropic (기본)
```bash
make test-single TEST_ID=ELEMENTARY_A-1
```

#### OpenAI 모델 지정
```bash
make test-single TEST_ID=ELEMENTARY_A-1 MODEL=openai
```

### 2. 학년별 테스트

#### Anthropic 모델로 중학교 테스트
```bash
make test-grade GRADE=middle
```

#### OpenAI 모델로 중학교 테스트
```bash
make test-grade GRADE=middle MODEL=openai
```

### 3. 카테고리별 테스트

#### Anthropic 모델
```bash
make test-category CATEGORY='授業・カリキュラム'
```

#### OpenAI 모델
```bash
make test-category CATEGORY='授業・カリキュラム' MODEL=openai
```

### 4. FAQ 테스트

#### 전체 FAQ 테스트 (Anthropic)
```bash
make faq-all
```

#### 전체 FAQ 테스트 (OpenAI)
```bash
make faq-all MODEL=openai
```

#### 단일 FAQ 테스트
```bash
make faq-single ID=INFANT-001 MODEL=openai
```

### 5. 전체 테스트

#### Anthropic 모델로 전체 테스트
```bash
make test-all
```

#### OpenAI 모델로 전체 테스트
```bash
make test-all MODEL=openai
```

## 모델 비교 테스트

두 모델의 응답을 비교하려면 다음과 같이 실행합니다:

```bash
# Anthropic 모델 테스트
make test-single TEST_ID=ELEMENTARY_A-1 MODEL=anthropic

# OpenAI 모델 테스트
make test-single TEST_ID=ELEMENTARY_A-1 MODEL=openai
```

## 주의사항

1. **기본값**: MODEL 파라미터를 지정하지 않으면 자동으로 `anthropic`이 사용됩니다.
2. **대소문자**: 모델명은 소문자로 입력해야 합니다 (`anthropic`, `openai`).
3. **API 지원**: API 서버가 해당 모델을 지원하는지 확인하세요.

## 구현 상세

### API 요청 파라미터
`student/chat` 엔드포인트로 전송되는 JSON에 `model` 필드가 추가됩니다:

```json
{
  "clientId": "AB123456",
  "appId": "3141",
  "gradeId": "elementary",
  "userId": "test_user",
  "message": "질문 내용",
  "model": "openai"  // 또는 "anthropic"
}
```

### 수정된 파일
- `src/api/client.js`: model 파라미터 추가
- `scripts/run-tests.js`: --model 옵션 처리
- `Makefile`: MODEL 변수 및 관련 커맨드 업데이트

## 테스트 결과 확인

테스트 결과는 다음 위치에서 확인할 수 있습니다:
- **로컬 리포트**: `reports/` 디렉토리
- **S3 업로드**: 자동으로 S3에 업로드됨
- **Google Sheets**: 구성된 경우 자동 업로드
- **Slack 알림**: 구성된 경우 자동 전송

모델별로 응답 시간, 정확도, 버블 구조 등을 비교 분석할 수 있습니다.