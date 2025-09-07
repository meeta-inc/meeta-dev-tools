/**
 * Auto delete all conversations without confirmation
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');

// 환경 설정
const ENV = process.env.NODE_ENV || 'development';
const AWS_REGION = process.env.AWS_REGION || 'ap-northeast-1';
const TABLE_NAME = `ai-navi-conversation-history-${ENV}`;

// DynamoDB 클라이언트 설정
const client = new DynamoDBClient({
  region: AWS_REGION,
  ...(process.env.AWS_PROFILE && { profile: process.env.AWS_PROFILE })
});

const docClient = DynamoDBDocumentClient.from(client);

async function deleteAll() {
  console.log(`🗑️  Deleting all conversations from: ${TABLE_NAME}`);
  
  // Get all conversations
  const response = await docClient.send(new QueryCommand({
    TableName: TABLE_NAME,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: {
      ':pk': 'CLIENT#RS000001',
      ':sk': 'CONV#'
    }
  }));

  const conversations = response.Items || [];
  console.log(`Found ${conversations.length} conversations to delete`);

  let deleted = 0;
  for (const conv of conversations) {
    try {
      await docClient.send(new DeleteCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: conv.PK,
          SK: conv.SK
        }
      }));
      deleted++;
      console.log(`✅ Deleted: ${conv.conversationId}`);
    } catch (error) {
      console.error(`❌ Failed to delete ${conv.conversationId}: ${error.message}`);
    }
  }

  console.log(`\n✨ Deleted ${deleted} conversations`);
}

deleteAll().catch(console.error);