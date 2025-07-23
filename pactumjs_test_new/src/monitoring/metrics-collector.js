const EventEmitter = require('events');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

/**
 * 메트릭 수집 및 분석 클래스
 * 테스트 실행 중 성능 데이터를 수집하고 분석하여 인사이트 제공
 */
class MetricsCollector extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      enableRealTimeAnalysis: options.enableRealTimeAnalysis !== false,
      metricsRetentionDays: options.metricsRetentionDays || 30,
      anomalyDetectionThreshold: options.anomalyDetectionThreshold || 2.0, // 표준편차 배수
      performanceBaseline: options.performanceBaseline || {
        avgResponseTime: 5000, // 5초
        successRate: 0.95, // 95%
        maxConcurrency: 10
      },
      ...options
    };

    this.metrics = {
      sessions: new Map(), // 세션별 메트릭
      historical: [], // 과거 데이터
      realtime: {
        requestsPerSecond: [],
        responseTimeMovingAvg: [],
        errorRateMovingAvg: [],
        concurrencyLevels: []
      }
    };

    this.anomalies = [];
    this.insights = [];
    
    // 메트릭 저장 디렉토리 생성
    this.metricsDir = path.join(__dirname, '../../reports/metrics');
    this.ensureMetricsDir();
    
    // 과거 데이터 로드
    this.loadHistoricalData();
    
    // 실시간 분석 타이머
    if (this.options.enableRealTimeAnalysis) {
      this.analysisInterval = setInterval(() => {
        this.performRealtimeAnalysis();
      }, 10000); // 10초마다 분석
    }
  }

  /**
   * 메트릭 디렉토리 생성
   */
  ensureMetricsDir() {
    if (!fs.existsSync(this.metricsDir)) {
      fs.mkdirSync(this.metricsDir, { recursive: true });
    }
  }

  /**
   * 과거 메트릭 데이터 로드
   */
  loadHistoricalData() {
    try {
      const historicalFile = path.join(this.metricsDir, 'historical.json');
      if (fs.existsSync(historicalFile)) {
        const data = JSON.parse(fs.readFileSync(historicalFile, 'utf8'));
        this.metrics.historical = data.filter(entry => {
          // 보존 기간 내의 데이터만 로드
          const entryDate = new Date(entry.timestamp);
          const cutoffDate = new Date(Date.now() - (this.options.metricsRetentionDays * 24 * 60 * 60 * 1000));
          return entryDate > cutoffDate;
        });
        
        logger.info(`Loaded ${this.metrics.historical.length} historical metric entries`);
      }
    } catch (error) {
      logger.warn('Failed to load historical metrics:', error.message);
      this.metrics.historical = [];
    }
  }

  /**
   * 테스트 세션 시작
   */
  startSession(sessionId, testConfiguration) {
    const session = {
      sessionId,
      testConfiguration,
      startTime: Date.now(),
      endTime: null,
      metrics: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        responseTimes: [],
        errorsByType: {},
        concurrencyPeaks: [],
        throughputData: [],
        validationErrors: []
      },
      insights: [],
      anomalies: []
    };

    this.metrics.sessions.set(sessionId, session);
    
    logger.info('Metrics collection started for session', {
      sessionId,
      testConfiguration: testConfiguration
    });

    this.emit('sessionStarted', { sessionId, session });
    return session;
  }

  /**
   * 테스트 결과 기록
   */
  recordTestResult(sessionId, testResult) {
    const session = this.metrics.sessions.get(sessionId);
    if (!session) {
      logger.warn('Session not found for metrics recording:', sessionId);
      return;
    }

    const { success, responseTime, validation, statusCode, testId, grade } = testResult;

    // 기본 메트릭 업데이트
    session.metrics.totalRequests++;
    
    if (success && validation?.isValid) {
      session.metrics.successfulRequests++;
    } else {
      session.metrics.failedRequests++;
      
      // 오류 타입별 분류
      const errorType = this.categorizeError(testResult);
      session.metrics.errorsByType[errorType] = (session.metrics.errorsByType[errorType] || 0) + 1;
      
      // 검증 오류 상세 기록
      if (validation && !validation.isValid) {
        session.metrics.validationErrors.push({
          testId,
          errors: validation.errors,
          timestamp: Date.now()
        });
      }
    }

    // 응답 시간 기록
    if (responseTime && responseTime > 0) {
      session.metrics.responseTimes.push({
        time: responseTime,
        timestamp: Date.now(),
        grade,
        testId
      });
    }

    // 실시간 메트릭 업데이트
    this.updateRealtimeMetrics(session, testResult);

    // 이상 상황 감지
    this.detectAnomalies(sessionId, testResult);

    logger.debug('Test result recorded for metrics', {
      sessionId,
      testId,
      success,
      responseTime
    });
  }

  /**
   * 실시간 메트릭 업데이트
   */
  updateRealtimeMetrics(session, testResult) {
    const now = Date.now();
    const window = 60000; // 1분 윈도우

    // RPS 계산
    const recentRequests = session.metrics.responseTimes.filter(rt => 
      now - rt.timestamp < window
    ).length;
    const rps = recentRequests / (window / 1000);
    
    this.metrics.realtime.requestsPerSecond.push({
      value: rps,
      timestamp: now
    });

    // 이동 평균 응답 시간
    const recentResponseTimes = session.metrics.responseTimes
      .filter(rt => now - rt.timestamp < window)
      .map(rt => rt.time);
    
    if (recentResponseTimes.length > 0) {
      const avgResponseTime = recentResponseTimes.reduce((a, b) => a + b, 0) / recentResponseTimes.length;
      this.metrics.realtime.responseTimeMovingAvg.push({
        value: avgResponseTime,
        timestamp: now
      });
    }

    // 오류율 이동 평균
    const recentTotal = session.metrics.totalRequests;
    const recentFailed = session.metrics.failedRequests;
    const errorRate = recentTotal > 0 ? recentFailed / recentTotal : 0;
    
    this.metrics.realtime.errorRateMovingAvg.push({
      value: errorRate,
      timestamp: now
    });

    // 실시간 데이터 크기 제한 (최근 100개 포인트만 유지)
    ['requestsPerSecond', 'responseTimeMovingAvg', 'errorRateMovingAvg'].forEach(metric => {
      if (this.metrics.realtime[metric].length > 100) {
        this.metrics.realtime[metric] = this.metrics.realtime[metric].slice(-100);
      }
    });
  }

  /**
   * 이상 상황 감지
   */
  detectAnomalies(sessionId, testResult) {
    const session = this.metrics.sessions.get(sessionId);
    const { responseTime, success, validation } = testResult;

    // 응답 시간 이상 감지
    if (responseTime && responseTime > 0) {
      const baseline = this.options.performanceBaseline.avgResponseTime;
      const threshold = baseline * this.options.anomalyDetectionThreshold;
      
      if (responseTime > threshold) {
        this.recordAnomaly(sessionId, {
          type: 'SLOW_RESPONSE',
          severity: responseTime > threshold * 2 ? 'HIGH' : 'MEDIUM',
          details: {
            responseTime,
            threshold,
            baseline,
            testId: testResult.testId
          },
          timestamp: Date.now()
        });
      }
    }

    // 연속 실패 감지
    const recentResults = Array.from(this.metrics.sessions.values())
      .flatMap(s => s.metrics.validationErrors)
      .filter(error => Date.now() - error.timestamp < 30000) // 최근 30초
      .length;

    if (recentResults >= 5) {
      this.recordAnomaly(sessionId, {
        type: 'HIGH_FAILURE_RATE',
        severity: 'HIGH',
        details: {
          recentFailures: recentResults,
          timeWindow: '30 seconds'
        },
        timestamp: Date.now()
      });
    }
  }

  /**
   * 이상 상황 기록
   */
  recordAnomaly(sessionId, anomaly) {
    const session = this.metrics.sessions.get(sessionId);
    if (session) {
      session.anomalies.push(anomaly);
    }
    
    this.anomalies.push({
      sessionId,
      ...anomaly
    });

    logger.warn('Anomaly detected', {
      sessionId,
      type: anomaly.type,
      severity: anomaly.severity,
      details: anomaly.details
    });

    this.emit('anomalyDetected', { sessionId, anomaly });
  }

  /**
   * 실시간 분석 수행
   */
  performRealtimeAnalysis() {
    try {
      // 성능 트렌드 분석
      this.analyzePerformanceTrends();
      
      // 용량 분석
      this.analyzeCapacity();
      
      // 오류 패턴 분석
      this.analyzeErrorPatterns();
      
      this.emit('realtimeAnalysisComplete', {
        insights: this.insights,
        anomalies: this.anomalies
      });
      
    } catch (error) {
      logger.error('Realtime analysis failed:', error.message);
    }
  }

  /**
   * 성능 트렌드 분석
   */
  analyzePerformanceTrends() {
    const responseTimeData = this.metrics.realtime.responseTimeMovingAvg.slice(-20); // 최근 20개 포인트
    
    if (responseTimeData.length < 10) return;

    // 트렌드 계산 (선형 회귀)
    const trend = this.calculateTrend(responseTimeData.map((d, i) => [i, d.value]));
    
    if (Math.abs(trend.slope) > 100) { // 100ms/포인트 이상 변화
      const insight = {
        type: 'PERFORMANCE_TREND',
        category: trend.slope > 0 ? 'DEGRADING' : 'IMPROVING',
        severity: Math.abs(trend.slope) > 500 ? 'HIGH' : 'MEDIUM',
        details: {
          slope: trend.slope,
          correlation: trend.correlation,
          description: trend.slope > 0 
            ? 'Response times are increasing over time'
            : 'Response times are improving over time'
        },
        timestamp: Date.now()
      };
      
      this.insights.push(insight);
      this.emit('insightGenerated', insight);
    }
  }

  /**
   * 용량 분석
   */
  analyzeCapacity() {
    const rpsData = this.metrics.realtime.requestsPerSecond.slice(-10);
    const errorData = this.metrics.realtime.errorRateMovingAvg.slice(-10);
    
    if (rpsData.length < 5 || errorData.length < 5) return;

    const avgRPS = rpsData.reduce((sum, d) => sum + d.value, 0) / rpsData.length;
    const avgErrorRate = errorData.reduce((sum, d) => sum + d.value, 0) / errorData.length;
    
    // 용량 한계 접근 감지
    if (avgRPS > 8 && avgErrorRate > 0.1) { // 8 RPS 이상, 10% 이상 오류율
      const insight = {
        type: 'CAPACITY_WARNING',
        category: 'RESOURCE_LIMIT',
        severity: avgErrorRate > 0.2 ? 'HIGH' : 'MEDIUM',
        details: {
          currentRPS: avgRPS,
          errorRate: avgErrorRate,
          description: 'System may be approaching capacity limits'
        },
        timestamp: Date.now()
      };
      
      this.insights.push(insight);
      this.emit('insightGenerated', insight);
    }
  }

  /**
   * 오류 패턴 분석
   */
  analyzeErrorPatterns() {
    const allErrorsByType = {};
    
    // 모든 세션의 오류 통합
    for (const session of this.metrics.sessions.values()) {
      Object.entries(session.metrics.errorsByType).forEach(([type, count]) => {
        allErrorsByType[type] = (allErrorsByType[type] || 0) + count;
      });
    }

    // 가장 빈번한 오류 타입 식별
    const sortedErrors = Object.entries(allErrorsByType)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3);

    if (sortedErrors.length > 0 && sortedErrors[0][1] > 5) {
      const insight = {
        type: 'ERROR_PATTERN',
        category: 'FREQUENT_ERRORS',
        severity: sortedErrors[0][1] > 20 ? 'HIGH' : 'MEDIUM',
        details: {
          topErrors: sortedErrors,
          description: `Most frequent error: ${sortedErrors[0][0]} (${sortedErrors[0][1]} occurrences)`
        },
        timestamp: Date.now()
      };
      
      this.insights.push(insight);
      this.emit('insightGenerated', insight);
    }
  }

  /**
   * 트렌드 계산 (단순 선형 회귀)
   */
  calculateTrend(data) {
    const n = data.length;
    const sumX = data.reduce((sum, [x]) => sum + x, 0);
    const sumY = data.reduce((sum, [, y]) => sum + y, 0);
    const sumXY = data.reduce((sum, [x, y]) => sum + x * y, 0);
    const sumXX = data.reduce((sum, [x]) => sum + x * x, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // 상관계수 계산
    const meanX = sumX / n;
    const meanY = sumY / n;
    const ssXX = data.reduce((sum, [x]) => sum + Math.pow(x - meanX, 2), 0);
    const ssYY = data.reduce((sum, [, y]) => sum + Math.pow(y - meanY, 2), 0);
    const ssXY = data.reduce((sum, [x, y]) => sum + (x - meanX) * (y - meanY), 0);
    
    const correlation = ssXY / Math.sqrt(ssXX * ssYY);
    
    return { slope, intercept, correlation };
  }

  /**
   * 세션 종료
   */
  endSession(sessionId) {
    const session = this.metrics.sessions.get(sessionId);
    if (!session) {
      logger.warn('Session not found for ending:', sessionId);
      return null;
    }

    session.endTime = Date.now();
    
    // 세션 인사이트 생성
    const sessionInsights = this.generateSessionInsights(session);
    session.insights = sessionInsights;

    // 과거 데이터에 추가
    this.metrics.historical.push({
      sessionId,
      timestamp: session.endTime,
      duration: session.endTime - session.startTime,
      testConfiguration: session.testConfiguration,
      summary: this.generateSessionSummary(session),
      insights: sessionInsights,
      anomalies: session.anomalies
    });

    // 세션 데이터 저장
    this.saveSessionData(session);
    
    logger.info('Metrics collection ended for session', {
      sessionId,
      duration: session.endTime - session.startTime,
      totalRequests: session.metrics.totalRequests,
      insights: sessionInsights.length,
      anomalies: session.anomalies.length
    });

    this.emit('sessionEnded', { sessionId, session });
    
    return session;
  }

  /**
   * 세션 인사이트 생성
   */
  generateSessionInsights(session) {
    const insights = [];
    const { metrics } = session;
    
    // 성능 인사이트
    if (metrics.responseTimes.length > 0) {
      const avgResponseTime = metrics.responseTimes.reduce((sum, rt) => sum + rt.time, 0) / metrics.responseTimes.length;
      const baseline = this.options.performanceBaseline.avgResponseTime;
      
      if (avgResponseTime > baseline * 1.5) {
        insights.push({
          type: 'PERFORMANCE',
          severity: avgResponseTime > baseline * 2 ? 'HIGH' : 'MEDIUM',
          message: `Average response time (${Math.round(avgResponseTime)}ms) is significantly higher than baseline (${baseline}ms)`,
          recommendation: 'Consider optimizing API performance or reducing test load'
        });
      } else if (avgResponseTime < baseline * 0.7) {
        insights.push({
          type: 'PERFORMANCE',
          severity: 'LOW',
          message: `Excellent performance: Average response time (${Math.round(avgResponseTime)}ms) is well below baseline`,
          recommendation: 'Consider increasing test load to better assess capacity'
        });
      }
    }

    // 안정성 인사이트
    const successRate = metrics.totalRequests > 0 ? metrics.successfulRequests / metrics.totalRequests : 0;
    const baselineSuccessRate = this.options.performanceBaseline.successRate;
    
    if (successRate < baselineSuccessRate) {
      insights.push({
        type: 'RELIABILITY',
        severity: successRate < 0.8 ? 'HIGH' : 'MEDIUM',
        message: `Success rate (${(successRate * 100).toFixed(1)}%) is below target (${(baselineSuccessRate * 100).toFixed(1)}%)`,
        recommendation: 'Investigate error patterns and improve system stability'
      });
    }

    // 오류 패턴 인사이트
    const errorTypes = Object.keys(metrics.errorsByType);
    if (errorTypes.length > 0) {
      const dominantError = Object.entries(metrics.errorsByType)
        .sort(([,a], [,b]) => b - a)[0];
      
      insights.push({
        type: 'ERROR_ANALYSIS',
        severity: dominantError[1] > metrics.totalRequests * 0.1 ? 'HIGH' : 'MEDIUM',
        message: `Most common error type: ${dominantError[0]} (${dominantError[1]} occurrences)`,
        recommendation: this.getErrorRecommendation(dominantError[0])
      });
    }

    return insights;
  }

  /**
   * 오류 타입별 추천사항
   */
  getErrorRecommendation(errorType) {
    const recommendations = {
      'NETWORK_ERROR': 'Check network connectivity and API server status',
      'SERVER_ERROR': 'Investigate server-side issues and logs',
      'CLIENT_ERROR': 'Review request parameters and authentication',
      'VALIDATION_ERROR': 'Check API response format and validation logic',
      'TIMEOUT_ERROR': 'Consider increasing timeout values or optimizing performance'
    };
    
    return recommendations[errorType] || 'Review error details and system logs';
  }

  /**
   * 세션 요약 생성
   */
  generateSessionSummary(session) {
    const { metrics } = session;
    const duration = session.endTime - session.startTime;
    
    return {
      duration,
      totalRequests: metrics.totalRequests,
      successRate: metrics.totalRequests > 0 ? metrics.successfulRequests / metrics.totalRequests : 0,
      avgResponseTime: metrics.responseTimes.length > 0 
        ? metrics.responseTimes.reduce((sum, rt) => sum + rt.time, 0) / metrics.responseTimes.length 
        : 0,
      throughput: metrics.totalRequests / (duration / 1000), // requests per second
      errorsByType: metrics.errorsByType,
      anomalyCount: session.anomalies.length
    };
  }

  /**
   * 세션 데이터 저장
   */
  saveSessionData(session) {
    try {
      // 개별 세션 파일 저장
      const sessionFile = path.join(this.metricsDir, `session-${session.sessionId}-${Date.now()}.json`);
      fs.writeFileSync(sessionFile, JSON.stringify(session, null, 2));
      
      // 과거 데이터 파일 업데이트
      const historicalFile = path.join(this.metricsDir, 'historical.json');
      fs.writeFileSync(historicalFile, JSON.stringify(this.metrics.historical, null, 2));
      
      logger.debug('Session metrics saved', {
        sessionId: session.sessionId,
        sessionFile,
        historicalFile
      });
      
    } catch (error) {
      logger.error('Failed to save session metrics:', error.message);
    }
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
   * 리소스 정리
   */
  cleanup() {
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
      this.analysisInterval = null;
    }
    
    logger.info('MetricsCollector cleaned up');
  }

  /**
   * 현재 메트릭 상태 조회
   */
  getCurrentState() {
    return {
      activeSessions: this.metrics.sessions.size,
      totalHistoricalSessions: this.metrics.historical.length,
      realtimeMetricsPoints: {
        rps: this.metrics.realtime.requestsPerSecond.length,
        responseTime: this.metrics.realtime.responseTimeMovingAvg.length,
        errorRate: this.metrics.realtime.errorRateMovingAvg.length
      },
      totalAnomalies: this.anomalies.length,
      totalInsights: this.insights.length
    };
  }
}

module.exports = MetricsCollector;