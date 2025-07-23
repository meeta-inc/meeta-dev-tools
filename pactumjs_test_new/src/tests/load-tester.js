const PerformanceMonitor = require('./performance-monitor');
const AINaviChatClient = require('../api/client').AINaviChatClient;
const TestCaseLoader = require('../data/test-case-loader');
const SlackService = require('../integrations/slack/client');
const logger = require('../utils/logger');
const config = require('../../config/default');

/**
 * 부하 테스트 실행기
 * 대량의 동시 요청으로 시스템 성능을 검증
 */
class LoadTester {
  constructor(options = {}) {
    this.options = {
      // 부하 테스트 설정
      maxConcurrency: options.maxConcurrency || 10,
      rampUpDuration: options.rampUpDuration || 60000, // 1분
      testDuration: options.testDuration || 300000, // 5분
      rampDownDuration: options.rampDownDuration || 30000, // 30초
      
      // 타겟 RPS (Requests Per Second)
      targetRPS: options.targetRPS || 5,
      
      // 성능 임계값
      responseTimeThreshold: options.responseTimeThreshold || 15000, // 15초
      errorRateThreshold: options.errorRateThreshold || 0.05, // 5%
      
      ...options
    };

    this.client = new AINaviChatClient();
    this.loader = new TestCaseLoader();
    this.monitor = new PerformanceMonitor({
      responseTimeThreshold: this.options.responseTimeThreshold,
      errorRateThreshold: this.options.errorRateThreshold,
      windowSize: 50
    });
    this.slackService = new SlackService();

    // 부하 테스트 상태
    this.isRunning = false;
    this.currentPhase = 'IDLE'; // IDLE, RAMP_UP, STEADY, RAMP_DOWN
    this.activeRequests = new Set();
    this.testCases = [];

    // 이벤트 리스너 설정
    this.setupEventListeners();
  }

  /**
   * 이벤트 리스너 설정
   */
  setupEventListeners() {
    // 성능 알림 처리
    this.monitor.on('alert', (alert) => {
      this.handlePerformanceAlert(alert);
    });

    // 프로세스 종료 시 정리
    process.on('SIGINT', () => {
      this.stop();
    });
  }

  /**
   * 성능 알림 처리
   */
  async handlePerformanceAlert(alert) {
    logger.warn('Performance alert triggered', alert);

    // Slack 알림 전송
    try {
      await this.slackService.sendAlert({
        type: 'LOAD_TEST_ALERT',
        alert,
        currentPhase: this.currentPhase,
        activeRequests: this.activeRequests.size,
        stats: this.monitor.getStats()
      });
    } catch (error) {
      logger.error('Failed to send alert to Slack:', error.message);
    }

    // 심각한 오류인 경우 테스트 중단
    if (alert.type === 'HIGH_ERROR_RATE' && alert.current > 0.2) { // 20% 이상
      logger.error('Critical error rate detected, stopping load test');
      await this.stop();
    }
  }

  /**
   * 테스트 케이스 로드
   */
  async loadTestCases(filters = {}) {
    try {
      // CSV 파일에서 로드
      const csvPath = require('path').join(__dirname, '../data/csv/basic-test-case.csv');
      const csvCases = this.loader.loadFromCSV(csvPath);

      // Excel 파일에서 FAQ 케이스 로드
      const excelPath = require('path').join(__dirname, '../../../resource/314CommunityFAQExample.xlsx');
      const excelCases = this.loader.loadFromExcel(excelPath);

      const allCases = [...csvCases, ...excelCases];
      
      // 필터 적용
      this.loader.testCases = allCases;
      this.testCases = this.loader.filter(filters);

      logger.info(`Loaded ${this.testCases.length} test cases for load testing`, {
        csvCases: csvCases.length,
        excelCases: excelCases.length,
        filtered: this.testCases.length
      });

      return this.testCases;
    } catch (error) {
      logger.error('Failed to load test cases for load testing:', error.message);
      throw error;
    }
  }

  /**
   * 부하 테스트 시작
   */
  async start(filters = {}) {
    if (this.isRunning) {
      throw new Error('Load test is already running');
    }

    try {
      logger.info('Starting load test', this.options);
      
      // 테스트 케이스 로드
      await this.loadTestCases(filters);
      
      if (this.testCases.length === 0) {
        throw new Error('No test cases available for load testing');
      }

      this.isRunning = true;
      this.monitor.reset();

      // Slack 시작 알림
      await this.slackService.sendMessage({
        title: '🚀 Load Test Started',
        message: `Starting load test with ${this.testCases.length} test cases`,
        details: {
          maxConcurrency: this.options.maxConcurrency,
          targetRPS: this.options.targetRPS,
          testDuration: `${this.options.testDuration / 1000}s`,
          filters
        }
      });

      // 단계별 실행
      await this.executePhases();

    } catch (error) {
      logger.error('Load test failed to start:', error.message);
      await this.slackService.sendError('Load test failed to start', {
        error: error.message,
        options: this.options
      });
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * 단계별 부하 테스트 실행
   */
  async executePhases() {
    const phases = [
      { name: 'RAMP_UP', duration: this.options.rampUpDuration, description: 'Ramping up load' },
      { name: 'STEADY', duration: this.options.testDuration, description: 'Steady state testing' },
      { name: 'RAMP_DOWN', duration: this.options.rampDownDuration, description: 'Ramping down load' }
    ];

    for (const phase of phases) {
      if (!this.isRunning) break;

      this.currentPhase = phase.name;
      logger.info(`Starting phase: ${phase.name}`, {
        duration: phase.duration,
        description: phase.description
      });

      await this.executePhase(phase);
      
      // 단계별 중간 리포트
      const stats = this.monitor.getStats();
      logger.info(`Phase ${phase.name} completed`, stats);
    }

    // 최종 리포트 생성
    await this.generateFinalReport();
  }

  /**
   * 개별 단계 실행
   */
  async executePhase(phase) {
    const startTime = Date.now();
    const endTime = startTime + phase.duration;
    
    let requestCount = 0;
    const intervalMs = 1000 / this.options.targetRPS; // 요청 간격

    while (Date.now() < endTime && this.isRunning) {
      // 동시 실행 수 제한
      if (this.activeRequests.size >= this.options.maxConcurrency) {
        await this.waitForRequestSlot();
        continue;
      }

      // 단계별 부하 조절
      const currentConcurrency = this.calculateConcurrency(phase, Date.now() - startTime);
      
      if (this.activeRequests.size >= currentConcurrency) {
        await new Promise(resolve => setTimeout(resolve, 100));
        continue;
      }

      // 랜덤 테스트 케이스 선택
      const testCase = this.testCases[Math.floor(Math.random() * this.testCases.length)];
      
      // 비동기로 요청 실행
      this.executeRequest(testCase, ++requestCount);

      // 요청 간격 대기
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }

    // 현재 단계의 모든 요청 완료 대기
    await this.waitForAllRequests();
  }

  /**
   * 단계별 동시 실행 수 계산
   */
  calculateConcurrency(phase, elapsed) {
    const { name, duration } = phase;
    const progress = elapsed / duration;

    switch (name) {
      case 'RAMP_UP':
        return Math.floor(this.options.maxConcurrency * progress);
      case 'STEADY':
        return this.options.maxConcurrency;
      case 'RAMP_DOWN':
        return Math.floor(this.options.maxConcurrency * (1 - progress));
      default:
        return 1;
    }
  }

  /**
   * 개별 요청 실행
   */
  async executeRequest(testCase, requestId) {
    const requestKey = `${requestId}-${Date.now()}`;
    this.activeRequests.add(requestKey);

    try {
      // 성능 모니터링 시작
      this.monitor.onTestStart(testCase);

      // API 파라미터 준비
      const params = {
        clientId: testCase.clientId || config.defaults.clientId,
        appId: testCase.appId || config.defaults.appId,
        gradeId: testCase.grade,
        userId: `load_test_${requestId}`,
        message: testCase.message,
        sessionId: testCase.sessionId
      };

      // API 호출
      const response = await this.client.sendMessage(params);
      const validation = this.client.validateResponse(response);

      // 결과 기록
      const result = {
        testId: testCase.testId,
        requestId,
        userId: params.userId,
        message: testCase.message,
        grade: testCase.grade,
        statusCode: response.statusCode,
        body: response.body,
        responseTime: response.responseTime,
        success: response.success,
        validation,
        timestamp: new Date().toISOString(),
        phase: this.currentPhase
      };

      // 성능 모니터링 완료
      this.monitor.onTestComplete(result);

    } catch (error) {
      logger.error(`Load test request ${requestId} failed:`, error.message);
      
      // 오류 결과 기록
      this.monitor.onTestComplete({
        testId: testCase.testId,
        requestId,
        statusCode: 'ERROR',
        body: { error: error.message },
        responseTime: 0,
        success: false,
        validation: { isValid: false, errors: [error.message] },
        timestamp: new Date().toISOString(),
        phase: this.currentPhase
      });
    } finally {
      this.activeRequests.delete(requestKey);
    }
  }

  /**
   * 요청 슬롯 대기
   */
  async waitForRequestSlot() {
    while (this.activeRequests.size >= this.options.maxConcurrency && this.isRunning) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  /**
   * 모든 요청 완료 대기
   */
  async waitForAllRequests() {
    while (this.activeRequests.size > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * 최종 리포트 생성
   */
  async generateFinalReport() {
    const stats = this.monitor.getStats();
    const report = {
      testConfiguration: this.options,
      testResults: stats,
      testSummary: {
        status: this.monitor.getHealthStatus(stats),
        passed: stats.summary.errorRate <= this.options.errorRateThreshold,
        duration: stats.summary.duration,
        totalRequests: stats.summary.totalRequests,
        throughput: stats.summary.throughput.toFixed(2) + ' RPS'
      },
      timestamp: new Date().toISOString()
    };

    logger.info('Load test completed', report);

    // Slack 최종 리포트 전송
    await this.slackService.sendMessage({
      title: '📊 Load Test Completed',
      message: `Load test finished with ${stats.summary.totalRequests} requests`,
      details: report.testSummary,
      status: report.testSummary.status
    });

    // 리포트 파일 저장
    const fs = require('fs');
    const path = require('path');
    const reportsDir = path.join(__dirname, '../../reports');
    
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const reportPath = path.join(reportsDir, `load-test-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    logger.info(`Load test report saved: ${reportPath}`);
    return report;
  }

  /**
   * 부하 테스트 중단
   */
  async stop() {
    if (!this.isRunning) return;

    logger.info('Stopping load test...');
    this.isRunning = false;
    this.currentPhase = 'STOPPING';

    // 진행 중인 요청 완료 대기 (최대 30초)
    const timeout = setTimeout(() => {
      logger.warn('Force stopping load test due to timeout');
    }, 30000);

    await this.waitForAllRequests();
    clearTimeout(timeout);

    logger.info('Load test stopped');
    
    // 중단 알림
    await this.slackService.sendMessage({
      title: '⏹️ Load Test Stopped',
      message: 'Load test was manually stopped',
      details: this.monitor.getStats().summary
    });
  }

  /**
   * 실시간 상태 조회
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      currentPhase: this.currentPhase,
      activeRequests: this.activeRequests.size,
      stats: this.monitor.generateRealtimeReport(),
      testCasesCount: this.testCases.length
    };
  }
}

module.exports = LoadTester;