// AI Pair Programmer Test Example
// This file demonstrates how the AI system can help with code completion

const AIPairProgrammerServer = require('./src/server');
const MockProvider = require('./src/providers/MockProvider');

async function testAIPairProgrammer() {
  console.log('🤖 Testing AI Pair Programmer System\n');

  // Create server with mock provider for testing
  const server = new AIPairProgrammerServer({
    port: 3000,
    wsPort: 3001,
    provider: 'mock'
  });

  // Override with mock provider for testing
  server.modelProvider = new MockProvider({ delay: 100 });
  server.suggestionEngine = new (require('./src/core/SuggestionEngine'))(server.modelProvider);

  // Test cases including English-to-Code conversion
  const testCases = [
    // Traditional code completion
    {
      name: 'Function Declaration',
      code: 'function calculateSum(',
      cursorPosition: 21,
      language: 'javascript'
    },
    {
      name: 'Class Definition',
      code: 'class UserManager {\n  constructor() {\n    ',
      cursorPosition: 35,
      language: 'javascript'
    },
    {
      name: 'Python Function',
      code: 'def process_data(',
      cursorPosition: 16,
      language: 'python'
    },
    {
      name: 'TypeScript Interface',
      code: 'interface User {\n  id: number;\n  ',
      cursorPosition: 30,
      language: 'typescript'
    },
    {
      name: 'Error Handling',
      code: 'try {\n  const data = await fetchData();\n  ',
      cursorPosition: 40,
      language: 'javascript'
    },
    
    // NEW: English-to-Code conversion test cases
    {
      name: '🗣️ English to JS: Create Function',
      code: '// create a function that adds two numbers\n',
      cursorPosition: 43,
      language: 'javascript'
    },
    {
      name: '🗣️ English to JS: Loop Array',
      code: '// loop through an array and print each item\n',
      cursorPosition: 45,
      language: 'javascript'
    },
    {
      name: '🗣️ English to JS: Async Function',
      code: '// async function to fetch data from API\n',
      cursorPosition: 40,
      language: 'javascript'
    },
    {
      name: '🗣️ English to Python: File Operations',
      code: '# read a file and return its contents\n',
      cursorPosition: 37,
      language: 'python'
    },
    {
      name: '🗣️ English to Python: Validation',
      code: '# validate input data and raise error if invalid\n',
      cursorPosition: 49,
      language: 'python'
    },
    {
      name: '🗣️ English to TS: Interface',
      code: '// create interface for user data\n',
      cursorPosition: 34,
      language: 'typescript'
    },
    {
      name: '🗣️ English to JS: Class Creation',
      code: '// create a class for managing users\n',
      cursorPosition: 37,
      language: 'javascript'
    },
    {
      name: '🗣️ English to JS: Array Operations',
      code: '// filter array of users by active status\n',
      cursorPosition: 42,
      language: 'javascript'
    }
  ];

  console.log('Running test cases...\n');

  for (const testCase of testCases) {
    console.log(`📝 Testing: ${testCase.name}`);
    console.log(`Code: "${testCase.code}"`);
    console.log(`Language: ${testCase.language}`);
    
    try {
      const suggestions = await server.suggestionEngine.generateSuggestions(
        testCase.code,
        testCase.cursorPosition,
        testCase.language,
        { maxTokens: 100, temperature: 0.3 }
      );

      if (suggestions.length > 0) {
        console.log('✅ Suggestions generated:');
        suggestions.forEach((suggestion, index) => {
          console.log(`   ${index + 1}. [${Math.round(suggestion.confidence * 100)}%] ${suggestion.type}`);
          console.log(`      "${suggestion.text.replace(/\n/g, '\\n')}"`);
        });
      } else {
        console.log('❌ No suggestions generated');
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
    
    console.log('');
  }

  // Test context management
  console.log('🧠 Testing Context Management\n');
  
  const sessionId = 'test_session_' + Date.now();
  server.contextManager.createSession(sessionId, { test: true });
  
  // Add some files to context
  server.contextManager.updateFileContext(sessionId, 'utils.js', `
    export function helper(data) {
      return data.map(item => item.value);
    }
    
    export const CONFIG = {
      apiUrl: 'https://api.example.com',
      timeout: 5000
    };
  `, 'javascript');

  server.contextManager.updateFileContext(sessionId, 'main.js', `
    import { helper, CONFIG } from './utils.js';
    
    async function processItems() {
      const items = await fetch(CONFIG.apiUrl);
      return helper(items);
    }
  `, 'javascript');

  const stats = server.contextManager.getSessionStats(sessionId);
  console.log('Session stats:', stats);

  const context = server.contextManager.getRelevantContext(sessionId, 'const result = helper(', 20);
  console.log('Relevant context files:', context.projectFiles.length);

  console.log('\n🎉 Test completed! Start the server with "npm start" to try the web interface.');
}

// Run tests if this file is executed directly
if (require.main === module) {
  testAIPairProgrammer().catch(console.error);
}

module.exports = testAIPairProgrammer;