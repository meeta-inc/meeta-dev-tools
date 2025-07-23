const EventEmitter = require('events');
const logger = require('../utils/logger');

/**
 * 성능 모니터링 클래스
 * API 응답 시간, 처리량, 오류율 등을 실시간 모니터링
 */
class PerformanceMonitor extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      alertThresholds: {
        responseTime: options.responseTimeThreshold || 10000, // 10초
        errorRate: options.errorRateThreshold || 0.1, // 10%
        concurrentRequests: options.concurrentThreshold || 20
      },
      windowSize: options.windowSize || 100, // 100개 요청 단위로 분석
      ...options
    };

    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      responseTimes: [],
      errorsByType: {},
      concurrentRequests: 0,
      peakConcurrency: 0,
      startTime: Date.now()
    };

    this.recentResults = []; // 최근 결과 윈도우
  }

  /**
   * 테스트 시작 시 호출
   */
  onTestStart(testCase) {
    this.metrics.concurrentRequests++;
    this.metrics.peakConcurrency = Math.max(
      this.metrics.peakConcurrency, 
      this.metrics.concurrentRequests
    );

    logger.debug('Test started', {
      testId: testCase.testId,
      concurrentRequests: this.metrics.concurrentRequests
    });

    // 동시 요청 수 임계값 검사
    if (this.metrics.concurrentRequests > this.options.alertThresholds.concurrentRequests) {
      this.emit('alert', {
        type: 'HIGH_CONCURRENCY',
        message: `High concurrent requests: ${this.metrics.concurrentRequests}`,
        threshold: this.options.alertThresholds.concurrentRequests,
        current: this.metrics.concurrentRequests
      });
    }
  }

  /**
   * 테스트 완료 시 호출
   */
  onTestComplete(testResult) {
    this.metrics.concurrentRequests--;
    this.metrics.totalRequests++;
    
    const { success, responseTime, validation, testId } = testResult;

    // 응답 시간 기록
    if (responseTime) {
      this.metrics.responseTimes.push(responseTime);
    }

    // 성공/실패 카운트
    if (success && validation?.isValid) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
      
      // 오류 타입별 집계
      const errorType = this.categorizeError(testResult);
      this.metrics.errorsByType[errorType] = (this.metrics.errorsByType[errorType] || 0) + 1;
    }

    // 최근 결과 윈도우 업데이트
    this.recentResults.push(testResult);
    if (this.recentResults.length > this.options.windowSize) {
      this.recentResults.shift();
    }

    // 성능 알림 검사
    this.checkPerformanceAlerts(testResult);

    logger.debug('Test completed', {
      testId,
      success,
      responseTime,
      totalRequests: this.metrics.totalRequests,
      errorRate: this.getErrorRate()
    });
  }

  /**
   * 오류 타입 분류
   */
  categorizeError(testResult) {
    const { statusCode, validation, body } = testResult;
    
    if (statusCode === 'ERROR') {
      return 'NETWORK_ERROR';
    } else if (statusCode >= 500) {
      return 'SERVER_ERROR';
    } else if (statusCode >= 400) {
      return 'CLIENT_ERROR';
    } else if (!validation?.isValid) {
      return 'VALIDATION_ERROR';
    } else {
      return 'UNKNOWN_ERROR';
    }
  }

  /**
   * 성능 알림 검사
   */
  checkPerformanceAlerts(testResult) {
    const { responseTime } = testResult;

    // 응답 시간 알림
    if (responseTime > this.options.alertThresholds.responseTime) {
      this.emit('alert', {
        type: 'SLOW_RESPONSE',
        message: `Slow response detected: ${responseTime}ms`,
        threshold: this.options.alertThresholds.responseTime,
        current: responseTime,
        testId: testResult.testId
      });
    }

    // 오류율 알림 (최근 윈도우 기준)
    if (this.recentResults.length >= 10) { // 최소 10개 샘플
      const recentErrorRate = this.getRecentErrorRate();
      if (recentErrorRate > this.options.alertThresholds.errorRate) {
        this.emit('alert', {
          type: 'HIGH_ERROR_RATE',
          message: `High error rate detected: ${(recentErrorRate * 100).toFixed(1)}%`,
          threshold: this.options.alertThresholds.errorRate,
          current: recentErrorRate,
          windowSize: this.recentResults.length
        });
      }
    }
  }

  /**
   * 전체 통계 반환
   */
  getStats() {
    const duration = Date.now() - this.metrics.startTime;
    const responseTimes = this.metrics.responseTimes.filter(rt => rt > 0);

    return {
      summary: {
        totalRequests: this.metrics.totalRequests,
        successfulRequests: this.metrics.successfulRequests,
        failedRequests: this.metrics.failedRequests,
        errorRate: this.getErrorRate(),
        duration: duration,
        throughput: this.metrics.totalRequests / (duration / 1000) // requests per second
      },
      performance: {
        averageResponseTime: responseTimes.length ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0,
        minResponseTime: responseTimes.length ? Math.min(...responseTimes) : 0,
        maxResponseTime: responseTimes.length ? Math.max(...responseTimes) : 0,
        p95ResponseTime: this.getPercentile(responseTimes, 0.95),
        p99ResponseTime: this.getPercentile(responseTimes, 0.99)
      },
      concurrency: {
        peakConcurrency: this.metrics.peakConcurrency,
        currentConcurrency: this.metrics.concurrentRequests
      },
      errors: {
        byType: this.metrics.errorsByType,
        recentErrorRate: this.getRecentErrorRate()
      }
    };
  }

  /**
   * 전체 오류율 계산
   */
  getErrorRate() {
    if (this.metrics.totalRequests === 0) return 0;
    return this.metrics.failedRequests / this.metrics.totalRequests;
  }

  /**
   * 최근 윈도우 오류율 계산
   */
  getRecentErrorRate() {
    if (this.recentResults.length === 0) return 0;
    
    const recentFailures = this.recentResults.filter(result => 
      !result.success || !result.validation?.isValid
    ).length;
    
    return recentFailures / this.recentResults.length;
  }

  /**
   * 백분위수 계산
   */
  getPercentile(arr, percentile) {
    if (arr.length === 0) return 0;
    
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * percentile) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * 실시간 성능 리포트 생성
   */
  generateRealtimeReport() {
    const stats = this.getStats();
    
    return {
      timestamp: new Date().toISOString(),
      status: this.getHealthStatus(stats),
      ...stats
    };
  }

  /**
   * 시스템 상태 판단
   */
  getHealthStatus(stats) {
    const { errorRate } = stats.summary;
    const { averageResponseTime } = stats.performance;

    if (errorRate > this.options.alertThresholds.errorRate * 2) {
      return 'CRITICAL';
    } else if (errorRate > this.options.alertThresholds.errorRate || 
               averageResponseTime > this.options.alertThresholds.responseTime) {
      return 'WARNING';
    } else {
      return 'HEALTHY';
    }
  }

  /**
   * 성능 데이터 리셋
   */
  reset() {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      responseTimes: [],
      errorsByType: {},
      concurrentRequests: 0,
      peakConcurrency: 0,
      startTime: Date.now()
    };
    
    this.recentResults = [];
    logger.info('Performance monitor reset');
  }
}

module.exports = PerformanceMonitor;