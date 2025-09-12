/**
 * Source 테이블에 버전 테스트 데이터 추가 스크립트
 * 버전 형식: 001, 002, 003, 099, 999 (3자리 숫자)
 * 
 * 사용법:
 * node scripts/source/add-sources-with-versions.js
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

// 테스트 버전 배열
const testVersions = ['001', '002', '003', '099', '999'];

/**
 * 버전 히스토리 생성 함수
 * @param {string} sourceType - FILE 또는 LINK
 * @param {string} currentVersion - 현재 버전
 * @returns {Array} 버전 히스토리 배열
 */
function generateVersionHistory(sourceType, currentVersion) {
  const history = [];
  const versionIndex = testVersions.indexOf(currentVersion);
  
  // 현재 버전보다 이전 버전들만 히스토리에 추가
  for (let i = 0; i < versionIndex; i++) {
    const version = testVersions[i];
    const date = new Date();
    date.setDate(date.getDate() - (versionIndex - i) * 7); // 7일 간격으로 과거 날짜 설정
    
    if (sourceType === 'FILE') {
      history.push({
        version: version,
        content: {
          fileUrl: `https://meeta-ai-navi.s3.ap-northeast-1.amazonaws.com/source/RS000001/${uuidv4()}.pdf`,
          fileName: `test_document_v${version}.pdf`,
          mimeType: 'application/pdf',
          fileSize: `${(Math.random() * 20 + 5).toFixed(1)}MB`
        },
        createdAt: date.toISOString()
      });
    } else {
      history.push({
        version: version,
        content: {
          url: `https://example.com/v${version}`,
          allowCrossDomain: version === '001' ? false : true
        },
        createdAt: date.toISOString()
      });
    }
  }
  
  return history.reverse(); // 최신 버전이 먼저 오도록 역순 정렬
}

/**
 * Source 데이터 생성 함수
 */
function generateSources() {
  const sources = [];
  let priority = 1;
  
  // FILE 타입 소스들 (각 버전별로)
  testVersions.forEach(version => {
    const sourceId = `src_file_${version}_${uuidv4().slice(0, 8)}`;
    const fileUuid = uuidv4();
    
    sources.push({
      sourceId: sourceId,
      clientId: 'RS000001',
      appId: 'app_001',
      sourceType: 'FILE',
      name: `테스트 문서 버전 ${version}`,
      description: `AI Navi 테스트 문서 - 버전 ${version} (PDF)`,
      version: version,
      priority: priority++,
      status: version === '999' ? 'ARCHIVED' : 'ACTIVE',
      content: {
        fileUrl: `https://meeta-ai-navi.s3.ap-northeast-1.amazonaws.com/source/RS000001/${fileUuid}.pdf`,
        fileName: `test_document_v${version}.pdf`,
        mimeType: 'application/pdf',
        fileSize: `${(Math.random() * 20 + 5).toFixed(1)}MB`
      },
      version_history: generateVersionHistory('FILE', version),
      metadata: {
        fileFormat: 'PDF',
        pageCount: Math.floor(Math.random() * 100) + 10,
        language: 'ja',
        lastCrawledAt: version === '001' ? null : new Date().toISOString()
      }
    });
  });
  
  // LINK 타입 소스들 (각 버전별로)
  testVersions.forEach(version => {
    const sourceId = `src_link_${version}_${uuidv4().slice(0, 8)}`;
    
    sources.push({
      sourceId: sourceId,
      clientId: 'RS000001',
      appId: 'app_001',
      sourceType: 'LINK',
      name: `테스트 웹사이트 버전 ${version}`,
      description: `AI Navi 테스트 웹 리소스 - 버전 ${version}`,
      version: version,
      priority: priority++,
      status: version === '099' ? 'PROCESSING' : version === '999' ? 'FAILED' : 'ACTIVE',
      content: {
        url: `https://www.example-test-${version}.com/`,
        allowCrossDomain: version !== '001' // 001 버전만 false
      },
      version_history: generateVersionHistory('LINK', version),
      metadata: {
        crawlDepth: parseInt(version) > 10 ? 3 : 1,
        includeSubdomains: version === '999',
        lastCrawledAt: version === '001' ? null : new Date().toISOString(),
        crawlStatus: version === '999' ? 'FAILED' : version === '099' ? 'IN_PROGRESS' : 'COMPLETED'
      }
    });
  });
  
  // 다양한 상태의 추가 테스트 데이터
  sources.push({
    sourceId: `src_multi_version_${uuidv4().slice(0, 8)}`,
    clientId: 'RS000001',
    appId: 'app_001',
    sourceType: 'FILE',
    name: '다중 버전 테스트 문서',
    description: '여러 버전 히스토리를 가진 테스트 문서',
    version: '999',
    priority: priority++,
    status: 'ACTIVE',
    content: {
      fileUrl: `https://meeta-ai-navi.s3.ap-northeast-1.amazonaws.com/source/RS000001/${uuidv4()}.pdf`,
      fileName: 'multi_version_test.pdf',
      mimeType: 'application/pdf',
      fileSize: '25.5MB'
    },
    version_history: generateVersionHistory('FILE', '999'), // 모든 이전 버전 포함
    metadata: {
      fileFormat: 'PDF',
      pageCount: 250,
      language: 'ja',
      tags: ['comprehensive', 'test', 'all-versions'],
      lastCrawledAt: new Date().toISOString()
    }
  });
  
  return sources;
}

/**
 * Source 데이터를 DynamoDB에 추가
 */
async function addSourcesWithVersions() {
  console.log(`🚀 Starting to add version test sources to table: ${TABLE_NAME}`);
  console.log(`Environment: ${ENV}`);
  console.log(`Region: ${AWS_REGION}`);
  console.log(`Test Versions: ${testVersions.join(', ')}`);
  console.log('---');

  const sources = generateSources();
  const results = {
    success: [],
    failed: []
  };

  for (const source of sources) {
    try {
      const now = new Date().toISOString();
      
      // DynamoDB Item 구성 (현재 설계에 맞게)
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
        
        // Core Attributes
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
        version_history: source.version_history,
        
        // Additional Metadata
        metadata: source.metadata,
        
        // Timestamps
        createdAt: source.version === '001' ? 
          new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString() : // 90일 전
          now,
        createdBy: 'system',
        updatedAt: now,
        updatedBy: 'system'
      };
      
      // ARCHIVED 상태인 경우 archived 관련 필드 추가
      if (source.status === 'ARCHIVED') {
        item.archivedAt = now;
        item.archivedBy = 'system';
      }

      // DynamoDB에 저장
      await docClient.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: item
      }));

      console.log(`✅ Successfully added: ${source.name}`);
      console.log(`   Source ID: ${source.sourceId}`);
      console.log(`   Type: ${source.sourceType}, Version: ${source.version}, Status: ${source.status}`);
      console.log(`   Version History: ${source.version_history.length} previous versions`);
      
      results.success.push({ 
        name: source.name, 
        sourceType: source.sourceType,
        version: source.version,
        status: source.status,
        historyCount: source.version_history.length
      });

    } catch (error) {
      console.error(`❌ Failed to add: ${source.name}`);
      console.error(`   Error: ${error.message}`);
      results.failed.push({ name: source.name, error: error.message });
    }
  }

  // 결과 요약
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Data Creation Results:');
  console.log('='.repeat(60));
  console.log(`✅ Success: ${results.success.length} sources`);
  console.log(`❌ Failed: ${results.failed.length} sources`);

  if (results.success.length > 0) {
    console.log('\n📁 FILE Type Sources:');
    results.success
      .filter(s => s.sourceType === 'FILE')
      .forEach(({ name, version, status, historyCount }) => {
        console.log(`   - ${name} (v${version}, ${status}, ${historyCount} history entries)`);
      });
    
    console.log('\n🔗 LINK Type Sources:');
    results.success
      .filter(s => s.sourceType === 'LINK')
      .forEach(({ name, version, status, historyCount }) => {
        console.log(`   - ${name} (v${version}, ${status}, ${historyCount} history entries)`);
      });
    
    // 상태별 통계
    const statusCounts = results.success.reduce((acc, s) => {
      acc[s.status] = (acc[s.status] || 0) + 1;
      return acc;
    }, {});
    
    console.log('\n📈 Status Distribution:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`   ${status}: ${count} sources`);
    });
    
    // 버전별 통계
    const versionCounts = results.success.reduce((acc, s) => {
      acc[s.version] = (acc[s.version] || 0) + 1;
      return acc;
    }, {});
    
    console.log('\n📊 Version Distribution:');
    testVersions.forEach(version => {
      const count = versionCounts[version] || 0;
      console.log(`   v${version}: ${count} sources (${count/2} FILE, ${count/2} LINK)`);
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
    console.log('🎯 AI Navi Source Version Test Data Generator');
    console.log('='.repeat(60));
    console.log('This script will create test sources with versions:');
    console.log('001, 002, 003, 099, 999 for both FILE and LINK types');
    console.log('='.repeat(60) + '\n');
    
    await addSourcesWithVersions();
    
    console.log('\n✨ Version test data creation completed!');
    console.log('💡 You can verify the data using verify-sources.js script');
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

module.exports = { addSourcesWithVersions };