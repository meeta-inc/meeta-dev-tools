require('dotenv-safe').config();

module.exports = {
  // API Configuration
  api: {
    baseUrl: process.env.API_BASE_URL || 'https://67hnjuna66.execute-api.ap-northeast-1.amazonaws.com/prd-1',
    timeout: parseInt(process.env.API_TIMEOUT) || 30000,
    retries: parseInt(process.env.API_RETRIES) || 3,
    endpoints: {
      chat: '/students/chat'
    }
  },

  // Test Configuration
  test: {
    concurrency: parseInt(process.env.TEST_CONCURRENCY) || 5,
    reportFormat: process.env.REPORT_FORMAT || 'json',
    outputDir: process.env.OUTPUT_DIR || './reports'
  },

  // AWS S3 Configuration
  aws: {
    region: process.env.AWS_REGION || 'ap-northeast-1',
    s3: {
      bucket: process.env.S3_BUCKET_NAME,
      testCasesKey: process.env.S3_TEST_CASES_KEY || 'test-cases.csv',
      resultsKey: process.env.S3_RESULTS_KEY || 'test-results.csv'
    }
  },

  // Google Sheets Configuration
  gsheet: {
    spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID,
    range: process.env.GOOGLE_SHEET_RANGE || 'Sheet1!A:Z',
    serviceAccountPath: process.env.GOOGLE_SERVICE_ACCOUNT_PATH
  },

  // Slack Configuration
  slack: {
    webhookUrl: process.env.SLACK_WEBHOOK_URL,
    channel: process.env.SLACK_CHANNEL || '#test-results',
    username: process.env.SLACK_USERNAME || 'Test Bot'
  },

  // Default Test Parameters
  defaults: {
    clientId: process.env.DEFAULT_CLIENT_ID || 'AB123456',
    appId: process.env.DEFAULT_APP_ID || '1234',
    userId: process.env.DEFAULT_USER_ID || 'test_user_001'
  }
};