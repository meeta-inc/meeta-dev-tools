/**
 * 공통 헬퍼 함수
 */

const chalk = require('chalk');

/**
 * 현재 ISO 8601 타임스탬프 생성
 * @returns {string} ISO 8601 형식의 타임스탬프
 */
function getCurrentTimestamp() {
  return new Date().toISOString();
}

/**
 * 시퀀스 ID 생성 (YYYYMMDD + 4자리 일련번호)
 * @param {string} prefix - ID 접두사
 * @param {number} index - 일련번호
 * @returns {string} 생성된 ID
 */
function generateSequenceId(prefix, index) {
  const date = new Date();
  const dateStr = date.getFullYear() +
    String(date.getMonth() + 1).padStart(2, '0') +
    String(date.getDate()).padStart(2, '0');
  const sequence = String(index + 1).padStart(4, '0');
  return `${prefix}${dateStr}${sequence}`;
}

/**
 * 콘솔 로그 헬퍼
 */
const logger = {
  info: (message) => console.log(chalk.blue('ℹ'), message),
  success: (message) => console.log(chalk.green('✓'), message),
  error: (message) => console.log(chalk.red('✗'), message),
  warning: (message) => console.log(chalk.yellow('⚠'), message),
  debug: (message) => {
    if (process.env.DEBUG) {
      console.log(chalk.gray('⚙'), message);
    }
  }
};

/**
 * 배치 처리 헬퍼
 * @param {Array} items - 처리할 항목들
 * @param {number} batchSize - 배치 크기
 * @param {Function} processor - 처리 함수
 */
async function processBatch(items, batchSize, processor) {
  const results = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    logger.debug(`Processing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(items.length / batchSize)}`);
    
    try {
      const batchResults = await Promise.all(
        batch.map(item => processor(item))
      );
      results.push(...batchResults);
    } catch (error) {
      logger.error(`Batch processing failed: ${error.message}`);
      throw error;
    }
  }
  
  return results;
}

/**
 * 재시도 로직
 * @param {Function} fn - 실행할 함수
 * @param {number} maxRetries - 최대 재시도 횟수
 * @param {number} delay - 재시도 간 지연 시간 (ms)
 */
async function retry(fn, maxRetries = 3, delay = 1000) {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      logger.warning(`Attempt ${i + 1} failed: ${error.message}`);
      
      if (i < maxRetries - 1) {
        logger.debug(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

module.exports = {
  getCurrentTimestamp,
  generateSequenceId,
  logger,
  processBatch,
  retry
};