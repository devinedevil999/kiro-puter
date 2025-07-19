const {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  InitializeParams,
  DidChangeConfigurationNotification,
  CompletionItem,
  CompletionItemKind,
  TextDocumentPositionParams,
  TextDocumentSyncKind,
  InitializeResult
} = require('vscode-languageserver/node');

const { TextDocument } = require('vscode-languageserver-textdocument');

const SuggestionEngine = require('../core/SuggestionEngine');
const ContextManager = require('../core/ContextManager');
const OpenAIProvider = require('../providers/OpenAIProvider');
const LocalModelProvider = require('../providers/LocalModelProvider');

class AIPairProgrammerLanguageServer {
  constructor() {
    this.connection = createConnection(ProposedFeatures.all);
    this.documents = new TextDocuments(TextDocument);
    this.hasConfigurationCapability = false;
    this.hasWorkspaceFolderCapability = false;
    this.hasDiagnosticRelatedInformationCapability = false;
    
    this.contextManager = new ContextManager();
    this.setupModelProvider();
    this.setupHandlers();
  }

  setupModelProvider() {
    const provider = process.env.MODEL_PROVIDER || 'openai';
    
    switch (provider) {
      case 'openai':
        this.modelProvider = new OpenAIProvider({
          apiKey: process.env.OPENAI_API_KEY,
          model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo'
        });
        break;
      case 'local':
        this.modelProvider = new LocalModelProvider({
          endpoint: process.env.LOCAL_MODEL_ENDPOINT || 'http://localhost:11434/api/generate',
          model: process.env.LOCAL_MODEL || 'codellama'
        });
        break;
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }

    this.suggestionEngine = new SuggestionEngine(this.modelProvider);
  }

  setupHandlers() {
    // Initialize
    this.connection.onInitialize((params) => {
      const capabilities = params.capabilities;

      this.hasConfigurationCapability = !!(
        capabilities.workspace && !!capabilities.workspace.configuration
      );
      this.hasWorkspaceFolderCapability = !!(
        capabilities.workspace && !!capabilities.workspace.workspaceFolders
      );
      this.hasDiagnosticRelatedInformationCapability = !!(
        capabilities.textDocument &&
        capabilities.textDocument.publishDiagnostics &&
        capabilities.textDocument.publishDiagnostics.relatedInformation
      );

      const result = {
        capabilities: {
          textDocumentSync: TextDocumentSyncKind.Incremental,
          completionProvider: {
            resolveProvider: true,
            triggerCharacters: ['.', '(', '{', '[', ' ', '\n']
          }
        }
      };

      if (this.hasWorkspaceFolderCapability) {
        result.capabilities.workspace = {
          workspaceFolders: {
            supported: true
          }
        };
      }

      return result;
    });

    this.connection.onInitialized(() => {
      if (this.hasConfigurationCapability) {
        this.connection.client.register(DidChangeConfigurationNotification.type, undefined);
      }
      if (this.hasWorkspaceFolderCapability) {
        this.connection.workspace.onDidChangeWorkspaceFolders((_event) => {
          this.connection.console.log('Workspace folder change event received.');
        });
      }
    });

    // Configuration changes
    this.connection.onDidChangeConfiguration((change) => {
      // Reconfigure the language server with new settings
      this.connection.console.log('Configuration changed');
    });

    // Document events
    this.documents.onDidClose((e) => {
      // Document was closed, clean up any resources
    });

    this.documents.onDidChangeContent((change) => {
      this.updateDocumentContext(change.document);
    });

    // Completion
    this.connection.onCompletion(async (textDocumentPosition) => {
      return this.provideCompletions(textDocumentPosition);
    });

    this.connection.onCompletionResolve((item) => {
      return this.resolveCompletion(item);
    });

    // Listen on the connection
    this.documents.listen(this.connection);
    this.connection.listen();
  }

  updateDocumentContext(document) {
    const sessionId = this.getSessionId(document.uri);
    const language = this.getLanguageFromUri(document.uri);
    
    this.contextManager.updateFileContext(
      sessionId,
      document.uri,
      document.getText(),
      language
    );
  }

  async provideCompletions(textDocumentPosition) {
    const document = this.documents.get(textDocumentPosition.textDocument.uri);
    if (!document) {
      return [];
    }

    const position = textDocumentPosition.position;
    const offset = document.offsetAt(position);
    const text = document.getText();
    const language = this.getLanguageFromUri(document.uri);

    try {
      const suggestions = await this.suggestionEngine.generateSuggestions(
        text,
        offset,
        language,
        {
          maxTokens: 100,
          temperature: 0.2
        }
      );

      return suggestions.map((suggestion, index) => ({
        label: this.createLabel(suggestion),
        kind: this.getCompletionItemKind(suggestion.type),
        detail: `AI Suggestion (${Math.round(suggestion.confidence * 100)}% confidence)`,
        documentation: suggestion.text,
        insertText: suggestion.text,
        sortText: `${1000 - Math.round(suggestion.confidence * 1000)}_${index}`,
        data: {
          suggestionId: suggestion.id,
          confidence: suggestion.confidence
        }
      }));
    } catch (error) {
      this.connection.console.error(`Completion error: ${error.message}`);
      return [];
    }
  }

  resolveCompletion(item) {
    // Add additional information to the completion item
    if (item.data && item.data.confidence) {
      item.detail += ` | Confidence: ${Math.round(item.data.confidence * 100)}%`;
    }
    return item;
  }

  createLabel(suggestion) {
    const text = suggestion.text.trim();
    const firstLine = text.split('\n')[0];
    
    if (firstLine.length > 50) {
      return firstLine.substring(0, 47) + '...';
    }
    
    return firstLine || 'AI Suggestion';
  }

  getCompletionItemKind(suggestionType) {
    switch (suggestionType) {
      case 'function':
        return CompletionItemKind.Function;
      case 'class':
        return CompletionItemKind.Class;
      case 'variable':
        return CompletionItemKind.Variable;
      case 'import':
        return CompletionItemKind.Module;
      case 'comment':
        return CompletionItemKind.Text;
      default:
        return CompletionItemKind.Snippet;
    }
  }

  getLanguageFromUri(uri) {
    const extension = uri.split('.').pop()?.toLowerCase();
    
    const languageMap = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'cc': 'cpp',
      'cxx': 'cpp',
      'c': 'c',
      'cs': 'csharp',
      'php': 'php',
      'rb': 'ruby',
      'go': 'go',
      'rs': 'rust'
    };

    return languageMap[extension] || 'javascript';
  }

  getSessionId(uri) {
    // Create a session ID based on the workspace or file
    const workspaceFolder = uri.split('/').slice(0, -1).join('/');
    return `lsp_${Buffer.from(workspaceFolder).toString('base64').substring(0, 16)}`;
  }

  start() {
    this.connection.console.log('AI Pair Programmer Language Server started');
  }
}

// Start the language server if run directly
if (require.main === module) {
  const server = new AIPairProgrammerLanguageServer();
  server.start();
}

module.exports = AIPairProgrammerLanguageServer;