export class UIManager {
  constructor(configManager, authManager) {
    this.configManager = configManager;
    this.authManager = authManager;
    this.initializeElements();
    this.bindEventListeners();
  }

  initializeElements() {
    this.elements = {
      deploymentGrid: document.getElementById("deploymentGrid"),
      errorMessage: document.getElementById("errorMessage"),
      tokenInput: document.getElementById("tokenInput"),
      saveTokenButton: document.getElementById("saveToken"),
      authStatus: document.getElementById("authStatus"),
      configToggle: document.getElementById("configToggle"),
      configContent: document.getElementById("configContent"),
      repoList: document.getElementById("repoList"),
      envList: document.getElementById("envList"),
      addRepoButton: document.getElementById("addRepo"),
      addEnvButton: document.getElementById("addEnv"),
      refreshIntervalInput: document.getElementById("refreshInterval"),
    };
  }

  bindEventListeners() {
    this.elements.configToggle.addEventListener("click", () => this.toggleConfig());
    this.elements.addRepoButton.addEventListener("click", () => this.addRepo());
    this.elements.addEnvButton.addEventListener("click", () => this.addEnv());
    this.elements.refreshIntervalInput.addEventListener("change", (e) => this.updateRefreshInterval(e));
    this.elements.saveTokenButton.addEventListener("click", () => this.handleTokenSave());
  }

  toggleConfig() {
    this.elements.configContent.classList.toggle("visible");
    this.elements.configToggle.querySelector(".toggle-icon").textContent =
      this.elements.configContent.classList.contains("visible") ? "▼" : "▶";
  }

  addRepo() {
    const config = this.configManager.getConfig();
    config.repositories.push({ owner: "", repo: "", displayName: "" });
    this.configManager.updateConfig(config);
    this.renderConfigLists();
  }

  addEnv() {
    const config = this.configManager.getConfig();
    config.environments.push("");
    this.configManager.updateConfig(config);
    this.renderConfigLists();
  }

  updateRefreshInterval(event) {
    const newInterval = parseInt(event.target.value, 10);
    if (newInterval >= 1 && newInterval <= 60) {
      const config = this.configManager.getConfig();
      config.refreshInterval = newInterval;
      this.configManager.updateConfig(config);
      return true;
    }
    return false;
  }

  handleTokenSave() {
    const token = this.elements.tokenInput.value.trim();
    if (token) {
      this.authManager.saveToken(token);
      this.elements.tokenInput.value = ""; // Clear input for security
      this.updateAuthStatus();
    }
  }

  updateAuthStatus() {
    if (this.authManager.isAuthenticated()) {
      this.elements.authStatus.textContent = "✓ Authenticated";
      this.elements.authStatus.className = "auth-status authenticated";
    } else {
      this.elements.authStatus.textContent = "✗ Not authenticated";
      this.elements.authStatus.className = "auth-status unauthenticated";
    }
  }

  showError(message) {
    this.elements.errorMessage.textContent = message;
    this.elements.errorMessage.style.display = "block";
  }

  hideError() {
    this.elements.errorMessage.style.display = "none";
  }

  renderConfigLists() {
    const config = this.configManager.getConfig();
    this.renderRepositories(config);
    this.renderEnvironments(config);
  }

  renderRepositories(config) {
    this.elements.repoList.innerHTML = "";
    config.repositories.forEach((repo, index) => {
      const li = this.createRepositoryListItem(repo, index);
      this.elements.repoList.appendChild(li);
    });
  }

  renderEnvironments(config) {
    this.elements.envList.innerHTML = "";
    config.environments.forEach((env, index) => {
      const li = this.createEnvironmentListItem(env, index);
      this.elements.envList.appendChild(li);
    });
  }

  createRepositoryListItem(repo, index) {
    const li = document.createElement("li");
    li.className = "config-item";
    li.innerHTML = `
      <input type="text" placeholder="Owner" value="${repo.owner}" data-field="owner">
      <input type="text" placeholder="Repository" value="${repo.repo}" data-field="repo">
      <input type="text" placeholder="Display Name (optional)" value="${repo.displayName || ""}" data-field="displayName">
      <button class="remove">✕</button>
    `;

    this.bindRepositoryListeners(li, index);
    return li;
  }

  createEnvironmentListItem(env, index) {
    const li = document.createElement("li");
    li.className = "config-item";
    li.innerHTML = `
      <input type="text" placeholder="Environment" value="${env}">
      <input type="color" value="${this.configManager.getConfig().colors[env] || "#808080"}" title="Environment color">
      <button class="remove">✕</button>
    `;

    this.bindEnvironmentListeners(li, index);
    return li;
  }

  bindRepositoryListeners(li, index) {
    const config = this.configManager.getConfig();
    li.querySelectorAll("input").forEach((input) => {
      input.addEventListener("change", () => {
        config.repositories[index][input.dataset.field] = input.value;
        this.configManager.updateConfig(config);
      });
    });

    li.querySelector(".remove").addEventListener("click", () => {
      config.repositories.splice(index, 1);
      this.configManager.updateConfig(config);
      this.renderConfigLists();
    });
  }

  bindEnvironmentListeners(li, index) {
    const config = this.configManager.getConfig();
    li.querySelector('input[type="text"]').addEventListener("change", (e) => {
      const oldEnv = config.environments[index];
      const newEnv = e.target.value;
      config.environments[index] = newEnv;
      config.colors[newEnv] = config.colors[oldEnv];
      delete config.colors[oldEnv];
      this.configManager.updateConfig(config);
    });

    li.querySelector('input[type="color"]').addEventListener("change", (e) => {
      config.colors[config.environments[index]] = e.target.value;
      this.configManager.updateConfig(config);
    });

    li.querySelector(".remove").addEventListener("click", () => {
      const env = config.environments[index];
      config.environments.splice(index, 1);
      delete config.colors[env];
      this.configManager.updateConfig(config);
      this.renderConfigLists();
    });
  }

  drawDeployments(deployments) {
    const config = this.configManager.getConfig();
    this.elements.deploymentGrid.innerHTML = "";

    config.environments.forEach((env) => {
      const column = this.createEnvironmentColumn(env, deployments);
      this.elements.deploymentGrid.appendChild(column);
    });
  }

  createEnvironmentColumn(env, deployments) {
    const config = this.configManager.getConfig();
    const column = document.createElement("div");
    column.className = "environment-column";
    column.style.borderColor = config.colors[env];

    // Add environment title
    const title = document.createElement("div");
    title.className = "environment-title";
    title.style.backgroundColor = config.colors[env];
    title.style.borderColor = config.colors[env];
    title.textContent = env.toUpperCase();
    column.appendChild(title);

    // Find and add deployments for this environment
    const envDeployments = deployments.filter((d) => d.environment === env);
    envDeployments.forEach((deployment) => {
      const card = this.createDeploymentCard(deployment, env, deployments);
      column.appendChild(card);
    });

    return column;
  }

  createDeploymentCard(deployment, currentEnv, allDeployments) {
    const card = document.createElement("div");
    card.className = "deployment-card";
    if (deployment.status) {
      card.classList.add(deployment.status.state);
    }

    card.appendChild(this.createRepoNameElement(deployment));
    card.appendChild(this.createBranchInfoElement(deployment, currentEnv, allDeployments));

    return card;
  }

  createRepoNameElement(deployment) {
    const repoName = document.createElement("div");
    repoName.className = "repo-name";
    repoName.textContent = deployment.repository.displayName || deployment.repository.repo;
    return repoName;
  }

  createBranchInfoElement(deployment, currentEnv, allDeployments) {
    const branchInfo = document.createElement("div");
    branchInfo.className = "branch-info";

    if (deployment.created_at) {
      branchInfo.appendChild(this.createTimeElement(deployment));
    }

    branchInfo.appendChild(this.createBranchNameElement(deployment));
    
    if (deployment.sha) {
      branchInfo.appendChild(this.createShaElement(deployment, currentEnv, allDeployments));
    }

    return branchInfo;
  }

  createTimeElement(deployment) {
    const timeLine = document.createElement("div");
    timeLine.className = "time";
    timeLine.textContent = "deployed: ";

    const date = dayjs(deployment.created_at);
    const formattedTime = date.format('YYYY-MM-DD HH:mm');
    const relativeTime = date.fromNow();

    const timeLink = document.createElement("a");
    timeLink.title = formattedTime;
    
    if (deployment.run_id) {
      timeLink.href = `https://github.com/${deployment.repository.owner}/${deployment.repository.repo}/actions/runs/${deployment.run_id}`;
    } else {
      timeLink.href = `https://github.com/${deployment.repository.owner}/${deployment.repository.repo}/deployments/${deployment.environment}`;
    }
    
    timeLink.target = "_blank";
    timeLink.textContent = relativeTime;
    
    if (deployment.status) {
      timeLink.title = `${formattedTime} - ${deployment.status.description || deployment.status.state}`;
    }

    timeLine.appendChild(timeLink);
    return timeLine;
  }

  createBranchNameElement(deployment) {
    const branchName = document.createElement("div");
    branchName.className = "branch-name";
    branchName.textContent = "ref: ";

    if (deployment.ref) {
      const branchLink = document.createElement("a");
      branchLink.href = `https://github.com/${deployment.repository.owner}/${deployment.repository.repo}/tree/${deployment.ref}`;
      branchLink.target = "_blank";
      branchLink.textContent = deployment.ref;
      branchName.appendChild(branchLink);
    } else {
      branchName.appendChild(document.createTextNode("Unknown"));
    }

    return branchName;
  }

  createShaElement(deployment, currentEnv, allDeployments) {
    const shaLine = document.createElement("div");
    shaLine.className = "sha";
    shaLine.textContent = "sha: ";

    const shaLink = document.createElement("a");
    shaLink.href = `https://github.com/${deployment.repository.owner}/${deployment.repository.repo}/commit/${deployment.sha}`;
    shaLink.target = "_blank";
    shaLink.textContent = deployment.sha.substring(0, 7);
    shaLine.appendChild(shaLink);

    shaLine.appendChild(document.createTextNode(" ("));
    const compareButton = this.createCompareButton(deployment, currentEnv, allDeployments);
    shaLine.appendChild(compareButton);
    shaLine.appendChild(document.createTextNode(")"));

    return shaLine;
  }

  createCompareButton(deployment, currentEnv, allDeployments) {
    const compareButton = document.createElement("button");
    compareButton.className = "compare-button";
    compareButton.textContent = "compare";
    compareButton.title = "Compare with other environments";

    const compareMenu = this.createCompareMenu(deployment, currentEnv, allDeployments);
    document.body.appendChild(compareMenu);

    compareButton.addEventListener("click", (e) => {
      e.stopPropagation();
      const rect = compareButton.getBoundingClientRect();
      compareMenu.style.position = "absolute";
      compareMenu.style.left = `${rect.left}px`;
      compareMenu.style.top = `${rect.bottom + 5}px`;
      compareMenu.style.display = compareMenu.style.display === "none" ? "block" : "none";
    });

    document.addEventListener("click", () => {
      compareMenu.style.display = "none";
    });

    return compareButton;
  }

  createCompareMenu(deployment, currentEnv, allDeployments) {
    const compareMenu = document.createElement("div");
    compareMenu.className = "compare-menu";
    compareMenu.style.display = "none";

    const config = this.configManager.getConfig();
    config.environments.forEach(targetEnv => {
      if (targetEnv === currentEnv) return;

      const targetDeployment = allDeployments.find(d => 
        d.environment === targetEnv && 
        d.repository.owner === deployment.repository.owner &&
        d.repository.repo === deployment.repository.repo
      );

      const button = document.createElement("button");
      if (targetDeployment) {
        button.textContent = `${targetEnv.toUpperCase()} (${targetDeployment.sha.substring(0, 7)})`;
        button.addEventListener("click", () => {
          const compareUrl = `https://github.com/${deployment.repository.owner}/${deployment.repository.repo}/compare/${targetDeployment.sha}..${deployment.sha}`;
          window.open(compareUrl, "_blank");
          compareMenu.style.display = "none";
        });
      } else {
        button.textContent = `${targetEnv.toUpperCase()} (no deployment)`;
        button.className = "disabled";
        button.disabled = true;
      }
      compareMenu.appendChild(button);
    });

    return compareMenu;
  }
}
