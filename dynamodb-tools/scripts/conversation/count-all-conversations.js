/**
 * 전체 아이템 카운트 스크립트 (페이지네이션 포함)
 */

const { DynamoDBClient, ScanCommand } = require('@aws-sdk/client-dynamodb');

const ENV = process.env.NODE_ENV || 'dev';
const AWS_REGION = process.env.AWS_REGION || 'ap-northeast-1';
const TABLE_NAME = `ai-navi-conversation-history-${ENV}`;

const client = new DynamoDBClient({
  region: AWS_REGION,
  ...(process.env.AWS_PROFILE && { profile: process.env.AWS_PROFILE })
});

async function countAll() {
  let totalCount = 0;
  let scannedCount = 0;
  let lastEvaluatedKey = undefined;
  let pageCount = 0;
  
  const convCounts = {};
  
  do {
    const params = {
      TableName: TABLE_NAME,
      Select: 'ALL_ATTRIBUTES'
    };
    
    if (lastEvaluatedKey) {
      params.ExclusiveStartKey = lastEvaluatedKey;
    }
    
    const response = await client.send(new ScanCommand(params));
    
    pageCount++;
    totalCount += response.Count || 0;
    scannedCount += response.ScannedCount || 0;
    
    // CONV 카운트
    if (response.Items) {
      response.Items.forEach(item => {
        if (item.conversationId && item.conversationId.S) {
          const convId = item.conversationId.S;
          if (convId.startsWith('CONV')) {
            const targetAttr = item.targetAttribute?.S || 'Unknown';
            convCounts[targetAttr] = (convCounts[targetAttr] || 0) + 1;
          }
        }
      });
    }
    
    lastEvaluatedKey = response.LastEvaluatedKey;
    
    console.log(`Page ${pageCount}: Count=${response.Count}, Total so far=${totalCount}`);
    
  } while (lastEvaluatedKey);
  
  console.log('\n=== Final Results ===');
  console.log(`Total items in table: ${totalCount}`);
  console.log(`Total scanned: ${scannedCount}`);
  console.log(`Total pages: ${pageCount}`);
  
  console.log('\n=== CONV Conversations by Target Attribute ===');
  let totalConv = 0;
  Object.entries(convCounts).forEach(([attr, count]) => {
    console.log(`${attr}: ${count}`);
    totalConv += count;
  });
  console.log(`Total CONV: ${totalConv}`);
}

countAll().catch(console.error);