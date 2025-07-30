# Makefile 명령어 가이드

AI Navi Chat API 테스트 자동화 명령어입니다.

## 기본 명령어

| 명령어 | 설명 | 사용법 |
|--------|------|--------|
| `make help` | 사용 가능한 모든 명령어 표시 | `make help` |
| `make status` | 현재 테스트 환경 상태 확인 | `make status` |

## 설치 및 빌드

| 명령어 | 설명 | 사용법 |
|--------|------|--------|
| `make install` | 프로젝트 의존성 설치 | `make install` |
| `make build` | TypeScript 코드 빌드 | `make build` |
| `make clean` | 빌드 결과물 삭제 | `make clean` |
| `make clean-all` | node_modules 포함 전체 삭제 | `make clean-all` |

## 환경 설정

| 명령어 | 설명 | 사용법 |
|--------|------|--------|
| `make validate-env` | 환경 설정 검증 | `make validate-env` |
| `make check-api` | API 연결 상태 확인 | `make check-api` |
| `make dev-setup` | 전체 개발 환경 구성 | `make dev-setup` |

## 일반 테스트

| 명령어 | 설명 | 사용법 |
|--------|------|--------|
| `make test-single` | 단일 테스트 실행 | `make test-single TEST_ID=ELEMENTARY_A-1` |
| `make test-grade` | 학년별 테스트 | `make test-grade GRADE=middle` |
| `make test-category` | 카테고리별 테스트 | `make test-category CATEGORY='授業・カリキュラム'` |
| `make test-all` | 모든 테스트 실행 (FAQ 포함) | `make test-all` |
| `make test-dry-run` | 테스트 시뮬레이션 (API 호출 없음) | `make test-dry-run GRADE=elementary` |

## FAQ 테스트 (47개)

| 명령어 | 설명 | 사용법 |
|--------|------|--------|
| `make faq-all` | 47개 FAQ 전체 실행 | `make faq-all` |
| `make faq-single` | FAQ 단일 테스트 | `make faq-single ID=INFANT-001` |
| `make faq-single-plus` | FAQ 테스트 + 추가 N개 | `make faq-single-plus ID=ELEM-005 N=3` |

### FAQ 학년별 테스트

| 명령어 | 설명 | 테스트 개수 |
|--------|------|-------------|
| `make test-all-infant` | 유아 FAQ 전체 | 15개 |
| `make test-all-elem` | 초등 FAQ 전체 | 11개 |
| `make test-all-middle` | 중등 FAQ 전체 | 8개 |
| `make test-all-high` | 고등 FAQ 전체 | 12개 |

### FAQ 빠른 테스트

| 명령어 | 설명 | 테스트 ID |
|--------|------|-----------|
| `make test-infant` | 유아 첫 번째 테스트 | INFANT-001 |
| `make test-elem` | 초등 첫 번째 테스트 | ELEM-001 |
| `make test-middle` | 중등 첫 번째 테스트 | MIDDLE-001 |
| `make test-high` | 고등 첫 번째 테스트 | HIGH-001 |

## 성능 테스트

| 명령어 | 설명 | 사용법 |
|--------|------|--------|
| `make load-test` | 부하 테스트 | `make load-test CONCURRENCY=10 DURATION=120` |
| `make load-test-light` | 가벼운 부하 테스트 | `make load-test-light` |
| `make load-test-heavy` | 무거운 부하 테스트 | `make load-test-heavy` |
| `make performance-test` | 성능 모니터링 테스트 | `make performance-test GRADE=elementary` |

## 특수 테스트

| 명령어 | 설명 | 사용법 |
|--------|------|--------|
| `make test-smoke` | 필수 기능 빠른 테스트 | `make test-smoke` |
| `make test-regression` | 전체 학년 포괄적 테스트 | `make test-regression` |
| `make test-nightly` | 야간 테스트 (전체+부하) | `make test-nightly` |
| `make test-integration` | 통합 테스트 | `make test-integration` |

## CI/CD 명령어

| 명령어 | 설명 | 사용법 |
|--------|------|--------|
| `make ci-test` | CI 환경 기본 테스트 | `make ci-test` |
| `make ci-full` | CI 환경 전체 테스트 | `make ci-full` |

## 유틸리티

| 명령어 | 설명 | 사용법 |
|--------|------|--------|
| `make generate-faq` | Excel에서 FAQ 케이스 생성 | `make generate-faq` |
| `make dev-test` | 빠른 개발 테스트 | `make dev-test` |

## 옵션 설명

### 공통 옵션
- `GRADE` - 학년 (elementary/middle/high)
- `NO_SLACK=true` - Slack 알림 비활성화
- `CONCURRENCY` - 동시 실행 수 (기본: 5)
- `DURATION` - 테스트 시간(초) (기본: 60)
- `TARGET_RPS` - 초당 요청 수 (기본: 2)

### FAQ 옵션
- `INTERVAL` - 테스트 간격(초) (기본: 1)
- `MAX_RETRIES` - 최대 재시도 횟수 (기본: 5)

### FAQ 테스트 ID 형식
- 유아: `INFANT-001` ~ `INFANT-015`
- 초등: `ELEM-001` ~ `ELEM-011`
- 중등: `MIDDLE-001` ~ `MIDDLE-008`
- 고등: `HIGH-001` ~ `HIGH-012`