#!/usr/bin/env node

const path = require('path');
const fs = require('fs');

const TestCaseLoader = require('../src/data/test-case-loader');

async function generateFAQCases() {
  try {
    const loader = new TestCaseLoader();

    // Excel에서 FAQ 데이터 로드
    const excelPath = path.join(__dirname, '../../resource/314CommunityFAQExample.xlsx');
    console.log('FAQ 테스트 케이스 로드 중...');
    console.log('Excel 파일 경로:', excelPath);

    const faqCases = loader.loadFromExcel(excelPath);
    
    console.log('FAQ 테스트 케이스 로드 완료:');
    console.log('총 개수:', faqCases.length);
    
    // 학년별 개수 확인
    const gradeCount = {};
    faqCases.forEach(tc => {
      gradeCount[tc.grade] = (gradeCount[tc.grade] || 0) + 1;
    });
    console.log('학년별 개수:', gradeCount);
    
    // JSON 디렉토리 생성
    const jsonDir = path.join(__dirname, '../src/data/json');
    if (!fs.existsSync(jsonDir)) {
      fs.mkdirSync(jsonDir, { recursive: true });
    }
    
    // JSON으로 저장
    const outputPath = path.join(jsonDir, 'faq-test-cases.json');
    fs.writeFileSync(outputPath, JSON.stringify(faqCases, null, 2));
    console.log('JSON 파일 저장 완료:', outputPath);
    
    // 샘플 출력
    console.log('\n샘플 테스트 케이스:');
    faqCases.slice(0, 3).forEach(tc => {
      console.log(`- ID: ${tc.testId} | Grade: ${tc.grade} | Category: ${tc.category}`);
      console.log(`  Message: ${tc.message.substring(0, 80)}...`);
    });

    // 기존 CSV 테스트 케이스도 로드
    const csvPath = path.join(__dirname, '../src/data/csv/basic-test-case.csv');
    if (fs.existsSync(csvPath)) {
      const csvCases = loader.loadFromCSV(csvPath);
      console.log('\n기존 CSV 테스트 케이스:', csvCases.length, '개');
      
      // 전체 테스트 케이스 통합
      const allCases = [...csvCases, ...faqCases];
      const combinedOutputPath = path.join(jsonDir, 'all-test-cases.json');
      fs.writeFileSync(combinedOutputPath, JSON.stringify(allCases, null, 2));
      console.log('통합 테스트 케이스 저장:', combinedOutputPath);
      console.log('총 테스트 케이스:', allCases.length, '개');
    }

  } catch (error) {
    console.error('처리 중 오류 발생:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

if (require.main === module) {
  generateFAQCases();
}

module.exports = { generateFAQCases };