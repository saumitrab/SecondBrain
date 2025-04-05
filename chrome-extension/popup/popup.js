document.addEventListener('DOMContentLoaded', () => {
  const settingsBtn = document.getElementById('settingsBtn');
  const loader = document.getElementById('loader');
  const pageTitle = document.getElementById('pageTitle');
  const captureContent = document.getElementById('captureContent');
  const statusMessage = document.createElement('div');
  
  const ingestBtn = document.getElementById('ingestBtn');
  
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
    
    // Need to return false as we're not using sendResponse
    return false;
  });

  // Open settings page
  settingsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
  
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
    
    if (!data.success) {
      showError(`Failed to process content: ${data.error}`);
      return;
    }
    
    captureContent.innerHTML = `<p>${data.capture}</p>`;
    
    // Show status messages
    if (data.contentTruncated) {
      const truncatedMessage = document.createElement('div');
      truncatedMessage.className = 'truncated-notice';
      truncatedMessage.textContent = 'Note: Content was truncated due to length. This capture covers only the beginning portion of the page.';
      captureContent.appendChild(truncatedMessage);
    }
  }
  
  function showError(message) {
    captureContent.innerHTML = `<p class="error">${message}</p>`;
    statusMessage.textContent = message;
    statusMessage.className = 'status-message error';
    currentTaskId = null;
    ingestBtn.disabled = false;
  }

  // Handle ingest button click
  ingestBtn.addEventListener('click', async () => {
    try {
      // Show loading state
      ingestBtn.disabled = true;
      statusMessage.textContent = 'Ingesting content...';
      statusMessage.className = 'status-message';
      
      // Get current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Send message to content script to scrape the page
      chrome.tabs.sendMessage(tab.id, { action: 'scrapeContent' }, async (response) => {
        if (chrome.runtime.lastError) {
          showError('Failed to connect to page. Please refresh and try again.');
          ingestBtn.disabled = false;
          return;
        }
        
        if (!response || !response.success) {
          showError('Failed to scrape content. Please try again.');
          ingestBtn.disabled = false;
          return;
        }
        
        const { title, content } = response;
        
        // Create timestamp and payload
        const timestamp = new Date().toISOString();
        const payload = {
          url: tab.url,
          title: title,
          textContent: content,
          images: [], // Would need additional scraping for images
          videoTranscriptions: [], // Would need additional scraping for videos
          timestamp: timestamp
        };
        
        // Send to background script to handle API call
        chrome.runtime.sendMessage({
          action: 'ingestContent',
          data: { payload }
        }, (result) => {
          if (chrome.runtime.lastError) {
            showError('Error communicating with background script.');
            ingestBtn.disabled = false;
            return;
          }
          
          if (!result.success) {
            showError(`Ingest API error: ${result.message}`);
            ingestBtn.disabled = false;
            return;
          }
          
          const data = result.data;
          
          // Show success message
          statusMessage.textContent = 'Content successfully sent to knowledge base!';
          statusMessage.className = 'status-message success';
          
          // Update capture content to show confirmation
          captureContent.innerHTML = `
            <p>Content from "${title}" has been sent to your knowledge base.</p>
            <p class="ingest-status">Status: ${data.status}</p>
            <p class="ingest-message">${data.message}</p>
          `;
          
          ingestBtn.disabled = false;
        });
      });
    } catch (error) {
      showError(`Error: ${error.message}`);
      ingestBtn.disabled = false;
    }
  });

  // Enhanced monitoring function
  function monitorIngestionProgress() {
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
          console.log('Detected stuck ingestion task, cleaning up...');
          
          // Clear the stuck task
          chrome.storage.local.remove('activeCaptureTask');
          
          // Update UI to show error
          const progressBar = document.getElementById('progress-bar');
          const progressText = document.getElementById('progress-text');
          const capture = document.getElementById('capture');
          
          if (progressBar) progressBar.style.width = '0%';
          if (progressText) progressText.textContent = 'Process timed out';
          if (capture) {
            capture.textContent = 'The ingestion process timed out. This might happen if:'
              + '\n\n1. The server is not running or crashed'
              + '\n2. The server is taking too long to respond'
              + '\n3. The content is too large to process'
              + '\n\nPlease try again with a smaller section of content or check your server.';
          }
          
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
      ingestBtn.disabled = false;
      
      // Update capture area
      captureContent.textContent = 'Ingestion has been reset. You can try again.';
      
      console.log('Ingestion process manually reset by user');
    });
  }

  // Reduce the monitoring interval to check more frequently
  setInterval(monitorIngestionProgress, 15000); // Check every 15 seconds instead of every minute
});