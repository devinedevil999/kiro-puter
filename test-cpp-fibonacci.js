// Test C++ Fibonacci English-to-Code Conversion
const AIPairProgrammerServer = require('./src/server');
const MockProvider = require('./src/providers/MockProvider');

async function testCppFibonacci() {
  console.log('🧪 Testing C++ Fibonacci English-to-Code Conversion\n');

  // Create server with mock provider
  const server = new AIPairProgrammerServer({
    port: 3000,
    wsPort: 3001,
    provider: 'mock'
  });

  // Override with mock provider for testing
  server.modelProvider = new MockProvider({ delay: 100 });
  server.suggestionEngine = new (require('./src/core/SuggestionEngine'))(server.modelProvider);

  // Test cases for C++ Fibonacci
  const testCases = [
    {
      name: '🔥 C++ Fibonacci - Exact Match',
      code: '// create function for fibonacci\n',
      cursorPosition: 30,
      language: 'cpp'
    },
    {
      name: '🔥 C++ Fibonacci - Simple',
      code: '// fibonacci\n',
      cursorPosition: 12,
      language: 'cpp'
    },
    {
      name: '🔥 C++ Function - Generic',
      code: '// create a function\n',
      cursorPosition: 19,
      language: 'cpp'
    },
    {
      name: '🔥 C++ Add Function',
      code: '// function that adds two numbers\n',
      cursorPosition: 33,
      language: 'cpp'
    },
    {
      name: '🔥 C++ Class',
      code: '// create a class\n',
      cursorPosition: 17,
      language: 'cpp'
    }
  ];

  console.log('Running C++ test cases...\n');

  for (const testCase of testCases) {
    console.log(`📝 Testing: ${testCase.name}`);
    console.log(`Code: "${testCase.code.trim()}"`);
    console.log(`Language: ${testCase.language}`);
    
    try {
      const suggestions = await server.suggestionEngine.generateSuggestions(
        testCase.code,
        testCase.cursorPosition,
        testCase.language,
        { maxTokens: 200, temperature: 0.3 }
      );

      if (suggestions.length > 0) {
        console.log('✅ Suggestions generated:');
        suggestions.forEach((suggestion, index) => {
          console.log(`   ${index + 1}. [${Math.round(suggestion.confidence * 100)}%] ${suggestion.type}`);
          console.log(`      Code Preview:`);
          const preview = suggestion.text.split('\n').slice(0, 5).join('\n');
          console.log(`      ${preview}${suggestion.text.split('\n').length > 5 ? '\n      ...' : ''}`);
        });
      } else {
        console.log('❌ No suggestions generated');
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
    
    console.log('');
  }

  console.log('🎉 C++ Fibonacci test completed!');
}

// Run the test
testCppFibonacci().catch(console.error);