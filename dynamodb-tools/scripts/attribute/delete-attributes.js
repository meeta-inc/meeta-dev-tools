/**
 * Attributes 테이블 데이터 삭제 스크립트
 * 
 * 사용법:
 * node scripts/attribute/delete-attributes.js --clientId RS000001
 * node scripts/attribute/delete-attributes.js --all  # 모든 데이터 삭제 (주의!)
 * 
 * 환경 변수:
 * - NODE_ENV: development | staging | production (기본값: development)
 * - AWS_PROFILE: AWS 프로파일 (기본값: meeta-ai-navi-dev)
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand, DeleteCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');

// 환경 설정
const ENV = process.env.NODE_ENV || 'development';
const AWS_REGION = process.env.AWS_REGION || 'ap-northeast-1';
const TABLE_NAME = ENV === 'development' ? 'ai-navi-attributes-dev' : 
                   ENV === 'staging' ? 'ai-navi-attributes-stg' : 
                   'ai-navi-attributes';

// 명령행 인자 파싱
const args = process.argv.slice(2);
const clientIdIndex = args.indexOf('--clientId');
const deleteAll = args.includes('--all');
const clientId = clientIdIndex !== -1 ? args[clientIdIndex + 1] : null;

// DynamoDB 클라이언트 설정
const client = new DynamoDBClient({
  region: AWS_REGION,
  ...(process.env.AWS_PROFILE && { profile: process.env.AWS_PROFILE })
});

const docClient = DynamoDBDocumentClient.from(client);

/**
 * 특정 클라이언트의 모든 속성 조회
 */
async function getAttributesByClient(clientId) {
  const params = {
    TableName: TABLE_NAME,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: {
      ':pk': `CLIENT#${clientId}`,
      ':sk': 'ATTRIBUTE#'
    }
  };

  try {
    const result = await docClient.send(new QueryCommand(params));
    return result.Items || [];
  } catch (error) {
    console.error('속성 조회 실패:', error);
    return [];
  }
}

/**
 * 테이블의 모든 속성 조회
 */
async function getAllAttributes() {
  const params = {
    TableName: TABLE_NAME,
    FilterExpression: 'begins_with(SK, :sk)',
    ExpressionAttributeValues: {
      ':sk': 'ATTRIBUTE#'
    }
  };

  try {
    const result = await docClient.send(new ScanCommand(params));
    return result.Items || [];
  } catch (error) {
    console.error('전체 속성 조회 실패:', error);
    return [];
  }
}

/**
 * 속성 삭제
 */
async function deleteAttribute(item) {
  const params = {
    TableName: TABLE_NAME,
    Key: {
      PK: item.PK,
      SK: item.SK
    }
  };

  try {
    await docClient.send(new DeleteCommand(params));
    console.log(`✅ 삭제 성공: ${item.attributeName} (${item.attributeId})`);
    return true;
  } catch (error) {
    console.error(`❌ 삭제 실패: ${item.attributeName}`, error.message);
    return false;
  }
}

/**
 * 사용자 확인 프롬프트
 */
async function confirmDeletion(message) {
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => {
    readline.question(message, answer => {
      readline.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

/**
 * 메인 실행 함수
 */
async function main() {
  console.log('\n=========================================');
  console.log('AI-Navi Attributes 데이터 삭제');
  console.log('=========================================\n');
  console.log(`환경: ${ENV}`);
  console.log(`테이블: ${TABLE_NAME}`);
  console.log(`리전: ${AWS_REGION}\n`);

  // Production 환경 경고
  if (ENV === 'production') {
    console.log('⚠️  경고: Production 환경입니다!');
    const confirm = await confirmDeletion('정말로 계속하시겠습니까? (y/N): ');
    if (!confirm) {
      console.log('작업이 취소되었습니다.');
      process.exit(0);
    }
  }

  let itemsToDelete = [];

  // 삭제할 항목 결정
  if (deleteAll) {
    console.log('📌 모든 속성 데이터를 조회합니다...');
    itemsToDelete = await getAllAttributes();
  } else if (clientId) {
    console.log(`📌 클라이언트 ${clientId}의 속성을 조회합니다...`);
    itemsToDelete = await getAttributesByClient(clientId);
  } else {
    console.log('❌ 옵션을 지정해주세요: --clientId <ID> 또는 --all');
    console.log('예시: node scripts/attribute/delete-attributes.js --clientId RS000001');
    process.exit(1);
  }

  if (itemsToDelete.length === 0) {
    console.log('삭제할 속성이 없습니다.');
    return;
  }

  // 삭제할 항목 표시
  console.log(`\n삭제할 속성 수: ${itemsToDelete.length}개\n`);
  itemsToDelete.forEach(item => {
    console.log(`  - ${item.attributeName} (${item.attributeId}) [${item.attributeGroup}]`);
  });

  // 최종 확인
  const confirm = await confirmDeletion('\n정말로 이 속성들을 삭제하시겠습니까? (y/N): ');
  if (!confirm) {
    console.log('작업이 취소되었습니다.');
    return;
  }

  // 삭제 실행
  console.log('\n삭제를 시작합니다...\n');
  let successCount = 0;
  let failCount = 0;

  for (const item of itemsToDelete) {
    const success = await deleteAttribute(item);
    if (success) successCount++;
    else failCount++;
  }

  // 결과 요약
  console.log('\n=========================================');
  console.log('삭제 결과 요약');
  console.log('=========================================');
  console.log(`✅ 성공: ${successCount}개`);
  console.log(`❌ 실패: ${failCount}개`);
  console.log('\n삭제 작업이 완료되었습니다.\n');
}

// 에러 처리와 함께 실행
main()
  .catch(console.error)
  .finally(() => process.exit(0));