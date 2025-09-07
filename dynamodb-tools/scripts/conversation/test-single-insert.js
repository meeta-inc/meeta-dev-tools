/**
 * 단일 아이템 삽입 테스트
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');

const ENV = process.env.NODE_ENV || 'dev';
const AWS_REGION = process.env.AWS_REGION || 'ap-northeast-1';
const TABLE_NAME = `ai-navi-conversation-history-${ENV}`;

const client = new DynamoDBClient({
  region: AWS_REGION,
  ...(process.env.AWS_PROFILE && { profile: process.env.AWS_PROFILE })
});

const docClient = DynamoDBDocumentClient.from(client);

async function testInsert() {
  console.log(`Testing single insert to: ${TABLE_NAME}`);
  
  const testItem = {
    PK: 'CLIENT#RS000001',
    SK: 'CONV#TEST001',
    GSI1PK: 'CLIENT#RS000001',
    GSI1SK: 'CONV#TEST001',
    GSI2PK: 'CLIENT#RS000001#ATTR#TEST',
    GSI2SK: 'CONV#TEST001',
    conversationId: 'TEST001',
    clientId: 'RS000001',
    targetAttribute: 'TEST',
    question: 'Test question',
    mainBubble: 'Test main',
    subBubble: 'Test sub',
    ctaBubble: 'Test cta',
    timestamp: new Date().toISOString(),
    accuracy: 0.95,
    createdAt: new Date().toISOString()
  };
  
  try {
    const response = await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: testItem
    }));
    
    console.log('✅ Insert successful!');
    console.log('Response:', JSON.stringify(response, null, 2));
    
  } catch (error) {
    console.error('❌ Insert failed:', error);
  }
}

testInsert();