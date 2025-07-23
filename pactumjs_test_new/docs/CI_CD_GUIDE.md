# CI/CD Guide - PactumJS Test Automation

## 개요

PactumJS 테스트 자동화는 GitHub Actions의 Composite Actions를 사용하여 구현되었습니다. 이를 통해 서브디렉토리의 독립성을 유지하면서도 GitHub Actions의 제약사항을 해결합니다.

## 아키텍처

```
meeta-dev-tools/
├── .github/
│   └── workflows/
│       └── pactum-tests.yml          # 메인 트리거 워크플로우
├── pactumjs_test_new/
│   └── .github/
│       └── actions/
│           └── test-automation/
│               └── action.yml        # Composite Action 정의
```

## 워크플로우 트리거

### 1. 수동 실행 (workflow_dispatch)
GitHub Actions 탭에서 수동으로 실행 가능:
- **test-type**: single, grade, category, full 중 선택
- **grade**: elementary, middle, high, all (grade 테스트 시)
- **category**: 카테고리명 입력 (category 테스트 시)
- **test-id**: 테스트 ID 입력 (single 테스트 시)
- **slack-notification**: Slack 알림 여부
- **gsheet-upload**: Google Sheets 업로드 여부

### 2. 스케줄 실행
매일 새벽 2시(KST)에 자동 실행:
- 전체 학년(elementary, middle, high) 병렬 테스트
- 결과 자동 업로드 및 Slack 알림

### 3. Push 트리거
main 또는 develop 브랜치에 push 시:
- `pactumjs_test_new/` 디렉토리 변경 감지
- 스케줄 테스트와 동일한 전체 테스트 실행

### 4. Pull Request
PR 생성/업데이트 시:
- 빠른 단일 테스트만 실행
- Slack/Google Sheets 업로드 비활성화

## 사용 예시

### 수동으로 단일 테스트 실행
1. GitHub 리포지토리 > Actions 탭
2. "PactumJS Test Suite" 워크플로우 선택
3. "Run workflow" 클릭
4. 옵션 설정:
   - test-type: `single`
   - test-id: `ELEMENTARY_A-1`
   - slack-notification: `true`
   - gsheet-upload: `true`
5. "Run workflow" 버튼 클릭

### 특정 학년 테스트 실행
```yaml
test-type: grade
grade: elementary
```

### 카테고리별 테스트 실행
```yaml
test-type: category
category: GREETING
```

## 환경 변수 설정

### 필수 GitHub Secrets
```
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
GOOGLE_PRIVATE_KEY
SLACK_WEBHOOK_URL
```

### 환경별 설정
- **test**: PR 및 테스트 환경용 (mock 자격증명)
- **production**: 실제 API 및 서비스 연동

## 결과 확인

### 1. GitHub Actions
- 각 워크플로우 실행 결과 확인
- 아티팩트에서 상세 테스트 리포트 다운로드

### 2. Slack 알림
- `#ci-test-results` 채널에서 실시간 알림 확인
- Google Sheets 바로가기 링크 포함

### 3. Google Sheets
- 자동 업로드된 결과 확인
- 학년별 시트 분리 (`Results_elementary`, `Results_middle`, `Results_high`)

## 문제 해결

### 워크플로우가 실행되지 않는 경우
1. 워크플로우 파일이 `.github/workflows/` 루트에 있는지 확인
2. GitHub Secrets가 올바르게 설정되어 있는지 확인
3. 브랜치 권한 및 워크플로우 권한 확인

### 테스트 실패 시
1. GitHub Actions 로그에서 상세 오류 확인
2. 아티팩트에서 테스트 리포트 다운로드
3. Slack 알림의 실패 상세 정보 확인

## 로컬 개발

### Composite Action 테스트
```bash
# 로컬에서 action.yml 검증
act -j manual-test -W .github/workflows/pactum-tests.yml
```

### 워크플로우 수정
1. `.github/workflows/pactum-tests.yml` 수정 (트리거 로직)
2. `pactumjs_test_new/.github/actions/test-automation/action.yml` 수정 (테스트 로직)

## 마이그레이션 가이드

기존 서브디렉토리 워크플로우에서 마이그레이션:

1. 서브디렉토리의 워크플로우 로직을 Composite Action으로 이동
2. 루트에 트리거 워크플로우 생성
3. 환경 변수 및 시크릿 설정
4. 테스트 및 검증

## 참고 사항

- GitHub Actions는 루트 `.github/workflows/`만 인식
- Composite Actions로 모듈화하여 재사용성 향상
- 스케줄 실행은 UTC 기준으로 설정 (KST -9시간)
- 워크플로우 실행 제한: 동시 실행 수, 월간 실행 시간 확인 필요