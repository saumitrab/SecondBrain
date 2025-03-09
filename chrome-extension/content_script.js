/**
 * Content script for SecondBrain Chrome Extension
 * Responsible for extracting visible text, images, and video audio from the webpage
 */

// Handle messages from the popup or background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "extractContent") {
    extractPageContent()
      .then(content => {
        sendResponse({ success: true, content });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    
    // Return true to indicate we will send a response asynchronously
    return true;
  }
});

/**
 * Extract all relevant content from the current webpage
 */
async function extractPageContent() {
  try {
    // Get the page URL
    const url = window.location.href;
    
    // Extract visible text content
    const textContent = extractVisibleText();
    
    // Extract images with alt text
    const images = extractImages();
    
    // Extract video transcriptions (if videos present)
    const videoTranscriptions = await extractVideoTranscriptions();
    
    return {
      url: url,
      title: document.title,
      textContent: textContent,
      images: images,
      videoTranscriptions: videoTranscriptions,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error("Error extracting content:", error);
    throw new Error("Failed to extract page content");
  }
}

/**
 * Extract visible text from the webpage
 */
function extractVisibleText() {
  // Select all visible text elements
  const visibleElements = Array.from(document.body.querySelectorAll('h1, h2, h3, h4, h5, h6, p, li, span, div, a'))
    .filter(el => {
      // Filter out elements that are not visible
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && 
             style.visibility !== 'hidden' && 
             el.offsetWidth > 0 && 
             el.offsetHeight > 0;
    });
  
  // Extract text content from visible elements
  const textContent = visibleElements
    .map(el => el.textContent.trim())
    .filter(text => text.length > 0)
    .join('\n');
  
  return textContent;
}

/**
 * Extract images and their alt text from the webpage
 */
function extractImages() {
  const imageElements = document.querySelectorAll('img');
  
  return Array.from(imageElements)
    .filter(img => {
      // Filter out tiny images, icons, etc.
      return img.width > 100 && img.height > 100;
    })
    .map(img => {
      return {
        src: img.src,
        alt: img.alt || '',
        width: img.width,
        height: img.height
      };
    });
}

/**
 * Extract transcriptions from video elements on the page
 * Note: This is a placeholder. Real implementation would require 
 * more complex audio extraction and speech-to-text processing.
 */
async function extractVideoTranscriptions() {
  const videoElements = document.querySelectorAll('video');
  
  // For MVP, just identify videos - actual transcription would require
  // a speech-to-text service integration
  return Array.from(videoElements)
    .map(video => {
      return {
        src: video.src || video.querySelector('source')?.src || '',
        type: video.querySelector('source')?.type || '',
        duration: video.duration || 0,
        // In a full implementation, we would transcribe audio
        transcription: "Video transcription placeholder - requires speech-to-text service"
      };
    });
}
