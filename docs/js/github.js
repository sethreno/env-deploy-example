export class GitHubService {
  constructor(authManager) {
    this.authManager = authManager;
  }

  async fetchEnvironmentDeployment(repository, environment) {
    const token = this.authManager.getStoredToken();
    const headers = {
      Accept: "application/vnd.github.v3+json",
      ...(token && { Authorization: `Bearer ${token}` }),
    };

    try {
      // Fetch deployments
      const deploymentResponse = await fetch(
        `https://api.github.com/repos/${repository.owner}/${repository.repo}/deployments?environment=${environment}`,
        { headers }
      );

      if (deploymentResponse.status === 401) {
        throw new Error("Authentication failed. Please check your token.");
      }

      if (!deploymentResponse.ok) {
        throw new Error(
          `Failed to fetch deployment data for ${repository.repo}/${environment}`
        );
      }

      const deployments = await deploymentResponse.json();
      
      if (deployments.length === 0) {
        return null;
      }

      const deployment = deployments[0];

      // Fetch the status for this deployment
      const statusResponse = await fetch(
        `https://api.github.com/repos/${repository.owner}/${repository.repo}/deployments/${deployment.id}/statuses`,
        { headers }
      );

      if (!statusResponse.ok) {
        console.warn(`Failed to fetch status for deployment ${deployment.id}`);
      }

      const statuses = await statusResponse.json();
      const latestStatus = statuses.length > 0 ? statuses[0] : null;

      // Extract run_id from workflow_url if available
      let run_id = null;
      if (deployment.payload && deployment.payload.workflow_run) {
        run_id = deployment.payload.workflow_run;
      } else if (latestStatus && latestStatus.target_url) {
        // Try to extract run_id from the target_url
        const match = latestStatus.target_url.match(/\/actions\/runs\/(\d+)/);
        if (match) {
          run_id = match[1];
        }
      }

      return {
        ...deployment,
        status: latestStatus ? {
          state: latestStatus.state,
          description: latestStatus.description,
          target_url: latestStatus.target_url,
          created_at: latestStatus.created_at
        } : null,
        run_id,
        repository
      };
    } catch (error) {
      console.error('Error fetching deployment:', error);
      throw error;
    }
  }

  async fetchAllDeployments(repositories, environments) {
    const errors = [];
    const allDeploymentPromises = repositories.flatMap(
      (repository) =>
        environments.map(async (env) => {
          try {
            return await this.fetchEnvironmentDeployment(repository, env);
          } catch (error) {
            errors.push(
              `Failed to fetch ${repository.repo}/${env}: ${error.message}`
            );
            return null;
          }
        })
    );

    const deployments = await Promise.all(allDeploymentPromises);

    // Filter out null results and format the data
    const validDeployments = deployments
      .filter((d) => d !== null)
      .map((deployment) => ({
        ...deployment,
        displayName: `${deployment.repository.owner}/${deployment.repository.repo}`,
      }));

    return {
      deployments: validDeployments,
      errors
    };
  }
}
