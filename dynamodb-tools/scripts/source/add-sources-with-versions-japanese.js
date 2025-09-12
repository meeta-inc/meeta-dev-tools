/**
 * Source 테이블에 일본어 버전 테스트 데이터 추가 스크립트
 * 버전 형식: 001, 002, 003, 099, 999 (3자리 숫자)
 * 
 * 사용법:
 * node scripts/source/add-sources-with-versions-japanese.js
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
          fileName: `錬成会案内_v${version}.pdf`,
          mimeType: 'application/pdf',
          fileSize: `${(Math.random() * 20 + 5).toFixed(1)}MB`
        },
        createdAt: date.toISOString()
      });
    } else {
      history.push({
        version: version,
        content: {
          url: `https://www.rensei-kai.jp/archive/v${version}`,
          allowCrossDomain: version === '001' ? false : true
        },
        createdAt: date.toISOString()
      });
    }
  }
  
  return history.reverse(); // 最新 버전이 먼저 오도록 역순 정렬
}

/**
 * Source 데이터 생성 함수
 */
function generateSources() {
  const sources = [];
  let priority = 1;
  
  // FILE 타입 소스들 (각 버전별로) - 일본어
  const fileNames = [
    { version: '001', name: '入学案内パンフレット_初版', description: '錬成会入学案内パンフレット - 初版' },
    { version: '002', name: '入学案内パンフレット_改訂版', description: '錬成会入学案内パンフレット - 改訂版' },
    { version: '003', name: '入学案内パンフレット_第3版', description: '錬成会入学案内パンフレット - 第3版' },
    { version: '099', name: '入学案内パンフレット_テスト版', description: '錬成会入学案内パンフレット - テスト版' },
    { version: '999', name: '入学案内パンフレット_最終版', description: '錬成会入学案内パンフレット - 最終アーカイブ版' }
  ];
  
  fileNames.forEach(({ version, name, description }) => {
    const sourceId = `src_file_${version}_${uuidv4().slice(0, 8)}`;
    const fileUuid = uuidv4();
    
    sources.push({
      sourceId: sourceId,
      clientId: 'RS000001',
      appId: 'app_001',
      sourceType: 'FILE',
      name: name,
      description: description,
      version: version,
      priority: priority++,
      status: version === '999' ? 'ARCHIVED' : 'ACTIVE',
      content: {
        fileUrl: `https://meeta-ai-navi.s3.ap-northeast-1.amazonaws.com/source/RS000001/${fileUuid}.pdf`,
        fileName: `${name}.pdf`,
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
  
  // LINK 타입 소스들 (각 버전별로) - 일본어
  const linkSources = [
    { version: '001', name: '錬成会公式サイト_初期版', description: '錬成会公式ウェブサイト - 初期リリース版', url: 'https://www.rensei-kai-v001.jp/' },
    { version: '002', name: '錬成会公式サイト_更新版', description: '錬成会公式ウェブサイト - 内容更新版', url: 'https://www.rensei-kai-v002.jp/' },
    { version: '003', name: '錬成会公式サイト_改良版', description: '錬成会公式ウェブサイト - UI改良版', url: 'https://www.rensei-kai-v003.jp/' },
    { version: '099', name: '錬成会公式サイト_ベータ版', description: '錬成会公式ウェブサイト - ベータテスト版', url: 'https://beta.rensei-kai.jp/' },
    { version: '999', name: '錬成会公式サイト_旧版', description: '錬成会公式ウェブサイト - 旧バージョン（アーカイブ）', url: 'https://old.rensei-kai.jp/' }
  ];
  
  linkSources.forEach(({ version, name, description, url }) => {
    const sourceId = `src_link_${version}_${uuidv4().slice(0, 8)}`;
    
    sources.push({
      sourceId: sourceId,
      clientId: 'RS000001',
      appId: 'app_001',
      sourceType: 'LINK',
      name: name,
      description: description,
      version: version,
      priority: priority++,
      status: version === '099' ? 'PROCESSING' : version === '999' ? 'FAILED' : 'ACTIVE',
      content: {
        url: url,
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
  
  // 다양한 상태의 추가 테스트 데이터 - 일본어
  sources.push({
    sourceId: `src_multi_version_${uuidv4().slice(0, 8)}`,
    clientId: 'RS000001',
    appId: 'app_001',
    sourceType: 'FILE',
    name: '総合カリキュラムガイド',
    description: '錬成会総合カリキュラムガイド - 全バージョン統合版',
    version: '999',
    priority: priority++,
    status: 'ACTIVE',
    content: {
      fileUrl: `https://meeta-ai-navi.s3.ap-northeast-1.amazonaws.com/source/RS000001/${uuidv4()}.pdf`,
      fileName: '総合カリキュラムガイド_統合版.pdf',
      mimeType: 'application/pdf',
      fileSize: '25.5MB'
    },
    version_history: generateVersionHistory('FILE', '999'), // 모든 이전 버전 포함
    metadata: {
      fileFormat: 'PDF',
      pageCount: 250,
      language: 'ja',
      tags: ['総合', 'カリキュラム', '全バージョン'],
      lastCrawledAt: new Date().toISOString()
    }
  });
  
  // 추가 실제 데이터 유형 - 일본어
  sources.push({
    sourceId: `src_${uuidv4().slice(0, 8)}`,
    clientId: 'RS000001',
    appId: 'app_001',
    sourceType: 'FILE',
    name: '2025年度入試要項',
    description: '錬成会2025年度入学試験要項',
    version: '001',
    priority: priority++,
    status: 'ACTIVE',
    content: {
      fileUrl: `https://meeta-ai-navi.s3.ap-northeast-1.amazonaws.com/source/RS000001/${uuidv4()}.pdf`,
      fileName: '2025年度入試要項.pdf',
      mimeType: 'application/pdf',
      fileSize: '3.2MB'
    },
    version_history: [],
    metadata: {
      fileFormat: 'PDF',
      pageCount: 28,
      language: 'ja',
      tags: ['入試', '2025年度', '要項'],
      lastCrawledAt: new Date().toISOString()
    }
  });
  
  sources.push({
    sourceId: `src_${uuidv4().slice(0, 8)}`,
    clientId: 'RS000001',
    appId: 'app_001',
    sourceType: 'LINK',
    name: '錬成会YouTube公式チャンネル',
    description: '錬成会の授業動画・説明会動画配信チャンネル',
    version: '001',
    priority: priority++,
    status: 'ACTIVE',
    content: {
      url: 'https://www.youtube.com/@rensei-official',
      allowCrossDomain: true
    },
    version_history: [],
    metadata: {
      crawlDepth: 1,
      includeSubdomains: false,
      lastCrawledAt: new Date().toISOString(),
      crawlStatus: 'COMPLETED'
    }
  });
  
  return sources;
}

/**
 * Source 데이터를 DynamoDB에 추가
 */
async function addJapaneseSourcesWithVersions() {
  console.log(`🚀 日本語バージョンテストデータの追加開始`);
  console.log(`テーブル: ${TABLE_NAME}`);
  console.log(`環境: ${ENV}`);
  console.log(`リージョン: ${AWS_REGION}`);
  console.log(`テストバージョン: ${testVersions.join(', ')}`);
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

      console.log(`✅ 追加成功: ${source.name}`);
      console.log(`   Source ID: ${source.sourceId}`);
      console.log(`   タイプ: ${source.sourceType}, バージョン: ${source.version}, ステータス: ${source.status}`);
      console.log(`   バージョン履歴: ${source.version_history.length}件`);
      
      results.success.push({ 
        name: source.name, 
        sourceType: source.sourceType,
        version: source.version,
        status: source.status,
        historyCount: source.version_history.length
      });

    } catch (error) {
      console.error(`❌ 追加失敗: ${source.name}`);
      console.error(`   エラー: ${error.message}`);
      results.failed.push({ name: source.name, error: error.message });
    }
  }

  // 결과 요약
  console.log('\n' + '='.repeat(60));
  console.log('📊 テストデータ作成結果:');
  console.log('='.repeat(60));
  console.log(`✅ 成功: ${results.success.length}件`);
  console.log(`❌ 失敗: ${results.failed.length}件`);

  if (results.success.length > 0) {
    console.log('\n📁 FILEタイプのソース:');
    results.success
      .filter(s => s.sourceType === 'FILE')
      .forEach(({ name, version, status, historyCount }) => {
        console.log(`   - ${name} (v${version}, ${status}, 履歴${historyCount}件)`);
      });
    
    console.log('\n🔗 LINKタイプのソース:');
    results.success
      .filter(s => s.sourceType === 'LINK')
      .forEach(({ name, version, status, historyCount }) => {
        console.log(`   - ${name} (v${version}, ${status}, 履歴${historyCount}件)`);
      });
    
    // 상태별 통계
    const statusCounts = results.success.reduce((acc, s) => {
      acc[s.status] = (acc[s.status] || 0) + 1;
      return acc;
    }, {});
    
    console.log('\n📈 ステータス別分布:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`   ${status}: ${count}件`);
    });
    
    // 버전별 통계
    const versionCounts = results.success.reduce((acc, s) => {
      acc[s.version] = (acc[s.version] || 0) + 1;
      return acc;
    }, {});
    
    console.log('\n📊 バージョン別分布:');
    testVersions.forEach(version => {
      const count = versionCounts[version] || 0;
      if (count > 0) {
        console.log(`   v${version}: ${count}件`);
      }
    });
  }

  if (results.failed.length > 0) {
    console.log('\n❌ 失敗したソース:');
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
    console.log('🎯 AI Navi 日本語ソースバージョンテストデータ生成');
    console.log('='.repeat(60));
    console.log('バージョン001, 002, 003, 099, 999のFILEとLINKタイプの');
    console.log('日本語テストソースを作成します。');
    console.log('='.repeat(60) + '\n');
    
    await addJapaneseSourcesWithVersions();
    
    console.log('\n✨ 日本語バージョンテストデータの作成が完了しました！');
    console.log('💡 verify-sources.jsスクリプトでデータを確認できます。');
    process.exit(0);
  } catch (error) {
    console.error('💥 予期しないエラー:', error);
    process.exit(1);
  }
}

// 스크립트 실행
if (require.main === module) {
  main();
}

module.exports = { addJapaneseSourcesWithVersions };