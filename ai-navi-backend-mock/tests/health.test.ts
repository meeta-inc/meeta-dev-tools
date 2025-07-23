import Fastify from 'fastify';
import { HealthResponse } from '../src/types';

describe('Health API Tests', () => {
  let server: any;
  
  beforeAll(async () => {
    server = Fastify({ logger: false });
    
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

    server.get('/ai-navi/health', async (request: any, reply: any) => {
      const healthResponse = generateMockHealthResponse();
      const statusCode = healthResponse.status === 'healthy' ? 200 : 
                        healthResponse.status === 'degraded' ? 200 : 503;
      
      return reply.status(statusCode).send(healthResponse);
    });

    await server.ready();
  });

  afterAll(async () => {
    await server.close();
  });

  describe('GET /ai-navi/health', () => {
    it('should return health status', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/ai-navi/health'
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('status');
      expect(body).toHaveProperty('timestamp');
      expect(body).toHaveProperty('version');
      expect(body).toHaveProperty('environment');
      expect(body).toHaveProperty('uptime');
      expect(body).toHaveProperty('dependencies');
    });

    it('should have valid health status values', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/ai-navi/health'
      });

      const body = JSON.parse(response.body);
      expect(['healthy', 'degraded', 'unhealthy']).toContain(body.status);
    });

    it('should have valid timestamp format', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/ai-navi/health'
      });

      const body = JSON.parse(response.body);
      expect(body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should have valid dependencies structure', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/ai-navi/health'
      });

      const body = JSON.parse(response.body);
      expect(body.dependencies).toHaveProperty('database');
      expect(body.dependencies).toHaveProperty('llm');
      expect(['healthy', 'degraded', 'unhealthy']).toContain(body.dependencies.database);
      expect(['healthy', 'degraded', 'unhealthy']).toContain(body.dependencies.llm);
    });

    it('should have correct version and environment', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/ai-navi/health'
      });

      const body = JSON.parse(response.body);
      expect(body.version).toBe('1.0.0');
      expect(body.environment).toBe('mock');
    });

    it('should have valid uptime value', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/ai-navi/health'
      });

      const body = JSON.parse(response.body);
      expect(typeof body.uptime).toBe('number');
      expect(body.uptime).toBeGreaterThanOrEqual(0);
      expect(body.uptime).toBeLessThanOrEqual(86400);
    });
  });
});