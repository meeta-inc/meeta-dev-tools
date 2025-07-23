const EventEmitter = require('events');
const SlackService = require('../integrations/slack/client');
const logger = require('../utils/logger');

/**
 * 알림 관리 클래스
 * 다양한 조건에 따라 알림을 발송하고 중복 알림을 방지
 */
class AlertManager extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      // 알림 채널 설정
      enableSlack: options.enableSlack !== false,
      enableEmail: options.enableEmail || false,
      enableWebhook: options.enableWebhook || false,
      
      // 알림 임계값
      thresholds: {
        responseTime: options.responseTimeThreshold || 10000, // 10초
        errorRate: options.errorRateThreshold || 0.1, // 10%
        consecutiveFailures: options.consecutiveFailuresThreshold || 5,
        anomalyScore: options.anomalyScoreThreshold || 0.8
      },
      
      // 중복 방지 설정
      suppressionWindow: options.suppressionWindow || 300000, // 5분
      maxAlertsPerHour: options.maxAlertsPerHour || 20,
      
      // 알림 우선순위 설정
      priorityLevels: {
        CRITICAL: { color: 'danger', emoji: '🚨', priority: 1 },
        HIGH: { color: 'warning', emoji: '⚠️', priority: 2 },
        MEDIUM: { color: '#ffeb3b', emoji: '⚡', priority: 3 },
        LOW: { color: 'good', emoji: '✅', priority: 4 },
        INFO: { color: '#2196f3', emoji: 'ℹ️', priority: 5 }
      },
      
      ...options
    };

    // 서비스 초기화
    this.slackService = new SlackService();
    
    // 알림 상태 관리
    this.alertHistory = new Map(); // 알림 이력
    this.suppressedAlerts = new Map(); // 억제된 알림
    this.rateLimitCounters = new Map(); // 속도 제한 카운터
    
    // 정리 타이머
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldAlerts();
    }, 60000); // 1분마다 정리
  }

  /**
   * 성능 알림 처리
   */
  async handlePerformanceAlert(alertData) {
    const { type, severity, details, sessionId, threshold, current } = alertData;
    
    const alert = {
      id: this.generateAlertId(type, sessionId),
      type,
      category: 'PERFORMANCE',
      severity: this.mapSeverity(severity),
      sessionId,
      details,
      threshold,
      current,
      timestamp: Date.now(),
      message: this.generatePerformanceMessage(type, details, current, threshold)
    };

    await this.processAlert(alert);
  }

  /**
   * 시스템 상태 알림 처리
   */
  async handleSystemAlert(alertData) {
    const { type, severity, message, details } = alertData;
    
    const alert = {
      id: this.generateAlertId(type, 'system'),
      type,
      category: 'SYSTEM',
      severity: this.mapSeverity(severity),
      details,
      timestamp: Date.now(),
      message: message || this.generateSystemMessage(type, details)
    };

    await this.processAlert(alert);
  }

  /**
   * 테스트 실패 알림 처리
   */
  async handleTestFailureAlert(alertData) {
    const { testId, grade, category, errorType, errorMessage, consecutiveFailures } = alertData;
    
    const severity = consecutiveFailures >= this.options.thresholds.consecutiveFailures ? 'CRITICAL' : 'HIGH';
    
    const alert = {
      id: this.generateAlertId('TEST_FAILURE', testId),
      type: 'TEST_FAILURE',
      category: 'QUALITY',
      severity,
      testId,
      grade,
      testCategory: category,
      errorType,
      consecutiveFailures,
      timestamp: Date.now(),
      message: `Test failure detected: ${testId} (${errorType}) - ${consecutiveFailures} consecutive failures`
    };

    await this.processAlert(alert);
  }

  /**
   * 이상 징후 알림 처리
   */
  async handleAnomalyAlert(alertData) {
    const { anomalyType, severity, sessionId, details, score } = alertData;
    
    const alert = {
      id: this.generateAlertId('ANOMALY', sessionId),
      type: 'ANOMALY',
      category: 'ANOMALY_DETECTION',
      severity: this.mapSeverity(severity),
      sessionId,
      anomalyType,
      score,
      details,
      timestamp: Date.now(),
      message: this.generateAnomalyMessage(anomalyType, details, score)
    };

    await this.processAlert(alert);
  }

  /**
   * 알림 처리 메인 로직
   */
  async processAlert(alert) {
    try {
      // 중복 검사
      if (this.isAlertSuppressed(alert)) {
        logger.debug('Alert suppressed due to recent similar alert', {
          alertId: alert.id,
          type: alert.type
        });
        return;
      }

      // 속도 제한 검사
      if (this.isRateLimited(alert)) {
        logger.warn('Alert rate limited', {
          alertId: alert.id,
          type: alert.type
        });
        return;
      }

      // 알림 이력에 추가
      this.alertHistory.set(alert.id, alert);
      
      // 중복 방지를 위해 억제 목록에 추가
      this.suppressedAlerts.set(alert.id, alert.timestamp);
      
      // 속도 제한 카운터 증가
      this.incrementRateLimit(alert);

      // 알림 발송
      await this.sendAlert(alert);
      
      // 이벤트 발생
      this.emit('alertSent', alert);
      
      logger.info('Alert processed and sent', {
        alertId: alert.id,
        type: alert.type,
        severity: alert.severity,
        category: alert.category
      });

    } catch (error) {
      logger.error('Failed to process alert:', error.message, {
        alertId: alert.id,
        type: alert.type
      });
      
      this.emit('alertError', { alert, error });
    }
  }

  /**
   * 알림 발송 (다중 채널)
   */
  async sendAlert(alert) {
    const promises = [];

    // Slack 알림
    if (this.options.enableSlack) {
      promises.push(this.sendSlackAlert(alert));
    }

    // 이메일 알림 (구현 예정)
    if (this.options.enableEmail) {
      promises.push(this.sendEmailAlert(alert));
    }

    // 웹훅 알림 (구현 예정)
    if (this.options.enableWebhook) {
      promises.push(this.sendWebhookAlert(alert));
    }

    // 모든 알림 채널로 병렬 발송
    const results = await Promise.allSettled(promises);
    
    // 실패한 알림 채널 로그
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        const channels = ['slack', 'email', 'webhook'];
        logger.error(`${channels[index]} alert failed:`, result.reason);
      }
    });
  }

  /**
   * Slack 알림 발송
   */
  async sendSlackAlert(alert) {
    const priorityConfig = this.options.priorityLevels[alert.severity];
    const channel = this.getSlackChannel(alert);
    
    const slackMessage = {
      channel,
      username: 'AI Navi Alert System',
      icon_emoji: ':warning:',
      text: `${priorityConfig.emoji} ${alert.message}`,
      attachments: [{
        color: priorityConfig.color,
        title: `${alert.category} Alert - ${alert.type}`,
        fields: this.buildSlackFields(alert),
        footer: 'AI Navi Test Automation',
        ts: Math.floor(alert.timestamp / 1000)
      }]
    };

    // 긴급 알림의 경우 @channel 멘션
    if (alert.severity === 'CRITICAL') {
      slackMessage.text = `<!channel> ${slackMessage.text}`;
    }

    await this.slackService.sendMessage(slackMessage);
  }

  /**
   * Slack 필드 구성
   */
  buildSlackFields(alert) {
    const fields = [
      {
        title: 'Severity',
        value: alert.severity,
        short: true
      },
      {
        title: 'Category',
        value: alert.category,
        short: true
      },
      {
        title: 'Time',
        value: new Date(alert.timestamp).toLocaleString('ja-JP', {
          timeZone: 'Asia/Tokyo'
        }),
        short: true
      }
    ];

    // 세션 ID가 있는 경우
    if (alert.sessionId) {
      fields.push({
        title: 'Session ID',
        value: alert.sessionId,
        short: true
      });
    }

    // 테스트 관련 정보
    if (alert.testId) {
      fields.push({
        title: 'Test ID',
        value: alert.testId,
        short: true
      });
    }

    if (alert.grade) {
      fields.push({
        title: 'Grade',
        value: alert.grade,
        short: true
      });
    }

    // 성능 관련 정보
    if (alert.current !== undefined && alert.threshold !== undefined) {
      fields.push({
        title: 'Current Value',
        value: this.formatValue(alert.current, alert.type),
        short: true
      });
      fields.push({
        title: 'Threshold',
        value: this.formatValue(alert.threshold, alert.type),
        short: true
      });
    }

    // 상세 정보
    if (alert.details && typeof alert.details === 'object') {
      const detailsText = Object.entries(alert.details)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n');
      
      fields.push({
        title: 'Details',
        value: detailsText,
        short: false
      });
    }

    return fields;
  }

  /**
   * 값 포맷팅
   */
  formatValue(value, type) {
    if (type === 'SLOW_RESPONSE' || type === 'responseTime') {
      return `${value}ms`;
    } else if (type === 'HIGH_ERROR_RATE' || type === 'errorRate') {
      return `${(value * 100).toFixed(1)}%`;
    } else if (type === 'throughput') {
      return `${value.toFixed(2)} RPS`;
    }
    return String(value);
  }

  /**
   * Slack 채널 결정
   */
  getSlackChannel(alert) {
    if (alert.severity === 'CRITICAL') {
      return '#alerts-critical';
    } else if (alert.category === 'PERFORMANCE') {
      return '#performance-alerts';
    } else if (alert.category === 'QUALITY') {
      return '#test-alerts';
    } else {
      return '#general-alerts';
    }
  }

  /**
   * 이메일 알림 발송 (플레이스홀더)
   */
  async sendEmailAlert(alert) {
    // TODO: 이메일 서비스 구현
    logger.info('Email alert would be sent', { alertId: alert.id });
  }

  /**
   * 웹훅 알림 발송 (플레이스홀더)
   */
  async sendWebhookAlert(alert) {
    // TODO: 웹훅 서비스 구현
    logger.info('Webhook alert would be sent', { alertId: alert.id });
  }

  /**
   * 심각도 매핑
   */
  mapSeverity(severity) {
    const severityMap = {
      'CRITICAL': 'CRITICAL',
      'HIGH': 'HIGH',
      'MEDIUM': 'MEDIUM',
      'LOW': 'LOW',
      'INFO': 'INFO'
    };
    
    return severityMap[severity] || 'MEDIUM';
  }

  /**
   * 알림 ID 생성
   */
  generateAlertId(type, identifier) {
    return `${type}_${identifier}_${Date.now()}`;
  }

  /**
   * 성능 알림 메시지 생성
   */
  generatePerformanceMessage(type, details, current, threshold) {
    switch (type) {
      case 'SLOW_RESPONSE':
        return `Slow response detected: ${current}ms (threshold: ${threshold}ms)`;
      case 'HIGH_ERROR_RATE':
        return `High error rate detected: ${(current * 100).toFixed(1)}% (threshold: ${(threshold * 100).toFixed(1)}%)`;
      case 'HIGH_CONCURRENCY':
        return `High concurrency detected: ${current} concurrent requests (threshold: ${threshold})`;
      default:
        return `Performance issue detected: ${type}`;
    }
  }

  /**
   * 시스템 알림 메시지 생성
   */
  generateSystemMessage(type, details) {
    switch (type) {
      case 'API_DOWN':
        return 'API service appears to be down or unreachable';
      case 'DATABASE_ERROR':
        return 'Database connection or query error detected';
      case 'RESOURCE_EXHAUSTION':
        return 'System resources (CPU/Memory) are critically low';
      default:
        return `System issue detected: ${type}`;
    }
  }

  /**
   * 이상 징후 알림 메시지 생성
   */
  generateAnomalyMessage(anomalyType, details, score) {
    return `Anomaly detected: ${anomalyType} (score: ${score.toFixed(2)})`;
  }

  /**
   * 알림 중복 검사
   */
  isAlertSuppressed(alert) {
    const suppressedTime = this.suppressedAlerts.get(alert.id);
    if (!suppressedTime) return false;
    
    const timeSinceLastAlert = Date.now() - suppressedTime;
    return timeSinceLastAlert < this.options.suppressionWindow;
  }

  /**
   * 속도 제한 검사
   */
  isRateLimited(alert) {
    const hourKey = Math.floor(Date.now() / (60 * 60 * 1000)); // 시간 단위 키
    const rateLimitKey = `${alert.category}_${hourKey}`;
    
    const currentCount = this.rateLimitCounters.get(rateLimitKey) || 0;
    return currentCount >= this.options.maxAlertsPerHour;
  }

  /**
   * 속도 제한 카운터 증가
   */
  incrementRateLimit(alert) {
    const hourKey = Math.floor(Date.now() / (60 * 60 * 1000));
    const rateLimitKey = `${alert.category}_${hourKey}`;
    
    const currentCount = this.rateLimitCounters.get(rateLimitKey) || 0;
    this.rateLimitCounters.set(rateLimitKey, currentCount + 1);
  }

  /**
   * 오래된 알림 정리
   */
  cleanupOldAlerts() {
    const now = Date.now();
    const retentionPeriod = 24 * 60 * 60 * 1000; // 24시간
    
    // 알림 이력 정리
    for (const [alertId, alert] of this.alertHistory.entries()) {
      if (now - alert.timestamp > retentionPeriod) {
        this.alertHistory.delete(alertId);
      }
    }
    
    // 억제된 알림 정리
    for (const [alertId, timestamp] of this.suppressedAlerts.entries()) {
      if (now - timestamp > this.options.suppressionWindow) {
        this.suppressedAlerts.delete(alertId);
      }
    }
    
    // 속도 제한 카운터 정리
    const currentHour = Math.floor(now / (60 * 60 * 1000));
    for (const [key] of this.rateLimitCounters.entries()) {
      const keyHour = parseInt(key.split('_').pop());
      if (currentHour - keyHour > 24) { // 24시간 이전 데이터 삭제
        this.rateLimitCounters.delete(key);
      }
    }
  }

  /**
   * 알림 통계 조회
   */
  getAlertStats() {
    const now = Date.now();
    const last24Hours = now - (24 * 60 * 60 * 1000);
    const lastHour = now - (60 * 60 * 1000);
    
    const recentAlerts = Array.from(this.alertHistory.values())
      .filter(alert => alert.timestamp > last24Hours);
    
    const hourlyAlerts = recentAlerts
      .filter(alert => alert.timestamp > lastHour);
    
    // 카테고리별 통계
    const categoryStats = {};
    recentAlerts.forEach(alert => {
      if (!categoryStats[alert.category]) {
        categoryStats[alert.category] = 0;
      }
      categoryStats[alert.category]++;
    });
    
    // 심각도별 통계
    const severityStats = {};
    recentAlerts.forEach(alert => {
      if (!severityStats[alert.severity]) {
        severityStats[alert.severity] = 0;
      }
      severityStats[alert.severity]++;
    });
    
    return {
      total24Hours: recentAlerts.length,
      totalLastHour: hourlyAlerts.length,
      suppressed: this.suppressedAlerts.size,
      categoryBreakdown: categoryStats,
      severityBreakdown: severityStats,
      rateLimitStatus: Array.from(this.rateLimitCounters.entries())
        .map(([key, count]) => ({ key, count }))
    };
  }

  /**
   * 리소스 정리
   */
  cleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    logger.info('AlertManager cleaned up');
  }
}

module.exports = AlertManager;