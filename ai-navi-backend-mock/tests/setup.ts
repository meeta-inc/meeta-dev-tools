import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env' });

// Set test environment
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';