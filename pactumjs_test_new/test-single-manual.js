#!/usr/bin/env node

require('dotenv').config();
const https = require('https');
const fs = require('fs');
const path = require('path');

console.log('🤖 Starting AI Navi Single Test Execution...\n');

// Test configuration
const testCase = {
  id: 'ELEMENTARY_A-1',
  grade: 'elementary',
  category: '授業・カリキュラム',
  message: '小学生の授業料はいくらですか？',
  userId: process.env.DEFAULT_USER_ID || 'Hyunse0001'
};

console.log('📋 Test Case:', testCase.id);
console.log('📚 Grade:', testCase.grade);
console.log('📝 Message:', testCase.message);
console.log('');

// API Request - using correct format based on working example
const apiData = JSON.stringify({
  clientId: process.env.DEFAULT_CLIENT_ID || 'RS000001',  // Correct format: 2 letters + 6 digits
  appId: process.env.DEFAULT_APP_ID || '0001',            // Correct format: 4 digits
  gradeId: testCase.grade,
  userId: testCase.userId,
  message: testCase.message
});

console.log('📤 Request Payload:', JSON.parse(apiData));
console.log('📤 Raw JSON String:', apiData);

const startTime = Date.now();

console.log('🚀 Sending API request...');

const req = https.request(process.env.API_BASE_URL + '/students/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(apiData, 'utf8')
  },
  timeout: 30000
}, (res) => {
  let responseData = '';
  
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  
  res.on('end', () => {
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    console.log('✅ API Response received');
    console.log('⏱️  Response Time:', responseTime + 'ms');
    console.log('📊 Status Code:', res.statusCode);
    
    // Parse and validate response
    let parsedResponse;
    let isValid = false;
    let bubbleCount = 0;
    let responsePreview = '';
    
    try {
      parsedResponse = JSON.parse(responseData);
      
      // Handle nested response format
      const actualResponse = parsedResponse.response || parsedResponse;
      
      if (Array.isArray(actualResponse)) {
        bubbleCount = actualResponse.length;
        isValid = bubbleCount >= 2 && bubbleCount <= 3;
        console.log('💬 Bubble Count:', bubbleCount);
        console.log('✅ Response Format: Valid');
        
        // Create preview of first bubble
        if (actualResponse.length > 0 && actualResponse[0].text) {
          responsePreview = actualResponse[0].text.substring(0, 100) + '...';
        }
      } else {
        console.log('❌ Response Format: Invalid (not array)');
      }
    } catch (error) {
      console.log('❌ JSON Parse Error:', error.message);
    }
    
    // Test result
    const testResult = {
      testId: testCase.id,
      success: res.statusCode === 200 && isValid,
      responseTime: responseTime,
      statusCode: res.statusCode,
      bubbleCount: bubbleCount,
      timestamp: new Date().toISOString(),
      grade: testCase.grade,
      category: testCase.category,
      message: testCase.message,
      responsePreview: responsePreview,
      fullResponse: parsedResponse
    };
    
    console.log('');
    console.log('📊 Test Result Summary:');
    console.log('   Success:', testResult.success ? '✅' : '❌');
    console.log('   Response Time:', testResult.responseTime + 'ms');
    console.log('   Bubble Count:', testResult.bubbleCount);
    
    if (responsePreview) {
      console.log('   Response Preview:', responsePreview);
    }
    
    // Save result to file
    const reportsDir = path.join(__dirname, 'reports');
    const logsDir = path.join(reportsDir, 'logs'); 
    
    if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });
    if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
    
    const resultFile = path.join(reportsDir, `test-result-${Date.now()}.json`);
    fs.writeFileSync(resultFile, JSON.stringify(testResult, null, 2));
    
    console.log('💾 Result saved to:', resultFile);
    
    // Send Slack notification
    sendSlackNotification(testResult, resultFile);
  });
});

req.on('error', (error) => {
  console.log('❌ API Request Failed:', error.message);
  
  const errorResult = {
    testId: testCase.id,
    success: false,
    error: error.message,
    timestamp: new Date().toISOString()
  };
  
  sendSlackNotification(errorResult, null);
});

req.on('timeout', () => {
  console.log('❌ API Request Timeout');
  req.destroy();
  
  const timeoutResult = {
    testId: testCase.id,
    success: false,
    error: 'Request timeout after 30 seconds',
    timestamp: new Date().toISOString()
  };
  
  sendSlackNotification(timeoutResult, null);
});

req.write(apiData);
req.end();

function sendSlackNotification(result, resultFile) {
  console.log('');
  console.log('📱 Sending Slack notification...');
  
  // Create detailed AI response content
  let aiResponseContent = '';
  if (result.fullResponse && result.fullResponse.response && Array.isArray(result.fullResponse.response)) {
    aiResponseContent = '\n\n📋 AI Response Details:\n';
    result.fullResponse.response.forEach((bubble, index) => {
      aiResponseContent += `\n💬 Response ${index + 1} (${bubble.type}):\n${bubble.text}\n`;
    });
  } else if (result.responsePreview) {
    aiResponseContent = `\nAI Response: ${result.responsePreview}`;
  }

  const statusIcon = result.success ? '✅' : '❌';
  const message = {
    text: `🤖 AI Navi Test Result\n\n` +
          `Test ID: ${result.testId}\n` +
          `Status: ${statusIcon} ${result.success ? 'Success' : 'Failed'}\n` +
          `Response Time: ${result.responseTime || 'N/A'}ms\n` +
          `Grade: ${result.grade || 'elementary'}\n` +
          `Category: ${result.category || 'N/A'}\n` +
          `Bubble Count: ${result.bubbleCount || 'N/A'}\n\n` +
          `❓ User Question:\n${result.message || 'N/A'}` +
          aiResponseContent +
          (resultFile ? `\n📄 Result File: ${path.basename(resultFile)}\n` : '') +
          (result.error ? `\n❌ Error: ${result.error}\n` : '') +
          `\n🕐 Time: ${new Date().toLocaleString()}`
  };
  
  // All information is now in the main text, no need for additional fields
  
  const slackData = JSON.stringify(message);
  
  const slackReq = https.request(process.env.SLACK_WEBHOOK_URL, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(slackData, 'utf8')
    }
  }, (slackRes) => {
    slackRes.on('data', (chunk) => {
      const response = chunk.toString();
      if (response === 'ok') {
        console.log('✅ Slack notification sent successfully!');
        console.log('📱 Check your Slack channel for the detailed test report.');
        console.log('');
        console.log('🎉 Single test execution completed!');
        console.log('');
        console.log('📋 Summary:');
        console.log(`   Test ID: ${result.testId}`);
        console.log(`   Success: ${result.success ? 'Yes' : 'No'}`);
        console.log(`   Response Time: ${result.responseTime || 'N/A'}ms`);
        console.log(`   Bubbles: ${result.bubbleCount || 'N/A'}`);
        if (resultFile) {
          console.log(`   Result File: ${resultFile}`);
        }
      } else {
        console.log('❌ Slack notification failed:', response);
      }
    });
  });
  
  slackReq.on('error', (error) => {
    console.log('❌ Slack request failed:', error.message);
  });
  
  slackReq.write(slackData);
  slackReq.end();
}