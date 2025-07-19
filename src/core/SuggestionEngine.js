const CodeAnalyzer = require('./CodeAnalyzer');

class SuggestionEngine {
  constructor(modelProvider) {
    this.modelProvider = modelProvider;
    this.fallbackProvider = null;
    this.analyzer = new CodeAnalyzer();
    this.cache = new Map();
    this.maxCacheSize = 1000;
  }

  setFallbackProvider(fallbackProvider) {
    this.fallbackProvider = fallbackProvider;
  }

  async generateSuggestions(code, cursorPosition, language = 'javascript', options = {}) {
    const cacheKey = this.getCacheKey(code, cursorPosition, language);
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const context = this.analyzer.getContextWindow(code, cursorPosition);
      const analysis = this.analyzer.analyzeCode(code, language);
      
      const prompt = this.buildPrompt(context, analysis, language, options);
      const suggestions = await this.modelProvider.generateCompletion(prompt, {
        maxTokens: options.maxTokens || 150,
        temperature: options.temperature || 0.3,
        language
      });

      const processedSuggestions = this.processSuggestions(suggestions, context, language);
      
      this.updateCache(cacheKey, processedSuggestions);
      return processedSuggestions;
    } catch (error) {
      console.error('Error generating suggestions:', error);
      
      // Try fallback provider if available
      if (this.fallbackProvider) {
        try {
          console.log('Using fallback provider for suggestions...');
          const context = this.analyzer.getContextWindow(code, cursorPosition);
          const analysis = this.analyzer.analyzeCode(code, language);
          const prompt = this.buildPrompt(context, analysis, language, options);
          
          const fallbackSuggestions = await this.fallbackProvider.generateCompletion(prompt, {
            maxTokens: options.maxTokens || 150,
            temperature: options.temperature || 0.3,
            language
          });

          const processedSuggestions = this.processSuggestions(fallbackSuggestions, context, language);
          this.updateCache(cacheKey, processedSuggestions);
          return processedSuggestions;
        } catch (fallbackError) {
          console.error('Fallback provider also failed:', fallbackError);
        }
      }
      
      return [];
    }
  }

  buildPrompt(context, analysis, language, options) {
    const { before, current, after } = context;
    
    // Check if the current line contains English text that should be converted to code
    const isEnglishToCode = this.detectEnglishToCode(current, before);
    
    let prompt;
    
    if (isEnglishToCode) {
      prompt = `You are an AI code generator that converts English descriptions to ${language} code.\n\n`;
      
      // Add context about the codebase
      if (analysis.functions.length > 0) {
        prompt += `Available functions: ${analysis.functions.join(', ')}\n`;
      }
      if (analysis.classes.length > 0) {
        prompt += `Available classes: ${analysis.classes.join(', ')}\n`;
      }
      if (analysis.imports.length > 0) {
        prompt += `Imports: ${analysis.imports.slice(0, 5).join(', ')}\n`;
      }
      
      prompt += '\nCode context:\n```' + language + '\n';
      if (before.trim()) {
        prompt += before + '\n';
      }
      prompt += '\n```\n\n';
      
      // Extract the English description
      const englishText = this.extractEnglishDescription(current);
      prompt += `Convert this English description to ${language} code:\n"${englishText}"\n\n`;
      prompt += `Provide only the ${language} code implementation. Do not include explanations or the original English text.`;
      
    } else {
      prompt = `You are an AI code completion assistant. Complete the following ${language} code:\n\n`;
      
      // Add context about the codebase
      if (analysis.functions.length > 0) {
        prompt += `Available functions: ${analysis.functions.join(', ')}\n`;
      }
      if (analysis.classes.length > 0) {
        prompt += `Available classes: ${analysis.classes.join(', ')}\n`;
      }
      if (analysis.imports.length > 0) {
        prompt += `Imports: ${analysis.imports.slice(0, 5).join(', ')}\n`;
      }
      
      prompt += '\nCode context:\n```' + language + '\n';
      prompt += before + '\n';
      prompt += current + '|CURSOR|';
      if (after.trim()) {
        prompt += '\n' + after;
      }
      prompt += '\n```\n\n';
      
      if (options.completionType === 'function') {
        prompt += 'Complete the function implementation:';
      } else if (options.completionType === 'comment') {
        prompt += 'Generate appropriate code based on the comment:';
      } else {
        prompt += 'Provide the most likely code completion:';
      }
    }
    
    return prompt;
  }

  detectEnglishToCode(currentLine, beforeContext) {
    const line = currentLine.trim().toLowerCase();
    
    // Check for comment patterns that indicate English-to-code conversion
    const commentPatterns = [
      /^\/\/\s*(.+)/,  // JavaScript/TypeScript single-line comment
      /^#\s*(.+)/,     // Python comment
      /^\/\*\s*(.+)/,  // Multi-line comment start
    ];
    
    // Enhanced conversion keywords - more comprehensive
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
      'create interface'
    ];
    
    // Enhanced natural language patterns
    const naturalLanguagePatterns = [
      /\b(create|make|build|write|implement|generate)\s+(a|an)?\s*(function|method|class|variable|array|object|interface)/,
      /\b(function|method|class)\s+(that|to|for)\s+/,
      /\b(calculate|compute|find|get|set|add|remove|delete|update|sort|filter|map)\s+/,
      /\b(loop|iterate|check|validate|parse|format|convert)\s+/,
      /\b(if|when|while|for|until)\s+.*\s+(then|do)\s+/,
      /\b(async|await)\s+(function|method)/,
      /\b(fetch|read|write|save)\s+(data|file)/,
      /\b(sort|filter|map)\s+(array|list)/
    ];
    
    // Check if line starts with a comment
    for (const pattern of commentPatterns) {
      const match = line.match(pattern);
      if (match) {
        const commentText = match[1].trim();
        console.log(`Checking comment: "${commentText}"`); // Debug log
        
        // Check if comment contains conversion keywords or natural language
        const hasKeywords = conversionKeywords.some(keyword => commentText.includes(keyword));
        const hasPatterns = naturalLanguagePatterns.some(pattern => pattern.test(commentText));
        
        if (hasKeywords || hasPatterns) {
          console.log(`English-to-code detected: ${hasKeywords ? 'keywords' : 'patterns'}`); // Debug log
          return true;
        }
      }
    }
    
    // Check for direct English descriptions (not in comments)
    if (conversionKeywords.some(keyword => line.includes(keyword))) {
      console.log('English-to-code detected: direct keywords'); // Debug log
      return true;
    }
    
    // Check for natural language patterns
    if (naturalLanguagePatterns.some(pattern => pattern.test(line))) {
      console.log('English-to-code detected: natural language patterns'); // Debug log
      return true;
    }
    
    // Check if the line looks like English prose (has common English words and sentence structure)
    const englishWords = ['the', 'a', 'an', 'and', 'or', 'but', 'to', 'for', 'of', 'in', 'on', 'at', 'by', 'with', 'that', 'is', 'are', 'will', 'should', 'can', 'would'];
    const words = line.split(/\s+/);
    const englishWordCount = words.filter(word => englishWords.includes(word)).length;
    
    // If more than 15% of words are common English words and line is longer than 4 words
    if (words.length > 4 && englishWordCount / words.length > 0.15) {
      // Make sure it's not already code by checking for code patterns
      const codePatterns = [
        /[{}();=]/,  // Common code symbols
        /\b(function|class|const|let|var|if|for|while|return)\b/,  // Code keywords
        /\w+\.\w+/,  // Method calls
        /\w+\(/     // Function calls
      ];
      
      const hasCodePatterns = codePatterns.some(pattern => pattern.test(line));
      if (!hasCodePatterns) {
        console.log('English-to-code detected: prose analysis'); // Debug log
        return true;
      }
    }
    
    return false;
  }

  extractEnglishDescription(currentLine) {
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

  processSuggestions(rawSuggestions, context, language) {
    if (!Array.isArray(rawSuggestions)) {
      rawSuggestions = [rawSuggestions];
    }

    return rawSuggestions.map((suggestion, index) => ({
      id: `suggestion_${Date.now()}_${index}`,
      text: this.cleanSuggestion(suggestion, language),
      confidence: this.calculateConfidence(suggestion, context),
      type: this.detectSuggestionType(suggestion, context),
      language,
      insertText: suggestion,
      range: this.calculateInsertRange(context)
    })).filter(s => s.text.trim().length > 0);
  }

  cleanSuggestion(suggestion, language) {
    // Remove code block markers
    let cleaned = suggestion.replace(/```[\w]*\n?/g, '').trim();
    
    // Remove cursor markers
    cleaned = cleaned.replace(/\|CURSOR\|/g, '');
    
    // Language-specific cleaning
    if (language === 'javascript' || language === 'typescript') {
      // Remove incomplete statements at the end
      const lines = cleaned.split('\n');
      while (lines.length > 0 && !this.isCompleteStatement(lines[lines.length - 1], language)) {
        lines.pop();
      }
      cleaned = lines.join('\n');
    }
    
    return cleaned;
  }

  isCompleteStatement(line, language) {
    const trimmed = line.trim();
    if (!trimmed) return true;
    
    if (language === 'javascript' || language === 'typescript') {
      return trimmed.endsWith(';') || 
             trimmed.endsWith('{') || 
             trimmed.endsWith('}') ||
             trimmed.startsWith('//') ||
             trimmed.startsWith('/*');
    }
    
    return true;
  }

  calculateConfidence(suggestion, context) {
    let confidence = 0.5; // Base confidence
    
    // Increase confidence for syntactically correct code
    if (this.isSyntacticallyValid(suggestion)) {
      confidence += 0.2;
    }
    
    // Increase confidence for contextually relevant code
    if (this.isContextuallyRelevant(suggestion, context)) {
      confidence += 0.2;
    }
    
    // Decrease confidence for very short or very long suggestions
    const length = suggestion.trim().length;
    if (length < 10 || length > 500) {
      confidence -= 0.1;
    }
    
    return Math.max(0, Math.min(1, confidence));
  }

  detectSuggestionType(suggestion, context) {
    const trimmed = suggestion.trim();
    
    if (trimmed.startsWith('function') || trimmed.includes('=>')) {
      return 'function';
    }
    if (trimmed.startsWith('class')) {
      return 'class';
    }
    if (trimmed.startsWith('import') || trimmed.startsWith('require')) {
      return 'import';
    }
    if (trimmed.startsWith('//') || trimmed.startsWith('/*')) {
      return 'comment';
    }
    
    return 'statement';
  }

  isSyntacticallyValid(code) {
    // Basic syntax validation - can be enhanced
    const brackets = { '(': ')', '[': ']', '{': '}' };
    const stack = [];
    
    for (const char of code) {
      if (brackets[char]) {
        stack.push(brackets[char]);
      } else if (Object.values(brackets).includes(char)) {
        if (stack.pop() !== char) {
          return false;
        }
      }
    }
    
    return stack.length === 0;
  }

  isContextuallyRelevant(suggestion, context) {
    // Check if suggestion uses variables/functions from context
    const contextWords = new Set([
      ...context.before.match(/\b\w+\b/g) || [],
      ...context.after.match(/\b\w+\b/g) || []
    ]);
    
    const suggestionWords = suggestion.match(/\b\w+\b/g) || [];
    const commonWords = suggestionWords.filter(word => contextWords.has(word));
    
    return commonWords.length > 0;
  }

  calculateInsertRange(context) {
    return {
      start: { line: context.lineNumber, character: context.current.length },
      end: { line: context.lineNumber, character: context.current.length }
    };
  }

  getCacheKey(code, position, language) {
    const contextHash = this.simpleHash(code.substring(Math.max(0, position - 200), position + 200));
    return `${language}_${position}_${contextHash}`;
  }

  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  updateCache(key, value) {
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }
}

module.exports = SuggestionEngine;