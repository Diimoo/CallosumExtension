// Content script for Callosum extension

// Listen for messages from the background script
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getPageContext') {
    // Get the page context
    const context = getPageContext();
    sendResponse(context);
    return true; // Required for async response
  } else if (request.action === 'getSelectionText') {
    // Get the current selection
    const selection = window.getSelection().toString().trim();
    sendResponse({ text: selection });
    return true;
  }
  
  // Add more message handlers as needed
  return false;
});

// Extract relevant context from the current page
function getPageContext() {
  // Basic page information
  const context = {
    title: document.title,
    url: window.location.href,
    description: getMetaDescription(),
    textContent: getMainContent(),
    selectedText: window.getSelection().toString().trim(),
    timestamp: new Date().toISOString()
  };
  
  return context;
}

// Get the meta description if available
function getMetaDescription() {
  const metaDescription = document.querySelector('meta[name="description"]');
  return metaDescription ? metaDescription.content : '';
}

// Extract the main content of the page
function getMainContent() {
  // Try to find the main content using common selectors
  const selectors = [
    'main',
    'article',
    '.main-content',
    '.article',
    '.post',
    '#content',
    '#main',
    'body' // Fallback to body if nothing else is found
  ];
  
  // Find the first matching element
  let contentElement = null;
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      contentElement = element;
      break;
    }
  }
  
  if (!contentElement) {
    return '';
  }
  
  // Clone the element to avoid modifying the original
  const clone = contentElement.cloneNode(true);
  
  // Remove unwanted elements
  const elementsToRemove = [
    'script', 'style', 'nav', 'header', 'footer', 
    'aside', 'form', 'iframe', 'button', '.ad', 
    '.advertisement', '.sidebar', '.comments',
    '.social-share', '.related-posts', '.newsletter'
  ];
  
  elementsToRemove.forEach(selector => {
    const elements = clone.querySelectorAll(selector);
    elements.forEach(el => el.remove());
  });
  
  // Extract text content with some formatting
  let text = clone.textContent
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim();
  
  // Truncate if too long (to avoid hitting token limits)
  const MAX_LENGTH = 20000; // Conservative limit
  if (text.length > MAX_LENGTH) {
    text = text.substring(0, MAX_LENGTH) + '... [content truncated]';
  }
  
  return text;
}

// Listen for selection changes to update context
let lastSelection = '';
let selectionTimer = null;

document.addEventListener('selectionchange', () => {
  const selection = window.getSelection().toString().trim();
  
  // Only notify if the selection has actually changed
  if (selection !== lastSelection && selection.length > 0) {
    lastSelection = selection;
    
    // Debounce to avoid too many messages
    if (selectionTimer) {
      clearTimeout(selectionTimer);
    }
    
    selectionTimer = setTimeout(() => {
      // Notify the background script about the selection
      browser.runtime.sendMessage({
        action: 'selectionChanged',
        selection: selection,
        url: window.location.href
      }).catch(error => {
        // Ignore errors (e.g., when the background script is not ready)
        console.debug('Could not send selection update:', error);
      });
    }, 300);
  }
});

// Listen for clicks to detect form inputs for the draft reply feature
document.addEventListener('click', (event) => {
  const target = event.target;
  
  // Check if the clicked element is a text input, textarea, or contenteditable
  const isTextInput = target.matches('input[type="text"], textarea, [contenteditable="true"]');
  
  if (isTextInput) {
    // Notify the background script about the focused input
    browser.runtime.sendMessage({
      action: 'inputFocused',
      elementType: target.tagName.toLowerCase(),
      isContentEditable: target.isContentEditable
    }).catch(error => {
      console.debug('Could not send input focus update:', error);
    });
  }
});

// Listen for messages to insert text (e.g., for draft replies)
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'insertText' && request.text) {
    const success = insertTextAtCursor(request.text);
    sendResponse({ success });
    return true;
  }
  return false;
});

// Helper function to insert text at the cursor position
function insertTextAtCursor(text) {
  const activeElement = document.activeElement;
  
  if (!activeElement) {
    return false;
  }
  
  try {
    // For contenteditable elements
    if (activeElement.isContentEditable) {
      const selection = window.getSelection();
      
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        
        // Create a text node and insert it
        const textNode = document.createTextNode(text);
        range.insertNode(textNode);
        
        // Move the cursor to the end of the inserted text
        range.setStartAfter(textNode);
        range.setEndAfter(textNode);
        selection.removeAllRanges();
        selection.addRange(range);
        
        // Trigger input event for frameworks that rely on it
        const event = new Event('input', { bubbles: true });
        activeElement.dispatchEvent(event);
        
        return true;
      }
    }
    // For textareas and text inputs
    else if (activeElement.tagName === 'TEXTAREA' || 
             (activeElement.tagName === 'INPUT' && 
              ['text', 'email', 'search', 'url'].includes(activeElement.type))) {
      
      const startPos = activeElement.selectionStart;
      const endPos = activeElement.selectionEnd;
      const currentValue = activeElement.value;
      
      // Insert the text at the cursor position
      activeElement.value = 
        currentValue.substring(0, startPos) + 
        text + 
        currentValue.substring(endPos);
      
      // Move the cursor to the end of the inserted text
      const newPos = startPos + text.length;
      activeElement.selectionStart = activeElement.selectionEnd = newPos;
      
      // Trigger input event for frameworks that rely on it
      const event = new Event('input', { bubbles: true });
      activeElement.dispatchEvent(event);
      
      return true;
    }
  } catch (error) {
    console.error('Error inserting text:', error);
  }
  
  return false;
}

console.log('Callosum content script loaded');
