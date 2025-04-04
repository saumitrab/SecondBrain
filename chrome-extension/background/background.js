// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'capture') {
    const { title, content, url } = message.data;
    
    // Create a unique ID for this capture task
    const taskId = Date.now().toString();
    
    // Immediately respond with a taskId to prevent popup from closing
    sendResponse({ 
      success: true, 
      inProgress: true,
      taskId: taskId
    });
    
    // Store active capture task to prevent cancellation
    chrome.storage.local.set({ 
      activeCaptureTask: {
        taskId,
        timestamp: Date.now(),
        title,
        url
      }
    });
    
    // Function to update progress
    const updateProgress = (percentage, status) => {
      chrome.runtime.sendMessage({
        action: 'captureProgress',
        data: {
          taskId,
          percentage,
          status
        }
      });
    };
    
    // Start the capture process
    updateProgress(10, 'Preparing content...');
    
    // Get the user's preferred capture method and settings
    chrome.storage.sync.get([
      'captureType', 
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
      'localLlmUrl'
    ], async (result) => {
      try {
        // Decrypt API keys
        const apiKeys = await decryptApiKeys(result);
        
        // Make sure we're using the decrypted keys
        const groqApiKey = apiKeys.groqApiKey;
        const openaiApiKey = apiKeys.openaiApiKey;
        const deepseekApiKey = apiKeys.deepseekApiKey;
        const customApiKey = apiKeys.customApiKey;
        
        // Log key status (without revealing the actual key)
        console.log('Using Groq API key:', groqApiKey ? 'Key provided' : 'No key');
        console.log('Using OpenAI API key:', openaiApiKey ? 'Key provided' : 'No key');
        console.log('Using Deepseek API key:', deepseekApiKey ? 'Key provided' : 'No key');
        console.log('Using Custom API key:', customApiKey ? 'Key provided' : 'No key');
        
        const captureType = result.captureType || 'local';
        const localLlmUrl = result.localLlmUrl || 'http://localhost:1234/v1';
        
        let capture;
        let usedFallback = false;
        let contentTruncated = false;
        let provider = captureType;
        
        // Estimate tokens for progress reporting
        const estimatedTokens = Math.ceil((title.length + content.length) / 4);
        const isLikelyLarge = estimatedTokens > 4000;
        
        updateProgress(20, isLikelyLarge ? 'Truncating large content...' : 'Content prepared');
        
        try {
          // Format the content based on token limits
          const { formattedContent, isTruncated } = formatContentForProvider(title, content, captureType, result);
          contentTruncated = isTruncated;
          
          // Use the selected provider
          updateProgress(30, `Sending to ${getProviderName(captureType, result)}...`);
          
          try {
            switch (captureType) {
              case 'local':
                updateProgress(40, 'Processing with Local LLM...');
                capture = await captureWithLocalLlm(title, formattedContent, localLlmUrl);
                updateProgress(80, 'Local LLM response received...');
                break;
              case 'groq':
                capture = await captureWithGroq(title, formattedContent, groqApiKey, result.groqModel);
                break;
              case 'openai':
                capture = await captureWithOpenAI(title, formattedContent, openaiApiKey, result.openaiModel);
                break;
              case 'deepseek':
                capture = await captureWithDeepseek(title, formattedContent, deepseekApiKey, result.deepseekModel);
                break;
              case 'custom':
                capture = await captureWithCustom(
                  title, 
                  formattedContent, 
                  customApiKey, 
                  result.customApiEndpoint,
                  result.customApiModel,
                  result.customApiHeaders
                );
                break;
              default:
                // Fallback to local LLM if invalid type
                capture = await captureWithLocalLlm(title, formattedContent, localLlmUrl);
            }
            
            updateProgress(90, 'Finalizing capture...');
          } catch (apiError) {
            console.error(`${captureType} error, falling back to Local LLM:`, apiError);
            updateProgress(40, `${getProviderName(captureType, result)} failed, trying Local LLM...`);
            
            // Only fallback if we weren't already using Local LLM
            if (captureType !== 'local') {
              // Fallback to Local LLM
              try {
                const { formattedContent } = formatContentForProvider(title, content, 'local');
                updateProgress(50, 'Processing with Local LLM fallback...');
                capture = await captureWithLocalLlm(title, formattedContent, localLlmUrl);
                updateProgress(80, 'Local LLM response received...');
                usedFallback = true;
                provider = 'local';
              } catch (localError) {
                console.error('Local LLM fallback also failed:', localError);
                updateProgress(0, 'All capture methods failed');
                // Explicitly clear the active task
                chrome.storage.local.remove('activeCaptureTask');
                // Send error message to popup
                chrome.runtime.sendMessage({
                  action: 'captureComplete',
                  data: {
                    taskId,
                    success: false,
                    error: `Capture failed: ${apiError.message}. Fallback also failed: ${localError.message}`
                  }
                });
                return; // Exit the function
              }
            } else {
              // If we're already using Local LLM and it failed, just report the error
              updateProgress(0, 'Local LLM capture failed');
              // Explicitly clear the active task
              chrome.storage.local.remove('activeCaptureTask');
              // Send error message to popup
              chrome.runtime.sendMessage({
                action: 'captureComplete',
                data: {
                  taskId,
                  success: false,
                  error: `Local LLM capture failed: ${apiError.message}`
                }
              });
              return; // Exit the function
            }
          }
          
          // Save the capture and URL to history
          saveToHistory(url, title, capture, provider);
          updateProgress(100, 'Capture complete!');
          
          // Send the completed capture
          chrome.runtime.sendMessage({
            action: 'captureComplete',
            data: { 
              taskId,
              success: true, 
              capture,
              usedFallback,
              contentTruncated,
              provider
            }
          });
          
          // Clear active task
          chrome.storage.local.remove('activeCaptureTask');
        } catch (error) {
          console.error('Capture error:', error);
          updateProgress(0, 'Capture failed');
          
          // Explicitly clear the active task
          chrome.storage.local.remove('activeCaptureTask');
          
          // Send error message to popup
          chrome.runtime.sendMessage({
            action: 'captureComplete',
            data: {
              taskId,
              success: false,
              error: `Capture failed: ${error.message}`
            }
          });
        }
      } catch (error) {
        console.error('Capture error:', error);
        updateProgress(0, 'Capture failed');
        
        // Explicitly clear the active task
        chrome.storage.local.remove('activeCaptureTask');
        
        // Send error message to popup
        chrome.runtime.sendMessage({
          action: 'captureComplete',
          data: {
            taskId,
            success: false,
            error: `Capture failed: ${error.message}`
          }
        });
      }
    });
    
    // Return true because we're responding asynchronously
    return true;
  }
  
  // Handle chat questions
  if (message.action === 'chat') {
    const { question, context } = message.data;
    
    // Process in the background without blocking
    processChat(question, context);
    
    // Return false since we're not using sendResponse
    return false;
  }
  
  // Validate API connection
  if (message.action === 'validateApiConnection') {
    const { provider } = message.data;
    
    // Get the API key for the specified provider
    chrome.storage.sync.get([
      'encryptedGroqApiKey',
      'encryptedOpenaiApiKey',
      'encryptedDeepseekApiKey',
      'encryptedCustomApiKey',
      'customApiEndpoint',
      'customApiHeaders',
      'encryptionEnabled'
    ], async (result) => {
      try {
        console.log(`Validating ${provider} API keys`);
        console.log('Encrypted key available:', !!result[`encrypted${provider.charAt(0).toUpperCase() + provider.slice(1)}ApiKey`]);
        console.log('Encryption setting:', result.encryptionEnabled);
        
        // Decrypt the API keys
        const apiKeys = await decryptApiKeys(result);
        
        // Log decrypted key status (without revealing the key)
        console.log(`Decrypted ${provider} key available:`, !!apiKeys[`${provider}ApiKey`]);
        console.log(`Decrypted ${provider} key length:`, apiKeys[`${provider}ApiKey`]?.length || 0);
        
        let apiKey, model, endpoint, headers;
        
        // Get the appropriate key based on provider
        switch(provider) {
          case 'groq':
            apiKey = apiKeys.groqApiKey;
            break;
          case 'openai':
            apiKey = apiKeys.openaiApiKey;
            break;
          case 'deepseek':
            apiKey = apiKeys.deepseekApiKey;
            break;
          case 'custom':
            apiKey = apiKeys.customApiKey;
            endpoint = result.customApiEndpoint;
            headers = result.customApiHeaders;
            break;
          default:
            throw new Error(`Unknown provider: ${provider}`);
        }
        
        // Check if API key exists
        if (!apiKey) {
          sendResponse({
            success: true,
            isValid: false,
            message: 'API key is not configured'
          });
          return;
        }
        
        // Log key length for debugging (don't log the actual key)
        console.log(`API key length for ${provider}: ${apiKey.length}`);
        console.log(`First 4 chars of key: ${apiKey.substring(0, 4)}...`);
        
        // Validate the API key
        const validationResult = await validateApiConnection(
          provider, 
          apiKey, 
          model, 
          endpoint, 
          headers
        );
        
        sendResponse(validationResult);
      } catch (error) {
        console.error('Error validating API connection:', error);
        sendResponse({
          success: false,
          isValid: false,
          message: error.message
        });
      }
    });
    
    return true; // Keep the message channel open for the async response
  }
  
  // Check for active capture
  if (message.action === 'checkActiveCapture') {
    chrome.storage.local.get(['activeCaptureTask'], (result) => {
      const task = result.activeCaptureTask;
      if (task && (Date.now() - task.timestamp) < 300000) { // 5 minute timeout
        sendResponse({ hasActiveTask: true, task });
      } else {
        if (task) {
          // Clear stale task
          chrome.storage.local.remove('activeCaptureTask');
        }
        sendResponse({ hasActiveTask: false });
      }
    });
    return true;
  }

  // Add this to your message listener in background.js
  if (message.action === 'resetCapture') {
    console.log('Manual reset requested');
    chrome.storage.local.remove('activeCaptureTask', () => {
      sendResponse({ success: true });
    });
    return true; // Keep the message channel open for async response
  }
});

// Format content based on provider's token limits
function formatContentForProvider(title, content, provider, settings = {}) {
  // Set reasonable token limits based on provider
  let tokenLimit;
  switch (provider) {
    case 'local':
      tokenLimit = 8000; // Conservative limit for local models
      break;
    case 'groq':
      tokenLimit = settings.groqModel && settings.groqModel.includes('70b') ? 12000 : 8000;
      break;
    case 'openai':
      tokenLimit = settings.openaiModel && settings.openaiModel.includes('gpt-4') ? 12000 : 4000;
      break;
    case 'deepseek':
      tokenLimit = 8000;
      break;
    case 'custom':
      tokenLimit = 4000; // Conservative default
      break;
    default:
      tokenLimit = 4000;
  }
  
  // Estimate tokens (rough approximation: 4 chars ~= 1 token)
  const estimatedTokens = Math.ceil((title.length + content.length) / 4);
  
  // Log the content size for debugging
  console.log(`Content for ${provider} - estimated tokens: ${estimatedTokens}, limit: ${tokenLimit}`);
  
  // If content is within limit, return as is
  if (estimatedTokens <= tokenLimit) {
    return { 
      formattedContent: content,
      isTruncated: false
    };
  }
  
  // If we need to truncate, do it more intelligently
  console.log(`Content exceeds ${provider} token limit, truncating...`);
  
  // Keep title and first few paragraphs intact
  const paragraphs = content.split('\n\n');
  
  // Always keep the first paragraph (intro)
  let truncatedContent = paragraphs[0] + '\n\n';
  let currentTokens = Math.ceil((title.length + truncatedContent.length) / 4);
  
  // Add as many paragraphs as will fit
  for (let i = 1; i < paragraphs.length; i++) {
    const paragraphTokens = Math.ceil(paragraphs[i].length / 4);
    
    // If this paragraph would exceed our limit, stop adding
    if (currentTokens + paragraphTokens > tokenLimit * 0.9) {
      truncatedContent += '\n\n[Content truncated due to length limitations...]';
      break;
    }
    
    // Otherwise add the paragraph
    truncatedContent += paragraphs[i] + '\n\n';
    currentTokens += paragraphTokens;
  }
  
  return {
    formattedContent: truncatedContent,
    isTruncated: true
  };
}

// Get human-readable provider name
function getProviderName(provider, settings = {}) {
  switch (provider) {
    case 'local':
      return 'Local LLM';
    case 'groq':
      return 'Groq API';
    case 'openai':
      return 'OpenAI API';
    case 'deepseek':
      return 'Deepseek API';
    case 'custom':
      return settings.customApiName || 'Custom API';
    default:
      return 'AI Service';
  }
}

// Decrypt API keys from storage
async function decryptApiKeys(settings) {
  // Encryption helpers
  const encryptionKey = 'capture-me-extension-key';
  
  async function decryptData(encryptedData) {
    if (!encryptedData) return '';
    
    try {
      // Check if encryption is enabled
      const encryptionEnabled = settings.encryptionEnabled !== undefined ? 
        settings.encryptionEnabled : true;
      
      // Try simple base64 decode if encryption is disabled
      if (!encryptionEnabled) {
        return atob(encryptedData);
      }
      
      // For encrypted data:
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
  
  return {
    groqApiKey: await decryptData(settings.encryptedGroqApiKey),
    openaiApiKey: await decryptData(settings.encryptedOpenaiApiKey),
    deepseekApiKey: await decryptData(settings.encryptedDeepseekApiKey),
    customApiKey: await decryptData(settings.encryptedCustomApiKey)
  };
}

// Process chat messages and respond using the appropriate LLM
async function processChat(question, context) {
  try {
    // Get the user's preferred LLM settings
    chrome.storage.sync.get([
      'captureType', 
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
      'localLlmUrl'
    ], async (result) => {
      try {
        // Decrypt API keys
        const apiKeys = await decryptApiKeys(result);
        
        const captureType = result.captureType || 'local';
        const localLlmUrl = result.localLlmUrl || 'http://localhost:1234/v1';
        
        let response;
        let provider = captureType;
        
        // Format chat history for context
        const formattedHistory = context.history.length > 0 
          ? context.history
          : [{ role: 'system', content: 'You are a helpful assistant that answers questions about web content.' }];
        
        // Create context message
        const contextMessage = `You are answering questions about a webpage with the title "${context.title}" 
and URL ${context.url}. Here is a capture of the content: ${context.capture}
The user wants to know more about the content of this webpage. Answer their questions based on the capture.
If you can't answer based on the capture, say so and suggest what information might be needed.`;
        
        // Make sure system instructions are first
        if (formattedHistory[0].role !== 'system') {
          formattedHistory.unshift({ role: 'system', content: contextMessage });
        } else {
          formattedHistory[0].content = contextMessage;
        }
        
        // Add this question
        formattedHistory.push({ role: 'user', content: question });
        
        try {
          // Use the selected provider
          const providerInstance = getProviderInstance(captureType, apiKeys);
          response = await providerInstance.chat(formattedHistory, result);
        } catch (apiError) {
          console.error(`${captureType} chat error, falling back to Local LLM:`, apiError);
          
          // Fallback to Local LLM
          const localProviderInstance = getProviderInstance('local', apiKeys);
          response = await localProviderInstance.chat(formattedHistory, result);
          provider = 'local';
        }
        
        // Send the response back
        chrome.runtime.sendMessage({
          action: 'chatResponse',
          data: {
            question,
            response,
            provider,
            success: true
          }
        });
      } catch (error) {
        console.error('Chat error:', error);
        
        // Send error message
        chrome.runtime.sendMessage({
          action: 'chatResponse',
          data: {
            question,
            error: error.message,
            success: false
          }
        });
      }
    });
  } catch (error) {
    console.error('Error processing chat:', error);
    
    // Send error message
    chrome.runtime.sendMessage({
      action: 'chatResponse',
      data: {
        question,
        error: 'Failed to process your question. Please try again.',
        success: false
      }
    });
  }
}

// Validate API Connection
async function validateApiConnection(provider, apiKey, model, endpoint, headers) {
  try {
    console.log(`Validating ${provider} API connection`);
    
    // Check if API key is provided
    if (!apiKey) {
      console.log(`No API key provided for ${provider}`);
      return {
        success: true,
        isValid: false,
        message: 'API key is not configured'
      };
    }
    
    // Log key length for debugging (don't log the actual key)
    console.log(`API key length for ${provider}: ${apiKey.length}`);
    console.log(`First 4 chars of key: ${apiKey.substring(0, 4)}...`);
    
    // Add timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
    
    let url, requestHeaders;
    
    // Configure request based on provider
    switch(provider) {
      case 'groq':
        url = 'https://api.groq.com/openai/v1/models';
        requestHeaders = {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        };
        break;
      case 'openai':
        url = 'https://api.openai.com/v1/models';
        requestHeaders = {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        };
        break;
      case 'deepseek':
        url = 'https://api.deepseek.com/v1/models';  // Adjust if needed
        requestHeaders = {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        };
        break;
      case 'custom':
        if (!endpoint) {
          throw new Error('Custom API endpoint not configured');
        }
        url = endpoint.endsWith('/models') ? endpoint : 
              (endpoint.endsWith('/') ? endpoint + 'models' : endpoint + '/models');
        requestHeaders = {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        };
        
        // Add custom headers if provided
        if (headers) {
          try {
            const parsedHeaders = typeof headers === 'string' ? JSON.parse(headers) : headers;
            requestHeaders = { ...requestHeaders, ...parsedHeaders };
          } catch (e) {
            console.error('Error parsing custom headers:', e);
          }
        }
        break;
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
    
    // Debug output
    console.log(`Sending request to ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: requestHeaders,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    // Check if response is OK before trying to parse JSON
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`${provider} API error response:`, errorText);
      return {
        success: true,
        isValid: false,
        message: `API returned status ${response.status}: ${errorText.substring(0, 100)}`
      };
    }
    
    const data = await response.json();
    console.log(`${provider} API validation successful`);
    
    return {
      success: true,
      isValid: true,
      message: 'API key is valid'
    };
  } catch (error) {
    console.error(`${provider} API validation error:`, error);
    
    // Check for timeout
    if (error.name === 'AbortError') {
      return {
        success: true,
        isValid: false,
        message: 'Connection timed out'
      };
    }
    
    return {
      success: true,
      isValid: false,
      message: error.message
    };
  }
}

// Function to chat using Groq API
async function chatWithGroq(messages, apiKey, model) {
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model || 'llama3-8b-8192', // Fallback only if model is undefined
        messages: messages,
        temperature: 0.7,
        max_tokens: 500
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'Error calling Groq API');
    }
    
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Groq API chat error:', error);
    throw new Error(`Failed to get answer from Groq: ${error.message}`);
  }
}

// Function to chat using OpenAI API
async function chatWithOpenAI(messages, apiKey, model) {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model || 'gpt-3.5-turbo', // Fallback only if model is undefined
        messages: messages,
        temperature: 0.7,
        max_tokens: 500
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'Error calling OpenAI API');
    }
    
    return data.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI API chat error:', error);
    throw new Error(`Failed to get answer from OpenAI: ${error.message}`);
  }
}

// Function to chat using Deepseek API
async function chatWithDeepseek(messages, apiKey, model) {
  try {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model || 'deepseek-chat', // Fallback only if model is undefined
        messages: messages,
        temperature: 0.7,
        max_tokens: 500
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'Error calling Deepseek API');
    }
    
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Deepseek API chat error:', error);
    throw new Error(`Failed to get answer from Deepseek: ${error.message}`);
  }
}

// Function to chat using Custom API
async function chatWithCustom(messages, apiKey, endpoint, model, customHeaders = '{}') {
  try {
    // Parse headers if it's a string
    let headers = typeof customHeaders === 'string' 
      ? JSON.parse(customHeaders || '{}') 
      : customHeaders;
    
    // Add standard headers
    headers = {
      ...headers,
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    };
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: model,
        messages: messages,
        temperature: 0.7,
        max_tokens: 500
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'Error calling Custom API');
    }
    
    // Attempt to extract response using standard OpenAI format
    if (data.choices && data.choices[0] && data.choices[0].message) {
      return data.choices[0].message.content;
    } else if (data.output || data.response || data.text || data.content) {
      // Try alternative response formats
      return data.output || data.response || data.text || data.content;
    } else {
      // If we can't find the response in a standard place, return the whole JSON
      return JSON.stringify(data);
    }
  } catch (error) {
    console.error('Custom API chat error:', error);
    throw new Error(`Failed to get answer from Custom API: ${error.message}`);
  }
}

// Fixed function to chat using local LLM via LM Studio with better timeout handling
async function chatWithLocalLlm(messages, localLlmUrl) {
  try {
    // Ensure localLlmUrl is a string and properly formatted
    if (!localLlmUrl || typeof localLlmUrl !== 'string') {
      localLlmUrl = 'http://localhost:1234/v1';
    }
    
    // Ensure localLlmUrl doesn't end with /v1
    const baseUrl = localLlmUrl.endsWith('/v1') 
      ? localLlmUrl 
      : localLlmUrl.endsWith('/') 
        ? localLlmUrl + 'v1' 
        : localLlmUrl + '/v1';
    
    console.log(`Connecting to local LLM chat at ${baseUrl}/chat/completions`);
    
    // Create a controller with a much longer timeout (3 minutes)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log('Local LLM chat request timed out after 3 minutes');
      controller.abort();
    }, 180000); // 3 minutes timeout
    
    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Connection': 'keep-alive' // Add keep-alive header
        },
        body: JSON.stringify({
          model: "any-model", // This field is ignored by LM Studio if only one model is loaded
          messages: messages,
          max_tokens: 500,
          temperature: 0.7,
          stream: false // Explicitly set stream to false
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`LM Studio chat error (${response.status}):`, errorText);
        throw new Error(`HTTP error ${response.status}: ${errorText.substring(0, 100)}`);
      }
      
      const data = await response.json();
      console.log('LM Studio chat response data:', data);
      
      if (!data.choices || data.choices.length === 0) {
        throw new Error('No completion choices returned from LM Studio');
      }
      
      return data.choices[0].message.content.trim();
    } finally {
      clearTimeout(timeoutId); // Ensure timeout is cleared
    }
  } catch (error) {
    console.error('Local LLM chat error:', error);
    
    if (error.name === 'AbortError') {
      throw new Error('Local LLM request timed out. The model might be taking too long to generate a response.');
    }
    
    throw new Error(`Failed to chat with local LLM: ${error.message}. Make sure LM Studio is running with the correct model loaded.`);
  }
}

// Function to capture content using local LLM via LM Studio with longer timeout
async function captureWithLocalLlm(title, content, localLlmUrl) {
  const prompt = `Capture the following content with title "${title}":\n\n${content}\n\nProvide a concise capture highlighting the key points.`;
  
  try {
    // Ensure localLlmUrl is a string and properly formatted
    if (!localLlmUrl || typeof localLlmUrl !== 'string') {
      localLlmUrl = 'http://localhost:1234/v1';
    }
    
    // Ensure localLlmUrl doesn't end with /v1
    const baseUrl = localLlmUrl.endsWith('/v1') 
      ? localLlmUrl 
      : localLlmUrl.endsWith('/') 
        ? localLlmUrl + 'v1' 
        : localLlmUrl + '/v1';
    
    console.log(`Connecting to local LLM at ${baseUrl}/chat/completions`);
    
    // Create a controller with a much longer timeout (3 minutes)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log('Local LLM request timed out after 3 minutes');
      controller.abort();
    }, 180000); // 3 minutes timeout
    
    try {
      // First, perform a quick models check to ensure server is running
      try {
        const modelCheckResponse = await fetch(`${baseUrl}/models`, {
          method: 'GET',
          headers: {
            'Connection': 'keep-alive'
          },
          signal: AbortSignal.timeout(5000) // Quick 5-second timeout for this check
        });
        
        if (!modelCheckResponse.ok) {
          throw new Error(`LM Studio server returned status ${modelCheckResponse.status}`);
        }
        
        console.log('LM Studio server is running, proceeding with completion request');
      } catch (modelCheckError) {
        console.error('LM Studio server check failed:', modelCheckError);
        throw new Error('Cannot connect to LM Studio server. Is it running?');
      }
      
      // Now proceed with the actual completion request
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Connection': 'keep-alive' // Add keep-alive header
        },
        body: JSON.stringify({
          model: "any-model", // This field is ignored by LM Studio if only one model is loaded
          messages: [
            { role: 'system', content: 'You are a helpful assistant that provides concise captures of web content.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 500,
          temperature: 0.7,
          stream: false // Explicitly set stream to false
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`LM Studio error (${response.status}):`, errorText);
        throw new Error(`HTTP error ${response.status}: ${errorText.substring(0, 100)}`);
      }
      
      const data = await response.json();
      console.log('LM Studio response data:', data);
      
      if (!data.choices || data.choices.length === 0) {
        throw new Error('No completion choices returned from LM Studio');
      }
      
      return data.choices[0].message.content.trim();
    } catch (fetchError) {
      clearTimeout(timeoutId);
      throw fetchError;
    }
  } catch (error) {
    console.error('Local LLM capture error:', error);
    
    if (error.name === 'AbortError') {
      throw new Error('Local LLM request timed out. The model might be taking too long to generate a response.');
    }
    
    throw new Error(`Failed to capture with local LLM: ${error.message}. Make sure LM Studio is running with the correct model loaded.`);
  }
}

// Function to capture content using Groq API
async function captureWithGroq(title, content, apiKey, model) {
  const prompt = `Capture the following content with title "${title}":\n\n${content}\n\nProvide a concise capture highlighting the key points.`;
  
  try {
    console.log(`Calling Groq API with model: ${model}`);
    
    // Add timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    // Verify API key is present
    if (!apiKey) {
      throw new Error('Groq API key is missing. Please check your settings.');
    }
    
    console.log('Using model:', model);
    
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model || 'llama3-8b-8192', // Fallback only if model is undefined
        messages: [
          { role: 'system', content: 'You are a helpful assistant that provides concise captures of web content.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 500
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    // Check if response is OK before trying to parse JSON
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Groq API error response:', errorText);
      
      // Add specific handling for 401 errors
      if (response.status === 401) {
        throw new Error('Invalid Groq API key. Please check your settings and update your API key.');
      }
      
      throw new Error(`Groq API returned status ${response.status}: ${errorText.substring(0, 100)}`);
    }
    
    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('Unexpected Groq API response format:', data);
      throw new Error('Unexpected response format from Groq API');
    }
    
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Groq API error:', error);
    throw new Error(`Failed to capture with Groq: ${error.message}`);
  }
}

// Function to capture content using OpenAI API
async function captureWithOpenAI(title, content, apiKey, model) {
  const prompt = `Capture the following content with title "${title}":\n\n${content}\n\nProvide a concise capture highlighting the key points.`;
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model || 'gpt-3.5-turbo', // Fallback only if model is undefined
        messages: [
          { role: 'system', content: 'You are a helpful assistant that provides concise captures of web content.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 500
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'Error calling OpenAI API');
    }
    
    return data.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw new Error(`Failed to capture with OpenAI: ${error.message}`);
  }
}

// Function to capture content using Deepseek API
async function captureWithDeepseek(title, content, apiKey, model) {
  const prompt = `Capture the following content with title "${title}":\n\n${content}\n\nProvide a concise capture highlighting the key points.`;
  
  try {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model || 'deepseek-chat', // Fallback only if model is undefined
        messages: [
          { role: 'system', content: 'You are a helpful assistant that provides concise captures of web content.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 500
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'Error calling Deepseek API');
    }
    
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Deepseek API error:', error);
    throw new Error(`Failed to capture with Deepseek: ${error.message}`);
  }
}

// Function to capture content using custom API
async function captureWithCustom(title, content, apiKey, endpoint, model, customHeaders = '{}') {
  const prompt = `Capture the following content with title "${title}":\n\n${content}\n\nProvide a concise capture highlighting the key points.`;
  
  try {
    // Parse headers if it's a string
    let headers = typeof customHeaders === 'string' 
      ? JSON.parse(customHeaders || '{}') 
      : customHeaders;
    
    // Add standard headers
    headers = {
      ...headers,
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    };
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: 'You are a helpful assistant that provides concise captures of web content.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 500
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'Error calling Custom API');
    }
    
    // Attempt to extract response using standard OpenAI format
    if (data.choices && data.choices[0] && data.choices[0].message) {
      return data.choices[0].message.content;
    } else if (data.output || data.response || data.text || data.content) {
      // Try alternative response formats
      return data.output || data.response || data.text || data.content;
    } else {
      // If we can't find the response in a standard place, return the whole JSON
      return JSON.stringify(data);
    }
  } catch (error) {
    console.error('Custom API error:', error);
    throw new Error(`Failed to capture with Custom API: ${error.message}`);
  }
}

// Save capture to history
function saveToHistory(url, title, capture, provider = 'unknown') {
  chrome.storage.local.get(['history'], (result) => {
    const history = result.history || [];
    
    // Add new entry
    history.push({
      url,
      title,
      capture,
      provider,
      timestamp: Date.now()
    });
    
    // Keep only the last 100 entries
    if (history.length > 100) {
      history.shift();
    }
    
    chrome.storage.local.set({ history });
  });
}

// Save content to SecondBrain API
async function saveToSecondBrain(data) {
  try {
    // Get authentication token
    const token = await getAuthToken();
    if (!token) {
      throw new Error("Not authenticated");
    }
    
    // Process content locally if offline
    const isOnline = navigator.onLine;
    if (!isOnline) {
      await storeOffline(data);
      return { success: true, offline: true };
    }
    
    // Send to API
    const response = await fetch(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.save}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to save content");
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error saving to SecondBrain:", error);
    throw error;
  }
}

// Offline storage
async function storeOffline(data) {
  return new Promise((resolve) => {
    chrome.storage.local.get(["offlineQueue"], (result) => {
      const queue = result.offlineQueue || [];
      queue.push({
        data,
        timestamp: Date.now()
      });
      
      chrome.storage.local.set({ offlineQueue: queue }, () => {
        resolve(true);
      });
    });
  });
}

// Handle specific content types
function saveImage(imageUrl, pageUrl, pageTitle) {
  // Implementation for saving images
  // This could involve downloading the image and converting to base64
  // or just saving the URL with appropriate metadata
}

function saveLink(linkUrl, pageUrl, pageTitle) {
  // Implementation for saving links with metadata
}

/**
 * Get the appropriate provider instance based on provider type
 * 
 * @param {string} providerType - The type of provider (local, groq, openai, etc.)
 * @param {Object} apiKeys - Object containing API keys for different providers
 * @returns {Object} - Provider instance with standardized methods
 */
function getProviderInstance(providerType, apiKeys) {
  switch (providerType) {
    case 'local':
      return {
        capture: async (title, content, settings) => {
          const localLlmUrl = settings.localLlmUrl || 'http://localhost:1234/v1';
          return await captureWithLocalLlm(title, content, localLlmUrl);
        },
        chat: async (messages, settings) => {
          const localLlmUrl = settings.localLlmUrl || 'http://localhost:1234/v1';
          return await chatWithLocalLlm(messages, localLlmUrl);
        }
      };
    case 'groq':
      return {
        capture: async (title, content, settings) => {
          return await captureWithGroq(title, content, apiKeys.groqApiKey, settings.groqModel);
        },
        chat: async (messages, settings) => {
          return await chatWithGroq(messages, apiKeys.groqApiKey, settings.groqModel);
        }
      };
    case 'openai':
      return {
        capture: async (title, content, settings) => {
          return await captureWithOpenAI(title, content, apiKeys.openaiApiKey, settings.openaiModel);
        },
        chat: async (messages, settings) => {
          return await chatWithOpenAI(messages, apiKeys.openaiApiKey, settings.openaiModel);
        }
      };
    case 'deepseek':
      return {
        capture: async (title, content, settings) => {
          return await captureWithDeepseek(title, content, apiKeys.deepseekApiKey, settings.deepseekModel);
        },
        chat: async (messages, settings) => {
          return await chatWithDeepseek(messages, apiKeys.deepseekApiKey, settings.deepseekModel);
        }
      };
    case 'custom':
      return {
        capture: async (title, content, settings) => {
          return await captureWithCustom(
            title, 
            content, 
            apiKeys.customApiKey, 
            settings.customApiEndpoint,
            settings.customApiModel,
            settings.customApiHeaders
          );
        },
        chat: async (messages, settings) => {
          return await chatWithCustom(
            messages, 
            apiKeys.customApiKey, 
            settings.customApiEndpoint,
            settings.customApiModel,
            settings.customApiHeaders
          );
        }
      };
    default:
      console.warn(`Unknown provider type: ${providerType}, falling back to local LLM`);
      return getProviderInstance('local', apiKeys);
  }
}

/**
 * Fetch data from the SecondBrain API with improved error handling and retry logic
 * 
 * @param {string} endpoint - The API endpoint key from API_CONFIG.endpoints
 * @param {string} method - HTTP method (GET, POST, etc.)
 * @param {Object} data - Optional data to send in the request body
 * @param {string} token - Optional authentication token
 * @param {number} retries - Number of retries on network failure (default: 2)
 * @returns {Promise<Object>} - The API response
 */
async function fetchApiEndpoint(endpoint, method, data, token, retries = 2) {
  // Get the current API_CONFIG
  await initApiConfig();
  
  if (!API_CONFIG.endpoints[endpoint]) {
    console.error(`Unknown endpoint: ${endpoint}`);
    throw new Error(`Unknown endpoint: ${endpoint}`);
  }
  
  const url = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints[endpoint]}`;
  console.log(`Fetching from ${url}`);
  
  let lastError;
  
  // Implement retry logic
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const response = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
          ...(token ? {"Authorization": `Bearer ${token}`} : {})
        },
        ...(data ? {body: JSON.stringify(data)} : {}),
        signal: controller.signal
      });
      
      // Clear the timeout
      clearTimeout(timeoutId);
      
      // Handle non-OK responses
      if (!response.ok) {
        // Try to parse error response as JSON
        let errorMessage;
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorData.message || `API error: ${response.status}`;
        } catch (jsonError) {
          // If can't parse JSON, use text or status
          try {
            errorMessage = await response.text() || `API error: ${response.status}`;
          } catch (textError) {
            errorMessage = `API error: ${response.status}`;
          }
        }
        
        // Log different information based on status code
        if (response.status === 401 || response.status === 403) {
          console.error(`Authentication error calling ${endpoint}: ${errorMessage}`);
          throw new Error(`Authentication failed: ${errorMessage}`);
        } else if (response.status === 429) {
          console.warn(`Rate limited when calling ${endpoint}: ${errorMessage}`);
          // For rate limiting, wait longer before retrying
          if (attempt < retries) {
            await new Promise(resolve => setTimeout(resolve, 2000 * (attempt + 1)));
            continue; // Retry after waiting
          }
        } else {
          console.error(`API error calling ${endpoint}: ${response.status} - ${errorMessage}`);
        }
        
        throw new Error(errorMessage);
      }
      
      // Parse success response
      return await response.json();
      
    } catch (error) {
      lastError = error;
      
      // Handle network errors and retries
      if (error.name === 'AbortError') {
        console.warn(`Request to ${endpoint} timed out`);
      } else if (error.name === 'TypeError' && error.message.includes('NetworkError')) {
        console.warn(`Network error when calling ${endpoint}, attempt ${attempt + 1}/${retries + 1}`);
      } else {
        console.error(`Error calling ${endpoint}:`, error);
      }
      
      // Only retry on network errors or timeouts
      if (
        attempt < retries && 
        (error.name === 'TypeError' || error.name === 'AbortError')
      ) {
        // Exponential backoff: wait longer for each retry
        const waitTime = 1000 * Math.pow(2, attempt);
        console.log(`Retrying in ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      
      // If we've exhausted retries or it's not a retriable error, rethrow
      throw error;
    }
  }
  
  // This should never be reached due to the throw in the loop,
  // but just in case we had a logic error
  throw lastError || new Error(`Failed to fetch ${endpoint} after ${retries} retries`);
} 