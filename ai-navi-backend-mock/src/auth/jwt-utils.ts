import * as jose from 'jose';
import { JWEPayload } from '../types';

const JWE_SECRET = new TextEncoder().encode(
  process.env.JWE_SECRET || 'mock-jwe-secret-key-32-characters-long'
);

export const createMockJWEToken = async (payload: JWEPayload): Promise<string> => {
  const jwt = await new jose.EncryptJWT(payload)
    .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
    .setIssuedAt()
    .setExpirationTime('2h')
    .encrypt(JWE_SECRET);
  
  return jwt;
};

export const verifyJWEToken = async (token: string): Promise<JWEPayload> => {
  const { payload } = await jose.jwtDecrypt(token, JWE_SECRET);
  return payload as unknown as JWEPayload;
};

export const generateMockToken = async (
  userId: string, 
  appId: string, 
  gradeId: string
): Promise<string> => {
  const payload: JWEPayload = {
    sub: userId,
    appId,
    gradeId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (2 * 60 * 60) // 2 hours
  };
  
  return await createMockJWEToken(payload);
};