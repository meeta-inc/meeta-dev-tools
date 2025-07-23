# API 문서

AI Navi Chat API Test Automation의 API 인터페이스 및 사용법을 설명합니다.

## 📡 API 클라이언트

### AINaviChatClient

메인 API 클라이언트 클래스입니다.

```typescript
import { AINaviChatClient } from './src/api/client';

const client = new AINaviChatClient({
  baseUrl: 'https://api.example.com',
  timeout: 30000,
  retries: 3
});
```

#### 생성자 옵션

| 옵션 | 타입 | 기본값 | 설명 |
|-----|------|--------|------|
| `baseUrl` | string | 환경변수 `API_BASE_URL` | API 베이스 URL |
| `timeout` | number | 30000 | 요청 타임아웃 (ms) |
| `retries` | number | 3 | 재시도 횟수 |
| `headers` | object | {} | 기본 헤더 |

#### 메서드

##### `sendMessage(request: ChatRequest): Promise<ChatResponse>`

채팅 메시지를 전송하고 응답을 받습니다.

**Parameters:**
```typescript
interface ChatRequest {
  clientId: string;    // 8자리 (2문자 + 6숫자), 예: "AB123456"
  appId: string;       // 4자리, 예: "1234"
  gradeId: GradeId;    // "preschool" | "elementary" | "middle" | "high"
  userId: string;      // 사용자 ID
  message: string;     // 메시지 내용
  sessionId?: string;  // 선택적 세션 ID
}
```

**Returns:**
```typescript
interface ChatResponse {
  success: boolean;
  data: ChatBubble[];
  responseTime: number;
  statusCode: number;
  headers: Record<string, string>;
}

interface ChatBubble {
  type: 'main' | 'sub' | 'cta';
  text: string;
}
```

**Example:**
```typescript
const response = await client.sendMessage({
  clientId: 'AB123456',
  appId: '1234',
  gradeId: 'elementary',
  userId: 'test_user_001',
  message: '수학 공부 방법을 알려주세요',
  sessionId: 'session_123'
});

console.log(response.data); // ChatBubble[]
```

##### `healthCheck(): Promise<boolean>`

API 서버의 상태를 확인합니다.

**Returns:**
- `true`: API 서버가 정상 작동
- `false`: API 서버 연결 실패

**Example:**
```typescript
const isHealthy = await client.healthCheck();
if (!isHealthy) {
  console.error('API server is not responding');
}
```

##### `validateResponse(response: any): ValidationResult`

API 응답의 형식을 검증합니다.

**Parameters:**
- `response`: 검증할 응답 객체

**Returns:**
```typescript
interface ValidationResult {
  isValid: boolean;
  errors: string[];
  bubbleCount: number;
  bubbleTypes: string[];
}
```

**Example:**
```typescript
const validation = client.validateResponse(response.data);
if (!validation.isValid) {
  console.error('Validation errors:', validation.errors);
}
```

## 🏗️ 타입 정의

### 기본 타입

```typescript
// 학년 ID
type GradeId = 'preschool' | 'elementary' | 'middle' | 'high';

// 테스트 카테고리
type TestCategory = 
  | '授業・カリキュラム'
  | '学習サポート'
  | 'システム操作'
  | 'その他';

// 사용자 역할
type UserRole = 'User_S' | 'User_T' | 'User_P';
```

### 테스트 케이스 타입

```typescript
interface TestCase {
  id: string;
  grade: GradeId;
  category: TestCategory;
  userRole: UserRole;
  userId: string;
  message: string;
  expectedBubbles?: number;
  source: 'csv' | 'excel_faq' | 'google_sheets';
}
```

### 테스트 결과 타입

```typescript
interface TestResult {
  testId: string;
  success: boolean;
  responseTime: number;
  statusCode: number | 'ERROR';
  validation: ValidationResult;
  bubbles?: ChatBubble[];
  error?: string;
  timestamp: number;
}
```

### 성능 메트릭 타입

```typescript
interface PerformanceMetrics {
  sessionId: string;
  startTime: number;
  endTime: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgResponseTime: number;
  responseTimes: ResponseTimeData[];
  errorsByType: Record<string, number>;
  throughput: number;
}

interface ResponseTimeData {
  time: number;
  timestamp: number;
  grade: GradeId;
  testId: string;
}
```

## 🔧 설정 API

### ConfigManager

설정을 관리하는 클래스입니다.

```typescript
import { ConfigManager } from './src/utils/config';

const config = ConfigManager.getInstance();
```

#### 메서드

##### `get(key: string): any`

설정 값을 가져옵니다.

```typescript
const apiUrl = config.get('api.baseUrl');
const timeout = config.get('api.timeout');
```

##### `set(key: string, value: any): void`

설정 값을 설정합니다.

```typescript
config.set('api.timeout', 60000);
config.set('test.concurrency', 10);
```

##### `getEnvironment(): string`

현재 환경을 반환합니다.

```typescript
const env = config.getEnvironment(); // 'development' | 'staging' | 'production'
```

## 📊 메트릭 수집 API

### MetricsCollector

성능 메트릭을 수집하고 분석하는 클래스입니다.

```typescript
import { MetricsCollector } from './src/monitoring/metrics-collector';

const collector = new MetricsCollector({
  enableRealTimeAnalysis: true,
  anomalyDetectionThreshold: 2.0
});
```

#### 메서드

##### `startSession(sessionId: string, config: TestConfiguration): Session`

테스트 세션을 시작합니다.

```typescript
const session = collector.startSession('session_123', {
  grade: 'elementary',
  concurrency: 5,
  testCases: testCases
});
```

##### `recordTestResult(sessionId: string, result: TestResult): void`

테스트 결과를 기록합니다.

```typescript
collector.recordTestResult('session_123', {
  testId: 'ELEMENTARY_A-1',
  success: true,
  responseTime: 2500,
  statusCode: 200,
  validation: { isValid: true, errors: [] }
});
```

##### `endSession(sessionId: string): Session`

테스트 세션을 종료하고 분석 결과를 반환합니다.

```typescript
const completedSession = collector.endSession('session_123');
console.log(completedSession.insights);
```

##### `getCurrentState(): MetricsState`

현재 메트릭 상태를 반환합니다.

```typescript
const state = collector.getCurrentState();
console.log(`Active sessions: ${state.activeSessions}`);
```

## 🚨 알림 API

### AlertManager

알림을 관리하는 클래스입니다.

```typescript
import { AlertManager } from './src/monitoring/alert-manager';

const alertManager = new AlertManager({
  enableSlack: true,
  enableEmail: false,
  thresholds: {
    responseTime: 10000,
    errorRate: 0.1,
    consecutiveFailures: 5
  }
});
```

#### 메서드

##### `handlePerformanceAlert(alert: PerformanceAlert): Promise<void>`

성능 관련 알림을 처리합니다.

```typescript
await alertManager.handlePerformanceAlert({
  type: 'SLOW_RESPONSE',
  severity: 'HIGH',
  sessionId: 'session_123',
  current: 15000,
  threshold: 10000,
  details: { testId: 'ELEMENTARY_A-1' }
});
```

##### `handleSystemAlert(alert: SystemAlert): Promise<void>`

시스템 관련 알림을 처리합니다.

```typescript
await alertManager.handleSystemAlert({
  type: 'API_DOWN',
  severity: 'CRITICAL',
  message: 'API server is not responding',
  details: { endpoint: '/students/chat' }
});
```

##### `getAlertStats(): AlertStats`

알림 통계를 반환합니다.

```typescript
const stats = alertManager.getAlertStats();
console.log(`Total alerts in last 24h: ${stats.total24Hours}`);
```

## 📋 대시보드 API

### DashboardGenerator

모니터링 대시보드를 생성하는 클래스입니다.

```typescript
import { DashboardGenerator } from './src/monitoring/dashboard-generator';

const dashboard = new DashboardGenerator({
  outputDir: './reports/dashboard',
  refreshInterval: 30000
});
```

#### 메서드

##### `generateRealtimeDashboard(metrics: MetricsData, alerts: AlertData): DashboardResult`

실시간 대시보드를 생성합니다.

```typescript
const result = dashboard.generateRealtimeDashboard(metricsData, alertData);
console.log(`Dashboard generated: ${result.htmlPath}`);
```

##### `generateSessionReport(session: SessionData): ReportResult`

세션 리포트를 생성합니다.

```typescript
const report = dashboard.generateSessionReport(sessionData);
console.log(`Report generated: ${report.htmlPath}`);
```

## 🔌 통합 API

### 외부 서비스 통합

#### Slack 클라이언트

```typescript
import { SlackClient } from './src/integrations/slack/client';

const slack = new SlackClient({
  webhookUrl: process.env.SLACK_WEBHOOK_URL
});

await slack.sendMessage({
  text: 'Test completed successfully',
  channel: '#test-results'
});
```

#### AWS S3 클라이언트

```typescript
import { S3Client } from './src/integrations/s3/client';

const s3 = new S3Client({
  region: 'ap-northeast-1',
  bucket: 'test-results-bucket'
});

await s3.uploadResults(testResults, 'results.json');
```

#### Google Sheets 클라이언트

```typescript
import { GoogleSheetsClient } from './src/integrations/gsheet/client';

const sheets = new GoogleSheetsClient({
  serviceAccountPath: './config/service-account.json'
});

const testCases = await sheets.loadTestCases(
  'spreadsheet_id',
  'Sheet1!A1:E100'
);
```

## 🧪 테스트 API

### TestRunner

테스트를 실행하는 메인 클래스입니다.

```typescript
import { TestRunner } from './src/tests/runner';

const runner = new TestRunner({
  concurrency: 5,
  timeout: 30000,
  enableMetrics: true
});
```

#### 메서드

##### `runSingle(testCase: TestCase): Promise<TestResult>`

단일 테스트를 실행합니다.

```typescript
const result = await runner.runSingle({
  id: 'ELEMENTARY_A-1',
  grade: 'elementary',
  message: '수학 공부법을 알려주세요'
});
```

##### `runBatch(testCases: TestCase[], options?: BatchOptions): Promise<TestResult[]>`

배치 테스트를 실행합니다.

```typescript
const results = await runner.runBatch(testCases, {
  grade: 'elementary',
  stopOnError: false,
  enableMetrics: true
});
```

##### `runLoadTest(config: LoadTestConfig): Promise<LoadTestResult>`

부하 테스트를 실행합니다.

```typescript
const loadResult = await runner.runLoadTest({
  maxConcurrency: 10,
  targetRPS: 5,
  duration: 60000,
  grade: 'elementary'
});
```

## 📚 유틸리티 API

### Logger

구조화된 로깅을 제공합니다.

```typescript
import { logger } from './src/utils/logger';

logger.info('Test started', { sessionId: 'session_123' });
logger.error('Test failed', { error: error.message, testId: 'TEST_1' });
logger.debug('API response received', { responseTime: 2500 });
```

### Validator

데이터 검증 유틸리티입니다.

```typescript
import { Validator } from './src/utils/validator';

const isValid = Validator.validateChatRequest(request);
const errors = Validator.getValidationErrors(response);
```

## 🔄 이벤트 API

많은 클래스들이 EventEmitter를 확장하여 이벤트 기반 프로그래밍을 지원합니다.

### 메트릭 수집기 이벤트

```typescript
collector.on('sessionStarted', (data) => {
  console.log(`Session ${data.sessionId} started`);
});

collector.on('anomalyDetected', (data) => {
  console.log(`Anomaly detected: ${data.anomaly.type}`);
});

collector.on('sessionEnded', (data) => {
  console.log(`Session ${data.sessionId} completed`);
});
```

### 알림 관리자 이벤트

```typescript
alertManager.on('alertSent', (alert) => {
  console.log(`Alert sent: ${alert.type}`);
});

alertManager.on('alertError', (data) => {
  console.error(`Alert failed: ${data.error.message}`);
});
```

## 📖 사용 예시

### 완전한 테스트 실행 예시

```typescript
import { TestRunner, MetricsCollector, AlertManager } from './src';

async function runCompleteTest() {
  // 컴포넌트 초기화
  const runner = new TestRunner({ concurrency: 5 });
  const collector = new MetricsCollector({ enableRealTimeAnalysis: true });
  const alertManager = new AlertManager({ enableSlack: true });
  
  // 이벤트 리스너 설정
  collector.on('anomalyDetected', (data) => {
    alertManager.handleAnomalyAlert(data.anomaly);
  });
  
  // 세션 시작
  const sessionId = `session_${Date.now()}`;
  const session = collector.startSession(sessionId, {
    grade: 'elementary',
    concurrency: 5
  });
  
  try {
    // 테스트 실행
    const results = await runner.runBatch(testCases, {
      sessionId,
      enableMetrics: true
    });
    
    // 결과 기록
    results.forEach(result => {
      collector.recordTestResult(sessionId, result);
    });
    
    // 세션 종료
    const completedSession = collector.endSession(sessionId);
    
    console.log('Test completed successfully');
    console.log(`Insights: ${completedSession.insights.length}`);
    
  } catch (error) {
    await alertManager.handleSystemAlert({
      type: 'TEST_EXECUTION_ERROR',
      severity: 'HIGH',
      message: error.message
    });
    
    throw error;
  }
}
```

---

이 API 문서를 통해 AI Navi Test Automation의 모든 기능을 프로그래밍 방식으로 활용할 수 있습니다.