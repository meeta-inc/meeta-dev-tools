# 배포 가이드

AI Navi Chat API Test Automation 도구의 배포 및 운영 가이드입니다.

## 📋 배포 전 체크리스트

### 필수 사항

- [ ] Node.js 18 이상 설치
- [ ] TypeScript 컴파일러 설치
- [ ] AWS CLI 설정 (S3 연동용)
- [ ] Google Cloud 서비스 계정 설정
- [ ] Slack Webhook URL 생성
- [ ] GitHub Repository Secrets 설정

### 환경별 설정

#### 개발 환경 (Development)
```bash
# .env.development
API_BASE_URL=https://dev-api.example.com
TEST_CONCURRENCY=3
AWS_S3_BUCKET=dev-test-bucket
SLACK_CHANNEL=#dev-alerts
```

#### 스테이징 환경 (Staging)
```bash
# .env.staging
API_BASE_URL=https://staging-api.example.com
TEST_CONCURRENCY=5
AWS_S3_BUCKET=staging-test-bucket
SLACK_CHANNEL=#staging-alerts
```

#### 프로덕션 환경 (Production)
```bash
# .env.production
API_BASE_URL=https://67hnjuna66.execute-api.ap-northeast-1.amazonaws.com/prd-1
TEST_CONCURRENCY=10
AWS_S3_BUCKET=meeta-ai-navi-test
SLACK_CHANNEL=#production-alerts
```

## 🚀 배포 프로세스

### 1. 로컬 배포

```bash
# 1. 저장소 클론
git clone https://github.com/your-org/meeta-dev-tools.git
cd meeta-dev-tools/pactumjs_test_new

# 2. 의존성 설치
npm install

# 3. 환경 변수 설정
cp .env.example .env
# .env 파일 편집

# 4. TypeScript 빌드
npm run build

# 5. 설정 검증
make validate-env
make check-api

# 6. 초기 테스트 실행
make test-single TEST_ID=ELEMENTARY_A-1
```

### 2. 서버 배포 (Ubuntu/CentOS)

```bash
# 시스템 업데이트
sudo apt update && sudo apt upgrade -y

# Node.js 18 설치
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# PM2 설치 (프로세스 관리)
sudo npm install -g pm2

# 프로젝트 배포
git clone https://github.com/your-org/meeta-dev-tools.git
cd meeta-dev-tools/pactumjs_test_new
npm install
npm run build

# PM2로 서비스 등록
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 3. Docker 배포

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

# 의존성 설치
COPY package*.json ./
RUN npm ci --only=production

# 소스 코드 복사
COPY . .

# TypeScript 빌드
RUN npm run build

# 설정 파일 복사
RUN cp -r config dist/config
RUN cp -r src/utils dist/src/utils

EXPOSE 3000

CMD ["node", "dist/scripts/run-tests.js"]
```

```bash
# Docker 이미지 빌드 및 실행
docker build -t ai-navi-test-automation .
docker run -d --name test-automation \
  --env-file .env \
  -v $(pwd)/reports:/app/reports \
  ai-navi-test-automation
```

### 4. Kubernetes 배포

```yaml
# k8s-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ai-navi-test-automation
spec:
  replicas: 1
  selector:
    matchLabels:
      app: ai-navi-test-automation
  template:
    metadata:
      labels:
        app: ai-navi-test-automation
    spec:
      containers:
      - name: test-automation
        image: ai-navi-test-automation:latest
        env:
        - name: API_BASE_URL
          valueFrom:
            secretKeyRef:
              name: test-automation-secrets
              key: api-base-url
        - name: AWS_ACCESS_KEY_ID
          valueFrom:
            secretKeyRef:
              name: test-automation-secrets
              key: aws-access-key-id
        volumeMounts:
        - name: reports-volume
          mountPath: /app/reports
      volumes:
      - name: reports-volume
        persistentVolumeClaim:
          claimName: reports-pvc
```

## ⚙️ 운영 설정

### PM2 설정 (ecosystem.config.js)

```javascript
module.exports = {
  apps: [{
    name: 'ai-navi-test-automation',
    script: 'dist/scripts/run-tests.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    },
    cron_restart: '0 2 * * *', // 매일 오전 2시 재시작
    log_file: './reports/logs/combined.log',
    out_file: './reports/logs/out.log',
    error_file: './reports/logs/error.log',
    time: true
  }]
};
```

### Cron 작업 설정

```bash
# crontab -e
# 매일 오전 2시 전체 테스트 실행
0 2 * * * cd /path/to/pactumjs_test_new && make test-all

# 매주 일요일 오전 1시 부하 테스트
0 1 * * 0 cd /path/to/pactumjs_test_new && make load-test-heavy

# 매시간 헬스체크
0 * * * * cd /path/to/pactumjs_test_new && make check-api
```

### 로그 로테이션 설정

```bash
# /etc/logrotate.d/ai-navi-test
/path/to/pactumjs_test_new/reports/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    sharedscripts
    postrotate
        pm2 reload ai-navi-test-automation
    endscript
}
```

## 📊 모니터링 설정

### 시스템 모니터링

```bash
# CPU, 메모리 사용량 모니터링
htop
iotop

# 디스크 사용량 확인
df -h
du -sh reports/

# 네트워크 모니터링
netstat -tulpn
ss -tulpn
```

### 애플리케이션 모니터링

```bash
# PM2 상태 확인
pm2 status
pm2 logs ai-navi-test-automation
pm2 monit

# 실시간 로그 모니터링
tail -f reports/logs/app.log
tail -f reports/logs/error.log

# 메트릭 확인
cat reports/metrics/historical.json | jq '.[-1]'
```

### Slack 알림 설정

```javascript
// 커스텀 알림 설정
const alertManager = new AlertManager({
  enableSlack: true,
  thresholds: {
    responseTime: 10000,      // 10초
    errorRate: 0.1,           // 10%
    consecutiveFailures: 5
  },
  priorityLevels: {
    CRITICAL: { color: 'danger', channel: '#critical-alerts' },
    HIGH: { color: 'warning', channel: '#high-alerts' },
    MEDIUM: { color: '#ffeb3b', channel: '#medium-alerts' }
  }
});
```

## 🔧 유지보수

### 정기 작업

#### 일일 작업
- [ ] 테스트 결과 확인
- [ ] 에러 로그 검토
- [ ] 성능 메트릭 확인
- [ ] 대시보드 리뷰

#### 주간 작업
- [ ] 테스트 케이스 업데이트
- [ ] 성능 트렌드 분석
- [ ] 시스템 리소스 확인
- [ ] 보안 업데이트 적용

#### 월간 작업
- [ ] 포괄적 성능 리뷰
- [ ] 테스트 커버리지 분석
- [ ] 의존성 업데이트
- [ ] 백업 및 복원 테스트

### 문제 대응 절차

#### 1. 테스트 실패 대응
```bash
# 1. 즉시 확인
make check-api
tail -n 100 reports/logs/error.log

# 2. 단일 테스트로 검증
make test-single TEST_ID=ELEMENTARY_A-1

# 3. 필요시 재시작
pm2 restart ai-navi-test-automation
```

#### 2. 성능 저하 대응
```bash
# 1. 시스템 리소스 확인
htop
df -h

# 2. 부하 테스트로 검증
make load-test-light

# 3. 로그 분석
grep "SLOW_RESPONSE" reports/logs/app.log
```

#### 3. 알림 시스템 점검
```bash
# 1. Slack 연결 테스트
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"Test message"}' \
  $SLACK_WEBHOOK_URL

# 2. 알림 히스토리 확인
grep "Alert sent" reports/logs/app.log | tail -20
```

## 🔒 보안 고려사항

### 환경 변수 보안
- `.env` 파일을 Git에 커밋하지 않음
- 프로덕션에서는 시스템 환경 변수 사용
- 주기적인 액세스 키 로테이션

### 네트워크 보안
- HTTPS 전용 통신
- IP 화이트리스트 설정
- VPN 또는 방화벽 설정

### 데이터 보안
- 테스트 데이터 암호화
- 로그 파일 접근 권한 제한
- 민감한 정보 마스킹

## 📈 성능 최적화

### 시스템 최적화
```bash
# Node.js 메모리 한계 설정
export NODE_OPTIONS="--max-old-space-size=4096"

# 파일 디스크립터 한계 증가
ulimit -n 65536

# TCP 설정 최적화
echo 'net.core.somaxconn = 65535' >> /etc/sysctl.conf
sysctl -p
```

### 애플리케이션 최적화
- 테스트 병렬도 조정 (`TEST_CONCURRENCY`)
- 타임아웃 값 최적화 (`API_TIMEOUT`)
- 메모리 사용량 모니터링
- 불필요한 로그 레벨 조정

## 🚨 재해 복구

### 백업 전략
```bash
# 데이터 백업
tar -czf backup-$(date +%Y%m%d).tar.gz \
  reports/ config/ src/data/

# S3로 백업 업로드
aws s3 cp backup-$(date +%Y%m%d).tar.gz \
  s3://backup-bucket/ai-navi-test/
```

### 복구 절차
1. 백업에서 데이터 복원
2. 환경 변수 재설정
3. 의존성 재설치
4. 서비스 재시작
5. 기능 검증 테스트

---

이 가이드를 통해 AI Navi Test Automation 도구를 안전하고 효율적으로 배포하고 운영할 수 있습니다.