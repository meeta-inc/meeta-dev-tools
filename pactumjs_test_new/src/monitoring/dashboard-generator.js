const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

/**
 * 실시간 모니터링 대시보드 생성기
 * HTML 기반의 인터랙티브 대시보드를 생성하여 모니터링 결과를 시각화
 */
class DashboardGenerator {
  constructor(options = {}) {
    this.options = {
      outputDir: options.outputDir || path.join(__dirname, '../../reports/dashboard'),
      refreshInterval: options.refreshInterval || 30000, // 30초
      chartColors: {
        primary: '#2196F3',
        success: '#4CAF50',
        warning: '#FF9800',
        error: '#F44336',
        info: '#00BCD4'
      },
      ...options
    };

    this.ensureOutputDir();
  }

  /**
   * 출력 디렉토리 생성
   */
  ensureOutputDir() {
    if (!fs.existsSync(this.options.outputDir)) {
      fs.mkdirSync(this.options.outputDir, { recursive: true });
    }
  }

  /**
   * 실시간 대시보드 생성
   */
  generateRealtimeDashboard(metricsData, alertData) {
    const dashboardData = {
      timestamp: Date.now(),
      metrics: metricsData,
      alerts: alertData,
      summary: this.generateSummary(metricsData, alertData)
    };

    const htmlContent = this.generateDashboardHTML(dashboardData);
    const filePath = path.join(this.options.outputDir, 'realtime-dashboard.html');
    
    fs.writeFileSync(filePath, htmlContent);
    
    // JSON 데이터도 별도 저장 (API 용도)
    const jsonPath = path.join(this.options.outputDir, 'dashboard-data.json');
    fs.writeFileSync(jsonPath, JSON.stringify(dashboardData, null, 2));
    
    logger.info('Realtime dashboard generated', { filePath, jsonPath });
    
    return { htmlPath: filePath, jsonPath, data: dashboardData };
  }

  /**
   * 세션 리포트 대시보드 생성
   */
  generateSessionReport(sessionData) {
    const reportData = {
      session: sessionData,
      charts: this.generateChartData(sessionData),
      insights: sessionData.insights || [],
      anomalies: sessionData.anomalies || []
    };

    const htmlContent = this.generateSessionReportHTML(reportData);
    const filePath = path.join(this.options.outputDir, `session-${sessionData.sessionId}-report.html`);
    
    fs.writeFileSync(filePath, htmlContent);
    
    logger.info('Session report generated', { 
      sessionId: sessionData.sessionId, 
      filePath 
    });
    
    return { htmlPath: filePath, data: reportData };
  }

  /**
   * 요약 데이터 생성
   */
  generateSummary(metricsData, alertData) {
    const activeSessions = metricsData.activeSessions || 0;
    const totalRequests = this.getTotalRequests(metricsData);
    const avgResponseTime = this.getAverageResponseTime(metricsData);
    const errorRate = this.getErrorRate(metricsData);
    const alertCount = alertData ? alertData.length : 0;

    return {
      status: this.getOverallStatus(avgResponseTime, errorRate, alertCount),
      activeSessions,
      totalRequests,
      avgResponseTime,
      errorRate,
      alertCount,
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * 전체 상태 판단
   */
  getOverallStatus(avgResponseTime, errorRate, alertCount) {
    if (alertCount > 5 || errorRate > 0.2) {
      return { level: 'critical', text: 'Critical Issues Detected' };
    } else if (alertCount > 2 || errorRate > 0.1 || avgResponseTime > 10000) {
      return { level: 'warning', text: 'Performance Issues' };
    } else if (avgResponseTime > 5000 || errorRate > 0.05) {
      return { level: 'caution', text: 'Minor Issues' };
    } else {
      return { level: 'healthy', text: 'System Healthy' };
    }
  }

  /**
   * 차트 데이터 생성
   */
  generateChartData(sessionData) {
    const charts = {};

    // 응답 시간 차트
    if (sessionData.metrics && sessionData.metrics.responseTimes) {
      charts.responseTime = {
        type: 'line',
        title: 'Response Time Over Time',
        data: sessionData.metrics.responseTimes.map(rt => ({
          x: new Date(rt.timestamp).toISOString(),
          y: rt.time
        })),
        yAxisLabel: 'Response Time (ms)'
      };
    }

    // 성공률 차트
    if (sessionData.metrics) {
      const { totalRequests, successfulRequests } = sessionData.metrics;
      charts.successRate = {
        type: 'donut',
        title: 'Success Rate',
        data: [
          { label: 'Success', value: successfulRequests, color: this.options.chartColors.success },
          { label: 'Failed', value: totalRequests - successfulRequests, color: this.options.chartColors.error }
        ]
      };
    }

    // 오류 타입별 차트
    if (sessionData.metrics && sessionData.metrics.errorsByType) {
      const errorEntries = Object.entries(sessionData.metrics.errorsByType);
      if (errorEntries.length > 0) {
        charts.errorTypes = {
          type: 'bar',
          title: 'Error Types Distribution',
          data: errorEntries.map(([type, count]) => ({
            label: type,
            value: count
          })),
          yAxisLabel: 'Count'
        };
      }
    }

    return charts;
  }

  /**
   * 대시보드 HTML 생성
   */
  generateDashboardHTML(dashboardData) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Navi Test Automation - Real-time Dashboard</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        ${this.getCommonCSS()}
        
        .dashboard-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 2rem;
            text-align: center;
        }
        
        .status-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1rem;
            margin: 2rem;
        }
        
        .status-card {
            background: white;
            border-radius: 8px;
            padding: 1.5rem;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            text-align: center;
        }
        
        .status-healthy { border-left: 5px solid #4CAF50; }
        .status-caution { border-left: 5px solid #FF9800; }
        .status-warning { border-left: 5px solid #FF5722; }
        .status-critical { border-left: 5px solid #F44336; }
        
        .metric-value {
            font-size: 2rem;
            font-weight: bold;
            margin: 0.5rem 0;
        }
        
        .charts-container {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 2rem;
            margin: 2rem;
        }
        
        .chart-card {
            background: white;
            border-radius: 8px;
            padding: 1.5rem;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .alerts-section {
            margin: 2rem;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .alerts-header {
            background: #f5f5f5;
            padding: 1rem 1.5rem;
            border-radius: 8px 8px 0 0;
            border-bottom: 1px solid #ddd;
        }
        
        .alert-item {
            padding: 1rem 1.5rem;
            border-bottom: 1px solid #eee;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .alert-critical { border-left: 4px solid #F44336; }
        .alert-high { border-left: 4px solid #FF5722; }
        .alert-medium { border-left: 4px solid #FF9800; }
        .alert-low { border-left: 4px solid #4CAF50; }
        
        .auto-refresh {
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0,0,0,0.7);
            color: white;
            padding: 0.5rem 1rem;
            border-radius: 20px;
            font-size: 0.9rem;
        }
    </style>
</head>
<body>
    <div class="auto-refresh" id="refreshStatus">
        Auto-refresh: ON (30s)
    </div>
    
    <div class="dashboard-header">
        <h1>🤖 AI Navi Test Automation Dashboard</h1>
        <p>Real-time monitoring and performance insights</p>
        <p><small>Last updated: ${new Date(dashboardData.timestamp).toLocaleString()}</small></p>
    </div>

    <div class="status-cards">
        <div class="status-card status-${dashboardData.summary.status.level}">
            <h3>System Status</h3>
            <div class="metric-value">${dashboardData.summary.status.text}</div>
        </div>
        
        <div class="status-card">
            <h3>Active Sessions</h3>
            <div class="metric-value">${dashboardData.summary.activeSessions}</div>
        </div>
        
        <div class="status-card">
            <h3>Total Requests</h3>
            <div class="metric-value">${dashboardData.summary.totalRequests.toLocaleString()}</div>
        </div>
        
        <div class="status-card">
            <h3>Avg Response Time</h3>
            <div class="metric-value">${Math.round(dashboardData.summary.avgResponseTime)}ms</div>
        </div>
        
        <div class="status-card">
            <h3>Error Rate</h3>
            <div class="metric-value">${(dashboardData.summary.errorRate * 100).toFixed(1)}%</div>
        </div>
        
        <div class="status-card">
            <h3>Active Alerts</h3>
            <div class="metric-value">${dashboardData.summary.alertCount}</div>
        </div>
    </div>

    <div class="charts-container">
        <div class="chart-card">
            <h3>Real-time Performance</h3>
            <canvas id="performanceChart" width="400" height="200"></canvas>
        </div>
        
        <div class="chart-card">
            <h3>Request Volume</h3>
            <canvas id="volumeChart" width="400" height="200"></canvas>
        </div>
    </div>

    <div class="alerts-section">
        <div class="alerts-header">
            <h3>Recent Alerts</h3>
        </div>
        <div id="alertsList">
            ${this.generateAlertsHTML(dashboardData.alerts)}
        </div>
    </div>

    <script>
        // Dashboard data
        const dashboardData = ${JSON.stringify(dashboardData)};
        
        // Initialize charts
        initializeCharts();
        
        // Auto-refresh functionality
        let refreshInterval;
        let isAutoRefresh = true;
        
        function toggleAutoRefresh() {
            if (isAutoRefresh) {
                clearInterval(refreshInterval);
                document.getElementById('refreshStatus').textContent = 'Auto-refresh: OFF';
            } else {
                startAutoRefresh();
                document.getElementById('refreshStatus').textContent = 'Auto-refresh: ON (30s)';
            }
            isAutoRefresh = !isAutoRefresh;
        }
        
        function startAutoRefresh() {
            refreshInterval = setInterval(() => {
                // In a real implementation, this would fetch new data
                location.reload();
            }, ${this.options.refreshInterval});
        }
        
        function initializeCharts() {
            // Performance chart
            const performanceCtx = document.getElementById('performanceChart').getContext('2d');
            new Chart(performanceCtx, {
                type: 'line',
                data: {
                    labels: generateTimeLabels(),
                    datasets: [{
                        label: 'Response Time (ms)',
                        data: generatePerformanceData(),
                        borderColor: '${this.options.chartColors.primary}',
                        backgroundColor: '${this.options.chartColors.primary}20',
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Response Time (ms)'
                            }
                        }
                    }
                }
            });
            
            // Volume chart
            const volumeCtx = document.getElementById('volumeChart').getContext('2d');
            new Chart(volumeCtx, {
                type: 'bar',
                data: {
                    labels: ['Elementary', 'Middle', 'High', 'Preschool'],
                    datasets: [{
                        label: 'Requests',
                        data: generateVolumeData(),
                        backgroundColor: [
                            '${this.options.chartColors.primary}',
                            '${this.options.chartColors.success}',
                            '${this.options.chartColors.warning}',
                            '${this.options.chartColors.info}'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        }
        
        function generateTimeLabels() {
            const labels = [];
            for (let i = 9; i >= 0; i--) {
                const time = new Date(Date.now() - i * 60000);
                labels.push(time.toLocaleTimeString());
            }
            return labels;
        }
        
        function generatePerformanceData() {
            // Mock data - in real implementation, use actual metrics
            return Array.from({length: 10}, () => Math.random() * 3000 + 2000);
        }
        
        function generateVolumeData() {
            // Mock data - in real implementation, use actual metrics
            return [45, 32, 28, 15];
        }
        
        // Click handler for auto-refresh toggle
        document.getElementById('refreshStatus').addEventListener('click', toggleAutoRefresh);
        
        // Start auto-refresh
        startAutoRefresh();
    </script>
</body>
</html>`;
  }

  /**
   * 세션 리포트 HTML 생성
   */
  generateSessionReportHTML(reportData) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Navi Test Session Report - ${reportData.session.sessionId}</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        ${this.getCommonCSS()}
        
        .report-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 2rem;
        }
        
        .session-info {
            background: white;
            margin: 2rem;
            padding: 1.5rem;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            margin: 2rem;
        }
        
        .metric-card {
            background: white;
            padding: 1.5rem;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            text-align: center;
        }
        
        .insights-section, .anomalies-section {
            margin: 2rem;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .section-header {
            background: #f5f5f5;
            padding: 1rem 1.5rem;
            border-radius: 8px 8px 0 0;
            border-bottom: 1px solid #ddd;
        }
        
        .insight-item, .anomaly-item {
            padding: 1rem 1.5rem;
            border-bottom: 1px solid #eee;
        }
        
        .insight-high { border-left: 4px solid #F44336; }
        .insight-medium { border-left: 4px solid #FF9800; }
        .insight-low { border-left: 4px solid #4CAF50; }
    </style>
</head>
<body>
    <div class="report-header">
        <h1>📊 Test Session Report</h1>
        <h2>Session ID: ${reportData.session.sessionId}</h2>
        <p>Duration: ${this.formatDuration(reportData.session.endTime - reportData.session.startTime)}</p>
        <p>Generated: ${new Date().toLocaleString()}</p>
    </div>

    <div class="session-info">
        <h3>Test Configuration</h3>
        <pre>${JSON.stringify(reportData.session.testConfiguration, null, 2)}</pre>
    </div>

    <div class="metrics-grid">
        <div class="metric-card">
            <h3>Total Requests</h3>
            <div class="metric-value">${reportData.session.metrics.totalRequests}</div>
        </div>
        
        <div class="metric-card">
            <h3>Success Rate</h3>
            <div class="metric-value">${((reportData.session.metrics.successfulRequests / reportData.session.metrics.totalRequests) * 100).toFixed(1)}%</div>
        </div>
        
        <div class="metric-card">
            <h3>Avg Response Time</h3>
            <div class="metric-value">${this.calculateAverageResponseTime(reportData.session.metrics.responseTimes)}ms</div>
        </div>
        
        <div class="metric-card">
            <h3>Total Errors</h3>
            <div class="metric-value">${reportData.session.metrics.failedRequests}</div>
        </div>
    </div>

    <div class="charts-container">
        ${this.generateChartsHTML(reportData.charts)}
    </div>

    <div class="insights-section">
        <div class="section-header">
            <h3>Insights & Recommendations</h3>
        </div>
        ${this.generateInsightsHTML(reportData.insights)}
    </div>

    <div class="anomalies-section">
        <div class="section-header">
            <h3>Detected Anomalies</h3>
        </div>
        ${this.generateAnomaliesHTML(reportData.anomalies)}
    </div>

    <script>
        // Initialize charts
        ${this.generateChartsJS(reportData.charts)}
    </script>
</body>
</html>`;
  }

  /**
   * 공통 CSS 스타일
   */
  getCommonCSS() {
    return `
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: #f5f5f5;
            line-height: 1.6;
        }
        
        .metric-value {
            font-size: 2rem;
            font-weight: bold;
            margin: 0.5rem 0;
            color: #333;
        }
        
        .charts-container {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 2rem;
            margin: 2rem;
        }
        
        .chart-card {
            background: white;
            border-radius: 8px;
            padding: 1.5rem;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        h1, h2, h3 {
            margin-bottom: 0.5rem;
        }
        
        pre {
            background: #f8f9fa;
            padding: 1rem;
            border-radius: 4px;
            overflow-x: auto;
            font-size: 0.9rem;
        }
    `;
  }

  /**
   * 알림 HTML 생성
   */
  generateAlertsHTML(alerts) {
    if (!alerts || alerts.length === 0) {
      return '<div class="alert-item">No active alerts</div>';
    }

    return alerts.map(alert => `
      <div class="alert-item alert-${alert.severity.toLowerCase()}">
        <div>
          <strong>${alert.type}</strong>
          <p>${alert.message}</p>
          <small>${new Date(alert.timestamp).toLocaleString()}</small>
        </div>
        <div class="alert-severity">${alert.severity}</div>
      </div>
    `).join('');
  }

  /**
   * 인사이트 HTML 생성
   */
  generateInsightsHTML(insights) {
    if (!insights || insights.length === 0) {
      return '<div class="insight-item">No insights available</div>';
    }

    return insights.map(insight => `
      <div class="insight-item insight-${insight.severity.toLowerCase()}">
        <h4>${insight.type}</h4>
        <p>${insight.message}</p>
        <p><small><strong>Recommendation:</strong> ${insight.recommendation}</small></p>
      </div>
    `).join('');
  }

  /**
   * 이상 징후 HTML 생성
   */
  generateAnomaliesHTML(anomalies) {
    if (!anomalies || anomalies.length === 0) {
      return '<div class="anomaly-item">No anomalies detected</div>';
    }

    return anomalies.map(anomaly => `
      <div class="anomaly-item">
        <h4>${anomaly.type}</h4>
        <p>Severity: ${anomaly.severity}</p>
        <p>${JSON.stringify(anomaly.details)}</p>
        <small>${new Date(anomaly.timestamp).toLocaleString()}</small>
      </div>
    `).join('');
  }

  /**
   * 차트 HTML 생성
   */
  generateChartsHTML(charts) {
    return Object.entries(charts).map(([key, chart]) => `
      <div class="chart-card">
        <h3>${chart.title}</h3>
        <canvas id="${key}Chart" width="400" height="200"></canvas>
      </div>
    `).join('');
  }

  /**
   * 차트 JavaScript 생성
   */
  generateChartsJS(charts) {
    return Object.entries(charts).map(([key, chart]) => {
      if (chart.type === 'line') {
        return `
          new Chart(document.getElementById('${key}Chart').getContext('2d'), {
            type: 'line',
            data: {
              labels: [${chart.data.map(d => `"${d.x}"`).join(',')}],
              datasets: [{
                label: '${chart.yAxisLabel || ''}',
                data: [${chart.data.map(d => d.y).join(',')}],
                borderColor: '${this.options.chartColors.primary}',
                backgroundColor: '${this.options.chartColors.primary}20',
                tension: 0.4
              }]
            },
            options: {
              responsive: true,
              scales: {
                y: {
                  beginAtZero: true,
                  title: { display: true, text: '${chart.yAxisLabel || ''}' }
                }
              }
            }
          });
        `;
      } else if (chart.type === 'donut') {
        return `
          new Chart(document.getElementById('${key}Chart').getContext('2d'), {
            type: 'doughnut',
            data: {
              labels: [${chart.data.map(d => `"${d.label}"`).join(',')}],
              datasets: [{
                data: [${chart.data.map(d => d.value).join(',')}],
                backgroundColor: [${chart.data.map(d => `"${d.color}"`).join(',')}]
              }]
            },
            options: { responsive: true }
          });
        `;
      }
      return '';
    }).join('\n');
  }

  /**
   * 유틸리티 메서드들
   */
  getTotalRequests(metricsData) {
    if (!metricsData.sessions) return 0;
    return Array.from(metricsData.sessions.values())
      .reduce((total, session) => total + (session.metrics.totalRequests || 0), 0);
  }

  getAverageResponseTime(metricsData) {
    if (!metricsData.sessions) return 0;
    const allResponseTimes = Array.from(metricsData.sessions.values())
      .flatMap(session => session.metrics.responseTimes || [])
      .map(rt => rt.time);
    
    if (allResponseTimes.length === 0) return 0;
    return allResponseTimes.reduce((sum, time) => sum + time, 0) / allResponseTimes.length;
  }

  getErrorRate(metricsData) {
    if (!metricsData.sessions) return 0;
    const totalRequests = this.getTotalRequests(metricsData);
    const totalFailed = Array.from(metricsData.sessions.values())
      .reduce((total, session) => total + (session.metrics.failedRequests || 0), 0);
    
    return totalRequests > 0 ? totalFailed / totalRequests : 0;
  }

  calculateAverageResponseTime(responseTimes) {
    if (!responseTimes || responseTimes.length === 0) return 0;
    const sum = responseTimes.reduce((acc, rt) => acc + rt.time, 0);
    return Math.round(sum / responseTimes.length);
  }

  formatDuration(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }
}

module.exports = DashboardGenerator;