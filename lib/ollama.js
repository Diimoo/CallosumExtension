// Ollama API wrapper for Callosum extension

// Default configuration
const DEFAULT_CONFIG = {
  endpoint: 'http://127.0.0.1:11434',
  model: 'mistral',
  temperature: 0.7,
  maxTokens: 1000,
  timeout: 30000 // 30 seconds
};

class OllamaAPI {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.abortController = null;
  }

  // Update configuration
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }

  // Check if the Ollama server is reachable
  async checkConnection() {
    try {
      const response = await this._fetchWithTimeout(`${this.config.endpoint}/api/tags`);
      return response.ok;
    } catch (error) {
      console.error('Ollama connection check failed:', error);
      return false;
    }
  }

  // Generate text completion
  async generate(prompt, options = {}) {
    const { onToken, signal } = options;
    const { endpoint, model, temperature, maxTokens } = this.config;
    
    // Create a new AbortController if one isn't provided
    const controller = signal ? null : new AbortController();
    this.abortController = controller;
    
    try {
      const response = await this._fetchWithTimeout(
        `${endpoint}/api/generate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model,
            prompt,
            stream: true,
            options: {
              temperature,
              num_predict: maxTokens
            }
          }),
          signal: controller?.signal || signal
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `API request failed with status ${response.status}`);
      }

      // Process the streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim() !== '');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.substring(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.response) {
                fullResponse += parsed.response;
                if (onToken) {
                  onToken(parsed.response);
                }
              }
            } catch (e) {
              console.error('Error parsing chunk:', e);
            }
          }
        }
      }

      return fullResponse;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Request was cancelled');
      }
      throw error;
    } finally {
      if (controller) {
        this.abortController = null;
      }
    }
  }

  // Chat completion with context
  async chat(messages, options = {}) {
    const { onToken, signal } = options;
    const { endpoint, model, temperature, maxTokens } = this.config;
    
    // Create a new AbortController if one isn't provided
    const controller = signal ? null : new AbortController();
    this.abortController = controller;
    
    try {
      const response = await this._fetchWithTimeout(
        `${endpoint}/api/chat`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model,
            messages,
            stream: true,
            options: {
              temperature,
              num_predict: maxTokens
            }
          }),
          signal: controller?.signal || signal
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `API request failed with status ${response.status}`);
      }

      // Process the streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim() !== '');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.substring(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.message?.content) {
                fullResponse += parsed.message.content;
                if (onToken) {
                  onToken(parsed.message.content);
                }
              }
            } catch (e) {
              console.error('Error parsing chunk:', e);
            }
          }
        }
      }

      return fullResponse;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Request was cancelled');
      }
      throw error;
    } finally {
      if (controller) {
        this.abortController = null;
      }
    }
  }

  // Cancel the current request
  cancel() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  // Helper method to fetch with timeout
  async _fetchWithTimeout(resource, options = {}) {
    const { timeout = this.config.timeout } = options;
    
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(resource, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(id);
      return response;
    } catch (error) {
      clearTimeout(id);
      if (error.name === 'AbortError') {
        throw new Error(`Request timed out after ${timeout}ms`);
      }
      throw error;
    }
  }
}

// Create a singleton instance
const ollama = new OllamaAPI();

export default ollama;
