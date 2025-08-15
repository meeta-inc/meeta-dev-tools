#!/usr/bin/env node

/**
 * FAQ 카테고리 데이터 시딩 스크립트
 * 사용법: node seed-categories.js [--env <environment>]
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
  .name('seed-categories')
  .description('FAQ 카테고리 데이터를 DynamoDB에 시딩합니다')
  .option('-e, --env <environment>', '환경 설정 (dev, uat1, prd 등)', 'dev')
  .option('-f, --force', '기존 데이터 덮어쓰기', false)
  .parse(process.argv);

const options = program.opts();

// 카테고리 데이터
const categoriesData = [
  // RS000001 클라이언트
  {
    clientId: 'RS000001',
    appId: '0001',
    categoryName: '授業・カリキュラム',
    sortOrder: 1,
    icon: {
      type: 'icon',
      value: 'https://meeta-ai-navi.s3.ap-northeast-1.amazonaws.com/icon/Teacher.svg'
    },
    targetAttributes: ['幼児', '小学生', '中学生', '高校生'],
    faqCount: 5
  },
  {
    clientId: 'RS000001',
    appId: '0001',
    categoryName: '通塾・学習時間',
    sortOrder: 2,
    icon: {
      type: 'icon',
      value: 'https://meeta-ai-navi.s3.ap-northeast-1.amazonaws.com/icon/School.svg'
    },
    targetAttributes: ['幼児', '小学生', '中学生', '高校生'],
    faqCount: 5
  },
  {
    clientId: 'RS000001',
    appId: '0001',
    categoryName: '料金・制度',
    sortOrder: 3,
    icon: {
      type: 'icon',
      value: 'https://meeta-ai-navi.s3.ap-northeast-1.amazonaws.com/icon/Yen_Banknote.svg'
    },
    targetAttributes: ['幼児', '小学生', '中学生', '高校生'],
    faqCount: 5
  },
  // MM000002 클라이언트
  {
    clientId: 'MM000002',
    appId: '0001',
    categoryName: '授業・カリキュラム',
    sortOrder: 1,
    icon: {
      type: 'icon',
      value: 'https://meeta-ai-navi.s3.ap-northeast-1.amazonaws.com/icon/Teacher.svg'
    },
    targetAttributes: ['小学生', '中学生', '高校生'],
    faqCount: 5
  },
  {
    clientId: 'MM000002',
    appId: '0001',
    categoryName: '通塾・学習時間',
    sortOrder: 2,
    icon: {
      type: 'icon',
      value: 'https://meeta-ai-navi.s3.ap-northeast-1.amazonaws.com/icon/School.svg'
    },
    targetAttributes: ['小学生', '中学生', '高校生'],
    faqCount: 5
  },
  {
    clientId: 'MM000002',
    appId: '0001',
    categoryName: '料金・制度',
    sortOrder: 3,
    icon: {
      type: 'icon',
      value: 'https://meeta-ai-navi.s3.ap-northeast-1.amazonaws.com/icon/Yen_Banknote.svg'
    },
    targetAttributes: ['小学生', '中学生', '高校生'],
    faqCount: 5
  }
];

/**
 * 카테고리 데이터 준비
 */
function prepareCategories() {
  const timestamp = getCurrentTimestamp();
  const adminEmail = 'admin@chatbot-studio.jp';
  
  return categoriesData.map((category, index) => {
    const categoryId = generateSequenceId('CAT', index);
    
    return {
      // Notion 문서의 Single Table Design 키 구조
      // PK: CLIENT#<clientId>#APP#<appId>
      // SK: CATEGORY#<categoryId>
      PK: `CLIENT#${category.clientId}#APP#${category.appId}`,
      SK: `CATEGORY#${categoryId}`,
      
      // 카테고리 속성
      categoryId: categoryId,
      parentCategoryId: 'ROOT', // 최상위 카테고리
      clientId: category.clientId,
      appId: category.appId,
      categoryName: category.categoryName,
      categoryDescription: `${category.categoryName}に関するよくある質問`,
      sortOrder: category.sortOrder,
      icon: category.icon,
      targetAttributes: category.targetAttributes,
      faqCount: category.faqCount,
      isActive: true,
      displaySettings: {
        showInMenu: true,
        showInSearch: true,
        expandByDefault: false
      },
      metadata: {
        tags: ['auto-generated', 'initial-setup'],
        version: '1.0.0'
      },
      createdAt: timestamp,
      createdBy: adminEmail,
      updatedAt: timestamp,
      updatedBy: adminEmail
    };
  });
}

/**
 * 카테고리 데이터 삽입
 */
async function insertCategories(client, tableName, categories) {
  logger.info(`Starting to insert ${categories.length} categories...`);
  
  const results = {
    success: [],
    failed: []
  };
  
  for (const category of categories) {
    try {
      const command = new PutCommand({
        TableName: tableName,
        Item: category,
        ConditionExpression: options.force ? undefined : 'attribute_not_exists(categoryId)'
      });
      
      await client.send(command);
      
      logger.success(`Added: ${category.categoryId} - ${category.clientId} - ${category.categoryName}`);
      console.log(chalk.gray(`  Category ID: ${category.categoryId}`));
      console.log(chalk.gray(`  Client: ${category.clientId}`));
      console.log(chalk.gray(`  Name: ${category.categoryName}`));
      console.log(chalk.gray(`  Order: ${category.sortOrder}`));
      console.log(chalk.gray(`  Target: ${category.targetAttributes.join(', ')}\n`));
      
      results.success.push(category);
    } catch (error) {
      if (error.name === 'ConditionalCheckFailedException') {
        logger.warning(`Skipped (already exists): ${category.categoryId}`);
      } else {
        logger.error(`Failed: ${category.clientId} - ${category.categoryName}: ${error.message}`);
        results.failed.push({ category, error: error.message });
      }
    }
  }
  
  return results;
}

/**
 * 삽입된 데이터 검증
 */
async function verifyData(client, tableName) {
  logger.info('Verifying inserted data...\n');
  
  try {
    const command = new ScanCommand({
      TableName: tableName,
      FilterExpression: 'begins_with(PK, :pkPrefix) AND begins_with(SK, :skPrefix)',
      ExpressionAttributeValues: {
        ':pkPrefix': 'CLIENT#',
        ':skPrefix': 'CATEGORY#'
      }
    });
    
    const result = await client.send(command);
    
    logger.success(`Total ${result.Items.length} categories found.\n`);
    
    // 클라이언트별로 그룹화
    const byClient = {};
    result.Items.forEach(item => {
      if (!byClient[item.clientId]) {
        byClient[item.clientId] = [];
      }
      byClient[item.clientId].push(item);
    });
    
    // 클라이언트별 출력
    Object.keys(byClient).sort().forEach(clientId => {
      console.log(chalk.cyan(`📁 Client: ${clientId}`));
      byClient[clientId]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .forEach(item => {
          console.log(chalk.gray(`   ${item.sortOrder}. ${item.categoryName} (ID: ${item.categoryId})`));
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
  console.log(chalk.cyan('FAQ Category Data Seeding'));
  console.log(chalk.cyan('========================================\n'));
  
  try {
    // 환경 설정 로드
    const config = getConfig(options.env);
    logger.info(`Environment: ${chalk.yellow(options.env)}`);
    logger.info(`Table: ${chalk.yellow(config.tables.faqCategory)}`);
    logger.info(`Region: ${chalk.yellow(config.region)}`);
    logger.info(`Profile: ${chalk.yellow(config.profile)}\n`);
    
    // DynamoDB 클라이언트 생성
    const client = createDynamoDBClient(config);
    
    // 카테고리 데이터 준비
    const categories = prepareCategories();
    
    // 데이터 삽입
    const results = await insertCategories(client, config.tables.faqCategory, categories);
    
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
    await verifyData(client, config.tables.faqCategory);
    
    console.log(chalk.green('\n✨ FAQ category seeding completed successfully!'));
    
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