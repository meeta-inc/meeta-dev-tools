import * as pactum from 'pactum';
import * as path from 'path';
import { Config } from '../types/api';
import { 
  ChatRequest, 
  ChatResponse, 
  APIResponse, 
  ValidationResult, 
  ErrorResponse,
  GradeId,
  BubbleType 
} from '../types/api';

const config: Config = require(path.join(__dirname, '../../config/default'));
const logger = require(path.join(__dirname, '../utils/logger'));

/**
 * AI Navi Chat API 클라이언트 (TypeScript 버전)
 */
export class AINaviChatClient {
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly retries: number;

  constructor(options: Partial<Config['api']> = {}) {
    this.baseUrl = options.baseUrl || config.api.baseUrl;
    this.timeout = options.timeout || config.api.timeout;
    this.retries = options.retries || config.api.retries;
  }

  /**
   * AI Navi API에 채팅 메시지 전송 (재시도 포함)
   */
  async sendMessage(params: ChatRequest): Promise<APIResponse<ChatResponse | ErrorResponse>> {
    const { clientId, appId, gradeId, userId, message, sessionId } = params;
    
    // 파라미터 검증
    this.validateParams({ clientId, appId, gradeId, userId, message });

    let lastError: Error | null = null;
    
    // 재시도 로직
    for (let attempt = 1; attempt <= this.retries; attempt++) {
      const startTime = Date.now();
      const endpoint = `${this.baseUrl}${config.api.endpoints.chat}`;
      
      try {
        const spec = pactum.spec();
        const response = await spec
          .post(endpoint)
          .withJson({
            clientId,
            appId,
            gradeId,
            userId,
            message,
            ...(sessionId && { sessionId })
          })
          .withRequestTimeout(this.timeout)
          .toss();

        const endTime = Date.now();
        const responseTime = endTime - startTime;

        logger.info('API Request successful', {
          endpoint,
          userId,
          gradeId,
          responseTime,
          statusCode: response.statusCode,
          attempt
        });

        // API 응답 형식 처리 (response 필드가 있는 경우)
        const responseBody = response.body?.response || response.body;
        
        return {
          statusCode: response.statusCode,
          body: responseBody as ChatResponse,
          responseTime,
          success: true
        };

      } catch (error: any) {
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        lastError = error;

        logger.warn(`API Request failed (attempt ${attempt}/${this.retries})`, {
          endpoint,
          userId,
          gradeId,
          responseTime,
          error: error.message,
          attempt
        });

        // 마지막 시도가 아니면 잠시 대기
        if (attempt < this.retries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    // 모든 재시도 실패
    logger.error('API Request failed after all retries', {
      userId,
      gradeId,
      retries: this.retries,
      error: lastError?.message
    });

    return {
      statusCode: 'ERROR' as any,
      body: { 
        error: lastError?.message || 'Unknown error', 
        message: `API request failed after ${this.retries} retries` 
      } as ErrorResponse,
      responseTime: 0,
      success: false
    };
  }

  /**
   * API 응답 형식 검증
   */
  validateResponse(response: APIResponse<ChatResponse | ErrorResponse>): ValidationResult {
    const validation: ValidationResult = {
      isValid: true,
      errors: [],
      bubbleCount: 0,
      bubbleTypes: { main: 0, sub: 0, cta: 0 }
    };

    if (!response.body) {
      validation.isValid = false;
      validation.errors.push('Response body is empty');
      return validation;
    }

    // 에러 응답인 경우
    if (!Array.isArray(response.body)) {
      validation.isValid = false;
      validation.errors.push('Response body should be an array of bubbles');
      return validation;
    }

    const bubbles = response.body as ChatResponse;
    validation.bubbleCount = bubbles.length;

    // 각 버블 검증
    bubbles.forEach((bubble, index) => {
      if (!bubble.type || !['main', 'sub', 'cta'].includes(bubble.type)) {
        validation.errors.push(`Bubble ${index}: Invalid or missing type`);
        validation.isValid = false;
      } else {
        validation.bubbleTypes![bubble.type as BubbleType]++;
      }

      if (!bubble.text || typeof bubble.text !== 'string') {
        validation.errors.push(`Bubble ${index}: Missing or invalid text`);
        validation.isValid = false;
      }

      // 텍스트 길이 검증 (너무 짧거나 길면 경고)
      if (bubble.text && bubble.text.length < 5) {
        validation.errors.push(`Bubble ${index}: Text too short (${bubble.text.length} chars)`);
      }
      
      if (bubble.text && bubble.text.length > 2000) {
        validation.errors.push(`Bubble ${index}: Text too long (${bubble.text.length} chars)`);
      }
    });

    // 예상 버블 개수 검증 (2-3개)
    if (validation.bubbleCount < 2 || validation.bubbleCount > 3) {
      validation.errors.push(`Expected 2-3 bubbles, got ${validation.bubbleCount}`);
      validation.isValid = false;
    }

    // 버블 타입 분포 검증
    if (validation.bubbleTypes!.main === 0) {
      validation.errors.push('Missing main bubble');
      validation.isValid = false;
    }

    if (validation.bubbleTypes!.main > 1) {
      validation.errors.push(`Too many main bubbles: ${validation.bubbleTypes!.main}`);
      validation.isValid = false;
    }

    return validation;
  }

  /**
   * 요청 파라미터 검증 (private)
   */
  private validateParams({ 
    clientId, 
    appId, 
    gradeId, 
    userId, 
    message 
  }: Omit<ChatRequest, 'sessionId'>): void {
    if (!clientId || !/^[A-Z]{2}\d{6}$/.test(clientId)) {
      throw new Error('clientId must be 8 characters: 2 uppercase letters + 6 digits');
    }

    if (!appId || !/^\d{4}$/.test(appId)) {
      throw new Error('appId must be 4 digits');
    }

    if (!gradeId || !['preschool', 'elementary', 'middle', 'high'].includes(gradeId)) {
      throw new Error('gradeId must be one of: preschool, elementary, middle, high');
    }

    if (!userId || typeof userId !== 'string') {
      throw new Error('userId is required and must be a string');
    }

    if (!message || typeof message !== 'string' || message.length > 1000) {
      throw new Error('message is required, must be a string, and max 1000 characters');
    }
  }

  /**
   * 클라이언트 ID 생성 헬퍼
   */
  static generateClientId(): string {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const prefix = letters.charAt(Math.floor(Math.random() * letters.length)) +
                   letters.charAt(Math.floor(Math.random() * letters.length));
    const suffix = Math.floor(100000 + Math.random() * 900000).toString();
    return prefix + suffix;
  }

  /**
   * 학년별 기본 사용자 ID 생성
   */
  static generateUserId(grade: GradeId): string {
    const gradePrefix = {
      preschool: 'PRE',
      elementary: 'ELE', 
      middle: 'MID',
      high: 'HIGH'
    };
    
    const timestamp = Date.now().toString().slice(-6);
    return `${gradePrefix[grade]}_USER_${timestamp}`;
  }

  /**
   * 헬스체크 (연결 테스트용)
   */
  async healthCheck(): Promise<boolean> {
    try {
      const testParams: ChatRequest = {
        clientId: config.defaults.clientId,
        appId: config.defaults.appId,
        gradeId: 'elementary',
        userId: 'health_check_user',
        message: 'Hello, AI Navi!'
      };

      const response = await this.sendMessage(testParams);
      return response.success && response.statusCode === 200;
    } catch (error) {
      logger.error('Health check failed', { error: (error as Error).message });
      return false;
    }
  }
}

export default AINaviChatClient;