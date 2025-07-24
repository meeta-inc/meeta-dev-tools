const TestReportGenerator = require('./pactumjs_test_new/src/reports/generators/TestReportGenerator');
const ChatMessageRenderer = require('./pactumjs_test_new/src/reports/generators/ChatMessageRenderer');
const ComparisonEngine = require('./pactumjs_test_new/src/reports/generators/ComparisonEngine');

// 테스트 데이터 예제
const mockTestData = {
  tests: [
    {
      id: 'test-001',
      title: '초등학교 수학 질문 테스트',
      category: 'Elementary',
      status: 'passed',
      responseTime: 1250,
      request: {
        method: 'POST',
        url: '/api/chat/elementary',
        body: {
          message: '2 + 2는 얼마인가요?',
          grade: 'elementary',
          subject: 'math'
        }
      },
      response: {
        status: 200,
        body: {
          message: '2 + 2는 4입니다. 간단한 덧셈 문제네요!',
          bubbleType: 'main'
        }
      },
      expectedResponse: {
        status: 200,
        body: {
          message: '2 + 2는 4입니다.',
          bubbleType: 'main'
        }
      },
      timestamp: new Date('2024-07-24T10:30:00Z').toISOString()
    },
    {
      id: 'test-002',
      title: '중학교 영어 질문 테스트',
      category: 'Middle',
      status: 'failed',
      responseTime: 2100,
      request: {
        method: 'POST',
        url: '/api/chat/middle',
        body: {
          message: 'What is the past tense of "go"?',
          grade: 'middle',
          subject: 'english'
        }
      },
      response: {
        status: 200,
        body: {
          message: 'The past tense of "go" is "gone".',
          bubbleType: 'main'
        }
      },
      expectedResponse: {
        status: 200,
        body: {
          message: 'The past tense of "go" is "went".',
          bubbleType: 'main'
        }
      },
      error: {
        type: 'Response Mismatch',
        message: 'Expected "went" but got "gone"'
      },
      timestamp: new Date('2024-07-24T10:31:00Z').toISOString()
    },
    {
      id: 'test-003',
      title: '고등학교 물리 질문 테스트',
      category: 'High',
      status: 'passed',
      responseTime: 1890,
      request: {
        method: 'POST',
        url: '/api/chat/high',
        body: {
          message: '중력가속도는 얼마인가요?',
          grade: 'high',
          subject: 'physics'
        }
      },
      response: {
        status: 200,
        body: {
          message: '지구의 중력가속도는 약 9.8 m/s²입니다.',
          bubbleType: 'main'
        }
      },
      expectedResponse: {
        status: 200,
        body: {
          message: '지구의 중력가속도는 약 9.8 m/s²입니다.',
          bubbleType: 'main'
        }
      },
      timestamp: new Date('2024-07-24T10:32:00Z').toISOString()
    }
  ],
  startTime: new Date('2024-07-24T10:30:00Z').getTime(),
  endTime: new Date('2024-07-24T10:35:00Z').getTime(),
  metadata: {
    environment: 'production',
    version: '1.0.0',
    testSuite: 'AI Navi Chat API Tests'
  }
};

async function testReportGeneration() {
  console.log('🚀 Starting PactumJS HTML Report Generation Test...\n');
  
  try {
    // 1. TestReportGenerator 테스트
    console.log('📋 Testing TestReportGenerator...');
    const generator = new TestReportGenerator({
      outputDir: './pactumjs_test_new/reports/html',
      brandColor: '#12DE00'
    });
    
    const reportResult = await generator.generateHTMLReport(mockTestData);
    console.log('✅ HTML Report generated successfully!');
    console.log(`📄 Report ID: ${reportResult.reportId}`);
    console.log(`📁 HTML Path: ${reportResult.htmlPath}`);
    console.log(`🌐 Public URL: ${reportResult.publicUrl}`);
    console.log(`📊 Test Count: ${reportResult.reportData.summary.totalTests}`);
    console.log(`📈 Success Rate: ${reportResult.reportData.summary.successRate}%\n`);
    
    // 2. ChatMessageRenderer 테스트
    console.log('💬 Testing ChatMessageRenderer...');
    const chatRenderer = new ChatMessageRenderer({
      brandColor: '#12DE00'
    });
    
    const testMessages = [
      {
        type: 'user',
        content: '2 + 2는 얼마인가요?',
        timestamp: new Date().toISOString()
      },
      {
        type: 'assistant',
        content: '2 + 2는 4입니다. 간단한 덧셈 문제네요!',
        timestamp: new Date().toISOString(),
        bubbleType: 'main',
        responseTime: 1250
      }
    ];
    
    const messagesHTML = chatRenderer.renderMessages(testMessages);
    console.log('✅ Chat messages rendered successfully!');
    console.log(`📝 Generated ${testMessages.length} message bubbles\n`);
    
    // 3. ComparisonEngine 테스트
    console.log('🔍 Testing ComparisonEngine...');
    const comparisonEngine = new ComparisonEngine();
    
    const actualResponse = { message: 'The past tense of "go" is "gone".' };
    const expectedResponse = { message: 'The past tense of "go" is "went".' };
    
    const comparisonResult = comparisonEngine.compare(actualResponse, expectedResponse);
    console.log('✅ Response comparison completed!');
    console.log(`🎯 Match Status: ${comparisonResult.isMatch ? 'MATCH' : 'NO MATCH'}`);
    console.log(`📊 Similarity: ${(comparisonResult.similarity * 100).toFixed(1)}%`);
    console.log(`⚠️ Differences Found: ${comparisonResult.differences.length}`);
    console.log(`🔬 Analysis Severity: ${comparisonResult.analysis.severity}\n`);
    
    // 4. CSS 스타일 통합 테스트
    console.log('🎨 Testing CSS Integration...');
    const fs = require('fs');
    const path = require('path');
    
    const cssFiles = [
      './pactumjs_test_new/src/reports/styles/main.css',
      './pactumjs_test_new/src/reports/styles/chat-message.css',
      './pactumjs_test_new/src/reports/styles/responsive.css'
    ];
    
    let totalCSSSize = 0;
    cssFiles.forEach(file => {
      if (fs.existsSync(file)) {
        const stats = fs.statSync(file);
        totalCSSSize += stats.size;
        console.log(`✅ ${path.basename(file)}: ${(stats.size / 1024).toFixed(1)}KB`);
      }
    });
    
    console.log(`📦 Total CSS Size: ${(totalCSSSize / 1024).toFixed(1)}KB\n`);
    
    // 성공 요약
    console.log('🎉 1단계: 기반 구조 설계 완료!');
    console.log('✨ 구현된 기능:');
    console.log('   ✅ TestReportGenerator 클래스');
    console.log('   ✅ ChatMessageRenderer 클래스');
    console.log('   ✅ ComparisonEngine 클래스');
    console.log('   ✅ HTML 템플릿 시스템');
    console.log('   ✅ CSS 스타일링 (메인, 채팅, 반응형)');
    console.log('   ✅ MeetA 브랜딩 (#12DE00)');
    console.log('   ✅ 모바일 친화적 반응형 디자인');
    console.log('\n🚀 다음 단계: UI/UX 디자인 및 핵심 기능 구현');
    
  } catch (error) {
    console.error('❌ Error during test:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// 테스트 실행
if (require.main === module) {
  testReportGeneration();
}

module.exports = { testReportGeneration, mockTestData };