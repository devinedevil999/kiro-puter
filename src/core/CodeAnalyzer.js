class CodeAnalyzer {
  constructor() {
    this.languagePatterns = {
      javascript: {
        functions: /function\s+(\w+)\s*\([^)]*\)\s*{/g,
        variables: /(?:let|const|var)\s+(\w+)/g,
        imports: /import\s+.*\s+from\s+['"]([^'"]+)['"]/g,
        classes: /class\s+(\w+)/g
      },
      python: {
        functions: /def\s+(\w+)\s*\([^)]*\):/g,
        variables: /(\w+)\s*=/g,
        imports: /(?:from\s+(\w+)\s+)?import\s+([^#\n]+)/g,
        classes: /class\s+(\w+)/g
      },
      typescript: {
        functions: /(?:function\s+(\w+)|(\w+)\s*:\s*\([^)]*\)\s*=>)/g,
        variables: /(?:let|const|var)\s+(\w+)/g,
        imports: /import\s+.*\s+from\s+['"]([^'"]+)['"]/g,
        classes: /class\s+(\w+)/g,
        interfaces: /interface\s+(\w+)/g
      }
    };
  }

  analyzeCode(code, language = 'javascript') {
    const patterns = this.languagePatterns[language] || this.languagePatterns.javascript;
    const analysis = {
      functions: [],
      variables: [],
      imports: [],
      classes: [],
      interfaces: [],
      complexity: this.calculateComplexity(code),
      lineCount: code.split('\n').length
    };

    // Extract functions
    let match;
    while ((match = patterns.functions.exec(code)) !== null) {
      analysis.functions.push(match[1] || match[2]);
    }

    // Extract variables
    patterns.variables.lastIndex = 0;
    while ((match = patterns.variables.exec(code)) !== null) {
      analysis.variables.push(match[1]);
    }

    // Extract imports
    patterns.imports.lastIndex = 0;
    while ((match = patterns.imports.exec(code)) !== null) {
      analysis.imports.push(match[1] || match[2]);
    }

    // Extract classes
    patterns.classes.lastIndex = 0;
    while ((match = patterns.classes.exec(code)) !== null) {
      analysis.classes.push(match[1]);
    }

    // Extract interfaces (TypeScript)
    if (patterns.interfaces) {
      patterns.interfaces.lastIndex = 0;
      while ((match = patterns.interfaces.exec(code)) !== null) {
        analysis.interfaces.push(match[1]);
      }
    }

    return analysis;
  }

  calculateComplexity(code) {
    const complexityKeywords = ['if', 'else', 'for', 'while', 'switch', 'case', 'try', 'catch'];
    let complexity = 1; // Base complexity
    
    complexityKeywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'g');
      const matches = code.match(regex);
      if (matches) {
        complexity += matches.length;
      }
    });

    return complexity;
  }

  getContextWindow(code, cursorPosition, windowSize = 500) {
    const lines = code.split('\n');
    const cursorLine = this.getCursorLine(code, cursorPosition);
    
    const startLine = Math.max(0, cursorLine - Math.floor(windowSize / 2));
    const endLine = Math.min(lines.length, cursorLine + Math.floor(windowSize / 2));
    
    return {
      before: lines.slice(startLine, cursorLine).join('\n'),
      current: lines[cursorLine] || '',
      after: lines.slice(cursorLine + 1, endLine).join('\n'),
      lineNumber: cursorLine
    };
  }

  getCursorLine(code, position) {
    return code.substring(0, position).split('\n').length - 1;
  }
}

module.exports = CodeAnalyzer;