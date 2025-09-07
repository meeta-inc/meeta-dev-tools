/**
 * FreeConversationHistory 테이블 데이터 삭제 스크립트
 * 
 * 사용법:
 * node scripts/conversation/delete-conversations.js [--all] [--client=RS000001] [--date=2025-08-26]
 * 
 * 옵션:
 * --all: 모든 대화 기록 삭제 (주의!)
 * --client=<clientId>: 특정 클라이언트의 대화만 삭제
 * --date=<YYYY-MM-DD>: 특정 날짜의 대화만 삭제
 * 
 * 환경 변수:
 * - NODE_ENV: development | staging | production (기본값: development)
 * - AWS_PROFILE: AWS 프로파일 (기본값: meeta-ai-navi-dev)
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const readline = require('readline');

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
 * 클라이언트별 대화 조회
 */
async function getConversationsByClient(clientId) {
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
 * 날짜별 대화 조회
 */
async function getConversationsByDate(clientId, date) {
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
 * 대화 기록 삭제
 */
async function deleteConversation(conversation) {
  try {
    await docClient.send(new DeleteCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: conversation.PK,
        SK: conversation.SK
      }
    }));

    return true;
  } catch (error) {
    console.error(`❌ Error deleting conversation ${conversation.conversationId}: ${error.message}`);
    return false;
  }
}

/**
 * 삭제 프로세스 실행
 */
async function deleteConversations(options) {
  console.log(`🗑️  Starting delete process for table: ${TABLE_NAME}`);
  console.log(`Environment: ${ENV}`);
  console.log(`Region: ${AWS_REGION}`);
  console.log('---');

  let conversations = [];
  
  if (options.all) {
    // 모든 대화 조회 (RS000001 기본)
    conversations = await getConversationsByClient('RS000001');
    console.log(`📋 Found ${conversations.length} conversations to delete (ALL)`);
  } else if (options.date && options.client) {
    // 특정 클라이언트의 특정 날짜 대화 조회
    conversations = await getConversationsByDate(options.client, options.date);
    console.log(`📋 Found ${conversations.length} conversations for client ${options.client} on ${options.date}`);
  } else if (options.client) {
    // 특정 클라이언트의 모든 대화 조회
    conversations = await getConversationsByClient(options.client);
    console.log(`📋 Found ${conversations.length} conversations for client ${options.client}`);
  } else {
    console.log('❌ Please specify --all, --client=<clientId>, or --date=<YYYY-MM-DD>');
    return { deleted: 0, failed: 0 };
  }

  if (conversations.length === 0) {
    console.log('ℹ️  No conversations found to delete');
    return { deleted: 0, failed: 0 };
  }

  // 삭제할 대화 목록 표시
  console.log('\n📝 Conversations to be deleted:');
  console.log(`   Total: ${conversations.length} conversations`);
  
  // 처음 5개만 표시
  conversations.slice(0, 5).forEach(conv => {
    console.log(`   - ${conv.conversationId}: ${conv.question?.substring(0, 40)}...`);
  });
  
  if (conversations.length > 5) {
    console.log(`   ... and ${conversations.length - 5} more`);
  }

  // 통계 표시
  const categories = {};
  conversations.forEach(conv => {
    const cat = conv.category || 'uncategorized';
    categories[cat] = (categories[cat] || 0) + 1;
  });
  
  console.log('\n📊 By Category:');
  Object.entries(categories).forEach(([cat, count]) => {
    console.log(`   - ${cat}: ${count} conversations`);
  });

  // 확인 프롬프트
  const confirmed = await confirmAction(`\n⚠️  Are you sure you want to DELETE ${conversations.length} conversations?`);

  if (!confirmed) {
    console.log('❌ Delete operation cancelled');
    return { deleted: 0, failed: 0 };
  }

  // 삭제 실행
  const results = {
    deleted: 0,
    failed: 0
  };

  console.log(`\n🚀 Starting deletion process...`);
  
  for (const conversation of conversations) {
    const success = await deleteConversation(conversation);

    if (success) {
      console.log(`✅ Deleted: ${conversation.conversationId}`);
      results.deleted++;
    } else {
      console.log(`❌ Failed: ${conversation.conversationId}`);
      results.failed++;
    }
  }

  // 결과 요약
  console.log('\n---');
  console.log('📊 Delete Results:');
  console.log(`   ✅ Deleted: ${results.deleted} conversations`);
  console.log(`   ❌ Failed: ${results.failed} conversations`);

  return results;
}

/**
 * CLI 인자 파싱
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    all: false,
    client: null,
    date: null
  };

  args.forEach(arg => {
    if (arg === '--all') {
      options.all = true;
    } else if (arg.startsWith('--client=')) {
      options.client = arg.split('=')[1];
    } else if (arg.startsWith('--date=')) {
      options.date = arg.split('=')[1];
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
    
    if (!options.all && !options.client && !options.date) {
      console.log('Usage: node delete-conversations.js [options]');
      console.log('Options:');
      console.log('  --all: Delete all conversations');
      console.log('  --client=RS000001: Delete conversations for specific client');
      console.log('  --date=2025-08-26: Delete conversations for specific date');
      console.log('  --client=RS000001 --date=2025-08-26: Delete specific client\'s conversations on specific date');
      process.exit(1);
    }

    await deleteConversations(options);
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

module.exports = { deleteConversations };