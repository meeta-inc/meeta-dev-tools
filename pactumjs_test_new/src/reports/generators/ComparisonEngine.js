const fs = require('fs');
const path = require('path');

/**
 * 응답 비교 엔진
 * 실제 응답과 예상 응답을 비교하고 차이점을 분석
 */
class ComparisonEngine {
  constructor(options = {}) {
    this.options = {
      ignoreWhitespace: options.ignoreWhitespace !== false,
      ignoreCase: options.ignoreCase || false,
      ignoreOrder: options.ignoreOrder || false,
      threshold: options.threshold || 0.8,
      ...options
    };
  }

  /**
   * 두 응답을 비교하여 결과 반환
   * @param {*} actual - 실제 응답
   * @param {*} expected - 예상 응답
   * @param {Object} options - 비교 옵션
   */
  compare(actual, expected, options = {}) {
    const opts = { ...this.options, ...options };
    
    const comparisonResult = {
      isMatch: false,
      similarity: 0,
      differences: [],
      details: {
        actual: this.normalizeValue(actual, opts),
        expected: this.normalizeValue(expected, opts),
        comparedAt: new Date().toISOString()
      },
      analysis: {}
    };

    // 기본 타입 체크
    if (this.getValueType(actual) !== this.getValueType(expected)) {
      comparisonResult.differences.push({
        type: 'type_mismatch',
        path: 'root',
        actual: this.getValueType(actual),
        expected: this.getValueType(expected),
        severity: 'critical'
      });
    }

    // 값 비교
    const comparison = this.compareValues(actual, expected, opts);
    comparisonResult.isMatch = comparison.isMatch;
    comparisonResult.similarity = comparison.similarity;
    comparisonResult.differences.push(...comparison.differences);
    comparisonResult.analysis = this.generateAnalysis(comparisonResult);

    return comparisonResult;
  }

  /**
   * 값 정규화
   */
  normalizeValue(value, options) {
    if (value === null || value === undefined) {
      return value;
    }

    if (typeof value === 'string') {
      let normalized = value;
      
      if (options.ignoreWhitespace) {
        normalized = normalized.trim().replace(/\s+/g, ' ');
      }
      
      if (options.ignoreCase) {
        normalized = normalized.toLowerCase();
      }
      
      return normalized;
    }

    if (Array.isArray(value)) {
      const normalized = value.map(item => this.normalizeValue(item, options));
      return options.ignoreOrder ? normalized.sort() : normalized;
    }

    if (typeof value === 'object') {
      const normalized = {};
      Object.keys(value).sort().forEach(key => {
        normalized[key] = this.normalizeValue(value[key], options);
      });
      return normalized;
    }

    return value;
  }

  /**
   * 값 타입 확인
   */
  getValueType(value) {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (Array.isArray(value)) return 'array';
    return typeof value;
  }

  /**
   * 두 값을 비교
   */
  compareValues(actual, expected, options, path = 'root') {
    const result = {
      isMatch: false,
      similarity: 0,
      differences: []
    };

    // null/undefined 처리
    if (actual === null && expected === null) {
      result.isMatch = true;
      result.similarity = 1.0;
      return result;
    }

    if (actual === null || expected === null) {
      result.differences.push({
        type: 'null_mismatch',
        path,
        actual,
        expected,
        severity: 'high'
      });
      return result;
    }

    // 타입별 비교
    const actualType = this.getValueType(actual);
    const expectedType = this.getValueType(expected);

    if (actualType === 'string' && expectedType === 'string') {
      return this.compareStrings(actual, expected, options, path);
    }

    if (actualType === 'array' && expectedType === 'array') {
      return this.compareArrays(actual, expected, options, path);
    }

    if (actualType === 'object' && expectedType === 'object') {
      return this.compareObjects(actual, expected, options, path);
    }

    // 기본 값 비교
    if (actual === expected) {
      result.isMatch = true;
      result.similarity = 1.0;
    } else {
      result.differences.push({
        type: 'value_mismatch',
        path,
        actual,
        expected,
        severity: 'medium'
      });
      result.similarity = this.calculateSimilarity(actual, expected);
    }

    return result;
  }

  /**
   * 문자열 비교
   */
  compareStrings(actual, expected, options, path) {
    const normalizedActual = this.normalizeValue(actual, options);
    const normalizedExpected = this.normalizeValue(expected, options);

    const result = {
      isMatch: normalizedActual === normalizedExpected,
      similarity: this.calculateStringSimilarity(normalizedActual, normalizedExpected),
      differences: []
    };

    if (!result.isMatch) {
      result.differences.push({
        type: 'string_mismatch',
        path,
        actual: normalizedActual,
        expected: normalizedExpected,
        severity: result.similarity > 0.8 ? 'low' : 'medium',
        diff: this.generateStringDiff(normalizedActual, normalizedExpected)
      });
    }

    return result;
  }

  /**
   * 배열 비교
   */
  compareArrays(actual, expected, options, path) {
    const result = {
      isMatch: true,
      similarity: 0,
      differences: []
    };

    const normalizedActual = this.normalizeValue(actual, options);
    const normalizedExpected = this.normalizeValue(expected, options);

    // 길이 비교
    if (normalizedActual.length !== normalizedExpected.length) {
      result.isMatch = false;
      result.differences.push({
        type: 'array_length_mismatch',
        path,
        actual: normalizedActual.length,
        expected: normalizedExpected.length,
        severity: 'medium'
      });
    }

    // 요소별 비교
    const maxLength = Math.max(normalizedActual.length, normalizedExpected.length);
    let matchCount = 0;

    for (let i = 0; i < maxLength; i++) {
      const actualItem = i < normalizedActual.length ? normalizedActual[i] : undefined;
      const expectedItem = i < normalizedExpected.length ? normalizedExpected[i] : undefined;

      if (actualItem === undefined && expectedItem !== undefined) {
        result.isMatch = false;
        result.differences.push({
          type: 'array_missing_item',
          path: `${path}[${i}]`,
          expected: expectedItem,
          severity: 'medium'
        });
      } else if (actualItem !== undefined && expectedItem === undefined) {
        result.isMatch = false;
        result.differences.push({
          type: 'array_extra_item',
          path: `${path}[${i}]`,
          actual: actualItem,
          severity: 'medium'
        });
      } else if (actualItem !== undefined && expectedItem !== undefined) {
        const itemComparison = this.compareValues(actualItem, expectedItem, options, `${path}[${i}]`);
        
        if (itemComparison.isMatch) {
          matchCount++;
        } else {
          result.isMatch = false;
          result.differences.push(...itemComparison.differences);
        }
      }
    }

    result.similarity = maxLength > 0 ? matchCount / maxLength : 1.0;
    return result;
  }

  /**
   * 객체 비교
   */
  compareObjects(actual, expected, options, path) {
    const result = {
      isMatch: true,
      similarity: 0,
      differences: []
    };

    const normalizedActual = this.normalizeValue(actual, options);
    const normalizedExpected = this.normalizeValue(expected, options);

    const actualKeys = Object.keys(normalizedActual);
    const expectedKeys = Object.keys(normalizedExpected);
    const allKeys = new Set([...actualKeys, ...expectedKeys]);

    let matchCount = 0;

    for (const key of allKeys) {
      const actualValue = normalizedActual[key];
      const expectedValue = normalizedExpected[key];
      const keyPath = path === 'root' ? key : `${path}.${key}`;

      if (!(key in normalizedActual)) {
        result.isMatch = false;
        result.differences.push({
          type: 'object_missing_key',
          path: keyPath,
          expected: expectedValue,
          severity: 'medium'
        });
      } else if (!(key in normalizedExpected)) {
        result.isMatch = false;
        result.differences.push({
          type: 'object_extra_key',
          path: keyPath,
          actual: actualValue,
          severity: 'low'
        });
      } else {
        const keyComparison = this.compareValues(actualValue, expectedValue, options, keyPath);
        
        if (keyComparison.isMatch) {
          matchCount++;
        } else {
          result.isMatch = false;
          result.differences.push(...keyComparison.differences);
        }
      }
    }

    result.similarity = allKeys.size > 0 ? matchCount / allKeys.size : 1.0;
    return result;
  }

  /**
   * 문자열 유사도 계산 (Levenshtein distance 기반)
   */
  calculateStringSimilarity(str1, str2) {
    if (str1 === str2) return 1.0;
    
    const len1 = str1.length;
    const len2 = str2.length;
    
    if (len1 === 0) return len2 === 0 ? 1.0 : 0.0;
    if (len2 === 0) return 0.0;

    const matrix = Array(len1 + 1).fill().map(() => Array(len2 + 1).fill(0));

    for (let i = 0; i <= len1; i++) matrix[i][0] = i;
    for (let j = 0; j <= len2; j++) matrix[0][j] = j;

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,      // deletion
          matrix[i][j - 1] + 1,      // insertion
          matrix[i - 1][j - 1] + cost // substitution
        );
      }
    }

    const maxLen = Math.max(len1, len2);
    return (maxLen - matrix[len1][len2]) / maxLen;
  }

  /**
   * 일반적인 유사도 계산
   */
  calculateSimilarity(actual, expected) {
    if (actual === expected) return 1.0;
    
    if (typeof actual === 'string' && typeof expected === 'string') {
      return this.calculateStringSimilarity(actual, expected);
    }
    
    if (typeof actual === 'number' && typeof expected === 'number') {
      const diff = Math.abs(actual - expected);
      const max = Math.max(Math.abs(actual), Math.abs(expected));
      return max === 0 ? 1.0 : Math.max(0, 1 - diff / max);
    }
    
    return 0.0;
  }

  /**
   * 문자열 차이점 생성
   */
  generateStringDiff(actual, expected) {
    const actualLines = actual.split('\n');
    const expectedLines = expected.split('\n');
    
    return {
      added: expectedLines.filter(line => !actualLines.includes(line)),
      removed: actualLines.filter(line => !expectedLines.includes(line)),
      common: actualLines.filter(line => expectedLines.includes(line))
    };
  }

  /**
   * 비교 결과 분석 생성
   */
  generateAnalysis(comparisonResult) {
    const analysis = {
      summary: '',
      recommendations: [],
      severity: 'low',
      categories: {}
    };

    const { differences, similarity } = comparisonResult;

    // 심각도 판단
    const criticalDiffs = differences.filter(d => d.severity === 'critical');
    const highDiffs = differences.filter(d => d.severity === 'high');
    const mediumDiffs = differences.filter(d => d.severity === 'medium');

    if (criticalDiffs.length > 0) {
      analysis.severity = 'critical';
      analysis.summary = `Critical differences found: ${criticalDiffs.length} critical issues`;
    } else if (highDiffs.length > 0) {
      analysis.severity = 'high';
      analysis.summary = `High priority differences found: ${highDiffs.length} high priority issues`;
    } else if (mediumDiffs.length > 0) {
      analysis.severity = 'medium';
      analysis.summary = `Medium priority differences found: ${mediumDiffs.length} medium priority issues`;
    } else if (differences.length > 0) {
      analysis.severity = 'low';
      analysis.summary = `Minor differences found: ${differences.length} low priority issues`;
    } else {
      analysis.severity = 'none';
      analysis.summary = 'No differences found - responses match perfectly';
    }

    // 카테고리별 분류
    differences.forEach(diff => {
      if (!analysis.categories[diff.type]) {
        analysis.categories[diff.type] = [];
      }
      analysis.categories[diff.type].push(diff);
    });

    // 권장사항 생성
    if (similarity < 0.5) {
      analysis.recommendations.push('Consider reviewing the test case or API implementation - significant differences detected');
    } else if (similarity < 0.8) {
      analysis.recommendations.push('Minor adjustments may be needed to improve response consistency');
    }

    if (criticalDiffs.length > 0) {
      analysis.recommendations.push('Address critical type mismatches immediately');
    }

    if (Object.keys(analysis.categories).includes('array_length_mismatch')) {
      analysis.recommendations.push('Check array processing logic - length mismatches detected');
    }

    return analysis;
  }

  /**
   * HTML 비교 리포트 생성
   */
  generateHTMLReport(comparisonResult) {
    const { isMatch, similarity, differences, analysis } = comparisonResult;
    
    return `
      <div class="comparison-report">
        <div class="comparison-summary ${isMatch ? 'match' : 'no-match'}">
          <div class="summary-header">
            <h3>${isMatch ? '✅ Match' : '❌ No Match'}</h3>
            <div class="similarity-score">
              <span class="score">${(similarity * 100).toFixed(1)}%</span>
              <span class="label">Similarity</span>
            </div>
          </div>
          
          <div class="analysis-summary">
            <p class="severity-${analysis.severity}">${analysis.summary}</p>
          </div>
        </div>

        ${differences.length > 0 ? `
        <div class="differences-section">
          <h4>Differences Found (${differences.length})</h4>
          ${this.renderDifferences(differences)}
        </div>
        ` : ''}

        ${analysis.recommendations.length > 0 ? `
        <div class="recommendations-section">
          <h4>Recommendations</h4>
          <ul class="recommendations-list">
            ${analysis.recommendations.map(rec => `<li>${rec}</li>`).join('')}
          </ul>
        </div>
        ` : ''}

        <div class="raw-data-section">
          <details>
            <summary>View Raw Comparison Data</summary>
            <pre class="raw-data">${JSON.stringify(comparisonResult, null, 2)}</pre>
          </details>
        </div>
      </div>
    `;
  }

  /**
   * 차이점 렌더링
   */
  renderDifferences(differences) {
    return differences.map(diff => `
      <div class="difference-item severity-${diff.severity}">
        <div class="diff-header">
          <span class="diff-type">${diff.type.replace(/_/g, ' ')}</span>
          <span class="diff-path">${diff.path}</span>
          <span class="diff-severity severity-${diff.severity}">${diff.severity}</span>
        </div>
        
        <div class="diff-content">
          ${diff.actual !== undefined ? `
            <div class="diff-actual">
              <label>Actual:</label>
              <code>${JSON.stringify(diff.actual)}</code>
            </div>
          ` : ''}
          
          ${diff.expected !== undefined ? `
            <div class="diff-expected">
              <label>Expected:</label>
              <code>${JSON.stringify(diff.expected)}</code>
            </div>
          ` : ''}
          
          ${diff.diff ? `
            <div class="diff-details">
              <details>
                <summary>View Detailed Diff</summary>
                <pre>${JSON.stringify(diff.diff, null, 2)}</pre>
              </details>
            </div>
          ` : ''}
        </div>
      </div>
    `).join('');
  }

  /**
   * 비교 엔진 CSS 스타일 생성
   */
  generateComparisonCSS() {
    return `
      /* Comparison Report Styles */
      .comparison-report {
        border: 1px solid #e0e0e0;
        border-radius: 0.5rem;
        overflow: hidden;
        margin: 1rem 0;
      }
      
      .comparison-summary {
        padding: 1.5rem;
        background: #f8f9fa;
      }
      
      .comparison-summary.match {
        background: #f0f8ff;
        border-left: 4px solid #4CAF50;
      }
      
      .comparison-summary.no-match {
        background: #fff5f5;
        border-left: 4px solid #F44336;
      }
      
      .summary-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
      }
      
      .similarity-score {
        text-align: center;
      }
      
      .similarity-score .score {
        display: block;
        font-size: 1.5rem;
        font-weight: bold;
        color: #333;
      }
      
      .similarity-score .label {
        font-size: 0.75rem;
        color: #666;
        text-transform: uppercase;
      }
      
      .differences-section,
      .recommendations-section {
        padding: 1.5rem;
        border-top: 1px solid #e0e0e0;
      }
      
      .difference-item {
        margin: 1rem 0;
        padding: 1rem;
        border-radius: 0.25rem;
        border-left: 3px solid #ccc;
      }
      
      .difference-item.severity-critical {
        border-left-color: #F44336;
        background: #ffebee;
      }
      
      .difference-item.severity-high {
        border-left-color: #FF5722;
        background: #fff3e0;
      }
      
      .difference-item.severity-medium {
        border-left-color: #FF9800;
        background: #fffde7;
      }
      
      .difference-item.severity-low {
        border-left-color: #4CAF50;
        background: #f1f8e9;
      }
      
      .diff-header {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        margin-bottom: 0.75rem;
      }
      
      .diff-type {
        font-weight: 600;
        text-transform: capitalize;
      }
      
      .diff-path {
        font-family: monospace;
        background: rgba(0,0,0,0.1);
        padding: 0.125rem 0.375rem;
        border-radius: 0.25rem;
        font-size: 0.875rem;
      }
      
      .diff-severity {
        margin-left: auto;
        padding: 0.125rem 0.5rem;
        border-radius: 1rem;
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
      }
      
      .severity-critical {
        background: #F44336;
        color: white;
      }
      
      .severity-high {
        background: #FF5722;
        color: white;
      }
      
      .severity-medium {
        background: #FF9800;
        color: white;
      }
      
      .severity-low {
        background: #4CAF50;
        color: white;
      }
      
      .diff-content {
        display: grid;
        gap: 0.5rem;
      }
      
      .diff-actual,
      .diff-expected {
        display: flex;
        align-items: flex-start;
        gap: 0.5rem;
      }
      
      .diff-actual label,
      .diff-expected label {
        font-weight: 600;
        min-width: 4rem;
        color: #666;
      }
      
      .diff-actual code,
      .diff-expected code {
        background: rgba(0,0,0,0.05);
        padding: 0.25rem 0.5rem;
        border-radius: 0.25rem;
        font-family: monospace;
        flex: 1;
        word-break: break-all;
      }
      
      .recommendations-list {
        margin: 0;
        padding-left: 1.5rem;
      }
      
      .recommendations-list li {
        margin: 0.5rem 0;
        color: #666;
      }
      
      .raw-data-section {
        padding: 1rem 1.5rem;
        background: #f8f9fa;
        border-top: 1px solid #e0e0e0;
      }
      
      .raw-data {
        background: #fff;
        padding: 1rem;
        border-radius: 0.25rem;
        border: 1px solid #e0e0e0;
        font-size: 0.75rem;
        max-height: 300px;
        overflow-y: auto;
      }
      
      @media (max-width: 768px) {
        .summary-header {
          flex-direction: column;
          gap: 1rem;
        }
        
        .diff-header {
          flex-wrap: wrap;
        }
        
        .diff-content {
          grid-template-columns: 1fr;
        }
      }
    `;
  }
}

module.exports = ComparisonEngine;