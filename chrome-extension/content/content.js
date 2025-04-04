// Listen for messages from the popup or background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "scrapeContent") {
    const content = scrapePageContent();
    sendResponse({
      success: true,
      title: content.title,
      content: content.content
    });
    return true;
  }
  
  if (message.action === "saveSelection") {
    const data = {
      url: window.location.href,
      title: document.title,
      content: getMetaDescription(),
      selection: message.selection,
      metadata: getMetadata()
    };
    
    chrome.runtime.sendMessage({
      action: "saveWebContent",
      data: data
    });
  }
  
  if (message.action === "savePage") {
    const data = {
      url: window.location.href,
      title: document.title,
      content: scrapePageContent().content,
      metadata: getMetadata()
    };
    
    chrome.runtime.sendMessage({
      action: "saveWebContent",
      data: data
    });
  }
});

// Helper function to scrape page content
function scrapePageContent() {
  // This is a basic implementation. You might want to enhance this
  // with better content extraction logic or use a library
  
  // Get the main content
  let content = "";
  
  try {
    // Try to find the main article element
    const articleElement = document.querySelector('article') || 
                          document.querySelector('.main-content') || 
                          document.querySelector('main');
    
    if (articleElement) {
      content = articleElement.innerText;
    } else {
      // Fallback to body text with some cleaning
      content = document.body.innerText;
      
      // Remove common noise elements
      const noiseSelectors = [
        'header', 'footer', 'nav', 'aside', 
        '.comment', '.comments', '.advertisement',
        '.ads', '.sidebar', '.menu', '.navigation'
      ];
      
      const noiseElements = document.querySelectorAll(noiseSelectors.join(', '));
      let noiseText = "";
      
      noiseElements.forEach(el => {
        noiseText += el.innerText + " ";
      });
      
      // Remove noise text from content
      if (noiseText) {
        content = content.replace(noiseText, "");
      }
    }

    // Check if content is empty
    if (!content.trim()) {
      // Try using getArticleContent as a fallback
      content = getArticleContent() || getAllVisibleText();
    }
    
    return {
      title: document.title,
      content: content.trim()
    };
    
  } catch (error) {
    console.error("Error scraping page content:", error);
    // Return minimal content even if there's an error
    return {
      title: document.title,
      content: document.body.innerText.substring(0, 5000).trim() || "Could not extract content"
    };
  }
}

// Helper function to get metadata from the page
function getMetadata() {
  const metadata = {};
  
  // Extract Open Graph metadata
  document.querySelectorAll('meta[property^="og:"]').forEach(meta => {
    const property = meta.getAttribute('property').replace('og:', '');
    metadata[property] = meta.getAttribute('content');
  });
  
  // Extract Dublin Core metadata
  document.querySelectorAll('meta[name^="DC."]').forEach(meta => {
    const name = meta.getAttribute('name').replace('DC.', '');
    metadata[name] = meta.getAttribute('content');
  });
  
  // Add author if available
  const author = document.querySelector('meta[name="author"]');
  if (author) {
    metadata.author = author.getAttribute('content');
  }
  
  // Add published date if available
  const published = document.querySelector('meta[property="article:published_time"]');
  if (published) {
    metadata.publishedDate = published.getAttribute('content');
  }
  
  return metadata;
}

// Helper function to get meta description
function getMetaDescription() {
  const metaDesc = document.querySelector('meta[name="description"]');
  return metaDesc ? metaDesc.getAttribute('content') : '';
}

// Extract content from article-like pages
function getArticleContent() {
  // Try to find the main content by common selectors
  const selectors = [
    'article', 
    '[role="main"]', 
    '.post-content', 
    '.article-content',
    '.content-body',
    'main',
    '#content'
  ];
  
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      return element.textContent.trim();
    }
  }
  
  // Special handling for video pages (YouTube, etc.)
  if (window.location.hostname.includes('youtube.com')) {
    const title = document.querySelector('h1.title')?.textContent || '';
    const description = document.querySelector('#description-text')?.textContent || '';
    return `${title}\n\n${description}`;
  }
  
  return null;
}

// Get all visible text as fallback
function getAllVisibleText() {
  // Skip script, style, and hidden elements
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: function(node) {
        const element = node.parentElement;
        const style = window.getComputedStyle(element);
        
        if (
          element.tagName === 'SCRIPT' || 
          element.tagName === 'STYLE' || 
          element.tagName === 'NOSCRIPT' ||
          style.display === 'none' ||
          style.visibility === 'hidden' ||
          style.opacity === '0'
        ) {
          return NodeFilter.FILTER_REJECT;
        }
        
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );
  
  let text = '';
  let node;
  while (node = walker.nextNode()) {
    text += node.textContent.trim() + ' ';
  }
  
  return text.trim();
}

// Add error handling for DOM operations
function safeDOMInteraction() {
  try {
    // Existing content script logic...
    chrome.runtime.sendMessage({type: 'data_captured', data: processedData});
  } catch (error) {
    console.error('Content script error:', error);
    chrome.runtime.sendMessage({type: 'error', error: error.message});
  }
}

// Add debounce for frequent events
const debouncedHandler = _.debounce(eventHandler, 300);
document.addEventListener('scroll', debouncedHandler); 