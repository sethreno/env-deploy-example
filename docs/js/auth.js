export class AuthManager {
  constructor() {
    this.tokenKey = "github_token";
  }

  getStoredToken() {
    return sessionStorage.getItem(this.tokenKey);
  }

  saveToken(token) {
    sessionStorage.setItem(this.tokenKey, token);
  }

  clearToken() {
    sessionStorage.removeItem(this.tokenKey);
  }

  isAuthenticated() {
    return !!this.getStoredToken();
  }
}
