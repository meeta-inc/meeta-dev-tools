#!/usr/bin/env node

const path = require('path');
require('module')._nodeModulePaths.push(path.join(__dirname, '../src'));

const GoogleSheetsService = require('../src/integrations/gsheet/client');
const S3Service = require('../src/integrations/s3/client');
const logger = require('../src/utils/logger');

/**
 * Google Sheets to S3 Uploader
 * Reads data from Google Sheets and uploads to S3 as CSV
 */
class SheetsUploader {
  constructor() {
    this.sheetsService = new GoogleSheetsService();
    this.s3Service = new S3Service();
  }

  /**
   * Parse command line arguments
   */
  parseArgs() {
    const args = process.argv.slice(2);
    const options = {};

    args.forEach(arg => {
      if (arg.startsWith('--spreadsheet=')) {
        options.spreadsheetId = arg.split('=')[1];
      } else if (arg.startsWith('--range=')) {
        options.range = arg.split('=')[1];
      } else if (arg.startsWith('--output=')) {
        options.outputKey = arg.split('=')[1];
      }
    });

    return options;
  }

  /**
   * Main execution function
   */
  async run() {
    try {
      logger.info('Starting Google Sheets to S3 upload process');

      const options = this.parseArgs();
      
      // Read data from Google Sheets
      logger.info('Reading data from Google Sheets...');
      const sheetData = await this.sheetsService.readData(
        options.range,
        options.spreadsheetId
      );

      if (!sheetData || sheetData.length === 0) {
        logger.warn('No data found in Google Sheets');
        process.exit(0);
      }

      // Convert to CSV
      logger.info('Converting to CSV format...');
      const csvData = this.sheetsService.convertToCSV(sheetData);

      // Upload to S3
      logger.info('Uploading to S3...');
      const outputKey = options.outputKey || 'test-cases.csv';
      const result = await this.s3Service.uploadCSV(csvData, outputKey);

      logger.info('Upload completed successfully', result);

      // Output result for external tools
      console.log(JSON.stringify({
        bucket: result.bucket,
        key: result.key,
        rowCount: sheetData.length
      }));

    } catch (error) {
      logger.error(`Upload process failed: ${error.message}`);
      process.exit(1);
    }
  }
}

// Run if called directly
if (require.main === module) {
  const uploader = new SheetsUploader();
  uploader.run();
}

module.exports = SheetsUploader;