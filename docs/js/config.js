// Default configuration
export const defaultConfig = {
  repositories: [
    { owner: "sethreno", repo: "env-deploy-example", displayName: "Service" },
    { owner: "sethreno", repo: "env-deploy-example", displayName: "API" },
    { owner: "sethreno", repo: "env-deploy-example", displayName: "UI" }
],
  environments: ["dev", "test", "prod"],
  colors: {
    dev: "#0ebd51",
    test: "#b55303",
    prod: "#9d2d1a",
  },
  refreshInterval: 10, // minutes
};

// Configuration Management
export class ConfigManager {
  constructor() {
    this.config = this.loadConfig();
  }

  loadConfig() {
    const savedConfig = localStorage.getItem("deployment-config");
    if (savedConfig) {
      const config = JSON.parse(savedConfig);
      // Ensure colors exist for any new environments
      config.environments.forEach((env) => {
        if (!config.colors[env]) {
          config.colors[env] = "#808080"; // Default gray color
        }
      });
      return config;
    }
    return { ...defaultConfig };
  }

  saveConfig() {
    localStorage.setItem("deployment-config", JSON.stringify(this.config));
  }

  getConfig() {
    return this.config;
  }

  updateConfig(newConfig) {
    this.config = newConfig;
    this.saveConfig();
  }
}
