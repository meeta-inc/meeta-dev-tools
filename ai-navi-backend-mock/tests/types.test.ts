import { 
  AttachmentData, 
  ResponseBubble, 
  ChatRequest, 
  ChatResponse, 
  HealthResponse,
  JWEPayload,
  ErrorResponse 
} from '../src/types';

describe('Type Definitions Tests', () => {
  describe('AttachmentData', () => {
    it('should validate link attachment structure', () => {
      const linkAttachment: AttachmentData = {
        type: 'link',
        url: 'https://www.brainsgym.com/',
        title: 'Brains Gym',
        description: 'Personal coaching service'
      };

      expect(linkAttachment.type).toBe('link');
      expect(linkAttachment.url).toMatch(/^https?:\/\/.+/);
      expect(linkAttachment.title).toBeDefined();
      expect(linkAttachment.description).toBeDefined();
    });

    it('should validate image attachment structure', () => {
      const imageAttachment: AttachmentData = {
        type: 'image',
        url: 'https://example.com/image.jpg',
        title: 'Sample Image',
        thumbnail: 'https://example.com/thumb.jpg'
      };

      expect(imageAttachment.type).toBe('image');
      expect(imageAttachment.url).toMatch(/^https?:\/\/.+/);
      expect(imageAttachment.thumbnail).toBeDefined();
    });

    it('should validate video attachment structure', () => {
      const videoAttachment: AttachmentData = {
        type: 'video',
        url: 'https://example.com/video.mp4',
        title: 'Sample Video',
        description: 'Educational video',
        thumbnail: 'https://example.com/video-thumb.jpg'
      };

      expect(videoAttachment.type).toBe('video');
      expect(videoAttachment.url).toMatch(/^https?:\/\/.+/);
    });

    it('should validate file attachment structure', () => {
      const fileAttachment: AttachmentData = {
        type: 'file',
        url: 'https://example.com/document.pdf',
        title: 'Important Document'
      };

      expect(fileAttachment.type).toBe('file');
      expect(fileAttachment.url).toMatch(/^https?:\/\/.+/);
    });
  });

  describe('ResponseBubble', () => {
    it('should validate main bubble without attachment', () => {
      const mainBubble: ResponseBubble = {
        type: 'main',
        text: 'This is a main response bubble',
        attachment: null
      };

      expect(mainBubble.type).toBe('main');
      expect(mainBubble.text).toBeDefined();
      expect(mainBubble.attachment).toBeNull();
    });

    it('should validate sub bubble with attachment', () => {
      const subBubble: ResponseBubble = {
        type: 'sub',
        text: 'This is a sub response bubble',
        attachment: {
          type: 'link',
          url: 'https://example.com',
          title: 'Example Link'
        }
      };

      expect(subBubble.type).toBe('sub');
      expect(subBubble.text).toBeDefined();
      expect(subBubble.attachment).toBeDefined();
      expect(subBubble.attachment?.type).toBe('link');
    });

    it('should validate CTA bubble', () => {
      const ctaBubble: ResponseBubble = {
        type: 'cta',
        text: 'This is a call-to-action bubble',
        attachment: null
      };

      expect(ctaBubble.type).toBe('cta');
      expect(ctaBubble.text).toBeDefined();
    });
  });

  describe('ChatRequest', () => {
    it('should validate complete chat request', () => {
      const chatRequest: ChatRequest = {
        clientId: 'RS000001',
        appId: '0001',
        gradeId: 'elementary',
        userId: 'testuser123',
        message: 'Hello, I need help with math',
        sessionId: 'session-abc-123'
      };

      expect(chatRequest.clientId).toMatch(/^[A-Z]{2}\d{6}$/);
      expect(chatRequest.appId).toMatch(/^\d{4}$/);
      expect(['preschool', 'elementary', 'middle', 'high']).toContain(chatRequest.gradeId);
      expect(chatRequest.userId).toBeDefined();
      expect(chatRequest.message).toBeDefined();
      expect(chatRequest.sessionId).toBeDefined();
    });

    it('should validate minimal chat request', () => {
      const chatRequest: ChatRequest = {
        clientId: 'AB123456',
        appId: '9999',
        gradeId: 'high',
        userId: 'user456',
        message: 'Quick question'
      };

      expect(chatRequest.sessionId).toBeUndefined();
    });
  });

  describe('ChatResponse', () => {
    it('should validate chat response with multiple bubbles', () => {
      const chatResponse: ChatResponse = {
        response: [
          {
            type: 'main',
            text: 'Main response',
            attachment: null
          },
          {
            type: 'sub',
            text: 'Sub response',
            attachment: {
              type: 'link',
              url: 'https://example.com',
              title: 'Link'
            }
          },
          {
            type: 'cta',
            text: 'Call to action',
            attachment: null
          }
        ],
        tool: null
      };

      expect(chatResponse.response).toHaveLength(3);
      expect(chatResponse.response[0].type).toBe('main');
      expect(chatResponse.response[1].type).toBe('sub');
      expect(chatResponse.response[2].type).toBe('cta');
      expect(chatResponse.tool).toBeNull();
    });
  });

  describe('HealthResponse', () => {
    it('should validate healthy response', () => {
      const healthResponse: HealthResponse = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: 'mock',
        uptime: 3600,
        dependencies: {
          database: 'healthy',
          llm: 'healthy'
        }
      };

      expect(['healthy', 'degraded', 'unhealthy']).toContain(healthResponse.status);
      expect(healthResponse.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(healthResponse.version).toBeDefined();
      expect(healthResponse.environment).toBeDefined();
      expect(typeof healthResponse.uptime).toBe('number');
    });
  });

  describe('JWEPayload', () => {
    it('should validate JWE payload structure', () => {
      const jwePayload: JWEPayload = {
        sub: 'user123',
        appId: '0001',
        gradeId: 'elementary',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
      };

      expect(jwePayload.sub).toBeDefined();
      expect(jwePayload.appId).toBeDefined();
      expect(jwePayload.gradeId).toBeDefined();
      expect(typeof jwePayload.iat).toBe('number');
      expect(typeof jwePayload.exp).toBe('number');
      expect(jwePayload.exp).toBeGreaterThan(jwePayload.iat);
    });
  });

  describe('ErrorResponse', () => {
    it('should validate error response structure', () => {
      const errorResponse: ErrorResponse = {
        error: 'Bad Request',
        message: 'Invalid request parameters',
        timestamp: new Date().toISOString(),
        requestId: 'req-123-abc'
      };

      expect(errorResponse.error).toBeDefined();
      expect(errorResponse.message).toBeDefined();
      expect(errorResponse.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(errorResponse.requestId).toBeDefined();
    });
  });
});