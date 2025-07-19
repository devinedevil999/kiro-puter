// Direct test for C++ Fibonacci English-to-Code Conversion
const AIPairProgrammerServer = require('./src/server');
const MockProvider = require('./src/providers/MockProvider');

async function testCppFibonacciDirect() {
  console.log('🧪 Direct C++ Fibonacci Test\n');

  // Create server with mock provider
  const server = new AIPairProgrammerServer({
    port: 3000,
    wsPort: 3001,
    provider: 'mock'
  });

  // Override with mock provider for testing
  server.modelProvider = new MockProvider({ delay: 10 });
  server.suggestionEngine = new (require('./src/core/SuggestionEngine'))(server.modelProvider);

  // Test the exact scenario: "// create function for fibonacci" in C++
  const testCode = '// create function for fibonacci\n';
  const cursorPosition = testCode.length - 1; // Position cursor at end of comment, not after newline
  const language = 'cpp';

  console.log('📝 Testing C++ Fibonacci Generation');
  console.log(`Input: "${testCode.trim()}"`);
  console.log(`Language: ${language}`);
  console.log(`Cursor Position: ${cursorPosition}`);
  console.log('');

  // Test the detection logic directly
  const context = server.suggestionEngine.analyzer.getContextWindow(testCode, cursorPosition);
  const isEnglishToCode = server.suggestionEngine.detectEnglishToCode(context.current, context.before);
  console.log(`🔍 English-to-code detection result: ${isEnglishToCode}`);
  console.log(`Current line: "${context.current}"`);
  console.log('');

  try {
    const suggestions = await server.suggestionEngine.generateSuggestions(
      testCode,
      cursorPosition,
      language,
      { maxTokens: 300, temperature: 0.3 }
    );

    if (suggestions.length > 0) {
      console.log('✅ SUCCESS! Generated C++ Fibonacci Code:');
      console.log('=' .repeat(60));
      
      suggestions.forEach((suggestion, index) => {
        console.log(`\n🔥 Suggestion ${index + 1} (${Math.round(suggestion.confidence * 100)}% confidence):`);
        console.log('─'.repeat(40));
        console.log(suggestion.text);
        console.log('─'.repeat(40));
        console.log(`Type: ${suggestion.type}`);
        console.log(`Language: ${suggestion.language}`);
      });
      
      console.log('\n🎉 Test PASSED! The C++ Fibonacci function was generated successfully!');
    } else {
      console.log('❌ FAILED: No suggestions generated');
    }
  } catch (error) {
    console.log(`❌ ERROR: ${error.message}`);
    console.error(error);
  }

  console.log('\n' + '='.repeat(60));
  console.log('Test completed!');
}

// Run the test
testCppFibonacciDirect().catch(console.error);