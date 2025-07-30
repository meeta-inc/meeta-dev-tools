#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// 파일 경로 설정
const generalTestsPath = path.join(__dirname, '../src/data/json/all-test-cases.json');
const faqTestsPath = path.join(__dirname, '../src/data/json/314-chatbot-faq-test-cases.json');
const mergedTestsPath = path.join(__dirname, '../src/data/json/merged-test-cases.json');

try {
  // 일반 테스트 케이스 읽기
  const generalTests = JSON.parse(fs.readFileSync(generalTestsPath, 'utf8'));
  console.log(`General tests loaded: ${generalTests.length} cases`);

  // FAQ 테스트 케이스 읽기
  const faqTests = JSON.parse(fs.readFileSync(faqTestsPath, 'utf8'));
  console.log(`FAQ tests loaded: ${faqTests.length} cases`);

  // 테스트 케이스 병합
  const mergedTests = [...generalTests, ...faqTests];
  console.log(`Total merged tests: ${mergedTests.length} cases`);

  // 병합된 테스트 케이스 저장
  fs.writeFileSync(mergedTestsPath, JSON.stringify(mergedTests, null, 2));
  console.log(`Merged test cases saved to: ${mergedTestsPath}`);

  // 통계 출력
  const stats = {
    general: generalTests.length,
    faq: faqTests.length,
    total: mergedTests.length
  };

  console.log('\nTest case statistics:');
  console.log('====================');
  console.log(`General tests: ${stats.general}`);
  console.log(`FAQ tests: ${stats.faq}`);
  console.log(`Total tests: ${stats.total}`);

} catch (error) {
  console.error('Error merging test cases:', error.message);
  process.exit(1);
}