/**
 * 한국어 테스트 데이터만 삭제하는 스크립트
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');

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

// 삭제할 한국어 테스트 데이터 ID 목록
const koreanTestDataIds = [
  'src_file_001_942ef384',
  'src_file_002_1f3a3ffb',
  'src_file_003_7cc61b46',
  'src_file_099_3cf8d061',
  'src_file_999_369db026',
  'src_link_001_defd1c9c',
  'src_link_002_0ae7043a',
  'src_link_003_45cbade4',
  'src_link_099_f1886c98',
  'src_link_999_100831d2',
  'src_multi_version_377e062c'
];

async function deleteKoreanTestData() {
  console.log(`🗑️  한국어 테스트 데이터 삭제 시작`);
  console.log(`Table: ${TABLE_NAME}`);
  console.log('---');
  
  let deletedCount = 0;
  let failedCount = 0;
  
  for (const sourceId of koreanTestDataIds) {
    try {
      await docClient.send(new DeleteCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: 'CLIENT#RS000001',
          SK: `SOURCE#${sourceId}`
        }
      }));
      
      console.log(`✅ Deleted: ${sourceId}`);
      deletedCount++;
    } catch (error) {
      console.error(`❌ Failed to delete ${sourceId}: ${error.message}`);
      failedCount++;
    }
  }
  
  console.log('\n---');
  console.log(`📊 삭제 결과:`);
  console.log(`   ✅ 성공: ${deletedCount}개`);
  console.log(`   ❌ 실패: ${failedCount}개`);
  
  return { deletedCount, failedCount };
}

async function main() {
  try {
    await deleteKoreanTestData();
    console.log('\n✨ 한국어 테스트 데이터 삭제 완료!');
    process.exit(0);
  } catch (error) {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { deleteKoreanTestData };