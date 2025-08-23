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
          'https://www.googleapis.com/auth/spreadsheets',
          'https://www.googleapis.com/auth/drive'
        ],
      });

      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
      this.drive = google.drive({ version: 'v3', auth: this.auth });
      
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
   * Create a new spreadsheet file with timestamp-based name in Google Drive folder
   * @param {string} testType - Type of test (Single, Grade, Category, All)
   * @returns {Promise<Object>} New spreadsheet info
   */
  async createNewSpreadsheet(testType = 'Results') {
    await this.initialize();

    const now = new Date();
    const timestamp = now.toISOString()
      .replace(/T/, '_')
      .replace(/:/g, '-')
      .replace(/\..+/, '');
    
    const spreadsheetTitle = `AI_Navi_Test_${testType}_${timestamp}`;

    try {
      // Create the spreadsheet request
      const createRequest = {
        resource: {
          properties: {
            title: spreadsheetTitle
          },
          sheets: [{
            properties: {
              title: 'Test Results',
              gridProperties: {
                rowCount: 1000,
                columnCount: 26
              }
            }
          }]
        }
      };

      // If folder ID is provided, create file in that folder using Drive API
      let newSpreadsheetId, spreadsheetUrl;
      
      if (config.gsheet.driveFolderId) {
        // Create spreadsheet directly in the folder using Drive API
        const driveResponse = await this.drive.files.create({
          resource: {
            name: spreadsheetTitle,
            parents: [config.gsheet.driveFolderId],
            mimeType: 'application/vnd.google-apps.spreadsheet'
          }
        });
        
        newSpreadsheetId = driveResponse.data.id;
        spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${newSpreadsheetId}/edit`;
        
        // Now update the created file with sheet structure
        await this.sheets.spreadsheets.batchUpdate({
          spreadsheetId: newSpreadsheetId,
          resource: {
            requests: [{
              updateSheetProperties: {
                properties: {
                  sheetId: 0,
                  title: 'Test Results',
                  gridProperties: {
                    rowCount: 1000,
                    columnCount: 26
                  }
                },
                fields: 'title,gridProperties'
              }
            }]
          }
        });
        
        logger.info(`Created spreadsheet directly in folder: ${config.gsheet.driveFolderId}`);
      } else {
        // Create normally if no folder specified
        const response = await this.sheets.spreadsheets.create(createRequest);
        newSpreadsheetId = response.data.spreadsheetId;
        spreadsheetUrl = response.data.spreadsheetUrl;
      }

      logger.info(`Created new spreadsheet: ${spreadsheetTitle}`, {
        id: newSpreadsheetId,
        url: spreadsheetUrl
      });

      return {
        spreadsheetId: newSpreadsheetId,
        url: spreadsheetUrl,
        title: spreadsheetTitle,
        sheetName: 'Test Results'
      };

    } catch (error) {
      logger.error(`Failed to create new spreadsheet: ${error.message}`);
      throw error;
    }
  }

  /**
   * LLM 응답에서 버블별 텍스트 추출
   * @param {string|object} responseBody - 응답 바디 (JSON 문자열 또는 객체)
   * @returns {object} 버블별 텍스트 객체
   */
  extractBubbleTexts(responseBody) {
    try {
      let bubbles = responseBody;
      
      // 문자열인 경우 JSON 파싱
      if (typeof responseBody === 'string') {
        bubbles = JSON.parse(responseBody);
      }
      
      // 새로운 구조 처리: {"response": [...], "tool": ...}
      if (bubbles && bubbles.response && Array.isArray(bubbles.response)) {
        bubbles = bubbles.response;
      }
      
      // 배열이 아닌 경우 빈 객체 반환
      if (!Array.isArray(bubbles)) {
        return { main: '', sub: '', cta: '' };
      }
      
      const result = { main: '', sub: '', cta: '' };
      
      bubbles.forEach(bubble => {
        if (bubble.type && bubble.text) {
          const cleanText = bubble.text.replace(/\n/g, '').trim();
          if (bubble.type === 'main') result.main = cleanText;
          else if (bubble.type === 'sub') result.sub = cleanText;
          else if (bubble.type === 'cta') result.cta = cleanText;
        }
      });
      
      return result;
    } catch (error) {
      logger.warn(`Failed to parse bubble texts: ${error.message}`);
      return { main: '', sub: '', cta: '' };
    }
  }

  /**
   * Upload test results to a new Google Sheets tab with unique naming
   * @param {Array} results - Test results array
   * @param {string} testType - Type of test for sheet naming
   * @param {string} model - AI model used for the test
   * @returns {Promise<Object>} Upload result with sheet URL
   */
  async uploadResults(results, testType = 'Results', model = 'anthropic') {
    await this.initialize();

    const now = new Date();
    const timestamp = now.toISOString()
      .replace(/T/, '_')
      .replace(/:/g, '-')
      .replace(/\..+/, '');
    
    // Add model prefix to sheet name
    const modelPrefix = model === 'openai' ? 'OpenAI' : 'Anthropic';
    const sheetName = `${modelPrefix}_${testType}_${timestamp}`;

    try {
      // Create new sheet in existing spreadsheet
      const response = await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        resource: {
          requests: [{
            addSheet: {
              properties: {
                title: sheetName,
                gridProperties: {
                  rowCount: 1000,
                  columnCount: 26
                }
              }
            }
          }]
        }
      });

      const newSheetId = response.data.replies[0].addSheet.properties.sheetId;
      logger.info(`Created new sheet: ${sheetName}`, { sheetId: newSheetId });

      // Convert results to sheet format
      const headers = [
        '테스트번호', '유저역할', '유저아이디', '테스트카테고리', '메세지',
        '응답결과_스테이터스코드', 'main버블', 'sub버블', 'cta버블', 
        '응답시간(ms)', '성공여부', '검증오류', '실행일시', '응답결과_바디'
      ];

      const rows = [headers];
      results.forEach(result => {
        const bubbleTexts = this.extractBubbleTexts(result.body);
        
        rows.push([
          result.testId || '',
          result.userRole || 'User_S',
          result.userId || '',
          result.category || '',
          result.message || '',
          result.statusCode || '',
          bubbleTexts.main,      // main버블
          bubbleTexts.sub,       // sub버블  
          bubbleTexts.cta,       // cta버블
          result.responseTime || '',
          result.success ? '성공' : '실패',
          result.validationErrors ? result.validationErrors.join('; ') : '',
          new Date().toISOString(),
          typeof result.body === 'object' ? JSON.stringify(result.body) : result.body || ''
        ]);
      });

      const targetRange = `${sheetName}!A1`;
      const writeResult = await this.writeData(rows, targetRange);
      
      const sheetUrl = `https://docs.google.com/spreadsheets/d/${this.spreadsheetId}/edit#gid=${newSheetId}`;
      
      logger.info('Results uploaded to new Google Sheet', {
        sheetName,
        url: sheetUrl
      });
      
      // Return result with specific sheet URL
      return {
        ...writeResult,
        sheetName,
        url: sheetUrl
      };

    } catch (error) {
      logger.error(`Failed to create new sheet: ${error.message}`);
      throw error;
    }
  }
}

module.exports = GoogleSheetsService;