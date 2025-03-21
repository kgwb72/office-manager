/**
 * Mock Authentication Service for development/testing
 * Simulates Azure Entra ID authentication without actual connection
 */
class MockAuthService {
    constructor() {
      this.isAuthenticated = false;
      this.currentUser = null;
    }
  
    login() {
      return new Promise((resolve) => {
        setTimeout(() => {
          this.isAuthenticated = true;
          this.currentUser = {
            name: 'Test User',
            username: 'test.user@contoso.com',
            roles: ['User'],
            id: 'user-123'
          };
          this.updateLoginUI(true);
          resolve(this.currentUser);
        }, 1000); // Simulate network delay
      });
    }
  
    logout() {
      return new Promise((resolve) => {
        setTimeout(() => {
          this.isAuthenticated = false;
          this.currentUser = null;
          this.updateLoginUI(false);
          resolve();
        }, 500);
      });
    }
  
    updateLoginUI(isLoggedIn) {
      const loginButton = document.getElementById('login-button');
      const logoutButton = document.getElementById('logout-button');
      const userInfo = document.getElementById('user-info');
      const username = document.getElementById('username');
      
      if (isLoggedIn && this.currentUser) {
        loginButton.style.display = 'none';
        logoutButton.style.display = 'block';
        userInfo.style.display = 'block';
        username.textContent = this.currentUser.username;
      } else {
        loginButton.style.display = 'block';
        logoutButton.style.display = 'none';
        userInfo.style.display = 'none';
      }
    }
  
    getUserInfo() {
      return Promise.resolve(this.currentUser);
    }
    
    // Check if user is authenticated
    isUserAuthenticated() {
      return this.isAuthenticated;
    }
    
    // Check existing authentication
    checkAuthentication() {
      // In a mock service, we could simulate retrieving from localStorage
      const savedAuth = localStorage.getItem('mock_auth_user');
      if (savedAuth) {
        try {
          this.currentUser = JSON.parse(savedAuth);
          this.isAuthenticated = true;
          this.updateLoginUI(true);
          return true;
        } catch (e) {
          console.error('Failed to parse saved auth', e);
        }
      }
      this.updateLoginUI(false);
      return false;
    }
  }