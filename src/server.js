const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const WebSocket = require('ws');
const http = require('http');

const SuggestionEngine = require('./core/SuggestionEngine');
const ContextManager = require('./core/ContextManager');
const OpenAIProvider = require('./providers/OpenAIProvider');
const LocalModelProvider = require('./providers/LocalModelProvider');
const PuterProvider = require('./providers/PuterProvider');
const MockProvider = require('./providers/MockProvider');

class AIPairProgrammerServer {
  constructor(config = {}) {
    this.config = {
      port: config.port || 3000,
      wsPort: config.wsPort || 3001,
      provider: config.provider || 'puter',
      ...config
    };

    this.app = express();
    this.server = http.createServer(this.app);
    this.wss = new WebSocket.Server({ port: this.config.wsPort });

    this.contextManager = new ContextManager();
    this.setupModelProvider();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
  }

  setupModelProvider() {
    switch (this.config.provider) {
      case 'openai':
        this.modelProvider = new OpenAIProvider(this.config.openai || {});
        break;
      case 'local':
        this.modelProvider = new LocalModelProvider(this.config.local || {});
        break;
      case 'puter':
        this.modelProvider = new PuterProvider(this.config.puter || {});
        // Add fallback mock provider for server-side suggestions
        this.fallbackProvider = new MockProvider({ delay: 100 });
        break;
      case 'mock':
        this.modelProvider = new MockProvider(this.config.mock || {});
        break;
      default:
        throw new Error(`Unknown provider: ${this.config.provider}`);
    }

    this.suggestionEngine = new SuggestionEngine(this.modelProvider);

    // Set fallback provider if available
    if (this.fallbackProvider) {
      this.suggestionEngine.setFallbackProvider(this.fallbackProvider);
    }
  }

  setupMiddleware() {
    this.app.use(cors());
    this.app.use(bodyParser.json({ limit: '10mb' }));
    this.app.use(bodyParser.urlencoded({ extended: true }));

    // Request logging
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
      next();
    });
  }

  setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        provider: this.config.provider,
        timestamp: new Date().toISOString()
      });
    });

    // Get code suggestions
    this.app.post('/suggestions', async (req, res) => {
      try {
        const { code, cursorPosition, language, sessionId, options } = req.body;

        if (!code || cursorPosition === undefined) {
          return res.status(400).json({ error: 'Missing required fields: code, cursorPosition' });
        }

        // Update context if session provided
        if (sessionId) {
          this.contextManager.updateFileContext(sessionId, 'current.js', code, language);
        }

        const suggestions = await this.suggestionEngine.generateSuggestions(
          code,
          cursorPosition,
          language || 'javascript',
          options || {}
        );

        // Add to history
        if (sessionId) {
          this.contextManager.addToHistory(sessionId, {
            type: 'completion',
            input: code.substring(Math.max(0, cursorPosition - 100), cursorPosition + 100),
            output: suggestions,
            metadata: { language, cursorPosition }
          });
        }

        res.json({ suggestions });
      } catch (error) {
        console.error('Suggestion error:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Create or get session
    this.app.post('/session', (req, res) => {
      const { sessionId, metadata } = req.body;
      const id = sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      let session = this.contextManager.getSession(id);
      if (!session) {
        session = this.contextManager.createSession(id, metadata);
      }

      res.json({ sessionId: id, session: this.contextManager.getSessionStats(id) });
    });

    // Update project context
    this.app.post('/context', (req, res) => {
      const { sessionId, files, dependencies } = req.body;

      if (!sessionId) {
        return res.status(400).json({ error: 'sessionId is required' });
      }

      const session = this.contextManager.getSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      // Update files
      if (files) {
        files.forEach(file => {
          this.contextManager.updateFileContext(sessionId, file.path, file.content, file.language);
        });
      }

      // Update dependencies
      if (dependencies) {
        this.contextManager.updateProjectDependencies(sessionId, dependencies);
      }

      // Detect framework
      const framework = this.contextManager.detectFramework(sessionId);

      res.json({
        success: true,
        framework,
        stats: this.contextManager.getSessionStats(sessionId)
      });
    });

    // Get session info
    this.app.get('/session/:sessionId', (req, res) => {
      const stats = this.contextManager.getSessionStats(req.params.sessionId);
      if (!stats) {
        return res.status(404).json({ error: 'Session not found' });
      }
      res.json(stats);
    });

    // Client-side AI suggestions (for Puter free API)
    this.app.post('/suggestions/client', async (req, res) => {
      try {
        const { code, cursorPosition, language, sessionId } = req.body;

        if (!code || cursorPosition === undefined) {
          return res.status(400).json({ error: 'Missing required fields: code, cursorPosition' });
        }

        console.log(`\n🔍 CLIENT REQUEST RECEIVED:`);
        console.log(`Language: ${language}`);
        console.log(`Code: "${code.trim()}"`);
        console.log(`Cursor Position: ${cursorPosition}`);
        console.log(`Session ID: ${sessionId}`);

        // Update context if session provided
        if (sessionId) {
          this.contextManager.updateFileContext(sessionId, 'current.js', code, language);
        }

        // Build prompt for client-side AI
        const context = this.contextManager.getRelevantContext(sessionId, code, cursorPosition) || {};
        const prompt = this.buildClientPrompt(code, cursorPosition, language, context);

        console.log(`\n📝 GENERATED PROMPT FOR PUTER AI:`);
        console.log('─'.repeat(60));
        console.log(prompt);
        console.log('─'.repeat(60));

        res.json({
          prompt,
          context: {
            language: language || 'javascript',
            cursorPosition,
            sessionId
          }
        });
      } catch (error) {
        console.error('Client suggestion error:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // New endpoint to receive and log Puter AI responses
    this.app.post('/suggestions/puter-response', async (req, res) => {
      try {
        const { response, model, language, originalPrompt, error } = req.body;

        if (error) {
          console.log(`\n🚨 PUTER AI ERROR RECEIVED:`);
          console.log(`Model: ${model}`);
          console.log(`Language: ${language}`);
          console.log(`Error Name: ${error.name}`);
          console.log(`Error Message: ${error.message}`);
          console.log('─'.repeat(60));
          if (error.stack) {
            console.log(`Stack Trace:\n${error.stack}`);
          }
          console.log('─'.repeat(60));
        } else {
          console.log(`\n🤖 PUTER AI RESPONSE RECEIVED:`);
          console.log(`Model: ${model}`);
          console.log(`Language: ${language}`);
          console.log(`Response Type: ${typeof response}`);
          console.log('─'.repeat(60));

          if (typeof response === 'string') {
            console.log(`Response Text: "${response}"`);
          } else if (response && response.choices) {
            console.log(`Choices Count: ${response.choices.length}`);
            response.choices.forEach((choice, index) => {
              console.log(`Choice ${index + 1}:`);
              console.log(`  Content: "${choice.message?.content || choice.text || 'No content'}"`);
            });
          } else if (response) {
            console.log(`Raw Response:`, JSON.stringify(response, null, 2));
          } else {
            console.log(`No response received from Puter AI`);
          }

          console.log('─'.repeat(60));
        }

        res.json({ success: true });
      } catch (error) {
        console.error('Error logging Puter response:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Serve static files for demo
    this.app.use(express.static('public'));
  }

  buildClientPrompt(code, cursorPosition, language, context) {
    const lines = code.split('\n');
    const cursorLine = code.substring(0, cursorPosition).split('\n').length - 1;

    const startLine = Math.max(0, cursorLine - 10);
    const endLine = Math.min(lines.length, cursorLine + 5);

    const beforeCursor = lines.slice(startLine, cursorLine).join('\n');
    const currentLine = lines[cursorLine] || '';
    const afterCursor = lines.slice(cursorLine + 1, endLine).join('\n');

    // Check if this is an English-to-code conversion request
    const isEnglishToCode = this.detectEnglishToCodeForClient(currentLine, beforeCursor);

    let prompt;

    if (isEnglishToCode) {
      prompt = `You are an AI code generator that converts English descriptions to ${language} code.\n\n`;

      // Add context about available functions/classes
      if (context.projectFiles && context.projectFiles.length > 0) {
        prompt += 'Available in project:\n';
        context.projectFiles.forEach(file => {
          const analysis = this.suggestionEngine.analyzer.analyzeCode(file.content, file.language);
          if (analysis.functions.length > 0) {
            prompt += `Functions: ${analysis.functions.slice(0, 3).join(', ')}\n`;
          }
          if (analysis.classes.length > 0) {
            prompt += `Classes: ${analysis.classes.slice(0, 3).join(', ')}\n`;
          }
        });
        prompt += '\n';
      }

      prompt += 'Code context:\n```' + language + '\n';
      if (beforeCursor.trim()) {
        prompt += beforeCursor + '\n';
      }
      prompt += '\n```\n\n';

      // Extract the English description
      const englishText = this.extractEnglishDescriptionForClient(currentLine);
      prompt += `Convert this English description to ${language} code:\n"${englishText}"\n\n`;
      prompt += `Provide only the ${language} code implementation. Do not include explanations or the original English text.`;

    } else {
      prompt = `You are an AI code completion assistant. Complete the following ${language} code:\n\n`;

      // Add context about available functions/classes
      if (context.projectFiles && context.projectFiles.length > 0) {
        prompt += 'Available in project:\n';
        context.projectFiles.forEach(file => {
          const analysis = this.suggestionEngine.analyzer.analyzeCode(file.content, file.language);
          if (analysis.functions.length > 0) {
            prompt += `Functions: ${analysis.functions.slice(0, 3).join(', ')}\n`;
          }
          if (analysis.classes.length > 0) {
            prompt += `Classes: ${analysis.classes.slice(0, 3).join(', ')}\n`;
          }
        });
        prompt += '\n';
      }

      prompt += 'Code context:\n```' + language + '\n';
      if (beforeCursor.trim()) {
        prompt += beforeCursor + '\n';
      }
      prompt += currentLine + '|CURSOR|';
      if (afterCursor.trim()) {
        prompt += '\n' + afterCursor;
      }
      prompt += '\n```\n\n';
      prompt += 'Provide only the code that should be inserted at the cursor position. Do not include explanations or the existing code.';
    }

    return prompt;
  }

  detectEnglishToCodeForClient(currentLine, beforeContext) {
    const line = currentLine.trim().toLowerCase();

    // Check for comment patterns that indicate English-to-code conversion
    const commentPatterns = [
      /^\/\/\s*(.+)/,  // JavaScript/TypeScript/C++ single-line comment
      /^#\s*(.+)/,     // Python comment
      /^\/\*\s*(.+)/,  // Multi-line comment start
    ];

    // Enhanced conversion keywords - more flexible matching
    const conversionKeywords = [
      'create a function',
      'write a function',
      'implement',
      'generate code',
      'make a',
      'build a',
      'add a method',
      'create a class',
      'write code to',
      'function that',
      'method that',
      'class that',
      'algorithm to',
      'code to',
      'script to',
      'loop through',
      'iterate over',
      'check if',
      'validate',
      'sort array',
      'filter array',
      'map array',
      'async function',
      'fetch data',
      'read file',
      'write file',
      'create interface',
      'fibonacci',
      'febonacci', // Common misspelling
      'febononacci', // Another common misspelling
      'create function for',
      'create function',
      'recursive function',
      'function to calculate',
      'calculate fibonacci',
      'generate fibonacci'
    ];

    // Check if line starts with a comment
    for (const pattern of commentPatterns) {
      const match = line.match(pattern);
      if (match) {
        const commentText = match[1].trim();
        console.log(`🔍 Client: Checking comment: "${commentText}"`); // Debug log

        // Check if comment contains conversion keywords
        const hasKeywords = conversionKeywords.some(keyword => commentText.includes(keyword));

        if (hasKeywords) {
          console.log(`✅ Client: English-to-code detected with keywords`); // Debug log
          return true;
        }
      }
    }

    return false;
  }

  extractEnglishDescriptionForClient(currentLine) {
    const line = currentLine.trim();

    // Remove comment markers
    let description = line
      .replace(/^\/\/\s*/, '')  // Remove // 
      .replace(/^#\s*/, '')     // Remove # 
      .replace(/^\/\*\s*/, '')  // Remove /*
      .replace(/\s*\*\/\s*$/, '') // Remove */
      .trim();

    return description || line;
  }

  setupWebSocket() {
    this.wss.on('connection', (ws) => {
      console.log('WebSocket client connected');

      ws.on('message', async (message) => {
        try {
          const data = JSON.parse(message);

          switch (data.type) {
            case 'suggestion_request':
              const suggestions = await this.suggestionEngine.generateSuggestions(
                data.code,
                data.cursorPosition,
                data.language,
                data.options
              );

              ws.send(JSON.stringify({
                type: 'suggestions',
                id: data.id,
                suggestions
              }));
              break;

            case 'ping':
              ws.send(JSON.stringify({ type: 'pong' }));
              break;
          }
        } catch (error) {
          ws.send(JSON.stringify({
            type: 'error',
            error: error.message
          }));
        }
      });

      ws.on('close', () => {
        console.log('WebSocket client disconnected');
      });
    });
  }

  start() {
    this.server.listen(this.config.port, () => {
      console.log(`AI Pair Programmer Server running on port ${this.config.port}`);
      console.log(`WebSocket server running on port ${this.config.wsPort}`);
      console.log(`Using provider: ${this.config.provider}`);
    });
  }

  stop() {
    this.server.close();
    this.wss.close();
    this.contextManager.destroy();
  }
}

// Start server if run directly
if (require.main === module) {
  const config = {
    port: process.env.PORT || 3000,
    wsPort: process.env.WS_PORT || 3001,
    provider: process.env.MODEL_PROVIDER || 'puter',
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo'
    },
    local: {
      endpoint: process.env.LOCAL_MODEL_ENDPOINT || 'http://localhost:11434/api/generate',
      model: process.env.LOCAL_MODEL || 'codellama'
    },
    puter: {
      apiKey: process.env.PUTER_API_KEY,
      model: process.env.PUTER_MODEL || 'gpt-3.5-turbo'
    }
  };

  const server = new AIPairProgrammerServer(config);
  server.start();

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\nShutting down gracefully...');
    server.stop();
    process.exit(0);
  });
}

module.exports = AIPairProgrammerServer;