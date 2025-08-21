import { ConfigManager } from "./config.js";
import { AuthManager } from "./auth.js";
import { GitHubService } from "./github.js";
import { UIManager } from "./ui.js";

class App {
  constructor() {
    this.configManager = new ConfigManager();
    this.authManager = new AuthManager();
    this.githubService = new GitHubService(this.authManager);
    this.uiManager = new UIManager(this.configManager, this.authManager);
    this.refreshTimer = null;
  }

  async init() {
    this.uiManager.updateAuthStatus();
    await this.fetchAndDisplayDeployments();
    this.setupAutoRefresh();
  }

  async fetchAndDisplayDeployments() {
    try {
      const config = this.configManager.getConfig();
      const { deployments, errors } =
        await this.githubService.fetchAllDeployments(
          config.repositories,
          config.environments
        );

      // Enrich deployments with tag information
      const enrichedDeployments = await Promise.all(
        deployments.map(async (deployment) => {
          if (deployment.sha) {
            try {
              const tagName = await this.githubService.fetchTagForSha(
                deployment.repository,
                deployment.sha
              );
              if (tagName) {
                return { ...deployment, tag: tagName };
              }
            } catch (error) {
              console.warn(
                `Failed to fetch tag for deployment ${deployment.id}:`,
                error
              );
            }
          }
          return deployment;
        })
      );

      if (errors.length > 0) {
        this.uiManager.showError(
          `Warning: Some deployments failed to load. Configure GitHub Authentication to increase rate limit or access private repos. \n${errors.join(
            "\n"
          )}`
        );
      } else {
        this.uiManager.hideError();
      }

      this.uiManager.drawDeployments(enrichedDeployments);
    } catch (error) {
      this.uiManager.showError(error.message);
    }
  }

  setupAutoRefresh() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }
    const config = this.configManager.getConfig();
    this.refreshTimer = setInterval(
      () => this.fetchAndDisplayDeployments(),
      60 * 1000 * config.refreshInterval
    );
  }
}

// Initialize the application when the DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  const app = new App();
  app.init();
});
