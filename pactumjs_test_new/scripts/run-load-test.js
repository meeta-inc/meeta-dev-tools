#!/usr/bin/env node

const LoadTester = require('../src/tests/load-tester');
const logger = require('../src/utils/logger');

/**
 * 부하 테스트 스크립트
 * 사용 예시:
 * node scripts/run-load-test.js --grade=elementary --max-concurrency=5 --target-rps=2 --duration=60
 */

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    filters: {},
    loadTestOptions: {}
  };

  args.forEach(arg => {
    if (arg.startsWith('--grade=')) {
      options.filters.grade = arg.split('=')[1];
    } else if (arg.startsWith('--category=')) {
      options.filters.category = arg.split('=')[1];
    } else if (arg.startsWith('--max-concurrency=')) {
      options.loadTestOptions.maxConcurrency = parseInt(arg.split('=')[1]);
    } else if (arg.startsWith('--target-rps=')) {
      options.loadTestOptions.targetRPS = parseInt(arg.split('=')[1]);
    } else if (arg.startsWith('--duration=')) {
      options.loadTestOptions.testDuration = parseInt(arg.split('=')[1]) * 1000; // 초를 밀리초로 변환
    } else if (arg.startsWith('--ramp-up=')) {
      options.loadTestOptions.rampUpDuration = parseInt(arg.split('=')[1]) * 1000;
    } else if (arg.startsWith('--ramp-down=')) {
      options.loadTestOptions.rampDownDuration = parseInt(arg.split('=')[1]) * 1000;
    } else if (arg.startsWith('--response-threshold=')) {
      options.loadTestOptions.responseTimeThreshold = parseInt(arg.split('=')[1]);
    } else if (arg.startsWith('--error-threshold=')) {
      options.loadTestOptions.errorRateThreshold = parseFloat(arg.split('=')[1]);
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  });

  return options;
}

function printHelp() {
  console.log(`
AI Navi Chat API Load Tester

Usage: node scripts/run-load-test.js [options]

Test Case Filters:
  --grade=<grade>              Filter by grade (preschool, elementary, middle, high)
  --category=<category>        Filter by test category

Load Test Options:
  --max-concurrency=<num>      Maximum concurrent requests (default: 10)
  --target-rps=<num>          Target requests per second (default: 5)
  --duration=<seconds>         Test duration in seconds (default: 300)
  --ramp-up=<seconds>         Ramp up duration in seconds (default: 60)
  --ramp-down=<seconds>       Ramp down duration in seconds (default: 30)
  --response-threshold=<ms>    Response time threshold in ms (default: 15000)
  --error-threshold=<rate>     Error rate threshold 0.0-1.0 (default: 0.05)

Examples:
  # Basic load test with elementary grade
  node scripts/run-load-test.js --grade=elementary

  # High-intensity load test
  node scripts/run-load-test.js --max-concurrency=20 --target-rps=10 --duration=120

  # Quick performance check
  node scripts/run-load-test.js --duration=30 --ramp-up=10 --ramp-down=5

  # Stress test with strict thresholds
  node scripts/run-load-test.js --max-concurrency=50 --response-threshold=5000 --error-threshold=0.01
`);
}

async function main() {
  const startTime = Date.now();

  try {
    logger.info('Starting AI Navi Chat API Load Test');

    // 인수 파싱
    const { filters, loadTestOptions } = parseArgs();
    
    logger.info('Load test configuration', {
      filters,
      loadTestOptions
    });

    // 부하 테스트 인스턴스 생성
    const loadTester = new LoadTester(loadTestOptions);

    // 진행 상황 모니터링 (10초마다)
    const progressInterval = setInterval(() => {
      const status = loadTester.getStatus();
      logger.info('Load test progress', {
        phase: status.currentPhase,
        activeRequests: status.activeRequests,
        totalRequests: status.stats.summary.totalRequests,
        errorRate: (status.stats.summary.errorRate * 100).toFixed(1) + '%',
        avgResponseTime: Math.round(status.stats.performance.averageResponseTime) + 'ms'
      });
    }, 10000);

    // 부하 테스트 실행
    const report = await loadTester.start(filters);

    clearInterval(progressInterval);

    // 결과 출력
    const duration = Date.now() - startTime;
    const { testSummary, testResults } = report;

    console.log('\n=== Load Test Results ===');
    console.log(`Status: ${testSummary.status}`);
    console.log(`Duration: ${Math.round(duration / 1000)}s`);
    console.log(`Total Requests: ${testResults.summary.totalRequests}`);
    console.log(`Successful: ${testResults.summary.successfulRequests}`);
    console.log(`Failed: ${testResults.summary.failedRequests}`);
    console.log(`Error Rate: ${(testResults.summary.errorRate * 100).toFixed(2)}%`);
    console.log(`Throughput: ${testResults.summary.throughput.toFixed(2)} RPS`);
    console.log(`Avg Response Time: ${Math.round(testResults.performance.averageResponseTime)}ms`);
    console.log(`95th Percentile: ${Math.round(testResults.performance.p95ResponseTime)}ms`);
    console.log(`99th Percentile: ${Math.round(testResults.performance.p99ResponseTime)}ms`);
    console.log(`Peak Concurrency: ${testResults.concurrency.peakConcurrency}`);

    if (Object.keys(testResults.errors.byType).length > 0) {
      console.log('\nError Breakdown:');
      Object.entries(testResults.errors.byType).forEach(([type, count]) => {
        console.log(`  ${type}: ${count}`);
      });
    }

    // 성공/실패 판정
    const passed = testSummary.passed;
    console.log(`\n=== Test ${passed ? 'PASSED' : 'FAILED'} ===`);

    process.exit(passed ? 0 : 1);

  } catch (error) {
    logger.error('Load test failed:', error.message);
    console.error('\n=== Load Test FAILED ===');
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

// 스크립트가 직접 실행된 경우에만 main 함수 호출
if (require.main === module) {
  main();
}

module.exports = { main, parseArgs };