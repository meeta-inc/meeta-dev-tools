/**
 * Delete all review groups from the table
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');

const ENV = process.env.NODE_ENV || 'dev';
const AWS_REGION = process.env.AWS_REGION || 'ap-northeast-1';
const GROUPS_TABLE = `ai-navi-conversation-review-groups-${ENV}`;

const client = new DynamoDBClient({
  region: AWS_REGION,
  ...(process.env.AWS_PROFILE && { profile: process.env.AWS_PROFILE })
});

const docClient = DynamoDBDocumentClient.from(client);

async function deleteAllGroups() {
  console.log('🗑️ Deleting all review groups...');
  console.log(`Table: ${GROUPS_TABLE}`);
  console.log('-'.repeat(50));
  
  try {
    // Scan all items
    const scanResponse = await docClient.send(new ScanCommand({
      TableName: GROUPS_TABLE
    }));
    
    const items = scanResponse.Items || [];
    console.log(`Found ${items.length} groups to delete`);
    
    if (items.length === 0) {
      console.log('No groups to delete');
      return;
    }
    
    // Delete each item
    let deleteCount = 0;
    for (const item of items) {
      try {
        await docClient.send(new DeleteCommand({
          TableName: GROUPS_TABLE,
          Key: {
            PK: item.PK,
            SK: item.SK
          }
        }));
        deleteCount++;
        console.log(`✅ Deleted: ${item.groupId}`);
        
        // Add delay to avoid throttling
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error) {
        console.error(`❌ Failed to delete ${item.groupId}: ${error.message}`);
      }
    }
    
    console.log(`\n✨ Deleted ${deleteCount}/${items.length} groups`);
    
  } catch (error) {
    console.error('❌ Scan failed:', error);
  }
}

deleteAllGroups();