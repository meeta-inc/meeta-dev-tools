#!/usr/bin/env node

/**
 * FAQ 데이터 검증 스크립트
 * DynamoDB에 저장된 FAQ의 서브버블과 CSV 데이터 비교
 */

const { Command } = require('commander');
const { ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { getConfig } = require('../../config/environments/config');
const { createDynamoDBClient } = require('../../utils/dynamodb-client');
const { logger } = require('../../utils/helpers');
const chalk = require('chalk');

// CLI 설정
const program = new Command();
program
  .name('verify-faqs')
  .description('DynamoDB의 FAQ 데이터를 검증합니다')
  .option('-e, --env <environment>', '환경 설정 (dev, uat1, prd 등)', 'dev')
  .option('-s, --sample <number>', '샘플 개수', '10')
  .parse(process.argv);

const options = program.opts();

/**
 * 메인 실행 함수
 */
async function main() {
  console.log(chalk.cyan('========================================'));
  console.log(chalk.cyan('FAQ Data Verification'));
  console.log(chalk.cyan('========================================\n'));
  
  try {
    // 환경 설정 로드
    const config = getConfig(options.env);
    const faqTableName = config.tables.faq || 'ai-navi-faq-table-dev';
    
    logger.info(`Environment: ${chalk.yellow(options.env)}`);
    logger.info(`Table: ${chalk.yellow(faqTableName)}\n`);
    
    // DynamoDB 클라이언트 생성
    const client = createDynamoDBClient(config);
    
    // FAQ 데이터 조회
    const command = new ScanCommand({
      TableName: faqTableName,
      FilterExpression: 'begins_with(PK, :pkPrefix) AND begins_with(SK, :skPrefix)',
      ExpressionAttributeValues: {
        ':pkPrefix': 'CLIENT#',
        ':skPrefix': 'FAQ#'
      }
    });
    
    const result = await client.send(command);
    
    logger.success(`Total ${result.Items.length} FAQs found.\n`);
    
    // 샘플 데이터 출력
    const sampleSize = Math.min(parseInt(options.sample), result.Items.length);
    console.log(chalk.cyan(`📝 Sample FAQs (${sampleSize} items):\n`));
    
    // sourceId로 정렬
    const sortedItems = result.Items.sort((a, b) => {
      const aId = a.metadata?.sourceId || '';
      const bId = b.metadata?.sourceId || '';
      return aId.localeCompare(bId);
    });
    
    for (let i = 0; i < sampleSize; i++) {
      const item = sortedItems[i];
      console.log(chalk.yellow(`[${i + 1}] ${item.metadata?.sourceId || 'N/A'}`));
      console.log(chalk.gray(`  Question: ${item.question?.substring(0, 50)}...`));
      console.log(chalk.gray(`  Main Bubble: ${item.mainBubble?.substring(0, 50)}...`));
      
      if (item.subBubble) {
        console.log(chalk.green(`  ✓ Sub Bubble: ${item.subBubble.substring(0, 80)}...`));
      } else {
        console.log(chalk.red(`  ✗ Sub Bubble: null`));
      }
      
      if (item.ctaBubble) {
        console.log(chalk.blue(`  CTA Bubble: ${item.ctaBubble.substring(0, 50)}...`));
      }
      
      console.log();
    }
    
    // 통계
    const withSubBubble = result.Items.filter(item => item.subBubble && item.subBubble !== 'null');
    const withCtaBubble = result.Items.filter(item => item.ctaBubble && item.ctaBubble !== 'null');
    const withAttachments = result.Items.filter(item => item.attachments && item.attachments.length > 0);
    
    console.log(chalk.cyan('========================================'));
    console.log(chalk.cyan('Statistics'));
    console.log(chalk.cyan('========================================'));
    console.log(chalk.green(`✓ FAQs with SubBubble: ${withSubBubble.length}/${result.Items.length}`));
    console.log(chalk.blue(`✓ FAQs with CTA Bubble: ${withCtaBubble.length}/${result.Items.length}`));
    console.log(chalk.magenta(`✓ FAQs with Attachments: ${withAttachments.length}/${result.Items.length}`));
    
    // 서브버블이 없는 FAQ 목록
    const noSubBubble = result.Items.filter(item => !item.subBubble || item.subBubble === 'null');
    if (noSubBubble.length > 0) {
      console.log(chalk.yellow(`\n⚠️  FAQs without SubBubble (${noSubBubble.length}):`));
      noSubBubble.forEach(item => {
        console.log(chalk.gray(`   - ${item.metadata?.sourceId}: ${item.question?.substring(0, 40)}...`));
      });
    }
    
  } catch (error) {
    logger.error(`Verification failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// 스크립트 실행
if (require.main === module) {
  main();
}