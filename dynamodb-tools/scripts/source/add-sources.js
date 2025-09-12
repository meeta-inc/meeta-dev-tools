/**
 * Source 테이블에 데이터 추가 스크립트 (기존 데이터 유지)
 * 
 * 사용법:
 * node scripts/source/add-sources.js
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

// 추가할 데이터 (ACTIVE 2개, ARCHIVED 2개) - 버전 형식 001-999
const newSources = [
  // ACTIVE 상태 소스 2개
  {
    sourceId: `src_${uuidv4().slice(0, 8)}`,
    clientId: 'RS000001',
    appId: 'app_001',
    sourceType: 'FILE',
    name: 'course_guide_2024.pdf',
    description: '2024年度コースガイド',
    version: '002',
    priority: 3,
    status: 'ACTIVE',
    content: {
      fileUrl: `https://meeta-ai-navi.s3.ap-northeast-1.amazonaws.com/source/RS000001/${uuidv4()}.pdf`,
      fileName: 'course_guide_2024.pdf',
      fileSize: '8.2MB',
      mimeType: 'application/pdf'
    },
    version_history: [
      {
        version: '001',
        content: {
          fileUrl: `https://meeta-ai-navi.s3.ap-northeast-1.amazonaws.com/source/RS000001/${uuidv4()}.pdf`,
          fileName: 'course_guide_2024_draft.pdf',
          fileSize: '7.8MB',
          mimeType: 'application/pdf'
        },
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      }
    ],
    metadata: {
      fileFormat: 'PDF',
      pageCount: 120,
      language: 'ja'
    }
  },
  {
    sourceId: `src_${uuidv4().slice(0, 8)}`,
    clientId: 'RS000001',
    appId: 'app_001',
    sourceType: 'LINK',
    name: '錬成会Instagram',
    description: '錬成会公式Instagram',
    version: '001',
    priority: 4,
    status: 'ACTIVE',
    content: {
      url: 'https://www.instagram.com/rensei_official/',
      allowCrossDomain: true
    },
    version_history: [],
    metadata: {
      crawlDepth: 1,
      lastCrawledAt: new Date().toISOString(),
      crawlStatus: 'COMPLETED'
    }
  },
  // ARCHIVED 상태 소스 2개
  {
    sourceId: `src_${uuidv4().slice(0, 8)}`,
    clientId: 'RS000001',
    appId: 'app_001',
    sourceType: 'FILE',
    name: 'old_curriculum_2023.pdf',
    description: '2023年度カリキュラム（旧版）',
    version: '099',
    priority: 100,
    status: 'ARCHIVED',
    content: {
      fileUrl: `https://meeta-ai-navi.s3.ap-northeast-1.amazonaws.com/source/RS000001/${uuidv4()}.pdf`,
      fileName: 'old_curriculum_2023.pdf',
      fileSize: '5.5MB',
      mimeType: 'application/pdf'
    },
    version_history: [],
    metadata: {
      fileFormat: 'PDF',
      pageCount: 85,
      language: 'ja',
      archiveReason: 'Outdated curriculum'
    }
  },
  {
    sourceId: `src_${uuidv4().slice(0, 8)}`,
    clientId: 'RS000001',
    appId: 'app_001',
    sourceType: 'LINK',
    name: '旧ブログサイト',
    description: '錬成会旧ブログ（アーカイブ）',
    version: '999',
    priority: 101,
    status: 'ARCHIVED',
    content: {
      url: 'https://old-blog.rensei.jp/',
      allowCrossDomain: false
    },
    version_history: [],
    metadata: {
      crawlDepth: 0,
      archiveReason: 'Site decommissioned',
      lastCrawledAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString()
    }
  }
];

/**
 * Source 데이터를 DynamoDB에 추가
 */
async function addSources() {
  console.log(`🚀 Starting to add sources to table: ${TABLE_NAME}`);
  console.log(`Environment: ${ENV}`);
  console.log(`Region: ${AWS_REGION}`);
  console.log('---');

  const results = {
    success: [],
    failed: []
  };

  for (const source of newSources) {
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

      console.log(`✅ Successfully added: ${source.name} (${source.sourceType}) - Status: ${source.status}`);
      console.log(`   Source ID: ${source.sourceId}`);
      results.success.push({ name: source.name, status: source.status });

    } catch (error) {
      console.error(`❌ Failed to add: ${source.name}`);
      console.error(`   Error: ${error.message}`);
      results.failed.push({ name: source.name, error: error.message });
    }
  }

  // 결과 요약
  console.log('\n---');
  console.log('📊 Adding Results:');
  console.log(`   ✅ Success: ${results.success.length} sources`);
  console.log(`   ❌ Failed: ${results.failed.length} sources`);

  if (results.success.length > 0) {
    console.log('\n✅ Successfully added sources:');
    const activeCount = results.success.filter(s => s.status === 'ACTIVE').length;
    const archivedCount = results.success.filter(s => s.status === 'ARCHIVED').length;
    console.log(`   ACTIVE: ${activeCount} sources`);
    console.log(`   ARCHIVED: ${archivedCount} sources`);
    results.success.forEach(({ name, status }) => {
      console.log(`   - ${name} (${status})`);
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
    await addSources();
    console.log('\n✨ Adding process completed!');
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

module.exports = { addSources };