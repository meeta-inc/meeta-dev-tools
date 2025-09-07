/**
 * FreeConversationHistory 테이블 데이터 시딩 스크립트 (Notion 스키마 준수)
 * 
 * Notion 스키마 기반:
 * - conversationId: 대화 ID
 * - clientId: 클라이언트 ID  
 * - targetAttribute: 타겟 속성
 * - userId: 사용자 ID
 * - category: 카테고리
 * - question: 질문
 * - answer: 답변 (mainBubble, subBubble, ctaBubble 통합)
 * - references: 참조 정보 (attachments, sources)
 * - feedback: 피드백 정보
 * - metadata: 메타데이터 (timestamp, response time 등)
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');

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

// Notion 스키마에 맞춘 초기 대화 데이터
const initialConversations = [
  {
    conversationId: `CONV_${Date.now()}_001`,
    clientId: 'RS000001',
    targetAttribute: 'User_S',
    userId: 'test_user_001',
    category: 'enrollment',
    question: '私たちの塾に開設された講義を知りたいです',
    answer: {
      main: '平岡スクールでは、小学生・中学生・高校生向けにさまざまな講義が開設されています。',
      detail: '主な講義・コース:\n• 自分専用の最適カリキュラムで学ぶコース\n• 新入試対策「思考力・表現力講座」\n• 無料の自習スペースと個別サポート',
      action: '気になる講義や体験授業については、お気軽にお問い合わせください。'
    },
    references: {
      sources: [
        {
          sourceId: '46d2ed6f-6c69-4edb-860c-f1bef78bd1e0',
          type: 'FILE',
          name: 'rensei_pamplet.pdf'
        }
      ],
      attachments: []
    },
    feedback: {
      rating: null,
      comment: null,
      helpful: null
    },
    metadata: {
      timestamp: new Date().toISOString(),
      responseTime: 2156,
      model: 'gpt-4',
      tokenUsage: {
        prompt: 125,
        completion: 89,
        total: 214
      }
    }
  },
  {
    conversationId: `CONV_${Date.now()}_002`,
    clientId: 'RS000001',
    targetAttribute: 'User_S',
    userId: 'test_user_002',
    category: 'curriculum',
    question: '英語の授業を受けたいのですが、どのような講義があるか教えてください',
    answer: {
      main: '3.14 communityでは、Leptonプログラムを通じて「聞く・話す・読む・書く」の4技能をバランスよく学べる英語授業を提供しています。',
      detail: 'プログラム内容:\n• CD音声に沿って主体的に学習\n• 専任チューターによる個別チェック\n• ネイティブとの会話で実践的な英語力を養成\n\n学習教材レベル:\n• STARTER（入門）\n• BASIC（初級）\n• INTERMEDIATE（中級）\n• ADVANCED（上級）',
      action: '無料体験や資料請求もできますので、お気軽にお問い合わせください。'
    },
    references: {
      sources: [
        {
          sourceId: 'cc8cc44e-18fd-4cc6-add6-ad620491bf7c',
          type: 'LINK',
          name: '3.14ホームページ'
        }
      ],
      attachments: []
    },
    feedback: {
      rating: 5,
      comment: '詳しい説明でよくわかりました',
      helpful: true
    },
    metadata: {
      timestamp: new Date().toISOString(),
      responseTime: 1892,
      model: 'gpt-4',
      tokenUsage: {
        prompt: 98,
        completion: 112,
        total: 210
      }
    }
  },
  {
    conversationId: `CONV_${Date.now()}_003`,
    clientId: 'RS000001',
    targetAttribute: 'User_P',
    userId: 'parent_user_001',
    category: 'admission',
    question: '何歳から通えますか？',
    answer: {
      main: '3.14コミュニティでは、年少（満3歳）頃から通っていただけます。',
      detail: '遊びの中で思考力・集中力・ことばの力を育てる「脳力開発コース」をご用意しています。お子さまの発達段階に合わせた最適なプログラムを提供いたします。',
      action: 'まずは見学や体験でお子さまのご様子をご確認いただけます。お気軽にご相談ください。'
    },
    references: {
      sources: [
        {
          sourceId: '46d2ed6f-6c69-4edb-860c-f1bef78bd1e0',
          type: 'FILE',
          name: 'rensei_pamplet.pdf'
        }
      ],
      attachments: [
        {
          type: 'IMAGE',
          url: 'https://meeta-ai-navi.s3.ap-northeast-1.amazonaws.com/images/brain-development-course.jpg',
          caption: '脳力開発コースの様子'
        }
      ]
    },
    feedback: {
      rating: null,
      comment: null,
      helpful: null
    },
    metadata: {
      timestamp: new Date().toISOString(),
      responseTime: 987,
      model: 'gpt-4',
      tokenUsage: {
        prompt: 67,
        completion: 78,
        total: 145
      }
    }
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
      const { dateStr, timeStr, yearMonth, day } = extractDateTime(conversation.metadata.timestamp);
      
      // DynamoDB Item 構成 (Notion スキ마に準拠)
      const item = {
        // Primary Keys
        PK: `CLIENT#${conversation.clientId}`,
        SK: `CONV#${conversation.conversationId}`,
        
        // GSI Keys (検索用)
        GSI1PK: `CLIENT#${conversation.clientId}#DATE#${dateStr}`,
        GSI1SK: `TIME#${timeStr}#CONV#${conversation.conversationId}`,
        GSI2PK: `CLIENT#${conversation.clientId}#ATTR#${conversation.targetAttribute}`,
        GSI2SK: `TIMESTAMP#${conversation.metadata.timestamp}`,
        GSI3PK: `YEARMONTH#${yearMonth}`,
        GSI3SK: `CLIENT#${conversation.clientId}#DAY#${day}#TIME#${timeStr}`,
        
        // Core Attributes (Notion 스키마)
        conversationId: conversation.conversationId,
        clientId: conversation.clientId,
        targetAttribute: conversation.targetAttribute,
        userId: conversation.userId,
        category: conversation.category,
        question: conversation.question,
        answer: conversation.answer,
        references: conversation.references,
        feedback: conversation.feedback,
        metadata: conversation.metadata,
        
        // System Metadata
        createdAt: conversation.metadata.timestamp,
        updatedAt: new Date().toISOString(),
        version: '1.0.0'
      };

      // 90일 TTL 설정
      const ttlDate = new Date(conversation.metadata.timestamp);
      ttlDate.setDate(ttlDate.getDate() + 90);
      item.ttl = Math.floor(ttlDate.getTime() / 1000);

      // DynamoDB에 저장
      await docClient.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: item
      }));

      console.log(`✅ Successfully seeded: ${conversation.conversationId}`);
      console.log(`   Category: ${conversation.category}`);
      console.log(`   Question: ${conversation.question.substring(0, 30)}...`);
      console.log(`   Response Time: ${conversation.metadata.responseTime}ms`);
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