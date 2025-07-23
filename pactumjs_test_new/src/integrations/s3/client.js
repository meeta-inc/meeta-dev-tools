const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const config = require('../../../config/default');
const logger = require('../../utils/logger');

/**
 * S3 Client for handling file uploads and downloads
 */
class S3Service {
  constructor(options = {}) {
    this.s3Client = new S3Client({
      region: options.region || config.aws.region,
      credentials: options.credentials || {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
    this.bucket = options.bucket || config.aws.s3.bucket;
  }

  /**
   * Upload CSV data to S3
   * @param {string} csvData - CSV content as string
   * @param {string} key - S3 object key
   * @returns {Promise<Object>} Upload result
   */
  async uploadCSV(csvData, key) {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: csvData,
        ContentType: 'text/csv',
        Metadata: {
          'upload-timestamp': new Date().toISOString(),
          'source': 'ai-navi-test-automation'
        }
      });

      await this.s3Client.send(command);
      
      logger.info(`CSV uploaded to S3`, {
        bucket: this.bucket,
        key: key,
        size: csvData.length
      });

      return {
        success: true,
        bucket: this.bucket,
        key: key,
        url: `s3://${this.bucket}/${key}`
      };

    } catch (error) {
      logger.error(`Failed to upload CSV to S3`, {
        bucket: this.bucket,
        key: key,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Download CSV from S3
   * @param {string} key - S3 object key
   * @param {string} bucket - Optional bucket name (uses default if not provided)
   * @returns {Promise<string>} CSV content as string
   */
  async downloadCSV(key, bucket = null) {
    try {
      const bucketName = bucket || this.bucket;
      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: key
      });

      const response = await this.s3Client.send(command);
      const csvString = await response.Body.transformToString();

      logger.info(`CSV downloaded from S3`, {
        bucket: bucketName,
        key: key,
        size: csvString.length
      });

      return csvString;

    } catch (error) {
      logger.error(`Failed to download CSV from S3`, {
        bucket: bucket || this.bucket,
        key: key,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Upload test results with timestamp
   * @param {string} resultsData - Test results as CSV string
   * @param {string} prefix - Key prefix (default: 'test-results')
   * @returns {Promise<Object>} Upload result with generated key
   */
  async uploadTestResults(resultsData, prefix = 'test-results') {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const key = `${prefix}/result-${timestamp}.csv`;
    
    const result = await this.uploadCSV(resultsData, key);
    return { ...result, timestamp };
  }

  /**
   * Upload JSON data to S3
   * @param {Object|Array} jsonData - JSON data to upload
   * @param {string} key - S3 object key
   * @returns {Promise<Object>} Upload result
   */
  async uploadJSON(jsonData, key) {
    try {
      const jsonString = JSON.stringify(jsonData, null, 2);
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: jsonString,
        ContentType: 'application/json',
        Metadata: {
          'upload-timestamp': new Date().toISOString(),
          'source': 'ai-navi-test-automation'
        }
      });

      await this.s3Client.send(command);
      
      logger.info(`JSON uploaded to S3`, {
        bucket: this.bucket,
        key: key,
        size: jsonString.length
      });

      return {
        success: true,
        bucket: this.bucket,
        key: key,
        url: `s3://${this.bucket}/${key}`
      };

    } catch (error) {
      logger.error(`Failed to upload JSON to S3`, {
        bucket: this.bucket,
        key: key,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Generate a presigned URL for S3 object (for sharing results)
   * @param {string} key - S3 object key
   * @param {number} expiresIn - URL expiration time in seconds (default: 3600)
   * @returns {Promise<string>} Presigned URL
   */
  async getPresignedUrl(key, expiresIn = 3600) {
    try {
      const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key
      });

      const url = await getSignedUrl(this.s3Client, command, { expiresIn });
      
      logger.info(`Generated presigned URL`, {
        bucket: this.bucket,
        key: key,
        expiresIn
      });

      return url;

    } catch (error) {
      logger.error(`Failed to generate presigned URL`, {
        bucket: this.bucket,
        key: key,
        error: error.message
      });
      throw error;
    }
  }
}

module.exports = S3Service;