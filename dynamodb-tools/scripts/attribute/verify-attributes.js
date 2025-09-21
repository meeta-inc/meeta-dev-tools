/**
 * Attributes 테이블 데이터 조회 및 검증 스크립트
 * 
 * 사용법:
 * node scripts/attribute/verify-attributes.js
 * 
 * 환경 변수:
 * - NODE_ENV: development | staging | production (기본값: development)
 * - AWS_PROFILE: AWS 프로파일 (기본값: meeta-ai-navi-dev)
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');

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
 * 그룹별 속성 조회 (GSI1 사용)
 */
async function getAttributesByGroup(group) {
  const params = {
    TableName: TABLE_NAME,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk',
    ExpressionAttributeValues: {
      ':pk': `GROUP#${group}`
    }
  };

  try {
    const result = await docClient.send(new QueryCommand(params));
    return result.Items || [];
  } catch (error) {
    console.error('그룹별 속성 조회 실패:', error);
    return [];
  }
}

/**
 * 속성 정보 출력
 */
function displayAttribute(attr) {
  console.log(`\n📋 ${attr.attributeName} (${attr.attributeId})`);
  console.log(`   그룹: ${attr.attributeGroup}`);
  console.log(`   아이콘: ${attr.attributeIcon?.value || 'N/A'}`);
  console.log(`   우선순위: ${attr.priority}`);
  console.log(`   상태: ${attr.status}`);
  
  if (attr.subAttributes && attr.subAttributes.length > 0) {
    console.log(`   서브 속성:`);
    attr.subAttributes.forEach(sub => {
      console.log(`     - ${sub.name} (${sub.id})`);
    });
  }
}

/**
 * 메인 실행 함수
 */
async function main() {
  console.log('\n=========================================');
  console.log('AI-Navi Attributes 데이터 조회');
  console.log('=========================================\n');
  console.log(`환경: ${ENV}`);
  console.log(`테이블: ${TABLE_NAME}`);
  console.log(`리전: ${AWS_REGION}\n`);

  // 1. 클라이언트별 속성 조회
  console.log('\n📌 클라이언트 RS000001의 속성 조회');
  console.log('─'.repeat(40));
  
  const clientAttributes = await getAttributesByClient('RS000001');
  console.log(`\n총 ${clientAttributes.length}개의 속성을 찾았습니다.`);
  
  // 그룹별로 분류
  const groupedAttributes = {};
  clientAttributes.forEach(attr => {
    const group = attr.attributeGroup;
    if (!groupedAttributes[group]) {
      groupedAttributes[group] = [];
    }
    groupedAttributes[group].push(attr);
  });

  // 그룹별로 출력
  for (const [group, attrs] of Object.entries(groupedAttributes)) {
    console.log(`\n🏷️  ${group} 그룹 (${attrs.length}개)`);
    console.log('─'.repeat(30));
    
    // 우선순위로 정렬
    attrs.sort((a, b) => a.priority - b.priority);
    attrs.forEach(displayAttribute);
  }

  // 2. GSI1을 사용한 학년 그룹 조회
  console.log('\n\n📌 학년(grade) 그룹 속성 조회 (GSI1 사용)');
  console.log('─'.repeat(40));
  
  const gradeAttributes = await getAttributesByGroup('grade');
  console.log(`\n총 ${gradeAttributes.length}개의 학년 속성을 찾았습니다.`);
  
  gradeAttributes.forEach(displayAttribute);

  // 3. 데이터 검증
  console.log('\n\n✅ 데이터 검증');
  console.log('─'.repeat(40));
  
  let validationErrors = [];
  
  clientAttributes.forEach(attr => {
    // 필수 필드 검증
    if (!attr.attributeId) validationErrors.push(`${attr.SK}: attributeId 누락`);
    if (!attr.attributeName) validationErrors.push(`${attr.SK}: attributeName 누락`);
    if (!attr.attributeGroup) validationErrors.push(`${attr.SK}: attributeGroup 누락`);
    if (!attr.priority) validationErrors.push(`${attr.SK}: priority 누락`);
    if (!attr.status) validationErrors.push(`${attr.SK}: status 누락`);
    
    // GSI 키 검증
    if (!attr.GSI1PK) validationErrors.push(`${attr.SK}: GSI1PK 누락`);
    if (!attr.GSI1SK) validationErrors.push(`${attr.SK}: GSI1SK 누락`);
    if (!attr.GSI2PK) validationErrors.push(`${attr.SK}: GSI2PK 누락`);
    if (!attr.GSI2SK) validationErrors.push(`${attr.SK}: GSI2SK 누락`);
    if (!attr.GSI3PK) validationErrors.push(`${attr.SK}: GSI3PK 누락`);
    if (!attr.GSI3SK) validationErrors.push(`${attr.SK}: GSI3SK 누락`);
  });
  
  if (validationErrors.length === 0) {
    console.log('\n✅ 모든 속성이 올바른 형식입니다.');
  } else {
    console.log('\n⚠️  검증 오류:');
    validationErrors.forEach(error => console.log(`   - ${error}`));
  }

  console.log('\n=========================================');
  console.log('조회 완료');
  console.log('=========================================\n');
}

// 에러 처리와 함께 실행
main().catch(console.error);