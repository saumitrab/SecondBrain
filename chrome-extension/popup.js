/**
 * Popup script for SecondBrain Chrome Extension
 * Handles the UI interaction and coordinates content extraction
 */

document.addEventListener('DOMContentLoaded', () => {
  const extractBtn = document.getElementById('extractBtn');
  const statusElement = document.getElementById('status');
  const resultContainer = document.getElementById('resultContainer');
  const resultDetails = document.getElementById('resultDetails');

  // Add click handler to the extract button
  extractBtn.addEventListener('click', () => {
    extractContent();
  });

  /**
   * Extract content from the current tab
   */
  function extractContent() {
    // Update UI to show processing state
    setStatus('Processing...', 'processing');
    extractBtn.disabled = true;
    
    // Get the active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      // Send message to the content script to extract content
      chrome.tabs.sendMessage(
        tabs[0].id,
        { action: 'extractContent' },
        (response) => {
          if (chrome.runtime.lastError) {
            handleError('Error connecting to page: ' + chrome.runtime.lastError.message);
            return;
          }

          if (!response || !response.success) {
            handleError(response?.error || 'Unknown error extracting content');
            return;
          }

          // We have successfully extracted content, now send it to the server
          sendToServer(response.content);
        }
      );
    });
  }

  /**
   * Send the extracted content to the server via the background script
   */
  function sendToServer(content) {
    setStatus('Sending to server...', 'processing');
    
    chrome.runtime.sendMessage(
      { action: 'sendToServer', content },
      (response) => {
        if (chrome.runtime.lastError) {
          handleError('Error communicating with the extension: ' + chrome.runtime.lastError.message);
          return;
        }

        if (!response || !response.success) {
          handleError(response?.error || 'Failed to send content to server');
          return;
        }

        // Successfully sent to server
        handleSuccess(content, response.response);
      }
    );
  }

  /**
   * Handle successful extraction and server processing
   */
  function handleSuccess(content, serverResponse) {
    setStatus('Content extracted and processed successfully!', 'success');
    extractBtn.disabled = false;
    
    // Show result details
    resultContainer.classList.remove('hidden');
    
    // Display summary of extracted content
    resultDetails.innerHTML = `
      <p><strong>URL:</strong> ${content.url}</p>
      <p><strong>Title:</strong> ${content.title}</p>
      <p><strong>Text:</strong> ${summarizeText(content.textContent)}</p>
      <p><strong>Images:</strong> ${content.images.length} found</p>
      <p><strong>Videos:</strong> ${content.videoTranscriptions.length} found</p>
      <p><strong>Status:</strong> ${serverResponse.status || 'Processed'}</p>
    `;
  }

  /**
   * Handle errors during extraction or server communication
   */
  function handleError(errorMessage) {
    setStatus(`Error: ${errorMessage}`, 'error');
    extractBtn.disabled = false;
  }

  /**
   * Update the status message and style
   */
  function setStatus(message, type = 'default') {
    statusElement.textContent = message;
    statusElement.className = 'status ' + type;
  }

  /**
   * Create a shortened summary of the extracted text
   */
  function summarizeText(text) {
    if (!text) return 'None';
    
    const maxLength = 100;
    if (text.length <= maxLength) return text;
    
    return text.substring(0, maxLength) + '...';
  }
});
