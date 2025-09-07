/**
 * FreeConversationHistory 테이블 데이터 시딩 스크립트 (Notion 정확한 스키마)
 * 
 * Notion 스키마:
 * - conversationId: 대화 ID
 * - clientId: 클라이언트 ID  
 * - targetAttribute: 타겟 속성 (User_S, User_P, 幼児 등)
 * - question: 질문
 * - mainBubble: 메인 답변
 * - subBubble: 추가 설명
 * - ctaBubble: CTA 메시지
 * - attachments: 첨부 파일
 * - referenceSources: 참조 소스
 * - accuracy: 정확도
 * - timestamp: 타임스탬프
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');

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

// Notion 정확한 스키마에 맞춘 초기 대화 데이터
const initialConversations = [
  {
    conversationId: 'FAQ202508270001',
    clientId: 'RS000001',
    targetAttribute: 'User_S',
    question: '私たちの塾に開設された講義を知りたいです',
    mainBubble: '平岡スクールでは、小学生・中学生・高校生向けにさまざまな講義が開設されています。',
    subBubble: '🏫 主な講義・コース\n・自分専用の最適カリキュラムで学ぶコース\n・新入試対策「思考力・表現力講座」\n・無料の自習スペースと個別サポート\n\n🎓 通塾実績校\n・小学生：平岡中央小、平岡小、平岡南小、西の里小、大曲東小、北野台小\n・中学生：平岡中央中、平岡中、北野台中\n・高校生：札幌啓成高、市立札幌清田高、札幌白石高、札幌平岡高 ほか',
    ctaBubble: '気になる講義や体験授業については、お気軽にお問い合わせください。資料請求も受け付けています。',
    attachments: [],
    referenceSources: [],
    accuracy: 0.95,
    timestamp: new Date().toISOString(),
    createdBy: 'system@meeta.ai',
    updatedBy: 'system@meeta.ai'
  },
  {
    conversationId: 'FAQ202508270002',
    clientId: 'RS000001',
    targetAttribute: 'User_S',
    question: '英語の授業を受けたいのですが、どのような講義があるか教えてください',
    mainBubble: '3.14 communityでは、Leptonプログラムを通じて「聞く・話す・読む・書く」の4技能をバランスよく学べる英語授業を提供しています。',
    subBubble: '🏫 プログラム内容\n・CD音声に沿って主体的に学習\n・専任チューターによる個別チェック\n・ネイティブとの会話で実践的な英語力を養成\n\n🎓 学習教材レベル\n・STARTER（入門）: 英語をはじめて学ぶ方向け\n・BASIC（初級）: 学習歴半年〜1年程度\n・INTERMEDIATE（中級）: 学習歴1年〜2年程度\n・ADVANCED（上級）: 学習歴3年程度\n\n🕒 カリキュラム\n・通いたい曜日や時間を選択可能\n・週2回または週3回コースあり',
    ctaBubble: 'ご興味がありましたら、無料体験や資料請求もできますので、お気軽にお問い合わせください。',
    attachments: [],
    referenceSources: [],
    accuracy: 0.97,
    timestamp: new Date().toISOString(),
    createdBy: 'system@meeta.ai',
    updatedBy: 'system@meeta.ai'
  },
  {
    conversationId: 'FAQ202508270003',
    clientId: 'RS000001',
    targetAttribute: '幼児',
    question: '何歳から通えますか？',
    mainBubble: '3.14コミュニティでは、年少（満3歳）頃から通っていただけます。',
    subBubble: '遊びの中で思考力・集中力・ことばの力を育てる「脳力開発コース」をご用意しています🏃‍♀️',
    ctaBubble: 'まずは見学や体験でお子さまのご様子をご確認いただけます😊',
    attachments: [
      {
        type: 'image',
        url: 'https://meeta-ai-navi.s3.ap-northeast-1.amazonaws.com/image/original/3181ff5f-f1a5-480d-b4b0-a101699e4a97.png',
        title: '',
        description: '',
        thumbnail: 'https://meeta-ai-navi.s3.ap-northeast-1.amazonaws.com/image/original/3181ff5f-f1a5-480d-b4b0-a101699e4a97.png'
      }
    ],
    referenceSources: [],
    accuracy: 0.99,
    timestamp: new Date().toISOString(),
    createdBy: 'system@meeta.ai',
    updatedBy: 'system@meeta.ai'
  }
];

/**
 * タイムスタンプから日付と時刻を抽出
 */
function extractDateTime(timestamp) {
  const date = new Date(timestamp);
  const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
  const timeStr = date.toISOString().split('T')[1].split('.')[0]; // HH:mm:ss
  const yearMonth = dateStr.substring(0, 7); // YYYY-MM
  const day = dateStr.substring(8, 10); // DD
  
  return { dateStr, timeStr, yearMonth, day };
}

/**
 * Conversation History データを DynamoDB に挿入
 */
async function seedConversations() {
  console.log(`🚀 Starting to seed conversations to table: ${TABLE_NAME}`);
  console.log(`Environment: ${ENV}`);
  console.log(`Region: ${AWS_REGION}`);
  console.log('---');

  const results = {
    success: [],
    failed: []
  };

  for (const conversation of initialConversations) {
    try {
      const now = new Date().toISOString();
      const { dateStr, timeStr, yearMonth, day } = extractDateTime(conversation.timestamp);
      
      // DynamoDB Item 構成 (Notion 정확한 스키마)
      const item = {
        // Primary Keys
        PK: `CLIENT#${conversation.clientId}`,
        SK: `CONV#${conversation.conversationId}`,
        
        // GSI Keys
        GSI1PK: `CLIENT#${conversation.clientId}#DATE#${dateStr}`,
        GSI1SK: `TIME#${timeStr}#CONV#${conversation.conversationId}`,
        GSI2PK: `CLIENT#${conversation.clientId}#ATTR#${conversation.targetAttribute}`,
        GSI2SK: `TIMESTAMP#${conversation.timestamp}`,
        GSI3PK: `YEARMONTH#${yearMonth}`,
        GSI3SK: `CLIENT#${conversation.clientId}#DAY#${day}#TIME#${timeStr}`,
        
        // Core Attributes (Notion 정확한 스키마)
        conversationId: conversation.conversationId,
        clientId: conversation.clientId,
        targetAttribute: conversation.targetAttribute,
        question: conversation.question,
        mainBubble: conversation.mainBubble,
        subBubble: conversation.subBubble,
        ctaBubble: conversation.ctaBubble,
        attachments: conversation.attachments,
        referenceSources: conversation.referenceSources,
        accuracy: conversation.accuracy,
        timestamp: conversation.timestamp,
        
        // Metadata
        createdAt: conversation.timestamp,
        updatedAt: now,
        createdBy: conversation.createdBy,
        updatedBy: conversation.updatedBy
      };

      // 90일 TTL 설정
      const ttlDate = new Date(conversation.timestamp);
      ttlDate.setDate(ttlDate.getDate() + 90);
      item.ttl = Math.floor(ttlDate.getTime() / 1000);

      // DynamoDB에 저장
      await docClient.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: item
      }));

      console.log(`✅ Successfully seeded: ${conversation.conversationId}`);
      console.log(`   Target: ${conversation.targetAttribute}`);
      console.log(`   Question: ${conversation.question.substring(0, 30)}...`);
      console.log(`   Accuracy: ${(conversation.accuracy * 100).toFixed(0)}%`);
      results.success.push(conversation.conversationId);

    } catch (error) {
      console.error(`❌ Failed to seed: ${conversation.conversationId}`);
      console.error(`   Error: ${error.message}`);
      results.failed.push({ id: conversation.conversationId, error: error.message });
    }
  }

  // 결과 요약
  console.log('\n---');
  console.log('📊 Seeding Results:');
  console.log(`   ✅ Success: ${results.success.length} conversations`);
  console.log(`   ❌ Failed: ${results.failed.length} conversations`);

  if (results.success.length > 0) {
    console.log('\n✅ Successfully seeded conversations:');
    results.success.forEach(id => {
      console.log(`   - ${id}`);
    });
  }

  if (results.failed.length > 0) {
    console.log('\n❌ Failed conversations:');
    results.failed.forEach(({ id, error }) => {
      console.log(`   - ${id}: ${error}`);
    });
  }

  return results;
}

/**
 * 메인 실행 함수
 */
async function main() {
  try {
    await seedConversations();
    console.log('\n✨ Seeding process completed!');
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

module.exports = { seedConversations };