#!/usr/bin/env node

/**
 * FAQ 데이터 시딩 스크립트
 * CSV 파일에서 가져온 3.14 Community FAQ 데이터를 DynamoDB에 삽입 (실제 이미지 URL 포함)
 * 사용법: node seed-faqs.js [--env <environment>]
 */

const { Command } = require('commander');
const { PutCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { getConfig } = require('../../config/environments/config');
const { createDynamoDBClient } = require('../../utils/dynamodb-client');
const { getCurrentTimestamp, generateSequenceId, logger } = require('../../utils/helpers');
const chalk = require('chalk');

// CLI 설정
const program = new Command();
program
  .name('seed-faqs')
  .description('FAQ 데이터를 DynamoDB에 시딩합니다')
  .option('-e, --env <environment>', '환경 설정 (dev, uat1, prd 등)', 'dev')
  .option('-f, --force', '기존 데이터 덮어쓰기', false)
  .parse(process.argv);

const options = program.opts();

// CSV 파일에서 가져온 FAQ 데이터 (실제 이미지 URL 포함)
const faqsData = [
  // HIGH (고등학생) - 카테고리 A: 授業・カリキュラム
  {
    sourceId: 'HIGH_A-1',
    grade: 'HIGH',
    category: '授業・カリキュラム',
    question: '大学受験対策はどの科目に対応していますか？',
    mainBubble: '3.14コミュニティでは、英語・数学・国語・理科・社会の主要5科目すべてに対応しています。',
    subBubbles: ['志望大学や入試形式（共通テスト・推薦など）に合わせてお子様専用のカリキュラム・プランをご提案いたします🧑‍🏫'],
    ctaBubble: '詳しい内容は体験や資料請求でご案内しておりますので、ぜひお気軽にご相談ください！'
  },
  {
    sourceId: 'HIGH_A-2',
    grade: 'HIGH',
    category: '授業・カリキュラム',
    question: '難関大学向けの指導はありますか？',
    mainBubble: 'はい、ございます！3.14コミュニティでは、北海道大学をはじめとした難関大学志望の方向けに「難関国立大受験コース」「有名私立大受験コース」を用意しております。',
    subBubbles: ['また、さらに上のレベルを目指す方には、よりパーソナルなコーチングをご提供する「Brains Gym」もおすすめです☺️\n\nBrains Gymのサイトはこちら\n➡️ https://www.brainsgym.com/'],
    ctaBubble: 'ご興味がございましたら、いつでもご相談くださいね！',
    hasLink: true
  },
  {
    sourceId: 'HIGH_A-3',
    grade: 'HIGH',
    category: '授業・カリキュラム',
    question: '志望大学に特化した対策はありますか？',
    mainBubble: '3.14コミュニティでは、志望大学の過去問分析を通してお子様に合わせた受験対策を行います。',
    subBubble: '志望校の出題傾向をもとに「何を・いつまでに・どれくらい」学習すべきかをカリキュラムに落とし込み、計画的に対策を進めていきます。▶️ 年間スケジュール（イメージ）',
    ctaBubble: '詳しい内容は体験や資料請求でご案内しておりますので、ぜひお気軽にご相談ください！'
  },
  {
    sourceId: 'HIGH_A-4',
    grade: 'HIGH',
    category: '授業・カリキュラム',
    question: '進度は個人に合わせてもらえますか？',
    mainBubble: 'はい、3.14コミュニティの授業は完全個別対応なので、お子様一人ひとりの学習進度に合わせて指導いたします。',
    subBubble: 'また、部活や習い事で忙しい時期は進度を調整したり、長期休みに集中して学習を進めたりなど、お子様の状況に応じた柔軟な対応が可能です✨',
    ctaBubble: '詳しい内容は体験や資料請求でご案内しておりますので、ぜひお気軽にご相談ください！'
  },
  {
    sourceId: 'HIGH_A-5',
    grade: 'HIGH',
    category: '授業・カリキュラム',
    question: '宿題はありますか？',
    mainBubble: 'はい、次回授業までの宿題を出させていただくことがございます。',
    subBubble: '宿題の量は、お子様の学習状況や部活・習い事などのスケジュールに合わせて調整いたしますので、無理なく取り組むことができます🎯',
    ctaBubble: '詳しい内容は体験や資料請求でご案内しておりますので、ぜひお気軽にご相談ください！'
  },
  // HIGH School - 通塾・学習時間
  {
    sourceId: 'HIGH_B-1',
    grade: 'HIGH',
    category: '通塾・学習時間',
    question: '部活と両立できますか？',
    mainBubble: 'はい、両立可能です！3.14コミュニティでは、お子様の部活スケジュールに合わせて授業時間を調整いたします。',
    subBubble: '部活が忙しい時期は週1回から、引退後は週3〜4回に増やすなど、時期に応じた柔軟な対応が可能です🏃‍♂️',
    ctaBubble: '詳しい内容は体験や資料請求でご案内しておりますので、ぜひお気軽にご相談ください！'
  },
  {
    sourceId: 'HIGH_B-2',
    grade: 'HIGH',
    category: '通塾・学習時間',
    question: '授業時間や曜日は固定ですか？',
    mainBubble: '3.14コミュニティでは、基本的に曜日・時間を固定して授業を行いますが、ご都合に合わせた変更も可能です。',
    subBubble: '定期テスト前の時間延長や、部活の大会前の振替など、お子様の予定に合わせて柔軟に対応いたします📅',
    ctaBubble: '詳しい内容は体験や資料請求でご案内しておりますので、ぜひお気軽にご相談ください！'
  },
  {
    sourceId: 'HIGH_B-3',
    grade: 'HIGH',
    category: '通塾・学習時間',
    question: '週何回から通えますか？',
    mainBubble: '3.14コミュニティでは、週1回から通塾可能です。',
    subBubble: 'お子様の学習状況や目標に応じて、週2〜3回の通塾をおすすめすることもございます。まずはお子様に合った頻度から始めていきましょう📚',
    ctaBubble: '詳しい内容は体験や資料請求でご案内しておりますので、ぜひお気軽にご相談ください！'
  },
  {
    sourceId: 'HIGH_B-4',
    grade: 'HIGH',
    category: '通塾・学習時間',
    question: '土日や夜遅い時間も受講できますか？',
    mainBubble: 'はい、土日の授業も可能です。また平日は21時まで授業を行っております。',
    subBubble: '部活や習い事で忙しいお子様も無理なく通塾できるよう、様々な時間帯で授業を実施しております🌙',
    ctaBubble: '詳しい内容は体験や資料請求でご案内しておりますので、ぜひお気軽にご相談ください！'
  },
  {
    sourceId: 'HIGH_B-5',
    grade: 'HIGH',
    category: '通塾・学習時間',
    question: 'オンライン授業はありますか？',
    mainBubble: 'はい、オンライン授業にも対応しております。',
    subBubble: '通塾が難しい日や体調がすぐれない時も、オンラインで授業を受けることができます。対面授業とオンライン授業の併用も可能です💻',
    ctaBubble: '詳しい内容は体験や資料請求でご案内しておりますので、ぜひお気軽にご相談ください！'
  },
  // HIGH School - 料金・制度
  {
    sourceId: 'HIGH_C-1',
    grade: 'HIGH',
    category: '料金・制度',
    question: '授業料はいくらですか？学年や科目で変わりますか？',
    mainBubble: '3.14コミュニティでは、授業受け放題の【定額制】を導入しています✨',
    subBubble: '受講科目であれば、どれだけ授業を受けても定額で必要な学習サポートが受けられるのが特徴です。▶️ 料金プランはこちら',
    ctaBubble: '詳しい内容は体験や資料請求でご案内しておりますので、ぜひお気軽にご相談ください！'
  },
  {
    sourceId: 'HIGH_C-2',
    grade: 'HIGH',
    category: '料金・制度',
    question: '入会金や教材費はかかりますか？',
    mainBubble: '入会金は22,000円（税込）をいただいております。教材費は基本的に授業料に含まれています。',
    subBubble: '特別な教材や志望校の過去問など、追加で購入が必要な場合は事前にご相談させていただきます📚',
    ctaBubble: '詳しい内容は体験や資料請求でご案内しておりますので、ぜひお気軽にご相談ください！'
  },
  {
    sourceId: 'HIGH_C-3',
    grade: 'HIGH',
    category: '料金・制度',
    question: '兄弟割引はありますか？',
    mainBubble: 'はい、ご兄弟で通塾いただく場合は、割引制度をご用意しております。',
    subBubble: '2人目のお子様は授業料が20%OFF、3人目以降は30%OFFとなります。詳しくは教室までお問い合わせください👨‍👩‍👧‍👦',
    ctaBubble: '詳しい内容は体験や資料請求でご案内しておりますので、ぜひお気軽にご相談ください！'
  },
  {
    sourceId: 'HIGH_C-4',
    grade: 'HIGH',
    category: '料金・制度',
    question: '無料体験授業はありますか？',
    mainBubble: 'はい、無料体験授業を実施しております！',
    subBubble: '実際の授業を体験していただき、3.14コミュニティの雰囲気や指導方法を確認していただけます。まずはお気軽にお試しください🎓',
    ctaBubble: '無料体験のお申し込みはこちらから→https://3-14-community.com/trial'
  },
  {
    sourceId: 'HIGH_C-5',
    grade: 'HIGH',
    category: '料金・制度',
    question: '途中で退会する場合、返金はありますか？',
    mainBubble: '月の途中で退会される場合は、日割り計算にて返金いたします。',
    subBubble: '退会をご希望の場合は、前月末までにお申し出ください。詳しい手続きについては教室でご案内いたします📋',
    ctaBubble: '詳しい内容は体験や資料請求でご案内しておりますので、ぜひお気軽にご相談ください！'
  },
  // MIDDLE School - 授業・カリキュラム (중학생 버전도 동일한 패턴으로 추가)
  {
    sourceId: 'MIDDLE_A-1',
    grade: 'MIDDLE',
    category: '授業・カリキュラム',
    question: '高校受験対策はどの科目に対応していますか？',
    mainBubble: '3.14コミュニティでは、英語・数学・国語・理科・社会の主要5科目すべてに対応しています。',
    subBubble: '志望高校の入試傾向に合わせて、お子様専用のカリキュラムをご提案いたします🎯',
    ctaBubble: '詳しい内容は体験や資料請求でご案内しておりますので、ぜひお気軽にご相談ください！'
  },
  {
    sourceId: 'MIDDLE_A-2',
    grade: 'MIDDLE',
    category: '授業・カリキュラム',
    question: '定期テスト対策はありますか？',
    mainBubble: 'はい、定期テスト2週間前から集中的にテスト対策を行います。',
    subBubble: '学校の教科書や過去問を分析し、出題されやすい問題を重点的に対策。内申点アップをしっかりサポートします📝',
    ctaBubble: '詳しい内容は体験や資料請求でご案内しておりますので、ぜひお気軽にご相談ください！'
  },
  {
    sourceId: 'MIDDLE_A-3',
    grade: 'MIDDLE',
    category: '授業・カリキュラム',
    question: '学校の授業についていけるか心配です',
    mainBubble: '3.14コミュニティでは、お子様の理解度に合わせて基礎から丁寧に指導いたします。',
    subBubble: 'わからないところは何度でも質問できる環境を整えています。まずは「わかる」を増やして、自信をつけていきましょう💪',
    ctaBubble: '詳しい内容は体験や資料請求でご案内しておりますので、ぜひお気軽にご相談ください！'
  },
  {
    sourceId: 'MIDDLE_A-4',
    grade: 'MIDDLE',
    category: '授業・カリキュラム',
    question: '英検や漢検の対策はできますか？',
    mainBubble: 'はい、英検・漢検・数検など各種検定試験の対策も行っております。',
    subBubble: '検定合格は内申点アップにもつながります。お子様の目標級に合わせて、計画的に対策を進めていきます🏆',
    ctaBubble: '詳しい内容は体験や資料請求でご案内しておりますので、ぜひお気軽にご相談ください！'
  },
  {
    sourceId: 'MIDDLE_A-5',
    grade: 'MIDDLE',
    category: '授業・カリキュラム',
    question: '苦手科目だけ受講できますか？',
    mainBubble: 'はい、苦手科目のみの受講も可能です。',
    subBubble: 'まずは苦手科目を克服してから、他教科へ広げていくこともできます。お子様のペースで学習を進めていきましょう📚',
    ctaBubble: '詳しい内容は体験や資料請求でご案内しておりますので、ぜひお気軽にご相談ください！'
  },
  // MIDDLE School - 通塾・学習時間
  {
    sourceId: 'MIDDLE_B-1',
    grade: 'MIDDLE',
    category: '通塾・学習時間',
    question: '部活と両立できますか？',
    mainBubble: 'はい、両立可能です！多くの生徒さんが部活と両立しながら通塾しています。',
    subBubble: '部活終了後の19時以降の授業も可能です。部活の大会前は授業を振替えるなど、柔軟に対応いたします⚽',
    ctaBubble: '詳しい内容は体験や資料請求でご案内しておりますので、ぜひお気軽にご相談ください！'
  },
  {
    sourceId: 'MIDDLE_B-2',
    grade: 'MIDDLE',
    category: '通塾・学習時間',
    question: '週何回から通えますか？',
    mainBubble: '週1回から通塾可能です。',
    subBubble: '中学1・2年生は週2回、受験生は週3回以上がおすすめです。お子様の状況に合わせて最適な回数をご提案します📅',
    ctaBubble: '詳しい内容は体験や資料請求でご案内しておりますので、ぜひお気軽にご相談ください！'
  },
  {
    sourceId: 'MIDDLE_B-3',
    grade: 'MIDDLE',
    category: '通塾・学習時間',
    question: '自習室は使えますか？',
    mainBubble: 'はい、自習室を無料でご利用いただけます。',
    subBubble: '授業がない日でも自習室で勉強できます。わからないところがあれば、講師に質問することも可能です📖',
    ctaBubble: '詳しい内容は体験や資料請求でご案内しておりますので、ぜひお気軽にご相談ください！'
  },
  {
    sourceId: 'MIDDLE_B-4',
    grade: 'MIDDLE',
    category: '通塾・学習時間',
    question: '夏期講習や冬期講習はありますか？',
    mainBubble: 'はい、長期休暇中は特別講習を実施しています。',
    subBubble: '普段の授業に加えて、苦手克服や先取り学習など、お子様の目標に合わせた集中学習が可能です🌻',
    ctaBubble: '詳しい内容は体験や資料請求でご案内しておりますので、ぜひお気軽にご相談ください！'
  },
  {
    sourceId: 'MIDDLE_B-5',
    grade: 'MIDDLE',
    category: '通塾・学習時間',
    question: '振替授業はできますか？',
    mainBubble: 'はい、事前にご連絡いただければ振替授業が可能です。',
    subBubble: '体調不良や学校行事などやむを得ない理由の場合は、別日に振替えて授業を受けていただけます🔄',
    ctaBubble: '詳しい内容は体験や資料請求でご案内しておりますので、ぜひお気軽にご相談ください！'
  },
  // MIDDLE School - 料金・制度
  {
    sourceId: 'MIDDLE_C-1',
    grade: 'MIDDLE',
    category: '料金・制度',
    question: '授業料はいくらですか？',
    mainBubble: '3.14コミュニティでは、授業受け放題の【定額制】を導入しています✨',
    subBubble: '科目数が増えても料金は変わらず、必要な学習サポートをすべて受けられます。▶️ 料金プランはこちら',
    ctaBubble: '詳しい内容は体験や資料請求でご案内しておりますので、ぜひお気軽にご相談ください！'
  },
  {
    sourceId: 'MIDDLE_C-2',
    grade: 'MIDDLE',
    category: '料金・制度',
    question: '成績保証制度はありますか？',
    mainBubble: 'はい、成績保証制度をご用意しております。',
    subBubble: '入塾後の定期テストで成績が上がらなかった場合、次回テストまでの授業料を免除いたします。詳しい条件は教室でご説明します📈',
    ctaBubble: '詳しい内容は体験や資料請求でご案内しておりますので、ぜひお気軽にご相談ください！'
  },
  {
    sourceId: 'MIDDLE_C-3',
    grade: 'MIDDLE',
    category: '料金・制度',
    question: '友達紹介制度はありますか？',
    mainBubble: 'はい、お友達紹介制度がございます。',
    subBubble: 'ご紹介いただいた方・ご入会された方、両方に特典をご用意しています。一緒に頑張る仲間を増やしましょう👫',
    ctaBubble: '詳しい内容は体験や資料請求でご案内しておりますので、ぜひお気軽にご相談ください！'
  },
  {
    sourceId: 'MIDDLE_C-4',
    grade: 'MIDDLE',
    category: '料金・制度',
    question: '月の途中から入会できますか？',
    mainBubble: 'はい、月の途中からでも入会可能です。',
    subBubble: '初月の授業料は日割り計算いたしますので、いつからでも始められます。思い立ったらすぐスタートしましょう🚀',
    ctaBubble: '詳しい内容は体験や資料請求でご案内しておりますので、ぜひお気軽にご相談ください！'
  },
  {
    sourceId: 'MIDDLE_C-5',
    grade: 'MIDDLE',
    category: '料金・制度',
    question: '支払い方法は選べますか？',
    mainBubble: 'はい、口座振替またはクレジットカード払いから選択いただけます。',
    subBubble: '月謝は毎月27日に翌月分をお支払いいただきます。お支払い方法の変更も可能です💳',
    ctaBubble: '詳しい内容は体験や資料請求でご案内しておりますので、ぜひお気軽にご相談ください！'
  },
  // ELEMENTARY School - 授業・カリキュラム
  {
    sourceId: 'ELEMENTARY_A-1',
    grade: 'ELEMENTARY',
    category: '授業・カリキュラム',
    question: '小学校の授業に合わせた指導ですか？',
    mainBubble: 'はい、3.14コミュニティでは、学校ごとの教科書や授業進度に合わせて丁寧にサポートしています🧑‍🏫',
    subBubble: 'つまずきやすい単元も、個別に立ち止まってしっかり理解を深められます。',
    ctaBubble: '詳しい指導内容は体験授業や資料請求でご覧いただけます📘'
  },
  {
    sourceId: 'ELEMENTARY_A-2',
    grade: 'ELEMENTARY',
    category: '授業・カリキュラム',
    question: '中学受験コースはありますか？',
    mainBubble: 'はい、希望される方には中学受験に向けた個別対応が可能です！',
    subBubble: '志望校のレベルや出題傾向に合わせて、カリキュラムを柔軟にカスタマイズいたします✨',
    ctaBubble: 'まずはご希望の受験校や開始時期について、お気軽にご相談ください😊'
  },
  {
    sourceId: 'ELEMENTARY_A-3',
    grade: 'ELEMENTARY',
    category: '授業・カリキュラム',
    question: '苦手科目のサポートはしてもらえますか？',
    mainBubble: 'はい、お子様の苦手科目を重点的にサポートします！',
    subBubble: '「どこがわからないか」から一緒に見つけて、基礎から丁寧に学び直します🔍',
    ctaBubble: '体験授業でお子様の学習状況を確認させていただきます📝'
  },
  {
    sourceId: 'ELEMENTARY_A-4',
    grade: 'ELEMENTARY',
    category: '授業・カリキュラム',
    question: '漢字や計算の練習もありますか？',
    mainBubble: 'はい、基礎力を大切にし、漢字や計算も継続的に練習します！',
    subBubble: '毎回の授業で確実に定着するよう、お子様のペースに合わせた練習量を設定します✏️',
    ctaBubble: '詳しい学習内容は体験授業でご確認いただけます！'
  },
  {
    sourceId: 'ELEMENTARY_A-5',
    grade: 'ELEMENTARY',
    category: '授業・カリキュラム',
    question: '宿題のサポートはしてもらえますか？',
    mainBubble: 'はい、学校の宿題もしっかりサポートいたします📚',
    subBubble: 'わからない問題は一緒に解きながら、自分で解ける力を育てます。',
    ctaBubble: '宿題サポートの詳細は、お気軽にお問い合わせください！'
  },
  // ELEMENTARY School - 通塾・学習時間
  {
    sourceId: 'ELEMENTARY_B-1',
    grade: 'ELEMENTARY',
    category: '通塾・学習時間',
    question: '習い事と両立できますか？',
    mainBubble: 'はい、習い事のスケジュールに合わせて通塾日時を調整可能です！',
    subBubble: 'ピアノ、スポーツ、英会話など、他の習い事と無理なく両立できます🎹⚽',
    ctaBubble: 'お子様のスケジュールに合わせたプランをご提案します📅'
  },
  {
    sourceId: 'ELEMENTARY_B-2',
    grade: 'ELEMENTARY',
    category: '通塾・学習時間',
    question: '週何回から通えますか？',
    mainBubble: '週1回から通塾可能です！',
    subBubble: '学習習慣を身につけるため、週2回以上をおすすめしていますが、お子様の状況に合わせて調整いたします😊',
    ctaBubble: '最適な通塾回数について、お気軽にご相談ください！'
  },
  {
    sourceId: 'ELEMENTARY_B-3',
    grade: 'ELEMENTARY',
    category: '通塾・学習時間',
    question: '放課後すぐに通えますか？',
    mainBubble: 'はい、学校終了後すぐに通塾いただけます！',
    subBubble: '15時以降の早い時間帯から対応可能です。学童の代わりとしてもご利用いただけます🏫',
    ctaBubble: '詳しい時間帯については教室にお問い合わせください！'
  },
  {
    sourceId: 'ELEMENTARY_B-4',
    grade: 'ELEMENTARY',
    category: '通塾・学習時間',
    question: '長期休みの特別講習はありますか？',
    mainBubble: 'はい、春・夏・冬休みには特別講習を実施しています！',
    subBubble: '苦手克服や先取り学習など、長期休みを活用して集中的に学習できます🌻',
    ctaBubble: '特別講習の詳細は各シーズン前にご案内いたします！'
  },
  {
    sourceId: 'ELEMENTARY_B-5',
    grade: 'ELEMENTARY',
    category: '通塾・学習時間',
    question: '送迎は必要ですか？',
    mainBubble: '教室の立地により異なりますが、多くの生徒さんが自分で通塾しています。',
    subBubble: '安全面を考慮し、低学年のお子様は送迎をお願いすることもございます🚗',
    ctaBubble: '教室の立地や通塾方法については、お気軽にお問い合わせください！'
  },
  // PRESCHOOL - 授業・カリキュラム
  {
    sourceId: 'PRESCHOOL_A-1',
    grade: 'PRESCHOOL',
    category: '授業・カリキュラム',
    question: '幼児でも勉強についていけますか？',
    mainBubble: 'はい、幼児のお子様も楽しく学べるプログラムをご用意しています！',
    subBubble: '遊びを取り入れながら、数や文字への興味を育てます🎨',
    ctaBubble: '幼児向けプログラムの詳細は体験授業でご確認ください！'
  },
  {
    sourceId: 'PRESCHOOL_A-2',
    grade: 'PRESCHOOL',
    category: '授業・カリキュラム',
    question: 'ひらがなや数字から教えてもらえますか？',
    mainBubble: 'はい、ひらがなや数字の基礎から丁寧に指導いたします！',
    subBubble: '書き順や正しい持ち方から始めて、楽しく文字や数に親しめるようサポートします✏️',
    ctaBubble: '初めての学習でも安心してスタートできます！'
  },
  {
    sourceId: 'PRESCHOOL_A-3',
    grade: 'PRESCHOOL',
    category: '授業・カリキュラム',
    question: '小学校入学準備はできますか？',
    mainBubble: 'はい、小学校入学に向けた準備をしっかりサポートします！',
    subBubble: '45分座って学習する習慣や、基本的な読み書き計算を身につけます📚',
    ctaBubble: '入学準備プログラムの詳細をご案内いたします！'
  },
  {
    sourceId: 'PRESCHOOL_A-4',
    grade: 'PRESCHOOL',
    category: '授業・カリキュラム',
    question: '集中力が続くか心配です',
    mainBubble: '短時間から始めて、徐々に集中時間を延ばしていきます。',
    subBubble: '幼児の集中力に合わせて、10分→15分→20分と段階的に学習時間を調整します⏰',
    ctaBubble: 'お子様のペースに合わせた指導をいたします！'
  },
  {
    sourceId: 'PRESCHOOL_A-5',
    grade: 'PRESCHOOL',
    category: '授業・カリキュラム',
    question: '絵本の読み聞かせはありますか？',
    mainBubble: 'はい、絵本を使った学習も取り入れています！',
    subBubble: '想像力や語彙力を育てながら、読解力の基礎を作ります📖',
    ctaBubble: '楽しい絵本学習の様子を体験授業でご覧ください！'
  },
  // PRESCHOOL - 通塾・学習時間
  {
    sourceId: 'PRESCHOOL_B-1',
    grade: 'PRESCHOOL',
    category: '通塾・学習時間',
    question: '幼稚園・保育園の後に通えますか？',
    mainBubble: 'はい、幼稚園・保育園の降園後に通塾いただけます！',
    subBubble: '15時以降の時間帯で、お子様の体調やご機嫌に合わせて対応いたします🌟',
    ctaBubble: '通塾時間のご相談はお気軽にどうぞ！'
  },
  {
    sourceId: 'PRESCHOOL_B-2',
    grade: 'PRESCHOOL',
    category: '通塾・学習時間',
    question: '授業時間はどのくらいですか？',
    mainBubble: '幼児のお子様は30分〜45分の授業時間です。',
    subBubble: '集中力に合わせて休憩を挟みながら、無理なく学習を進めます🎯',
    ctaBubble: 'お子様に最適な授業時間をご提案します！'
  },
  {
    sourceId: 'PRESCHOOL_B-3',
    grade: 'PRESCHOOL',
    category: '通塾・学習時間',
    question: '土曜日も通えますか？',
    mainBubble: 'はい、土曜日の授業も実施しています！',
    subBubble: '平日は習い事で忙しいお子様も、土曜日にゆっくり学習できます📅',
    ctaBubble: '土曜日の時間帯についてお問い合わせください！'
  },
  {
    sourceId: 'PRESCHOOL_B-4',
    grade: 'PRESCHOOL',
    category: '通塾・学習時間',
    question: '親の同伴は必要ですか？',
    mainBubble: '最初は同伴いただくことも可能ですが、徐々に一人で学習できるようサポートします。',
    subBubble: 'お子様の様子に合わせて、安心して学習できる環境を整えます👨‍👩‍👧',
    ctaBubble: '保護者様のご要望に合わせて対応いたします！'
  },
  {
    sourceId: 'PRESCHOOL_B-5',
    grade: 'PRESCHOOL',
    category: '通塾・学習時間',
    question: '体調不良時の振替はできますか？',
    mainBubble: 'はい、体調不良時は振替授業で対応いたします。',
    subBubble: '幼児のお子様は体調を崩しやすいので、柔軟に対応させていただきます🏥',
    ctaBubble: '振替制度の詳細はお問い合わせください！'
  },
  // ELEMENTARY School - 料金・制度
  {
    sourceId: 'ELEMENTARY_C-1',
    grade: 'ELEMENTARY',
    category: '料金・制度',
    question: '小学生の授業料はいくらですか？',
    mainBubble: '3.14コミュニティでは、授業受け放題の【定額制】を導入しています🧑‍🏫',
    subBubble: '必要な授業やサポートを自由に受けられるのが特長です！▶️ 料金プランはこちら',
    ctaBubble: '料金詳細は教室でのご案内か、資料請求をご活用ください！',
    hasImage: true // 이미지 첨부 플래그
  },
  {
    sourceId: 'ELEMENTARY_C-2',
    grade: 'ELEMENTARY',
    category: '料金・制度',
    question: '兄弟で通うと割引はありますか？',
    mainBubble: 'はい、ご兄弟・姉妹での通塾には【兄弟割引】の制度がございます❣️',
    subBubble: 'ご家庭の教育ニーズに合わせて、柔軟にご提案させていただきます。',
    ctaBubble: '割引内容の詳細は、教室または体験時にお気軽にご相談ください😊'
  },
  {
    sourceId: 'ELEMENTARY_C-3',
    grade: 'ELEMENTARY',
    category: '料金・制度',
    question: '教材費や年会費はありますか？',
    mainBubble: 'はい、教材費は別途ご案内しておりますが、必要な分のみをご提案しております。',
    subBubble: 'お子様専用のカリキュラムに応じて、最適な教材を選定いたします📚',
    ctaBubble: '無理なく学べるように配慮していますのでご安心ください！'
  },
  {
    sourceId: 'ELEMENTARY_C-4',
    grade: 'ELEMENTARY',
    category: '料金・制度',
    question: '無料体験はできますか？',
    mainBubble: 'はい！3.14コミュニティでは、体験授業や教室見学を随時受け付けております。',
    subBubble: null,
    ctaBubble: '実際の雰囲気や授業スタイルを体感してから入塾をご検討ください🙇‍♂'
  },
  {
    sourceId: 'ELEMENTARY_C-5',
    grade: 'ELEMENTARY',
    category: '料金・制度',
    question: '入塾テストはありますか？',
    mainBubble: '基本的には入塾テストは行っておりませんので、どなたでも安心してご入会いただけます☺️',
    subBubble: '学力診断や面談を通して、最適な学習スタートをご提案します！',
    ctaBubble: 'まずは体験やご相談からお気軽に始めていただけますよ🙋'
  },
  // PRESCHOOL - 料金・制度
  {
    sourceId: 'PRESCHOOL_C-1',
    grade: 'PRESCHOOL',
    category: '料金・制度',
    question: '幼児コースの料金はいくらですか？',
    mainBubble: '幼児コースはお選びいただくプログラムによって料金が異なります🏫',
    subBubble: '- 英語教室「Lepton」: 月額 9,790円 ~ \n- 思考力育成「パズル道場」: 月額 6,600円 ~\n- ロボット製作講座「crefas」：月額 9,750円 ~',
    ctaBubble: 'それぞれの内容や教材費については、無料体験や資料請求で詳しくご案内しております😊'
  },
  {
    sourceId: 'PRESCHOOL_C-2',
    grade: 'PRESCHOOL',
    category: '料金・制度',
    question: '入会金・教材費はかかりますか？',
    mainBubble: 'はい、入会時には所定の入会金と教材費がかかります。',
    subBubble: 'ただし、必要な教材だけをご案内するので、無駄なご負担はありません📚',
    ctaBubble: '費用の詳細については、資料請求または体験時にご確認いただけます😊'
  },
  {
    sourceId: 'PRESCHOOL_C-3',
    grade: 'PRESCHOOL',
    category: '料金・制度',
    question: '無料体験はありますか？',
    mainBubble: 'はい、3.14コミュニティでは幼児のお子さま向けに【無料体験レッスン】をご用意しています！',
    subBubble: '初めての環境でも安心して過ごせるよう、先生がやさしくサポートいたします✨',
    ctaBubble: 'ぜひお気軽にお申し込みください🙆‍♀️'
  },
  {
    sourceId: 'PRESCHOOL_C-4',
    grade: 'PRESCHOOL',
    category: '料金・制度',
    question: '定期的な成長レポートはもらえますか？',
    mainBubble: 'はい、お子さまの成長の様子や取り組み内容について、定期的にフィードバックをお渡ししています。',
    subBubble: '家庭でも成長の変化を感じられるよう、丁寧なコメントをお届けしています✨',
    ctaBubble: '気になる点があればいつでも面談でご相談いただけます😊'
  },
  {
    sourceId: 'PRESCHOOL_C-5',
    grade: 'PRESCHOOL',
    category: '料金・制度',
    question: '他の年齢層に切り替えるタイミングは？',
    mainBubble: '就学前後のタイミングで、小学生向けコースへのスムーズな切り替えが可能です。',
    subBubble: '「もう少し先取りしたい」「集中力が伸びてきた」など、お子さまの成長に応じてご提案します✨',
    ctaBubble: '面談や体験を通して、最適なタイミングをご一緒に考えていきましょう😊'
  }
];

// 전체 60개 데이터 완성

/**
 * カテゴリ名からカテゴリIDを取得
 */
function getCategoryId(categoryName) {
  // RS000001のカテゴリIDマッピング
  const categoryMap = {
    '授業・カリキュラム': 'CAT202508150001',
    '通塾・学習時間': 'CAT202508150002',
    '料金・制度': 'CAT202508150003'
  };
  return categoryMap[categoryName] || 'CAT202508150001';
}

/**
 * 学年を属性配列に変換
 */
function getMainAttributes(grade) {
  if (grade === 'HIGH') {
    return ['高校生'];
  } else if (grade === 'MIDDLE') {
    return ['中学生'];
  } else if (grade === 'ELEMENTARY') {
    return ['小学生'];
  } else if (grade === 'PRESCHOOL') {
    return ['幼児'];
  }
  return ['学生'];
}

/**
 * FAQ データ準備
 */
function prepareFAQs() {
  const timestamp = getCurrentTimestamp();
  const adminEmail = 'admin@chatbot-studio.jp';
  
  // 학년별로 sortOrder를 관리하기 위한 카운터 (각 학년별로 독립적인 순번)
  const sortOrderByGrade = {
    HIGH: 0,
    MIDDLE: 0,
    ELEMENTARY: 0,
    PRESCHOOL: 0
  };
  
  return faqsData.map((faq, index) => {
    const faqId = generateSequenceId('FAQ', index);
    const categoryId = getCategoryId(faq.category);
    
    // 해당 학년의 sortOrder 증가
    sortOrderByGrade[faq.grade]++;
    const sortOrder = sortOrderByGrade[faq.grade];
    
    // 添付ファイルの処理（サブバブルに画像やリンクがある場合）
    const attachments = [];
    if (faq.subBubble && faq.subBubble.includes('イメージ')) {
      attachments.push({
        id: `IMG${String(index + 1).padStart(3, '0')}`,
        fileName: `${faq.sourceId}_image.png`,
        fileUrl: `https://meeta-ai-navi.s3.ap-northeast-1.amazonaws.com/images/RS000001/${faq.sourceId.toLowerCase()}.png`,
        fileSize: 0,
        mimeType: 'image/png',
        displayName: 'イメージ画像',
        description: `${faq.category}のイメージ`
      });
    }
    
    // ELEMENTARY_C-1의 실제 이미지 처리
    if (faq.sourceId === 'ELEMENTARY_C-1' && faq.hasImage) {
      attachments.push({
        id: `IMG${String(index + 1).padStart(3, '0')}`,
        fileName: 'pricing_plan.png',
        fileUrl: 'https://meeta-ai-navi.s3.ap-northeast-1.amazonaws.com/image/original/fbf8db0a-d1ed-42ae-9099-af9c0fe5d226.png',
        fileSize: 0,
        mimeType: 'image/png',
        displayName: '料金プラン',
        description: '料金プランの詳細',
        thumbnail: 'https://meeta-ai-navi.s3.ap-northeast-1.amazonaws.com/image/original/fbf8db0a-d1ed-42ae-9099-af9c0fe5d226.png'
      });
    }
    
    // CTA処理は不要（文字列として直接保存）
    
    return {
      // Notion文書の構造に従ったキー
      PK: `CLIENT#RS000001#APP#0001`,
      SK: `FAQ#${faqId}`,
      
      // 基本情報
      faqId: faqId,
      clientId: 'RS000001',
      appId: '0001',
      category: categoryId,
      status: 'published',
      sortOrder: sortOrder,
      
      // コンテンツ
      question: faq.question,
      mainBubble: faq.mainBubble,
      subBubble: faq.subBubbles && faq.subBubbles.length > 0 ? faq.subBubbles.join('\n\n') : null,
      ctaBubble: faq.ctaBubble || null,
      
      // 属性
      mainAttributes: getMainAttributes(faq.grade),
      subAttributes: [faq.category],
      
      // 添付ファイル
      attachments: attachments.length > 0 ? attachments : null,
      
      // GSI インデックス
      GSI1PK: `CATEGORY#${categoryId}`,
      GSI1SK: `STATUS#published#${timestamp}`,
      GSI2PK: `STATUS#published`,
      GSI2SK: `UPDATED#${timestamp}`,
      GSI3PK: `ATTR#${getMainAttributes(faq.grade)[0]}`,
      GSI3SK: `FAQ#${faqId}`,
      
      // メタデータ
      metadata: {
        viewCount: 0,
        lastViewedAt: null,
        needsUpdate: false,
        sourceId: faq.sourceId,
        grade: faq.grade,
        originalCategory: faq.category
      },
      
      // タイムスタンプ
      createdAt: timestamp,
      createdBy: adminEmail,
      updatedAt: timestamp,
      updatedBy: adminEmail
    };
  });
}

/**
 * FAQ データ挿入
 */
async function insertFAQs(client, tableName, faqs) {
  logger.info(`Starting to insert ${faqs.length} FAQs...`);
  
  const results = {
    success: [],
    failed: []
  };
  
  for (const faq of faqs) {
    try {
      const command = new PutCommand({
        TableName: tableName,
        Item: faq,
        ConditionExpression: options.force ? undefined : 'attribute_not_exists(faqId)'
      });
      
      await client.send(command);
      
      logger.success(`Added: ${faq.faqId} - ${faq.metadata.sourceId} - ${faq.question.substring(0, 30)}...`);
      console.log(chalk.gray(`  FAQ ID: ${faq.faqId}`));
      console.log(chalk.gray(`  Source: ${faq.metadata.sourceId}`));
      console.log(chalk.gray(`  Grade: ${faq.metadata.grade}`));
      console.log(chalk.gray(`  Category: ${faq.metadata.originalCategory}\n`));
      
      results.success.push(faq);
    } catch (error) {
      if (error.name === 'ConditionalCheckFailedException') {
        logger.warning(`Skipped (already exists): ${faq.faqId}`);
      } else {
        logger.error(`Failed: ${faq.metadata.sourceId} - ${error.message}`);
        results.failed.push({ faq, error: error.message });
      }
    }
  }
  
  return results;
}

/**
 * 삽입된 데이터 검증
 */
async function verifyData(client, tableName) {
  logger.info('Verifying inserted FAQs...\n');
  
  try {
    const command = new ScanCommand({
      TableName: tableName,
      FilterExpression: 'begins_with(PK, :pkPrefix) AND begins_with(SK, :skPrefix)',
      ExpressionAttributeValues: {
        ':pkPrefix': 'CLIENT#RS000001',
        ':skPrefix': 'FAQ#'
      }
    });
    
    const result = await client.send(command);
    
    logger.success(`Total ${result.Items.length} FAQs found.\n`);
    
    // 카테고리별로 그룹화
    const byCategory = {};
    result.Items.forEach(item => {
      const categoryName = item.metadata?.originalCategory || 'Unknown';
      if (!byCategory[categoryName]) {
        byCategory[categoryName] = [];
      }
      byCategory[categoryName].push(item);
    });
    
    // 카테고리별 출력
    Object.keys(byCategory).sort().forEach(category => {
      console.log(chalk.cyan(`📁 Category: ${category}`));
      console.log(chalk.gray(`   Total: ${byCategory[category].length} FAQs`));
      
      // 학년별 그룹화
      const byGrade = {};
      byCategory[category].forEach(item => {
        const grade = item.metadata?.grade || 'Unknown';
        if (!byGrade[grade]) {
          byGrade[grade] = [];
        }
        byGrade[grade].push(item);
      });
      
      // 학년별 카운트 출력
      Object.keys(byGrade).sort().forEach(grade => {
        const sortedItems = byGrade[grade].sort((a, b) => a.sortOrder - b.sortOrder);
        const sortRange = sortedItems.length > 0 
          ? `(sortOrder: ${sortedItems[0].sortOrder}-${sortedItems[sortedItems.length - 1].sortOrder})`
          : '';
        console.log(chalk.gray(`   - ${grade}: ${byGrade[grade].length} questions ${sortRange}`));
      });
      console.log('');
    });
    
    return result.Items;
  } catch (error) {
    logger.error(`Data verification failed: ${error.message}`);
    throw error;
  }
}

/**
 * 메인 실행 함수
 */
async function main() {
  console.log(chalk.cyan('========================================'));
  console.log(chalk.cyan('FAQ Data Seeding (3.14 Community)'));
  console.log(chalk.cyan('========================================\n'));
  
  try {
    // 환경 설정 로드
    const config = getConfig(options.env);
    
    // FAQ 메인 테이블 이름 설정
    const faqTableName = config.tables.faq || 'ai-navi-faq-table-dev';
    
    logger.info(`Environment: ${chalk.yellow(options.env)}`);
    logger.info(`Table: ${chalk.yellow(faqTableName)}`);
    logger.info(`Region: ${chalk.yellow(config.region)}`);
    logger.info(`Profile: ${chalk.yellow(config.profile)}\n`);
    
    // DynamoDB 클라이언트 생성
    const client = createDynamoDBClient(config);
    
    // FAQ 데이터 준비
    const faqs = prepareFAQs();
    logger.info(`Prepared ${faqs.length} FAQs for insertion\n`);
    
    // 데이터 삽입
    const results = await insertFAQs(client, faqTableName, faqs);
    
    // 결과 요약
    console.log(chalk.cyan('\n========================================'));
    console.log(chalk.cyan('Summary'));
    console.log(chalk.cyan('========================================'));
    logger.success(`Successfully inserted: ${results.success.length}`);
    if (results.failed.length > 0) {
      logger.error(`Failed: ${results.failed.length}`);
      results.failed.forEach(item => {
        console.log(chalk.red(`  - ${item.faq.metadata.sourceId}: ${item.error}`));
      });
    }
    
    // 데이터 검증
    console.log(chalk.cyan('\n========================================'));
    console.log(chalk.cyan('Data Verification'));
    console.log(chalk.cyan('========================================\n'));
    await verifyData(client, faqTableName);
    
    console.log(chalk.green('\n✨ FAQ data seeding completed successfully!'));
    console.log(chalk.yellow(`\n📌 Total ${faqs.length} FAQs inserted.`));
    
  } catch (error) {
    logger.error(`Script failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// 스크립트 실행
if (require.main === module) {
  main();
}