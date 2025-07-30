#!/usr/bin/env node

const path = require('path');
const fs = require('fs');

const { AINaviChatClient } = require('../dist/src/api/client');
const TestCaseLoader = require('../src/data/test-case-loader');
const S3Service = require('../src/integrations/s3/client');
const SlackService = require('../src/integrations/slack/client');
const GoogleSheetsService = require('../src/integrations/gsheet/client');
const TestReportGenerator = require('../src/reports/generators/TestReportGenerator');
const logger = require('../src/utils/logger');
const config = require('../config/default');

/**
 * Test Runner - Main test execution engine
 */
class TestRunner {
  constructor() {
    this.client = new AINaviChatClient();
    this.loader = new TestCaseLoader();
    this.s3Service = new S3Service();
    this.slackService = new SlackService();
    this.sheetsService = new GoogleSheetsService();
    this.reportGenerator = new TestReportGenerator();
    this.results = [];
  }

  /**
   * Parse command line arguments
   * @returns {Object} Parsed arguments
   */
  parseArgs() {
    const args = process.argv.slice(2);
    const filters = {};
    const options = {};

    args.forEach(arg => {
      if (arg.startsWith('--grade=')) {
        filters.grade = arg.split('=')[1];
      } else if (arg.startsWith('--category=')) {
        filters.category = arg.split('=')[1];
      } else if (arg.startsWith('--id=')) {
        filters.testId = arg.split('=')[1];
      } else if (arg.startsWith('--source=')) {
        filters.source = arg.split('=')[1];
      } else if (arg.startsWith('--bucket=')) {
        options.bucket = arg.split('=')[1];
      } else if (arg.startsWith('--key=')) {
        options.key = arg.split('=')[1];
      } else if (arg === '--from-s3') {
        options.fromS3 = true;
      } else if (arg === '--dry-run') {
        options.dryRun = true;
      } else if (arg === '--no-slack') {
        options.noSlack = true;
      } else if (arg === '--no-gsheet') {
        options.noGsheet = true;
      } else if (arg.startsWith('--concurrency=')) {
        options.concurrency = parseInt(arg.split('=')[1]);
      } else if (arg.startsWith('--interval=')) {
        options.interval = parseInt(arg.split('=')[1]) * 1000; // 초 단위를 밀리초로 변환
      } else if (arg.startsWith('--max-retries=')) {
        options.maxRetries = parseInt(arg.split('=')[1]);
      } else if (arg.startsWith('--additional-cases=')) {
        filters.additionalCases = parseInt(arg.split('=')[1]);
      } else if (arg.startsWith('--json-file=')) {
        options.jsonFile = arg.split('=')[1];
      }
    });

    return { filters, options };
  }

  /**
   * Load test cases from various sources
   * @param {Object} options - Loading options
   * @returns {Promise<Array>} Test cases
   */
  async loadTestCases(options = {}) {
    try {
      let testCases = [];

      if (options.fromS3 && options.bucket && options.key) {
        // Load from S3
        logger.info('Loading test cases from S3', {
          bucket: options.bucket,
          key: options.key
        });
        
        const csvData = await this.s3Service.downloadCSV(options.key, options.bucket);
        // Save temporarily and load via CSV loader
        const tempFile = path.join(__dirname, '../temp-test-cases.csv');
        fs.writeFileSync(tempFile, csvData);
        testCases = this.loader.loadFromCSV(tempFile);
        fs.unlinkSync(tempFile); // Clean up
      } else if (options.jsonFile) {
        // Load from JSON file
        const jsonPath = path.join(__dirname, '..', options.jsonFile);
        logger.info('Loading test cases from JSON', { path: jsonPath });
        
        if (fs.existsSync(jsonPath)) {
          const jsonData = fs.readFileSync(jsonPath, 'utf-8');
          testCases = JSON.parse(jsonData);
          logger.info(`Loaded ${testCases.length} test cases from JSON`);
        } else {
          throw new Error(`JSON file not found: ${jsonPath}`);
        }
      } else {
        // Load from local files
        const csvPath = path.join(__dirname, '../src/data/csv/basic-test-case.csv');
        const excelPath = path.join(__dirname, '../../resource/314CommunityFAQExample.xlsx');

        // Load CSV if exists
        if (fs.existsSync(csvPath)) {
          testCases = this.loader.loadFromCSV(csvPath);
        }

        // Load Excel if exists
        if (fs.existsSync(excelPath)) {
          const excelCases = this.loader.loadFromExcel(excelPath);
          testCases = [...testCases, ...excelCases];
        }
      }

      logger.info(`Loaded ${testCases.length} total test cases`);
      return testCases;

    } catch (error) {
      logger.error(`Failed to load test cases: ${error.message}`);
      throw error;
    }
  }

  /**
   * Execute a single test case with retry logic for 500 errors
   * @param {Object} testCase - Test case to execute
   * @param {number} maxRetries - Maximum number of retries (default: 5)
   * @returns {Promise<Object>} Test result
   */
  async executeTest(testCase, maxRetries = 5) {
    let lastError = null;
    let attempt = 0;

    while (attempt <= maxRetries) {
      try {
        const startTime = Date.now();
        
        // Prepare API parameters
        const params = {
          clientId: testCase.clientId || config.defaults.clientId,
          appId: testCase.appId || config.defaults.appId,
          gradeId: testCase.grade,
          userId: testCase.userId,
          message: testCase.message,
          sessionId: testCase.sessionId
        };

        // Send API request
        const response = await this.client.sendMessage(params);
        
        // Check if we got a 500 error and should retry
        if (response.statusCode >= 500 && response.statusCode < 600 && attempt < maxRetries) {
          attempt++;
          const retryDelay = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // 지수 백오프, 최대 10초
          
          logger.warn(`Test ${testCase.testId} failed with ${response.statusCode}, retrying (${attempt}/${maxRetries}) after ${retryDelay}ms`, {
            statusCode: response.statusCode,
            responseTime: response.responseTime,
            body: response.body
          });
          
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          continue;
        }
        
        // Validate response
        const validation = this.client.validateResponse(response);

        const result = {
          testId: testCase.testId,
          userRole: testCase.userRole,
          userId: testCase.userId,
          category: testCase.category,
          message: testCase.message,
          grade: testCase.grade,
          statusCode: response.statusCode,
          body: response.body,
          responseTime: response.responseTime,
          success: response.success,
          validation: validation,
          timestamp: new Date().toISOString(),
          executionTime: Date.now() - startTime,
          retryCount: attempt
        };

        // Log result
        const logLevel = response.success && validation.isValid ? 'info' : 'error';
        logger[logLevel](`Test ${testCase.testId} completed${attempt > 0 ? ` after ${attempt} retries` : ''}`, {
          statusCode: response.statusCode,
          responseTime: response.responseTime,
          success: response.success,
          validationErrors: validation.errors,
          retryCount: attempt
        });

        return result;

      } catch (error) {
        lastError = error;
        
        // Only retry for network errors or specific error conditions
        if (attempt < maxRetries && this.shouldRetryOnError(error)) {
          attempt++;
          const retryDelay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          
          logger.warn(`Test ${testCase.testId} failed with exception, retrying (${attempt}/${maxRetries}) after ${retryDelay}ms`, {
            error: error.message
          });
          
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          continue;
        }
        
        // Max retries reached or non-retryable error
        break;
      }
    }

    // All retries exhausted
    logger.error(`Test ${testCase.testId} failed after ${attempt} attempts`, {
      error: lastError?.message || 'Unknown error'
    });

    return {
      testId: testCase.testId,
      userRole: testCase.userRole,
      userId: testCase.userId,
      category: testCase.category,
      message: testCase.message,
      grade: testCase.grade,
      statusCode: 'ERROR',
      body: { error: lastError?.message || 'Unknown error' },
      responseTime: 0,
      success: false,
      validation: { isValid: false, errors: [lastError?.message || 'Unknown error'] },
      timestamp: new Date().toISOString(),
      executionTime: 0,
      retryCount: attempt
    };
  }

  /**
   * Determine if an error should trigger a retry
   * @param {Error} error - The error that occurred
   * @returns {boolean} Whether to retry
   */
  shouldRetryOnError(error) {
    const retryableErrors = [
      'ECONNRESET',
      'ENOTFOUND',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ECONNABORTED',
      'socket hang up'
    ];

    return retryableErrors.some(retryableError => 
      error.message.includes(retryableError) || 
      error.code === retryableError
    );
  }

  /**
   * Execute tests with concurrency control and interval
   * @param {Array} testCases - Test cases to execute
   * @param {Object} options - Execution options
   * @returns {Promise<Array>} Test results
   */
  async executeTests(testCases, options = {}) {
    const { dryRun = false, concurrency, interval = 1000, maxRetries = 5 } = options; // 1초 기본 인터벌, 5회 기본 리트라이
    const finalConcurrency = concurrency || config.test.concurrency;
    
    if (dryRun) {
      logger.info(`DRY RUN: Would execute ${testCases.length} tests`);
      return testCases.map(tc => ({
        ...tc,
        statusCode: 'DRY_RUN',
        success: true,
        responseTime: 0
      }));
    }

    logger.info(`Executing ${testCases.length} tests with concurrency ${finalConcurrency}, ${interval / 1000}s interval, and max ${maxRetries} retries`);

    const results = [];
    const executing = [];

    for (let i = 0; i < testCases.length; i++) {
      // Add test to execution queue
      const testPromise = this.executeTest(testCases[i], maxRetries);
      executing.push(testPromise);

      // Wait for batch completion when reaching concurrency limit or end
      if (executing.length >= finalConcurrency || i === testCases.length - 1) {
        const batchResults = await Promise.all(executing);
        results.push(...batchResults);
        executing.length = 0; // Clear array

        // Progress log
        logger.info(`Completed ${results.length}/${testCases.length} tests`);

        // Add interval between test batches (except for the last batch)
        if (i < testCases.length - 1) {
          logger.info(`Waiting ${interval / 1000} seconds before next batch...`);
          await new Promise(resolve => setTimeout(resolve, interval));
        }
      }
    }

    return results;
  }

  /**
   * Generate test summary
   * @param {Array} results - Test results
   * @returns {Object} Summary statistics
   */
  generateSummary(results) {
    const summary = {
      total: results.length,
      passed: 0,
      failed: 0,
      errors: 0,
      duration: 0,
      timestamp: new Date().toISOString(),
      failedTests: []
    };

    results.forEach(result => {
      if (result.statusCode === 'ERROR') {
        summary.errors++;
        summary.failedTests.push({
          testId: result.testId,
          error: result.body?.error || 'Unknown error'
        });
      } else if (result.success && result.validation?.isValid) {
        summary.passed++;
      } else {
        summary.failed++;
        summary.failedTests.push({
          testId: result.testId,
          error: result.validation?.errors?.join(', ') || 'Validation failed'
        });
      }

      summary.duration += result.responseTime || 0;
    });

    return summary;
  }

  /**
   * Save results to various outputs
   * @param {Array} results - Test results
   * @param {Object} summary - Test summary
   * @returns {Promise<void>}
   */
  async saveResults(results, summary, options = {}) {
    try {
      // Save to S3
      const csvData = this.convertResultsToCSV(results);
      const s3Result = await this.s3Service.uploadTestResults(csvData);
      
      logger.info('Results uploaded to S3', s3Result);

      // Generate and upload HTML report
      let htmlReportUrl = null;
      try {
        // Prepare data for HTML report generator
        const reportData = {
          metadata: {
            generatedAt: new Date().toISOString(),
            generatedBy: 'PactumJS Test Report Generator (Real Data)',
            version: '1.0.0',
            reportId: `report-${Date.now()}`,
            dataSource: 'MeetA AI-NAVI Test Results',
            totalRows: results.length
          },
          summary: summary,
          testResults: results,
          categories: this.categorizeResults(results),
          insights: this.generateInsights(results)
        };

        // Generate HTML report
        const htmlReport = await this.reportGenerator.generateHTMLReport(reportData);
        
        // Read the generated HTML file
        const htmlContent = fs.readFileSync(htmlReport.htmlPath, 'utf-8');
        
        // Upload HTML to S3 for static hosting
        const htmlS3Result = await this.s3Service.uploadHTMLReport(htmlContent, htmlReport.reportId);
        htmlReportUrl = htmlS3Result.publicUrl;
        
        logger.info('HTML report uploaded to S3', {
          reportId: htmlReport.reportId,
          publicUrl: htmlReportUrl
        });

        // Add HTML report URL to summary
        summary.htmlReportUrl = htmlReportUrl;

      } catch (error) {
        logger.warn(`Failed to generate/upload HTML report: ${error.message}`);
        // Don't throw - HTML report failure shouldn't break the test process
        console.warn(`⚠️  HTML report generation failed: ${error.message}`);
      }

      // Upload to Google Sheets
      let sheetsUrl = null;
      if (!options.noGsheet) {
        try {
          const gsheetResult = await this.sheetsService.uploadResults(results, options.testType || 'Results');
          sheetsUrl = gsheetResult.url || `https://docs.google.com/spreadsheets/d/${config.gsheet.spreadsheetId}`;
          logger.info('Results uploaded to Google Sheets', { url: sheetsUrl });
          
          // Add sheets URL to summary for Slack notification
          summary.sheetsUrl = sheetsUrl;
        } catch (error) {
          logger.error(`Failed to upload to Google Sheets: ${error.message}`);
          // Don't throw - Google Sheets failure shouldn't break the test process
        }
      }

      // Save summary to local file
      const reportsDir = path.join(__dirname, '../reports');
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }

      const summaryPath = path.join(reportsDir, `summary-${Date.now()}.json`);
      fs.writeFileSync(summaryPath, JSON.stringify({ summary, results }, null, 2));

      // Output S3 info for external tools (like Makefile)
      console.log(JSON.stringify({
        bucket: s3Result.bucket,
        key: s3Result.key,
        summary: summary,
        sheetsUrl: sheetsUrl,
        htmlReportUrl: htmlReportUrl
      }));

    } catch (error) {
      logger.error(`Failed to save results: ${error.message}`);
      throw error;
    }
  }

  /**
   * LLM 응답에서 버블별 텍스트 추출
   * @param {string|object} responseBody - 응답 바디 (JSON 문자열 또는 객체)
   * @returns {object} 버블별 텍스트 객체
   */
  extractBubbleTexts(responseBody) {
    try {
      let bubbles = responseBody;
      
      // 문자열인 경우 JSON 파싱
      if (typeof responseBody === 'string') {
        bubbles = JSON.parse(responseBody);
      }
      
      // 배열이 아닌 경우 빈 객체 반환
      if (!Array.isArray(bubbles)) {
        return { main: '', sub: '', cta: '' };
      }
      
      const result = { main: '', sub: '', cta: '' };
      
      bubbles.forEach(bubble => {
        if (bubble.type && bubble.text) {
          const cleanText = bubble.text.replace(/\n/g, '').trim();
          if (bubble.type === 'main') result.main = cleanText;
          else if (bubble.type === 'sub') result.sub = cleanText;
          else if (bubble.type === 'cta') result.cta = cleanText;
        }
      });
      
      return result;
    } catch (error) {
      logger.warn(`Failed to parse bubble texts: ${error.message}`);
      return { main: '', sub: '', cta: '' };
    }
  }

  /**
   * Convert results to CSV format
   * @param {Array} results - Test results
   * @returns {string} CSV data
   */
  convertResultsToCSV(results) {
    const headers = [
      '테스트번호', '유저역할', '유저아이디', '테스트카테고리', '메세지',
      '응답결과_스테이터스코드', 'main버블', 'sub버블', 'cta버블', 
      '응답시간(ms)', '성공여부', '검증오류', '실행시간', '응답결과_바디'
    ];

    const rows = [headers];
    results.forEach(result => {
      const bubbleTexts = this.extractBubbleTexts(result.body);
      
      rows.push([
        result.testId || '',
        result.userRole || '',
        result.userId || '',
        result.category || '',
        result.message || '',
        result.statusCode || '',
        bubbleTexts.main,      // main버블
        bubbleTexts.sub,       // sub버블  
        bubbleTexts.cta,       // cta버블
        result.responseTime || '',
        result.success ? '성공' : '실패',
        result.validation?.errors?.join('; ') || '',
        result.timestamp || '',
        typeof result.body === 'object' ? JSON.stringify(result.body) : result.body || ''
      ]);
    });

    return rows.map(row => 
      row.map(cell => {
        const cellStr = String(cell || '');
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(',')
    ).join('\n');
  }

  /**
   * Categorize results by category
   * @param {Array} results - Test results
   * @returns {Object} Categorized results
   */
  categorizeResults(results) {
    const categories = {};
    
    results.forEach(result => {
      const category = result.category || 'General';
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(result);
    });

    return categories;
  }

  /**
   * Generate insights from test results
   * @param {Array} results - Test results
   * @returns {Array} Generated insights
   */
  generateInsights(results) {
    const insights = [];
    const summary = this.generateSummary(results);
    
    // Success rate insight
    if (summary.passed / summary.total * 100 < 80) {
      insights.push({
        type: 'Performance',
        severity: 'high',
        message: `Success rate is ${(summary.passed / summary.total * 100).toFixed(1)}%, which is below acceptable threshold`,
        recommendation: 'Review failed test cases and investigate API stability'
      });
    }

    // Response time insight
    const avgResponseTime = results.reduce((sum, r) => sum + (r.responseTime || 0), 0) / results.length;
    if (avgResponseTime > 5000) {
      insights.push({
        type: 'Performance',
        severity: 'medium',
        message: `Average response time is ${Math.round(avgResponseTime)}ms, which is quite slow`,
        recommendation: 'Optimize API performance and consider caching strategies'
      });
    }

    // Category insights
    const categories = Object.keys(this.categorizeResults(results));
    if (categories.length > 3) {
      insights.push({
        type: 'Quality',
        severity: 'low',
        message: `Tests cover ${categories.length} different categories`,
        recommendation: 'Good test coverage across multiple categories'
      });
    }

    return insights;
  }

  /**
   * Main execution function
   * @returns {Promise<void>}
   */
  async run() {
    const startTime = Date.now();
    
    try {
      logger.info('Starting AI Navi Chat API test automation');

      // Parse arguments
      const { filters, options } = this.parseArgs();
      logger.info('Execution parameters', { filters, options });

      // Load test cases
      const allTestCases = await this.loadTestCases(options);
      
      // Apply filters
      this.loader.testCases = allTestCases;
      let testCases = this.loader.filter(filters);

      // Handle additional cases for single test
      if (filters.testId && filters.additionalCases && filters.additionalCases > 0) {
        const targetIndex = allTestCases.findIndex(tc => tc.testId === filters.testId);
        if (targetIndex !== -1) {
          const additionalTests = [];
          for (let i = 1; i <= filters.additionalCases && targetIndex + i < allTestCases.length; i++) {
            additionalTests.push(allTestCases[targetIndex + i]);
          }
          testCases = [...testCases, ...additionalTests];
          logger.info(`Added ${additionalTests.length} additional test cases after ${filters.testId}`);
        }
      }

      if (testCases.length === 0) {
        logger.warn('No test cases found matching criteria');
        process.exit(0);
      }

      // Send start notification
      if (!options.noSlack) {
        await this.slackService.sendTestStart({
          totalTests: testCases.length,
          filters,
          startTime
        });
      }

      // Execute tests
      const results = await this.executeTests(testCases, options);
      
      // Generate summary
      const summary = this.generateSummary(results);
      summary.duration = Date.now() - startTime;

      logger.info('Test execution completed', summary);

      // Determine test type for sheet naming
      let testType = 'Results';
      if (filters.testId) {
        if (filters.additionalCases && filters.additionalCases > 0) {
          testType = `Single_Plus_${filters.additionalCases}`;
        } else {
          testType = 'Single';
        }
      } else if (filters.grade) {
        testType = `Grade_${filters.grade}`;
      } else if (filters.category) {
        testType = `Category_${filters.category.replace(/[^a-zA-Z0-9]/g, '_')}`;
      } else {
        testType = 'All';
      }
      
      options.testType = testType;

      // Save results
      if (!options.dryRun) {
        await this.saveResults(results, summary, options);
      }

      // Send summary notification
      if (!options.noSlack) {
        await this.slackService.sendTestSummary(summary);
        
        // Send detailed results for single tests or single with additional cases
        if (filters.testId) {
          if (filters.additionalCases && filters.additionalCases > 0) {
            // Send summary for single test with additional cases
            const message = `📊 Single Test + ${filters.additionalCases} Additional Cases Completed\n` +
                          `Test ${filters.testId} and ${filters.additionalCases} additional cases completed\n` +
                          `• Total Executed: ${results.length}\n` +
                          `• Passed: ${summary.passed}\n` +
                          `• Failed: ${summary.failed}\n` +
                          `• Success Rate: ${(summary.passed / results.length * 100).toFixed(1)}%`;
            
            await this.slackService.sendMessage(message);
          } else if (results.length === 1) {
            await this.slackService.sendSingleTestDetails(results[0], summary);
          }
        }
      }

      // Exit with appropriate code
      const hasFailures = summary.failed > 0 || summary.errors > 0;
      process.exit(hasFailures ? 1 : 0);

    } catch (error) {
      logger.error(`Test execution failed: ${error.message}`);
      
      if (!options.noSlack) {
        await this.slackService.sendError(error.message, {
          duration: Date.now() - startTime,
          filters: JSON.stringify(filters)
        });
      }

      process.exit(1);
    }
  }
}

// Run if called directly
if (require.main === module) {
  const runner = new TestRunner();
  runner.run();
}

module.exports = TestRunner;