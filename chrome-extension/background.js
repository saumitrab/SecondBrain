/**
 * Background script for SecondBrain Chrome Extension
 * Handles communication between content scripts and the server
 */

const API_BASE_URL = 'http://localhost:8000';

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "sendToServer") {
    sendContentToServer(request.content)
      .then(response => {
        sendResponse({ success: true, response });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    
    // Return true to indicate we will send a response asynchronously
    return true;
  }
});

/**
 * Send extracted content to the FastAPI server for processing
 * @param {Object} content - The extracted page content
 * @returns {Promise} - Promise resolving to the server response
 */
async function sendContentToServer(content) {
  try {
    // Send the extracted content to the /ingest endpoint
    const response = await fetch(`${API_BASE_URL}/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(content),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Server error: ${response.status} - ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error sending content to server:', error);
    throw new Error('Failed to send content to server');
  }
}

// Optional: Set up a listener for keyboard shortcuts
chrome.commands.onCommand.addListener((command) => {
  if (command === "extract-content") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: "extractContent" }, (response) => {
        if (response && response.success) {
          sendContentToServer(response.content);
        }
      });
    });
  }
});
