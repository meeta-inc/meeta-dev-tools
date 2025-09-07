/**
 * FreeConversationHistory 테이블 초기 데이터 시딩 스크립트
 * 
 * 사용법:
 * node scripts/conversation/seed-conversations.js
 * 
 * 환경 변수:
 * - NODE_ENV: development | staging | production (기본값: development)
 * - AWS_PROFILE: AWS 프로파일 (기본값: meeta-ai-navi-dev)
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

// 초기 대화 데이터 - 각 targetAttribute별로 30개, accuracy < 0.8인 데이터 20개 이상 포함
const initialConversations = [
  // ========== 幼児 (유아) 데이터 30개 (저정확도 20개) ==========
  {
    conversationId: 'CONV202501070001',
    clientId: 'RS000001',
    targetAttribute: '幼児',
    userId: 'user_y001',
    category: 'schedule',
    question: '授業のスケジュールを変更したいのですが',
    mainBubble: '授業スケジュールの変更は、教室にて承っております。',
    subBubble: '変更希望の日時をお知らせいただければ、空き状況を確認いたします。',
    ctaBubble: 'お電話またはメールでお問い合わせください。',
    timestamp: '2025-01-07T09:00:00.000Z',
    responseTime: 2100,
    statusCode: 200,
    success: true,
    attachments: [],
    referenceSources: [],
    accuracy: 0.75  // Low accuracy
  },
  {
    conversationId: 'CONV202501070002',
    clientId: 'RS000001',
    targetAttribute: '幼児',
    userId: 'user_y002',
    category: 'schedule',
    question: '変更可能な時間はいつですか？',
    mainBubble: '平日は15時〜18時、土曜日は10時〜15時が可能です。',
    subBubble: '幼児クラスは午後の早い時間帯を中心に開講しております。',
    ctaBubble: 'ご希望の時間帯をお知らせください。',
    timestamp: '2025-01-07T09:15:00.000Z',
    responseTime: 1800,
    statusCode: 200,
    success: true,
    attachments: [],
    referenceSources: [],
    accuracy: 0.88
  },
  {
    conversationId: 'CONV202501070003',
    clientId: 'RS000001',
    targetAttribute: '幼児',
    userId: 'user_y003',
    category: 'schedule',
    question: '水曜日の午前9時に変更したいです。',
    mainBubble: '申し訳ございませんが、幼児クラスの午前9時は開講しておりません。',
    subBubble: '午後3時からのクラスはいかがでしょうか。',
    ctaBubble: '他の時間帯もご案内できますので、お問い合わせください。',
    timestamp: '2025-01-07T09:30:00.000Z',
    responseTime: 2200,
    statusCode: 200,
    success: true,
    attachments: [],
    referenceSources: [],
    accuracy: 0.72  // Low accuracy
  },
  {
    conversationId: 'CONV202501070004',
    clientId: 'RS000001',
    targetAttribute: '幼児',
    userId: 'user_y004',
    category: 'absence',
    question: '体調が悪くて病院に行かないといけないので、遅れそうです',
    mainBubble: 'お子様の体調、心配ですね。遅刻の場合は必ずご連絡ください。',
    subBubble: '授業の途中参加も可能ですが、体調を優先してください。',
    ctaBubble: '振替授業も可能ですので、ご相談ください。',
    timestamp: '2025-01-07T10:00:00.000Z',
    responseTime: 1900,
    statusCode: 200,
    success: true,
    attachments: [],
    referenceSources: [],
    accuracy: 0.91
  },
  {
    conversationId: 'CONV202501070005',
    clientId: 'RS000001',
    targetAttribute: '幼児',
    userId: 'user_y005',
    category: 'absence',
    question: '今日は体調が良くないので、お休みしなければならないと思います',
    mainBubble: 'お大事になさってください。欠席のご連絡ありがとうございます。',
    subBubble: '振替授業は2週間以内で調整可能です。',
    ctaBubble: '体調が回復されましたら、振替日をご相談ください。',
    timestamp: '2025-01-07T10:30:00.000Z',
    responseTime: 2000,
    statusCode: 200,
    success: true,
    attachments: [],
    referenceSources: [],
    accuracy: 0.78  // Low accuracy
  },
  {
    conversationId: 'CONV202501070006',
    clientId: 'RS000001',
    targetAttribute: '幼児',
    userId: 'user_y006',
    category: 'absence',
    question: '今日は家に用事があって、お休みしなければならないと思います',
    mainBubble: '承知いたしました。欠席として記録いたします。',
    subBubble: '振替授業をご希望の場合は、お早めにご連絡ください。',
    ctaBubble: '次回の授業でお待ちしております。',
    timestamp: '2025-01-07T11:00:00.000Z',
    responseTime: 1850,
    statusCode: 200,
    success: true,
    attachments: [],
    referenceSources: [],
    accuracy: 0.85
  },
  {
    conversationId: 'CONV202501070007',
    clientId: 'RS000001',
    targetAttribute: '幼児',
    userId: 'user_y007',
    category: 'online',
    question: 'もしかして、オンラインで授業を受けることはできますか？',
    mainBubble: '申し訳ございませんが、幼児クラスはオンライン対応しておりません。',
    subBubble: '幼児期は対面での指導が重要と考えております。',
    ctaBubble: '教室でお待ちしております。',
    timestamp: '2025-01-07T11:30:00.000Z',
    responseTime: 2100,
    statusCode: 200,
    success: true,
    attachments: [],
    referenceSources: [],
    accuracy: 0.68  // Low accuracy
  },
  {
    conversationId: 'CONV202501070008',
    clientId: 'RS000001',
    targetAttribute: '幼児',
    userId: 'user_y008',
    category: 'payment',
    question: '授業料の入金方法を案内してください',
    mainBubble: '授業料は銀行振込または口座振替でお支払いいただけます。',
    subBubble: '口座振替の場合、毎月27日に自動引き落としとなります。',
    ctaBubble: '詳しい手続きは事務局までお問い合わせください。',
    timestamp: '2025-01-07T12:00:00.000Z',
    responseTime: 1950,
    statusCode: 200,
    success: true,
    attachments: [],
    referenceSources: [],
    accuracy: 0.92
  },
  {
    conversationId: 'CONV202501070009',
    clientId: 'RS000001',
    targetAttribute: '幼児',
    userId: 'user_y009',
    category: 'payment',
    question: '銀行から振込をしても大丈夫ですか？',
    mainBubble: 'はい、銀行振込も可能です。振込先口座をご案内いたします。',
    subBubble: '振込手数料はお客様負担となりますのでご了承ください。',
    ctaBubble: '振込先情報は別途メールでお送りします。',
    timestamp: '2025-01-07T12:30:00.000Z',
    responseTime: 1800,
    statusCode: 200,
    success: true,
    attachments: [],
    referenceSources: [],
    accuracy: 0.89
  },
  {
    conversationId: 'CONV202501070010',
    clientId: 'RS000001',
    targetAttribute: '幼児',
    userId: 'user_y010',
    category: 'curriculum',
    question: '塾のカリキュラムはどのようになっていますか？',
    mainBubble: '幼児クラスは遊びを通じた学習カリキュラムです。',
    subBubble: '思考力、集中力、言語能力を楽しく育てます。',
    ctaBubble: '詳しいカリキュラムは資料をご覧ください。',
    timestamp: '2025-01-07T13:00:00.000Z',
    responseTime: 2050,
    statusCode: 200,
    success: true,
    attachments: [],
    referenceSources: [],
    accuracy: 0.76  // Low accuracy
  },
  {
    conversationId: 'CONV202501070011',
    clientId: 'RS000001',
    targetAttribute: '幼児',
    userId: 'user_y011',
    category: 'curriculum',
    question: 'パズル道場はどのようなプログラムですか？',
    mainBubble: 'パズル道場は、図形や論理的思考を養うプログラムです。',
    subBubble: '幼児でも楽しく取り組める内容になっています。',
    ctaBubble: '体験授業も実施しています。',
    timestamp: '2025-01-07T13:30:00.000Z',
    responseTime: 1900,
    statusCode: 200,
    success: true,
    attachments: [],
    referenceSources: [],
    accuracy: 0.87
  },
  {
    conversationId: 'CONV202501070012',
    clientId: 'RS000001',
    targetAttribute: '幼児',
    userId: 'user_y012',
    category: 'withdrawal',
    question: '塾を辞めたいのですが、別途手続きが必要ですか？',
    mainBubble: '退会には所定の手続きが必要です。',
    subBubble: '退会届の提出をお願いしております。',
    ctaBubble: '詳細は事務局までご連絡ください。',
    timestamp: '2025-01-07T14:00:00.000Z',
    responseTime: 2100,
    statusCode: 200,
    success: true,
    attachments: [],
    referenceSources: [],
    accuracy: 0.71  // Low accuracy
  },
  {
    conversationId: 'CONV202501070013',
    clientId: 'RS000001',
    targetAttribute: '幼児',
    userId: 'user_y013',
    category: 'teacher',
    question: 'どのような先生が教えてくださいますか？',
    mainBubble: '幼児教育の経験豊富な先生が担当します。',
    subBubble: '保育士資格や幼稚園教諭免許を持つ先生も在籍しています。',
    ctaBubble: '先生のプロフィールは教室でご確認いただけます。',
    timestamp: '2025-01-07T14:30:00.000Z',
    responseTime: 1850,
    statusCode: 200,
    success: true,
    attachments: [],
    referenceSources: [],
    accuracy: 0.90
  },
  {
    conversationId: 'CONV202501070014',
    clientId: 'RS000001',
    targetAttribute: '幼児',
    userId: 'user_y014',
    category: 'admission',
    question: '成績があまり良くないのですが、入会テストはありますか？',
    mainBubble: '幼児クラスには入会テストはございません。',
    subBubble: 'どなたでも安心してご入会いただけます。',
    ctaBubble: 'まずは体験授業にお越しください。',
    timestamp: '2025-01-07T15:00:00.000Z',
    responseTime: 1950,
    statusCode: 200,
    success: true,
    attachments: [],
    referenceSources: [],
    accuracy: 0.93
  },
  {
    conversationId: 'CONV202501070015',
    clientId: 'RS000001',
    targetAttribute: '幼児',
    userId: 'user_y015',
    category: 'homework',
    question: '宿題はたくさん出ますか？',
    mainBubble: '幼児クラスでは無理のない範囲で宿題を出しています。',
    subBubble: '親子で楽しく取り組める内容を中心にしています。',
    ctaBubble: '家庭学習の相談も承っております。',
    timestamp: '2025-01-07T15:30:00.000Z',
    responseTime: 2000,
    statusCode: 200,
    success: true,
    attachments: [],
    referenceSources: [],
    accuracy: 0.73  // Low accuracy
  },

  // ========== 小学生 データ 15個 ==========
  {
    conversationId: 'CONV202501070016',
    clientId: 'RS000001',
    targetAttribute: '小学生',
    userId: 'user_e001',
    category: 'schedule',
    question: '授業のスケジュールを変更したいのですが',
    mainBubble: '小学生クラスのスケジュール変更を承ります。',
    subBubble: '変更希望日の1週間前までにご連絡ください。',
    ctaBubble: '空き状況を確認いたしますので、お問い合わせください。',
    timestamp: '2025-01-07T09:00:00.000Z',
    responseTime: 2200,
    statusCode: 200,
    success: true,
    attachments: [],
    referenceSources: [],
    accuracy: 0.85
  },
  {
    conversationId: 'CONV202501070017',
    clientId: 'RS000001',
    targetAttribute: '小学生',
    userId: 'user_e002',
    category: 'online',
    question: 'オンラインで授業を受けることはできますか？',
    mainBubble: '小学生クラスではオンライン授業も実施しています。',
    subBubble: 'Zoomを使用した双方向授業です。',
    ctaBubble: '詳しい受講方法をご案内します。',
    timestamp: '2025-01-07T09:30:00.000Z',
    responseTime: 1900,
    statusCode: 200,
    success: true,
    attachments: [],
    referenceSources: [],
    accuracy: 0.79  // Low accuracy
  },
  {
    conversationId: 'CONV202501070018',
    clientId: 'RS000001',
    targetAttribute: '小学生',
    userId: 'user_e003',
    category: 'withdrawal',
    question: '塾を辞めたいのですが、いつまでに申請すればよいですか？',
    mainBubble: '退会は前月の20日までにお申し出ください。',
    subBubble: '当月末での退会となります。',
    ctaBubble: '退会届は教室でお渡しします。',
    timestamp: '2025-01-07T10:00:00.000Z',
    responseTime: 2100,
    statusCode: 200,
    success: true,
    attachments: [],
    referenceSources: [],
    accuracy: 0.88
  },
  {
    conversationId: 'CONV202501070019',
    clientId: 'RS000001',
    targetAttribute: '小学生',
    userId: 'user_e004',
    category: 'payment',
    question: 'インターネットバンキングで振込してもいいですか？',
    mainBubble: 'はい、インターネットバンキングでの振込も可能です。',
    subBubble: '振込人名義はお子様のお名前でお願いします。',
    ctaBubble: '振込確認後、メールでご連絡いたします。',
    timestamp: '2025-01-07T10:30:00.000Z',
    responseTime: 1850,
    statusCode: 200,
    success: true,
    attachments: [],
    referenceSources: [],
    accuracy: 0.91
  },
  {
    conversationId: 'CONV202501070020',
    clientId: 'RS000001',
    targetAttribute: '小学生',
    userId: 'user_e005',
    category: 'payment',
    question: '毎月の自動振替日はいつですか？',
    mainBubble: '毎月27日に自動振替させていただきます。',
    subBubble: '27日が土日祝日の場合は翌営業日となります。',
    ctaBubble: '残高不足にご注意ください。',
    timestamp: '2025-01-07T11:00:00.000Z',
    responseTime: 1950,
    statusCode: 200,
    success: true,
    attachments: [],
    referenceSources: [],
    accuracy: 0.74  // Low accuracy
  },
  {
    conversationId: 'CONV202501070021',
    clientId: 'RS000001',
    targetAttribute: '小学生',
    userId: 'user_e006',
    category: 'curriculum',
    question: '開設されている授業の案内をお願いします',
    mainBubble: '小学生向けに算数、国語、英語、理科、社会を開講しています。',
    subBubble: '学年別のクラス編成で、基礎から応用まで学べます。',
    ctaBubble: '無料体験授業も実施中です。',
    timestamp: '2025-01-07T11:30:00.000Z',
    responseTime: 2000,
    statusCode: 200,
    success: true,
    attachments: [],
    referenceSources: [],
    accuracy: 0.86
  },
  {
    conversationId: 'CONV202501070022',
    clientId: 'RS000001',
    targetAttribute: '小学生',
    userId: 'user_e007',
    category: 'curriculum',
    question: 'クレファスはどのようなプログラムですか？',
    mainBubble: 'クレファスはロボット製作とプログラミングを学ぶコースです。',
    subBubble: 'レゴブロックを使って楽しく学習できます。',
    ctaBubble: '小学1年生から参加可能です。',
    timestamp: '2025-01-07T12:00:00.000Z',
    responseTime: 2100,
    statusCode: 200,
    success: true,
    attachments: [],
    referenceSources: [],
    accuracy: 0.77  // Low accuracy
  },
  {
    conversationId: 'CONV202501070023',
    clientId: 'RS000001',
    targetAttribute: '小学生',
    userId: 'user_e008',
    category: 'curriculum',
    question: 'レプトンはどのようなプログラムですか？',
    mainBubble: 'レプトンは4技能を総合的に学ぶ英語プログラムです。',
    subBubble: '個別指導形式で、自分のペースで学習できます。',
    ctaBubble: 'TOEIC対策にもつながります。',
    timestamp: '2025-01-07T12:30:00.000Z',
    responseTime: 1900,
    statusCode: 200,
    success: true,
    attachments: [],
    referenceSources: [],
    accuracy: 0.92
  },
  {
    conversationId: 'CONV202501070024',
    clientId: 'RS000001',
    targetAttribute: '小学生',
    userId: 'user_e009',
    category: 'teacher',
    question: '先生は何名の生徒を指導していますか？',
    mainBubble: '1クラス最大12名までの少人数制です。',
    subBubble: '個別指導コースは1対2または1対1です。',
    ctaBubble: 'きめ細かい指導を心がけています。',
    timestamp: '2025-01-07T13:00:00.000Z',
    responseTime: 1850,
    statusCode: 200,
    success: true,
    attachments: [],
    referenceSources: [],
    accuracy: 0.70  // Low accuracy
  },
  {
    conversationId: 'CONV202501070025',
    clientId: 'RS000001',
    targetAttribute: '小学生',
    userId: 'user_e010',
    category: 'class',
    question: '1回の授業は何分ですか？また、授業の追加はできますか？',
    mainBubble: '小学生は1回50分授業です。',
    subBubble: '追加授業も可能です。別途料金となります。',
    ctaBubble: 'テスト前の追加授業も承ります。',
    timestamp: '2025-01-07T13:30:00.000Z',
    responseTime: 2050,
    statusCode: 200,
    success: true,
    attachments: [],
    referenceSources: [],
    accuracy: 0.87
  },
  {
    conversationId: 'CONV202501070026',
    clientId: 'RS000001',
    targetAttribute: '小学生',
    userId: 'user_e011',
    category: 'class',
    question: '振替授業をすることはできますか？',
    mainBubble: '前日までのご連絡で振替授業が可能です。',
    subBubble: '月2回まで振替できます。',
    ctaBubble: '振替日は相談の上決定します。',
    timestamp: '2025-01-07T14:00:00.000Z',
    responseTime: 1950,
    statusCode: 200,
    success: true,
    attachments: [],
    referenceSources: [],
    accuracy: 0.76  // Low accuracy
  },
  {
    conversationId: 'CONV202501070027',
    clientId: 'RS000001',
    targetAttribute: '小学生',
    userId: 'user_e012',
    category: 'facility',
    question: '自習スペースはありますか？また、利用する場合は有料ですか？',
    mainBubble: '自習スペースは無料でご利用いただけます。',
    subBubble: '授業のない日でも利用可能です。',
    ctaBubble: '質問対応も行っています。',
    timestamp: '2025-01-07T14:30:00.000Z',
    responseTime: 1900,
    statusCode: 200,
    success: true,
    attachments: [],
    referenceSources: [],
    accuracy: 0.89
  },
  {
    conversationId: 'CONV202501070028',
    clientId: 'RS000001',
    targetAttribute: '小学生',
    userId: 'user_e013',
    category: 'question',
    question: 'わからない部分の質問などはできますか？',
    mainBubble: 'もちろん質問は随時受け付けています。',
    subBubble: '授業前後や自習時間に対応します。',
    ctaBubble: 'LINEでの質問も可能です。',
    timestamp: '2025-01-07T15:00:00.000Z',
    responseTime: 2000,
    statusCode: 200,
    success: true,
    attachments: [],
    referenceSources: [],
    accuracy: 0.72  // Low accuracy
  },
  {
    conversationId: 'CONV202501070029',
    clientId: 'RS000001',
    targetAttribute: '小学生',
    userId: 'user_e014',
    category: 'textbook',
    question: '授業で使用する教材は自分で準備しますか？',
    mainBubble: '教材は塾でご用意いたします。',
    subBubble: '教材費は月謝に含まれています。',
    ctaBubble: '筆記用具のみご持参ください。',
    timestamp: '2025-01-07T15:30:00.000Z',
    responseTime: 1850,
    statusCode: 200,
    success: true,
    attachments: [],
    referenceSources: [],
    accuracy: 0.90
  },
  {
    conversationId: 'CONV202501070030',
    clientId: 'RS000001',
    targetAttribute: '小学生',
    userId: 'user_e015',
    category: 'admission',
    question: '年度途中からの入会は可能ですか？',
    mainBubble: 'いつからでもご入会いただけます。',
    subBubble: '個別にカリキュラムを調整いたします。',
    ctaBubble: 'まずは無料体験にお越しください。',
    timestamp: '2025-01-07T16:00:00.000Z',
    responseTime: 1950,
    statusCode: 200,
    success: true,
    attachments: [],
    referenceSources: [],
    accuracy: 0.94
  },

  // ========== 中学生 データ 15個 ==========
  {
    conversationId: 'CONV202501070031',
    clientId: 'RS000001',
    targetAttribute: '中学生',
    userId: 'user_m001',
    category: 'schedule',
    question: '体調が悪くて病院に行かないといけないので、遅れそうです',
    mainBubble: 'ご連絡ありがとうございます。お大事になさってください。',
    subBubble: '授業の録画もご用意できます。',
    ctaBubble: '無理せず、体調を優先してください。',
    timestamp: '2025-01-07T09:00:00.000Z',
    responseTime: 2100,
    statusCode: 200,
    success: true,
    attachments: [],
    referenceSources: [],
    accuracy: 0.88
  },
  {
    conversationId: 'CONV202501070032',
    clientId: 'RS000001',
    targetAttribute: '中学生',
    userId: 'user_m002',
    category: 'withdrawal',
    question: '塾を辞めたい場合、電話で申請してもいいですか？',
    mainBubble: '電話でのご連絡後、退会届の提出が必要です。',
    subBubble: '書類は郵送またはメールでお送りします。',
    ctaBubble: 'まずはお電話でご相談ください。',
    timestamp: '2025-01-07T09:30:00.000Z',
    responseTime: 1900,
    statusCode: 200,
    success: true,
    attachments: [],
    referenceSources: [],
    accuracy: 0.75  // Low accuracy
  },
  {
    conversationId: 'CONV202501070033',
    clientId: 'RS000001',
    targetAttribute: '中学生',
    userId: 'user_m003',
    category: 'withdrawal',
    question: '今月末まで塾に通って辞めたいです。退会手続きの案内をお願いします。',
    mainBubble: '退会手続きについてご案内いたします。',
    subBubble: '20日までに退会届を提出いただければ、月末退会となります。',
    ctaBubble: '詳しい手続きは事務局までお問い合わせください。',
    timestamp: '2025-01-07T10:00:00.000Z',
    responseTime: 2200,
    statusCode: 200,
    success: true,
    attachments: [],
    referenceSources: [],
    accuracy: 0.86
  },
  {
    conversationId: 'CONV202501070034',
    clientId: 'RS000001',
    targetAttribute: '中学生',
    userId: 'user_m004',
    category: 'withdrawal',
    question: '授業料が毎月自動引き落としされているのですが、今月末まで授業を受けて退会したく、自動引き落としも停止していただくことをお願いします。',
    mainBubble: '退会手続きと同時に自動引き落としも停止いたします。',
    subBubble: '最終月の授業料は日割り計算いたします。',
    ctaBubble: '退会届提出後、3営業日以内に処理いたします。',
    timestamp: '2025-01-07T10:30:00.000Z',
    responseTime: 2000,
    statusCode: 200,
    success: true,
    attachments: [],
    referenceSources: [],
    accuracy: 0.79  // Low accuracy
  },
  {
    conversationId: 'CONV202501070035',
    clientId: 'RS000001',
    targetAttribute: '中学生',
    userId: 'user_m005',
    category: 'withdrawal',
    question: '進学先の学校が決まったので、来月まで授業を受けて退会したいです。',
    mainBubble: '合格おめでとうございます！退会手続きを承ります。',
    subBubble: '最後まで全力でサポートさせていただきます。',
    ctaBubble: '進学後も応援しています。',
    timestamp: '2025-01-07T11:00:00.000Z',
    responseTime: 1850,
    statusCode: 200,
    success: true,
    attachments: [],
    referenceSources: [],
    accuracy: 0.91
  },
  {
    conversationId: 'CONV202501070036',
    clientId: 'RS000001',
    targetAttribute: '中学生',
    userId: 'user_m006',
    category: 'suspension',
    question: '入院することになったのですが、受講を停止してから後でまた再開することはできますか？',
    mainBubble: '休会制度がございます。最長3ヶ月まで可能です。',
    subBubble: '休会中の授業料はかかりません。',
    ctaBubble: '復帰時期が決まりましたらご連絡ください。',
    timestamp: '2025-01-07T11:30:00.000Z',
    responseTime: 1950,
    statusCode: 200,
    success: true,
    attachments: [],
    referenceSources: [],
    accuracy: 0.71  // Low accuracy
  },
  {
    conversationId: 'CONV202501070037',
    clientId: 'RS000001',
    targetAttribute: '中学生',
    userId: 'user_m007',
    category: 'return',
    question: '来週の水曜日に退院します。授業は木曜日から受けることができます。',
    mainBubble: '木曜日からの復帰、承知いたしました。',
    subBubble: '体調に配慮しながら授業を進めます。',
    ctaBubble: 'お待ちしております。',
    timestamp: '2025-01-07T12:00:00.000Z',
    responseTime: 2100,
    statusCode: 200,
    success: true,
    attachments: [],
    referenceSources: [],
    accuracy: 0.87
  },
  {
    conversationId: 'CONV202501070038',
    clientId: 'RS000001',
    targetAttribute: '中学生',
    userId: 'user_m008',
    category: 'transfer',
    question: '6月16日から他の塾に転校して授業を受けることはできますか？',
    mainBubble: '転校のお手続きを承ります。',
    subBubble: '成績証明書などの必要書類を発行いたします。',
    ctaBubble: '転校先でも頑張ってください。',
    timestamp: '2025-01-07T12:30:00.000Z',
    responseTime: 1900,
    statusCode: 200,
    success: true,
    attachments: [],
    referenceSources: [],
    accuracy: 0.69  // Low accuracy
  },
  {
    conversationId: 'CONV202501070039',
    clientId: 'RS000001',
    targetAttribute: '中学生',
    userId: 'user_m009',
    category: 'payment',
    question: '授業料は前払い制ですか？',
    mainBubble: 'はい、授業料は前払い制となっております。',
    subBubble: '毎月月末に翌月分をお支払いいただきます。',
    ctaBubble: '口座振替なら自動で処理されます。',
    timestamp: '2025-01-07T13:00:00.000Z',
    responseTime: 1850,
    statusCode: 200,
    success: true,
    attachments: [],
    referenceSources: [],
    accuracy: 0.90
  },
  {
    conversationId: 'CONV202501070040',
    clientId: 'RS000001',
    targetAttribute: '中学生',
    userId: 'user_m010',
    category: 'payment',
    question: '今月の授業料はいくらですか？',
    mainBubble: '中学生の月謝は科目数により異なります。',
    subBubble: '詳細は個別にご案内いたします。',
    ctaBubble: '事務局までお問い合わせください。',
    timestamp: '2025-01-07T13:30:00.000Z',
    responseTime: 2050,
    statusCode: 200,
    success: true,
    attachments: [],
    referenceSources: [],
    accuracy: 0.77  // Low accuracy
  },
  {
    conversationId: 'CONV202501070041',
    clientId: 'RS000001',
    targetAttribute: '中学生',
    userId: 'user_m011',
    category: 'payment',
    question: '授業料の領収書発行方法を案内してください',
    mainBubble: '領収書は毎月メールでお送りしています。',
    subBubble: '紙の領収書も発行可能です。',
    ctaBubble: 'ご希望の形式をお知らせください。',
    timestamp: '2025-01-07T14:00:00.000Z',
    responseTime: 1950,
    statusCode: 200,
    success: true,
    attachments: [],
    referenceSources: [],
    accuracy: 0.88
  },
  {
    conversationId: 'CONV202501070042',
    clientId: 'RS000001',
    targetAttribute: '中学生',
    userId: 'user_m012',
    category: 'test',
    question: 'どのような定期試験対策を実施していますか？',
    mainBubble: '定期試験2週間前から特別対策授業を実施します。',
    subBubble: '過去問演習や予想問題も用意しています。',
    ctaBubble: '土日の対策講座も無料です。',
    timestamp: '2025-01-07T14:30:00.000Z',
    responseTime: 1900,
    statusCode: 200,
    success: true,
    attachments: [],
    referenceSources: [],
    accuracy: 0.92
  },
  {
    conversationId: 'CONV202501070043',
    clientId: 'RS000001',
    targetAttribute: '中学生',
    userId: 'user_m013',
    category: 'school',
    question: '公立中学校と私立中学校では授業内容と進度が違いますが、対応していただけますか？',
    mainBubble: '学校別のカリキュラムに対応しています。',
    subBubble: '私立中学の進度に合わせた指導も可能です。',
    ctaBubble: '学校の教科書をお持ちください。',
    timestamp: '2025-01-07T15:00:00.000Z',
    responseTime: 2000,
    statusCode: 200,
    success: true,
    attachments: [],
    referenceSources: [],
    accuracy: 0.73  // Low accuracy
  },
  {
    conversationId: 'CONV202501070044',
    clientId: 'RS000001',
    targetAttribute: '中学生',
    userId: 'user_m014',
    category: 'homework',
    question: '宿題はたくさん出ますか？',
    mainBubble: '部活動との両立を考慮した適切な量を出しています。',
    subBubble: '1日30分〜1時間程度で終わる量です。',
    ctaBubble: '個別に調整も可能です。',
    timestamp: '2025-01-07T15:30:00.000Z',
    responseTime: 1850,
    statusCode: 200,
    success: true,
    attachments: [],
    referenceSources: [],
    accuracy: 0.89
  },
  {
    conversationId: 'CONV202501070045',
    clientId: 'RS000001',
    targetAttribute: '中学生',
    userId: 'user_m015',
    category: 'performance',
    question: '私の成績が分析された内容を知りたいです',
    mainBubble: '定期的に成績分析レポートを作成しています。',
    subBubble: '弱点分野と改善策をご提案します。',
    ctaBubble: '面談でも詳しくご説明します。',
    timestamp: '2025-01-07T16:00:00.000Z',
    responseTime: 1950,
    statusCode: 200,
    success: true,
    attachments: [],
    referenceSources: [],
    accuracy: 0.93
  },

  // ========== 高校生 データ 15個 ==========
  {
    conversationId: 'CONV202501070046',
    clientId: 'RS000001',
    targetAttribute: '高校生',
    userId: 'user_h001',
    category: 'payment',
    question: '口座振替依頼書は直接金融機関の窓口に提出してもよろしいですか？',
    mainBubble: '口座振替依頼書は塾経由でご提出ください。',
    subBubble: '塾で確認後、金融機関に提出いたします。',
    ctaBubble: '記入方法はご案内いたします。',
    timestamp: '2025-01-07T09:00:00.000Z',
    responseTime: 2100,
    statusCode: 200,
    success: true,
    attachments: [],
    referenceSources: [],
    accuracy: 0.85
  },
  {
    conversationId: 'CONV202501070047',
    clientId: 'RS000001',
    targetAttribute: '高校生',
    userId: 'user_h002',
    category: 'payment',
    question: '口座振替依頼書を提出すると、どのくらいで引き落としが開始されますか？',
    mainBubble: '通常、提出から2〜3週間で開始されます。',
    subBubble: '初回は振込でお願いする場合があります。',
    ctaBubble: '開始時期は個別にご連絡します。',
    timestamp: '2025-01-07T09:30:00.000Z',
    responseTime: 1900,
    statusCode: 200,
    success: true,
    attachments: [],
    referenceSources: [],
    accuracy: 0.78  // Low accuracy
  },
  {
    conversationId: 'CONV202501070048',
    clientId: 'RS000001',
    targetAttribute: '高校生',
    userId: 'user_h003',
    category: 'payment',
    question: '引き落とし口座を変更したいのですが、可能ですか？',
    mainBubble: '口座変更は可能です。新しい口座振替依頼書をご提出ください。',
    subBubble: '変更手続きには2週間程度かかります。',
    ctaBubble: '変更用紙は教室でお渡しします。',
    timestamp: '2025-01-07T10:00:00.000Z',
    responseTime: 2200,
    statusCode: 200,
    success: true,
    attachments: [],
    referenceSources: [],
    accuracy: 0.87
  },
  {
    conversationId: 'CONV202501070049',
    clientId: 'RS000001',
    targetAttribute: '高校生',
    userId: 'user_h004',
    category: 'payment',
    question: '授業料の支払いが遅れて、家に督促状が届きましたが、すでに支払いはしています。',
    mainBubble: '大変申し訳ございません。入金確認をいたします。',
    subBubble: '振込日と振込人名義を教えてください。',
    ctaBubble: '確認後、すぐにご連絡いたします。',
    timestamp: '2025-01-07T10:30:00.000Z',
    responseTime: 2000,
    statusCode: 200,
    success: true,
    attachments: [],
    referenceSources: [],
    accuracy: 0.76  // Low accuracy
  },
  {
    conversationId: 'CONV202501070050',
    clientId: 'RS000001',
    targetAttribute: '高校生',
    userId: 'user_h005',
    category: 'trial',
    question: '札幌練成会に通っていますが、3.14の体験は受けることができますか？',
    mainBubble: 'もちろん体験授業を受けていただけます。',
    subBubble: '他塾との比較も歓迎です。',
    ctaBubble: '無料体験のご予約をお待ちしています。',
    timestamp: '2025-01-07T11:00:00.000Z',
    responseTime: 1850,
    statusCode: 200,
    success: true,
    attachments: [],
    referenceSources: [],
    accuracy: 0.91
  },
  {
    conversationId: 'CONV202501070051',
    clientId: 'RS000001',
    targetAttribute: '高校生',
    userId: 'user_h006',
    category: 'school',
    question: '私立中学に通っています',
    mainBubble: '私立中高一貫校の生徒さんも多く在籍しています。',
    subBubble: '学校の進度に合わせた指導が可能です。',
    ctaBubble: '詳しくはご相談ください。',
    timestamp: '2025-01-07T11:30:00.000Z',
    responseTime: 1950,
    statusCode: 200,
    success: true,
    attachments: [],
    referenceSources: [],
    accuracy: 0.70  // Low accuracy
  },
  {
    conversationId: 'CONV202501070052',
    clientId: 'RS000001',
    targetAttribute: '高校生',
    userId: 'user_h007',
    category: 'curriculum',
    question: 'クレファスは週に何回通いますか？',
    mainBubble: 'クレファスは週1回90分の授業です。',
    subBubble: '土曜日または日曜日の開講となります。',
    ctaBubble: '振替も可能です。',
    timestamp: '2025-01-07T12:00:00.000Z',
    responseTime: 2100,
    statusCode: 200,
    success: true,
    attachments: [],
    referenceSources: [],
    accuracy: 0.88
  },
  {
    conversationId: 'CONV202501070053',
    clientId: 'RS000001',
    targetAttribute: '高校生',
    userId: 'user_h008',
    category: 'curriculum',
    question: '実際にはネイティブの先生が教えてくれる授業ですか？',
    mainBubble: '英語は日本人講師とネイティブ講師のチームティーチングです。',
    subBubble: '文法は日本人、会話はネイティブが担当します。',
    ctaBubble: '効果的な指導体制です。',
    timestamp: '2025-01-07T12:30:00.000Z',
    responseTime: 1900,
    statusCode: 200,
    success: true,
    attachments: [],
    referenceSources: [],
    accuracy: 0.73  // Low accuracy
  },
  {
    conversationId: 'CONV202501070054',
    clientId: 'RS000001',
    targetAttribute: '高校生',
    userId: 'user_h009',
    category: 'curriculum',
    question: 'ゼロはどのような授業ですか？',
    mainBubble: 'ゼロは基礎から学び直すコースです。',
    subBubble: '苦手克服に最適なプログラムです。',
    ctaBubble: '個別指導で丁寧にサポートします。',
    timestamp: '2025-01-07T13:00:00.000Z',
    responseTime: 1850,
    statusCode: 200,
    success: true,
    attachments: [],
    referenceSources: [],
    accuracy: 0.68  // Low accuracy
  },
  {
    conversationId: 'CONV202501070055',
    clientId: 'RS000001',
    targetAttribute: '高校生',
    userId: 'user_h010',
    category: 'class',
    question: '授業時間と曜日は決まっていますか？',
    mainBubble: '高校生は週2〜3回、19:00〜21:00が基本です。',
    subBubble: '部活動に配慮した時間設定も可能です。',
    ctaBubble: 'ご都合に合わせて調整します。',
    timestamp: '2025-01-07T13:30:00.000Z',
    responseTime: 2050,
    statusCode: 200,
    success: true,
    attachments: [],
    referenceSources: [],
    accuracy: 0.86
  },
  {
    conversationId: 'CONV202501070056',
    clientId: 'RS000001',
    targetAttribute: '高校生',
    userId: 'user_h011',
    category: 'payment',
    question: '最近3ヶ月間の授業料の領収書が必要です。',
    mainBubble: '3ヶ月分の領収書を発行いたします。',
    subBubble: 'PDFまたは紙でお渡しできます。',
    ctaBubble: '3営業日以内にご用意します。',
    timestamp: '2025-01-07T14:00:00.000Z',
    responseTime: 1950,
    statusCode: 200,
    success: true,
    attachments: [],
    referenceSources: [],
    accuracy: 0.92
  },
  {
    conversationId: 'CONV202501070057',
    clientId: 'RS000001',
    targetAttribute: '高校生',
    userId: 'user_h012',
    category: 'payment',
    question: '授業料の自動振替が可能な銀行を案内してください',
    mainBubble: '都市銀行、地方銀行、ゆうちょ銀行に対応しています。',
    subBubble: '信用金庫や農協も一部対応可能です。',
    ctaBubble: '詳しい銀行リストをお渡しします。',
    timestamp: '2025-01-07T14:30:00.000Z',
    responseTime: 1900,
    statusCode: 200,
    success: true,
    attachments: [],
    referenceSources: [],
    accuracy: 0.75  // Low accuracy
  },
  {
    conversationId: 'CONV202501070058',
    clientId: 'RS000001',
    targetAttribute: '高校生',
    userId: 'user_h013',
    category: 'consultation',
    question: '私に合ったおすすめの講義を案内してください',
    mainBubble: '志望校と現在の成績に基づいてご提案します。',
    subBubble: '無料の学力診断も実施しています。',
    ctaBubble: '個別相談会のご予約をお勧めします。',
    timestamp: '2025-01-07T15:00:00.000Z',
    responseTime: 2000,
    statusCode: 200,
    success: true,
    attachments: [],
    referenceSources: [],
    accuracy: 0.89
  },
  {
    conversationId: 'CONV202501070059',
    clientId: 'RS000001',
    targetAttribute: '高校生',
    userId: 'user_h014',
    category: 'application',
    question: '受講申込方法を案内してください',
    mainBubble: 'オンラインまたは教室で申込可能です。',
    subBubble: '必要書類は申込書と口座振替依頼書です。',
    ctaBubble: 'Web申込なら24時間受付中です。',
    timestamp: '2025-01-07T15:30:00.000Z',
    responseTime: 1850,
    statusCode: 200,
    success: true,
    attachments: [],
    referenceSources: [],
    accuracy: 0.90
  },
  {
    conversationId: 'CONV202501070060',
    clientId: 'RS000001',
    targetAttribute: '高校生',
    userId: 'user_h015',
    category: 'consultation',
    question: 'どのような授業を受けるとよいか総合的に相談したいです。案内をお願いします',
    mainBubble: '進路相談と学習相談を承っております。',
    subBubble: '現在の成績と志望校を基に最適なプランをご提案します。',
    ctaBubble: '無料相談会を毎週土曜日に開催しています。',
    timestamp: '2025-01-07T16:00:00.000Z',
    responseTime: 1950,
    statusCode: 200,
    success: true,
    attachments: [],
    referenceSources: [],
    accuracy: 0.94
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
 * Conversation History 데이터를 DynamoDB에 삽입
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
      
      // DynamoDB Item 구성
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
        
        // Conversation Attributes
        conversationId: conversation.conversationId,
        clientId: conversation.clientId,
        targetAttribute: conversation.targetAttribute,
        userId: conversation.userId,
        category: conversation.category,
        question: conversation.question,
        mainBubble: conversation.mainBubble,
        subBubble: conversation.subBubble,
        ctaBubble: conversation.ctaBubble,
        
        // Response Data
        timestamp: conversation.timestamp,
        responseTime: conversation.responseTime,
        statusCode: conversation.statusCode,
        success: conversation.success,
        
        // References
        attachments: conversation.attachments,
        referenceSources: conversation.referenceSources,
        accuracy: conversation.accuracy,
        
        // Metadata
        createdAt: conversation.timestamp,
        createdBy: 'system',
        updatedAt: now,
        updatedBy: 'system'
      };

      // 90일 TTL 설정 (옵션)
      const ttlDate = new Date(conversation.timestamp);
      ttlDate.setDate(ttlDate.getDate() + 90);
      item.ttl = Math.floor(ttlDate.getTime() / 1000);

      // DynamoDB에 저장
      await docClient.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: item
      }));

      console.log(`✅ Successfully seeded: ${conversation.conversationId}`);
      console.log(`   Question: ${conversation.question.substring(0, 30)}...`);
      console.log(`   Response Time: ${conversation.responseTime}ms`);
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