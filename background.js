// Background service worker for Callosum extension
import ollama from './lib/ollama.js';

// Default configuration
const DEFAULT_CONFIG = {
  endpoint: 'http://127.0.0.1:11434',
  model: 'mistral',
  temperature: 0.7,
  maxTokens: 1000,
  autoOpenSidebar: true,
  includePageContext: true,
  maxContextChars: 10000
};

// Initialize storage with default values
async function initStorage() {
  const result = await browser.storage.local.get(null);
  if (!result.config) {
    await browser.storage.local.set({ config: DEFAULT_CONFIG });
  }
  if (!result.chatHistory) {
    await browser.storage.local.set({ chatHistory: {} });
  }
}

// Get current configuration
async function getConfig() {
  const { config } = await browser.storage.local.get('config');
  return { ...DEFAULT_CONFIG, ...config };
}

// Save configuration
async function saveConfig(newConfig) {
  const currentConfig = await getConfig();
  await browser.storage.local.set({
    config: { ...currentConfig, ...newConfig }
  });
}

// Context menu items
function setupContextMenus() {
  browser.contextMenus.removeAll();
  
  // Parent menu for all text actions
  browser.contextMenus.create({
    id: 'callosum-menu',
    title: 'Callosum',
    contexts: ['selection']
  });
  
  // Submenu items
  browser.contextMenus.create({
    id: 'summarize-selection',
    parentId: 'callosum-menu',
    title: 'Summarize Selection',
    contexts: ['selection']
  });
  
  browser.contextMenus.create({
    id: 'explain-selection',
    parentId: 'callosum-menu',
    title: 'Explain Selection',
    contexts: ['selection']
  });
  
  browser.contextMenus.create({
    id: 'rewrite-selection',
    parentId: 'callosum-menu',
    title: 'Rewrite Selection...',
    contexts: ['selection']
  });
}

// Handle context menu clicks
async function handleContextMenuClick(info, tab) {
  const { menuItemId } = info;
  const { selectionText } = info;
  
  if (!selectionText) return;
  
  const config = await getConfig();
  
  switch (menuItemId) {
    case 'summarize-selection':
      await summarizeText(selectionText, tab.id, config);
      break;
    case 'explain-selection':
      await explainText(selectionText, tab.id, config);
      break;
    case 'rewrite-selection':
      await rewriteText(selectionText, tab.id, config);
      break;
  }
}

// Handle messages from content scripts and popup
function handleMessage(message, sender, sendResponse) {
  if (message.action === 'getConfig') {
    return getConfig();
  } else if (message.action === 'saveConfig') {
    return saveConfig(message.config);
  } else if (message.action === 'summarizePage') {
    const targetTabId = message.tabId || sender.tab?.id;
    return handleSummarizePage(targetTabId);
  } else if (message.action === 'draftReply') {
    const targetTabId = message.tabId || sender.tab?.id;
    return handleDraftReply(targetTabId);
  } else if (message.action === 'processChatMessage') {
    return handleProcessChatMessage(message, sender.tab?.id);
  }
  
  return Promise.resolve({ success: false, error: 'Unknown action' });
}

// Handle page summarization
async function handleSummarizePage(tabId) {
  try {
    // Ask the content script for page context instead of injecting a module
    const pageContext = await browser.tabs.sendMessage(tabId, { action: 'getPageContext' });
    if (pageContext && pageContext.textContent) {
      const config = await getConfig();
      return summarizeText(pageContext.textContent, tabId, config);
    }
    return { success: false, error: 'No page context available' };
  } catch (error) {
    console.error('Error summarizing page:', error);
    return { success: false, error: error.message };
  }
}

// Handle draft reply
async function handleDraftReply(tabId) {
  try {
    const [result] = await browser.scripting.executeScript({
      target: { tabId },
      function: () => {
        const activeElement = document.activeElement;
        if (activeElement && (activeElement.tagName === 'TEXTAREA' || 
            activeElement.isContentEditable || 
            activeElement.getAttribute('role') === 'textbox')) {
          return { hasInput: true };
        }
        return { hasInput: false };
      }
    });
    
    if (result && result.hasInput) {
      const pageContent = await browser.tabs.sendMessage(tabId, { action: 'getPageContext' });
      // TODO: Implement draft generation with Ollama
      return { success: true, draft: "Generated draft reply will appear here." };
    } else {
      return { success: false, error: 'No input field focused' };
    }
  } catch (error) {
    console.error('Error generating draft reply:', error);
    return { success: false, error: error.message };
  }
}

// Helper functions for different actions
async function summarizeText(text, tabId, config) {
  try {
    // Ensure ollama uses current config
    ollama.updateConfig({
      endpoint: config.endpoint,
      model: config.model,
      temperature: config.temperature,
      maxTokens: config.maxTokens
    });
    const prompt = `Summarize the following content concisely in 5-8 bullet points.\n\nCONTENT:\n${text}`;
    const response = await ollama.generate(prompt);
    return { success: true, summary: response };
  } catch (error) {
    console.error('summarizeText error:', error);
    return { success: false, error: error.message };
  }
}

async function explainText(text, tabId, config) {
  try {
    ollama.updateConfig({
      endpoint: config.endpoint,
      model: config.model,
      temperature: config.temperature,
      maxTokens: config.maxTokens
    });
    const prompt = `Explain the following text clearly and briefly, with key points and definitions where helpful.\n\nTEXT:\n${text}`;
    const response = await ollama.generate(prompt);
    return { success: true, explanation: response };
  } catch (error) {
    console.error('explainText error:', error);
    return { success: false, error: error.message };
  }
}

async function rewriteText(text, tabId, config) {
  try {
    ollama.updateConfig({
      endpoint: config.endpoint,
      model: config.model,
      temperature: config.temperature,
      maxTokens: config.maxTokens
    });
    const prompt = `Rewrite the following text to improve clarity and tone while preserving meaning. Return only the rewritten text.\n\nTEXT:\n${text}`;
    const response = await ollama.generate(prompt);
    return { success: true, rewritten: response };
  } catch (error) {
    console.error('rewriteText error:', error);
    return { success: false, error: error.message };
  }
}

// Handle chat messages from popup/sidebar using Ollama chat API
async function handleProcessChatMessage(message, tabId) {
  try {
    const config = await getConfig();
    // Build messages array; ensure system prompt present
    const messages = [];
    messages.push({
      role: 'system',
      content: 'You are Callosum, an on-device AI assistant. Be accurate, concise, and cite in-page sections when possible. Never send data to external services.'
    });
    if (message.context) {
      messages.push({ role: 'system', content: `Page context: ${JSON.stringify({ title: message.context.title, url: message.context.url })}` });
    }
    // Include user message last
    messages.push({ role: 'user', content: message.message });

    // Configure ollama instance for this request
    ollama.updateConfig({
      endpoint: config.endpoint,
      model: config.model,
      temperature: config.temperature,
      maxTokens: config.maxTokens
    });

    const reply = await ollama.chat(messages);
    return { success: true, reply };
  } catch (error) {
    console.error('handleProcessChatMessage error:', error);
    return { success: false, error: error.message };
  }
}

// Initialize the extension
async function init() {
  await initStorage();
  setupContextMenus();
  
  // Set up event listeners
  browser.contextMenus.onClicked.addListener(handleContextMenuClick);
  browser.runtime.onMessage.addListener(handleMessage);
  
  console.log('Callosum extension initialized');
}

// Start the extension
init().catch(console.error);
