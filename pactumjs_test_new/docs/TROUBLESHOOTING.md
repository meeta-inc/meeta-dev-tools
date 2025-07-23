# 문제 해결 가이드

AI Navi Chat API Test Automation 사용 중 발생할 수 있는 문제들과 해결 방법을 정리한 가이드입니다.

## 🚨 일반적인 문제들

### 1. 환경 설정 문제

#### 문제: `.env` 파일 관련 오류

**증상:**
```
MissingEnvVarsError: The following variables were defined in .env.example but are not present in .env
```

**해결방법:**
```bash
# 1. .env 파일 존재 확인
ls -la .env

# 2. 환경 변수 검증
make validate-env

# 3. 누락된 변수 추가
cp .env.example .env
# .env 파일 편집하여 실제 값 입력
```

**예방책:**
- `.env.example` 파일을 참고하여 모든 필수 변수 설정
- 정기적인 환경 변수 검증 (`make validate-env`)

#### 문제: TypeScript 빌드 실패

**증상:**
```
error TS2307: Cannot find module './config/default'
```

**해결방법:**
```bash
# 1. 빌드 디렉토리 정리
make clean

# 2. 의존성 재설치
npm install

# 3. 빌드 실행
npm run build

# 4. 설정 파일 복사
cp -r config dist/config
cp -r src/utils dist/src/utils
```

**예방책:**
- 빌드 후 항상 설정 파일 복사 확인
- `make build` 명령어 사용 (자동으로 파일 복사 포함)

### 2. API 연결 문제

#### 문제: API 서버 연결 실패

**증상:**
```
Error: connect ECONNREFUSED 67hnjuna66.execute-api.ap-northeast-1.amazonaws.com:443
```

**해결방법:**
```bash
# 1. API 연결 상태 확인
make check-api

# 2. 네트워크 연결 테스트
ping 67hnjuna66.execute-api.ap-northeast-1.amazonaws.com
curl -I https://67hnjuna66.execute-api.ap-northeast-1.amazonaws.com/prd-1

# 3. DNS 설정 확인
nslookup 67hnjuna66.execute-api.ap-northeast-1.amazonaws.com

# 4. 방화벽 설정 확인
telnet 67hnjuna66.execute-api.ap-northeast-1.amazonaws.com 443
```

**원인 분석:**
- 네트워크 연결 문제
- 방화벽/프록시 설정
- DNS 해석 실패
- API 서버 다운

#### 문제: API 응답 형식 오류

**증상:**
```
Validation failed: Expected array but got object
```

**해결방법:**
```javascript
// src/api/client.ts에서 응답 처리 확인
const responseBody = response.body?.response || response.body;
```

**디버깅:**
```bash
# 1. 응답 형식 확인
node -e "
const client = require('./dist/src/api/client').AINaviChatClient;
const c = new client();
c.sendMessage({
  clientId: 'AB123456',
  appId: '1234',
  gradeId: 'elementary',
  userId: 'test',
  message: 'test'
}).then(r => console.log(JSON.stringify(r, null, 2)));
"
```

### 3. 테스트 데이터 문제

#### 문제: 테스트 케이스 로드 실패

**증상:**
```
Error: Test cases file not found: src/data/json/all-test-cases.json
```

**해결방법:**
```bash
# 1. 테스트 케이스 파일 생성
make generate-faq

# 2. 파일 존재 확인
ls -la src/data/json/all-test-cases.json

# 3. 파일 권한 확인
chmod 644 src/data/json/all-test-cases.json
```

#### 문제: CSV 파일 인코딩 문제

**증상:**
```
Error: Invalid character encoding in CSV file
```

**해결방법:**
```bash
# 1. 파일 인코딩 확인
file -I src/data/csv/*.csv

# 2. UTF-8로 변환
iconv -f EUC-KR -t UTF-8 src/data/csv/original.csv > src/data/csv/converted.csv

# 3. BOM 제거 (필요시)
sed -i '1s/^\xEF\xBB\xBF//' src/data/csv/file.csv
```

### 4. 성능 및 리소스 문제

#### 문제: 메모리 부족

**증상:**
```
FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory
```

**해결방법:**
```bash
# 1. Node.js 메모리 한계 증가
export NODE_OPTIONS="--max-old-space-size=4096"

# 2. 테스트 동시성 감소
make test-grade GRADE=elementary CONCURRENCY=3

# 3. 가비지 컬렉션 강제 실행
node --expose-gc script.js
```

**예방책:**
```javascript
// 큰 데이터 처리 후 메모리 해제
if (global.gc) {
  global.gc();
}
```

#### 문제: 부하 테스트 시 타임아웃

**증상:**
```
Error: Request timeout after 30000ms
```

**해결방법:**
```bash
# 1. 타임아웃 증가
API_TIMEOUT=60000 make load-test

# 2. 동시성 감소
make load-test CONCURRENCY=3

# 3. 부하 테스트 설정 조정
make load-test-light
```

### 5. 외부 서비스 연동 문제

#### 문제: AWS S3 연결 실패

**증상:**
```
AccessDenied: Access Denied
```

**해결방법:**
```bash
# 1. AWS 자격증명 확인
aws sts get-caller-identity

# 2. S3 버킷 접근 권한 확인
aws s3 ls s3://meeta-ai-navi-test

# 3. 환경 변수 확인
echo $AWS_ACCESS_KEY_ID
echo $AWS_SECRET_ACCESS_KEY
```

**권한 설정:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::meeta-ai-navi-test",
        "arn:aws:s3:::meeta-ai-navi-test/*"
      ]
    }
  ]
}
```

#### 문제: Google Sheets API 오류

**증상:**
```
Error: The caller does not have permission
```

**해결방법:**
```bash
# 1. 서비스 계정 파일 확인
ls -la config/service-account.json

# 2. 권한 확인
# Google Sheets에서 서비스 계정 이메일을 편집자로 추가

# 3. API 활성화 확인
# Google Cloud Console에서 Sheets API 활성화
```

#### 문제: Slack 알림 실패

**증상:**
```
Error: channel_not_found
```

**해결방법:**
```bash
# 1. 웹훅 URL 테스트
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"Test"}' \
  $SLACK_WEBHOOK_URL

# 2. 채널 이름 확인 (# 포함)
SLACK_CHANNEL=#test-results

# 3. 권한 확인
# Slack 앱에서 채널 접근 권한 확인
```

## 🔍 디버깅 도구

### 1. 로그 분석

```bash
# 에러 로그만 확인
tail -f reports/logs/error.log

# 특정 세션 로그
grep "session_123" reports/logs/combined.log

# 성능 관련 로그
grep "SLOW_RESPONSE\|HIGH_ERROR_RATE" reports/logs/combined.log

# 최근 1시간 로그
find reports/logs/ -name "*.log" -newermt "1 hour ago" -exec tail {} \;
```

### 2. 시스템 상태 확인

```bash
# 시스템 리소스
htop
free -h
df -h

# 네트워크 연결
netstat -tulpn | grep :3000
ss -tulpn

# 프로세스 상태
ps aux | grep node
pm2 status
```

### 3. API 테스트

```bash
# 직접 API 호출
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "AB123456",
    "appId": "1234",
    "gradeId": "elementary",
    "userId": "test_user",
    "message": "테스트 메시지"
  }' \
  https://67hnjuna66.execute-api.ap-northeast-1.amazonaws.com/prd-1/students/chat

# 응답 시간 측정
curl -w "@curl-format.txt" -s -o /dev/null https://api.example.com/endpoint
```

### 4. 데이터베이스/파일 검증

```bash
# JSON 파일 유효성 검사
jq . src/data/json/all-test-cases.json

# CSV 파일 검사
head -n 5 src/data/csv/test-cases.csv
wc -l src/data/csv/*.csv

# 파일 인코딩 확인
file -I src/data/csv/*.csv
```

## 🛠️ 문제별 해결 체크리스트

### API 연결 문제
- [ ] 환경 변수 설정 확인 (`API_BASE_URL`)
- [ ] 네트워크 연결 테스트
- [ ] 방화벽/프록시 설정 확인
- [ ] API 서버 상태 확인
- [ ] 타임아웃 설정 검토

### 테스트 실행 문제
- [ ] TypeScript 빌드 상태 확인
- [ ] 테스트 데이터 파일 존재 확인
- [ ] 권한 설정 확인
- [ ] 메모리 사용량 확인
- [ ] 로그 파일 분석

### 성능 문제
- [ ] 시스템 리소스 사용량 확인
- [ ] 동시성 설정 검토
- [ ] 타임아웃 값 조정
- [ ] 메모리 누수 확인
- [ ] 네트워크 대역폭 확인

### 외부 서비스 연동 문제
- [ ] 인증 정보 확인
- [ ] 권한 설정 검토
- [ ] API 할당량 확인
- [ ] 네트워크 연결 테스트
- [ ] 서비스 상태 확인

## 🚑 응급 복구 절차

### 1. 서비스 즉시 재시작

```bash
# PM2 재시작
pm2 restart ai-navi-test-automation

# 또는 수동 재시작
pkill -f "node.*run-tests"
nohup node dist/scripts/run-tests.js &
```

### 2. 로그 백업 및 분석

```bash
# 로그 백업
cp -r reports/logs/ reports/logs_backup_$(date +%Y%m%d_%H%M%S)/

# 핵심 에러 추출
grep -i "error\|fail\|exception" reports/logs/combined.log > error_summary.log
```

### 3. 설정 초기화

```bash
# 설정 파일 백업
cp .env .env.backup

# 기본 설정으로 복원
cp .env.example .env
# 필수 값만 입력

# 빌드 재실행
make clean && make build
```

### 4. 최소 기능 테스트

```bash
# API 연결 확인
make check-api

# 단일 테스트 실행
make test-single TEST_ID=ELEMENTARY_A-1 NO_SLACK=true

# 성공 시 점진적 복구
make test-grade GRADE=elementary
```

## 📞 지원 요청

문제가 지속되는 경우 다음 정보와 함께 지원을 요청하세요:

### 필수 정보
- 운영체제 및 버전
- Node.js 버전 (`node --version`)
- 에러 메시지 전문
- 재현 가능한 최소 단계
- 로그 파일 (`reports/logs/`)

### 수집 명령어
```bash
# 환경 정보 수집
echo "OS: $(uname -a)" > debug_info.txt
echo "Node: $(node --version)" >> debug_info.txt
echo "NPM: $(npm --version)" >> debug_info.txt
echo "Git: $(git rev-parse HEAD)" >> debug_info.txt
make status >> debug_info.txt

# 로그 수집
tail -n 100 reports/logs/error.log >> debug_info.txt
tail -n 100 reports/logs/combined.log >> debug_info.txt
```

### 연락처
- **GitHub Issues**: 가장 선호되는 방법
- **이메일**: 민감한 정보가 포함된 경우
- **Slack**: 실시간 지원이 필요한 경우

---

이 가이드를 통해 대부분의 문제를 신속하게 해결할 수 있습니다. 새로운 문제가 발견되면 이 문서를 업데이트하여 다른 사용자들도 도움받을 수 있도록 하겠습니다.