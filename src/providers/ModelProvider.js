class ModelProvider {
  constructor(config = {}) {
    this.config = config;
    this.rateLimiter = {
      requests: 0,
      resetTime: Date.now() + 60000, // Reset every minute
      maxRequests: config.maxRequestsPerMinute || 60
    };
  }

  async generateCompletion(prompt, options = {}) {
    throw new Error('generateCompletion must be implemented by subclass');
  }

  async checkRateLimit() {
    const now = Date.now();
    
    if (now > this.rateLimiter.resetTime) {
      this.rateLimiter.requests = 0;
      this.rateLimiter.resetTime = now + 60000;
    }
    
    if (this.rateLimiter.requests >= this.rateLimiter.maxRequests) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }
    
    this.rateLimiter.requests++;
  }

  formatPrompt(prompt, language, options) {
    // Base formatting - can be overridden by specific providers
    return prompt;
  }

  parseResponse(response, options) {
    // Base parsing - can be overridden by specific providers
    return response;
  }
}

module.exports = ModelProvider;