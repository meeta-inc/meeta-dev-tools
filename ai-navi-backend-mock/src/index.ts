import Fastify from 'fastify';
import { z } from 'zod';
import { ChatRequest, ChatResponse, HealthResponse, ErrorResponse, ResponseBubble } from './types';
import dotenv from 'dotenv';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

dotenv.config();

const server = Fastify({
  logger: { level: process.env.LOG_LEVEL || 'info' }
});

server.setErrorHandler(async (error, request, reply) => {
  server.log.error('Global error handler:', error);
  return reply.status(500).send({
    error: 'Internal Server Error',
    message: error.message,
    timestamp: new Date().toISOString()
  });
});

const PORT = parseInt(process.env.PORT || '3001');
const HOST = process.env.HOST || '0.0.0.0';

server.register(cors, {
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000']
});

server.register(swagger, {
  openapi: {
    openapi: '3.0.0',
    info: {
      title: 'AI Navi Backend Mock API',
      description: 'Mock server for AI Navi Backend API',
      version: '1.0.0'
    },
    servers: [
      { url: `http://localhost:${PORT}`, description: 'Development server' }
    ]
  }
});

server.register(swaggerUi, {
  routePrefix: '/docs',
  uiConfig: {
    docExpansion: 'full',
    deepLinking: false
  }
});

const ChatRequestSchema = z.object({
  clientId: z.string().regex(/^[A-Z]{2}\d{6}$/, 'Client ID must be 2 uppercase letters followed by 6 digits'),
  appId: z.string().regex(/^\d{4}$/, 'App ID must be 4 digits'),
  gradeId: z.enum(['preschool', 'elementary', 'middle', 'high']),
  userId: z.string().min(1).max(50),
  message: z.string().min(1).max(1000),
  sessionId: z.string().optional()
});

const generateMockChatResponse = (request: ChatRequest): ChatResponse => {
  const responseBubbles: ResponseBubble[] = [
    {
      type: 'main',
      text: `はい、ありがとうございます！3.14コミュニティでは、北海道大学をはじめとした難関大学志望の方向けに「難関国立大受験コース」「有名私立大受験コース」を用意しております。`,
      attachment: null
    }
  ];

  if (request.gradeId === 'elementary') {
    const attachmentData = {
      type: 'link' as const,
      url: 'https://www.brainsgym.com/',
      title: 'Brains Gymのサイトはこちら',
      description: 'パーソナルコーチングで更なるレベルアップを目指しませんか？'
    };
    
    server.log.info('Creating attachment data:', attachmentData);
    
    responseBubbles.push({
      type: 'sub',
      text: 'また、さらに上のレベルを目指す方には、よりパーソナルなコーチングをご提供する「Brains Gym」もおすすめです☺️',
      attachment: attachmentData
    });
  }

  responseBubbles.push({
    type: 'cta',
    text: '詳しい内容は体験や資料請求でご案内しておりますので、ぜひお気軽にご相談ください！',
    attachment: null
  });

  const chatResponse = {
    response: responseBubbles,
    tool: null
  };
  
  server.log.info('Generated chat response:', JSON.stringify(chatResponse, null, 2));
  
  return chatResponse;
};

const generateMockHealthResponse = (): HealthResponse => {
  const isHealthy = Math.random() > 0.1;
  
  return {
    status: isHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: 'mock',
    uptime: Math.floor(Math.random() * 86400),
    dependencies: {
      database: Math.random() > 0.05 ? 'healthy' : 'degraded',
      llm: Math.random() > 0.1 ? 'healthy' : 'degraded'
    }
  };
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

server.addHook('preHandler', async (request, reply) => {
  if (process.env.ENABLE_REALISTIC_DELAYS === 'true') {
    const minDelay = parseInt(process.env.DEFAULT_DELAY_MS || '500');
    const maxDelay = parseInt(process.env.MAX_DELAY_MS || '2000');
    const delayMs = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
    await delay(delayMs);
  }
});

server.post('/students/chat', {
  schema: {
    description: 'AI 챗봇과의 대화 API',
    tags: ['Chat'],
    headers: {
      type: 'object',
      properties: {
        'x-jwe-token': { type: 'string', description: 'JWE token for authentication' }
      },
      required: ['x-jwe-token']
    },
    body: {
      type: 'object',
      properties: {
        clientId: { type: 'string', pattern: '^[A-Z]{2}\\d{6}$', description: '클라이언트 ID (2글자 대문자 + 6자리 숫자)' },
        appId: { type: 'string', pattern: '^\\d{4}$', description: '앱 ID (4자리 숫자)' },
        gradeId: { type: 'string', enum: ['preschool', 'elementary', 'middle', 'high'], description: '학년 구분' },
        userId: { type: 'string', minLength: 1, maxLength: 50, description: '사용자 ID' },
        message: { type: 'string', minLength: 1, maxLength: 1000, description: '사용자 메시지' },
        sessionId: { type: 'string', description: '세션 ID (선택사항)' }
      },
      required: ['clientId', 'appId', 'gradeId', 'userId', 'message']
    },
    response: {
      200: {
        type: 'object',
        properties: {
          response: {
            type: 'array',
            minItems: 2,
            maxItems: 3,
            items: {
              type: 'object',
              properties: {
                type: { type: 'string', enum: ['main', 'sub', 'cta'] },
                text: { type: 'string', minLength: 1, maxLength: 2000 },
                attachment: {
                  anyOf: [
                    { type: 'null' },
                    {
                      type: 'object',
                      properties: {
                        type: { type: 'string', enum: ['link', 'image', 'video', 'file'] },
                        url: { type: 'string' },
                        title: { type: 'string' },
                        description: { type: 'string' },
                        thumbnail: { type: 'string' }
                      },
                      required: ['type', 'url'],
                      additionalProperties: false
                    }
                  ]
                }
              },
              required: ['type', 'text']
            }
          },
          tool: { type: 'object', nullable: true }
        },
        required: ['response']
      }
    }
  }
}, async (request, reply) => {
  try {
    const jweToken = request.headers['x-jwe-token'];
    if (!jweToken || typeof jweToken !== 'string') {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Missing or invalid X-JWE-Token header',
        timestamp: new Date().toISOString()
      } as ErrorResponse);
    }
    
    // TODO: AWS KMS를 이용한 JWE 토큰 복호화 구현 필요
    // 현재는 토큰 존재 여부만 확인하고 복호화는 건너뛰기
    server.log.info('JWE Token received (validation skipped for mock server):', {
      tokenLength: jweToken.length,
      tokenPrefix: jweToken.substring(0, 20) + '...'
    });

    const validation = ChatRequestSchema.safeParse(request.body);
    if (!validation.success) {
      server.log.error('Validation error:', validation.error);
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Invalid request body: ' + validation.error.message,
        timestamp: new Date().toISOString(),
        details: validation.error.issues
      } as ErrorResponse);
    }

    const chatResponse = generateMockChatResponse(validation.data);
    return reply.status(200).send(chatResponse);
    
  } catch (error) {
    server.log.error('Chat endpoint error:', error);
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
      timestamp: new Date().toISOString()
    } as ErrorResponse);
  }
});

server.get('/ai-navi/health', {
  schema: {
    description: '서비스 상태 확인 API',
    tags: ['Health'],
    response: {
      200: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['healthy', 'degraded', 'unhealthy'] },
          timestamp: { type: 'string' },
          version: { type: 'string' },
          environment: { type: 'string' },
          uptime: { type: 'number' },
          dependencies: {
            type: 'object',
            properties: {
              database: { type: 'string', enum: ['healthy', 'degraded', 'unhealthy'] },
              llm: { type: 'string', enum: ['healthy', 'degraded', 'unhealthy'] }
            }
          }
        }
      }
    }
  }
}, async (request, reply) => {
  try {
    const healthResponse = generateMockHealthResponse();
    const statusCode = healthResponse.status === 'healthy' ? 200 : 
                      healthResponse.status === 'degraded' ? 200 : 503;
    
    return reply.status(statusCode).send(healthResponse);
  } catch (error) {
    server.log.error('Health endpoint error:', error);
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Health check failed',
      timestamp: new Date().toISOString()
    } as ErrorResponse);
  }
});

server.get('/', async (request, reply) => {
  return reply.status(200).send({
    message: 'AI Navi Backend Mock Server',
    version: '1.0.0',
    docs: '/docs',
    endpoints: {
      chat: 'POST /students/chat',
      health: 'GET /ai-navi/health'
    },
    timestamp: new Date().toISOString()
  });
});

const start = async () => {
  try {
    await server.listen({ port: PORT, host: HOST });
    console.log(`🚀 AI Navi Backend Mock Server running at http://${HOST}:${PORT}`);
    console.log(`📚 API Documentation available at http://${HOST}:${PORT}/docs`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();