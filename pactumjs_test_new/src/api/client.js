const pactum = require('pactum');
const config = require('../../config/default');
const logger = require('../utils/logger');

class AINaviChatClient {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || config.api.baseUrl;
    this.timeout = options.timeout || config.api.timeout;
    this.retries = options.retries || config.api.retries;
  }

  /**
   * Send chat message to AI Navi API
   * @param {Object} params - Request parameters
   * @param {string} params.clientId - 8-character client ID (2 letters + 6 digits)
   * @param {string} params.appId - 4-digit app ID
   * @param {string} params.gradeId - Student grade (preschool/elementary/middle/high)
   * @param {string} params.userId - User identifier
   * @param {string} params.message - User's question (max 1000 chars)
   * @param {string} [params.sessionId] - Optional session identifier
   * @returns {Promise<Object>} API response with timing info
   */
  async sendMessage(params) {
    const { clientId, appId, gradeId, userId, message, sessionId } = params;
    
    // Validate required parameters
    this._validateParams({ clientId, appId, gradeId, userId, message });

    const startTime = Date.now();
    const endpoint = `${this.baseUrl}${config.api.endpoints.chat}`;
    
    try {
      const spec = pactum.spec();
      const response = await spec
        .post(endpoint)
        .withJson({
          clientId,
          appId,
          gradeId,
          userId,
          message,
          ...(sessionId && { sessionId })
        })
        .withRequestTimeout(this.timeout)
        .toss();

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      logger.info(`API Request successful`, {
        endpoint,
        userId,
        gradeId,
        responseTime,
        statusCode: response.statusCode
      });

      return {
        statusCode: response.statusCode,
        body: response.body,
        responseTime,
        success: true
      };

    } catch (error) {
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      logger.error(`API Request failed`, {
        endpoint,
        userId,
        gradeId,
        responseTime,
        error: error.message
      });

      return {
        statusCode: 'ERROR',
        body: { error: error.message },
        responseTime,
        success: false
      };
    }
  }

  /**
   * Validate API response format
   * @param {Object} response - API response
   * @returns {Object} Validation result
   */
  validateResponse(response) {
    const validation = {
      isValid: true,
      errors: [],
      bubbleCount: 0
    };

    if (!response.body) {
      validation.isValid = false;
      validation.errors.push('Response body is empty');
      return validation;
    }

    // Check if response has bubbles array
    if (!Array.isArray(response.body)) {
      validation.isValid = false;
      validation.errors.push('Response body should be an array of bubbles');
      return validation;
    }

    validation.bubbleCount = response.body.length;

    // Validate each bubble
    response.body.forEach((bubble, index) => {
      if (!bubble.type || !['main', 'sub', 'cta'].includes(bubble.type)) {
        validation.errors.push(`Bubble ${index}: Invalid or missing type`);
        validation.isValid = false;
      }

      if (!bubble.text || typeof bubble.text !== 'string') {
        validation.errors.push(`Bubble ${index}: Missing or invalid text`);
        validation.isValid = false;
      }
    });

    // Expected bubble count validation (2-3 bubbles)
    if (validation.bubbleCount < 2 || validation.bubbleCount > 3) {
      validation.errors.push(`Expected 2-3 bubbles, got ${validation.bubbleCount}`);
      validation.isValid = false;
    }

    return validation;
  }

  /**
   * Validate request parameters
   * @private
   */
  _validateParams({ clientId, appId, gradeId, userId, message }) {
    if (!clientId || !/^[A-Z]{2}\d{6}$/.test(clientId)) {
      throw new Error('clientId must be 8 characters: 2 uppercase letters + 6 digits');
    }

    if (!appId || !/^\d{4}$/.test(appId)) {
      throw new Error('appId must be 4 digits');
    }

    if (!gradeId || !['preschool', 'elementary', 'middle', 'high'].includes(gradeId)) {
      throw new Error('gradeId must be one of: preschool, elementary, middle, high');
    }

    if (!userId || typeof userId !== 'string') {
      throw new Error('userId is required and must be a string');
    }

    if (!message || typeof message !== 'string' || message.length > 1000) {
      throw new Error('message is required, must be a string, and max 1000 characters');
    }
  }
}

module.exports = AINaviChatClient;