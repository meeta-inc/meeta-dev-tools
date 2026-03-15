const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');

class SsmService {
  /**
   * @param {object} options
   * @param {string} options.region - AWS 리전
   * @param {string} options.parameterPrefix - SSM 파라미터 접두사 (예: /ai-bridge/dev/env-control)
   */
  constructor({ region, parameterPrefix }) {
    this.client = new SSMClient({ region });
    this.prefix = parameterPrefix;
  }

  /**
   * Dev 환경 상태를 SSM에서 조회한다.
   * @returns {{ status: string, lastAction: string|null, lastActionTime: string|null, lastActionBy: string|null }}
   */
  async getEnvStatus() {
    const [status, lastAction, lastActionTime, lastActionBy] = await Promise.all([
      this._getParameter(`${this.prefix}/state`),
      this._getParameter(`${this.prefix}/last-action`),
      this._getParameter(`${this.prefix}/last-action-time`),
      this._getParameter(`${this.prefix}/last-action-by`),
    ]);

    return {
      status: status || 'unknown',
      lastAction: lastAction || null,
      lastActionTime: lastActionTime || null,
      lastActionBy: lastActionBy || null,
    };
  }

  /**
   * SSM 파라미터 값을 조회한다. 없으면 null 반환.
   */
  async _getParameter(name) {
    try {
      const command = new GetParameterCommand({ Name: name });
      const response = await this.client.send(command);
      return response.Parameter?.Value || null;
    } catch (error) {
      if (error.name === 'ParameterNotFound') return null;
      throw error;
    }
  }
}

module.exports = SsmService;
