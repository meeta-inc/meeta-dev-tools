import * as jose from 'jose';

const JWE_SECRET = new TextEncoder().encode('mock-jwe-secret-key-256bits-32ch');

async function generateMockToken(userId, appId, gradeId) {
  const payload = {
    sub: userId,
    appId,
    gradeId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (2 * 60 * 60) // 2 hours
  };
  
  const jwt = await new jose.EncryptJWT(payload)
    .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
    .setIssuedAt()
    .setExpirationTime('2h')
    .encrypt(JWE_SECRET);
  
  return jwt;
}

const token = await generateMockToken('user123', '0001', 'elementary');

console.log('🔑 Test JWT Token:');
console.log(token);
console.log('\n📋 Chat API 테스트 명령어:');
console.log(`curl -X POST http://localhost:3001/students/chat \\
  -H "Content-Type: application/json" \\
  -H "X-JWE-Token: ${token}" \\
  -d '{
    "clientId": "RS000001",
    "appId": "0001",
    "gradeId": "elementary", 
    "userId": "user123",
    "message": "안녕하세요! 수학 문제를 도와주세요.",
    "sessionId": "test-session-123"
  }'`);

console.log('\n🏥 Health API 테스트 명령어:');
console.log('curl http://localhost:3001/ai-navi/health');

console.log('\n📚 API 문서 확인:');
console.log('http://localhost:3001/docs');