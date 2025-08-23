const https = require('https');
const config = require('../../../config/default');
const logger = require('../../utils/logger');

/**
 * Slack Service for sending notifications
 */
class SlackService {
  constructor(options = {}) {
    this.webhookUrl = options.webhookUrl || config.slack.webhookUrl;
    this.channel = options.channel || config.slack.channel;
    this.username = options.username || config.slack.username;
    
    if (!this.webhookUrl) {
      logger.warn('Slack webhook URL not configured - notifications disabled');
    }
  }

  /**
   * Send HTTP request to Slack webhook
   * @param {Object} payload - Message payload
   * @returns {Promise<void>}
   */
  async sendHttpRequest(payload) {
    return new Promise((resolve, reject) => {
      const data = JSON.stringify(payload);
      const url = new URL(this.webhookUrl);
      
      const options = {
        hostname: url.hostname,
        port: 443,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data, 'utf8')
        },
        timeout: 10000
      };

      const req = https.request(options, (res) => {
        let responseData = '';
        res.on('data', chunk => responseData += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) {
            resolve(responseData);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => reject(new Error('Request timeout')));
      req.write(data);
      req.end();
    });
  }

  /**
   * Send single test detailed results to Slack
   * @param {Object} testResult - Single test result
   * @param {Object} summary - Test summary
   * @param {string} model - AI model used for the test
   * @returns {Promise<void>}
   */
  async sendSingleTestDetails(testResult, summary, model = 'anthropic') {
    if (!this.webhookUrl) {
      logger.warn('Slack webhook not configured - skipping notification');
      return;
    }

    try {
      const { testId, statusCode, success, responseTime, grade, category, message, body, validationErrors } = testResult;
      
      // Main status
      const statusIcon = success ? ':white_check_mark:' : ':x:';
      const statusText = success ? 'Success' : 'Failed';
      
      // Model icon
      const modelIcon = model === 'openai' ? ':openai:' : ':robot_face:';
      const modelName = model === 'openai' ? 'OpenAI' : 'Anthropic';
      
      let detailsText = `Test ID: ${testId}\n`;
      detailsText += `Model: ${modelIcon} ${modelName}\n`;
      detailsText += `Status: ${statusIcon} ${statusText}\n`;
      detailsText += `Response Time: ${responseTime}ms\n`;
      detailsText += `Grade: ${grade || 'N/A'}\n`;
      detailsText += `Category: ${category || 'N/A'}\n`;
      
      // Extract bubbles from response (handles both old and new structure)
      let bubbles = body;
      if (body && body.response && Array.isArray(body.response)) {
        bubbles = body.response;
      }
      
      // Add bubble count if response is array
      if (Array.isArray(bubbles)) {
        detailsText += `Bubble Count: ${bubbles.length}\n`;
      }
      
      detailsText += `\n:question: User Question:\n${message}\n`;
      
      // Add AI response details if available
      if (Array.isArray(bubbles) && bubbles.length > 0) {
        detailsText += `\n:clipboard: AI Response Details:\n`;
        
        bubbles.forEach((bubble, index) => {
          const bubbleType = bubble.type || 'unknown';
          const typeLabel = bubbleType === 'main' ? 'main' : 
                           bubbleType === 'sub' ? 'sub' : 
                           bubbleType === 'cta' ? 'cta' : bubbleType;
          
          detailsText += `:speech_balloon: Response ${index + 1} (${typeLabel}):\n`;
          
          // Extract full text from bubble
          let bubbleText = '';
          if (bubble.text) {
            bubbleText = bubble.text;
          } else if (bubble.data) {
            if (typeof bubble.data === 'string') {
              bubbleText = bubble.data;
            } else if (bubble.data.text) {
              bubbleText = bubble.data.text;
            } else {
              bubbleText = JSON.stringify(bubble.data);
            }
          }
          
          detailsText += `${bubbleText}\n`;
        });
      } else if (body && typeof body === 'object') {
        detailsText += `\n:clipboard: Response Body:\n${JSON.stringify(body, null, 2)}\n`;
      } else if (body) {
        detailsText += `\n:clipboard: Response:\n${body}\n`;
      }
      
      // Add validation errors if any
      if (validationErrors && validationErrors.length > 0) {
        detailsText += `\n:warning: Validation Errors:\n${validationErrors.join('\n')}\n`;
      }
      
      // Add timestamp
      detailsText += `\n:clock1: Time: ${new Date().toLocaleString()}\n`;
      
      const slackMessage = {
        username: this.username,
        attachments: [
          {
            color: success ? 'good' : 'danger',
            title: '🔍 Single Test Detailed Results',
            text: detailsText,
            footer: 'AI Navi Test Automation - Single Test',
            ts: Math.floor(Date.now() / 1000)
          }
        ]
      };
      
      // Add Google Sheets link if available
      if (summary.sheetsUrl) {
        slackMessage.attachments[0].fields = [{
          title: 'View Results',
          value: `<${summary.sheetsUrl}|📊 Google Sheets에서 상세 결과 보기>`,
          short: false
        }];
      }

      await this.sendHttpRequest(slackMessage);
      
      logger.info('Single test details sent to Slack', {
        testId,
        success,
        responseTime
      });

    } catch (error) {
      logger.error(`Failed to send single test details to Slack: ${error.message}`);
    }
  }

  /**
   * Send test results summary to Slack
   * @param {Object} summary - Test results summary
   * @param {string} model - AI model used for the test
   * @returns {Promise<void>}
   */
  async sendTestSummary(summary, model = 'anthropic') {
    if (!this.webhookUrl) {
      logger.warn('Slack webhook not configured - skipping notification');
      return;
    }

    try {
      const { total, passed, failed, errors, duration, timestamp } = summary;
      const successRate = total > 0 ? ((passed / total) * 100).toFixed(1) : '0';
      
      // Determine message color based on results
      let color = 'good'; // green
      if (failed > 0 || errors > 0) {
        color = 'danger'; // red
      } else if (passed < total) {
        color = 'warning'; // yellow
      }

      // Model info
      const modelIcon = model === 'openai' ? '🟢' : '🔵';
      const modelName = model === 'openai' ? 'OpenAI' : 'Anthropic';
      
      const message = {
        username: this.username,
        attachments: [
          {
            color: color,
            title: `🤖 AI Navi Chat API Test Results (${modelIcon} ${modelName})`,
            fields: [
              {
                title: 'Total Tests',
                value: total.toString(),
                short: true
              },
              {
                title: 'Passed',
                value: `✅ ${passed}`,
                short: true
              },
              {
                title: 'Failed',
                value: `❌ ${failed}`,
                short: true
              },
              {
                title: 'Errors',
                value: `⚠️ ${errors}`,
                short: true
              },
              {
                title: 'Success Rate',
                value: `${successRate}%`,
                short: true
              },
              {
                title: 'Duration',
                value: `${(duration / 1000).toFixed(2)}s`,
                short: true
              }
            ],
            footer: 'AI Navi Test Automation',
            ts: Math.floor(Date.now() / 1000)
          }
        ]
      };

      // Add detailed breakdown if there are failures
      if (summary.failedTests && summary.failedTests.length > 0) {
        const failedList = summary.failedTests.slice(0, 5).map(test => 
          `• ${test.testId}: ${test.error}`
        ).join('\n');
        
        message.attachments[0].fields.push({
          title: 'Recent Failures',
          value: failedList + (summary.failedTests.length > 5 ? '\n... and more' : ''),
          short: false
        });
      }

      // Add Google Sheets link if available
      if (summary.sheetsUrl) {
        message.attachments[0].fields.push({
          title: 'View Results',
          value: `<${summary.sheetsUrl}|📊 Google Sheets에서 상세 결과 보기>`,
          short: false
        });
      }

      await this.sendHttpRequest(message);
      
      logger.info('Test summary sent to Slack', {
        channel: this.channel,
        total,
        passed,
        failed,
        errors
      });

    } catch (error) {
      logger.error(`Failed to send Slack notification: ${error.message}`);
      // Don't throw - notification failure shouldn't break the test process
    }
  }

  /**
   * Send custom message to Slack
   * @param {string} text - Message text
   * @param {Object} options - Additional message options
   * @returns {Promise<void>}
   */
  async sendMessage(text, options = {}) {
    if (!this.webhookUrl) {
      logger.warn('Slack webhook not configured - skipping message');
      return;
    }

    try {
      const message = {
        username: options.username || this.username,
        text: text,
        ...options
      };

      await this.sendHttpRequest(message);
      
      logger.info('Message sent to Slack', {
        channel: message.channel,
        textLength: text.length
      });

    } catch (error) {
      logger.error(`Failed to send Slack message: ${error.message}`);
    }
  }

  /**
   * Send test start notification
   * @param {Object} testInfo - Test information
   * @returns {Promise<void>}
   */
  async sendTestStart(testInfo) {
    const { totalTests, filters, startTime } = testInfo;
    
    let message = `🚀 Starting AI Navi Chat API tests\n`;
    message += `📊 Total tests: ${totalTests}\n`;
    
    if (filters.grade) {
      message += `🎓 Grade filter: ${filters.grade}\n`;
    }
    
    if (filters.category) {
      message += `📂 Category filter: ${filters.category}\n`;
    }
    
    message += `⏰ Started at: ${new Date(startTime).toLocaleString()}`;

    await this.sendMessage(message, {
      icon_emoji: ':test_tube:'
    });
  }

  /**
   * Send error alert
   * @param {string} error - Error message
   * @param {Object} context - Error context
   * @returns {Promise<void>}
   */
  async sendError(error, context = {}) {
    const message = {
      channel: this.channel,
      username: this.username,
      attachments: [
        {
          color: 'danger',
          title: '🚨 Test Automation Error',
          text: error,
          fields: Object.entries(context).map(([key, value]) => ({
            title: key,
            value: String(value),
            short: true
          })),
          footer: 'AI Navi Test Automation',
          ts: Math.floor(Date.now() / 1000)
        }
      ]
    };

    await this.sendMessage('', message);
  }
}

module.exports = SlackService;