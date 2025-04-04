class SecondBrainAPI {
  constructor(baseUrl) {
    this.baseUrl = baseUrl || 'https://your-secondbrain-api.com';
    this.token = null;
    this.tokenExpiry = null;
    this.refreshToken = null;
  }

  async initialize() {
    // Get token from chrome storage
    return new Promise((resolve) => {
      chrome.storage.local.get(['authToken', 'tokenExpiry', 'refreshToken'], (result) => {
        if (result.authToken) {
          this.token = result.authToken;
          this.tokenExpiry = result.tokenExpiry;
          this.refreshToken = result.refreshToken;
          
          // Check if token is expired
          if (this.tokenExpiry && new Date(this.tokenExpiry) <= new Date()) {
            // Token expired, try refresh
            this.refreshAuthToken()
              .then(refreshed => resolve(refreshed))
              .catch(() => resolve(false));
            return;
          }
        }
        resolve(!!this.token);
      });
    });
  }

  async refreshAuthToken() {
    if (!this.refreshToken) return false;
    
    try {
      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refreshToken: this.refreshToken })
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      this.token = data.token;
      this.tokenExpiry = data.expiry;
      this.refreshToken = data.refreshToken;
      
      // Save updated tokens
      chrome.storage.local.set({ 
        authToken: this.token,
        tokenExpiry: this.tokenExpiry,
        refreshToken: this.refreshToken
      });
      
      return true;
    } catch (error) {
      console.error('Token refresh error:', error);
      return false;
    }
  }
}

// Export the class
export default SecondBrainAPI; 