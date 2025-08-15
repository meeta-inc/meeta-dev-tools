/**
 * 환경별 설정 파일
 */

const environments = {
  dev: {
    region: 'ap-northeast-1',
    profile: 'meeta-ai-navi-dev',
    tables: {
      faq: 'ai-navi-faq-table-dev',
      faqCategory: 'ai-navi-faq-category-table-dev',
      faqHistory: 'ai-navi-faq-history-table-dev'
    }
  },
  dev2: {
    region: 'ap-northeast-1',
    profile: 'meeta-ai-navi-dev',
    tables: {
      faq: 'ai-navi-faq-table-dev2',
      faqCategory: 'ai-navi-faq-category-table-dev2',
      faqHistory: 'ai-navi-faq-history-table-dev2'
    }
  },
  uat1: {
    region: 'ap-northeast-1',
    profile: 'meeta-ai-navi-uat',
    tables: {
      faq: 'ai-navi-faq-table-uat1',
      faqCategory: 'ai-navi-faq-category-table-uat1',
      faqHistory: 'ai-navi-faq-history-table-uat1'
    }
  },
  uat2: {
    region: 'ap-northeast-1',
    profile: 'meeta-ai-navi-uat',
    tables: {
      faq: 'ai-navi-faq-table-uat2',
      faqCategory: 'ai-navi-faq-category-table-uat2',
      faqHistory: 'ai-navi-faq-history-table-uat2'
    }
  },
  uat3: {
    region: 'ap-northeast-1',
    profile: 'meeta-ai-navi-uat',
    tables: {
      faq: 'ai-navi-faq-table-uat3',
      faqCategory: 'ai-navi-faq-category-table-uat3',
      faqHistory: 'ai-navi-faq-history-table-uat3'
    }
  },
  prd: {
    region: 'ap-northeast-1',
    profile: 'meeta-ai-navi-prod',
    tables: {
      faq: 'ai-navi-faq-table-prd',
      faqCategory: 'ai-navi-faq-category-table-prd',
      faqHistory: 'ai-navi-faq-history-table-prd'
    }
  },
  prd1: {
    region: 'ap-northeast-1',
    profile: 'meeta-ai-navi-prod',
    tables: {
      faq: 'ai-navi-faq-table-prd1',
      faqCategory: 'ai-navi-faq-category-table-prd1',
      faqHistory: 'ai-navi-faq-history-table-prd1'
    }
  },
  prd2: {
    region: 'ap-northeast-1',
    profile: 'meeta-ai-navi-prod',
    tables: {
      faq: 'ai-navi-faq-table-prd2',
      faqCategory: 'ai-navi-faq-category-table-prd2',
      faqHistory: 'ai-navi-faq-history-table-prd2'
    }
  }
};

/**
 * 환경 설정 가져오기
 * @param {string} env - 환경 이름
 * @returns {Object} 환경 설정
 */
function getConfig(env) {
  if (!environments[env]) {
    throw new Error(`Unknown environment: ${env}. Valid environments: ${Object.keys(environments).join(', ')}`);
  }
  return environments[env];
}

/**
 * 현재 환경 가져오기 (기본값: dev)
 * @returns {string} 현재 환경
 */
function getCurrentEnvironment() {
  return process.env.ENV || 'dev';
}

module.exports = {
  environments,
  getConfig,
  getCurrentEnvironment
};