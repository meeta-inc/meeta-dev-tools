/**
 * 학년별 개별 데이터 삽입 스크립트
 * 
 * 사용법:
 * node scripts/conversation/seed-by-grade.js 幼児
 * node scripts/conversation/seed-by-grade.js 小学生
 * node scripts/conversation/seed-by-grade.js 中学生
 * node scripts/conversation/seed-by-grade.js 高校生
 */

const { insertAndVerifyGrade, generateGradeData } = require('./seed-conversations-extended');

async function main() {
  const targetAttribute = process.argv[2];
  
  if (!targetAttribute || !['幼児', '小学生', '中学生', '高校生'].includes(targetAttribute)) {
    console.error('❌ Please specify a valid grade: 幼児, 小学生, 中学生, or 高校生');
    console.error('Example: node seed-by-grade.js 幼児');
    process.exit(1);
  }

  console.log(`\n📚 Starting insertion for ${targetAttribute} only`);
  console.log('='.repeat(50));
  
  // 각 학년별 시간 오프셋 설정
  const timeOffsets = {
    '幼児': 0,      // 09:00부터
    '小学生': 300,  // 14:00부터
    '中学生': 600,  // 19:00부터
    '高校生': 900   // 24:00부터
  };
  
  try {
    const conversations = generateGradeData(targetAttribute, timeOffsets[targetAttribute]);
    const result = await insertAndVerifyGrade(targetAttribute, conversations);
    
    console.log('\n' + '='.repeat(50));
    console.log(`✅ Completed ${targetAttribute}:`);
    console.log(`   - Success: ${result.success.length}`);
    console.log(`   - Failed: ${result.failed.length}`);
    
    if (result.success.length === 30) {
      console.log(`\n🎉 All 30 ${targetAttribute} conversations successfully inserted!`);
    } else {
      console.log(`\n⚠️  Only ${result.success.length} out of 30 conversations were inserted.`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}