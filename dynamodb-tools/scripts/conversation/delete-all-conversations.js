/**
 * FreeConversationHistory 테이블 전체 데이터 삭제 스크립트
 * 
 * 사용법:
 * node scripts/conversation/delete-all-conversations.js
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');

// 환경 설정
const ENV = process.env.NODE_ENV || 'dev';
const AWS_REGION = process.env.AWS_REGION || 'ap-northeast-1';
const TABLE_NAME = `ai-navi-conversation-history-${ENV}`;

// DynamoDB 클라이언트 설정
const client = new DynamoDBClient({
  region: AWS_REGION,
  ...(process.env.AWS_PROFILE && { profile: process.env.AWS_PROFILE })
});

const docClient = DynamoDBDocumentClient.from(client);

async function deleteAllConversations() {
  console.log(`🗑️  Deleting all conversations from table: ${TABLE_NAME}`);
  console.log(`Environment: ${ENV}`);
  console.log(`Region: ${AWS_REGION}`);
  console.log('---\n');

  try {
    // 모든 아이템 조회
    const scanCommand = new ScanCommand({
      TableName: TABLE_NAME
    });

    const scanResponse = await docClient.send(scanCommand);
    const items = scanResponse.Items || [];
    
    console.log(`Found ${items.length} items to delete`);

    let deletedCount = 0;
    let failedCount = 0;

    // 각 아이템 삭제
    for (const item of items) {
      try {
        const deleteCommand = new DeleteCommand({
          TableName: TABLE_NAME,
          Key: {
            PK: item.PK,
            SK: item.SK
          }
        });

        await docClient.send(deleteCommand);
        deletedCount++;
        console.log(`✅ Deleted: ${item.conversationId || item.SK}`);
      } catch (error) {
        failedCount++;
        console.error(`❌ Failed to delete: ${item.conversationId || item.SK}`, error.message);
      }
    }

    console.log('\n---');
    console.log(`📊 Deletion Results:`);
    console.log(`   ✅ Deleted: ${deletedCount} items`);
    console.log(`   ❌ Failed: ${failedCount} items`);
    
    return { deletedCount, failedCount };

  } catch (error) {
    console.error('❌ Error scanning table:', error.message);
    throw error;
  }
}

async function main() {
  try {
    await deleteAllConversations();
    console.log('\n✨ Deletion completed!');
    process.exit(0);
  } catch (error) {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { deleteAllConversations };