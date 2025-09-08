// Popup script for Callosum extension

// DOM Elements
const summarizeBtn = document.getElementById('summarize-btn');
const askBtn = document.getElementById('ask-btn');
const rewriteBtn = document.getElementById('rewrite-btn');
const draftBtn = document.getElementById('draft-btn');
const settingsBtn = document.getElementById('settings-btn');
const chatContainer = document.querySelector('.chat-container');
const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const loadingElement = document.getElementById('loading');
const errorElement = document.getElementById('error');

// State
let currentTab = null;
let currentAction = null;
let abortController = null;

// Initialize the popup
async function init() {
  try {
    // Get the current active tab
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    currentTab = tab;
    
    // Set up event listeners
    setupEventListeners();
    
    // Check if Ollama is reachable
    await checkOllamaStatus();
  } catch (error) {
    showError('Failed to initialize: ' + error.message);
  }
}

// Set up event listeners
function setupEventListeners() {
  // Action buttons
  summarizeBtn.addEventListener('click', () => handleAction('summarize'));
  askBtn.addEventListener('click', () => handleAction('ask'));
  rewriteBtn.addEventListener('click', () => handleAction('rewrite'));
  draftBtn.addEventListener('click', () => handleAction('draft'));
  
  // Settings button
  settingsBtn.addEventListener('click', openOptionsPage);
  
  // Chat input
  userInput.addEventListener('input', () => {
    sendBtn.disabled = !userInput.value.trim();
  });
  
  userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (sendBtn.disabled) return;
      sendMessage();
    }
  });
  
  sendBtn.addEventListener('click', sendMessage);
}

// Handle action button clicks
async function handleAction(action) {
  try {
    currentAction = action;
    
    switch (action) {
      case 'summarize':
        await summarizePage();
        break;
      case 'ask':
        showChatInterface();
        break;
      case 'rewrite':
        await rewriteSelection();
        break;
      case 'draft':
        await draftReply();
        break;
    }
  } catch (error) {
    showError('Action failed: ' + error.message);
  }
}

// Show chat interface
function showChatInterface() {
  // Hide quick actions and show chat
  document.querySelector('.quick-actions').classList.add('hidden');
  chatContainer.classList.remove('hidden');
  userInput.focus();
  
  // Add a welcome message
  addMessage('assistant', 'Hi! I\'m Callosum. Ask me anything about this page.');
}

// Send a message in chat
async function sendMessage() {
  const message = userInput.value.trim();
  if (!message) return;
  
  // Add user message to chat
  addMessage('user', message);
  userInput.value = '';
  sendBtn.disabled = true;
  
  // Show loading indicator
  loadingElement.classList.remove('hidden');
  
  try {
    // Get page context
    const pageContext = await browser.tabs.sendMessage(currentTab.id, { 
      action: 'getPageContext' 
    });
    
    // Call background script to process the message
    const response = await browser.runtime.sendMessage({
      action: 'processChatMessage',
      message,
      context: {
        title: currentTab.title,
        url: currentTab.url,
        ...pageContext
      }
    });
    
    // Add assistant's response to chat
    if (response && response.success) {
      addMessage('assistant', response.reply);
    } else {
      throw new Error(response?.error || 'Failed to get response');
    }
  } catch (error) {
    showError('Failed to send message: ' + error.message);
  } finally {
    loadingElement.classList.add('hidden');
  }
}

// Summarize the current page
async function summarizePage() {
  try {
    showLoading('Summarizing page...');
    
    const response = await browser.runtime.sendMessage({
      action: 'summarizePage',
      tabId: currentTab.id
    });
    
    if (response && response.success) {
      showResult('Summary', response.summary);
    } else {
      throw new Error(response?.error || 'Failed to summarize page');
    }
  } catch (error) {
    showError('Failed to summarize page: ' + error.message);
  } finally {
    hideLoading();
  }
}

// Rewrite selected text
async function rewriteSelection() {
  try {
    showLoading('Rewriting selection...');
    
    const response = await browser.tabs.sendMessage(currentTab.id, { 
      action: 'getSelectionText' 
    });
    
    if (response && response.text) {
      // TODO: Implement rewrite with Ollama
      const rewritten = `Rewritten text for: "${response.text.substring(0, 50)}..."`;
      showResult('Rewritten Text', rewritten);
    } else {
      throw new Error('No text selected');
    }
  } catch (error) {
    showError('Failed to rewrite selection: ' + error.message);
  } finally {
    hideLoading();
  }
}

// Draft a reply
async function draftReply() {
  try {
    showLoading('Drafting reply...');
    
    const response = await browser.runtime.sendMessage({
      action: 'draftReply',
      tabId: currentTab.id
    });
    
    if (response && response.success) {
      showResult('Draft Reply', response.draft);
    } else {
      throw new Error(response?.error || 'Failed to draft reply');
    }
  } catch (error) {
    showError('Failed to draft reply: ' + error.message);
  } finally {
    hideLoading();
  }
}

// Check if Ollama is reachable
async function checkOllamaStatus() {
  try {
    const config = await browser.runtime.sendMessage({ action: 'getConfig' });
    const response = await fetch(`${config.endpoint}/api/tags`);
    
    if (!response.ok) {
      throw new Error('Ollama endpoint not reachable');
    }
  } catch (error) {
    showError('Cannot connect to Ollama. Please make sure it\'s running at ' + 
             (await browser.runtime.sendMessage({ action: 'getConfig' })).endpoint);
  }
}

// Open options page
function openOptionsPage() {
  browser.runtime.openOptionsPage();
}

// UI Helper functions
function addMessage(role, content) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${role}`;
  messageDiv.textContent = content;
  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function showLoading(message) {
  loadingElement.textContent = message;
  loadingElement.classList.remove('hidden');
}

function hideLoading() {
  loadingElement.classList.add('hidden');
}

function showError(message) {
  errorElement.textContent = message;
  errorElement.classList.remove('hidden');
  setTimeout(() => errorElement.classList.add('hidden'), 5000);
}

function showResult(title, content) {
  const resultDiv = document.createElement('div');
  resultDiv.className = 'result';
  resultDiv.innerHTML = `
    <h3>${title}</h3>
    <div class="result-content">${content}</div>
  `;
  
  // Clear previous results
  const existingResults = document.querySelectorAll('.result');
  existingResults.forEach(el => el.remove());
  
  // Insert after the header
  const header = document.querySelector('header');
  header.insertAdjacentElement('afterend', resultDiv);
}

// Initialize the popup when the DOM is loaded
document.addEventListener('DOMContentLoaded', init);
