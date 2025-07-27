#!/usr/bin/env node

const CSVParser = require('./pactumjs_test_new/src/reports/utils/csvParser');
const TestReportGenerator = require('./pactumjs_test_new/src/reports/generators/TestReportGenerator');
const S3Service = require('./pactumjs_test_new/src/integrations/s3/client');
const fs = require('fs');
const path = require('path');

/**
 * CSV to HTML Report Generator
 * Downloads CSV from S3 and generates HTML report
 */
class CSVReportProcessor {
  constructor() {
    this.csvParser = new CSVParser();
    this.reportGenerator = new TestReportGenerator({
      outputDir: './pactumjs_test_new/reports/html',
      brandColor: '#12DE00'
    });
    this.s3Service = new S3Service();
  }

  /**
   * Process CSV file and generate HTML report
   */
  async processCSVReport(csvSource) {
    try {
      console.log('📥 Starting CSV Report Processing...');
      
      let csvContent;
      
      if (csvSource.startsWith('s3://')) {
        // S3 경로에서 다운로드
        const s3Path = csvSource.replace('s3://', '');
        const [bucket, ...keyParts] = s3Path.split('/');
        const key = keyParts.join('/');
        
        console.log(`📦 Downloading from S3: ${bucket}/${key}`);
        csvContent = await this.s3Service.downloadCSV(key, bucket);
        console.log(`✅ Downloaded ${csvContent.length} characters`);
      } else if (fs.existsSync(csvSource)) {
        // 로컬 파일에서 읽기
        console.log(`📁 Reading local file: ${csvSource}`);
        csvContent = fs.readFileSync(csvSource, 'utf-8');
      } else {
        throw new Error(`CSV source not found: ${csvSource}`);
      }

      // CSV 파싱
      console.log('🔄 Parsing CSV data...');
      const parsedData = this.csvParser.parseCSV(csvContent);
      console.log(`✅ Parsed ${parsedData.testResults.length} test results`);
      console.log(`📊 Success Rate: ${parsedData.summary.successRate}%`);

      // HTML 리포트 생성
      console.log('🎨 Generating HTML report...');
      const reportResult = await this.reportGenerator.generateHTMLReport(parsedData);
      
      console.log('\n🎉 Report Generation Complete!');
      console.log(`📄 Report ID: ${reportResult.reportId}`);
      console.log(`📁 HTML Path: ${reportResult.htmlPath}`);
      console.log(`📊 Test Count: ${parsedData.summary.totalTests}`);
      console.log(`✅ Passed: ${parsedData.summary.passedTests}`);
      console.log(`❌ Failed: ${parsedData.summary.failedTests}`);
      console.log(`📈 Success Rate: ${parsedData.summary.successRate}%`);
      console.log(`⏱️ Avg Response Time: ${parsedData.summary.avgResponseTime}ms`);

      return reportResult;

    } catch (error) {
      console.error('❌ Error processing CSV report:', error.message);
      throw error;
    }
  }

  /**
   * Open HTML report in browser
   */
  async openReport(reportResult) {
    try {
      const { exec } = require('child_process');
      const htmlPath = reportResult.htmlPath;
      
      console.log(`🌐 Opening report in browser: ${htmlPath}`);
      
      // macOS에서 기본 브라우저로 열기
      exec(`open "${htmlPath}"`, (error) => {
        if (error) {
          console.error('❌ Failed to open browser:', error.message);
          console.log(`📁 Please manually open: ${htmlPath}`);
        } else {
          console.log('✅ Report opened in browser successfully!');
        }
      });
      
    } catch (error) {
      console.error('❌ Error opening report:', error.message);
    }
  }
}

// CLI 실행
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node test-csv-parser.js <csv-source>');
    console.log('Examples:');
    console.log('  node test-csv-parser.js s3://bucket-name/path/to/file.csv');
    console.log('  node test-csv-parser.js ./local-file.csv');
    process.exit(1);
  }

  const csvSource = args[0];
  const processor = new CSVReportProcessor();
  
  try {
    const reportResult = await processor.processCSVReport(csvSource);
    await processor.openReport(reportResult);
  } catch (error) {
    console.error('❌ Process failed:', error.message);
    process.exit(1);
  }
}

// 모듈로 import되지 않고 직접 실행될 때만 main 함수 실행
if (require.main === module) {
  main();
}

module.exports = CSVReportProcessor;