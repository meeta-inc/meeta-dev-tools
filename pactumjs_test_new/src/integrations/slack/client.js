const { IncomingWebhook } = require('@slack/webhook');
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
      this.webhook = null;
    } else {
      this.webhook = new IncomingWebhook(this.webhookUrl);
    }
  }

  /**
   * Send test results summary to Slack
   * @param {Object} summary - Test results summary
   * @returns {Promise<void>}
   */
  async sendTestSummary(summary) {
    if (!this.webhook) {
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

      const message = {
        channel: this.channel,
        username: this.username,
        attachments: [
          {
            color: color,
            title: '🤖 AI Navi Chat API Test Results',
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

      await this.webhook.send(message);
      
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
    if (!this.webhook) {
      logger.warn('Slack webhook not configured - skipping message');
      return;
    }

    try {
      const message = {
        channel: options.channel || this.channel,
        username: options.username || this.username,
        text: text,
        ...options
      };

      await this.webhook.send(message);
      
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