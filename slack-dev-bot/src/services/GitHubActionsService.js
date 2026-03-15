const { Octokit } = require('@octokit/rest');

class GitHubActionsService {
  /**
   * @param {object} options
   * @param {string} options.token - GitHub Personal Access Token
   * @param {string} options.owner - GitHub 레포지토리 소유자
   * @param {string} options.repo - GitHub 레포지토리 이름
   * @param {string} options.workflowFile - Workflow 파일명
   * @param {string} options.ref - 브랜치명
   */
  constructor({ token, owner, repo, workflowFile, ref }) {
    this.octokit = new Octokit({ auth: token });
    this.owner = owner;
    this.repo = repo;
    this.workflowFile = workflowFile;
    this.ref = ref;
  }

  /**
   * GitHub Actions workflow_dispatch를 트리거한다.
   * @param {'start'|'stop'|'check-reservations'} action - 수행할 액션
   * @returns {Promise<void>}
   */
  async triggerWorkflow(action) {
    await this.octokit.actions.createWorkflowDispatch({
      owner: this.owner,
      repo: this.repo,
      workflow_id: this.workflowFile,
      ref: this.ref,
      inputs: { action },
    });
  }
}

module.exports = GitHubActionsService;
