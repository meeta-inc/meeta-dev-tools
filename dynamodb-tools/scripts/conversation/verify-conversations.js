/**
 * FreeConversationHistory 테이블 데이터 검증 스크립트
 * 
 * 사용법:
 * node scripts/conversation/verify-conversations.js
 * 
 * 환경 변수:
 * - NODE_ENV: development | staging | production (기본값: development)
 * - AWS_PROFILE: AWS 프로파일 (기본값: meeta-ai-navi-dev)
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand } = require('@aws-sdk/lib-dynamodb');

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

/**
 * 클라이언트별 모든 대화 조회
 */
async function getConversationsByClient(clientId) {
  console.log(`\n📋 Fetching all conversations for client: ${clientId}`);
  
  try {
    const response = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `CLIENT#${clientId}`,
        ':sk': 'CONV#'
      }
    }));

    return response.Items || [];
  } catch (error) {
    console.error(`❌ Error fetching conversations: ${error.message}`);
    return [];
  }
}

/**
 * 날짜별 대화 조회 (GSI1 사용)
 */
async function getConversationsByDate(clientId, date) {
  console.log(`\n📋 Fetching conversations for date: ${date}`);
  
  try {
    const response = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: {
        ':pk': `CLIENT#${clientId}#DATE#${date}`
      }
    }));

    return response.Items || [];
  } catch (error) {
    console.error(`❌ Error fetching conversations by date: ${error.message}`);
    return [];
  }
}

/**
 * 속성별 대화 조회 (GSI2 사용)
 */
async function getConversationsByAttribute(clientId, targetAttribute) {
  console.log(`\n📋 Fetching conversations for attribute: ${targetAttribute}`);
  
  try {
    const response = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI2',
      KeyConditionExpression: 'GSI2PK = :pk',
      ExpressionAttributeValues: {
        ':pk': `CLIENT#${clientId}#ATTR#${targetAttribute}`
      }
    }));

    return response.Items || [];
  } catch (error) {
    console.error(`❌ Error fetching conversations by attribute: ${error.message}`);
    return [];
  }
}

/**
 * 월별 통계 조회 (GSI3 사용)
 */
async function getMonthlyStats(yearMonth) {
  console.log(`\n📋 Fetching monthly statistics for: ${yearMonth}`);
  
  try {
    const response = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI3',
      KeyConditionExpression: 'GSI3PK = :pk',
      ExpressionAttributeValues: {
        ':pk': `YEARMONTH#${yearMonth}`
      }
    }));

    return response.Items || [];
  } catch (error) {
    console.error(`❌ Error fetching monthly stats: ${error.message}`);
    return [];
  }
}

/**
 * 대화 데이터 포맷팅 및 출력
 */
function displayConversation(conv) {
  console.log('\n---');
  console.log(`💬 Conversation: ${conv.conversationId}`);
  console.log(`   Client: ${conv.clientId}`);
  console.log(`   User: ${conv.userId || 'N/A'}`);
  console.log(`   Category: ${conv.category || 'N/A'}`);
  console.log(`   Attribute: ${conv.targetAttribute}`);
  console.log(`   Timestamp: ${conv.timestamp}`);
  
  console.log(`\n   📝 Question:`);
  console.log(`      ${conv.question}`);
  
  console.log(`\n   💡 Response:`);
  console.log(`      Main: ${conv.mainBubble.substring(0, 60)}...`);
  if (conv.subBubble) {
    console.log(`      Sub: ${conv.subBubble.substring(0, 60)}...`);
  }
  if (conv.ctaBubble) {
    console.log(`      CTA: ${conv.ctaBubble.substring(0, 60)}...`);
  }
  
  console.log(`\n   📊 Metrics:`);
  console.log(`      Response Time: ${conv.responseTime}ms`);
  console.log(`      Status Code: ${conv.statusCode}`);
  console.log(`      Success: ${conv.success ? '✅' : '❌'}`);
  console.log(`      Accuracy: ${(conv.accuracy * 100).toFixed(1)}%`);
  
  if (conv.attachments && conv.attachments.length > 0) {
    console.log(`   📎 Attachments: ${conv.attachments.length}`);
    conv.attachments.forEach(att => {
      console.log(`      - ${att.type}: ${att.url.substring(0, 50)}...`);
    });
  }
}

/**
 * 통계 요약 출력
 */
function displayStatistics(conversations) {
  if (conversations.length === 0) return;
  
  // 응답 시간 통계
  const responseTimes = conversations.map(c => c.responseTime || 0);
  const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
  const minResponseTime = Math.min(...responseTimes);
  const maxResponseTime = Math.max(...responseTimes);
  
  // 성공률
  const successCount = conversations.filter(c => c.success).length;
  const successRate = (successCount / conversations.length * 100).toFixed(1);
  
  // 정확도 평균
  const accuracies = conversations.map(c => c.accuracy || 0);
  const avgAccuracy = accuracies.reduce((a, b) => a + b, 0) / accuracies.length;
  
  // 카테고리별 분포
  const categories = {};
  conversations.forEach(c => {
    const cat = c.category || 'uncategorized';
    categories[cat] = (categories[cat] || 0) + 1;
  });
  
  console.log('\n📈 Statistics Summary:');
  console.log(`   Total Conversations: ${conversations.length}`);
  console.log(`   Success Rate: ${successRate}% (${successCount}/${conversations.length})`);
  console.log(`   Average Accuracy: ${(avgAccuracy * 100).toFixed(1)}%`);
  console.log(`\n   Response Time:`);
  console.log(`      Average: ${avgResponseTime.toFixed(0)}ms`);
  console.log(`      Min: ${minResponseTime}ms`);
  console.log(`      Max: ${maxResponseTime}ms`);
  
  console.log(`\n   Categories:`);
  Object.entries(categories).forEach(([cat, count]) => {
    console.log(`      ${cat}: ${count} (${(count/conversations.length*100).toFixed(1)}%)`);
  });
}

/**
 * 검증 실행
 */
async function verifyConversations() {
  console.log(`🔍 Verifying conversations in table: ${TABLE_NAME}`);
  console.log(`Environment: ${ENV}`);
  console.log(`Region: ${AWS_REGION}`);
  console.log('===================================');

  // 1. 클라이언트별 조회
  const clientConversations = await getConversationsByClient('RS000001');
  console.log(`\n📊 Found ${clientConversations.length} conversations for client RS000001`);
  
  // 상세 표시 (처음 3개만)
  clientConversations.slice(0, 3).forEach(displayConversation);
  
  if (clientConversations.length > 3) {
    console.log(`\n   ... and ${clientConversations.length - 3} more conversations`);
  }

  // 2. 날짜별 조회 (2025-08-26)
  const dateConversations = await getConversationsByDate('RS000001', '2025-08-26');
  console.log(`\n\n📊 Found ${dateConversations.length} conversations for 2025-08-26`);

  // 3. 속성별 조회
  const userSConversations = await getConversationsByAttribute('RS000001', 'User_S');
  console.log(`\n📊 Found ${userSConversations.length} conversations for User_S attribute`);

  // 4. 월별 통계
  const monthlyStats = await getMonthlyStats('2025-08');
  console.log(`\n📊 Found ${monthlyStats.length} conversations for 2025-08`);

  // 통계 요약
  displayStatistics(clientConversations);

  // 최종 요약
  console.log('\n===================================');
  console.log('📈 Verification Summary:');
  console.log(`   Total conversations for RS000001: ${clientConversations.length}`);
  console.log(`   Conversations on 2025-08-26: ${dateConversations.length}`);
  console.log(`   User_S conversations: ${userSConversations.length}`);
  console.log(`   August 2025 conversations: ${monthlyStats.length}`);

  return {
    total: clientConversations.length,
    byDate: dateConversations.length,
    byAttribute: userSConversations.length,
    byMonth: monthlyStats.length
  };
}

/**
 * 메인 실행 함수
 */
async function main() {
  try {
    const results = await verifyConversations();
    console.log('\n✅ Verification completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  }
}

// 스크립트 실행
if (require.main === module) {
  main();
}

module.exports = { verifyConversations };