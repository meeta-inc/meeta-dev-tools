/**
 * Source 테이블 초기 데이터 시딩 스크립트
 * 
 * 사용법:
 * node scripts/source/seed-sources.js
 * 
 * 환경 변수:
 * - NODE_ENV: development | staging | production (기본값: development)
 * - AWS_PROFILE: AWS 프로파일 (기본값: meeta-ai-navi-dev)
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');

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

// 초기 데이터 (버전 형식 001-999로 변경)
const initialSources = [
  {
    sourceId: `src_${uuidv4().slice(0, 8)}`,
    clientId: 'RS000001',
    appId: 'app_001',
    sourceType: 'FILE',
    name: 'rensei_pamplet.pdf',
    description: '錬成会説明パンフレット',
    version: '001',
    priority: 1,
    status: 'ACTIVE',
    content: {
      fileUrl: `https://meeta-ai-navi.s3.ap-northeast-1.amazonaws.com/source/RS000001/${uuidv4()}.pdf`,
      fileName: 'rensei_pamplet.pdf',
      fileSize: '10.4MB',
      mimeType: 'application/pdf'
    },
    version_history: [],
    metadata: {
      fileFormat: 'PDF',
      pageCount: 45,
      language: 'ja'
    }
  },
  {
    sourceId: `src_${uuidv4().slice(0, 8)}`,
    clientId: 'RS000001',
    appId: 'app_001',
    sourceType: 'LINK',
    name: '3.14ホームページ',
    description: '3.14ホームページ',
    version: '001',
    priority: 2,
    status: 'ACTIVE',
    content: {
      url: 'https://www.314community.com/',
      allowCrossDomain: true
    },
    version_history: [],
    metadata: {
      crawlDepth: 2,
      lastCrawledAt: new Date().toISOString(),
      crawlStatus: 'COMPLETED'
    }
  }
];

/**
 * Source 데이터를 DynamoDB에 삽입
 */
async function seedSources() {
  console.log(`🚀 Starting to seed sources to table: ${TABLE_NAME}`);
  console.log(`Environment: ${ENV}`);
  console.log(`Region: ${AWS_REGION}`);
  console.log('---');

  const results = {
    success: [],
    failed: []
  };

  for (const source of initialSources) {
    try {
      const now = new Date().toISOString();
      
      // DynamoDB Item 구성
      const item = {
        // Primary Keys
        PK: `CLIENT#${source.clientId}`,
        SK: `SOURCE#${source.sourceId}`,
        
        // GSI Keys
        GSI1PK: `STATUS#${source.status}`,
        GSI1SK: `PRIORITY#${String(source.priority).padStart(5, '0')}#SOURCE#${source.sourceId}`,
        GSI2PK: `TYPE#${source.sourceType}`,
        GSI2SK: `CLIENT#${source.clientId}#VERSION#${source.version}`,
        GSI3PK: `CLIENT#${source.clientId}#TYPE#${source.sourceType}`,
        GSI3SK: `STATUS#${source.status}#NAME#${source.name}`,
        
        // Attributes
        sourceId: source.sourceId,
        clientId: source.clientId,
        appId: source.appId,
        sourceType: source.sourceType,
        name: source.name,
        description: source.description,
        version: source.version,
        priority: source.priority,
        status: source.status,
        content: source.content,
        
        // Version History
        version_history: source.version_history || [],
        
        // Additional Metadata
        metadata: source.metadata || {},
        
        // Timestamps
        createdAt: now,
        createdBy: 'system',
        updatedAt: now,
        updatedBy: 'system'
      };

      // DynamoDB에 저장
      await docClient.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: item
      }));

      console.log(`✅ Successfully seeded: ${source.name} (${source.sourceType})`);
      console.log(`   Source ID: ${source.sourceId}`);
      results.success.push(source.name);

    } catch (error) {
      console.error(`❌ Failed to seed: ${source.name}`);
      console.error(`   Error: ${error.message}`);
      results.failed.push({ name: source.name, error: error.message });
    }
  }

  // 결과 요약
  console.log('\n---');
  console.log('📊 Seeding Results:');
  console.log(`   ✅ Success: ${results.success.length} sources`);
  console.log(`   ❌ Failed: ${results.failed.length} sources`);

  if (results.success.length > 0) {
    console.log('\n✅ Successfully seeded sources:');
    results.success.forEach(name => {
      console.log(`   - ${name}`);
    });
  }

  if (results.failed.length > 0) {
    console.log('\n❌ Failed sources:');
    results.failed.forEach(({ name, error }) => {
      console.log(`   - ${name}: ${error}`);
    });
  }

  return results;
}

/**
 * 메인 실행 함수
 */
async function main() {
  try {
    await seedSources();
    console.log('\n✨ Seeding process completed!');
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

module.exports = { seedSources };