const ModelProvider = require('./ModelProvider');

class MockProvider extends ModelProvider {
  constructor(config = {}) {
    super(config);
    this.delay = config.delay || 500; // Simulate network delay
    this.mockResponses = {
      javascript: [
        'const result = a + b;\nreturn result;',
        'if (condition) {\n  return true;\n}',
        'const items = array.map(item => item.value);',
        'try {\n  // implementation\n} catch (error) {\n  console.error(error);\n}'
      ],
      python: [
        'def calculate_sum(a, b):\n    return a + b',
        'if condition:\n    return True',
        'items = [item.value for item in array]',
        'try:\n    # implementation\n    pass\nexcept Exception as e:\n    print(f"Error: {e}")'
      ],
      typescript: [
        'const result: number = a + b;\nreturn result;',
        'if (condition): boolean {\n  return true;\n}',
        'const items: string[] = array.map((item: Item) => item.value);',
        'interface User {\n  id: number;\n  name: string;\n}'
      ]
    };
  }

  async generateCompletion(prompt, options = {}) {
    if (this.shouldError) {
      throw new Error('Mock provider error simulation');
    }

    await this.checkRateLimit();

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, this.delay));

    const language = options.language || 'javascript';
    const lowerPrompt = prompt.toLowerCase();

    // Check if this is an English-to-code conversion request
    if (lowerPrompt.includes('convert this english description') || lowerPrompt.includes('english description to')) {
      return this.generateEnglishToCodeSuggestion(prompt, language);
    }

    const responses = this.mockResponses[language] || this.mockResponses.javascript;

    // Simple pattern matching for more relevant responses
    let selectedResponse;

    if (lowerPrompt.includes('function') || lowerPrompt.includes('def')) {
      selectedResponse = responses[0]; // Function-like response
    } else if (lowerPrompt.includes('if') || lowerPrompt.includes('condition')) {
      selectedResponse = responses[1]; // Conditional response
    } else if (lowerPrompt.includes('map') || lowerPrompt.includes('array') || lowerPrompt.includes('list')) {
      selectedResponse = responses[2]; // Array/list response
    } else if (lowerPrompt.includes('try') || lowerPrompt.includes('error')) {
      selectedResponse = responses[3]; // Error handling response
    } else {
      // Random selection
      selectedResponse = responses[Math.floor(Math.random() * responses.length)];
    }

    // Add some variation
    if (Math.random() > 0.7) {
      selectedResponse = this.addVariation(selectedResponse, language);
    }

    return [selectedResponse];
  }

  addVariation(response, language) {
    const variations = {
      javascript: {
        'const ': ['let ', 'var '],
        'console.error': ['console.log', 'console.warn'],
        '===': ['==', '!=='],
        'true': ['false'],
        'return': ['return']
      },
      python: {
        'def ': ['def '],
        'print(': ['print('],
        'True': ['False'],
        'return': ['return']
      }
    };

    const langVariations = variations[language];
    if (!langVariations) return response;

    let varied = response;
    for (const [original, replacements] of Object.entries(langVariations)) {
      if (varied.includes(original) && Math.random() > 0.5) {
        const replacement = replacements[Math.floor(Math.random() * replacements.length)];
        varied = varied.replace(original, replacement);
      }
    }

    return varied;
  }

  formatPrompt(prompt, language, options) {
    // Mock provider doesn't need special formatting
    return prompt;
  }

  parseResponse(response, options) {
    return Array.isArray(response) ? response : [response];
  }

  // Mock-specific methods for testing
  setDelay(delay) {
    this.delay = delay;
  }

  addMockResponse(language, response) {
    if (!this.mockResponses[language]) {
      this.mockResponses[language] = [];
    }
    this.mockResponses[language].push(response);
  }

  clearMockResponses(language) {
    if (language) {
      this.mockResponses[language] = [];
    } else {
      this.mockResponses = {};
    }
  }

  simulateError(shouldError = true) {
    this.shouldError = shouldError;
  }

  generateEnglishToCodeSuggestion(prompt, language) {
    const lowerPrompt = prompt.toLowerCase();
    console.log(`🔍 Generating English-to-code for: "${prompt}"`); // Debug log

    // Extract the English description from the prompt
    let englishDescription = '';
    const descriptionMatch = prompt.match(/Convert this English description to \w+ code:\s*"([^"]+)"/i);
    if (descriptionMatch) {
      englishDescription = descriptionMatch[1].toLowerCase();
      console.log(`📝 Extracted description: "${englishDescription}"`); // Debug log
    } else {
      // Fallback: try to extract from comment patterns
      const commentMatch = prompt.match(/\/\/\s*(.+)|#\s*(.+)/);
      if (commentMatch) {
        englishDescription = (commentMatch[1] || commentMatch[2]).toLowerCase();
        console.log(`💬 Extracted from comment: "${englishDescription}"`); // Debug log
      }
    }

    // Extract common English-to-code patterns and generate appropriate code
    const englishToCodePatterns = {
      javascript: {
        'create a function': 'function myFunction() {\n  // Implementation here\n  return result;\n}',
        'function that adds': 'function add(a, b) {\n  return a + b;\n}',
        'function that calculates': 'function calculate(input) {\n  // Calculation logic\n  return result;\n}',
        'create a class': 'class MyClass {\n  constructor() {\n    // Initialize properties\n  }\n\n  method() {\n    // Method implementation\n  }\n}',
        'loop through': 'for (let i = 0; i < array.length; i++) {\n  // Process array[i]\n  console.log(array[i]);\n}',
        'iterate over': 'array.forEach(item => {\n  // Process each item\n  console.log(item);\n});',
        'check if': 'if (condition) {\n  // Handle true case\n  return true;\n} else {\n  // Handle false case\n  return false;\n}',
        'validate': 'function validate(input) {\n  if (!input) {\n    throw new Error("Invalid input");\n  }\n  return true;\n}',
        'sort array': 'array.sort((a, b) => a - b);',
        'filter array': 'const filtered = array.filter(item => item.condition);',
        'map array': 'const mapped = array.map(item => item.property);',
        'async function': 'async function asyncFunction() {\n  try {\n    const result = await someAsyncOperation();\n    return result;\n  } catch (error) {\n    console.error(error);\n  }\n}',
        'fetch data': 'async function fetchData(url) {\n  try {\n    const response = await fetch(url);\n    const data = await response.json();\n    return data;\n  } catch (error) {\n    console.error("Fetch error:", error);\n  }\n}'
      },
      python: {
        'create a function': 'def my_function():\n    """Function description"""\n    # Implementation here\n    return result',
        'function that adds': 'def add(a, b):\n    """Add two numbers"""\n    return a + b',
        'function that calculates': 'def calculate(input_value):\n    """Calculate result"""\n    # Calculation logic\n    return result',
        'create a class': 'class MyClass:\n    def __init__(self):\n        """Initialize the class"""\n        # Initialize properties\n        pass\n\n    def method(self):\n        """Method description"""\n        # Method implementation\n        pass',
        'loop through': 'for item in items:\n    # Process each item\n    print(item)',
        'iterate over': 'for i, item in enumerate(items):\n    # Process item with index\n    print(f"{i}: {item}")',
        'check if': 'if condition:\n    # Handle true case\n    return True\nelse:\n    # Handle false case\n    return False',
        'validate': 'def validate(input_data):\n    """Validate input data"""\n    if not input_data:\n        raise ValueError("Invalid input")\n    return True',
        'sort list': 'sorted_list = sorted(my_list)',
        'filter list': 'filtered_list = [item for item in my_list if condition]',
        'map list': 'mapped_list = [item.property for item in my_list]',
        'read file': 'with open("filename.txt", "r") as file:\n    content = file.read()\n    return content',
        'write file': 'with open("filename.txt", "w") as file:\n    file.write(content)'
      },
      typescript: {
        'create a function': 'function myFunction(): ReturnType {\n  // Implementation here\n  return result;\n}',
        'function that adds': 'function add(a: number, b: number): number {\n  return a + b;\n}',
        'create interface': 'interface MyInterface {\n  property: string;\n  method(): void;\n}',
        'create a class': 'class MyClass {\n  private property: string;\n\n  constructor(property: string) {\n    this.property = property;\n  }\n\n  public method(): void {\n    // Method implementation\n  }\n}',
        'async function': 'async function asyncFunction(): Promise<ReturnType> {\n  try {\n    const result = await someAsyncOperation();\n    return result;\n  } catch (error) {\n    console.error(error);\n    throw error;\n  }\n}'
      },
      cpp: {
        'create function for fibonacci': '#include <iostream>\nusing namespace std;\n\nint fibonacci(int n) {\n    if (n <= 1) {\n        return n;\n    }\n    return fibonacci(n - 1) + fibonacci(n - 2);\n}\n\nint main() {\n    int num = 10;\n    cout << "Fibonacci of " << num << " is: " << fibonacci(num) << endl;\n    return 0;\n}',
        'fibonacci': 'int fibonacci(int n) {\n    if (n <= 1) {\n        return n;\n    }\n    return fibonacci(n - 1) + fibonacci(n - 2);\n}',
        'create a function': 'int myFunction(int param) {\n    // Implementation here\n    return result;\n}',
        'function that adds': 'int add(int a, int b) {\n    return a + b;\n}',
        'function that calculates': 'int calculate(int input) {\n    // Calculation logic\n    int result = input * 2;\n    return result;\n}',
        'create a class': 'class MyClass {\nprivate:\n    int value;\n\npublic:\n    MyClass(int val) : value(val) {}\n    \n    int getValue() {\n        return value;\n    }\n    \n    void setValue(int val) {\n        value = val;\n    }\n};',
        'loop through array': 'int arr[] = {1, 2, 3, 4, 5};\nint size = sizeof(arr) / sizeof(arr[0]);\n\nfor (int i = 0; i < size; i++) {\n    cout << arr[i] << " ";\n}',
        'sort array': '#include <algorithm>\n#include <vector>\n\nvector<int> arr = {5, 2, 8, 1, 9};\nsort(arr.begin(), arr.end());',
        'read file': '#include <fstream>\n#include <string>\n\nstring readFile(const string& filename) {\n    ifstream file(filename);\n    string content, line;\n    \n    while (getline(file, line)) {\n        content += line + "\\n";\n    }\n    \n    file.close();\n    return content;\n}',
        'write file': '#include <fstream>\n\nvoid writeFile(const string& filename, const string& content) {\n    ofstream file(filename);\n    file << content;\n    file.close();\n}'
      },
      c: {
        'fibonacci': '#include <stdio.h>\n\nint fibonacci(int n) {\n    if (n <= 1) {\n        return n;\n    }\n    return fibonacci(n - 1) + fibonacci(n - 2);\n}\n\nint main() {\n    int num = 10;\n    printf("Fibonacci of %d is: %d\\n", num, fibonacci(num));\n    return 0;\n}',
        'create a function': 'int myFunction(int param) {\n    // Implementation here\n    return result;\n}',
        'function that adds': 'int add(int a, int b) {\n    return a + b;\n}',
        'loop through array': 'int arr[] = {1, 2, 3, 4, 5};\nint size = sizeof(arr) / sizeof(arr[0]);\n\nfor (int i = 0; i < size; i++) {\n    printf("%d ", arr[i]);\n}',
        'read file': '#include <stdio.h>\n\nvoid readFile(const char* filename) {\n    FILE* file = fopen(filename, "r");\n    if (file == NULL) {\n        printf("Error opening file\\n");\n        return;\n    }\n    \n    char buffer[1000];\n    while (fgets(buffer, sizeof(buffer), file)) {\n        printf("%s", buffer);\n    }\n    \n    fclose(file);\n}'
      },
      java: {
        'fibonacci': 'public class Fibonacci {\n    public static int fibonacci(int n) {\n        if (n <= 1) {\n            return n;\n        }\n        return fibonacci(n - 1) + fibonacci(n - 2);\n    }\n    \n    public static void main(String[] args) {\n        int num = 10;\n        System.out.println("Fibonacci of " + num + " is: " + fibonacci(num));\n    }\n}',
        'create a function': 'public int myFunction(int param) {\n    // Implementation here\n    return result;\n}',
        'function that adds': 'public int add(int a, int b) {\n    return a + b;\n}',
        'create a class': 'public class MyClass {\n    private int value;\n    \n    public MyClass(int value) {\n        this.value = value;\n    }\n    \n    public int getValue() {\n        return value;\n    }\n    \n    public void setValue(int value) {\n        this.value = value;\n    }\n}',
        'loop through array': 'int[] arr = {1, 2, 3, 4, 5};\n\nfor (int i = 0; i < arr.length; i++) {\n    System.out.println(arr[i]);\n}',
        'read file': 'import java.io.*;\nimport java.nio.file.*;\n\npublic String readFile(String filename) throws IOException {\n    return new String(Files.readAllBytes(Paths.get(filename)));\n}'
      }
    };

    const patterns = englishToCodePatterns[language] || englishToCodePatterns.javascript;

    // Find the best matching pattern - check both extracted description and full prompt
    for (const [pattern, code] of Object.entries(patterns)) {
      if (englishDescription.includes(pattern) || lowerPrompt.includes(pattern)) {
        console.log(`✅ Matched pattern: "${pattern}" -> generating code`); // Debug log
        return [code];
      }
    }

    // Try partial matching with key terms if no exact match found
    const keyTerms = {
      javascript: {
        'function': 'function myFunction() {\n  // TODO: Implement functionality\n  return result;\n}',
        'class': 'class MyClass {\n  constructor() {\n    // Initialize properties\n  }\n}',
        'loop': 'for (let i = 0; i < array.length; i++) {\n  console.log(array[i]);\n}',
        'async': 'async function asyncFunction() {\n  const result = await someOperation();\n  return result;\n}',
        'validate': 'function validate(input) {\n  if (!input) throw new Error("Invalid input");\n  return true;\n}',
        'add': 'function add(a, b) {\n  return a + b;\n}',
        'calculate': 'function calculate(input) {\n  const result = input * 2;\n  return result;\n}'
      },
      python: {
        'function': 'def my_function():\n    """Function description"""\n    # TODO: Implement functionality\n    return result',
        'class': 'class MyClass:\n    def __init__(self):\n        # Initialize properties\n        pass',
        'loop': 'for item in items:\n    print(item)',
        'file': 'with open("filename.txt", "r") as file:\n    content = file.read()',
        'validate': 'def validate(data):\n    if not data:\n        raise ValueError("Invalid input")\n    return True',
        'add': 'def add(a, b):\n    """Add two numbers"""\n    return a + b',
        'calculate': 'def calculate(input_value):\n    """Calculate result"""\n    result = input_value * 2\n    return result'
      },
      typescript: {
        'interface': 'interface MyInterface {\n  property: string;\n}',
        'function': 'function myFunction(): ReturnType {\n  // TODO: Implement functionality\n  return result;\n}',
        'class': 'class MyClass {\n  constructor() {\n    // Initialize properties\n  }\n}',
        'add': 'function add(a: number, b: number): number {\n  return a + b;\n}'
      },
      cpp: {
        'fibonacci': 'int fibonacci(int n) {\n    if (n <= 1) {\n        return n;\n    }\n    return fibonacci(n - 1) + fibonacci(n - 2);\n}',
        'function': 'int myFunction(int param) {\n    // TODO: Implement functionality\n    return result;\n}',
        'class': 'class MyClass {\nprivate:\n    int value;\n\npublic:\n    MyClass(int val) : value(val) {}\n    \n    int getValue() {\n        return value;\n    }\n};',
        'add': 'int add(int a, int b) {\n    return a + b;\n}',
        'calculate': 'int calculate(int input) {\n    int result = input * 2;\n    return result;\n}',
        'loop': 'for (int i = 0; i < 10; i++) {\n    cout << i << " ";\n}'
      },
      c: {
        'fibonacci': 'int fibonacci(int n) {\n    if (n <= 1) {\n        return n;\n    }\n    return fibonacci(n - 1) + fibonacci(n - 2);\n}',
        'function': 'int myFunction(int param) {\n    // TODO: Implement functionality\n    return result;\n}',
        'add': 'int add(int a, int b) {\n    return a + b;\n}',
        'loop': 'for (int i = 0; i < 10; i++) {\n    printf("%d ", i);\n}'
      },
      java: {
        'fibonacci': 'public static int fibonacci(int n) {\n    if (n <= 1) {\n        return n;\n    }\n    return fibonacci(n - 1) + fibonacci(n - 2);\n}',
        'function': 'public int myFunction(int param) {\n    // TODO: Implement functionality\n    return result;\n}',
        'class': 'public class MyClass {\n    private int value;\n    \n    public MyClass(int value) {\n        this.value = value;\n    }\n}',
        'add': 'public int add(int a, int b) {\n    return a + b;\n}',
        'loop': 'for (int i = 0; i < array.length; i++) {\n    System.out.println(array[i]);\n}'
      }
    };

    const termPatterns = keyTerms[language] || keyTerms.javascript;
    for (const [term, code] of Object.entries(termPatterns)) {
      if (englishDescription.includes(term) || lowerPrompt.includes(term)) {
        console.log(`✅ Matched key term: "${term}" -> generating code`); // Debug log
        return [code];
      }
    }

    // Default fallback for unmatched patterns
    switch (language) {
      case 'javascript':
        return ['// Generated from English description\nfunction generatedFunction() {\n  // TODO: Implement based on description\n  return result;\n}'];
      case 'python':
        return ['# Generated from English description\ndef generated_function():\n    """Generated function"""\n    # TODO: Implement based on description\n    return result'];
      case 'typescript':
        return ['// Generated from English description\nfunction generatedFunction(): any {\n  // TODO: Implement based on description\n  return result;\n}'];
      default:
        return ['// Generated code from English description'];
    }
  }
}

module.exports = MockProvider;