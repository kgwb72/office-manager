// services/apiService.js

class ApiService {
  constructor() {
    // Base URL for API endpoints - change in production
    this.baseUrl = 'https://localhost:44317/api';
    this.token = null;
  }

  setAuthToken(token) {
    this.token = token;
  }

  async fetchWithAuth(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    
    // Default headers
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };
    
    // Add auth token if available
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    
    try {
      const response = await fetch(url, {
        ...options,
        headers
      });
      
      // Handle non-2xx status
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `API error: ${response.status}`);
      }
      
      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      
      return await response.text();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // HTTP method wrappers
  async get(endpoint) {
    return this.fetchWithAuth(endpoint, { method: 'GET' });
  }

  async post(endpoint, data) {
    return this.fetchWithAuth(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async put(endpoint, data) {
    return this.fetchWithAuth(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async delete(endpoint) {
    return this.fetchWithAuth(endpoint, { method: 'DELETE' });
  }
}

// Export as singleton
const apiService = new ApiService();
export default apiService;