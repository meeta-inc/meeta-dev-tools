/**
 * grade 그룹 이외의 속성 삭제 스크립트
 * subject와 course 그룹 속성들을 삭제합니다
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');

// 환경 설정
const ENV = process.env.NODE_ENV || 'development';
const AWS_REGION = process.env.AWS_REGION || 'ap-northeast-1';
const TABLE_NAME = ENV === 'development' ? 'ai-navi-attributes-dev' : 
                   ENV === 'staging' ? 'ai-navi-attributes-stg' : 
                   'ai-navi-attributes';

// DynamoDB 클라이언트 설정
const client = new DynamoDBClient({
  region: AWS_REGION,
  ...(process.env.AWS_PROFILE && { profile: process.env.AWS_PROFILE })
});

const docClient = DynamoDBDocumentClient.from(client);

/**
 * subject와 course 그룹 속성 조회
 */
async function getNonGradeAttributes() {
  const params = {
    TableName: TABLE_NAME,
    FilterExpression: 'begins_with(SK, :sk) AND (attributeGroup = :subject OR attributeGroup = :course)',
    ExpressionAttributeValues: {
      ':sk': 'ATTRIBUTE#',
      ':subject': 'subject',
      ':course': 'course'
    }
  };

  try {
    const result = await docClient.send(new ScanCommand(params));
    return result.Items || [];
  } catch (error) {
    console.error('속성 조회 실패:', error);
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
    console.log(`✅ 삭제 성공: ${item.attributeName} (${item.attributeId}) [${item.attributeGroup}]`);
    return true;
  } catch (error) {
    console.error(`❌ 삭제 실패: ${item.attributeName}`, error.message);
    return false;
  }
}

/**
 * 메인 실행 함수
 */
async function main() {
  console.log('\n=========================================');
  console.log('Subject와 Course 속성 삭제');
  console.log('=========================================\n');
  console.log(`환경: ${ENV}`);
  console.log(`테이블: ${TABLE_NAME}`);
  console.log(`리전: ${AWS_REGION}\n`);

  console.log('📌 subject와 course 그룹 속성을 조회합니다...');
  const itemsToDelete = await getNonGradeAttributes();

  if (itemsToDelete.length === 0) {
    console.log('삭제할 속성이 없습니다.');
    return;
  }

  // 삭제할 항목 표시
  console.log(`\n삭제할 속성 수: ${itemsToDelete.length}개\n`);
  
  // 그룹별로 분류
  const grouped = {};
  itemsToDelete.forEach(item => {
    if (!grouped[item.attributeGroup]) {
      grouped[item.attributeGroup] = [];
    }
    grouped[item.attributeGroup].push(item);
  });

  for (const [group, items] of Object.entries(grouped)) {
    console.log(`\n${group} 그룹 (${items.length}개):`);
    items.forEach(item => {
      console.log(`  - ${item.attributeName} (${item.attributeId})`);
    });
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