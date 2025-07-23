const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const XLSX = require('xlsx');
const logger = require('../utils/logger');

/**
 * Test Case Loader - Handles loading test cases from various sources
 */
class TestCaseLoader {
  constructor() {
    this.testCases = [];
  }

  /**
   * Load test cases from CSV file
   * @param {string} filePath - Path to CSV file
   * @returns {Array} Array of test case objects
   */
  loadFromCSV(filePath) {
    try {
      logger.info(`Loading test cases from CSV: ${filePath}`);
      
      const csvContent = fs.readFileSync(filePath, 'utf-8');
      const records = parse(csvContent, {
        skip_empty_lines: true,
        relax_column_count: true
      });

      const testCases = [];
      
      // Skip header row and process data
      for (let i = 1; i < records.length; i++) {
        const row = records[i];
        if (row.length >= 5 && row[4] && row[4].trim() !== '') {
          const testCase = {
            testId: row[0] || `test_${i}`,
            userRole: row[1] || 'User_S',
            userId: row[2] || 'default_user',
            category: row[3] || 'general',
            message: row[4].trim(),
            grade: this._extractGradeFromCategory(row[3]) || 'elementary',
            expectedBubbles: 3, // Default expectation
            source: 'csv'
          };
          testCases.push(testCase);
        }
      }

      logger.info(`Loaded ${testCases.length} test cases from CSV`);
      this.testCases = testCases;
      return testCases;

    } catch (error) {
      logger.error(`Failed to load CSV file: ${error.message}`);
      throw error;
    }
  }

  /**
   * Load test cases from Excel file
   * @param {string} filePath - Path to Excel file
   * @returns {Array} Array of test case objects
   */
  loadFromExcel(filePath) {
    try {
      logger.info(`Loading test cases from Excel: ${filePath}`);
      
      const workbook = XLSX.readFile(filePath);
      const testCases = [];

      // Process each sheet (assuming grade-based sheets)
      workbook.SheetNames.forEach(sheetName => {
        if (sheetName === 'カテゴリ(카테고리)') return; // Skip category sheet

        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        
        const grade = this._mapSheetNameToGrade(sheetName);
        
        // Process data rows (skip header)
        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          if (row.length >= 5 && row[4]) {
            const testCase = {
              testId: `${grade.toUpperCase()}_${row[1] || `${i}`}`,
              userRole: 'User_S',
              userId: 'faq_user_001',
              category: row[2] || 'general',
              categoryPriority: row[3] || null,
              message: row[4],
              expectedAnswer: row[5] || '',
              attachment: row[6] || null,
              grade: grade,
              expectedBubbles: this._countExpectedBubbles(row[5]),
              source: 'excel_faq'
            };
            testCases.push(testCase);
          }
        }
      });

      logger.info(`Loaded ${testCases.length} test cases from Excel`);
      this.testCases = [...this.testCases, ...testCases];
      return testCases;

    } catch (error) {
      logger.error(`Failed to load Excel file: ${error.message}`);
      throw error;
    }
  }

  /**
   * Filter test cases by criteria
   * @param {Object} filters - Filter criteria
   * @returns {Array} Filtered test cases
   */
  filter(filters = {}) {
    let filtered = [...this.testCases];

    if (filters.grade) {
      filtered = filtered.filter(tc => tc.grade === filters.grade);
    }

    if (filters.category) {
      filtered = filtered.filter(tc => tc.category && tc.category.includes(filters.category));
    }

    if (filters.testId) {
      filtered = filtered.filter(tc => tc.testId === filters.testId);
    }

    if (filters.source) {
      filtered = filtered.filter(tc => tc.source === filters.source);
    }

    logger.info(`Filtered ${filtered.length} test cases from ${this.testCases.length} total`);
    return filtered;
  }

  /**
   * Get test cases with default parameters applied
   * @param {Object} defaults - Default parameters
   * @returns {Array} Test cases with defaults
   */
  getWithDefaults(defaults = {}) {
    const config = require('../../config/default');
    const defaultParams = { ...config.defaults, ...defaults };

    return this.testCases.map(testCase => ({
      ...testCase,
      clientId: defaultParams.clientId,
      appId: defaultParams.appId,
      userId: testCase.userId || defaultParams.userId
    }));
  }

  /**
   * Extract grade from category string
   * @private
   */
  _extractGradeFromCategory(category) {
    if (!category) return 'elementary';
    
    const gradeMap = {
      '고등': 'high',
      '중등': 'middle', 
      '초등': 'elementary',
      '유아': 'preschool'
    };

    for (const [key, value] of Object.entries(gradeMap)) {
      if (category.includes(key)) return value;
    }
    
    return 'elementary';
  }

  /**
   * Map sheet name to grade
   * @private
   */
  _mapSheetNameToGrade(sheetName) {
    const gradeMap = {
      '高校生(고등학생)': 'high',
      '中学生(중학생)': 'middle',
      '小学生(초등학생)': 'elementary',
      '幼児(유아)': 'preschool'
    };

    return gradeMap[sheetName] || 'elementary';
  }

  /**
   * Count expected bubbles from answer text
   * @private
   */
  _countExpectedBubbles(answerText) {
    if (!answerText) return 2;
    
    // Count bubble separators (---)
    const separators = (answerText.match(/---/g) || []).length;
    return Math.max(2, separators + 1);
  }
}

module.exports = TestCaseLoader;