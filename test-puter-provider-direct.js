// Direct test for PuterProvider C++ Fibonacci
const PuterProvider = require('./src/providers/PuterProvider');

async function testPuterProviderDirect() {
  console.log('🧪 Testing PuterProvider C++ Fibonacci Direct\n');

  // Create PuterProvider without API key (simulating web interface scenario)
  const puterProvider = new PuterProvider({});

  // Test the exact prompt that would be sent from the web interface
  const prompt = `You are an AI code generator that converts English descriptions to cpp code.

Code context:
\`\`\`cpp

\`\`\`

Convert this English description to cpp code:
"create febononacci recursive function"

Provide only the cpp code implementation. Do not include explanations or the original English text.`;

  console.log('📝 Testing PuterProvider with English-to-code prompt');
  console.log('Language: cpp');
  console.log('Prompt preview:', prompt.substring(0, 150) + '...');
  console.log('');

  try {
    const suggestions = await puterProvider.generateCompletion(prompt, {
      language: 'cpp',
      maxTokens: 300,
      temperature: 0.3
    });

    if (suggestions.length > 0) {
      console.log('✅ SUCCESS! PuterProvider Generated C++ Fibonacci Code:');
      console.log('=' .repeat(60));
      
      suggestions.forEach((suggestion, index) => {
        console.log(`\n🔥 Suggestion ${index + 1}:`);
        console.log('─'.repeat(40));
        console.log(suggestion);
        console.log('─'.repeat(40));
      });
      
      console.log('\n🎉 PuterProvider test PASSED!');
    } else {
      console.log('❌ FAILED: No suggestions generated from PuterProvider');
    }
  } catch (error) {
    console.log(`❌ ERROR: ${error.message}`);
    console.error(error);
  }

  console.log('\n' + '='.repeat(60));
  console.log('PuterProvider test completed!');
}

// Run the test
testPuterProviderDirect().catch(console.error);