/**
 * FreeConversationHistory 테이블 데이터 조회 스크립트
 * 
 * 사용법:
 * node scripts/conversation/fetch-conversations.js
 * 
 * 환경 변수:
 * - NODE_ENV: development | staging | production (기본값: dev)
 * - AWS_PROFILE: AWS 프로파일 (기본값: meeta-ai-navi-dev)
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');

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

/**
 * 전체 데이터 조회
 */
async function fetchAllConversations() {
  console.log(`📊 Fetching all conversations from table: ${TABLE_NAME}`);
  console.log(`Environment: ${ENV}`);
  console.log(`Region: ${AWS_REGION}`);
  console.log('---\n');

  try {
    let allItems = [];
    let lastEvaluatedKey = undefined;
    
    // 페이지네이션으로 모든 데이터 조회
    do {
      const params = {
        TableName: TABLE_NAME
      };
      
      if (lastEvaluatedKey) {
        params.ExclusiveStartKey = lastEvaluatedKey;
      }
      
      const command = new ScanCommand(params);

      const response = await docClient.send(command);
      allItems = allItems.concat(response.Items || []);
      lastEvaluatedKey = response.LastEvaluatedKey;
    } while (lastEvaluatedKey);
    
    // 통계 계산
    const stats = {
      '幼児': { total: 0, lowAccuracy: 0, accuracies: [] },
      '小学生': { total: 0, lowAccuracy: 0, accuracies: [] },
      '中学生': { total: 0, lowAccuracy: 0, accuracies: [] },
      '高校生': { total: 0, lowAccuracy: 0, accuracies: [] }
    };

    const conversations = allItems;
    
    // 데이터 분석
    conversations.forEach(item => {
      const targetAttr = item.targetAttribute;
      if (stats[targetAttr]) {
        stats[targetAttr].total++;
        stats[targetAttr].accuracies.push(item.accuracy);
        if (item.accuracy < 0.8) {
          stats[targetAttr].lowAccuracy++;
        }
      }
    });

    // 결과 출력
    console.log(`✅ Total conversations fetched: ${conversations.length}`);
    console.log('\n📈 Statistics by Target Attribute:');
    
    Object.entries(stats).forEach(([attr, stat]) => {
      if (stat.total > 0) {
        const avgAccuracy = (stat.accuracies.reduce((a, b) => a + b, 0) / stat.total).toFixed(2);
        const minAccuracy = Math.min(...stat.accuracies).toFixed(2);
        const maxAccuracy = Math.max(...stat.accuracies).toFixed(2);
        
        console.log(`\n   ${attr}:`);
        console.log(`   - Total: ${stat.total}`);
        console.log(`   - Low Accuracy (<0.8): ${stat.lowAccuracy}`);
        console.log(`   - Average Accuracy: ${avgAccuracy}`);
        console.log(`   - Min Accuracy: ${minAccuracy}`);
        console.log(`   - Max Accuracy: ${maxAccuracy}`);
      }
    });

    // 저정확도 데이터 샘플 출력
    console.log('\n📋 Sample Low Accuracy Conversations:');
    const lowAccuracySamples = conversations
      .filter(c => c.accuracy < 0.8)
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 5);
    
    lowAccuracySamples.forEach(conv => {
      console.log(`   - ${conv.conversationId} (${conv.targetAttribute}): ${conv.accuracy}`);
      console.log(`     Q: ${conv.question.substring(0, 50)}...`);
    });

    // 고정확도 데이터 샘플 출력
    console.log('\n📋 Sample High Accuracy Conversations:');
    const highAccuracySamples = conversations
      .filter(c => c.accuracy >= 0.8)
      .sort((a, b) => b.accuracy - a.accuracy)
      .slice(0, 5);
    
    highAccuracySamples.forEach(conv => {
      console.log(`   - ${conv.conversationId} (${conv.targetAttribute}): ${conv.accuracy}`);
      console.log(`     Q: ${conv.question.substring(0, 50)}...`);
    });

    return conversations;

  } catch (error) {
    console.error('❌ Error fetching conversations:', error.message);
    throw error;
  }
}

/**
 * 특정 연령대별 조회
 */
async function fetchByTargetAttribute(targetAttribute) {
  console.log(`\n📊 Fetching conversations for: ${targetAttribute}`);
  
  try {
    const command = new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI2',
      KeyConditionExpression: 'GSI2PK = :pk',
      ExpressionAttributeValues: {
        ':pk': `CLIENT#RS000001#ATTR#${targetAttribute}`
      }
    });

    const response = await docClient.send(command);
    const items = response.Items || [];
    
    console.log(`   Found ${items.length} conversations for ${targetAttribute}`);
    
    const lowAccuracy = items.filter(i => i.accuracy < 0.8).length;
    console.log(`   - Low Accuracy (<0.8): ${lowAccuracy}`);
    
    return items;
  } catch (error) {
    console.error(`❌ Error fetching ${targetAttribute}:`, error.message);
    return [];
  }
}

/**
 * 메인 실행 함수
 */
async function main() {
  try {
    // 전체 데이터 조회
    const allConversations = await fetchAllConversations();
    
    // 각 연령대별 상세 조회 (GSI2 사용)
    console.log('\n\n🔍 Detailed Query by Target Attribute (using GSI2):');
    await fetchByTargetAttribute('幼児');
    await fetchByTargetAttribute('小学生');
    await fetchByTargetAttribute('中学生');
    await fetchByTargetAttribute('高校生');
    
    console.log('\n✨ Data fetch completed!');
    
  } catch (error) {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  }
}

// 스크립트 실행
if (require.main === module) {
  main();
}

module.exports = { fetchAllConversations, fetchByTargetAttribute };