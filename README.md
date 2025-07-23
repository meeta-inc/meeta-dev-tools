# MeetA Development Tools

[![CI/CD Pipeline](https://github.com/meeta-inc/meeta-dev-tools/actions/workflows/ci.yml/badge.svg)](https://github.com/meeta-inc/meeta-dev-tools/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/meeta-inc/meeta-dev-tools/branch/main/graph/badge.svg)](https://codecov.io/gh/meeta-inc/meeta-dev-tools)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

MeetA 개발을 위한 도구들을 모아놓은 모노레포입니다.

## 프로젝트 구성

### 🚀 AI Navi Backend Mock (`ai-navi-backend-mock/`)

![Jest Tests](https://img.shields.io/badge/tests-27%20passed-brightgreen)
![Coverage](https://img.shields.io/badge/coverage-95%25-brightgreen)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)

AI Navi 프론트엔드 개발을 위한 Mock API 서버입니다.

**주요 기능:**
- Chat API 모킹 (`/students/chat`)
- Health Check API (`/ai-navi/health`)
- JWE 토큰 인증 (현재는 존재 여부만 확인)
- LLM 응답 구조 지원 (main, sub, cta bubbles)
- Link attachment 지원
- Swagger UI 문서화 (`/docs`)

**기술 스택:**
- TypeScript + Fastify
- Jest 테스팅
- Zod 검증
- OpenAPI 3.0 문서화

## 시작하기

### 전체 프로젝트 설정

```bash
# 프로젝트 클론
git clone https://github.com/meeta-inc/meeta-dev-tools.git
cd meeta-dev-tools

# 의존성 설치 (각 프로젝트별로)
cd ai-navi-backend-mock
npm install
```

### AI Navi Backend Mock 실행

```bash
cd ai-navi-backend-mock

# 개발 서버 실행
npm run dev

# 프로덕션 빌드 및 실행
npm run build
npm start

# 테스트 실행
npm test
make test

# API 테스트 (Makefile 사용)
make test-all
make test-health
make test-chat
```

## API 문서

AI Navi Backend Mock이 실행 중일 때:
- **서버**: http://localhost:3001
- **API 문서**: http://localhost:3001/docs
- **Health Check**: http://localhost:3001/ai-navi/health

## 개발 가이드

### 코드 스타일
- TypeScript strict 모드 사용
- ESLint + Prettier (향후 추가 예정)
- Jest를 이용한 테스트 주도 개발

### Git 워크플로우
- `main` 브랜치: 안정화된 코드
- `develop` 브랜치: 개발 중인 코드
- `feature/*` 브랜치: 새로운 기능 개발

### 테스트
모든 PR은 테스트 통과가 필수입니다:

**Jest 단위 테스트 (27개 테스트)**
```bash
# 유닛 테스트 실행
cd ai-navi-backend-mock
npm test

# 커버리지 확인 (95% 달성)
npm run test:coverage

# 감시 모드로 테스트 실행
npm run test:watch
```

**API 통합 테스트**
```bash
# Makefile을 이용한 통합 테스트
make test-all
make test-health
make test-chat
make test-validation
```

**CI/CD 자동 테스트**
- GitHub Actions에서 Node.js 18.x, 20.x, 22.x 매트릭스 테스트
- PR마다 자동 커버리지 리포트 생성
- Codecov를 통한 커버리지 추적

## 배포

GitHub Actions를 통한 자동 배포:
- **테스트**: 모든 PR과 push에서 자동 테스트 실행
- **빌드 검증**: TypeScript 컴파일 및 빌드 확인
- **도커 이미지**: 성공시 Docker 이미지 빌드 (향후 추가)

## 기여하기

1. 이슈 생성 또는 기존 이슈 확인
2. Feature 브랜치 생성 (`git checkout -b feature/amazing-feature`)
3. 변경사항 커밋 (`git commit -m 'Add some amazing feature'`)
4. 브랜치에 푸시 (`git push origin feature/amazing-feature`)
5. Pull Request 생성

## 라이센스

MIT License - 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

## 연락처

- **Organization**: MeetA Inc.
- **Repository**: https://github.com/meeta-inc/meeta-dev-tools
- **Issues**: https://github.com/meeta-inc/meeta-dev-tools/issues