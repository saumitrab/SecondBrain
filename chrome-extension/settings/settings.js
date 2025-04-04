document.addEventListener('DOMContentLoaded', async () => {
  const settingsForm = document.getElementById('settingsForm');
  const captureTypeInputs = document.getElementsByName('captureType');
  const localSettings = document.getElementById('localSettings');
  const groqSettings = document.getElementById('groqSettings');
  const openaiSettings = document.getElementById('openaiSettings');
  const deepseekSettings = document.getElementById('deepseekSettings');
  const customSettings = document.getElementById('customSettings');
  const allApiSettings = document.querySelectorAll('.api-setting');
  
  const localLlmUrlInput = document.getElementById('localLlmUrl');
  const groqApiKeyInput = document.getElementById('groqApiKey');
  const groqModelSelect = document.getElementById('groqModel');
  const openaiApiKeyInput = document.getElementById('openaiApiKey');
  const openaiModelSelect = document.getElementById('openaiModel');
  const deepseekApiKeyInput = document.getElementById('deepseekApiKey');
  const deepseekModelSelect = document.getElementById('deepseekModel');
  const customApiNameInput = document.getElementById('customApiName');
  const customApiEndpointInput = document.getElementById('customApiEndpoint');
  const customApiKeyInput = document.getElementById('customApiKey');
  const customApiModelInput = document.getElementById('customApiModel');
  const customApiHeadersInput = document.getElementById('customApiHeaders');
  const secondBrainServerUrlInput = document.getElementById('secondBrainServerUrl'); // Add this line
  
  const encryptionEnabledInput = document.getElementById('encryptionEnabled');
  const saveButton = document.querySelector('button[type="submit"]');
  const testConnectionBtn = document.getElementById('testConnectionBtn');
  const statusMessage = document.createElement('div');
  
  // Create connection status element
  const connectionStatus = document.createElement('div');
  connectionStatus.className = 'connection-status';
  connectionStatus.innerHTML = '<span class="status-indicator"></span> <span class="status-text">Not tested</span>';
  
  // Add connection status below all API settings
  allApiSettings.forEach(setting => {
    const statusClone = connectionStatus.cloneNode(true);
    setting.appendChild(statusClone);
  });
  
  // Setup status message element
  statusMessage.className = 'status-message';
  settingsForm.appendChild(statusMessage);
  
  // Encryption helpers
  const encryptionKey = 'capture-me-extension-key';
  
  // Function to encrypt sensitive data
  async function encryptData(data) {
    // If data is empty, return empty string
    if (!data) return '';
    
    console.log('Encrypting data, length:', data.length);
    
    if (!encryptionEnabledInput.checked) {
      // Simple base64 encoding if encryption is disabled
      const encoded = btoa(data);
      console.log('Using base64 encoding, result length:', encoded.length);
      return encoded;
    }
    
    try {
      // Create a random initialization vector
      const iv = crypto.getRandomValues(new Uint8Array(12));
      
      // Convert the encryption key to a CryptoKey
      const keyMaterial = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(encryptionKey),
        { name: "PBKDF2" },
        false,
        ["deriveBits", "deriveKey"]
      );
      
      const key = await crypto.subtle.deriveKey(
        {
          name: "PBKDF2",
          salt: new TextEncoder().encode("capture-me-salt"),
          iterations: 100000,
          hash: "SHA-256"
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt"]
      );
      
      // Encrypt the data
      const encoded = new TextEncoder().encode(data);
      const ciphertext = await crypto.subtle.encrypt(
        {
          name: "AES-GCM",
          iv: iv
        },
        key,
        encoded
      );
      
      // Combine IV and ciphertext
      const result = new Uint8Array(iv.length + new Uint8Array(ciphertext).length);
      result.set(iv, 0);
      result.set(new Uint8Array(ciphertext), iv.length);
      
      // Convert to base64
      const base64 = btoa(String.fromCharCode.apply(null, result));
      console.log('Using encryption, result length:', base64.length);
      
      return base64;
    } catch (error) {
      console.error('Error encrypting data:', error);
      // Fallback to simple base64 encoding
      console.log('Falling back to base64 encoding');
      return btoa(data);
    }
  }
  
  // Function to decrypt sensitive data
  async function decryptData(encryptedData) {
    if (!encryptedData) return '';
    
    try {
      // If it's just base64 (no encryption), decode it
      if (!encryptionEnabledInput.checked) {
        return atob(encryptedData);
      }
      
      // Convert base64 to array buffer
      const encryptedBytes = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
      
      // Extract the IV and ciphertext
      const iv = encryptedBytes.slice(0, 12);
      const ciphertext = encryptedBytes.slice(12);
      
      // Import the encryption key
      const keyMaterial = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(encryptionKey),
        { name: "PBKDF2" },
        false,
        ["deriveBits", "deriveKey"]
      );
      
      const key = await crypto.subtle.deriveKey(
        {
          name: "PBKDF2",
          salt: new TextEncoder().encode("capture-me-salt"),
          iterations: 100000,
          hash: "SHA-256"
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        false,
        ["decrypt"]
      );
      
      // Decrypt the data
      const decrypted = await crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv: iv
        },
        key,
        ciphertext
      );
      
      return new TextDecoder().decode(decrypted);
    } catch (error) {
      console.error('Decryption error:', error);
      try {
        // Try simple base64 decode as fallback
        return atob(encryptedData);
      } catch (e) {
        console.error('Base64 decode error:', e);
        return '';
      }
    }
  }
  
  // Load saved settings
  async function loadSettings() {
    chrome.storage.sync.get([
      'captureType', 
      'localLlmUrl', 
      'encryptedGroqApiKey',
      'groqModel',
      'encryptedOpenaiApiKey',
      'openaiModel',
      'encryptedDeepseekApiKey',
      'deepseekModel',
      'customApiName',
      'customApiEndpoint',
      'encryptedCustomApiKey',
      'customApiModel',
      'customApiHeaders',
      'encryptionEnabled',
      'secondBrainServerUrl'  // Add this line
    ], async (result) => {
      const captureType = result.captureType || 'local';
      const localLlmUrl = result.localLlmUrl || 'http://localhost:1234/v1';
      const encryptionEnabled = result.encryptionEnabled !== undefined ? result.encryptionEnabled : true;
      const secondBrainServerUrl = result.secondBrainServerUrl || 'http://localhost:8000';  // Add this line
      
      // Set the SecondBrain server URL
      secondBrainServerUrlInput.value = secondBrainServerUrl;  // Add this line
      
      // Decrypt sensitive data
      encryptionEnabledInput.checked = encryptionEnabled;
      
      // Set values for all inputs
      localLlmUrlInput.value = localLlmUrl;
      
      if (result.encryptedGroqApiKey) {
        groqApiKeyInput.value = await decryptData(result.encryptedGroqApiKey);
      }
      
      if (result.groqModel) {
        groqModelSelect.value = result.groqModel;
      }
      
      if (result.encryptedOpenaiApiKey) {
        openaiApiKeyInput.value = await decryptData(result.encryptedOpenaiApiKey);
      }
      
      if (result.openaiModel) {
        openaiModelSelect.value = result.openaiModel;
      }
      
      if (result.encryptedDeepseekApiKey) {
        deepseekApiKeyInput.value = await decryptData(result.encryptedDeepseekApiKey);
      }
      
      if (result.deepseekModel) {
        deepseekModelSelect.value = result.deepseekModel;
      }
      
      if (result.customApiName) {
        customApiNameInput.value = result.customApiName;
      }
      
      if (result.customApiEndpoint) {
        customApiEndpointInput.value = result.customApiEndpoint;
      }
      
      if (result.encryptedCustomApiKey) {
        customApiKeyInput.value = await decryptData(result.encryptedCustomApiKey);
      }
      
      if (result.customApiModel) {
        customApiModelInput.value = result.customApiModel;
      }
      
      if (result.customApiHeaders) {
        customApiHeadersInput.value = result.customApiHeaders;
      }
      
      // Set the radio button based on saved type
      for (const input of captureTypeInputs) {
        if (input.value === captureType) {
          input.checked = true;
          break;
        }
      }
      
      // Show the appropriate settings section
      updateVisibleSettings(captureType);
      
      // Validate current API key if one is set
      if (captureType !== 'local') {
        validateCurrentProvider();
      }
      
      // Add after loading settings
      const localLlmTestBtn = document.createElement('button');
      localLlmTestBtn.type = 'button';
      localLlmTestBtn.className = 'test-connection-btn';
      localLlmTestBtn.textContent = 'Test LM Studio Connection';
      localLlmTestBtn.addEventListener('click', testLocalLlmConnection);
      
      // Add to local settings section
      const localLlmUrlGroup = document.querySelector('#localSettings .form-group');
      localLlmUrlGroup.appendChild(localLlmTestBtn);
      
      // Add local LLM status display
      const localLlmStatus = document.createElement('div');
      localLlmStatus.className = 'connection-status';
      localLlmStatus.innerHTML = '<span class="status-indicator unknown"></span> <span class="status-text">Not tested</span>';
      localLlmUrlGroup.appendChild(localLlmStatus);
    });
  }
  
  // Load settings on page load
  loadSettings();
  
  // Handle radio button changes to show/hide appropriate settings
  function updateVisibleSettings(selectedType) {
    // Hide all API settings
    allApiSettings.forEach(setting => setting.style.display = 'none');
    
    // Show local settings by default
    localSettings.style.display = 'block';
    
    // Show the selected API settings if not local
    switch (selectedType) {
      case 'local':
        break;
      case 'groq':
        groqSettings.style.display = 'block';
        break;
      case 'openai':
        openaiSettings.style.display = 'block';
        break;
      case 'deepseek':
        deepseekSettings.style.display = 'block';
        break;
      case 'custom':
        customSettings.style.display = 'block';
        break;
    }
  }
  
  // Handle radio button changes
  for (const input of captureTypeInputs) {
    input.addEventListener('change', (e) => {
      updateVisibleSettings(e.target.value);
      validateCurrentProvider();
    });
  }
  
  // Test connection button
  testConnectionBtn.addEventListener('click', () => {
    // Get the active provider type
    const type = getActiveProvider();
    
    // Handle Local LLM specially
    if (type === 'local') {
      testLocalLlmConnection();
      return;
    }
    
    // Use the current value in the input field, not the stored value
    let apiKey = '';
    let endpoint = '';
    let headers = '';
    
    switch(type) {
      case 'groq':
        apiKey = groqApiKeyInput.value.trim();
        break;
      case 'openai':
        apiKey = openaiApiKeyInput.value.trim();
        break;
      case 'deepseek':
        apiKey = deepseekApiKeyInput.value.trim();
        break;
      case 'custom':
        apiKey = customApiKeyInput.value.trim();
        endpoint = customApiEndpointInput.value.trim();
        headers = customApiHeadersInput.value.trim();
        break;
    }
    
    // Get the status element
    const statusElement = document.querySelector(`#${type}Settings .connection-status`);
    if (!statusElement) return;
    
    // If no API key, show error
    if (!apiKey && type !== 'local') {
      updateConnectionStatus(statusElement, false, 'API key is required');
      return;
    }
    
    // Update status to testing
    updateConnectionStatus(statusElement, null, 'Testing connection...');
    
    // Test the connection directly without encryption
    validateApiKey(type, apiKey, endpoint, headers).then((result) => {
      updateConnectionStatus(
        statusElement,
        result.isValid,
        result.isValid ? 'Connection successful' : (result.message || 'Connection failed')
      );
    }).catch((error) => {
      console.error(`Error testing ${type} connection:`, error);
      updateConnectionStatus(statusElement, false, 'Connection error');
    });
  });
  
  // Get the active provider type and settings
  function getActiveProvider() {
    let type = 'local';
    for (const input of captureTypeInputs) {
      if (input.checked) {
        type = input.value;
        break;
      }
    }
    
    return type;
  }
  
  // Validate the current provider's API key
  async function validateCurrentProvider() {
    const type = getActiveProvider();
    if (type === 'local') return;
    
    // Find the relevant connection status element
    let statusElement;
    let apiKey = '';
    let modelValue = '';
    let endpoint = '';
    let headers = {};
    
    switch (type) {
      case 'groq':
        statusElement = groqSettings.querySelector('.connection-status');
        apiKey = groqApiKeyInput.value.trim();
        modelValue = groqModelSelect.value;
        break;
      case 'openai':
        statusElement = openaiSettings.querySelector('.connection-status');
        apiKey = openaiApiKeyInput.value.trim();
        modelValue = openaiModelSelect.value;
        break;
      case 'deepseek':
        statusElement = deepseekSettings.querySelector('.connection-status');
        apiKey = deepseekApiKeyInput.value.trim();
        modelValue = deepseekModelSelect.value;
        break;
      case 'custom':
        statusElement = customSettings.querySelector('.connection-status');
        apiKey = customApiKeyInput.value.trim();
        modelValue = customApiModelInput.value.trim();
        endpoint = customApiEndpointInput.value.trim();
        try {
          headers = JSON.parse(customApiHeadersInput.value || '{}');
        } catch (e) {
          updateConnectionStatus(statusElement, false, 'Invalid headers JSON');
          return;
        }
        break;
    }
    
    if (!apiKey) {
      updateConnectionStatus(statusElement, false, 'No API key provided');
      return;
    }
    
    updateConnectionStatus(statusElement, null, 'Testing connection...');
    
    try {
      const result = await new Promise((resolve) => {
        chrome.runtime.sendMessage(
          { 
            action: 'validateApiConnection', 
            data: { 
              provider: type,
              apiKey,
              model: modelValue,
              endpoint,
              headers
            } 
          },
          (response) => resolve(response)
        );
      });
      
      updateConnectionStatus(
        statusElement,
        result.success && result.isValid, 
        result.isValid ? 'Connected successfully' : result.message || 'Connection failed'
      );
      
      return result.success && result.isValid;
    } catch (error) {
      console.error(`${type} API validation error:`, error);
      updateConnectionStatus(statusElement, false, 'Connection error');
      return false;
    }
  }
  
  // Update connection status display
  function updateConnectionStatus(statusElement, isConnected, message) {
    const indicator = statusElement.querySelector('.status-indicator');
    const text = statusElement.querySelector('.status-text');
    
    if (isConnected === null) {
      // Unknown state
      indicator.className = 'status-indicator unknown';
    } else if (isConnected) {
      // Connected
      indicator.className = 'status-indicator connected';
    } else {
      // Not connected
      indicator.className = 'status-indicator disconnected';
    }
    
    text.textContent = message;
  }
  
  // Save settings
  settingsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    saveButton.disabled = true;
    
    // Get values from form
    const captureType = getActiveProvider();
    const localLlmUrl = localLlmUrlInput.value.trim();
    const groqApiKey = groqApiKeyInput.value.trim();
    const groqModel = groqModelSelect.value;
    const openaiApiKey = openaiApiKeyInput.value.trim();
    const openaiModel = openaiModelSelect.value;
    const deepseekApiKey = deepseekApiKeyInput.value.trim();
    const deepseekModel = deepseekModelSelect.value;
    const customApiName = customApiNameInput.value.trim();
    const customApiEndpoint = customApiEndpointInput.value.trim();
    const customApiKey = customApiKeyInput.value.trim();
    const customApiModel = customApiModelInput.value.trim();
    const customApiHeaders = customApiHeadersInput.value.trim();
    const encryptionEnabled = encryptionEnabledInput.checked;
    const secondBrainServerUrl = secondBrainServerUrlInput.value.trim(); // Add this line
    
    // Validate required fields based on selected provider
    if (captureType !== 'local') {
      // Skip validation if saving settings and just proceed
      console.log(`Saving settings for ${captureType} provider`);
      statusMessage.textContent = 'Saving settings...';
      statusMessage.className = 'status-message info';
      
      // Encrypt sensitive data
      const encryptedGroqApiKey = groqApiKey ? await encryptData(groqApiKey) : '';
      const encryptedOpenaiApiKey = openaiApiKey ? await encryptData(openaiApiKey) : '';
      const encryptedDeepseekApiKey = deepseekApiKey ? await encryptData(deepseekApiKey) : '';
      const encryptedCustomApiKey = customApiKey ? await encryptData(customApiKey) : '';
      
      // Save to storage
      chrome.storage.sync.set({
        captureType,
        localLlmUrl,
        encryptedGroqApiKey,
        groqModel,
        encryptedOpenaiApiKey,
        openaiModel,
        encryptedDeepseekApiKey,
        deepseekModel,
        customApiName,
        customApiEndpoint,
        encryptedCustomApiKey,
        customApiModel,
        customApiHeaders,
        encryptionEnabled,
        secondBrainServerUrl // Add this line
      }, () => {
        // Show success message
        statusMessage.textContent = 'Settings saved successfully!';
        statusMessage.className = 'status-message success';
        saveButton.disabled = false;
        
        // Remove message after 3 seconds
        setTimeout(() => {
          statusMessage.textContent = '';
        }, 3000);
      });
    } else {
      // For local LLM, just save without validation
      chrome.storage.sync.set({
        captureType,
        localLlmUrl,
        encryptionEnabled,
        secondBrainServerUrl // Add this line
      }, () => {
        // Show success message
        statusMessage.textContent = 'Settings saved successfully!';
        statusMessage.className = 'status-message success';
        saveButton.disabled = false;
        
        // Remove message after 3 seconds
        setTimeout(() => {
          statusMessage.textContent = '';
        }, 3000);
      });
    }
  });
  
  // Fixed function to test Local LLM connection with better timeout handling
  async function testLocalLlmConnection(url = null) {
    // Safely get the URL, ensuring it's a string
    let localUrl;
    try {
      const urlInput = document.getElementById('localLlmUrl');
      if (url && typeof url === 'string') {
        localUrl = url.trim();
      } else if (urlInput && urlInput.value) {
        localUrl = urlInput.value.trim();
      } else {
        localUrl = 'http://localhost:1234/v1';
      }
      
      console.log('Using Local LLM URL:', localUrl);
    } catch (error) {
      console.error('Error getting Local LLM URL:', error);
      localUrl = 'http://localhost:1234/v1';
    }
    
    // Get status element
    const statusElement = document.querySelector('#localSettings .connection-status');
    if (!statusElement) {
      console.error('Status element not found');
      return false;
    }
    
    // Update status to testing
    updateConnectionStatus(statusElement, null, 'Testing LM Studio connection...');
    
    try {
      // Ensure the URL is properly formatted
      let baseUrl;
      if (localUrl.endsWith('/v1')) {
        baseUrl = localUrl;
      } else if (localUrl.endsWith('/')) {
        baseUrl = localUrl + 'v1';
      } else {
        baseUrl = localUrl + '/v1';
      }
      
      console.log(`Testing LM Studio connection at ${baseUrl}`);
      
      // Test models endpoint with longer timeout (30 seconds)
      updateConnectionStatus(statusElement, null, 'Checking server status...');
      
      // Create a controller with a 30-second timeout
      const modelsController = new AbortController();
      const modelsTimeoutId = setTimeout(() => modelsController.abort(), 30000);
      
      try {
        const modelsResponse = await fetch(`${baseUrl}/models`, {
          method: 'GET',
          headers: {
            'Connection': 'keep-alive'
          },
          signal: modelsController.signal
        });
        
        clearTimeout(modelsTimeoutId);
        
        if (!modelsResponse.ok) {
          const errorText = await modelsResponse.text();
          console.error('LM Studio models endpoint error:', errorText);
          updateConnectionStatus(statusElement, false, `Server error: ${modelsResponse.status} - ${errorText.substring(0, 50)}`);
          return false;
        }
        
        updateConnectionStatus(statusElement, null, 'Server found, testing model inference...');
        
        // Now test a simple completion with longer timeout (1 minute)
        const completionController = new AbortController();
        const completionTimeoutId = setTimeout(() => completionController.abort(), 60000);
        
        try {
          // Do a very simple query to test if inference is working
          const completionResponse = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Connection': 'keep-alive'
            },
            body: JSON.stringify({
              model: "any-model",
              messages: [
                { role: 'system', content: 'You are a helpful assistant.' },
                { role: 'user', content: 'Say hello in one word.' }
              ],
              max_tokens: 10, // Very small to ensure fast response
              temperature: 0.7,
              stream: false
            }),
            signal: completionController.signal
          });
          
          clearTimeout(completionTimeoutId);
          
          if (!completionResponse.ok) {
            const errorText = await completionResponse.text();
            console.error('LM Studio inference test error:', errorText);
            updateConnectionStatus(statusElement, false, 'Server is running but inference failed. Is a model loaded?');
            return false;
          }
          
          const completionData = await completionResponse.json();
          console.log('LM Studio inference test response:', completionData);
          
          // All tests passed
          updateConnectionStatus(statusElement, true, 'LM Studio connection successful!');
          return true;
        } catch (completionError) {
          clearTimeout(completionTimeoutId);
          throw completionError;
        }
      } catch (modelsError) {
        clearTimeout(modelsTimeoutId);
        throw modelsError;
      }
    } catch (error) {
      console.error('Error testing LM Studio connection:', error);
      
      if (error.name === 'AbortError') {
        updateConnectionStatus(statusElement, false, 'Connection timed out. The model might be too slow or not responding.');
      } else if (error.message.includes('Failed to fetch')) {
        updateConnectionStatus(statusElement, false, 'Cannot connect to LM Studio. Is the server running?');
      } else {
        updateConnectionStatus(statusElement, false, `Connection error: ${error.message}`);
      }
      
      return false;
    }
  }

  // Add this after your existing event listeners in settings.js
  function setupApiKeyValidation() {
    // Add validation to Groq API key input
    groqApiKeyInput.addEventListener('blur', async function() {
      if (this.value.trim()) {
        // Show validation in progress
        const statusElement = groqSettings.querySelector('.connection-status');
        if (statusElement) {
          updateConnectionStatus(statusElement, null, 'Validating key...');
        }
        
        try {
          // Test the key immediately
          const result = await validateApiKey('groq', this.value.trim());
          
          // Update status
          if (statusElement) {
            updateConnectionStatus(
              statusElement, 
              result.isValid, 
              result.isValid ? 'Valid API key' : (result.message || 'Invalid API key')
            );
          }
        } catch (error) {
          console.error('Error validating Groq API key:', error);
          if (statusElement) {
            updateConnectionStatus(statusElement, false, 'Validation error');
          }
        }
      }
    });
    
    // Do the same for other API providers
    openaiApiKeyInput.addEventListener('blur', async function() {
      if (this.value.trim()) {
        const statusElement = openaiSettings.querySelector('.connection-status');
        if (statusElement) updateConnectionStatus(statusElement, null, 'Validating key...');
        
        try {
          const result = await validateApiKey('openai', this.value.trim());
          if (statusElement) {
            updateConnectionStatus(
              statusElement, 
              result.isValid, 
              result.isValid ? 'Valid API key' : (result.message || 'Invalid API key')
            );
          }
        } catch (error) {
          console.error('Error validating OpenAI API key:', error);
          if (statusElement) updateConnectionStatus(statusElement, false, 'Validation error');
        }
      }
    });
    
    // Add for Deepseek and Custom API as well
    deepseekApiKeyInput.addEventListener('blur', async function() {
      if (this.value.trim()) {
        const statusElement = deepseekSettings.querySelector('.connection-status');
        if (statusElement) updateConnectionStatus(statusElement, null, 'Validating key...');
        
        try {
          const result = await validateApiKey('deepseek', this.value.trim());
          if (statusElement) {
            updateConnectionStatus(
              statusElement,
              result.isValid,
              result.isValid ? 'Valid API key' : (result.message || 'Invalid API key')
            );
          }
        } catch (error) {
          console.error('Error validating Deepseek API key:', error);
          if (statusElement) updateConnectionStatus(statusElement, false, 'Validation error');
        }
      }
    });
    
    customApiKeyInput.addEventListener('blur', async function() {
      if (this.value.trim() && customApiEndpointInput.value.trim()) {
        const statusElement = customSettings.querySelector('.connection-status');
        if (statusElement) updateConnectionStatus(statusElement, null, 'Validating key...');
        
        try {
          const result = await validateApiKey(
            'custom', 
            this.value.trim(), 
            customApiEndpointInput.value.trim(),
            customApiHeadersInput.value.trim()
          );
          if (statusElement) {
            updateConnectionStatus(
              statusElement,
              result.isValid,
              result.isValid ? 'Valid API key' : (result.message || 'Invalid API key')
            );
          }
        } catch (error) {
          console.error('Error validating Custom API key:', error);
          if (statusElement) updateConnectionStatus(statusElement, false, 'Validation error');
        }
      }
    });
  }

  // Helper function to validate API keys directly without encryption
  async function validateApiKey(provider, apiKey, endpoint, headers) {
    try {
      let url = '';
      let requestHeaders = {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      };
      
      switch(provider) {
        case 'groq':
          url = 'https://api.groq.com/openai/v1/models';
          break;
        case 'openai':
          url = 'https://api.openai.com/v1/models';
          break;
        case 'deepseek':
          url = 'https://api.deepseek.com/v1/models';
          break;
        case 'custom':
          if (!endpoint) {
            return { isValid: false, message: 'API endpoint is required' };
          }
          url = endpoint.endsWith('/models') ? endpoint : 
                (endpoint.endsWith('/') ? endpoint + 'models' : endpoint + '/models');
                
          // Add custom headers if provided
          if (headers) {
            try {
              const parsedHeaders = JSON.parse(headers);
              requestHeaders = { ...requestHeaders, ...parsedHeaders };
            } catch (e) {
              console.error('Error parsing custom headers:', e);
            }
          }
          break;
        default:
          return { isValid: false, message: 'Unknown provider' };
      }
      
      // Create a controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(url, {
        method: 'GET',
        headers: requestHeaders,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text();
        return { 
          isValid: false, 
          message: `API returned status ${response.status}: ${errorText.substring(0, 100)}`
        };
      }
      
      await response.json(); // Make sure we can parse the response
      
      return { isValid: true, message: 'API key is valid' };
    } catch (error) {
      console.error(`API validation error (${provider}):`, error);
      
      if (error.name === 'AbortError') {
        return { isValid: false, message: 'Connection timed out' };
      }
      
      return { isValid: false, message: error.message };
    }
  }

  // Call this function after loading settings
  setupApiKeyValidation();
});