/**
 * Attributes 테이블에 데이터 추가 스크립트
 * 
 * 사용법:
 * node scripts/attribute/add-attributes.js
 * 
 * 환경 변수:
 * - NODE_ENV: development | staging | production (기본값: development)
 * - AWS_PROFILE: AWS 프로파일 (기본값: meeta-ai-navi-dev)
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');

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

// 학년(grade) 그룹 속성 데이터
const gradeAttributes = [
  {
    attributeId: 'preschool',
    clientId: 'RS000001',
    attributeGroup: 'grade',
    attributeName: '幼児',
    attributeIcon: {
      type: 'emoji',
      value: '🐣'
    },
    subAttributes: [
      { id: '3years', name: '3歳', order: 1 },
      { id: '4years', name: '4歳', order: 2 },
      { id: '5years', name: '5歳', order: 3 }
    ],
    priority: 1,
    status: 'ACTIVE'
  },
  {
    attributeId: 'elementary',
    clientId: 'RS000001',
    attributeGroup: 'grade',
    attributeName: '小学生',
    attributeIcon: {
      type: 'emoji',
      value: '👦'
    },
    subAttributes: [
      { id: 'sho1', name: '小1', order: 1 },
      { id: 'sho2', name: '小2', order: 2 },
      { id: 'sho3', name: '小3', order: 3 },
      { id: 'sho4', name: '小4', order: 4 },
      { id: 'sho5', name: '小5', order: 5 },
      { id: 'sho6', name: '小6', order: 6 }
    ],
    priority: 2,
    status: 'ACTIVE'
  },
  {
    attributeId: 'middle',
    clientId: 'RS000001',
    attributeGroup: 'grade',
    attributeName: '中学生',
    attributeIcon: {
      type: 'emoji',
      value: '🧑‍🎓'
    },
    subAttributes: [
      { id: 'chu1', name: '中1', order: 1 },
      { id: 'chu2', name: '中2', order: 2 },
      { id: 'chu3', name: '中3', order: 3 }
    ],
    priority: 3,
    status: 'ACTIVE'
  },
  {
    attributeId: 'high',
    clientId: 'RS000001',
    attributeGroup: 'grade',
    attributeName: '高校生',
    attributeIcon: {
      type: 'emoji',
      value: '👩‍🎓'
    },
    subAttributes: [
      { id: 'kou1', name: '高1', order: 1 },
      { id: 'kou2', name: '高2', order: 2 },
      { id: 'kou3', name: '高3', order: 3 }
    ],
    priority: 4,
    status: 'ACTIVE'
  }
];

// 과목(subject) 그룹 속성 데이터
const subjectAttributes = [
  {
    attributeId: 'math',
    clientId: 'RS000001',
    attributeGroup: 'subject',
    attributeName: '数学',
    attributeIcon: {
      type: 'emoji',
      value: '🔢'
    },
    subAttributes: [],
    priority: 1,
    status: 'ACTIVE'
  },
  {
    attributeId: 'english',
    clientId: 'RS000001',
    attributeGroup: 'subject',
    attributeName: '英語',
    attributeIcon: {
      type: 'emoji',
      value: '🔤'
    },
    subAttributes: [],
    priority: 2,
    status: 'ACTIVE'
  },
  {
    attributeId: 'japanese',
    clientId: 'RS000001',
    attributeGroup: 'subject',
    attributeName: '国語',
    attributeIcon: {
      type: 'emoji',
      value: '📖'
    },
    subAttributes: [],
    priority: 3,
    status: 'ACTIVE'
  },
  {
    attributeId: 'science',
    clientId: 'RS000001',
    attributeGroup: 'subject',
    attributeName: '理科',
    attributeIcon: {
      type: 'emoji',
      value: '🔬'
    },
    subAttributes: [],
    priority: 4,
    status: 'ACTIVE'
  },
  {
    attributeId: 'social_studies',
    clientId: 'RS000001',
    attributeGroup: 'subject',
    attributeName: '社会',
    attributeIcon: {
      type: 'emoji',
      value: '🌏'
    },
    subAttributes: [],
    priority: 5,
    status: 'ACTIVE'
  }
];

// 코스(course) 그룹 속성 데이터
const courseAttributes = [
  {
    attributeId: 'basic',
    clientId: 'RS000001',
    attributeGroup: 'course',
    attributeName: '基礎コース',
    attributeIcon: {
      type: 'emoji',
      value: '🌱'
    },
    subAttributes: [],
    priority: 1,
    status: 'ACTIVE'
  },
  {
    attributeId: 'standard',
    clientId: 'RS000001',
    attributeGroup: 'course',
    attributeName: '標準コース',
    attributeIcon: {
      type: 'emoji',
      value: '📚'
    },
    subAttributes: [],
    priority: 2,
    status: 'ACTIVE'
  },
  {
    attributeId: 'advanced',
    clientId: 'RS000001',
    attributeGroup: 'course',
    attributeName: '発展コース',
    attributeIcon: {
      type: 'emoji',
      value: '🚀'
    },
    subAttributes: [],
    priority: 3,
    status: 'ACTIVE'
  }
];

// 모든 속성 데이터 합치기
const allAttributes = [...gradeAttributes, ...subjectAttributes, ...courseAttributes];

/**
 * DynamoDB에 속성 추가
 */
async function addAttribute(attribute) {
  const now = new Date().toISOString();
  
  const item = {
    // Primary Keys
    PK: `CLIENT#${attribute.clientId}`,
    SK: `ATTRIBUTE#${attribute.attributeId}`,
    
    // 기본 정보
    attributeId: attribute.attributeId,
    clientId: attribute.clientId,
    attributeGroup: attribute.attributeGroup,
    attributeName: attribute.attributeName,
    attributeIcon: attribute.attributeIcon,
    subAttributes: attribute.subAttributes,
    priority: attribute.priority,
    status: attribute.status,
    
    // GSI Keys
    GSI1PK: `GROUP#${attribute.attributeGroup}`,
    GSI1SK: `PRIORITY#${String(attribute.priority).padStart(3, '0')}#ATTRIBUTE#${attribute.attributeId}`,
    GSI2PK: `STATUS#${attribute.status}`,
    GSI2SK: `CLIENT#${attribute.clientId}#GROUP#${attribute.attributeGroup}`,
    GSI3PK: `CLIENT#${attribute.clientId}#STATUS#${attribute.status}`,
    GSI3SK: `GROUP#${attribute.attributeGroup}#NAME#${attribute.attributeName}`,
    
    // 메타데이터
    createdAt: now,
    createdBy: 'admin@example.com',
    updatedAt: now,
    updatedBy: 'admin@example.com'
  };

  const params = {
    TableName: TABLE_NAME,
    Item: item,
    ConditionExpression: 'attribute_not_exists(PK) AND attribute_not_exists(SK)'
  };

  try {
    await docClient.send(new PutCommand(params));
    console.log(`✅ 추가 성공: ${attribute.attributeName} (${attribute.attributeId})`);
    return { success: true, attribute: attribute.attributeName };
  } catch (error) {
    if (error.name === 'ConditionalCheckFailedException') {
      console.log(`⚠️  이미 존재: ${attribute.attributeName} (${attribute.attributeId})`);
      return { success: false, attribute: attribute.attributeName, reason: 'already_exists' };
    } else {
      console.error(`❌ 추가 실패: ${attribute.attributeName}`, error.message);
      return { success: false, attribute: attribute.attributeName, error: error.message };
    }
  }
}

/**
 * 메인 실행 함수
 */
async function main() {
  console.log('\n=========================================');
  console.log('AI-Navi Attributes 데이터 추가 시작');
  console.log('=========================================\n');
  console.log(`환경: ${ENV}`);
  console.log(`테이블: ${TABLE_NAME}`);
  console.log(`리전: ${AWS_REGION}`);
  console.log(`추가할 속성 수: ${allAttributes.length}개\n`);

  const results = {
    success: [],
    failed: [],
    skipped: []
  };

  // 속성 추가 실행
  for (const attribute of allAttributes) {
    const result = await addAttribute(attribute);
    if (result.success) {
      results.success.push(result.attribute);
    } else if (result.reason === 'already_exists') {
      results.skipped.push(result.attribute);
    } else {
      results.failed.push(result.attribute);
    }
  }

  // 결과 요약 출력
  console.log('\n=========================================');
  console.log('실행 결과 요약');
  console.log('=========================================\n');
  console.log(`✅ 성공: ${results.success.length}개`);
  if (results.success.length > 0) {
    results.success.forEach(name => console.log(`   - ${name}`));
  }
  
  console.log(`\n⚠️  건너뜀: ${results.skipped.length}개 (이미 존재)`);
  if (results.skipped.length > 0) {
    results.skipped.forEach(name => console.log(`   - ${name}`));
  }
  
  console.log(`\n❌ 실패: ${results.failed.length}개`);
  if (results.failed.length > 0) {
    results.failed.forEach(name => console.log(`   - ${name}`));
  }

  console.log('\n=========================================');
  console.log('속성 추가 완료');
  console.log('=========================================\n');
}

// 에러 처리와 함께 실행
main().catch(console.error);