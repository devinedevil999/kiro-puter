// Test Response Processing for Different AI Models
console.log('🧪 Testing Response Processing for Different AI Models\n');

// Simulate the processPuterResponse method
function processPuterResponse(aiResponse, language) {
    console.log('🔍 Processing Puter response:', JSON.stringify(aiResponse, null, 2));
    
    let content = '';
    
    // Extract content from Puter AI response - handle different response structures
    if (aiResponse && aiResponse.message && aiResponse.message.content) {
        // Check if content is an array (Claude format) or string (GPT format)
        if (Array.isArray(aiResponse.message.content)) {
            // Claude format: content is an array of objects
            content = aiResponse.message.content[0]?.text || '';
            console.log('✅ Found content in aiResponse.message.content[0].text (Claude format)');
        } else if (typeof aiResponse.message.content === 'string') {
            // GPT format: content is a string
            content = aiResponse.message.content;
            console.log('✅ Found content in aiResponse.message.content (GPT format)');
        } else {
            console.warn('❌ Unknown content format:', typeof aiResponse.message.content);
        }
    } else if (aiResponse && aiResponse.choices && aiResponse.choices.length > 0) {
        // OpenAI-style choices structure
        content = aiResponse.choices[0].message?.content || aiResponse.choices[0].text || '';
        console.log('✅ Found content in aiResponse.choices[0]');
    } else if (typeof aiResponse === 'string') {
        // Direct string response
        content = aiResponse;
        console.log('✅ Found string response');
    } else {
        console.warn('❌ Could not extract content from Puter response:', aiResponse);
    }

    // Ensure content is a string before processing
    if (typeof content !== 'string') {
        console.warn('❌ Content is not a string:', typeof content, content);
        return [];
    }

    content = content.trim();
    console.log('📝 Raw content:', content);
    
    // Clean up the response - remove code block markers
    content = content.replace(/^```[\w]*\n?/i, '').trim();
    content = content.replace(/```[\w]*$/i, '').trim();
    content = content.replace(/^(Here's the completion:|The code completion is:)/i, '').trim();
    content = content.replace(/\|CURSOR\|/g, '');

    console.log('🧹 Cleaned content:', content);

    if (!content) {
        console.warn('❌ No content after cleaning');
        return [];
    }

    // Create suggestion object
    const suggestion = {
        id: `puter_suggestion_${Date.now()}`,
        text: content,
        confidence: 0.8,
        type: 'function',
        language: language,
        insertText: content,
        source: 'puter'
    };

    console.log('✅ Created suggestion:', suggestion);
    return [suggestion];
}

// Test with GPT-4o Mini response (from server logs)
console.log('='.repeat(80));
console.log('📝 Testing GPT-4o Mini Response');
console.log('='.repeat(80));

const gptResponse = {
    "index": 0,
    "message": {
        "role": "assistant",
        "content": "```cpp\n#include <iostream>\n#include <vector>\n\nclass FibonacciSeries {\npublic:\n    FibonacciSeries(int n) : count(n) {\n        generateSeries();\n    }\n\n    void generateSeries() {\n        series.push_back(0);\n        if (count > 1) series.push_back(1);\n        for (int i = 2; i < count; ++i) {\n            series.push_back(series[i - 1] + series[i - 2]);\n        }\n    }\n\n    void printSeries() const {\n        for (const auto& num : series) {\n            std::cout << num << \" \";\n        }\n        std::cout << std::endl;\n    }\n\nprivate:\n    int count;\n    std::vector<int> series;\n};\n```",
        "refusal": null,
        "annotations": []
    }
};

const gptSuggestions = processPuterResponse(gptResponse, 'cpp');
console.log('\n🎉 GPT-4o Mini Result:', gptSuggestions.length > 0 ? 'SUCCESS' : 'FAILED');

// Test with Claude 3.5 Sonnet response (from server logs)
console.log('\n' + '='.repeat(80));
console.log('📝 Testing Claude 3.5 Sonnet Response');
console.log('='.repeat(80));

const claudeResponse = {
    "message": {
        "id": "msg_01HQKgC8euuCa37j6Pm3PiPE",
        "type": "message",
        "role": "assistant",
        "model": "claude-3-5-sonnet-20241022",
        "content": [
            {
                "type": "text",
                "text": "```cpp\nclass Fibonacci {\nprivate:\n    long long a, b;\n\npublic:\n    Fibonacci() : a(0), b(1) {}\n\n    void reset() {\n        a = 0;\n        b = 1;\n    }\n\n    long long next() {\n        long long temp = a + b;\n        a = b;\n        b = temp;\n        return a;\n    }\n\n    long long current() const {\n        return a;\n    }\n\n    void generateSeries(int n) {\n        reset();\n        for(int i = 0; i < n; i++) {\n            next();\n        }\n    }\n};\n```"
            }
        ]
    }
};

const claudeSuggestions = processPuterResponse(claudeResponse, 'cpp');
console.log('\n🎉 Claude 3.5 Sonnet Result:', claudeSuggestions.length > 0 ? 'SUCCESS' : 'FAILED');

console.log('\n' + '='.repeat(80));
console.log('🎉 Response Processing Test Completed!');
console.log('='.repeat(80));