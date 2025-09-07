/**
 * 학년별 대화 데이터 생성 - 각 학년별 고유 ID 체계 사용
 * FAQ 데이터 구조와 동일한 형식
 * 
 * ID 체계:
 * - 幼児: Y001-Y030
 * - 小学生: E001-E030  
 * - 中学生: M001-M030
 * - 高校生: H001-H030
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');

// 환경 설정
const ENV = process.env.NODE_ENV || 'dev';
const AWS_REGION = process.env.AWS_REGION || 'ap-northeast-1';
const TABLE_NAME = `ai-navi-conversation-history-${ENV}`;

// DynamoDB 클라이언트 설정
const client = new DynamoDBClient({
  region: AWS_REGION,
  ...(process.env.AWS_PROFILE && { profile: process.env.AWS_PROFILE })
});

const docClient = DynamoDBDocumentClient.from(client);

// 학년별 ID 프리픽스
const ID_PREFIXES = {
  '幼児': 'Y',
  '小学生': 'E',
  '中学生': 'M',
  '高校生': 'H'
};

// 학원 관련 일본어 질문 템플릿
const questionTemplates = {
  schedule: [
    '授業のスケジュールを変更したいのですが',
    '変更可能な時間はいつですか？',
    '水曜日の午前9時に変更したいです。',
    '授業時間と曜日は決まっていますか？',
    '午後の時間に変更できますか？'
  ],
  absence: [
    '体調が悪くて病院に行かないといけないので、遅れそうです',
    '今日は体調が良くないので、お休みしなければならないと思います',
    '今日は家に用事があって、お休みしなければならないと思います',
    '明日の授業を欠席します',
    '風邪で休みたいです'
  ],
  withdrawal: [
    '塾を辞めたいのですが、別途手続きが必要ですか？',
    '塾を辞めたいのですが、いつまでに申請すればよいですか？',
    '塾を辞めたい場合、電話で申請してもいいですか？',
    '今月末まで塾に通って辞めたいです。退会手続きの案内をお願いします。',
    '進学先の学校が決まったので、来月まで授業を受けて退会したいです。'
  ],
  payment: [
    '授業料の入金方法を案内してください',
    '銀行から振込をしても大丈夫ですか？',
    'インターネットバンキングで振込してもいいですか？',
    '毎月の自動振替日はいつですか？',
    '授業料は前払い制ですか？',
    '今月の授業料はいくらですか？',
    '授業料の領収書発行方法を案内してください'
  ],
  curriculum: [
    '塾のカリキュラムはどのようになっていますか？',
    '開設されている授業の案内をお願いします',
    'クレファスはどのようなプログラムですか？',
    'レプトンはどのようなプログラムですか？',
    'パズル道場はどのようなプログラムですか？',
    'ゼロはどのような授業ですか？'
  ],
  online: [
    'もしかして、オンラインで授業を受けることはできますか？',
    'Zoomで授業に参加できますか？',
    'オンライン授業の設定方法を教えてください',
    'オンライン授業の料金は同じですか？'
  ],
  teacher: [
    'どのような先生が教えてくださいますか？',
    '先生は何名の生徒を指導していますか？',
    '実際にはネイティブの先生が教えてくれる授業ですか？',
    '先生の資格について教えてください'
  ],
  facility: [
    '自習スペースはありますか？また、利用する場合は有料ですか？',
    'わからない部分の質問などはできますか？',
    '教室の設備について教えてください',
    '駐車場はありますか？'
  ],
  admission: [
    '成績があまり良くないのですが、入会テストはありますか？',
    '年度途中からの入会は可能ですか？',
    '体験授業はありますか？',
    '入会金について教えてください'
  ],
  other: [
    '私の成績が分析された内容を知りたいです',
    '私に合ったおすすめの講義を案内してください',
    '受講申込方法を案内してください',
    'どのような授業を受けるとよいか総合的に相談したいです'
  ]
};

// 응답 테ン플레이트 생성 함수
function generateResponse(category, targetAttribute, accuracy) {
  const isLowAccuracy = accuracy < 0.8;
  
  let mainBubble, subBubble, ctaBubble;
  
  // 연령대별 응답 스타일 조정
  if (targetAttribute === '幼児') {
    mainBubble = isLowAccuracy ? 
      '申し訳ございません。詳細は確認が必要です。' :
      'お子様に最適なプログラムをご用意しています。';
    subBubble = isLowAccuracy ?
      '担当者にお繋ぎします。' :
      '楽しく学べる環境を提供しています。';
    ctaBubble = 'お気軽にお問い合わせください。';
  } else if (targetAttribute === '小学生') {
    mainBubble = isLowAccuracy ?
      'ご質問について確認いたします。' :
      '小学生向けの充実したカリキュラムがあります。';
    subBubble = isLowAccuracy ?
      '詳しい情報をお調べします。' :
      '基礎から応用まで段階的に学習できます。';
    ctaBubble = '詳細はお問い合わせください。';
  } else if (targetAttribute === '中学生') {
    mainBubble = isLowAccuracy ?
      'お問い合わせ内容を確認中です。' :
      '中学生の学習ニーズに対応しています。';
    subBubble = isLowAccuracy ?
      '正確な情報をご案内します。' :
      '定期テスト対策も万全です。';
    ctaBubble = 'ご相談をお待ちしています。';
  } else {
    mainBubble = isLowAccuracy ?
      'ご質問を承りました。' :
      '高校生向けの進学指導を行っています。';
    subBubble = isLowAccuracy ?
      '詳細を確認してご連絡します。' :
      '大学受験対策も充実しています。';
    ctaBubble = '無料相談も実施中です。';
  }
  
  return { mainBubble, subBubble, ctaBubble };
}

// 참조 소스 생성 함수
function generateReferenceSources(category, accuracy) {
  const sources = [];
  
  // 고정확도일 때 더 많은 참조 소스
  const sourceCount = accuracy >= 0.8 ? Math.floor(Math.random() * 3) + 1 : Math.floor(Math.random() * 2);
  
  const possibleSources = {
    schedule: [
      { type: 'FAQ', id: 'FAQ001', title: '授業スケジュール変更について' },
      { type: 'DOC', id: 'DOC_SCHEDULE', title: '時間割ガイドライン' },
      { type: 'POLICY', id: 'POL_SCHEDULE', title: 'スケジュール変更規定' }
    ],
    absence: [
      { type: 'FAQ', id: 'FAQ002', title: '欠席・遅刻の手続き' },
      { type: 'RULE', id: 'RULE_ABSENCE', title: '出席管理規則' },
      { type: 'DOC', id: 'DOC_ABSENCE', title: '欠席届フォーム' }
    ],
    withdrawal: [
      { type: 'FAQ', id: 'FAQ003', title: '退会手続きについて' },
      { type: 'POLICY', id: 'POL_WITHDRAW', title: '退会規定' },
      { type: 'DOC', id: 'DOC_WITHDRAW', title: '退会申請書' }
    ],
    payment: [
      { type: 'FAQ', id: 'FAQ004', title: '授業料のお支払い方法' },
      { type: 'DOC', id: 'DOC_PAYMENT', title: '料金表' },
      { type: 'GUIDE', id: 'GUIDE_PAYMENT', title: '振込ガイド' }
    ],
    curriculum: [
      { type: 'CATALOG', id: 'CAT_COURSE', title: 'コースカタログ' },
      { type: 'DOC', id: 'DOC_CREFUS', title: 'クレファスプログラム詳細' },
      { type: 'DOC', id: 'DOC_LEPTON', title: 'レプトン英語プログラム' }
    ],
    online: [
      { type: 'GUIDE', id: 'GUIDE_ONLINE', title: 'オンライン授業ガイド' },
      { type: 'FAQ', id: 'FAQ005', title: 'Zoom接続方法' },
      { type: 'DOC', id: 'DOC_ONLINE', title: 'オンライン授業規定' }
    ],
    teacher: [
      { type: 'PROFILE', id: 'PROF_TEACHER', title: '講師プロフィール' },
      { type: 'DOC', id: 'DOC_QUAL', title: '講師資格基準' }
    ],
    facility: [
      { type: 'GUIDE', id: 'GUIDE_FACILITY', title: '施設利用ガイド' },
      { type: 'DOC', id: 'DOC_STUDY_ROOM', title: '自習室利用規則' }
    ],
    admission: [
      { type: 'FAQ', id: 'FAQ006', title: '入会手続きについて' },
      { type: 'DOC', id: 'DOC_ADMISSION', title: '入会案内' },
      { type: 'GUIDE', id: 'GUIDE_TRIAL', title: '体験授業ガイド' }
    ],
    other: [
      { type: 'DOC', id: 'DOC_GENERAL', title: '総合案内' },
      { type: 'FAQ', id: 'FAQ007', title: 'よくある質問' }
    ]
  };
  
  const categorySource = possibleSources[category] || possibleSources.other;
  for (let i = 0; i < sourceCount && i < categorySource.length; i++) {
    sources.push(categorySource[i]);
  }
  
  return sources;
}

// 첨부파일 생성 함수
function generateAttachments(category, accuracy) {
  const attachments = [];
  
  // 20% 확률로 첨부파일 추가 (고정확도일 때 더 높은 확률)
  const hasAttachment = Math.random() < (accuracy >= 0.8 ? 0.3 : 0.1);
  
  if (hasAttachment) {
    const possibleAttachments = {
      schedule: [
        { type: 'PDF', url: 'https://example.com/schedule.pdf', name: '時間割表.pdf', size: 524288 }
      ],
      payment: [
        { type: 'PDF', url: 'https://example.com/payment-guide.pdf', name: '振込案内.pdf', size: 312456 },
        { type: 'EXCEL', url: 'https://example.com/fee-table.xlsx', name: '料金表.xlsx', size: 45678 }
      ],
      curriculum: [
        { type: 'PDF', url: 'https://example.com/course-catalog.pdf', name: 'コースカタログ.pdf', size: 2097152 }
      ],
      admission: [
        { type: 'DOC', url: 'https://example.com/admission-form.docx', name: '入会申込書.docx', size: 87654 }
      ],
      withdrawal: [
        { type: 'PDF', url: 'https://example.com/withdrawal-form.pdf', name: '退会届.pdf', size: 123456 }
      ]
    };
    
    const categoryAttachments = possibleAttachments[category];
    if (categoryAttachments && categoryAttachments.length > 0) {
      attachments.push(categoryAttachments[Math.floor(Math.random() * categoryAttachments.length)]);
    }
  }
  
  return attachments;
}

// 타임스탬프 추출 함수
function extractDateTime(timestamp) {
  const date = new Date(timestamp);
  const dateStr = date.toISOString().split('T')[0];
  const timeStr = date.toISOString().split('T')[1].split('.')[0];
  const yearMonth = dateStr.substring(0, 7);
  const day = dateStr.substring(8, 10);
  
  return { dateStr, timeStr, yearMonth, day };
}

// 학년별 데이터 생성 함수
function generateGradeData(targetAttribute, baseTimeOffset) {
  const conversations = [];
  const categories = Object.keys(questionTemplates);
  const prefix = ID_PREFIXES[targetAttribute];
  const lowAccuracyCount = 20; // 각 학년당 20개의 저정확도 데이터
  
  for (let i = 0; i < 30; i++) {
    // 고유 ID 생성 (Y001, E001, M001, H001 형식)
    const conversationId = `CONV2025${prefix}${String(i + 1).padStart(3, '0')}`;
    
    // 정확도 설정
    const isLowAccuracy = i < lowAccuracyCount;
    const accuracy = isLowAccuracy ? 
      0.65 + Math.random() * 0.14 : // 0.65 ~ 0.79
      0.80 + Math.random() * 0.20;  // 0.80 ~ 1.00
    
    // 카테고리와 질문 선택
    const categoryIndex = i % categories.length;
    const category = categories[categoryIndex];
    const questions = questionTemplates[category];
    const question = questions[i % questions.length];
    
    // 응답 생성
    const { mainBubble, subBubble, ctaBubble } = generateResponse(category, targetAttribute, accuracy);
    
    // 각 아이템마다 완전히 고유한 타임스탬프 생성 (분 단위로 차이)
    const totalMinutes = baseTimeOffset + i * 10; // 각 아이템마다 10분 차이
    const hours = 9 + Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const seconds = i % 60; // 0-59 초
    const milliseconds = i * 33; // 각 아이템마다 33ms 차이 (0-990)
    const timestamp = new Date(2025, 0, 7, hours, minutes, seconds, milliseconds).toISOString();
    
    conversations.push({
      conversationId,
      clientId: 'RS000001',
      targetAttribute,
      question,
      mainBubble,
      subBubble,
      ctaBubble,
      timestamp,
      attachments: generateAttachments(category, accuracy),
      referenceSources: generateReferenceSources(category, accuracy),
      accuracy: parseFloat(accuracy.toFixed(2))
    });
  }
  
  return conversations;
}

// 학년별 데이터 삽입 및 검증 함수
async function insertAndVerifyGrade(targetAttribute, conversations) {
  console.log(`\n📚 Processing ${targetAttribute} (${conversations.length} items)`);
  console.log('=' .repeat(50));
  
  const results = {
    success: [],
    failed: []
  };
  
  // 데이터 삽입
  for (const conversation of conversations) {
    try {
      const now = new Date().toISOString();
      const { dateStr, timeStr, yearMonth, day } = extractDateTime(conversation.timestamp);
      
      // DynamoDB Item 구성 (GSI 복원)
      const item = {
        // Primary Keys
        PK: `CLIENT#${conversation.clientId}`,
        SK: `CONV#${conversation.conversationId}`,
        
        // GSI Keys (conversationId 포함으로 중복 방지)
        GSI1PK: `CLIENT#${conversation.clientId}`,
        GSI1SK: `CONV#${conversation.conversationId}`,
        GSI2PK: `CLIENT#${conversation.clientId}#ATTR#${conversation.targetAttribute}`,
        GSI2SK: `CONV#${conversation.conversationId}`,
        
        // Conversation Attributes
        conversationId: conversation.conversationId,
        clientId: conversation.clientId,
        targetAttribute: conversation.targetAttribute,
        question: conversation.question,
        mainBubble: conversation.mainBubble,
        subBubble: conversation.subBubble,
        ctaBubble: conversation.ctaBubble,
        
        // Response Data
        timestamp: conversation.timestamp,
        
        // References
        attachments: conversation.attachments,
        referenceSources: conversation.referenceSources,
        accuracy: conversation.accuracy,
        
        // Metadata
        createdAt: conversation.timestamp,
        createdBy: 'system@meeta.ai',
        updatedAt: now,
        updatedBy: 'system@meeta.ai'
      };

      // TTL 설정 제거 (문제 해결 후 다시 추가)
      // const ttlDate = new Date(conversation.timestamp);
      // ttlDate.setDate(ttlDate.getDate() + 90);
      // item.ttl = Math.floor(ttlDate.getTime() / 1000);

      // DynamoDB에 저장
      const putResponse = await docClient.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: item
      }));

      console.log(`✅ ${conversation.conversationId} (accuracy: ${conversation.accuracy})`);
      console.log(`   Response: ${JSON.stringify(putResponse.$metadata.httpStatusCode)}`);
      results.success.push(conversation.conversationId);
      
      // 1초 지연 추가 (안정적인 저장을 위해)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`❌ Failed: ${conversation.conversationId} - ${error.message}`);
      results.failed.push({ id: conversation.conversationId, error: error.message });
    }
  }
  
  // 검증 전 3초 대기 (DynamoDB eventual consistency)
  console.log(`\n⏳ Waiting 3 seconds for DynamoDB consistency...`);
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // 검증 - GSI2로 조회
  console.log(`🔍 Verifying ${targetAttribute} data...`);
  try {
    const queryCommand = new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI2',
      KeyConditionExpression: 'GSI2PK = :pk',
      ExpressionAttributeValues: {
        ':pk': `CLIENT#RS000001#ATTR#${targetAttribute}`
      }
    });
    
    const response = await docClient.send(queryCommand);
    const itemCount = response.Items?.length || 0;
    const lowAccuracyCount = response.Items?.filter(item => item.accuracy < 0.8).length || 0;
    
    console.log(`✅ Verification Results for ${targetAttribute}:`);
    console.log(`   - Total in DB: ${itemCount} / 30`);
    console.log(`   - Low Accuracy: ${lowAccuracyCount} / 20+`);
    console.log(`   - Insert Success: ${results.success.length}`);
    console.log(`   - Insert Failed: ${results.failed.length}`);
    
    if (itemCount !== 30) {
      console.log(`⚠️  Warning: Expected 30 items but found ${itemCount}`);
    }
    
  } catch (error) {
    console.error(`❌ Verification failed: ${error.message}`);
  }
  
  return results;
}

// 메인 실행 함수
async function main() {
  console.log(`🚀 Starting grade-by-grade seeding to table: ${TABLE_NAME}`);
  console.log(`Environment: ${ENV}`);
  console.log(`Region: ${AWS_REGION}`);
  console.log('ID Schemes:');
  console.log('  - 幼児: Y001-Y030');
  console.log('  - 小学生: E001-E030');
  console.log('  - 中学生: M001-M030');
  console.log('  - 高校生: H001-H030');
  
  try {
    const allResults = {
      '幼児': null,
      '小学生': null,
      '中学生': null,
      '高校生': null
    };
    
    // 각 학년별로 데이터 생성, 삽입, 검증 (시간 간격을 더 크게)
    allResults['幼児'] = await insertAndVerifyGrade('幼児', generateGradeData('幼児', 0));      // 09:00부터
    allResults['小学生'] = await insertAndVerifyGrade('小学生', generateGradeData('小学生', 300));  // 14:00부터  
    allResults['中学生'] = await insertAndVerifyGrade('中学生', generateGradeData('中学生', 600));  // 19:00부터
    allResults['高校生'] = await insertAndVerifyGrade('高校生', generateGradeData('高校生', 900));  // 24:00(다음날 0시)부터
    
    // 전체 결과 요약
    console.log('\n' + '='.repeat(50));
    console.log('📊 FINAL SUMMARY');
    console.log('='.repeat(50));
    
    let totalSuccess = 0;
    let totalFailed = 0;
    
    Object.entries(allResults).forEach(([grade, result]) => {
      if (result) {
        console.log(`${grade}: ✅ ${result.success.length} / ❌ ${result.failed.length}`);
        totalSuccess += result.success.length;
        totalFailed += result.failed.length;
      }
    });
    
    console.log('-'.repeat(50));
    console.log(`TOTAL: ✅ ${totalSuccess} / ❌ ${totalFailed} (Expected: 120)`);
    
    if (totalSuccess === 120) {
      console.log('\n🎉 All 120 conversations successfully inserted!');
    } else {
      console.log(`\n⚠️  Only ${totalSuccess} out of 120 conversations were inserted.`);
    }
    
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

module.exports = { insertAndVerifyGrade, generateGradeData };