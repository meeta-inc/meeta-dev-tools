const { google } = require('googleapis');
const fs = require('fs');
const config = require('../../../config/default');
const logger = require('../../utils/logger');

/**
 * Google Sheets Service for reading and writing test data
 */
class GoogleSheetsService {
  constructor(options = {}) {
    this.serviceAccountPath = options.serviceAccountPath || config.gsheet.serviceAccountPath;
    this.spreadsheetId = options.spreadsheetId || config.gsheet.spreadsheetId;
    this.auth = null;
    this.sheets = null;
  }

  /**
   * Initialize Google Sheets authentication
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      // Load service account credentials
      let credentials;
      if (this.serviceAccountPath && fs.existsSync(this.serviceAccountPath)) {
        credentials = JSON.parse(fs.readFileSync(this.serviceAccountPath, 'utf8'));
      } else {
        // Use environment variables
        credentials = {
          client_email: process.env.GOOGLE_CLIENT_EMAIL,
          private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')
        };
      }

      this.auth = new google.auth.JWT({
        email: credentials.client_email,
        key: credentials.private_key,
        scopes: [
          'https://www.googleapis.com/auth/spreadsheets.readonly',
          'https://www.googleapis.com/auth/spreadsheets'
        ],
      });

      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
      
      logger.info('Google Sheets service initialized successfully');

    } catch (error) {
      logger.error(`Failed to initialize Google Sheets service: ${error.message}`);
      throw error;
    }
  }

  /**
   * Read data from Google Sheets
   * @param {string} range - Sheet range (e.g., 'Sheet1!A:Z')
   * @param {string} spreadsheetId - Optional spreadsheet ID
   * @returns {Promise<Array>} Sheet data as array of arrays
   */
  async readData(range = null, spreadsheetId = null) {
    if (!this.sheets) {
      await this.initialize();
    }

    try {
      const sheetId = spreadsheetId || this.spreadsheetId;
      const sheetRange = range || config.gsheet.range;

      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: sheetRange,
      });

      const data = response.data.values || [];
      
      logger.info(`Read ${data.length} rows from Google Sheets`, {
        spreadsheetId: sheetId,
        range: sheetRange
      });

      return data;

    } catch (error) {
      logger.error(`Failed to read Google Sheets data: ${error.message}`);
      throw error;
    }
  }

  /**
   * Write data to Google Sheets
   * @param {Array} data - Data to write (array of arrays)
   * @param {string} range - Target range (e.g., 'Results!A1')
   * @param {string} spreadsheetId - Optional spreadsheet ID
   * @returns {Promise<Object>} Write result
   */
  async writeData(data, range, spreadsheetId = null) {
    if (!this.sheets) {
      await this.initialize();
    }

    try {
      const sheetId = spreadsheetId || this.spreadsheetId;

      const response = await this.sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: range,
        valueInputOption: 'RAW',
        resource: {
          values: data
        }
      });

      logger.info(`Wrote ${data.length} rows to Google Sheets`, {
        spreadsheetId: sheetId,
        range: range,
        updatedRows: response.data.updatedRows
      });

      return {
        success: true,
        updatedRows: response.data.updatedRows,
        updatedColumns: response.data.updatedColumns,
        updatedCells: response.data.updatedCells
      };

    } catch (error) {
      logger.error(`Failed to write Google Sheets data: ${error.message}`);
      throw error;
    }
  }

  /**
   * Convert sheet data to CSV format
   * @param {Array} data - Sheet data (array of arrays)
   * @returns {string} CSV formatted string
   */
  convertToCSV(data) {
    if (!data || data.length === 0) return '';
    
    return data.map(row => {
      return row.map(cell => {
        const cellStr = String(cell || '');
        // Escape cells containing commas, quotes, or newlines
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(',');
    }).join('\n');
  }

  /**
   * Read test cases from Google Sheets and convert to standard format
   * @param {string} range - Sheet range
   * @returns {Promise<Array>} Array of test case objects
   */
  async getTestCases(range = null) {
    const data = await this.readData(range);
    
    if (data.length === 0) {
      return [];
    }

    const testCases = [];
    // Skip header row
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row.length >= 5 && row[4]) {
        const testCase = {
          testId: row[0] || `gsheet_${i}`,
          userRole: row[1] || 'User_S',
          userId: row[2] || 'gsheet_user',
          category: row[3] || 'general',
          message: row[4],
          grade: 'elementary', // Default, can be overridden
          source: 'gsheet'
        };
        testCases.push(testCase);
      }
    }

    logger.info(`Converted ${testCases.length} test cases from Google Sheets`);
    return testCases;
  }

  /**
   * Upload test results to Google Sheets
   * @param {Array} results - Test results array
   * @param {string} targetRange - Target sheet range (e.g., 'Results!A1')
   * @returns {Promise<Object>} Upload result
   */
  async uploadResults(results, targetRange = 'Results!A1') {
    // Convert results to sheet format
    const headers = [
      '테스트번호', '유저역할', '유저아이디', '테스트카테고리', '메세지',
      '응답결과_스테이터스코드', '응답결과_바디', '응답시간(ms)', '실행시간'
    ];

    const rows = [headers];
    results.forEach(result => {
      rows.push([
        result.testId || '',
        result.userRole || 'User_S',
        result.userId || '',
        result.category || '',
        result.message || '',
        result.statusCode || '',
        typeof result.body === 'object' ? JSON.stringify(result.body) : result.body || '',
        result.responseTime || '',
        new Date().toISOString()
      ]);
    });

    return await this.writeData(rows, targetRange);
  }
}

module.exports = GoogleSheetsService;