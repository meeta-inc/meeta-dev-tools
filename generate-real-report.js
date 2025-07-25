const TestReportGenerator = require('./pactumjs_test_new/src/reports/generators/TestReportGenerator');
const fs = require('fs');

async function generateRealReport() {
  console.log('🚀 실제 테스트 데이터로 HTML 리포트 생성 중...\n');
  
  try {
    // 정상 작동했던 리포트 데이터 로드
    const dataPath = './pactumjs_test_new/reports/html/test-report-1753372054523-data.json';
    const realTestData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    
    console.log('📊 실제 테스트 데이터 로드 완료:');
    console.log(`   - 총 테스트: ${realTestData.summary.totalTests}개`);
    console.log(`   - 성공: ${realTestData.summary.passedTests}개`);
    console.log(`   - 성공률: ${realTestData.summary.successRate}%\n`);
    
    // 리포트 생성기 초기화
    const generator = new TestReportGenerator({
      outputDir: './pactumjs_test_new/reports',
      brandColor: '#12DE00'
    });
    
    console.log('📋 HTML 리포트 생성 중...');
    const reportResult = await generator.generateHTMLReport(realTestData);
    
    console.log('✅ HTML 리포트 생성 완료!');
    console.log(`📄 Report ID: ${reportResult.reportId}`);
    console.log(`📁 HTML Path: ${reportResult.htmlPath}`);
    console.log(`📊 테스트 수: ${reportResult.reportData.summary.totalTests}`);
    console.log(`📈 성공률: ${reportResult.reportData.summary.successRate}%\n`);
    
    console.log(`🌐 로컬 파일: file://${require('path').resolve(reportResult.htmlPath)}`);
    
    return reportResult.htmlPath;
    
  } catch (error) {
    console.error('❌ 리포트 생성 실패:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// 스크립트 실행
if (require.main === module) {
  generateRealReport().then(htmlPath => {
    const { exec } = require('child_process');
    exec(`open "${htmlPath}"`, (error) => {
      if (error) {
        console.error('브라우저 열기 실패:', error);
      } else {
        console.log('✅ 브라우저에서 리포트를 열었습니다.');
      }
    });
  });
}

module.exports = generateRealReport;