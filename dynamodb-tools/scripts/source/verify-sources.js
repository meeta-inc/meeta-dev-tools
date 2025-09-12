/**
 * Source 테이블 데이터 검증 스크립트
 * 
 * 사용법:
 * node scripts/source/verify-sources.js
 * 
 * 환경 변수:
 * - NODE_ENV: development | staging | production (기본값: development)
 * - AWS_PROFILE: AWS 프로파일 (기본값: meeta-ai-navi-dev)
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');

// 환경 설정
const ENV = process.env.NODE_ENV || 'development';
const AWS_REGION = process.env.AWS_REGION || 'ap-northeast-1';
const TABLE_NAME = ENV === 'development' ? 'ai-navi-sources-dev' : `ai-navi-sources-${ENV}`;

// DynamoDB 클라이언트 설정
const client = new DynamoDBClient({
  region: AWS_REGION,
  ...(process.env.AWS_PROFILE && { profile: process.env.AWS_PROFILE })
});

const docClient = DynamoDBDocumentClient.from(client);

/**
 * 특정 클라이언트의 모든 Source 조회
 */
async function getSourcesByClient(clientId) {
  console.log(`\n📋 Fetching all sources for client: ${clientId}`);
  
  try {
    const response = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `CLIENT#${clientId}`,
        ':sk': 'SOURCE#'
      }
    }));

    return response.Items || [];
  } catch (error) {
    console.error(`❌ Error fetching sources: ${error.message}`);
    return [];
  }
}

/**
 * 상태별 Source 조회 (GSI1 사용)
 */
async function getSourcesByStatus(status) {
  console.log(`\n📋 Fetching sources with status: ${status}`);
  
  try {
    const response = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: {
        ':pk': `STATUS#${status}`
      }
    }));

    return response.Items || [];
  } catch (error) {
    console.error(`❌ Error fetching sources by status: ${error.message}`);
    return [];
  }
}

/**
 * 타입별 Source 조회 (GSI2 사용)
 */
async function getSourcesByType(sourceType) {
  console.log(`\n📋 Fetching sources with type: ${sourceType}`);
  
  try {
    const response = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI2',
      KeyConditionExpression: 'GSI2PK = :pk',
      ExpressionAttributeValues: {
        ':pk': `TYPE#${sourceType}`
      }
    }));

    return response.Items || [];
  } catch (error) {
    console.error(`❌ Error fetching sources by type: ${error.message}`);
    return [];
  }
}

/**
 * Source 데이터 포맷팅 및 출력
 */
function displaySource(source) {
  console.log('\n---');
  console.log(`📄 Source: ${source.name}`);
  console.log(`   ID: ${source.sourceId}`);
  console.log(`   Client: ${source.clientId}`);
  console.log(`   Type: ${source.sourceType}`);
  console.log(`   Status: ${source.status}`);
  console.log(`   Priority: ${source.priority}`);
  console.log(`   Version: ${source.version}`);
  console.log(`   Description: ${source.description || 'N/A'}`);
  
  if (source.sourceType === 'FILE') {
    console.log(`   📁 File Details:`);
    console.log(`      - Name: ${source.content.fileName}`);
    console.log(`      - Size: ${source.content.fileSize}`);
    console.log(`      - Type: ${source.content.mimeType}`);
    console.log(`      - URL: ${source.content.fileUrl}`);
  } else if (source.sourceType === 'LINK') {
    console.log(`   🔗 Link Details:`);
    console.log(`      - URL: ${source.content.url}`);
    console.log(`      - Cross Domain: ${source.content.allowCrossDomain ? 'Yes' : 'No'}`);
  }
  
  console.log(`   Created: ${source.createdAt} by ${source.createdBy}`);
  if (source.updatedAt !== source.createdAt) {
    console.log(`   Updated: ${source.updatedAt} by ${source.updatedBy}`);
  }
}

/**
 * 검증 실행
 */
async function verifySources() {
  console.log(`🔍 Verifying sources in table: ${TABLE_NAME}`);
  console.log(`Environment: ${ENV}`);
  console.log(`Region: ${AWS_REGION}`);
  console.log('===================================');

  // 1. 클라이언트별 조회
  const clientSources = await getSourcesByClient('RS000001');
  console.log(`\n📊 Found ${clientSources.length} sources for client RS000001`);
  clientSources.forEach(displaySource);

  // 2. ACTIVE 상태 Source 조회
  const activeSources = await getSourcesByStatus('ACTIVE');
  console.log(`\n\n📊 Found ${activeSources.length} ACTIVE sources`);
  
  // 3. 타입별 조회
  const fileSources = await getSourcesByType('FILE');
  console.log(`\n📊 Found ${fileSources.length} FILE type sources`);
  
  const linkSources = await getSourcesByType('LINK');
  console.log(`📊 Found ${linkSources.length} LINK type sources`);

  // 요약
  console.log('\n===================================');
  console.log('📈 Summary:');
  console.log(`   Total sources for RS000001: ${clientSources.length}`);
  console.log(`   Active sources: ${activeSources.length}`);
  console.log(`   File sources: ${fileSources.length}`);
  console.log(`   Link sources: ${linkSources.length}`);
  
  // 우선순위별 정렬 표시
  const sortedByPriority = clientSources.sort((a, b) => a.priority - b.priority);
  console.log('\n🎯 Sources by Priority:');
  sortedByPriority.forEach(source => {
    console.log(`   ${source.priority}. ${source.name} (${source.sourceType})`);
  });

  return {
    total: clientSources.length,
    active: activeSources.length,
    files: fileSources.length,
    links: linkSources.length
  };
}

/**
 * 메인 실행 함수
 */
async function main() {
  try {
    const results = await verifySources();
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

module.exports = { verifySources };