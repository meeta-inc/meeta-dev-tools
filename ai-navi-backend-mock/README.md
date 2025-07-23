# AI Navi Backend Mock Server

TypeScript + Fastify 기반의 AI Navi Backend API 목업 서버입니다.

## 기능

- 🚀 **현대적 스택**: TypeScript + Fastify + Zod
- 🔒 **JWE 인증**: Jose 라이브러리를 사용한 JWT 암호화
- 📚 **자동 문서화**: Swagger UI 통합
- 🎯 **실제적 응답**: OpenAPI 스펙 기반 목업 데이터
- ⏱️ **지연 시뮬레이션**: 실제 API 호출과 유사한 응답 지연
- 🔍 **상세 로깅**: 개발용 디버깅 지원

## 설치 및 실행

```bash
# 의존성 설치
cd ai-navi-backend-mock
npm install

# 개발 서버 실행
npm run dev

# 빌드 후 실행
npm run build
npm start
```

## API 엔드포인트

### 1. Chat API
```
POST /ai-navi/chat
```
- **인증**: Bearer JWE 토큰 필요
- **요청 본문**:
```json
{
  "appId": "string",
  "gradeId": "elementary",
  "userId": "string",
  "message": "안녕하세요"
}
```

### 2. Health Check API
```
GET /ai-navi/health
```
- **응답**: 서비스 상태 정보

## 환경 변수 설정

`.env` 파일을 참조하여 필요한 설정을 조정할 수 있습니다:

```env
PORT=3001
NODE_ENV=development
ENABLE_REALISTIC_DELAYS=true
DEFAULT_DELAY_MS=500
```

## API 문서

서버 실행 후 http://localhost:3001/docs 에서 Swagger UI를 통해 API 문서를 확인할 수 있습니다.

## 개발용 JWE 토큰 생성

개발 및 테스트를 위해 mock 토큰을 생성하는 유틸리티가 포함되어 있습니다:

```typescript
import { generateMockToken } from './src/auth/jwt-utils';

const token = await generateMockToken('user123', 'ai-navi-app', 'elementary');
```

## 프로젝트 구조

```
src/
├── index.ts          # 메인 서버 파일
├── types/            # TypeScript 타입 정의
│   └── index.ts
└── auth/             # 인증 관련 유틸리티
    └── jwt-utils.ts
```

## 테스트

```bash
# Chat API 테스트
curl -X POST http://localhost:3001/ai-navi/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWE_TOKEN" \
  -d '{"appId":"test","gradeId":"elementary","userId":"user123","message":"안녕하세요"}'

# Health API 테스트
curl http://localhost:3001/ai-navi/health
```