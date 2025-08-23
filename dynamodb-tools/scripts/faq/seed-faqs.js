#!/usr/bin/env node

/**
 * FAQ 데이터 시딩 스크립트
 * CSV 파일에서 파싱한 3.14 Community FAQ 데이터를 DynamoDB에 삽입
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

// CSV에서 파싱한 FAQ 데이터 (실제 이미지 URL 포함)
const faqsData = require('./faq-data-parsed.js');

// 카테고리 ID 매핑
function getCategoryId(category) {
  const categoryMap = {
    '授業・カリキュラム': 'CAT202508150001',
    '通塾・学習時間': 'CAT202508150002',
    '料金・制度': 'CAT202508150003'
  };
  return categoryMap[category] || 'CAT000000';
}

// 실제 이미지 URL 매핑
const imageUrlMap = {
  'HIGH_B-1': 'https://meeta-ai-navi.s3.ap-northeast-1.amazonaws.com/image/original/742ad511-c01a-43c9-b51b-c17d5c9ee43d.png',
  'HIGH_B-3': 'https://meeta-ai-navi.s3.ap-northeast-1.amazonaws.com/image/original/742ad511-c01a-43c9-b51b-c17d5c9ee43d.png',
  'HIGH_C-1': 'https://meeta-ai-navi.s3.ap-northeast-1.amazonaws.com/image/original/b6f8eddd-4468-4d7a-8919-ed87fbc2e59e.png',
  'HIGH_C-4': 'https://meeta-ai-navi.s3.ap-northeast-1.amazonaws.com/image/original/b6f8eddd-4468-4d7a-8919-ed87fbc2e59e.png',
  'MIDDLE_A-2': 'https://meeta-ai-navi.s3.ap-northeast-1.amazonaws.com/image/original/5d8c1588-904b-4a35-91a7-294a1374cb4b.png',
  'MIDDLE_A-3': 'https://meeta-ai-navi.s3.ap-northeast-1.amazonaws.com/image/original/5d8c1588-904b-4a35-91a7-294a1374cb4b.png',
  'MIDDLE_A-5': 'https://meeta-ai-navi.s3.ap-northeast-1.amazonaws.com/image/original/4e4b4f60-54ec-4842-89f0-eaa8d8dac370.png',
  'MIDDLE_B-2': 'https://meeta-ai-navi.s3.ap-northeast-1.amazonaws.com/image/original/330edda5-9efe-4e2a-8aef-68ffd5a28934.png',
  'MIDDLE_B-3': 'https://meeta-ai-navi.s3.ap-northeast-1.amazonaws.com/image/original/330edda5-9efe-4e2a-8aef-68ffd5a28934.png',
  'MIDDLE_C-1': 'https://meeta-ai-navi.s3.ap-northeast-1.amazonaws.com/image/original/00eb2c7a-da26-441f-b631-bd69d0696c6b.png',
  'MIDDLE_C-4': 'https://meeta-ai-navi.s3.ap-northeast-1.amazonaws.com/image/original/00eb2c7a-da26-441f-b631-bd69d0696c6b.png',
  'ELEMENTARY_A-2': 'https://meeta-ai-navi.s3.ap-northeast-1.amazonaws.com/image/original/26a26c4b-212f-4c63-a4bb-225b7c91be81.png',
  'ELEMENTARY_C-1': 'https://meeta-ai-navi.s3.ap-northeast-1.amazonaws.com/image/original/fbf8db0a-d1ed-42ae-9099-af9c0fe5d226.png',
  'PRESCHOOL_A-1': 'https://meeta-ai-navi.s3.ap-northeast-1.amazonaws.com/image/original/3181ff5f-f1a5-480d-b4b0-a101699e4a97.png'
};

/**
 * FAQ 데이터 준비
 */
function prepareFAQs() {
  const timestamp = getCurrentTimestamp();
  const clientId = 'RS000001';
  const appId = '0001';
  const adminEmail = 'admin@chatbot-studio.jp';
  
  // 학년별 정렬 순서 초기화
  const sortOrderByGrade = {
    HIGH: 0,
    MIDDLE: 0,
    ELEMENTARY: 0,
    PRESCHOOL: 0
  };
  
  return faqsData.map((faq, index) => {
    const faqId = generateSequenceId('FAQ', index);
    const categoryId = getCategoryId(faq.category);
    
    // 학년별로 sortOrder 증가
    sortOrderByGrade[faq.grade]++;
    
    // 첨부파일 처리
    const attachments = [];
    
    // 실제 이미지 URL 처리
    if (faq.hasImage && imageUrlMap[faq.sourceId]) {
      attachments.push({
        id: `IMG${String(index + 1).padStart(3, '0')}`,
        fileName: `${faq.sourceId.toLowerCase()}_image.png`,
        fileUrl: imageUrlMap[faq.sourceId],
        fileSize: 100000,
        mimeType: 'image/png',
        displayName: '参考画像',
        description: '説明用画像',
        thumbnail: imageUrlMap[faq.sourceId]
      });
    }
    
    // 링크 처리 (HIGH_A-2의 Brains Gym)
    if (faq.hasLink && faq.sourceId === 'HIGH_A-2') {
      attachments.push({
        linkUrl: 'https://www.brainsgym.com/',
        linkTitle: 'Brains Gym',
        linkDescription: 'よりパーソナルなコーチングをご提供',
        linkThumbnail: '',
        displayType: 'card'
      });
    }
    
    return {
      // Notion 문서의 Single Table Design 키 구조
      PK: `CLIENT#${clientId}#APP#${appId}`,
      SK: `FAQ#${faqId}`,
      
      // 기본 정보
      faqId: faqId,
      clientId: clientId,
      appId: appId,
      category: categoryId,
      status: 'published',
      sortOrder: sortOrderByGrade[faq.grade],
      
      // 콘텐츠 (서브버블과 CTA버블을 단순 문자열로 저장)
      question: faq.question,
      mainBubble: faq.mainBubble,
      subBubble: faq.subBubble || null,
      ctaBubble: faq.ctaBubble || null,
      
      // 속성
      mainAttributes: getMainAttributes(faq.grade),
      subAttributes: [faq.category],
      
      // 첨부파일
      attachments: attachments.length > 0 ? attachments : null,
      
      // GSI 인덱스
      GSI1PK: `CATEGORY#${categoryId}`,
      GSI1SK: `STATUS#published#${timestamp}`,
      GSI2PK: `STATUS#published`,
      GSI2SK: `UPDATED#${timestamp}`,
      GSI3PK: `ATTR#${getMainAttributes(faq.grade)[0]}`,
      GSI3SK: `FAQ#${faqId}`,
      
      // 메타데이터
      metadata: {
        viewCount: 0,
        lastViewedAt: null,
        needsUpdate: false,
        sourceId: faq.sourceId,
        grade: faq.grade,
        originalCategory: faq.category,
        hasAttachments: faq.hasImage || faq.hasLink || false
      },
      
      // 타임스탬프
      createdAt: timestamp,
      createdBy: adminEmail,
      updatedAt: timestamp,
      updatedBy: adminEmail
    };
  });
}

/**
 * 학년별 메인 속성 반환
 */
function getMainAttributes(grade) {
  const attributeMap = {
    'HIGH': ['高校生'],
    'MIDDLE': ['中学生'],
    'ELEMENTARY': ['小学生'],
    'PRESCHOOL': ['幼児']
  };
  return attributeMap[grade] || [];
}

/**
 * FAQ 데이터 삽입
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
      console.log(chalk.gray(`  Category: ${faq.metadata.originalCategory}`));
      console.log(chalk.gray(`  Sort Order: ${faq.sortOrder}`));
      console.log(chalk.gray(`  Has SubBubble: ${faq.subBubble ? 'Yes' : 'No'}`));
      console.log(chalk.gray(`  Has Attachments: ${faq.metadata.hasAttachments}\n`));
      
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
        ':pkPrefix': 'CLIENT#',
        ':skPrefix': 'FAQ#'
      }
    });
    
    const result = await client.send(command);
    
    logger.success(`Total ${result.Items.length} FAQs found.\n`);
    
    // 카테고리별 그룹화
    const byCategory = {};
    result.Items.forEach(item => {
      const category = item.metadata?.originalCategory || '불명';
      if (!byCategory[category]) {
        byCategory[category] = {
          HIGH: [],
          MIDDLE: [],
          ELEMENTARY: [],
          PRESCHOOL: []
        };
      }
      const grade = item.metadata?.grade;
      if (grade && byCategory[category][grade]) {
        byCategory[category][grade].push(item);
      }
    });
    
    // 카테고리별 출력
    Object.keys(byCategory).sort().forEach(category => {
      console.log(chalk.cyan(`📁 Category: ${category}`));
      let categoryTotal = 0;
      
      ['HIGH', 'MIDDLE', 'ELEMENTARY', 'PRESCHOOL'].forEach(grade => {
        const items = byCategory[category][grade];
        if (items.length > 0) {
          const gradeLabel = grade === 'HIGH' ? '高校生' : 
                             grade === 'MIDDLE' ? '中学生' : 
                             grade === 'ELEMENTARY' ? '小学生' : '幼児';
          console.log(chalk.yellow(`   - ${gradeLabel}: ${items.length} questions (sortOrder: ${items[0].sortOrder}-${items[items.length-1].sortOrder})`));
          categoryTotal += items.length;
        }
      });
      console.log(chalk.green(`   Total: ${categoryTotal} FAQs\n`));
    });
    
    // 서브버블이 있는 FAQ 수 계산
    const withSubBubble = result.Items.filter(item => item.subBubble && item.subBubble !== 'null');
    console.log(chalk.cyan(`📝 서브버블이 있는 FAQ: ${withSubBubble.length}/${result.Items.length}`));
    
    // 이미지가 있는 FAQ 목록
    const withImages = result.Items.filter(item => item.attachments && item.attachments.length > 0);
    console.log(chalk.cyan(`\n🖼️  이미지/링크가 포함된 FAQ: ${withImages.length}개`));
    withImages.forEach(item => {
      const imageUrl = item.attachments[0]?.fileUrl || item.attachments[0]?.linkUrl;
      if (imageUrl) {
        console.log(chalk.gray(`   - ${item.metadata.sourceId}: ${imageUrl.split('/').pop()}`));
      }
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
  console.log(chalk.cyan('FAQ Data Seeding (CSV Parsed)'));
  console.log(chalk.cyan('========================================\n'));
  
  try {
    // 환경 설정 로드
    const config = getConfig(options.env);
    const faqTableName = config.tables.faq || 'ai-navi-faq-table-dev';
    
    logger.info(`Environment: ${chalk.yellow(options.env)}`);
    logger.info(`Table: ${chalk.yellow(faqTableName)}`);
    logger.info(`Region: ${chalk.yellow(config.region)}`);
    logger.info(`Profile: ${chalk.yellow(config.profile)}\n`);
    
    // DynamoDB 클라이언트 생성
    const client = createDynamoDBClient(config);
    
    // FAQ 데이터 준비
    const faqs = prepareFAQs();
    logger.info(`Prepared ${faqs.length} FAQs from CSV data\n`);
    
    // 데이터 삽입
    const results = await insertFAQs(client, faqTableName, faqs);
    
    // 결과 요약
    console.log(chalk.cyan('\n========================================'));
    console.log(chalk.cyan('Summary'));
    console.log(chalk.cyan('========================================'));
    logger.success(`Successfully inserted: ${results.success.length}`);
    if (results.failed.length > 0) {
      logger.error(`Failed: ${results.failed.length}`);
    }
    
    // 데이터 검증
    console.log(chalk.cyan('\n========================================'));
    console.log(chalk.cyan('Data Verification'));
    console.log(chalk.cyan('========================================\n'));
    await verifyData(client, faqTableName);
    
    console.log(chalk.green('\n✨ FAQ seeding completed successfully with CSV data!'));
    
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