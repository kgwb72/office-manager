/**
 * Authentication Service
 * Handles authentication with Azure Entra ID
 * Switches between real and mock authentication based on environment
 */
class AuthService {
    constructor() {
      // Set to true to use mock authentication, false for real Entra ID
      this.useMock = true; // Change this based on your environment
      
      if (this.useMock) {
        console.log('Using mock authentication service');
        this.authService = new MockAuthService();
        this.currentUser = null;
        
        // Check if user is already logged in
        this.checkAuthentication();
      } else {
        console.log('Using real Entra ID authentication');
        // Initialize real MSAL auth
        this.msalConfig = {
          auth: {
            clientId: 'your-client-id-here',
            authority: 'https://login.microsoftonline.com/your-tenant-id',
            redirectUri: window.location.origin
          },
          cache: {
            cacheLocation: 'localStorage',
            storeAuthStateInCookie: true
          }
        };
        
        this.msalInstance = new msal.PublicClientApplication(this.msalConfig);
        this.currentUser = null;
        
        // Check if user is already logged in
        this.checkAuthentication();
      }
    }
    
    checkAuthentication() {
      if (this.useMock) {
        return this.authService.checkAuthentication();
      } else {
        const accounts = this.msalInstance.getAllAccounts();
        if (accounts.length > 0) {
          this.currentUser = accounts[0];
          this.updateLoginUI(true);
          return true;
        }
        this.updateLoginUI(false);
        return false;
      }
    }
    
    async login() {
      try {
        if (this.useMock) {
          const user = await this.authService.login();
          this.currentUser = user;
          return user;
        } else {
          const loginRequest = {
            scopes: ["User.Read"]
          };
          const response = await this.msalInstance.loginPopup(loginRequest);
          this.currentUser = response.account;
          this.updateLoginUI(true);
          return this.currentUser;
        }
      } catch (error) {
        console.error('Login error:', error);
        return null;
      }
    }
    
    async logout() {
      try {
        if (this.useMock) {
          await this.authService.logout();
        } else {
          await this.msalInstance.logout();
        }
        this.currentUser = null;
        this.updateLoginUI(false);
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
    
    updateLoginUI(isLoggedIn) {
      if (this.useMock) {
        this.authService.updateLoginUI(isLoggedIn);
      } else {
        const loginButton = document.getElementById('login-button');
        const logoutButton = document.getElementById('logout-button');
        const userInfo = document.getElementById('user-info');
        const username = document.getElementById('username');
        
        if (isLoggedIn && this.currentUser) {
          loginButton.style.display = 'none';
          logoutButton.style.display = 'block';
          userInfo.style.display = 'block';
          username.textContent = this.currentUser.username || this.currentUser.name;
        } else {
          loginButton.style.display = 'block';
          logoutButton.style.display = 'none';
          userInfo.style.display = 'none';
        }
      }
    }
    
    async getUserInfo() {
      if (this.useMock) {
        return this.authService.getUserInfo();
      } else if (!this.currentUser) {
        return null;
      }
      
      // Get user info from Microsoft Graph API
      try {
        const tokenResponse = await this.msalInstance.acquireTokenSilent({
          scopes: ["User.Read"],
          account: this.currentUser
        });
        
        const response = await fetch('https://graph.microsoft.com/v1.0/me', {
          headers: {
            'Authorization': `Bearer ${tokenResponse.accessToken}`
          }
        });
        
        if (response.ok) {
          return await response.json();
        }
        return null;
      } catch (error) {
        console.error('Error fetching user info:', error);
        return null;
      }
    }
  }