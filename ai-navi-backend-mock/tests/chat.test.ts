import Fastify from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { z } from 'zod';
import { ChatRequest, ChatResponse, ResponseBubble, AttachmentData } from '../src/types';

describe('Chat API Tests', () => {
  let server: any;
  
  beforeAll(async () => {
    // Create test server instance
    server = Fastify({ logger: false });
    
    // Register plugins
    await server.register(cors, {
      origin: ['http://localhost:3000', 'http://localhost:5173']
    });
    
    // Copy the generateMockChatResponse function for testing
    const generateMockChatResponse = (request: ChatRequest): ChatResponse => {
      const responseBubbles: ResponseBubble[] = [
        {
          type: 'main',
          text: `はい、ありがとうございます！3.14コミュニティでは、北海道大学をはじめとした難関大学志望の方向けに「難関国立大受験コース」「有名私立大受験コース」を用意しております。`,
          attachment: null
        }
      ];

      if (request.gradeId === 'elementary') {
        const attachmentData: AttachmentData = {
          type: 'link',
          url: 'https://www.brainsgym.com/',
          title: 'Brains Gymのサイトはこちら',
          description: 'パーソナルコーチングで更なるレベルアップを目指しませんか？'
        };
        
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

      return {
        response: responseBubbles,
        tool: null
      };
    };

    const ChatRequestSchema = z.object({
      clientId: z.string().regex(/^[A-Z]{2}\d{6}$/, 'Client ID must be 2 uppercase letters followed by 6 digits'),
      appId: z.string().regex(/^\d{4}$/, 'App ID must be 4 digits'),
      gradeId: z.enum(['preschool', 'elementary', 'middle', 'high']),
      userId: z.string().min(1).max(50),
      message: z.string().min(1).max(1000),
      sessionId: z.string().optional()
    });

    // Register chat endpoint
    server.post('/students/chat', {
      schema: {
        headers: {
          type: 'object',
          properties: {
            'x-jwe-token': { type: 'string' }
          },
          required: ['x-jwe-token']
        },
        body: {
          type: 'object',
          properties: {
            clientId: { type: 'string' },
            appId: { type: 'string' },
            gradeId: { type: 'string' },
            userId: { type: 'string' },
            message: { type: 'string' },
            sessionId: { type: 'string' }
          },
          required: ['clientId', 'appId', 'gradeId', 'userId', 'message']
        }
      }
    }, async (request: any, reply: any) => {
      const jweToken = request.headers['x-jwe-token'];
      if (!jweToken) {
        return reply.status(401).send({ error: 'Missing JWE token' });
      }

      const validation = ChatRequestSchema.safeParse(request.body);
      if (!validation.success) {
        return reply.status(400).send({ error: 'Invalid request' });
      }

      const chatResponse = generateMockChatResponse(validation.data);
      return reply.status(200).send(chatResponse);
    });

    await server.ready();
  });

  afterAll(async () => {
    await server.close();
  });

  describe('POST /students/chat', () => {
    const validJWEToken = 'test.jwt.token';
    
    const baseRequest = {
      clientId: 'RS000001',
      appId: '0001',
      userId: 'testuser123',
      message: '안녕하세요! 수학 문제를 도와주세요.'
    };

    it('should return chat response with attachment for elementary grade', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/students/chat',
        headers: {
          'x-jwe-token': validJWEToken,
          'content-type': 'application/json'
        },
        payload: {
          ...baseRequest,
          gradeId: 'elementary'
        }
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('response');
      expect(body).toHaveProperty('tool');
      
      const responses = body.response;
      expect(responses).toHaveLength(3);
      
      // Check main bubble
      expect(responses[0]).toEqual({
        type: 'main',
        text: expect.stringContaining('3.14コミュニティでは'),
        attachment: null
      });
      
      // Check sub bubble with attachment
      expect(responses[1]).toEqual({
        type: 'sub',
        text: expect.stringContaining('Brains Gym'),
        attachment: {
          type: 'link',
          url: 'https://www.brainsgym.com/',
          title: 'Brains Gymのサイトはこちら',
          description: 'パーソナルコーチングで更なるレベルアップを目指しませんか？'
        }
      });
      
      // Check CTA bubble
      expect(responses[2]).toEqual({
        type: 'cta',
        text: expect.stringContaining('詳しい内容は体験や資料請求'),
        attachment: null
      });
    });

    it('should return chat response without attachment for non-elementary grades', async () => {
      const grades = ['preschool', 'middle', 'high'];
      
      for (const gradeId of grades) {
        const response = await server.inject({
          method: 'POST',
          url: '/students/chat',
          headers: {
            'x-jwe-token': validJWEToken,
            'content-type': 'application/json'
          },
          payload: {
            ...baseRequest,
            gradeId
          }
        });

        expect(response.statusCode).toBe(200);
        
        const body = JSON.parse(response.body);
        const responses = body.response;
        expect(responses).toHaveLength(2);
        
        // Should not have sub bubble with attachment
        expect(responses.every((r: any) => r.attachment === null)).toBe(true);
      }
    });

    it('should validate attachment structure for elementary grade', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/students/chat',
        headers: {
          'x-jwe-token': validJWEToken,
          'content-type': 'application/json'
        },
        payload: {
          ...baseRequest,
          gradeId: 'elementary'
        }
      });

      const body = JSON.parse(response.body);
      const subBubble = body.response.find((r: any) => r.type === 'sub');
      
      expect(subBubble.attachment).toBeDefined();
      expect(subBubble.attachment).toMatchObject({
        type: expect.stringMatching(/^(link|image|video|file)$/),
        url: expect.stringMatching(/^https?:\/\/.+/),
        title: expect.any(String),
        description: expect.any(String)
      });
    });

    it('should return 400 for missing JWE token (schema validation)', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/students/chat',
        headers: {
          'content-type': 'application/json'
        },
        payload: {
          ...baseRequest,
          gradeId: 'elementary'
        }
      });

      // Fastify schema validation returns 400 for missing required headers
      expect(response.statusCode).toBe(400);
    });

    it('should return 400 for invalid clientId format', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/students/chat',
        headers: {
          'x-jwe-token': validJWEToken,
          'content-type': 'application/json'
        },
        payload: {
          ...baseRequest,
          clientId: 'invalid',
          gradeId: 'elementary'
        }
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 for invalid appId format', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/students/chat',
        headers: {
          'x-jwe-token': validJWEToken,
          'content-type': 'application/json'
        },
        payload: {
          ...baseRequest,
          appId: 'invalid',
          gradeId: 'elementary'
        }
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 for invalid gradeId', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/students/chat',
        headers: {
          'x-jwe-token': validJWEToken,
          'content-type': 'application/json'
        },
        payload: {
          ...baseRequest,
          gradeId: 'invalid',
        }
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 for missing required fields', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/students/chat',
        headers: {
          'x-jwe-token': validJWEToken,
          'content-type': 'application/json'
        },
        payload: {
          appId: '0001',
          gradeId: 'elementary',
          message: 'Missing clientId'
        }
      });

      expect(response.statusCode).toBe(400);
    });
  });
});