/**
 * Authentication Service
 * Handles authentication with Azure Entra ID or fallback to local auth
 */
class AuthService {
  constructor() {
      // Set to true to use mock authentication, false for real Entra ID
      this.useMock = true; // Set to false for production with real Azure Entra ID
      this.serverDataService = window.app?.serverData || null;
      
      if (this.useMock) {
          console.log('Using local authentication service');
          this.currentUser = null;
          
          // Check if user is already logged in
          this.checkAuthentication();
      } else {
          console.log('Using Azure Entra ID authentication');
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
          
          // Make sure msal.js is loaded
          if (typeof msal !== 'undefined') {
              this.msalInstance = new msal.PublicClientApplication(this.msalConfig);
              this.currentUser = null;
              
              // Check if user is already logged in
              this.checkAuthentication();
          } else {
              console.error("MSAL library not loaded!");
          }
      }
  }
  
  checkAuthentication() {
      if (this.useMock) {
          // Check localStorage for saved auth token
          const savedAuth = localStorage.getItem('auth_token');
          const savedUser = localStorage.getItem('auth_user');
          
          if (savedAuth && savedUser) {
              try {
                  this.currentUser = JSON.parse(savedUser);
                  this.updateLoginUI(true);
                  
                  // Set token for API requests
                  if (this.serverDataService) {
                      this.serverDataService.setAuthToken(savedAuth);
                  }
                  
                  return true;
              } catch (e) {
                  console.error('Failed to parse saved auth', e);
              }
          }
          this.updateLoginUI(false);
          return false;
      } else {
          const accounts = this.msalInstance.getAllAccounts();
          if (accounts.length > 0) {
              this.currentUser = accounts[0];
              this.updateLoginUI(true);
              
              // Get access token for API
              this.getAccessToken().then(token => {
                  if (this.serverDataService && token) {
                      this.serverDataService.setAuthToken(token);
                  }
              });
              
              return true;
          }
          this.updateLoginUI(false);
          return false;
      }
  }
  
  async login(credentials) {
      try {
          if (this.useMock) {
              if (!this.serverDataService) {
                  throw new Error("Server data service not initialized!");
              }
              
              if (!credentials) {
                  // Use default credentials for development
                  credentials = {
                      email: "admin@example.com",
                      password: "Admin@123"
                  };
              }
              
              // Call the login API endpoint
              const response = await this.serverDataService.login(credentials);
              
              if (response && response.token) {
                  // Save auth info
                  localStorage.setItem('auth_token', response.token);
                  localStorage.setItem('auth_user', JSON.stringify(response.user));
                  
                  this.currentUser = response.user;
                  this.serverDataService.setAuthToken(response.token);
                  this.updateLoginUI(true);
                  
                  return this.currentUser;
              }
              
              throw new Error("Login failed - invalid response");
          } else {
              // Use MSAL for Azure Entra ID
              const loginRequest = {
                  scopes: ["User.Read", "api://your-api-scope/access"]
              };
              
              const response = await this.msalInstance.loginPopup(loginRequest);
              this.currentUser = response.account;
              
              // Get access token for API
              const token = await this.getAccessToken();
              if (this.serverDataService && token) {
                  this.serverDataService.setAuthToken(token);
              }
              
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
              // Clear auth data
              localStorage.removeItem('auth_token');
              localStorage.removeItem('auth_user');
              
              this.currentUser = null;
              if (this.serverDataService) {
                  this.serverDataService.setAuthToken(null);
              }
          } else {
              // Use MSAL for logout
              await this.msalInstance.logout();
              this.currentUser = null;
              if (this.serverDataService) {
                  this.serverDataService.setAuthToken(null);
              }
          }
          this.updateLoginUI(false);
          return true;
      } catch (error) {
          console.error('Logout error:', error);
          return false;
      }
  }
  
  updateLoginUI(isLoggedIn) {
      const loginButton = document.getElementById('login-button');
      const logoutButton = document.getElementById('logout-button');
      const userInfo = document.getElementById('user-info');
      const username = document.getElementById('username');
      
      if (!loginButton || !logoutButton || !userInfo || !username) {
          console.warn('Auth UI elements not found in DOM');
          return;
      }
      
      if (isLoggedIn && this.currentUser) {
          loginButton.style.display = 'none';
          logoutButton.style.display = 'block';
          userInfo.style.display = 'block';
          username.textContent = this.currentUser.displayName || this.currentUser.username || this.currentUser.email;
      } else {
          loginButton.style.display = 'block';
          logoutButton.style.display = 'none';
          userInfo.style.display = 'none';
      }
  }
  
  async getUserInfo() {
      if (this.useMock) {
          return this.currentUser;
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
  
  async getAccessToken() {
      if (this.useMock) {
          return localStorage.getItem('auth_token');
      }
      
      if (!this.currentUser) return null;
      
      try {
          // Use MSAL to get access token for API
          const tokenResponse = await this.msalInstance.acquireTokenSilent({
              scopes: ["api://your-api-scope/access"],
              account: this.currentUser
          });
          
          return tokenResponse.accessToken;
      } catch (error) {
          console.error('Error acquiring token:', error);
          return null;
      }
  }
  
  // Helper to check if user has a specific role
  hasRole(role) {
      if (!this.currentUser || !this.currentUser.roles) {
          return false;
      }
      
      return this.currentUser.roles.includes(role);
  }
  
  // Check if user is an admin
  isAdmin() {
      return this.hasRole('Admin');
  }
  
  // Check if user is a manager
  isManager() {
      return this.hasRole('Manager') || this.isAdmin();
  }
}