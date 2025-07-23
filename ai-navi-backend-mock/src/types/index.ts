// Type definitions for AI Navi Backend Mock Server

export interface AttachmentData {
  type: 'link' | 'image' | 'video' | 'file';
  url: string;
  title?: string;
  description?: string;
  thumbnail?: string;
}

export interface ResponseBubble {
  type: 'main' | 'sub' | 'cta';
  text: string;
  attachment?: AttachmentData | null;
}

export interface ToolResponse {
  // Tool response structure (optional)
  [key: string]: any;
}

export interface ChatRequest {
  clientId: string;
  appId: string;
  gradeId: 'preschool' | 'elementary' | 'middle' | 'high';
  userId: string;
  message: string;
  sessionId?: string;
}

export interface ChatResponse {
  response: ResponseBubble[];
  tool?: ToolResponse | null;
}

export interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  environment: string;
  uptime: number;
  dependencies?: {
    database: 'healthy' | 'degraded' | 'unhealthy';
    llm: 'healthy' | 'degraded' | 'unhealthy';
  };
}

export interface JWEPayload {
  sub: string; // userId
  appId: string;
  gradeId: string;
  iat: number;
  exp: number;
  [key: string]: any;
}

export interface ErrorResponse {
  error: string;
  message: string;
  timestamp: string;
  requestId?: string;
}