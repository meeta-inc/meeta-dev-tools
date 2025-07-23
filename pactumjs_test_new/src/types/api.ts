/**
 * AI Navi Chat API 타입 정의
 * 최신 OpenAPI 스펙 기반
 */

// 학년 타입 정의
export type GradeId = 'preschool' | 'elementary' | 'middle' | 'high';

// 버블 타입 정의
export type BubbleType = 'main' | 'sub' | 'cta';

// 채팅 요청 인터페이스
export interface ChatRequest {
  /** 8자리 클라이언트 ID (2문자 + 6숫자) */
  clientId: string;
  /** 4자리 앱 ID */
  appId: string;
  /** 학년 구분 */
  gradeId: GradeId;
  /** 사용자 ID */
  userId: string;
  /** 사용자 메시지 (최대 1000자) */
  message: string;
  /** 선택적 세션 ID */
  sessionId?: string;
}

// 버블 인터페이스
export interface Bubble {
  /** 버블 타입 */
  type: BubbleType;
  /** 버블 텍스트 내용 */
  text: string;
  /** 선택적 도구 객체 (비텍스트 응답용) */
  tool?: {
    type: string;
    data: Record<string, unknown>;
  };
}

// 채팅 응답 인터페이스 (2-3개 버블 배열)
export type ChatResponse = Bubble[];

// API 응답 래퍼
export interface APIResponse<T = unknown> {
  /** HTTP 상태 코드 */
  statusCode: number;
  /** 응답 본문 */
  body: T;
  /** 응답 시간 (ms) */
  responseTime: number;
  /** 성공 여부 */
  success: boolean;
}

// 에러 응답 인터페이스
export interface ErrorResponse {
  error: string;
  message: string;
  timestamp?: string;
  requestId?: string;
}

// 응답 검증 결과
export interface ValidationResult {
  /** 검증 통과 여부 */
  isValid: boolean;
  /** 검증 에러 목록 */
  errors: string[];
  /** 버블 개수 */
  bubbleCount: number;
  /** 각 버블 타입별 개수 */
  bubbleTypes?: Record<BubbleType, number>;
}

// 테스트 케이스 인터페이스
export interface TestCase {
  /** 테스트 ID */
  testId: string;
  /** 사용자 역할 */
  userRole: string;
  /** 사용자 ID */
  userId: string;
  /** 테스트 카테고리 */
  category: string;
  /** 테스트 메시지 */
  message: string;
  /** 학년 */
  grade: GradeId;
  /** 클라이언트 ID */
  clientId?: string;
  /** 앱 ID */
  appId?: string;
  /** 세션 ID */
  sessionId?: string;
  /** 예상 버블 개수 */
  expectedBubbles?: number;
  /** 예상 답변 (FAQ용) */
  expectedAnswer?: string;
  /** 첨부 파일 (FAQ용) */
  attachment?: string | null;
  /** 카테고리 우선순위 (FAQ용) */
  categoryPriority?: number | null;
  /** 테스트 케이스 소스 */
  source: 'csv' | 'excel_faq' | 'gsheet' | 'manual';
}

// 테스트 결과 인터페이스
export interface TestResult {
  /** 테스트 ID */
  testId: string;
  /** 사용자 역할 */
  userRole: string;
  /** 사용자 ID */
  userId: string;
  /** 테스트 카테고리 */
  category: string;
  /** 테스트 메시지 */
  message: string;
  /** 학년 */
  grade: GradeId;
  /** HTTP 상태 코드 */
  statusCode: number | 'ERROR';
  /** 응답 본문 */
  body: ChatResponse | ErrorResponse;
  /** 응답 시간 (ms) */
  responseTime: number;
  /** 성공 여부 */
  success: boolean;
  /** 응답 검증 결과 */
  validation: ValidationResult;
  /** 테스트 실행 타임스탬프 */
  timestamp: string;
  /** 실행 시간 (ms) */
  executionTime: number;
}

// 테스트 요약 인터페이스
export interface TestSummary {
  /** 총 테스트 수 */
  total: number;
  /** 성공한 테스트 수 */
  passed: number;
  /** 실패한 테스트 수 */
  failed: number;
  /** 에러 발생 테스트 수 */
  errors: number;
  /** 총 소요 시간 (ms) */
  duration: number;
  /** 실행 타임스탬프 */
  timestamp: string;
  /** 실패한 테스트 목록 */
  failedTests: Array<{
    testId: string;
    error: string;
  }>;
}

// 필터 옵션 인터페이스
export interface FilterOptions {
  /** 학년 필터 */
  grade?: GradeId;
  /** 카테고리 필터 */
  category?: string;
  /** 테스트 ID 필터 */
  testId?: string;
  /** 소스 필터 */
  source?: TestCase['source'];
}

// 실행 옵션 인터페이스
export interface ExecutionOptions {
  /** S3에서 로드 여부 */
  fromS3?: boolean;
  /** S3 버킷명 */
  bucket?: string;
  /** S3 키 */
  key?: string;
  /** 드라이런 모드 */
  dryRun?: boolean;
  /** Slack 알림 비활성화 */
  noSlack?: boolean;
  /** 동시성 수준 */
  concurrency?: number;
}

// 설정 인터페이스
export interface Config {
  api: {
    baseUrl: string;
    timeout: number;
    retries: number;
    endpoints: {
      chat: string;
    };
  };
  test: {
    concurrency: number;
    reportFormat: string;
    outputDir: string;
  };
  aws: {
    region: string;
    s3: {
      bucket: string;
      testCasesKey: string;
      resultsKey: string;
    };
  };
  gsheet: {
    spreadsheetId: string;
    range: string;
    serviceAccountPath: string;
  };
  slack: {
    webhookUrl: string;
    channel: string;
    username: string;
  };
  defaults: {
    clientId: string;
    appId: string;
    userId: string;
  };
}