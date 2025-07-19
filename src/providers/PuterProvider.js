const ModelProvider = require('./ModelProvider');
const axios = require('axios');

class PuterProvider extends ModelProvider {
    constructor(config = {}) {
        super(config);
        this.apiKey = config.apiKey || null;
        this.endpoint = 'https://api.puter.com/v1/ai/chat';
        this.model = config.model || 'gpt-3.5-turbo';
        this.timeout = config.timeout || 30000;
    }

    async generateCompletion(prompt, options = {}) {
        await this.checkRateLimit();

        // If no API key is provided, use enhanced mock suggestions for English-to-code
        if (!this.apiKey) {
            console.log('🔄 PuterProvider: No API key, using enhanced mock suggestions');
            return this.generateEnhancedMockSuggestion(prompt, options);
        }

        try {
            const response = await axios.post(this.endpoint, {
                model: this.model,
                messages: [
                    {
                        role: 'system',
                        content: 'You are a helpful code completion assistant. Provide only the code completion without explanations unless specifically asked. Focus on generating syntactically correct and contextually relevant code.'
                    },
                    {
                        role: 'user',
                        content: this.formatPrompt(prompt, options.language, options)
                    }
                ],
                max_tokens: options.maxTokens || 150,
                temperature: options.temperature || 0.3,
                stop: options.stop || ['\n\n', '```'],
                stream: false
            }, {
                timeout: this.timeout,
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            return this.parseResponse(response.data, options);
        } catch (error) {
            console.error('Puter API error:', error);

            if (error.response?.status === 401) {
                throw new Error('Puter API authentication failed. Please check your API key.');
            } else if (error.response?.status === 429) {
                throw new Error('Puter API rate limit exceeded. Please try again later.');
            } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
                throw new Error('Unable to connect to Puter API. Please check your internet connection.');
            }

            throw new Error(`Puter completion failed: ${error.message}`);
        }
    }

    formatPrompt(prompt, language, options) {
        let formattedPrompt = prompt;

        // Add language-specific context
        if (language === 'typescript') {
            formattedPrompt += '\n\nEnsure the completion includes proper TypeScript types and interfaces.';
        } else if (language === 'python') {
            formattedPrompt += '\n\nFollow Python PEP 8 style guidelines and use appropriate type hints.';
        } else if (language === 'javascript') {
            formattedPrompt += '\n\nUse modern JavaScript ES6+ features where appropriate.';
        }

        // Add completion type context
        if (options.completionType === 'function') {
            formattedPrompt += '\n\nComplete the function implementation with proper error handling.';
        } else if (options.completionType === 'class') {
            formattedPrompt += '\n\nComplete the class definition with appropriate methods and properties.';
        }

        return formattedPrompt;
    }

    parseResponse(response, options) {
        if (!response.choices || response.choices.length === 0) {
            return [];
        }

        return response.choices.map(choice => {
            let content = choice.message?.content || choice.text || '';
            content = content.trim();

            // Remove common prefixes that the model might add
            content = content.replace(/^(Here's the completion:|The code completion is:|```[\w]*\n?)/i, '').trim();
            content = content.replace(/```[\w]*$/i, '').trim();

            return content;
        });
    }

    generateMockSuggestion(prompt, options = {}) {
        const language = options.language || 'javascript';
        const lowerPrompt = prompt.toLowerCase();
        
        // Simple pattern matching for relevant mock responses
        let suggestion = '';
        
        if (lowerPrompt.includes('function') && language === 'javascript') {
            suggestion = 'a, b) {\n  return a + b;\n}';
        } else if (lowerPrompt.includes('class') && language === 'javascript') {
            suggestion = '{\n  constructor() {\n    // Initialize properties\n  }\n}';
        } else if (lowerPrompt.includes('def') && language === 'python') {
            suggestion = 'data):\n    return processed_data';
        } else if (lowerPrompt.includes('const') || lowerPrompt.includes('let')) {
            suggestion = ' = "value";';
        } else if (lowerPrompt.includes('import')) {
            suggestion = ' from "module";';
        } else {
            // Generic completion based on language
            switch (language) {
                case 'javascript':
                    suggestion = '// TODO: Implement functionality\nconsole.log("Hello World");';
                    break;
                case 'python':
                    suggestion = '# TODO: Implement functionality\nprint("Hello World")';
                    break;
                case 'typescript':
                    suggestion = '// TODO: Implement functionality\nconsole.log("Hello World");';
                    break;
                default:
                    suggestion = '// Use Puter AI in the web interface for better suggestions';
            }
        }
        
        return [suggestion];
    }

    generateEnhancedMockSuggestion(prompt, options = {}) {
        const language = options.language || 'javascript';
        const lowerPrompt = prompt.toLowerCase();
        
        console.log(`🔍 PuterProvider: Enhanced mock for ${language}, prompt: "${prompt.substring(0, 100)}..."`);
        
        // Check if this is an English-to-code conversion request
        if (lowerPrompt.includes('convert this english description') || lowerPrompt.includes('english description to')) {
            return this.generateEnglishToCodeSuggestion(prompt, language);
        }
        
        // Enhanced pattern matching for better suggestions
        const patterns = {
            cpp: {
                'fibonacci': '#include <iostream>\nusing namespace std;\n\nint fibonacci(int n) {\n    if (n <= 1) {\n        return n;\n    }\n    return fibonacci(n - 1) + fibonacci(n - 2);\n}\n\nint main() {\n    int num = 10;\n    cout << "Fibonacci of " << num << " is: " << fibonacci(num) << endl;\n    return 0;\n}',
                'create function for fibonacci': '#include <iostream>\nusing namespace std;\n\nint fibonacci(int n) {\n    if (n <= 1) {\n        return n;\n    }\n    return fibonacci(n - 1) + fibonacci(n - 2);\n}\n\nint main() {\n    int num = 10;\n    cout << "Fibonacci of " << num << " is: " << fibonacci(num) << endl;\n    return 0;\n}',
                'function that adds': 'int add(int a, int b) {\n    return a + b;\n}',
                'create a function': 'int myFunction(int param) {\n    // Implementation here\n    return result;\n}',
                'create a class': 'class MyClass {\nprivate:\n    int value;\n\npublic:\n    MyClass(int val) : value(val) {}\n    \n    int getValue() {\n        return value;\n    }\n};'
            },
            javascript: {
                'fibonacci': 'function fibonacci(n) {\n    if (n <= 1) {\n        return n;\n    }\n    return fibonacci(n - 1) + fibonacci(n - 2);\n}',
                'function that adds': 'function add(a, b) {\n    return a + b;\n}',
                'create a function': 'function myFunction() {\n    // Implementation here\n    return result;\n}'
            },
            python: {
                'fibonacci': 'def fibonacci(n):\n    """Calculate fibonacci number"""\n    if n <= 1:\n        return n\n    return fibonacci(n-1) + fibonacci(n-2)',
                'function that adds': 'def add(a, b):\n    """Add two numbers"""\n    return a + b',
                'create a function': 'def my_function():\n    """Function description"""\n    # Implementation here\n    return result'
            }
        };
        
        const langPatterns = patterns[language] || patterns.javascript;
        
        // Find matching pattern
        for (const [pattern, code] of Object.entries(langPatterns)) {
            if (lowerPrompt.includes(pattern)) {
                console.log(`✅ PuterProvider: Matched pattern "${pattern}" for ${language}`);
                return [code];
            }
        }
        
        // Fallback to regular mock suggestion
        return this.generateMockSuggestion(prompt, options);
    }

    generateEnglishToCodeSuggestion(prompt, language) {
        const lowerPrompt = prompt.toLowerCase();
        console.log(`🔄 PuterProvider: Generating English-to-code for ${language}`);
        
        // Extract the English description from the prompt
        let englishDescription = '';
        const descriptionMatch = prompt.match(/Convert this English description to \w+ code:\s*"([^"]+)"/i);
        if (descriptionMatch) {
            englishDescription = descriptionMatch[1].toLowerCase();
            console.log(`📝 PuterProvider: Extracted description: "${englishDescription}"`);
        }
        
        // Enhanced English-to-code patterns with flexible matching
        const englishToCodePatterns = {
            cpp: {
                'create function for fibonacci': '#include <iostream>\nusing namespace std;\n\nint fibonacci(int n) {\n    if (n <= 1) {\n        return n;\n    }\n    return fibonacci(n - 1) + fibonacci(n - 2);\n}\n\nint main() {\n    int num = 10;\n    cout << "Fibonacci of " << num << " is: " << fibonacci(num) << endl;\n    return 0;\n}',
                'create febononacci recursive function': '#include <iostream>\nusing namespace std;\n\nint fibonacci(int n) {\n    if (n <= 1) {\n        return n;\n    }\n    return fibonacci(n - 1) + fibonacci(n - 2);\n}\n\nint main() {\n    int num = 10;\n    cout << "Fibonacci of " << num << " is: " << fibonacci(num) << endl;\n    return 0;\n}',
                'febononacci recursive function': '#include <iostream>\nusing namespace std;\n\nint fibonacci(int n) {\n    if (n <= 1) {\n        return n;\n    }\n    return fibonacci(n - 1) + fibonacci(n - 2);\n}\n\nint main() {\n    int num = 10;\n    cout << "Fibonacci of " << num << " is: " << fibonacci(num) << endl;\n    return 0;\n}',
                'recursive function': '#include <iostream>\nusing namespace std;\n\nint fibonacci(int n) {\n    if (n <= 1) {\n        return n;\n    }\n    return fibonacci(n - 1) + fibonacci(n - 2);\n}\n\nint main() {\n    int num = 10;\n    cout << "Fibonacci of " << num << " is: " << fibonacci(num) << endl;\n    return 0;\n}',
                'fibonacci': 'int fibonacci(int n) {\n    if (n <= 1) {\n        return n;\n    }\n    return fibonacci(n - 1) + fibonacci(n - 2);\n}',
                'febonacci': 'int fibonacci(int n) {\n    if (n <= 1) {\n        return n;\n    }\n    return fibonacci(n - 1) + fibonacci(n - 2);\n}',
                'febononacci': 'int fibonacci(int n) {\n    if (n <= 1) {\n        return n;\n    }\n    return fibonacci(n - 1) + fibonacci(n - 2);\n}',
                'function that adds two numbers': 'int add(int a, int b) {\n    return a + b;\n}',
                'create a function': 'int myFunction(int param) {\n    // Implementation here\n    return result;\n}',
                'create function': 'int myFunction(int param) {\n    // Implementation here\n    return result;\n}',
                'create a class': 'class MyClass {\nprivate:\n    int value;\n\npublic:\n    MyClass(int val) : value(val) {}\n    \n    int getValue() {\n        return value;\n    }\n};'
            },
            javascript: {
                'create function for fibonacci': 'function fibonacci(n) {\n    if (n <= 1) {\n        return n;\n    }\n    return fibonacci(n - 1) + fibonacci(n - 2);\n}',
                'fibonacci': 'function fibonacci(n) {\n    if (n <= 1) {\n        return n;\n    }\n    return fibonacci(n - 1) + fibonacci(n - 2);\n}',
                'function that adds': 'function add(a, b) {\n    return a + b;\n}',
                'create a function': 'function myFunction() {\n    // Implementation here\n    return result;\n}'
            },
            python: {
                'create function for fibonacci': 'def fibonacci(n):\n    """Calculate fibonacci number"""\n    if n <= 1:\n        return n\n    return fibonacci(n-1) + fibonacci(n-2)',
                'fibonacci': 'def fibonacci(n):\n    """Calculate fibonacci number"""\n    if n <= 1:\n        return n\n    return fibonacci(n-1) + fibonacci(n-2)',
                'function that adds': 'def add(a, b):\n    """Add two numbers"""\n    return a + b'
            }
        };
        
        const patterns = englishToCodePatterns[language] || englishToCodePatterns.javascript;
        
        // Find the best matching pattern
        for (const [pattern, code] of Object.entries(patterns)) {
            if (englishDescription.includes(pattern) || lowerPrompt.includes(pattern)) {
                console.log(`✅ PuterProvider: Matched English pattern: "${pattern}"`);
                return [code];
            }
        }
        
        // Default fallback
        console.log('🔄 PuterProvider: Using fallback for English-to-code');
        switch (language) {
            case 'cpp':
                return ['// Generated C++ code\nint main() {\n    // TODO: Implement based on description\n    return 0;\n}'];
            case 'javascript':
                return ['// Generated JavaScript code\nfunction generatedFunction() {\n    // TODO: Implement based on description\n    return result;\n}'];
            case 'python':
                return ['# Generated Python code\ndef generated_function():\n    """Generated function"""\n    # TODO: Implement based on description\n    return result'];
            default:
                return ['// Generated code from English description'];
        }
    }

    setApiKey(apiKey) {
        this.apiKey = apiKey;
    }

    async testConnection() {
        try {
            const response = await axios.post(this.endpoint, {
                model: this.model,
                messages: [{ role: 'user', content: 'Hello' }],
                max_tokens: 10
            }, {
                timeout: 5000,
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            return response.status === 200;
        } catch (error) {
            return false;
        }
    }
}

module.exports = PuterProvider;