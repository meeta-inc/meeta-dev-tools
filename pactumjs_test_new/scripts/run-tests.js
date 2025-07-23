#!/usr/bin/env node

const path = require('path');
const fs = require('fs');

const { AINaviChatClient } = require('../dist/src/api/client');
const TestCaseLoader = require('../src/data/test-case-loader');
const S3Service = require('../src/integrations/s3/client');
const SlackService = require('../src/integrations/slack/client');
const GoogleSheetsService = require('../src/integrations/gsheet/client');
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
   * Execute a single test case
   * @param {Object} testCase - Test case to execute
   * @returns {Promise<Object>} Test result
   */
  async executeTest(testCase) {
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
        executionTime: Date.now() - startTime
      };

      // Log result
      const logLevel = response.success && validation.isValid ? 'info' : 'error';
      logger[logLevel](`Test ${testCase.testId} completed`, {
        statusCode: response.statusCode,
        responseTime: response.responseTime,
        success: response.success,
        validationErrors: validation.errors
      });

      return result;

    } catch (error) {
      logger.error(`Test ${testCase.testId} failed with exception`, {
        error: error.message
      });

      return {
        testId: testCase.testId,
        userRole: testCase.userRole,
        userId: testCase.userId,
        category: testCase.category,
        message: testCase.message,
        grade: testCase.grade,
        statusCode: 'ERROR',
        body: { error: error.message },
        responseTime: 0,
        success: false,
        validation: { isValid: false, errors: [error.message] },
        timestamp: new Date().toISOString(),
        executionTime: 0
      };
    }
  }

  /**
   * Execute tests with concurrency control
   * @param {Array} testCases - Test cases to execute
   * @param {Object} options - Execution options
   * @returns {Promise<Array>} Test results
   */
  async executeTests(testCases, options = {}) {
    const { dryRun = false, concurrency } = options;
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

    logger.info(`Executing ${testCases.length} tests with concurrency ${finalConcurrency}`);

    const results = [];
    const executing = [];

    for (let i = 0; i < testCases.length; i++) {
      // Add test to execution queue
      const testPromise = this.executeTest(testCases[i]);
      executing.push(testPromise);

      // Wait for batch completion when reaching concurrency limit or end
      if (executing.length >= finalConcurrency || i === testCases.length - 1) {
        const batchResults = await Promise.all(executing);
        results.push(...batchResults);
        executing.length = 0; // Clear array

        // Progress log
        logger.info(`Completed ${results.length}/${testCases.length} tests`);
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
        sheetsUrl: sheetsUrl
      }));

    } catch (error) {
      logger.error(`Failed to save results: ${error.message}`);
      throw error;
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
      '응답결과_스테이터스코드', '응답결과_바디', '응답시간(ms)', '실행시간'
    ];

    const rows = [headers];
    results.forEach(result => {
      rows.push([
        result.testId || '',
        result.userRole || '',
        result.userId || '',
        result.category || '',
        result.message || '',
        result.statusCode || '',
        typeof result.body === 'object' ? JSON.stringify(result.body) : result.body || '',
        result.responseTime || '',
        result.timestamp || ''
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
      const testCases = this.loader.filter(filters);

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
        testType = 'Single';
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
        
        // Send detailed results for single tests
        if (filters.testId && results.length === 1) {
          await this.slackService.sendSingleTestDetails(results[0], summary);
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