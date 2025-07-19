# AI Pair Programmer

A sophisticated AI-powered code completion and suggestion system similar to GitHub Copilot, built with Node.js and modern web technologies. **Now with FREE AI powered by Puter!**

## ✨ Features

🆓 **FREE AI Integration with Puter**
- **No API keys required!** Uses Puter's free AI service
- **16+ AI Models Available**: GPT-4o, Claude 3.5, Gemini, Llama, Mixtral, and more
- All models accessible for free through Puter's platform
- Instant setup - works out of the box

🤖 **Intelligent Code Completion**
- Context-aware code suggestions
- Multi-language support (JavaScript, TypeScript, Python, Java, C++)
- Real-time suggestions as you type
- High-confidence scoring and ranking

🗣️ **English-to-Code Conversion (NEW!)**
- Convert plain English descriptions to working code
- Natural language programming interface
- Smart detection of English vs code context
- Support for complex programming concepts

🧠 **Smart Context Management**
- Project-wide context understanding
- File relationship analysis
- Framework detection (React, Vue, Angular, Express, Django, Flask)
- Session-based learning

⚡ **Multiple AI Providers**
- **🆓 Puter AI** - Free GPT-3.5-turbo (recommended)
- OpenAI GPT integration (requires API key)
- Local model support (Ollama/CodeLlama)
- Extensible provider architecture

🔌 **IDE Integration Ready**
- Language Server Protocol support
- WebSocket real-time communication
- REST API for easy integration

## 🚀 Quick Start (FREE!)

### Prerequisites

- Node.js 16+ 
- npm or yarn
- **That's it!** No API keys needed with Puter's free AI

### Installation

1. **Clone and install dependencies:**
```bash
git clone <repository-url>
cd ai-pair-programmer
npm install
```

2. **Start the server (uses FREE Puter AI by default):**
```bash
npm start
```

3. **Open the demo interface:**
Navigate to `http://localhost:3000` in your browser

**🎉 You're ready to go! The system uses Puter's free AI service automatically.**

### Alternative AI Providers (Optional)

**Option A: OpenAI (requires API key)**
```bash
export OPENAI_API_KEY="your-openai-api-key"
export MODEL_PROVIDER="openai"
npm start
```

**Option B: Local Model (Ollama)**
```bash
# Install Ollama first: https://ollama.ai
ollama pull codellama
export MODEL_PROVIDER="local"
export LOCAL_MODEL="codellama"
npm start
```

## Usage

### Web Interface

The included web demo provides a VS Code-like interface where you can:

- Type code and get real-time AI suggestions
- Use `Ctrl+Space` to manually trigger suggestions
- Press `Tab` to accept the first suggestion
- Use arrow keys to navigate between suggestions
- Switch between programming languages
- **Select from 16+ AI models** via dropdown menu

### 🤖 AI Model Selection

Choose from a comprehensive selection of state-of-the-art AI models, all available for **FREE** through Puter:

#### **OpenAI Models**
- **GPT-4o Mini** - Fast, efficient, and cost-effective (Recommended for most tasks)
- **GPT-4o** - Latest and most capable GPT-4 model
- **GPT-4 Turbo** - Enhanced GPT-4 with improved performance
- **GPT-4** - Original GPT-4 model
- **GPT-3.5 Turbo** - Fast and reliable for general tasks

#### **Anthropic Claude Models**
- **Claude 3.5 Sonnet** - Excellent for code generation and analysis
- **Claude 3.5 Haiku** - Fast and efficient for quick tasks
- **Claude 3 Opus** - Most capable Claude model for complex reasoning

#### **Google Gemini Models**
- **Gemini 1.5 Flash** - Fast multimodal model
- **Gemini 1.5 Pro** - Advanced reasoning and code understanding

#### **Meta Llama Models**
- **Llama 3.1 Sonar Large** - Enhanced with web search capabilities
- **Llama 3.1 Sonar Small** - Compact version with search
- **Llama 3.1 70B** - Large parameter model for complex tasks
- **Llama 3.1 8B** - Efficient model for general use

#### **Mistral Models**
- **Mixtral 8x7B** - Mixture of experts model
- **Mistral 7B** - Efficient and capable base model

#### **Model Selection Tips**
- **For beginners**: Start with GPT-4o Mini (fast and reliable)
- **For complex code**: Use GPT-4o or Claude 3.5 Sonnet
- **For speed**: Try Gemini 1.5 Flash or Llama 3.1 8B
- **For research**: Experiment with different models to find your preference

### 🗣️ English-to-Code Conversion

**Revolutionary Feature**: Simply describe what you want in plain English, and watch it convert to working code!

#### JavaScript Examples

```javascript
// Input: "create a function that adds two numbers"
// Output:
function add(a, b) {
  return a + b;
}

// Input: "loop through an array and print each item"
// Output:
for (let i = 0; i < array.length; i++) {
  console.log(array[i]);
}

// Input: "async function to fetch data from API"
// Output:
async function fetchData(url) {
  try {
    const response = await fetch(url);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Fetch error:", error);
  }
}
```

#### Python Examples

```python
# Input: "create a function that calculates fibonacci"
# Output:
def fibonacci(n):
    """Calculate fibonacci number"""
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

# Input: "read a file and return its contents"
# Output:
with open("filename.txt", "r") as file:
    content = file.read()
    return content

# Input: "validate input data and raise error if invalid"
# Output:
def validate(input_data):
    """Validate input data"""
    if not input_data:
        raise ValueError("Invalid input")
    return True
```

#### TypeScript Examples

```typescript
// Input: "create interface for user data"
// Output:
interface User {
  id: number;
  name: string;
  email: string;
}

// Input: "async function with proper error handling"
// Output:
async function asyncFunction(): Promise<ReturnType> {
  try {
    const result = await someAsyncOperation();
    return result;
  } catch (error) {
    console.error(error);
    throw error;
  }
}
```

#### How It Works

1. **Smart Detection**: The system automatically detects when you're writing English descriptions vs code
2. **Context Awareness**: Uses surrounding code context to generate relevant implementations
3. **Multi-Language**: Works across JavaScript, TypeScript, Python, and more
4. **Natural Language**: Understands common programming concepts in plain English

### API Integration

#### Get Code Suggestions

```javascript
POST /suggestions
{
  "code": "function calculateSum(",
  "cursorPosition": 21,
  "language": "javascript",
  "sessionId": "optional-session-id",
  "options": {
    "maxTokens": 150,
    "temperature": 0.3
  }
}
```

Response:
```javascript
{
  "suggestions": [
    {
      "id": "suggestion_1",
      "text": "a, b) {\n  return a + b;\n}",
      "confidence": 0.85,
      "type": "function",
      "language": "javascript"
    }
  ]
}
```

#### Session Management

```javascript
// Create session
POST /session
{
  "metadata": {
    "projectName": "my-project",
    "language": "javascript"
  }
}

// Update project context
POST /context
{
  "sessionId": "session_id",
  "files": [
    {
      "path": "src/utils.js",
      "content": "export function helper() { ... }",
      "language": "javascript"
    }
  ],
  "dependencies": ["react", "lodash"]
}
```

### WebSocket Integration

```javascript
const ws = new WebSocket('ws://localhost:3001');

ws.send(JSON.stringify({
  type: 'suggestion_request',
  code: 'function hello(',
  cursorPosition: 14,
  language: 'javascript'
}));

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'suggestions') {
    console.log('Received suggestions:', data.suggestions);
  }
};
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | HTTP server port | 3000 |
| `WS_PORT` | WebSocket server port | 3001 |
| `MODEL_PROVIDER` | AI provider (`openai` or `local`) | openai |
| `OPENAI_API_KEY` | OpenAI API key | - |
| `OPENAI_MODEL` | OpenAI model name | gpt-3.5-turbo |
| `LOCAL_MODEL_ENDPOINT` | Local model API endpoint | http://localhost:11434/api/generate |
| `LOCAL_MODEL` | Local model name | codellama |

### Provider Configuration

**OpenAI Provider:**
```javascript
const config = {
  provider: 'openai',
  openai: {
    apiKey: 'your-api-key',
    model: 'gpt-3.5-turbo', // or 'gpt-4'
    maxRequestsPerMinute: 60
  }
};
```

**Local Model Provider:**
```javascript
const config = {
  provider: 'local',
  local: {
    endpoint: 'http://localhost:11434/api/generate',
    model: 'codellama',
    timeout: 30000
  }
};
```

## Architecture

### Core Components

1. **SuggestionEngine** - Main orchestrator for generating code suggestions
2. **CodeAnalyzer** - Analyzes code structure and extracts context
3. **ContextManager** - Manages user sessions and project context
4. **ModelProvider** - Abstract interface for AI model providers
5. **Server** - Express.js server with REST API and WebSocket support

### Supported Languages

- **JavaScript** - Full support with ES6+ features
- **TypeScript** - Type-aware suggestions
- **Python** - PEP 8 compliant suggestions
- **Java** - Object-oriented patterns
- **C++** - Modern C++ standards

### Framework Detection

The system automatically detects and adapts to popular frameworks:

- **Frontend**: React, Vue.js, Angular
- **Backend**: Express.js, Django, Flask
- **Mobile**: React Native

## Development

### Running in Development Mode

```bash
npm run dev  # Uses nodemon for auto-restart
```

### Testing

```bash
npm test
```

### Adding New Providers

1. Extend the `ModelProvider` base class:

```javascript
const ModelProvider = require('./ModelProvider');

class CustomProvider extends ModelProvider {
  async generateCompletion(prompt, options) {
    // Implement your provider logic
    return suggestions;
  }
}
```

2. Register in the server configuration:

```javascript
case 'custom':
  this.modelProvider = new CustomProvider(this.config.custom);
  break;
```

## Performance Tips

1. **Use Sessions** - Sessions enable better context understanding
2. **Optimize Context** - Limit file sizes in project context
3. **Cache Suggestions** - Built-in caching reduces API calls
4. **Local Models** - Use local models for faster responses

## Troubleshooting

### Common Issues

**"OpenAI API key not found"**
- Set the `OPENAI_API_KEY` environment variable
- Verify your API key is valid and has sufficient credits

**"Local model server not running"**
- Install and start Ollama: `ollama serve`
- Pull the required model: `ollama pull codellama`

**"WebSocket connection failed"**
- Check if port 3001 is available
- Verify firewall settings

### Debug Mode

Enable detailed logging:
```bash
DEBUG=ai-pair-programmer:* npm start
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Roadmap

- [ ] VS Code extension
- [ ] JetBrains plugin support
- [ ] Multi-file refactoring suggestions
- [ ] Code explanation and documentation
- [ ] Integration with more AI providers
- [ ] Collaborative coding features