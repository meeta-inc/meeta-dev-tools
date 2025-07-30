#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const TestReportGenerator = require('../src/reports/generators/TestReportGenerator');
const CSVParser = require('../src/reports/utils/csvParser');

/**
 * FAQ CSV에서 HTML 리포트 생성 스크립트
 */
async function generateHTMLFromFAQCSV() {
  const csvFilePath = '../../temp-faq-result.csv';
  
  console.log('🚀 Starting FAQ HTML Report Generation from CSV...\n');
  
  try {
    // 1. CSV 파일 읽기
    if (!fs.existsSync(csvFilePath)) {
      throw new Error(`CSV file not found: ${csvFilePath}`);
    }
    
    const csvContent = fs.readFileSync(csvFilePath, 'utf-8');
    console.log('✅ FAQ CSV file loaded successfully');
    
    // 2. CSV 파싱
    const csvParser = new CSVParser();
    const parsedData = csvParser.parseCSV(csvContent);
    
    console.log(`📊 Parsed ${parsedData.testResults.length} FAQ test results`);
    console.log(`📈 Success Rate: ${parsedData.summary.successRate}%`);
    
    // 3. HTML 리포트 생성
    const generator = new TestReportGenerator({
      outputDir: '../reports/html',
      brandColor: '#12DE00'
    });
    
    const reportResult = await generator.generateHTMLReport(parsedData);
    
    console.log('✅ FAQ HTML Report generated successfully!');
    console.log(`📄 Report ID: ${reportResult.reportId}`);
    console.log(`📁 HTML Path: ${reportResult.htmlPath}`);
    console.log(`📊 Test Count: ${reportResult.reportData.summary.totalTests}`);
    console.log(`📈 Success Rate: ${reportResult.reportData.summary.successRate}%\n`);
    
    // 4. 브라우저에서 열기
    const htmlPath = path.resolve(reportResult.htmlPath);
    const openCommand = process.platform === 'darwin' ? 'open' : 
                      process.platform === 'win32' ? 'start' : 'xdg-open';
    
    console.log(`🌐 Opening FAQ HTML report in browser...`);
    console.log(`📂 File path: ${htmlPath}`);
    
    exec(`${openCommand} "${htmlPath}"`, (error) => {
      if (error) {
        console.error(`Failed to open browser: ${error.message}`);
        console.log(`📂 Please manually open: ${htmlPath}`);
      } else {
        console.log('✅ FAQ HTML report opened in browser!');
      }
    });
    
  } catch (error) {
    console.error('❌ Error during FAQ HTML report generation:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// 스크립트 실행
if (require.main === module) {
  generateHTMLFromFAQCSV();
}

module.exports = { generateHTMLFromFAQCSV };