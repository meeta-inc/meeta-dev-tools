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
      
      // CSV 파서에서 온 데이터인지 확인 (이미 처리된 형태)
      let reportData;
      if (testData.metadata && testData.summary && testData.testResults) {
        // 이미 처리된 데이터 (CSV 파서에서 온 경우)
        reportData = testData;
        reportData.metadata.reportId = reportId;
      } else {
        // 원본 데이터 (기존 mock 데이터 방식)
        reportData = this.processTestData(testData);
      }
      
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
    
    // 요청 메시지 (사용자 스타일) - request.body.message 우선 사용
    if (test.request) {
      let userMessage = 'Request sent';
      
      if (test.request.body && typeof test.request.body === 'object' && test.request.body.message) {
        // request.body.message가 있으면 그것을 사용
        userMessage = test.request.body.message;
      } else if (test.request.body && typeof test.request.body === 'string') {
        // request.body가 문자열이면 그대로 사용
        userMessage = test.request.body;
      } else if (test.request.message) {
        // request.message가 있으면 사용
        userMessage = test.request.message;
      }
      
      messages.push({
        type: 'user',
        content: userMessage,
        timestamp: test.timestamp || new Date().toISOString(),
        style: 'user'
      });
    }
    
    // 응답 메시지 (봇 스타일) - JSON 배열 파싱하여 각 객체를 개별 메시지로 생성
    if (test.response) {
      const responseBody = test.response.body || test.response.message || 'Response received';
      
      try {
        // 이중 이스케이프된 JSON 문자열 정규화
        let normalizedJson = responseBody;
        if (typeof responseBody === 'string' && responseBody.includes('""')) {
          normalizedJson = responseBody.replace(/""/g, '"');
        }
        
        // JSON 파싱 시도
        const parsedResponse = typeof normalizedJson === 'string' ? JSON.parse(normalizedJson) : normalizedJson;
        
        // 버블 배열 추출 (새로운 구조와 이전 구조 모두 지원)
        let bubbles;
        if (parsedResponse && parsedResponse.response && Array.isArray(parsedResponse.response)) {
          // 새로운 구조: {"response": [...], "tool": ...}
          bubbles = parsedResponse.response;
        } else if (Array.isArray(parsedResponse)) {
          // 이전 구조: 직접 배열
          bubbles = parsedResponse;
        } else {
          bubbles = null;
        }
        
        if (bubbles) {
          // 배열의 각 객체를 개별 메시지로 생성
          bubbles.forEach((item, index) => {
            if (item && item.text) {
              messages.push({
                type: 'assistant',
                content: item.text,
                timestamp: test.timestamp || new Date().toISOString(),
                style: 'assistant',
                bubbleType: item.type || 'main'
              });
            }
          });
        } else {
          // 버블 배열이 아닌 경우 기본 처리
          messages.push({
            type: 'assistant',
            content: typeof responseBody === 'object' ? JSON.stringify(responseBody, null, 2) : responseBody,
            timestamp: test.timestamp || new Date().toISOString(),
            style: 'assistant',
            bubbleType: test.response.bubbleType || 'main'
          });
        }
      } catch (error) {
        // JSON 파싱 실패시 원본 내용 그대로 표시
        messages.push({
          type: 'assistant',
          content: typeof responseBody === 'object' ? JSON.stringify(responseBody, null, 2) : responseBody,
          timestamp: test.timestamp || new Date().toISOString(),
          style: 'assistant',
          bubbleType: test.response.bubbleType || 'main'
        });
      }
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
    try {
      const cssFiles = [
        'main.css',
        'responsive.css', 
        'chat-message.css'
      ];
      
      let combinedStyles = '';
      
      for (const cssFile of cssFiles) {
        const cssPath = path.join(this.options.styleDir, cssFile);
        if (fs.existsSync(cssPath)) {
          const cssContent = fs.readFileSync(cssPath, 'utf-8');
          combinedStyles += `\n/* ${cssFile} */\n${cssContent}\n`;
        }
      }
      
      return combinedStyles || '/* No styles found */';
    } catch (error) {
      logger.error('Failed to load styles', { error: error.message });
      return '/* Error loading styles */';
    }
  }

  /**
   * JavaScript 코드 생성
   */
  generateJavaScript(reportData) {
    const fs = require('fs');
    const path = require('path');
    
    // JavaScript 데이터 바인딩
    let jsContent = `
      // Report data
      window.reportData = ${JSON.stringify(reportData, null, 2)};
    `;
    
    // ChatMessageRenderer 클래스 로드
    const chatRendererPath = path.join(__dirname, 'ChatMessageRenderer.js');
    if (fs.existsSync(chatRendererPath)) {
      let chatRendererContent = fs.readFileSync(chatRendererPath, 'utf-8');
      // Node.js 전용 코드 제거 및 브라우저 호환 코드로 변환
      chatRendererContent = chatRendererContent
        .replace(/const fs = require\(['"]fs['"]\);?\s*/g, '')
        .replace(/const path = require\(['"]path['"]\);?\s*/g, '')
        .replace(/path\.join\([^)]+\)/g, '""')  // path.join 호출을 빈 문자열로 대체
        .replace(/module\.exports = ChatMessageRenderer;?/g, 'window.ChatMessageRenderer = ChatMessageRenderer;');
      jsContent += '\n' + chatRendererContent;
    }
    
    // ComparisonEngine 클래스 로드
    const comparisonPath = path.join(__dirname, 'ComparisonEngine.js');
    if (fs.existsSync(comparisonPath)) {
      let comparisonContent = fs.readFileSync(comparisonPath, 'utf-8');
      // Node.js 전용 코드 제거
      comparisonContent = comparisonContent
        .replace(/const fs = require\(['"]fs['"]\);?\s*/g, '')
        .replace(/const path = require\(['"]path['"]\);?\s*/g, '')
        .replace(/module\.exports = ComparisonEngine;?/g, 'window.ComparisonEngine = ComparisonEngine;');
      jsContent += '\n' + comparisonContent;
    }
    
    // 각 JavaScript 컴포넌트 로드
    const jsFiles = [
      'dashboard.js',
      'charts.js',
      'test-results.js',
      'main.js'
    ];
    
    jsFiles.forEach(file => {
      const jsPath = path.join(__dirname, '../js', file);
      if (fs.existsSync(jsPath)) {
        jsContent += '\n\n' + fs.readFileSync(jsPath, 'utf-8');
      } else {
        console.warn(`JavaScript file not found: ${jsPath}`);
      }
    });
    
    return jsContent;
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
    if (!testResults || testResults.length === 0) {
      return '<div class="no-results">No test results available</div>';
    }

    return testResults.map(test => {
      const statusClass = test.status === 'passed' ? 'status-passed' : 'status-failed';
      const statusIcon = test.status === 'passed' ? '✅' : '❌';
      
      // 채팅 메시지 렌더링
      const chatMessages = this.extractChatMessages(test);
      const messagesHtml = chatMessages.map(msg => {
        if (msg.type === 'user') {
          return `
            <div class="chat-message message-user">
              <div class="message-container">
                <div class="message-bubble bubble bubble-user bubble-main">
                  <div class="message-content">
                    ${msg.content}
                  </div>
                </div>
                <div class="message-avatar avatar-user">
                  <span class="avatar-icon">👤</span>
                </div>
              </div>
            </div>
          `;
        } else {
          return `
            <div class="chat-message message-assistant">
              <div class="message-container">
                <div class="message-avatar avatar-assistant">
                  <span class="avatar-icon">🤖</span>
                </div>
                <div class="message-bubble bubble bubble-assistant bubble-main">
                  <div class="message-content">
                    ${typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content, null, 2)}
                  </div>
                  <div class="message-metadata">
                    <span class="message-time">${new Date(msg.timestamp).toLocaleTimeString()}</span>
                    <span class="response-time">${test.responseTime}ms</span>
                  </div>
                </div>
              </div>
            </div>
          `;
        }
      }).join('');

      return `
        <div class="conversation-item" data-test-id="${test.id}">
          <div class="conversation-header" onclick="toggleConversation('${test.id}')">
            <div class="conversation-title">
              <h4>${test.title}</h4>
              <span class="conversation-status ${statusClass}">${statusIcon} ${test.status.toUpperCase()}</span>
            </div>
            <div class="conversation-metadata">
              <span class="conversation-time">${new Date(test.timestamp).toLocaleString()}</span>
              <span class="message-count">${chatMessages.length} messages</span>
              <span class="total-response-time">${test.responseTime}ms</span>
            </div>
            <div class="conversation-toggle">
              <i class="fas fa-chevron-down"></i>
            </div>
          </div>
          <div class="conversation-messages" style="display: none;">
            <div class="chat-messages">
              ${messagesHtml}
            </div>
            ${test.error ? `
              <div class="error-section">
                <div class="error-header">
                  <i class="fas fa-exclamation-triangle"></i>
                  <span class="error-title">Error Details</span>
                </div>
                <div class="error-content">
                  <div class="error-message">${test.error}</div>
                </div>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');
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