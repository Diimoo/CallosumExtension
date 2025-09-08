// Context extraction utilities for Callosum extension

// Default configuration
const DEFAULT_CONFIG = {
  maxContextChars: 10000, // Default maximum characters for context
  includePageTitle: true,
  includeUrl: true,
  includeMetaDescription: true,
  includeMainContent: true,
  includeSelection: true
};

/**
 * Extracts context from the current page
 * @param {Object} options - Configuration options
 * @returns {Object} Extracted context
 */
export function extractPageContext(options = {}) {
  const config = { ...DEFAULT_CONFIG, ...options };
  const context = {
    title: '',
    url: window.location.href,
    description: '',
    content: '',
    selection: '',
    timestamp: new Date().toISOString()
  };

  // Extract page title
  if (config.includePageTitle) {
    context.title = document.title;
  }

  // Extract meta description
  if (config.includeMetaDescription) {
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      context.description = metaDescription.content;
    }
  }

  // Extract main content
  if (config.includeMainContent) {
    context.content = extractMainContent();
    
    // Truncate content if it's too long
    if (context.content.length > config.maxContextChars) {
      context.content = context.content.substring(0, config.maxContextChars) + 
                       '... [content truncated]';
    }
  }

  // Extract current selection
  if (config.includeSelection) {
    context.selection = window.getSelection().toString().trim();
  }

  return context;
}

/**
 * Extracts the main content from the page
 * @returns {string} The main content as text
 */
function extractMainContent() {
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
  
  // Clean up the cloned element
  cleanElement(clone);
  
  // Extract text content with some formatting
  let text = clone.textContent
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/\n+/g, '\n') // Replace multiple newlines with single newline
    .trim();
  
  return text;
}

/**
 * Removes unwanted elements from the DOM
 * @param {HTMLElement} element - The element to clean
 */
function cleanElement(element) {
  if (!element) return;
  
  // Elements to remove
  const elementsToRemove = [
    'script', 'style', 'noscript', 'link', 'meta', 'svg', 'img', 'picture',
    'iframe', 'video', 'audio', 'canvas', 'figure', 'nav', 'header', 'footer',
    'aside', 'form', 'button', 'input', 'select', 'textarea', 'label',
    '.ad', '.advertisement', '.ads', '.ad-container', '.ad-wrapper',
    '.sidebar', '.related-posts', '.related-articles', '.related-content',
    '.comments', '.comment-section', '.social-share', '.sharing',
    '.newsletter', '.newsletter-signup', '.newsletter-form',
    '.modal', '.popup', '.lightbox', '.cookie-banner', '.cookie-consent',
    '.privacy-banner', '.gdpr-banner', '.cc_banner', '.cc-window',
    '.notification', '.alert', '.banner', '.promo', '.promotion',
    '.recommendations', '.trending', '.popular', '.most-read',
    '.pagination', '.pager', '.page-nav', '.pagination-container',
    '.breadcrumbs', '.breadcrumb', '.navigation', '.nav-links',
    '.menu', '.main-menu', '.submenu', '.footer-menu',
    '.hidden', '.sr-only', '.visually-hidden', '.d-none', '.is-hidden'
  ];
  
  // Remove elements by selector
  elementsToRemove.forEach(selector => {
    const elements = element.querySelectorAll(selector);
    elements.forEach(el => el.remove());
  });
  
  // Remove elements by class that match patterns
  const allElements = element.getElementsByTagName('*');
  for (let el of allElements) {
    // Remove elements with classes that contain 'ad', 'banner', 'popup', etc.
    const classNames = el.className ? el.className.toLowerCase() : '';
    if (
      classNames.includes('ad-') ||
      classNames.includes('banner') ||
      classNames.includes('popup') ||
      classNames.includes('modal') ||
      classNames.includes('cookie') ||
      classNames.includes('gdpr') ||
      classNames.includes('privacy') ||
      classNames.includes('consent') ||
      classNames.includes('newsletter') ||
      classNames.includes('promo')
    ) {
      el.remove();
    }
  }
  
  // Remove inline styles and event handlers
  element.removeAttribute('style');
  const allWithAttributes = element.querySelectorAll('*');
  allWithAttributes.forEach(el => {
    // Remove all attributes that start with 'on' (event handlers)
    for (let i = el.attributes.length - 1; i >= 0; i--) {
      const attr = el.attributes[i];
      if (attr.name.startsWith('on') || attr.name === 'style') {
        el.removeAttribute(attr.name);
      }
    }
  });
}

/**
 * Extracts the current text selection
 * @returns {string} The selected text
 */
export function getSelectedText() {
  return window.getSelection().toString().trim();
}

/**
 * Gets the text content of an element
 * @param {HTMLElement} element - The element to get text from
 * @returns {string} The text content
 */
export function getElementText(element) {
  if (!element) return '';
  return element.textContent.replace(/\s+/g, ' ').trim();
}

/**
 * Gets the main content element of the page
 * @returns {HTMLElement|null} The main content element or null if not found
 */
export function getMainContentElement() {
  const selectors = [
    'main',
    'article',
    '.main-content',
    '.article',
    '.post',
    '#content',
    '#main',
    'body'
  ];
  
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) return element;
  }
  
  return null;
}

/**
 * Gets the focused input element
 * @returns {HTMLElement|null} The focused input element or null if none is focused
 */
export function getFocusedInput() {
  const activeElement = document.activeElement;
  
  if (!activeElement) return null;
  
  // Check if the active element is an input field
  const inputTypes = [
    'input', 'textarea', '[contenteditable="true"]',
    '[role="textbox"]', '[role="searchbox"]'
  ];
  
  for (const type of inputTypes) {
    if (activeElement.matches(type)) {
      return activeElement;
    }
  }
  
  return null;
}

/**
 * Inserts text at the cursor position in the focused element
 * @param {string} text - The text to insert
 * @returns {boolean} True if successful, false otherwise
 */
export function insertTextAtCursor(text) {
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
              ['text', 'email', 'search', 'url', 'tel'].includes(activeElement.type))) {
      
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

/**
 * Gets the context around a specific element
 * @param {HTMLElement} element - The element to get context for
 * @param {number} numWords - Number of words to include before and after
 * @returns {string} The context around the element
 */
export function getElementContext(element, numWords = 50) {
  if (!element) return '';
  
  const text = element.textContent || '';
  const words = text.split(/\s+/);
  
  // Find the position of the element in the text
  const elementText = element.textContent || '';
  const elementWords = elementText.split(/\s+/);
  const startIndex = words.findIndex((word, index) => {
    return words.slice(index, index + elementWords.length).join(' ') === elementWords.join(' ');
  });
  
  if (startIndex === -1) return '';
  
  // Get context words before and after
  const start = Math.max(0, startIndex - numWords);
  const end = Math.min(words.length, startIndex + elementWords.length + numWords);
  
  return words.slice(start, end).join(' ');
}

// Export default for backward compatibility
export default {
  extractPageContext,
  getSelectedText,
  getElementText,
  getMainContentElement,
  getFocusedInput,
  insertTextAtCursor,
  getElementContext
};
