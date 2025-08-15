#!/usr/bin/env node

/**
 * FAQ 카테고리 데이터 전체 삭제 스크립트
 * 사용법: node delete-all-categories.js [--env <environment>]
 */

const { Command } = require('commander');
const { ScanCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const { getConfig } = require('../../config/environments/config');
const { createDynamoDBClient } = require('../../utils/dynamodb-client');
const { logger } = require('../../utils/helpers');
const chalk = require('chalk');

// CLI 설정
const program = new Command();
program
  .name('delete-all-categories')
  .description('FAQ 카테고리 데이터를 모두 삭제합니다')
  .option('-e, --env <environment>', '환경 설정 (dev, uat1, prd 등)', 'dev')
  .option('-y, --yes', '확인 없이 삭제', false)
  .parse(process.argv);

const options = program.opts();

/**
 * 모든 카테고리 삭제
 */
async function deleteAllCategories(client, tableName) {
  logger.info('Scanning for all category items...');
  
  // 모든 카테고리 항목 스캔 (Notion 문서의 구조에 맞게)
  const scanCommand = new ScanCommand({
    TableName: tableName,
    FilterExpression: 'begins_with(PK, :pkPrefix) AND begins_with(SK, :skPrefix)',
    ExpressionAttributeValues: {
      ':pkPrefix': 'CLIENT#',
      ':skPrefix': 'CATEGORY#'
    }
  });
  
  const result = await client.send(scanCommand);
  
  if (result.Items.length === 0) {
    logger.info('No categories found to delete.');
    return 0;
  }
  
  logger.warning(`Found ${result.Items.length} categories to delete.`);
  
  // 각 항목 삭제
  let deletedCount = 0;
  for (const item of result.Items) {
    try {
      const deleteCommand = new DeleteCommand({
        TableName: tableName,
        Key: {
          PK: item.PK,
          SK: item.SK
        }
      });
      
      await client.send(deleteCommand);
      logger.success(`Deleted: ${item.PK} / ${item.SK}`);
      deletedCount++;
    } catch (error) {
      logger.error(`Failed to delete: ${item.PK} / ${item.SK} - ${error.message}`);
    }
  }
  
  return deletedCount;
}

/**
 * 메인 실행 함수
 */
async function main() {
  console.log(chalk.red('========================================'));
  console.log(chalk.red('⚠️  FAQ Category Data Deletion'));
  console.log(chalk.red('========================================\n'));
  
  try {
    // 환경 설정 로드
    const config = getConfig(options.env);
    logger.info(`Environment: ${chalk.yellow(options.env)}`);
    logger.info(`Table: ${chalk.yellow(config.tables.faqCategory)}`);
    
    // 확인 프롬프트
    if (!options.yes) {
      console.log(chalk.red('\n⚠️  WARNING: This will delete ALL category data!'));
      console.log(chalk.yellow('Type "DELETE" to confirm: '));
      
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      const answer = await new Promise(resolve => {
        readline.question('', resolve);
      });
      readline.close();
      
      if (answer !== 'DELETE') {
        logger.info('Deletion cancelled.');
        process.exit(0);
      }
    }
    
    // DynamoDB 클라이언트 생성
    const client = createDynamoDBClient(config);
    
    // 카테고리 삭제
    const deletedCount = await deleteAllCategories(client, config.tables.faqCategory);
    
    console.log(chalk.green(`\n✓ Deleted ${deletedCount} categories successfully.`));
    
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