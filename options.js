// Options page script for Callosum extension

// DOM Elements
const endpointInput = document.getElementById('endpoint');
const modelInput = document.getElementById('model');
const timeoutInput = document.getElementById('timeout');
const temperatureInput = document.getElementById('temperature');
const temperatureDisplay = document.getElementById('temperature-display');
const maxTokensInput = document.getElementById('max-tokens');
const maxTokensDisplay = document.getElementById('max-tokens-display');
const maxContextInput = document.getElementById('max-context');
const maxContextDisplay = document.getElementById('max-context-display');
const autoOpenSidebarCheckbox = document.getElementById('auto-open-sidebar');
const includePageContextCheckbox = document.getElementById('include-page-context');
const enableNotificationsCheckbox = document.getElementById('enable-notifications');
const saveButton = document.getElementById('save-btn');
const resetButton = document.getElementById('reset-btn');
const statusMessage = document.getElementById('status-message');
const connectionStatus = document.getElementById('connection-status');

// Default configuration
const DEFAULT_CONFIG = {
  endpoint: 'http://127.0.0.1:11434',
  model: 'mistral',
  temperature: 0.7,
  maxTokens: 1000,
  maxContextChars: 10000,
  timeout: 30000,
  autoOpenSidebar: true,
  includePageContext: true,
  enableNotifications: true
};

// Load saved settings
async function loadSettings() {
  try {
    // Get saved settings or use defaults
    const savedConfig = await browser.storage.local.get('config');
    const config = { ...DEFAULT_CONFIG, ...savedConfig.config };
    
    // Update form fields
    endpointInput.value = config.endpoint || '';
    modelInput.value = config.model || '';
    timeoutInput.value = (config.timeout / 1000) || 30; // Convert ms to seconds
    
    temperatureInput.value = config.temperature || 0.7;
    temperatureDisplay.textContent = config.temperature || 0.7;
    
    maxTokensInput.value = config.maxTokens || 1000;
    maxTokensDisplay.textContent = config.maxTokens || 1000;
    
    maxContextInput.value = config.maxContextChars || 10000;
    maxContextDisplay.textContent = config.maxContextChars || 10000;
    
    autoOpenSidebarCheckbox.checked = config.autoOpenSidebar !== false; // Default to true
    includePageContextCheckbox.checked = config.includePageContext !== false; // Default to true
    enableNotificationsCheckbox.checked = config.enableNotifications !== false; // Default to true
    
    // Check connection status
    checkConnection(config);
    
    return config;
  } catch (error) {
    console.error('Error loading settings:', error);
    showStatus('Error loading settings', 'error');
    return null;
  }
}

// Save settings
async function saveSettings() {
  try {
    const config = {
      endpoint: endpointInput.value.trim(),
      model: modelInput.value.trim(),
      temperature: parseFloat(temperatureInput.value),
      maxTokens: parseInt(maxTokensInput.value, 10),
      maxContextChars: parseInt(maxContextInput.value, 10),
      timeout: parseInt(timeoutInput.value, 10) * 1000, // Convert to ms
      autoOpenSidebar: autoOpenSidebarCheckbox.checked,
      includePageContext: includePageContextCheckbox.checked,
      enableNotifications: enableNotificationsCheckbox.checked
    };
    
    // Validate required fields
    if (!config.endpoint) {
      showStatus('Ollama server URL is required', 'error');
      return;
    }
    
    if (!config.model) {
      showStatus('Default model is required', 'error');
      return;
    }
    
    // Save to storage
    await browser.storage.local.set({ config });
    
    // Show success message
    showStatus('Settings saved successfully!', 'success');
    
    // Check connection with new settings
    checkConnection(config);
    
    return true;
  } catch (error) {
    console.error('Error saving settings:', error);
    showStatus('Error saving settings', 'error');
    return false;
  }
}

// Reset settings to defaults
async function resetSettings() {
  if (confirm('Are you sure you want to reset all settings to their default values?')) {
    try {
      // Clear saved settings
      await browser.storage.local.remove('config');
      
      // Reload the page to update the form
      window.location.reload();
    } catch (error) {
      console.error('Error resetting settings:', error);
      showStatus('Error resetting settings', 'error');
    }
  }
}

// Check connection to Ollama server
async function checkConnection(config = null) {
  try {
    const settings = config || await loadSettings();
    if (!settings) return;
    
    connectionStatus.textContent = 'Connecting...';
    connectionStatus.style.color = '#6c757d';
    
    const response = await fetch(`${settings.endpoint}/api/tags`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });
    
    if (response.ok) {
      const data = await response.json();
      const models = data.models || [];
      const hasModel = models.some(m => m.name.includes(settings.model));
      
      if (hasModel) {
        connectionStatus.textContent = `Connected (${settings.model} available)`;
        connectionStatus.style.color = '#28a745';
      } else {
        connectionStatus.textContent = `Connected (${settings.model} not found)`;
        connectionStatus.style.color = '#ffc107';
      }
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (error) {
    console.error('Connection check failed:', error);
    connectionStatus.textContent = 'Connection failed';
    connectionStatus.style.color = '#dc3545';
  }
}

// Show status message
function showStatus(message, type = 'info') {
  statusMessage.textContent = message;
  statusMessage.className = 'status';
  statusMessage.classList.add(type);
  statusMessage.style.display = 'block';
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    statusMessage.style.display = 'none';
  }, 5000);
}

// Event Listeners
function setupEventListeners() {
  // Save button
  saveButton.addEventListener('click', saveSettings);
  
  // Reset button
  resetButton.addEventListener('click', resetSettings);
  
  // Temperature slider
  temperatureInput.addEventListener('input', (e) => {
    temperatureDisplay.textContent = e.target.value;
  });
  
  // Max tokens slider
  maxTokensInput.addEventListener('input', (e) => {
    maxTokensDisplay.textContent = e.target.value;
  });
  
  // Max context slider
  maxContextInput.addEventListener('input', (e) => {
    maxContextDisplay.textContent = e.target.value;
  });
  
  // Test connection when endpoint changes
  let debounceTimer;
  endpointInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const config = {
        endpoint: endpointInput.value.trim(),
        model: modelInput.value.trim() || 'mistral'
      };
      if (config.endpoint) {
        checkConnection(config);
      }
    }, 1000);
  });
  
  // Test connection when model changes
  modelInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const config = {
        endpoint: endpointInput.value.trim() || 'http://127.0.0.1:11434',
        model: modelInput.value.trim()
      };
      if (config.model && config.endpoint) {
        checkConnection(config);
      }
    }, 1000);
  });
}

// Initialize the options page
async function init() {
  await loadSettings();
  setupEventListeners();
}

// Start the options page
document.addEventListener('DOMContentLoaded', init);
