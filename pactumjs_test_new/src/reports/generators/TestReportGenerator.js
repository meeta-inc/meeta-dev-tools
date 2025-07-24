const fs = require('fs');
const path = require('path');
const logger = require('../../utils/logger');

/**
 * PactumJS 테스트 리포트 HTML 생성기
 * JSON 테스트 결과를 모던하고 사용자 친화적인 HTML 리포트로 변환
 */
class TestReportGenerator {
  constructor(options = {}) {
    this.options = {
      outputDir: options.outputDir || path.join(__dirname, '../../../reports'),
      templateDir: options.templateDir || path.join(__dirname, '../templates'),
      styleDir: options.styleDir || path.join(__dirname, '../styles'),
      brandColor: options.brandColor || '#12DE00',
      logoPath: options.logoPath || '/Users/rimapa2025/Downloads/icon/Group 10.svg',
      ...options
    };

    this.ensureDirectories();
  }

  /**
   * 필요한 디렉토리 생성
   */
  ensureDirectories() {
    [this.options.outputDir, this.options.templateDir, this.options.styleDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * 메인 HTML 리포트 생성
   * @param {Object} testData - PactumJS 테스트 결과 JSON 데이터
   * @param {Object} options - 생성 옵션
   */
  async generateHTMLReport(testData, options = {}) {
    try {
      const reportId = `test-report-${Date.now()}`;
      const reportData = this.processTestData(testData);
      
      // HTML 템플릿 로드 및 렌더링
      const htmlContent = await this.renderMainTemplate(reportData, options);
      
      // 파일 생성
      const filePath = path.join(this.options.outputDir, `${reportId}.html`);
      fs.writeFileSync(filePath, htmlContent);
      
      // JSON 데이터도 함께 저장 (디버깅용)
      const jsonPath = path.join(this.options.outputDir, `${reportId}-data.json`);
      fs.writeFileSync(jsonPath, JSON.stringify(reportData, null, 2));
      
      logger.info('HTML test report generated successfully', {
        reportId,
        filePath,
        testCount: reportData.summary.totalTests,
        successRate: reportData.summary.successRate
      });
      
      return {
        reportId,
        htmlPath: filePath,
        jsonPath,
        reportData,
        publicUrl: this.generatePublicUrl(reportId)
      };
    } catch (error) {
      logger.error('Failed to generate HTML report', { error: error.message });
      throw error;
    }
  }

  /**
   * 테스트 데이터 처리 및 구조화
   * @param {Object} rawTestData - 원본 테스트 데이터
   */
  processTestData(rawTestData) {
    const processedData = {
      metadata: {
        generatedAt: new Date().toISOString(),
        generatedBy: 'PactumJS Test Report Generator',
        version: '1.0.0',
        reportId: `report-${Date.now()}`
      },
      summary: this.generateSummary(rawTestData),
      testResults: this.processTestResults(rawTestData),
      categories: this.categorizeTests(rawTestData),
      insights: this.generateInsights(rawTestData)
    };

    return processedData;
  }

  /**
   * 테스트 요약 정보 생성
   */
  generateSummary(testData) {
    const tests = Array.isArray(testData.tests) ? testData.tests : [];
    const totalTests = tests.length;
    const passedTests = tests.filter(t => t.status === 'passed' || t.success).length;
    const failedTests = totalTests - passedTests;
    const successRate = totalTests > 0 ? (passedTests / totalTests * 100).toFixed(1) : 0;

    const totalResponseTime = tests.reduce((sum, test) => sum + (test.responseTime || 0), 0);
    const avgResponseTime = totalTests > 0 ? Math.round(totalResponseTime / totalTests) : 0;

    return {
      totalTests,
      passedTests,
      failedTests,
      successRate: parseFloat(successRate),
      avgResponseTime,
      duration: this.calculateTestDuration(testData),
      categories: this.getTestCategories(tests),
      status: this.getOverallStatus(successRate, failedTests)
    };
  }

  /**
   * 테스트 결과 처리
   */
  processTestResults(testData) {
    const tests = Array.isArray(testData.tests) ? testData.tests : [];
    
    return tests.map((test, index) => ({
      id: test.id || `test-${index + 1}`,
      title: test.title || test.name || `Test ${index + 1}`,
      description: test.description || '',
      status: test.status || (test.success ? 'passed' : 'failed'),
      category: test.category || this.detectCategory(test),
      responseTime: test.responseTime || 0,
      request: this.formatRequest(test.request),
      response: this.formatResponse(test.response),
      expectedResponse: this.formatResponse(test.expectedResponse),
      error: test.error || null,
      chatMessages: this.extractChatMessages(test),
      timestamp: test.timestamp || new Date().toISOString()
    }));
  }

  /**
   * 전체 상태 판단
   */
  getOverallStatus(successRate, failedTests) {
    if (failedTests === 0) {
      return { level: 'success', text: 'All Tests Passed', color: '#4CAF50' };
    } else if (successRate >= 80) {
      return { level: 'warning', text: 'Minor Issues', color: '#FF9800' };
    } else if (successRate >= 50) {
      return { level: 'error', text: 'Multiple Failures', color: '#FF5722' };
    } else {
      return { level: 'critical', text: 'Critical Issues', color: '#F44336' };
    }
  }

  /**
   * 채팅 메시지 추출 (ChatMessage 스타일용)
   */
  extractChatMessages(test) {
    const messages = [];
    
    // 요청 메시지 (사용자 스타일)
    if (test.request) {
      messages.push({
        type: 'user',
        content: test.request.body || test.request.message || 'Request sent',
        timestamp: test.timestamp || new Date().toISOString(),
        style: 'user'
      });
    }
    
    // 응답 메시지 (봇 스타일)
    if (test.response) {
      messages.push({
        type: 'assistant',
        content: test.response.body || test.response.message || 'Response received',
        timestamp: test.timestamp || new Date().toISOString(),
        style: 'assistant',
        bubbleType: test.response.bubbleType || 'main'
      });
    }
    
    return messages;
  }

  /**
   * 메인 HTML 템플릿 렌더링
   */
  async renderMainTemplate(reportData, options = {}) {
    const templatePath = path.join(this.options.templateDir, 'report-layout.html');
    
    // 템플릿이 없으면 기본 템플릿 생성
    if (!fs.existsSync(templatePath)) {
      await this.createDefaultTemplates();
    }
    
    let template = fs.readFileSync(templatePath, 'utf-8');
    
    // 템플릿 변수 치환
    const replacements = {
      '{{REPORT_TITLE}}': `PactumJS Test Report - ${reportData.metadata.reportId}`,
      '{{GENERATED_AT}}': new Date(reportData.metadata.generatedAt).toLocaleString(),
      '{{BRAND_COLOR}}': this.options.brandColor,
      '{{LOGO_PATH}}': this.options.logoPath,
      '{{SUMMARY_DATA}}': JSON.stringify(reportData.summary),
      '{{TEST_RESULTS}}': this.renderTestResults(reportData.testResults),
      '{{DASHBOARD_STATS}}': this.renderDashboardStats(reportData.summary),
      '{{INSIGHTS_SECTION}}': this.renderInsights(reportData.insights),
      '{{STYLES}}': await this.loadStyles(),
      '{{SCRIPTS}}': this.generateJavaScript(reportData)
    };
    
    Object.entries(replacements).forEach(([key, value]) => {
      template = template.replace(new RegExp(key, 'g'), value);
    });
    
    return template;
  }

  /**
   * 공개 URL 생성 (AWS S3 + CloudFront)
   */
  generatePublicUrl(reportId) {
    const baseUrl = 'https://d3gpxaxs6h6ifz.cloudfront.net';
    return `${baseUrl}/reports/${reportId}.html`;
  }

  /**
   * 기본 템플릿 파일들 생성
   */
  async createDefaultTemplates() {
    // 기본 레이아웃 템플릿 생성은 다음 단계에서 구현
    logger.info('Creating default templates...');
  }

  /**
   * 스타일 파일 로드
   */
  async loadStyles() {
    // CSS 파일들 로드는 다음 단계에서 구현
    return '/* Styles will be loaded here */';
  }

  /**
   * JavaScript 코드 생성
   */
  generateJavaScript(reportData) {
    return `
      // Report data
      window.reportData = ${JSON.stringify(reportData)};
      
      // Initialize report functionality
      document.addEventListener('DOMContentLoaded', function() {
        console.log('Test report loaded successfully');
        initializeFilters();
        initializeSearch();
        initializeCharts();
      });
      
      function initializeFilters() {
        // Filter implementation will be added in next phase
      }
      
      function initializeSearch() {
        // Search implementation will be added in next phase
      }
      
      function initializeCharts() {
        // Chart implementation will be added in next phase
      }
    `;
  }

  // 유틸리티 메서드들
  detectCategory(test) {
    if (test.url && test.url.includes('elementary')) return 'Elementary';
    if (test.url && test.url.includes('middle')) return 'Middle';
    if (test.url && test.url.includes('high')) return 'High';
    if (test.url && test.url.includes('preschool')) return 'Preschool';
    return 'General';
  }

  formatRequest(request) {
    if (!request) return null;
    return {
      method: request.method || 'POST',
      url: request.url || '',
      headers: request.headers || {},
      body: request.body || request.data || ''
    };
  }

  formatResponse(response) {
    if (!response) return null;
    return {
      status: response.status || response.statusCode || 200,
      headers: response.headers || {},
      body: response.body || response.data || ''
    };
  }

  calculateTestDuration(testData) {
    if (testData.startTime && testData.endTime) {
      return testData.endTime - testData.startTime;
    }
    return 0;
  }

  getTestCategories(tests) {
    const categories = {};
    tests.forEach(test => {
      const category = this.detectCategory(test);
      categories[category] = (categories[category] || 0) + 1;
    });
    return categories;
  }

  categorizeTests(testData) {
    const tests = Array.isArray(testData.tests) ? testData.tests : [];
    const categories = {};
    
    tests.forEach(test => {
      const category = this.detectCategory(test);
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(test);
    });
    
    return categories;
  }

  generateInsights(testData) {
    const insights = [];
    const summary = this.generateSummary(testData);
    
    // 성공률 기반 인사이트
    if (summary.successRate < 70) {
      insights.push({
        type: 'Performance',
        severity: 'high',
        message: `Success rate is ${summary.successRate}%, which is below acceptable threshold`,
        recommendation: 'Review failed test cases and investigate API stability'
      });
    }
    
    // 응답시간 기반 인사이트
    if (summary.avgResponseTime > 5000) {
      insights.push({
        type: 'Performance',
        severity: 'medium',
        message: `Average response time is ${summary.avgResponseTime}ms`,
        recommendation: 'Consider optimizing API performance or increasing timeout values'
      });
    }
    
    return insights;
  }

  renderTestResults(testResults) {
    // HTML 렌더링은 다음 단계에서 구현
    return '<!-- Test results will be rendered here -->';
  }

  renderDashboardStats(summary) {
    // 대시보드 통계 렌더링은 다음 단계에서 구현
    return '<!-- Dashboard stats will be rendered here -->';
  }

  renderInsights(insights) {
    // 인사이트 렌더링은 다음 단계에서 구현
    return '<!-- Insights will be rendered here -->';
  }
}

module.exports = TestReportGenerator;