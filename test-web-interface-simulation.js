// Test Web Interface Simulation for C++ Fibonacci
const AIPairProgrammerServer = require('./src/server');
const MockProvider = require('./src/providers/MockProvider');

async function testWebInterfaceSimulation() {
  console.log('🌐 Testing Web Interface Simulation for C++ Fibonacci\n');

  // Create server with mock provider (simulating fallback when Puter fails)
  const server = new AIPairProgrammerServer({
    port: 3000,
    wsPort: 3001,
    provider: 'puter'
  });

  // Test different cursor positions that might occur in the web interface
  const testScenarios = [
    {
      name: 'Cursor at end of comment (no newline)',
      code: '// create function for fibonacci',
      cursorPosition: 32, // At the end of the comment
      language: 'cpp'
    },
    {
      name: 'Cursor at end of comment (with newline)',
      code: '// create function for fibonacci\n',
      cursorPosition: 32, // Before the newline
      language: 'cpp'
    },
    {
      name: 'Cursor after newline',
      code: '// create function for fibonacci\n',
      cursorPosition: 33, // After the newline
      language: 'cpp'
    },
    {
      name: 'Cursor in middle of comment',
      code: '// create function for fibonacci',
      cursorPosition: 20, // In the middle
      language: 'cpp'
    }
  ];

  for (const scenario of testScenarios) {
    console.log(`📝 Testing: ${scenario.name}`);
    console.log(`Code: "${scenario.code}"`);
    console.log(`Cursor Position: ${scenario.cursorPosition}`);
    console.log(`Language: ${scenario.language}`);
    
    try {
      // Test the buildClientPrompt method (what gets sent to Puter)
      const context = server.contextManager.getRelevantContext('test_session', scenario.code, scenario.cursorPosition) || {};
      const prompt = server.buildClientPrompt(scenario.code, scenario.cursorPosition, scenario.language, context);
      
      console.log('\n🔍 Generated Prompt for Puter AI:');
      console.log('─'.repeat(50));
      console.log(prompt);
      console.log('─'.repeat(50));
      
      // Test with MockProvider fallback
      const mockProvider = new MockProvider({ delay: 10 });
      const suggestions = await mockProvider.generateCompletion(prompt, {
        language: scenario.language,
        maxTokens: 300,
        temperature: 0.3
      });

      if (suggestions.length > 0) {
        console.log('\n✅ MockProvider Suggestions:');
        suggestions.forEach((suggestion, index) => {
          console.log(`   ${index + 1}. ${suggestion.substring(0, 100)}${suggestion.length > 100 ? '...' : ''}`);
        });
      } else {
        console.log('\n❌ No suggestions from MockProvider');
      }
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
    
    console.log('\n' + '='.repeat(80) + '\n');
  }

  console.log('🎉 Web interface simulation test completed!');
}

// Run the test
testWebInterfaceSimulation().catch(console.error);