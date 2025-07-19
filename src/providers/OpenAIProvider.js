const ModelProvider = require('./ModelProvider');
const OpenAI = require('openai');

class OpenAIProvider extends ModelProvider {
  constructor(config = {}) {
    super(config);
    this.client = new OpenAI({
      apiKey: config.apiKey || process.env.OPENAI_API_KEY
    });
    this.model = config.model || 'gpt-3.5-turbo';
  }

  async generateCompletion(prompt, options = {}) {
    await this.checkRateLimit();

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful code completion assistant. Provide only the code completion without explanations unless specifically asked.'
          },
          {
            role: 'user',
            content: this.formatPrompt(prompt, options.language, options)
          }
        ],
        max_tokens: options.maxTokens || 150,
        temperature: options.temperature || 0.3,
        stop: options.stop || ['\n\n', '```'],
        n: options.n || 1
      });

      return this.parseResponse(response, options);
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw new Error(`OpenAI completion failed: ${error.message}`);
    }
  }

  formatPrompt(prompt, language, options) {
    // Add language-specific context
    let formattedPrompt = prompt;
    
    if (language === 'typescript') {
      formattedPrompt += '\n\nEnsure the completion includes proper TypeScript types.';
    } else if (language === 'python') {
      formattedPrompt += '\n\nFollow Python PEP 8 style guidelines.';
    }
    
    return formattedPrompt;
  }

  parseResponse(response, options) {
    if (!response.choices || response.choices.length === 0) {
      return [];
    }

    return response.choices.map(choice => {
      let content = choice.message.content.trim();
      
      // Remove common prefixes that the model might add
      content = content.replace(/^(Here's the completion:|The code completion is:)/i, '').trim();
      
      return content;
    });
  }
}

module.exports = OpenAIProvider;