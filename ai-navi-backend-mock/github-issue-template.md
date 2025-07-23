# AI Navi 외부생용 CS 챗봇 프론트엔드 구현

## 📋 개요
학원 웹사이트에 적용될 외부생용 CS 챗봇 UI를 구현합니다. AI Navi Backend Mock API와 연동하여 실시간 챗봇 기능을 제공합니다.

## 🎯 요구사항

### 1. 응답 원칙 구현
- **정확성**: 학원 공식 정보만 제공
- **명확성**: 핵심 답변을 첫 번째 버블에 즉시 제시
- **친절함**: 학부모가 신뢰를 느낄 수 있는 따뜻한 말투와 이모티콘 사용
- **UI 적합성**: 버블 1개당 최대 150자 이내 표시 (2-3줄 권장)
- **학년 고려**: 학년별 맞춤 응답 제공

### 2. 버블 구성 구현

#### 버블 타입
1. **Main 버블 (핵심 요약)**
   - 사용자 질문에 대한 핵심 정보 즉시 제공
   - 1문장 또는 짧은 단락 구성
   - 주어는 {학원 이름} 사용

2. **Sub 버블 (보충 설명)** 
   - 구체적인 정보, 구조화된 내용 제공
   - 리스트, 표 형식 허용
   - 참고 자료 첨부 가능

3. **CTA 버블 (유도 멘트)**
   - 다음 행동 유도 문장 포함
   - 상황별 공감 문장 추가 가능

### 3. 메시지 타입별 UI 구현

#### (a) Text Only
- 기본 텍스트 메시지
- 링크는 자연스러운 문장형태로 삽입
- 개조식/강조 표현 지원

#### (b) Image/Video  
- 텍스트 버블 아래 미디어 표시
- 썸네일 또는 embedded video
- 수업 장면, 교재 이미지 등 활용

#### (c) Table (향후 구현)
- 요금표, 시간표 등 정형 정보
- JSON → Table 렌더링

### 4. Mock API 연동

#### 엔드포인트
- **Chat API**: `POST http://localhost:3001/ai-navi/chat`
- **Health Check**: `GET http://localhost:3001/ai-navi/health`

#### 인증
- `X-JWE-Token` 헤더 사용
- JWT 토큰 관리 구현

#### 요청/응답 형식
```typescript
// Request
interface ChatRequest {
  appId: string;
  gradeId: 'preschool' | 'elementary' | 'middle' | 'high';
  userId: string;
  message: string;
}

// Response  
interface ChatResponse {
  messageType: 'Text Only' | 'Image/Video' | 'Table';
  bubbles: BubbleType[];
  sessionId?: string;
  timestamp: string;
}

interface BubbleType {
  type: 'main' | 'sub' | 'cta';
  response: string;
  tool?: string;
}
```

## 🛠 기술 스택
- React + TypeScript
- 상태 관리 (Context API 또는 Redux)
- Styled Components 또는 Emotion
- Axios 또는 Fetch API

## ✅ 체크리스트

### UI/UX
- [ ] 챗봇 인터페이스 레이아웃 구현
- [ ] 버블별 디자인 시스템 구현 (main/sub/cta)
- [ ] 150자 제한 및 자동 줄바꿈 처리
- [ ] 메시지 타입별 렌더링 (Text/Image/Video)
- [ ] 모바일/PC 반응형 디자인
- [ ] 로딩 상태 표시
- [ ] 에러 상태 처리

### 기능 구현
- [ ] Mock API 연동 설정
- [ ] JWE 토큰 인증 구현
- [ ] 채팅 세션 관리
- [ ] 학년 선택 기능
- [ ] 메시지 전송/수신 처리
- [ ] 실시간 타이핑 애니메이션
- [ ] 이전 대화 내역 표시

### 테스트
- [ ] Mock API 연동 테스트
- [ ] 다양한 응답 타입 테스트
- [ ] 에러 케이스 처리 테스트
- [ ] 반응형 디자인 테스트

## 🚀 Mock Server 연동 가이드

### 1. Mock Server 실행
```bash
cd ai-navi-backend-mock
npm run dev
# Server runs at http://localhost:3001
```

### 2. 토큰 생성
```bash
node generate-token.mjs
# 생성된 JWE 토큰을 복사하여 사용
```

### 3. API 테스트
```bash
# Health Check
curl http://localhost:3001/ai-navi/health

# Chat API
curl -X POST http://localhost:3001/ai-navi/chat \
  -H "Content-Type: application/json" \
  -H "X-JWE-Token: {생성된_토큰}" \
  -d '{"appId":"ai-navi-app","gradeId":"elementary","userId":"user123","message":"안녕하세요"}'
```

### 4. 프론트엔드 환경 설정
```env
REACT_APP_API_BASE_URL=http://localhost:3001
REACT_APP_JWE_TOKEN={생성된_토큰}
```

## 📝 참고 사항
- 버블 구성은 노션 문서의 정책을 준수
- 학부모 대상 서비스이므로 신뢰감 있는 UI/UX 중요
- 향후 프로덕션 API로 전환 시 URL만 변경하면 되도록 구현

## 🔗 관련 문서
- [AI Navi Chatbot 답변 생성 정책 (Notion)](https://www.notion.so/AI-Navi-Chatbot-23445c9756f8806c944dd386622577c0)
- Mock API 문서: http://localhost:3001/docs