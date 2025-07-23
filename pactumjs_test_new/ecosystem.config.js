module.exports = {
  apps: [{
    name: 'ai-navi-test-automation',
    script: 'dist/scripts/run-tests.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    },
    env_production: {
      NODE_ENV: 'production',
      API_TIMEOUT: 30000,
      TEST_CONCURRENCY: 5
    },
    env_development: {
      NODE_ENV: 'development',
      API_TIMEOUT: 60000,
      TEST_CONCURRENCY: 3
    },
    cron_restart: '0 2 * * *', // 매일 오전 2시 재시작
    log_file: './reports/logs/combined.log',
    out_file: './reports/logs/out.log',
    error_file: './reports/logs/error.log',
    time: true,
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};