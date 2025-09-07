/**
 * 幼児 데이터 테스트
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');

const ENV = process.env.NODE_ENV || 'dev';
const AWS_REGION = process.env.AWS_REGION || 'ap-northeast-1';
const TABLE_NAME = `ai-navi-conversation-history-${ENV}`;

const client = new DynamoDBClient({
  region: AWS_REGION,
  ...(process.env.AWS_PROFILE && { profile: process.env.AWS_PROFILE })
});

const docClient = DynamoDBDocumentClient.from(client);

async function testYouji() {
  console.log(`Testing 幼児 data insertion...`);
  
  // 5개의 幼児 데이터 삽입
  for (let i = 1; i <= 5; i++) {
    const item = {
      PK: `CLIENT#RS000001`,
      SK: `CONV#CONV2025Y${String(i).padStart(3, '0')}`,
      GSI1PK: `CLIENT#RS000001`,
      GSI1SK: `CONV#CONV2025Y${String(i).padStart(3, '0')}`,
      GSI2PK: `CLIENT#RS000001#ATTR#幼児`,
      GSI2SK: `CONV#CONV2025Y${String(i).padStart(3, '0')}`,
      conversationId: `CONV2025Y${String(i).padStart(3, '0')}`,
      clientId: 'RS000001',
      targetAttribute: '幼児',
      question: `質問 ${i}`,
      mainBubble: `メイン ${i}`,
      subBubble: `サブ ${i}`,
      ctaBubble: `CTA ${i}`,
      timestamp: new Date(2025, 0, 7, 9, i * 10, 0).toISOString(),
      accuracy: 0.75,
      attachments: [],
      referenceSources: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    try {
      const response = await docClient.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: item
      }));
      
      console.log(`✅ Inserted ${item.conversationId} - Status: ${response.$metadata.httpStatusCode}`);
      
      // 500ms 대기
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.error(`❌ Failed to insert ${item.conversationId}:`, error.message);
    }
  }
  
  // 검증
  console.log('\n🔍 Verifying 幼児 data...');
  try {
    const queryResponse = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI2',
      KeyConditionExpression: 'GSI2PK = :pk',
      ExpressionAttributeValues: {
        ':pk': 'CLIENT#RS000001#ATTR#幼児'
      }
    }));
    
    console.log(`Found ${queryResponse.Items?.length || 0} 幼児 items in database`);
    
    if (queryResponse.Items && queryResponse.Items.length > 0) {
      console.log('Items found:');
      queryResponse.Items.forEach(item => {
        console.log(`  - ${item.conversationId}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Query failed:', error.message);
  }
}

testYouji();