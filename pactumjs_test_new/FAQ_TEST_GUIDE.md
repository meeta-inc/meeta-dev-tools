# 314 Chatbot FAQ 테스트 가이드

## 📋 개요
314 Chatbot FAQ 테스트를 위한 전용 Makefile (`Makefile.faq`)을 사용한 테스트 실행 가이드입니다.
총 47개의 FAQ 테스트 케이스를 다양한 방식으로 실행할 수 있습니다.

## 📁 파일 구성
- **Makefile**: `pactumjs_test_new/Makefile.faq`
- **테스트 데이터**: `pactumjs_test_new/src/data/json/314-chatbot-faq-test-cases.json`
- **테스트 케이스 수**: 47개 (유아 15개, 초등 11개, 중등 8개, 고등 12개)

## 🚀 실행 방법

### 1. 전체 47개 테스트 실행
```bash
make -f Makefile.faq faq-all
```
- 모든 47개 FAQ 테스트를 순차적으로 실행
- 기본 인터벌: 1초
- 구글 시트 업로드 및 슬랙 알림 포함

### 2. 특정 테스트 1개만 실행
```bash
make -f Makefile.faq faq-single ID=INFANT-001
make -f Makefile.faq faq-single ID=ELEM-005
make -f Makefile.faq faq-single ID=MIDDLE-003
make -f Makefile.faq faq-single ID=HIGH-010
```
- 지정한 테스트 ID의 케이스만 실행
- 테스트 완료 후 상세 결과를 슬랙으로 전송

### 3. 특정 테스트 + 추가 N개 실행
```bash
make -f Makefile.faq faq-single-plus ID=INFANT-001 N=3
make -f Makefile.faq faq-single-plus ID=ELEM-005 N=2
make -f Makefile.faq faq-single-plus ID=HIGH-001 N=5
```
- 지정한 테스트 ID부터 시작하여 연속된 N개 추가 실행
- 예: `ID=ELEM-005 N=3` → ELEM-005, ELEM-006, ELEM-007, ELEM-008 실행

## 🎯 학년별 테스트

### 유아 (15개)
```bash
make -f Makefile.faq test-all-infant
```
- 테스트 ID: INFANT-001 ~ INFANT-015

### 초등학생 (11개)
```bash
make -f Makefile.faq test-all-elem
```
- 테스트 ID: ELEM-001 ~ ELEM-011

### 중학생 (8개)
```bash
make -f Makefile.faq test-all-middle
```
- 테스트 ID: MIDDLE-001 ~ MIDDLE-008

### 고등학생 (12개)
```bash
make -f Makefile.faq test-all-high
```
- 테스트 ID: HIGH-001 ~ HIGH-012

## ⚡ 빠른 테스트 (각 학년 첫 번째)
```bash
make -f Makefile.faq test-infant    # INFANT-001
make -f Makefile.faq test-elem      # ELEM-001
make -f Makefile.faq test-middle    # MIDDLE-001
make -f Makefile.faq test-high      # HIGH-001
```

## ⚙️ 옵션 설정

### 테스트 간격 조정
```bash
# 5초 간격으로 실행
make -f Makefile.faq faq-all INTERVAL=5

# 10초 간격으로 실행
make -f Makefile.faq faq-single-plus ID=ELEM-001 N=5 INTERVAL=10
```

### 재시도 횟수 설정
```bash
# 최대 3회 재시도
make -f Makefile.faq faq-all MAX_RETRIES=3

# 재시도 없음
make -f Makefile.faq faq-single ID=HIGH-001 MAX_RETRIES=0
```

## 📊 테스트 결과

### 출력 위치
1. **S3 버킷**: `meeta-ai-navi-test/test-results/`
   - CSV 파일 형식으로 저장
   
2. **구글 시트**: `https://docs.google.com/spreadsheets/d/1RPTo9ReD7XFCbedoI1f3pR6iKGfqYNmyWPWNvPgwn0U`
   - 자동으로 새 시트 생성
   - 시트명 형식: `{테스트타입}_YYYY-MM-DD_HH-mm-ss`
   
3. **슬랙 채널**: `#test-results`
   - 테스트 시작/완료 알림
   - 단일 테스트의 경우 상세 결과 포함

### 결과 형식
- **CSV 컬럼**: 테스트번호, 유저역할, 유저아이디, 테스트카테고리, 메세지, 응답결과_스테이터스코드, main버블, sub버블, cta버블, 응답시간(ms), 성공여부, 검증오류, 실행시간, 응답결과_바디

## 🧹 리포트 정리
```bash
make -f Makefile.faq clean-reports
```
- 로컬에 생성된 테스트 리포트 파일들을 정리

## 📝 테스트 ID 형식

| 학년 | ID 범위 | 예시 |
|------|---------|------|
| 유아 | INFANT-001 ~ INFANT-015 | INFANT-001 |
| 초등 | ELEM-001 ~ ELEM-011 | ELEM-005 |
| 중등 | MIDDLE-001 ~ MIDDLE-008 | MIDDLE-003 |
| 고등 | HIGH-001 ~ HIGH-012 | HIGH-010 |

## 💡 사용 예시

### 예시 1: 유아 FAQ 전체 테스트
```bash
make -f Makefile.faq test-all-infant
```

### 예시 2: 특정 중학생 FAQ 1개 테스트
```bash
make -f Makefile.faq faq-single ID=MIDDLE-005
```

### 예시 3: 고등학생 FAQ 연속 5개 테스트 (느린 간격)
```bash
make -f Makefile.faq faq-single-plus ID=HIGH-001 N=4 INTERVAL=5
```

### 예시 4: 전체 47개 테스트 (재시도 제한)
```bash
make -f Makefile.faq faq-all MAX_RETRIES=3 INTERVAL=2
```

## 🔍 도움말
```bash
make -f Makefile.faq help
```
- 사용 가능한 모든 명령어와 옵션을 확인할 수 있습니다.