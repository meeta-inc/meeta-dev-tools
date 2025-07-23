import { generateMockToken } from './src/auth/jwt-utils.js';

async function createTestToken() {
  try {
    const token = await generateMockToken('user123', 'ai-navi-app', 'elementary');
    console.log('Test JWT Token:');
    console.log(token);
    console.log('\n--- Chat API Test Command ---');
    console.log(`curl -X POST http://localhost:3001/ai-navi/chat \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${token}" \\
  -d '{
    "appId": "ai-navi-app",
    "gradeId": "elementary", 
    "userId": "user123",
    "message": "안녕하세요! 수학 문제를 도와주세요."
  }'`);
  } catch (error) {
    console.error('Error generating token:', error);
  }
}

createTestToken();