class ContextManager {
  constructor() {
    this.sessions = new Map();
    this.maxSessionAge = 30 * 60 * 1000; // 30 minutes
    this.maxContextSize = 10000; // characters
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000); // 5 minutes
  }

  createSession(sessionId, metadata = {}) {
    const session = {
      id: sessionId,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      metadata,
      history: [],
      currentFile: null,
      projectContext: {
        files: new Map(),
        dependencies: [],
        language: null,
        framework: null
      }
    };
    
    this.sessions.set(sessionId, session);
    return session;
  }

  getSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivity = Date.now();
    }
    return session;
  }

  updateFileContext(sessionId, filePath, content, language) {
    const session = this.getSession(sessionId);
    if (!session) return null;

    session.currentFile = {
      path: filePath,
      content: content,
      language: language,
      lastModified: Date.now()
    };

    // Store file in project context
    session.projectContext.files.set(filePath, {
      content: this.truncateContent(content),
      language,
      lastAccessed: Date.now()
    });

    // Update project language if not set
    if (!session.projectContext.language) {
      session.projectContext.language = language;
    }

    return session;
  }

  addToHistory(sessionId, interaction) {
    const session = this.getSession(sessionId);
    if (!session) return;

    const historyItem = {
      timestamp: Date.now(),
      type: interaction.type, // 'completion', 'suggestion', 'error'
      input: this.truncateContent(interaction.input),
      output: interaction.output,
      metadata: interaction.metadata || {}
    };

    session.history.push(historyItem);

    // Keep only recent history
    if (session.history.length > 50) {
      session.history = session.history.slice(-30);
    }
  }

  getRelevantContext(sessionId, currentCode, cursorPosition) {
    const session = this.getSession(sessionId);
    if (!session) return null;

    const context = {
      currentFile: session.currentFile,
      recentHistory: session.history.slice(-5),
      projectFiles: this.getRelevantFiles(session, currentCode),
      dependencies: session.projectContext.dependencies,
      language: session.projectContext.language
    };

    return context;
  }

  getRelevantFiles(session, currentCode) {
    const relevantFiles = [];
    const currentWords = new Set(currentCode.match(/\b\w+\b/g) || []);

    for (const [filePath, fileData] of session.projectContext.files) {
      if (filePath === session.currentFile?.path) continue;

      const fileWords = new Set(fileData.content.match(/\b\w+\b/g) || []);
      const commonWords = [...currentWords].filter(word => fileWords.has(word));

      if (commonWords.length > 2) {
        relevantFiles.push({
          path: filePath,
          content: fileData.content,
          language: fileData.language,
          relevanceScore: commonWords.length
        });
      }
    }

    return relevantFiles
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 3);
  }

  updateProjectDependencies(sessionId, dependencies) {
    const session = this.getSession(sessionId);
    if (session) {
      session.projectContext.dependencies = dependencies;
    }
  }

  detectFramework(sessionId) {
    const session = this.getSession(sessionId);
    if (!session) return null;

    const frameworks = {
      react: ['react', 'jsx', 'useState', 'useEffect', 'component'],
      vue: ['vue', 'template', 'script', 'style', 'v-'],
      angular: ['angular', '@component', '@injectable', 'ngOnInit'],
      express: ['express', 'app.get', 'app.post', 'middleware'],
      django: ['django', 'models.py', 'views.py', 'urls.py'],
      flask: ['flask', 'app.route', '@app.route']
    };

    const allContent = Array.from(session.projectContext.files.values())
      .map(f => f.content)
      .join(' ')
      .toLowerCase();

    for (const [framework, keywords] of Object.entries(frameworks)) {
      const matches = keywords.filter(keyword => allContent.includes(keyword));
      if (matches.length >= 2) {
        session.projectContext.framework = framework;
        return framework;
      }
    }

    return null;
  }

  truncateContent(content, maxLength = this.maxContextSize) {
    if (content.length <= maxLength) return content;
    
    // Try to truncate at word boundaries
    const truncated = content.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    
    return lastSpace > maxLength * 0.8 
      ? truncated.substring(0, lastSpace) + '...'
      : truncated + '...';
  }

  cleanup() {
    const now = Date.now();
    const expiredSessions = [];

    for (const [sessionId, session] of this.sessions) {
      if (now - session.lastActivity > this.maxSessionAge) {
        expiredSessions.push(sessionId);
      }
    }

    expiredSessions.forEach(sessionId => {
      this.sessions.delete(sessionId);
    });

    if (expiredSessions.length > 0) {
      console.log(`Cleaned up ${expiredSessions.length} expired sessions`);
    }
  }

  getSessionStats(sessionId) {
    const session = this.getSession(sessionId);
    if (!session) return null;

    return {
      id: sessionId,
      createdAt: session.createdAt,
      lastActivity: session.lastActivity,
      historyCount: session.history.length,
      filesCount: session.projectContext.files.size,
      language: session.projectContext.language,
      framework: session.projectContext.framework
    };
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.sessions.clear();
  }
}

module.exports = ContextManager;