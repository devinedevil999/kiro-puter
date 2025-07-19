const ModelProvider = require('./ModelProvider');
const axios = require('axios');

class LocalModelProvider extends ModelProvider {
  constructor(config = {}) {
    super(config);
    this.endpoint = config.endpoint || 'http://localhost:11434/api/generate';
    this.model = config.model || 'codellama';
    this.timeout = config.timeout || 30000;
  }

  async generateCompletion(prompt, options = {}) {
    await this.checkRateLimit();

    try {
      const response = await axios.post(this.endpoint, {
        model: this.model,
        prompt: this.formatPrompt(prompt, options.language, options),
        stream: false,
        options: {
          temperature: options.temperature || 0.3,
          top_p: options.topP || 0.9,
          max_tokens: options.maxTokens || 150,
          stop: options.stop || ['\n\n', '```']
        }
      }, {
        timeout: this.timeout,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      return this.parseResponse(response.data, options);
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Local model server is not running. Please start your local model server.');
      }
      console.error('Local model error:', error);
      throw new Error(`Local model completion failed: ${error.message}`);
    }
  }

  formatPrompt(prompt, language, options) {
    // Format for code completion models like CodeLlama
    let formattedPrompt = `<PRE> ${prompt} <SUF>`;
    
    if (options.completionType === 'function') {
      formattedPrompt += ' <MID>';
    }
    
    return formattedPrompt;
  }

  parseResponse(response, options) {
    if (!response.response) {
      return [];
    }

    let content = response.response.trim();
    
    // Clean up model-specific tokens
    content = content.replace(/<\/?(?:PRE|SUF|MID)>/g, '').trim();
    
    return [content];
  }

  async checkHealth() {
    try {
      const response = await axios.get(this.endpoint.replace('/api/generate', '/api/tags'), {
        timeout: 5000
      });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }
}

module.exports = LocalModelProvider;