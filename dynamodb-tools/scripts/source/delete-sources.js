/**
 * Source 테이블 데이터 삭제 스크립트
 * 
 * 사용법:
 * node scripts/source/delete-sources.js [--all] [--client=RS000001]
 * 
 * 옵션:
 * --all: 모든 Source 삭제 (주의!)
 * --client=<clientId>: 특정 클라이언트의 Source만 삭제
 * 
 * 환경 변수:
 * - NODE_ENV: development | staging | production (기본값: development)
 * - AWS_PROFILE: AWS 프로파일 (기본값: meeta-ai-navi-dev)
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand, DeleteCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const readline = require('readline');

// 환경 설정
const ENV = process.env.NODE_ENV || 'development';
const AWS_REGION = process.env.AWS_REGION || 'ap-northeast-1';
const TABLE_NAME = `ai-navi-sources-${ENV}`;

// DynamoDB 클라이언트 설정
const client = new DynamoDBClient({
  region: AWS_REGION,
  ...(process.env.AWS_PROFILE && { profile: process.env.AWS_PROFILE })
});

const docClient = DynamoDBDocumentClient.from(client);

// CLI 인터페이스 설정
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * 사용자 확인 프롬프트
 */
function confirmAction(message) {
  return new Promise((resolve) => {
    rl.question(`${message} (yes/no): `, (answer) => {
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

/**
 * 특정 클라이언트의 모든 Source 조회
 */
async function getSourcesByClient(clientId) {
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
 * Source 소프트 삭제 (아카이브)
 */
async function archiveSource(source) {
  const now = new Date();
  const ttl = Math.floor(now.getTime() / 1000) + (90 * 24 * 60 * 60); // 90일 후

  try {
    await docClient.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: source.PK,
        SK: source.SK
      },
      UpdateExpression: `
        SET #status = :archived,
            archivedAt = :now,
            archivedBy = :user,
            #ttl = :ttl,
            GSI1PK = :gsi1pk,
            GSI3SK = :gsi3sk
      `,
      ExpressionAttributeNames: {
        '#status': 'status',
        '#ttl': 'ttl'
      },
      ExpressionAttributeValues: {
        ':archived': 'ARCHIVED',
        ':now': now.toISOString(),
        ':user': 'system',
        ':ttl': ttl,
        ':gsi1pk': 'STATUS#ARCHIVED',
        ':gsi3sk': `STATUS#ARCHIVED#NAME#${source.name}`
      }
    }));

    return true;
  } catch (error) {
    console.error(`❌ Error archiving source ${source.name}: ${error.message}`);
    return false;
  }
}

/**
 * Source 하드 삭제
 */
async function deleteSource(source) {
  try {
    await docClient.send(new DeleteCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: source.PK,
        SK: source.SK
      }
    }));

    return true;
  } catch (error) {
    console.error(`❌ Error deleting source ${source.name}: ${error.message}`);
    return false;
  }
}

/**
 * 삭제 프로세스 실행
 */
async function deleteSources(options) {
  console.log(`🗑️  Starting delete process for table: ${TABLE_NAME}`);
  console.log(`Environment: ${ENV}`);
  console.log(`Region: ${AWS_REGION}`);
  console.log('---');

  let sources = [];
  
  if (options.all) {
    // 모든 Source 조회 (RS000001 기본)
    sources = await getSourcesByClient('RS000001');
    console.log(`📋 Found ${sources.length} sources to delete`);
  } else if (options.client) {
    // 특정 클라이언트의 Source 조회
    sources = await getSourcesByClient(options.client);
    console.log(`📋 Found ${sources.length} sources for client ${options.client}`);
  } else {
    console.log('❌ Please specify --all or --client=<clientId>');
    return { deleted: 0, failed: 0 };
  }

  if (sources.length === 0) {
    console.log('ℹ️  No sources found to delete');
    return { deleted: 0, failed: 0 };
  }

  // 삭제할 Source 목록 표시
  console.log('\n📝 Sources to be deleted:');
  sources.forEach(source => {
    console.log(`   - ${source.name} (${source.sourceType}) - ${source.status}`);
  });

  // 확인 프롬프트
  const useHardDelete = await confirmAction('\n⚠️  Use hard delete? (No = soft delete/archive)');
  const confirmed = await confirmAction(`\n⚠️  Are you sure you want to ${useHardDelete ? 'PERMANENTLY DELETE' : 'archive'} ${sources.length} sources?`);

  if (!confirmed) {
    console.log('❌ Delete operation cancelled');
    return { deleted: 0, failed: 0 };
  }

  // 삭제 실행
  const results = {
    deleted: 0,
    failed: 0
  };

  console.log(`\n🚀 Starting ${useHardDelete ? 'deletion' : 'archival'} process...`);
  
  for (const source of sources) {
    const success = useHardDelete 
      ? await deleteSource(source)
      : await archiveSource(source);

    if (success) {
      console.log(`✅ ${useHardDelete ? 'Deleted' : 'Archived'}: ${source.name}`);
      results.deleted++;
    } else {
      console.log(`❌ Failed: ${source.name}`);
      results.failed++;
    }
  }

  // 결과 요약
  console.log('\n---');
  console.log('📊 Delete Results:');
  console.log(`   ✅ ${useHardDelete ? 'Deleted' : 'Archived'}: ${results.deleted} sources`);
  console.log(`   ❌ Failed: ${results.failed} sources`);

  return results;
}

/**
 * CLI 인자 파싱
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    all: false,
    client: null
  };

  args.forEach(arg => {
    if (arg === '--all') {
      options.all = true;
    } else if (arg.startsWith('--client=')) {
      options.client = arg.split('=')[1];
    }
  });

  return options;
}

/**
 * 메인 실행 함수
 */
async function main() {
  try {
    const options = parseArgs();
    
    if (!options.all && !options.client) {
      console.log('Usage: node delete-sources.js [--all] [--client=<clientId>]');
      console.log('  --all: Delete all sources');
      console.log('  --client=RS000001: Delete sources for specific client');
      process.exit(1);
    }

    await deleteSources(options);
    console.log('\n✨ Delete process completed!');
    
  } catch (error) {
    console.error('💥 Unexpected error:', error);
  } finally {
    rl.close();
    process.exit(0);
  }
}

// 스크립트 실행
if (require.main === module) {
  main();
}

module.exports = { deleteSources };