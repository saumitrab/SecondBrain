document.addEventListener('DOMContentLoaded', () => {
  const captureBtn = document.getElementById('captureBtn');
  const settingsBtn = document.getElementById('settingsBtn');
  const loader = document.getElementById('loader');
  const pageTitle = document.getElementById('pageTitle');
  const captureContent = document.getElementById('captureContent');
  const statusMessage = document.createElement('div');
  
  // Chat elements
  const chatInput = document.getElementById('chatInput');
  const sendBtn = document.getElementById('sendBtn');
  const chatMessages = document.getElementById('chatMessages');
  
  // Chat context storage
  let pageContext = {
    title: '',
    url: '',
    capture: '',
    history: []
  };
  let isChatProcessing = false;
  
  // Create progress elements
  const progressContainer = document.createElement('div');
  progressContainer.className = 'progress-container';
  progressContainer.style.display = 'none';
  
  const progressBar = document.createElement('div');
  progressBar.className = 'progress-bar';
  
  const progressFill = document.createElement('div');
  progressFill.className = 'progress-fill';
  
  const progressText = document.createElement('div');
  progressText.className = 'progress-text';
  progressText.textContent = '0%';
  
  const progressStatus = document.createElement('div');
  progressStatus.className = 'progress-status';
  
  // Assemble progress elements
  progressBar.appendChild(progressFill);
  progressContainer.appendChild(progressBar);
  progressContainer.appendChild(progressText);
  progressContainer.appendChild(progressStatus);
  
  // Add to the container
  document.querySelector('.container').appendChild(progressContainer);
  
  // Add API status indicator
  const apiStatusContainer = document.createElement('div');
  apiStatusContainer.className = 'api-status-container';
  
  const apiStatusLabel = document.createElement('div');
  apiStatusLabel.className = 'api-status-label';
  apiStatusLabel.textContent = 'Groq API:';
  
  const apiStatus = document.createElement('div');
  apiStatus.className = 'api-status';
  apiStatus.innerHTML = '<span class="status-indicator unknown"></span> <span class="status-text">Checking...</span>';
  
  apiStatusContainer.appendChild(apiStatusLabel);
  apiStatusContainer.appendChild(apiStatus);
  
  // Insert after the controls
  const controlsDiv = document.querySelector('.controls');
  controlsDiv.parentNode.insertBefore(apiStatusContainer, controlsDiv.nextSibling);
  
  // Check API connection status
  checkApiStatus();
  
  // Add status message to popup
  statusMessage.className = 'status-message';
  document.querySelector('.container').appendChild(statusMessage);
  
  // Track the current capture task
  let currentTaskId = null;
  
  // Check for active capture when popup opens
  chrome.runtime.sendMessage({ action: 'checkActiveCapture' }, (response) => {
    if (response && response.hasActiveTask) {
      // Resume the active task
      currentTaskId = response.task.taskId;
      pageTitle.textContent = response.task.title;
      showProgressUI();
      captureBtn.disabled = true;
    }
  });

  // Handle progress updates and completion
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'captureProgress' && currentTaskId === message.data.taskId) {
      updateProgress(message.data.percentage, message.data.status);
    }
    
    if ((message.action === 'captureComplete') && 
        currentTaskId === message.data.taskId) {
      handleCaptureComplete(message.data);
    }
    
    if (message.action === 'chatResponse') {
      handleChatResponse(message.data);
    }
    
    // Need to return false as we're not using sendResponse
    return false;
  });

  // Handle capture button click
  captureBtn.addEventListener('click', async () => {
    if (currentTaskId) return; // Prevent multiple tasks
    
    showProgressUI();
    captureBtn.disabled = true;
    statusMessage.textContent = '';
    
    // Clear previous chat
    chatMessages.innerHTML = '';
    chatInput.disabled = true;
    sendBtn.disabled = true;
    pageContext.history = [];
    
    try {
      // Get current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Send message to content script to scrape the page
      chrome.tabs.sendMessage(tab.id, { action: 'scrapeContent' }, async (response) => {
        if (chrome.runtime.lastError) {
          hideProgressUI();
          showError('Failed to connect to page. Please refresh and try again.');
          captureBtn.disabled = false;
          return;
        }
        
        if (!response || !response.success) {
          hideProgressUI();
          showError('Failed to scrape content. Please try again.');
          captureBtn.disabled = false;
          return;
        }
        
        const { title, content } = response;
        pageTitle.textContent = title;
        
        // Save current page context
        pageContext.title = title;
        pageContext.url = tab.url;
        
        // Send content to background script for capture
        chrome.runtime.sendMessage({
          action: 'capture',
          data: { title, content, url: tab.url }
        }, (response) => {
          if (chrome.runtime.lastError || !response) {
            hideProgressUI();
            showError('Failed to start capture. Please try again.');
            captureBtn.disabled = false;
            return;
          }
          
          // Store the task ID for tracking
          if (response.inProgress && response.taskId) {
            currentTaskId = response.taskId;
          }
        });
      });
    } catch (error) {
      hideProgressUI();
      showError(`Error: ${error.message}`);
      captureBtn.disabled = false;
    }
  });
  
  // Open settings page
  settingsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
  
  // Handle chat input
  sendBtn.addEventListener('click', () => {
    sendChatMessage();
  });
  
  // Support Enter key to send message (Shift+Enter for new line)
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  });
  
  function sendChatMessage() {
    const question = chatInput.value.trim();
    if (!question || isChatProcessing) return;
    
    // Show user message
    addChatMessage(question, 'user');
    chatInput.value = '';
    
    // Show thinking indicator
    const thinkingEl = document.createElement('div');
    thinkingEl.className = 'chat-thinking';
    thinkingEl.textContent = 'Thinking...';
    chatMessages.appendChild(thinkingEl);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Disable input while processing
    isChatProcessing = true;
    chatInput.disabled = true;
    sendBtn.disabled = true;
    
    // Get the current tab URL for context
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const url = tabs[0]?.url || '';
      
      // Send question to background script
      chrome.runtime.sendMessage({
        action: 'chat',
        data: {
          question,
          context: pageContext
        }
      });
    });
  }
  
  function handleChatResponse(data) {
    // Remove thinking indicator
    const thinkingEl = document.querySelector('.chat-thinking');
    if (thinkingEl) thinkingEl.remove();
    
    if (data.error) {
      addChatMessage('Sorry, I encountered an error: ' + data.error, 'ai');
    } else {
      addChatMessage(data.response, 'ai');
      
      // Update chat history
      pageContext.history.push(
        { role: 'user', content: data.question },
        { role: 'assistant', content: data.response }
      );
    }
    
    // Re-enable input
    isChatProcessing = false;
    chatInput.disabled = false;
    sendBtn.disabled = false;
    chatInput.focus();
  }
  
  function addChatMessage(message, role) {
    const messageEl = document.createElement('div');
    messageEl.className = `chat-message ${role}-message`;
    messageEl.textContent = message;
    chatMessages.appendChild(messageEl);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
  
  // Update progress UI
  function updateProgress(percentage, status) {
    progressFill.style.width = `${percentage}%`;
    progressText.textContent = `${percentage}%`;
    progressStatus.textContent = status || '';
  }
  
  // Show progress UI
  function showProgressUI() {
    loader.style.display = 'none';
    progressContainer.style.display = 'block';
    captureContent.innerHTML = '<p class="placeholder">Processing...</p>';
    updateProgress(0, 'Starting...');
  }
  
  // Hide progress UI
  function hideProgressUI() {
    progressContainer.style.display = 'none';
    currentTaskId = null;
  }
  
  // Handle capture completion
  function handleCaptureComplete(data) {
    hideProgressUI();
    captureBtn.disabled = false;
    
    if (!data.success) {
      showError(`Failed to generate capture: ${data.error}`);
      return;
    }
    
    captureContent.innerHTML = `<p>${data.capture}</p>`;
    
    // Save the capture for chat context
    pageContext.capture = data.capture;
    
    // Enable chat functionality
    chatInput.disabled = false;
    sendBtn.disabled = false;
    
    // Add initial message
    chatMessages.innerHTML = '';
    addChatMessage('I can answer questions about this page. What would you like to know?', 'ai');
    
    // Show status messages
    if (data.contentTruncated) {
      const truncatedMessage = document.createElement('div');
      truncatedMessage.className = 'truncated-notice';
      truncatedMessage.textContent = 'Note: Content was truncated due to length. This capture covers only the beginning portion of the page.';
      captureContent.appendChild(truncatedMessage);
    }
    
    // Show fallback message if we used Local LLM as fallback
    if (data.usedFallback) {
      statusMessage.textContent = 'Notice: Groq API failed. Capture was generated using Local LLM instead. Please check your API key in settings.';
      statusMessage.className = 'status-message warning';
      
      // Update API status if fallback occurred
      updateApiStatus(false, 'Connection failed');
    }
  }
  
  function showError(message) {
    captureContent.innerHTML = `<p class="error">${message}</p>`;
    currentTaskId = null;
    captureBtn.disabled = false;
  }
  
  // Function to check API connection status
  async function checkApiStatus() {
    // Get stored settings
    chrome.storage.sync.get(['captureType'], async (result) => {
      const captureType = result.captureType || 'local';
      
      // Update the API status label based on provider
      let providerName = 'API';
      switch (captureType) {
        case 'local':
          providerName = 'Local LLM';
          updateApiStatus(null, 'Using Local LLM');
          break;
        case 'groq':
          providerName = 'Groq API';
          testApiConnection('groq');
          break;
        case 'openai':
          providerName = 'OpenAI API';
          testApiConnection('openai');
          break;
        case 'deepseek':
          providerName = 'Deepseek API';
          testApiConnection('deepseek');
          break;
        case 'custom':
          // Get custom provider name
          chrome.storage.sync.get(['customApiName'], (customResult) => {
            const customName = customResult.customApiName || 'Custom API';
            apiStatusLabel.textContent = `${customName}:`;
            testApiConnection('custom');
          });
          return; // Handle custom separately due to async
      }
      
      apiStatusLabel.textContent = `${providerName}:`;
    });
  }
  
  // Function to test API connection
  async function testApiConnection(provider) {
    updateApiStatus(null, 'Checking...');
    
    try {
      const result = await new Promise((resolve) => {
        chrome.runtime.sendMessage(
          { 
            action: 'validateApiConnection', 
            data: { provider }
          },
          (response) => resolve(response)
        );
      });
      
      updateApiStatus(
        result.success && result.isValid, 
        result.isValid ? 'Connected' : (result.message || 'Connection failed')
      );
    } catch (error) {
      console.error(`Error checking ${provider} API status:`, error);
      updateApiStatus(false, 'Connection error');
    }
  }
  
  // Function to update API status display
  function updateApiStatus(isConnected, message) {
    const indicator = apiStatus.querySelector('.status-indicator');
    const text = apiStatus.querySelector('.status-text');
    
    if (isConnected === null) {
      // Unknown or not applicable state
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

  // Enhanced monitoring function
  function monitorCaptureProgress() {
    chrome.storage.local.get(['activeCaptureTask'], (result) => {
      const task = result.activeCaptureTask;
      const resetBtn = document.getElementById('reset-btn');
      
      if (task) {
        const currentTime = Date.now();
        const elapsedTime = currentTime - task.timestamp;
        
        // After 30 seconds, show the reset button
        if (elapsedTime > 30000) {
          if (resetBtn) resetBtn.style.display = 'block';
        }
        
        // After 3 minutes, auto-reset
        if (elapsedTime > 180000) {
          console.log('Detected stuck capture task, cleaning up...');
          
          // Clear the stuck task
          chrome.storage.local.remove('activeCaptureTask');
          
          // Update UI to show error
          const progressBar = document.getElementById('progress-bar');
          const progressText = document.getElementById('progress-text');
          const capture = document.getElementById('capture');
          
          if (progressBar) progressBar.style.width = '0%';
          if (progressText) progressText.textContent = 'Process timed out';
          if (capture) {
            capture.textContent = 'The capture process timed out. This might happen if:'
              + '\n\n1. LM Studio is not running or crashed'
              + '\n2. The model is taking too long to respond'
              + '\n3. The content is too large for the model to process'
              + '\n\nPlease try again with a smaller section of content or check LM Studio.';
          }
          
          // Enable the capture button again
          const captureBtn = document.getElementById('capture-btn');
          if (captureBtn) captureBtn.disabled = false;
          
          // Hide the reset button
          if (resetBtn) resetBtn.style.display = 'none';
        }
      } else {
        // No active task, hide reset button
        if (resetBtn) resetBtn.style.display = 'none';
      }
    });
  }

  // Immediately check for and clear any stuck tasks
  chrome.storage.local.get(['activeCaptureTask'], (result) => {
    const task = result.activeCaptureTask;
    
    if (task) {
      // Check if the task is older than 2 minutes
      const currentTime = Date.now();
      const elapsedTime = currentTime - task.timestamp;
      
      if (elapsedTime > 120000) { // 2 minutes
        console.log('Found a stuck task on popup open, cleaning up...');
        chrome.storage.local.remove('activeCaptureTask');
        
        // If we have progress elements already, update them
        const progressBar = document.getElementById('progress-bar');
        const progressText = document.getElementById('progress-text');
        if (progressBar) progressBar.style.width = '0%';
        if (progressText) progressText.textContent = 'Ready';
      }
    }
  });

  // Add a reset button to the popup.html
  const resetBtn = document.getElementById('reset-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      // Force clear any active tasks
      chrome.storage.local.remove('activeCaptureTask');
      
      // Reset UI
      if (progressBar) progressBar.style.width = '0%';
      if (progressText) progressText.textContent = 'Ready';
      captureBtn.disabled = false;
      
      // Update capture area
      captureContent.textContent = 'Capture has been reset. You can try again.';
      
      console.log('Capture process manually reset by user');
    });
  }

  // Reduce the monitoring interval to check more frequently
  setInterval(monitorCaptureProgress, 15000); // Check every 15 seconds instead of every minute
}); 