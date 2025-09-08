// Sidebar script for Callosum extension

// DOM Elements
const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const newChatBtn = document.getElementById('new-chat');
const settingsBtn = document.getElementById('settings-btn');
const includePageContext = document.getElementById('include-page-context');
const useSelectionBtn = document.getElementById('use-selection');
const loadingElement = document.getElementById('loading');
const errorElement = document.getElementById('error');

// State
let currentTab = null;
let chatHistory = [];
let abortController = null;
let currentContext = {};

// Initialize the sidebar
async function init() {
  try {
    // Get the current active tab
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    currentTab = tab;
    
    // Load chat history for this origin
    await loadChatHistory();
    
    // Set up event listeners
    setupEventListeners();
    
    // Check if Ollama is reachable
    await checkOllamaStatus();
    
    // Load page context if available
    await updatePageContext();
    
    // Focus the input
    userInput.focus();
  } catch (error) {
    showError('Failed to initialize: ' + error.message);
  }
}

// Set up event listeners
function setupEventListeners() {
  // Chat input
  userInput.addEventListener('input', () => {
    sendBtn.disabled = !userInput.value.trim();
  });
  
  userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!sendBtn.disabled) {
        sendMessage();
      }
    }
  });
  
  sendBtn.addEventListener('click', sendMessage);
  newChatBtn.addEventListener('click', startNewChat);
  settingsBtn.addEventListener('click', openOptionsPage);
  useSelectionBtn.addEventListener('click', useSelectionAsContext);
  
  // Handle messages from background script
  browser.runtime.onMessage.addListener(handleBackgroundMessage);
}

// Load chat history for the current origin
async function loadChatHistory() {
  try {
    const origin = new URL(currentTab.url).origin;
    const { chatHistory: allHistory } = await browser.storage.local.get('chatHistory');
    chatHistory = allHistory?.[origin] || [];
    
    // Render existing messages
    renderChatHistory();
  } catch (error) {
    console.error('Failed to load chat history:', error);
  }
}

// Save chat history for the current origin
async function saveChatHistory() {
  try {
    const origin = new URL(currentTab.url).origin;
    const { chatHistory: allHistory = {} } = await browser.storage.local.get('chatHistory');
    
    await browser.storage.local.set({
      chatHistory: {
        ...allHistory,
        [origin]: chatHistory
      }
    });
  } catch (error) {
    console.error('Failed to save chat history:', error);
  }
}

// Render chat history
function renderChatHistory() {
  chatMessages.innerHTML = '';
  
  chatHistory.forEach(({ role, content }) => {
    addMessage(role, content, false);
  });
  
  scrollToBottom();
}

// Start a new chat
function startNewChat() {
  if (chatHistory.length > 0) {
    if (confirm('Start a new chat? This will clear the current conversation.')) {
      chatHistory = [];
      saveChatHistory();
      chatMessages.innerHTML = '';
      currentContext = {};
      updatePageContext();
    }
  }
}

// Update page context
async function updatePageContext() {
  try {
    if (!includePageContext.checked) {
      currentContext = {};
      return;
    }
    
    const response = await browser.tabs.sendMessage(currentTab.id, { 
      action: 'getPageContext' 
    });
    
    if (response) {
      currentContext = {
        title: currentTab.title,
        url: currentTab.url,
        ...response
      };
    }
  } catch (error) {
    console.error('Failed to get page context:', error);
  }
}

// Use selected text as context
async function useSelectionAsContext() {
  try {
    const response = await browser.tabs.sendMessage(currentTab.id, { 
      action: 'getSelectionText' 
    });
    
    if (response?.text) {
      currentContext.selectedText = response.text;
      addMessage('system', 'Using selected text as context', false);
    } else {
      showError('No text selected');
    }
  } catch (error) {
    console.error('Failed to get selection:', error);
    showError('Failed to get selected text');
  }
}

// Send a message
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
    // Create abort controller for this request
    abortController = new AbortController();
    
    // Get config
    const config = await browser.runtime.sendMessage({ action: 'getConfig' });
    
    // Prepare messages for the API
    const messages = [
      {
        role: 'system',
        content: `You are Callosum, an on-device AI assistant. Be accurate, concise, and cite in-page sections when possible. Never send data to external services. Current page: ${currentTab.title} (${currentTab.url})`
      },
      ...chatHistory.map(({ role, content }) => ({ role, content })),
      { role: 'user', content: message }
    ];
    
    // Call the Ollama API
    const response = await fetch(`${config.endpoint}/api/chat`, {
      method: 'POST',
      signal: abortController.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.model,
        messages: messages,
        stream: true,
        options: {
          temperature: config.temperature,
          num_predict: config.maxTokens
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    // Process the streaming response
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let assistantMessage = '';
    
    // Add assistant message to chat
    const messageId = addMessage('assistant', '', true);
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      // Process each chunk
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter(line => line.trim() !== '');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.substring(6);
          if (data === '[DONE]') continue;
          
          try {
            const parsed = JSON.parse(data);
            if (parsed.message?.content) {
              assistantMessage += parsed.message.content;
              updateMessage(messageId, assistantMessage);
            }
          } catch (e) {
            console.error('Error parsing chunk:', e);
          }
        }
      }
    }
    
    // Save the complete message to history
    chatHistory.push(
      { role: 'user', content: message },
      { role: 'assistant', content: assistantMessage }
    );
    
    // Keep only the last 20 messages (10 exchanges)
    if (chatHistory.length > 20) {
      chatHistory = chatHistory.slice(-20);
    }
    
    // Save to storage
    await saveChatHistory();
    
  } catch (error) {
    if (error.name === 'AbortError') {
      showError('Request was cancelled');
    } else {
      console.error('Error sending message:', error);
      showError('Failed to send message: ' + error.message);
    }
  } finally {
    loadingElement.classList.add('hidden');
    abortController = null;
  }
}

// Handle messages from background script
function handleBackgroundMessage(message, sender, sendResponse) {
  if (message.action === 'updateContext') {
    updatePageContext();
    return true;
  }
  return false;
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
function addMessage(role, content, isStreaming = false) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${role} ${isStreaming ? 'streaming' : ''}`;
  messageDiv.textContent = content;
  
  // Add copy button to assistant messages
  if (role === 'assistant') {
    const copyBtn = document.createElement('button');
    copyBtn.className = 'copy-button';
    copyBtn.title = 'Copy to clipboard';
    copyBtn.textContent = '📋';
    copyBtn.onclick = () => copyToClipboard(content);
    
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'message-actions';
    actionsDiv.appendChild(copyBtn);
    
    messageDiv.appendChild(actionsDiv);
  }
  
  chatMessages.appendChild(messageDiv);
  scrollToBottom();
  
  // Return the message ID for streaming updates
  return messageDiv;
}

function updateMessage(messageElement, content) {
  // Update the message content (first child node)
  if (messageElement.firstChild) {
    messageElement.firstChild.textContent = content;
  } else {
    messageElement.textContent = content;
  }
  
  // If we were streaming, remove the streaming class
  messageElement.classList.remove('streaming');
  
  scrollToBottom();
}

function scrollToBottom() {
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    showTemporaryMessage('Copied to clipboard!');
  } catch (error) {
    console.error('Failed to copy:', error);
    showError('Failed to copy to clipboard');
  }
}

function showError(message) {
  errorElement.textContent = message;
  errorElement.classList.remove('hidden');
  setTimeout(() => errorElement.classList.add('hidden'), 5000);
}

function showTemporaryMessage(message) {
  const tempMessage = document.createElement('div');
  tempMessage.className = 'temporary-message';
  tempMessage.textContent = message;
  document.body.appendChild(tempMessage);
  
  setTimeout(() => {
    tempMessage.classList.add('show');
  }, 10);
  
  setTimeout(() => {
    tempMessage.classList.remove('show');
    setTimeout(() => tempMessage.remove(), 300);
  }, 2000);
}

// Initialize the sidebar when the DOM is loaded
document.addEventListener('DOMContentLoaded', init);
