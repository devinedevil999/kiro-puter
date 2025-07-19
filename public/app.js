class AIPairProgrammerClient {
    constructor() {
        this.apiUrl = window.location.origin;
        this.wsUrl = `ws://${window.location.hostname}:3001`;
        this.ws = null;
        this.sessionId = null;
        this.selectedSuggestion = -1;
        this.puterAI = null;
        this.usePuterFreeAPI = true; // Use Puter's free API by default

        this.initializeElements();
        this.setupEventListeners();
        this.initializePuter();
        this.connectWebSocket();
        this.createSession();
    }

    initializeElements() {
        this.codeEditor = document.getElementById('codeEditor');
        this.languageSelect = document.getElementById('languageSelect');
        this.modelSelect = document.getElementById('modelSelect');
        this.suggestionsList = document.getElementById('suggestionsList');
        this.getSuggestionsBtn = document.getElementById('getSuggestionsBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.status = document.getElementById('status');
        this.connectionStatus = document.getElementById('connectionStatus');
        this.aiProvider = document.getElementById('aiProvider');
        this.suggestionsPanel = document.getElementById('suggestionsPanel');
        this.resizeHandle = document.getElementById('resizeHandle');
    }

    async initializePuter() {
        try {
            // Wait for Puter to be available
            if (typeof puter !== 'undefined') {
                this.puterAI = puter.ai;

                // Get initial model selection
                const initialModel = this.modelSelect.value;
                const modelDisplayName = this.getModelDisplayName(initialModel);

                this.updateStatus(`Puter AI ready with ${modelDisplayName} - Free API available!`, 'success');
                this.connectionStatus.textContent = 'Puter AI Ready';
                this.connectionStatus.className = 'status success';
                this.aiProvider.textContent = `🆓 ${modelDisplayName}`;
                this.aiProvider.className = 'status success';
            } else {
                console.warn('Puter SDK not loaded, falling back to server-side AI');
                this.usePuterFreeAPI = false;
                this.aiProvider.textContent = '🔧 Server AI';
                this.aiProvider.className = 'status';
            }
        } catch (error) {
            console.error('Failed to initialize Puter:', error);
            this.usePuterFreeAPI = false;
            this.aiProvider.textContent = '🔧 Server AI';
            this.aiProvider.className = 'status';
        }
    }

    setupEventListeners() {
        // Auto-suggest on typing with debounce
        let typingTimer;
        this.codeEditor.addEventListener('input', () => {
            clearTimeout(typingTimer);
            typingTimer = setTimeout(() => {
                if (this.codeEditor.value.trim()) {
                    this.getSuggestions();
                }
            }, 1000);
        });

        // Manual suggestion button
        this.getSuggestionsBtn.addEventListener('click', () => {
            this.getSuggestions();
        });

        // Clear button
        this.clearBtn.addEventListener('click', () => {
            this.codeEditor.value = '';
            this.clearSuggestions();
            this.updateStatus('Cleared');
        });

        // Keyboard shortcuts
        this.codeEditor.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + Space for suggestions
            if ((e.ctrlKey || e.metaKey) && e.code === 'Space') {
                e.preventDefault();
                this.getSuggestions();
            }

            // Tab to accept first suggestion
            if (e.key === 'Tab' && this.selectedSuggestion >= 0) {
                e.preventDefault();
                this.acceptSuggestion(this.selectedSuggestion);
            }

            // Arrow keys to navigate suggestions
            if (e.key === 'ArrowDown' && this.suggestions.length > 0) {
                e.preventDefault();
                this.selectedSuggestion = Math.min(this.selectedSuggestion + 1, this.suggestions.length - 1);
                this.updateSuggestionSelection();
            }

            if (e.key === 'ArrowUp' && this.suggestions.length > 0) {
                e.preventDefault();
                this.selectedSuggestion = Math.max(this.selectedSuggestion - 1, -1);
                this.updateSuggestionSelection();
            }
        });

        // Language change
        this.languageSelect.addEventListener('change', () => {
            if (this.codeEditor.value.trim()) {
                this.getSuggestions();
            }
        });

        // Model change
        this.modelSelect.addEventListener('change', () => {
            const selectedModel = this.modelSelect.value;
            this.updateStatus(`Switched to ${this.getModelDisplayName(selectedModel)}`, 'success');

            // Update AI provider display
            this.aiProvider.textContent = `🆓 ${this.getModelDisplayName(selectedModel)}`;

            if (this.codeEditor.value.trim()) {
                this.getSuggestions();
            }
        });

        // Setup resizable panel
        this.setupResizablePanel();
    }

    setupResizablePanel() {
        let isResizing = false;
        let startX = 0;
        let startWidth = 0;

        this.resizeHandle.addEventListener('mousedown', (e) => {
            isResizing = true;
            startX = e.clientX;
            startWidth = parseInt(document.defaultView.getComputedStyle(this.suggestionsPanel).width, 10);
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;

            const width = startWidth - (e.clientX - startX);
            const minWidth = 200;
            const maxWidth = window.innerWidth * 0.8;

            if (width >= minWidth && width <= maxWidth) {
                this.suggestionsPanel.style.width = width + 'px';
            }
        });

        document.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
            }
        });
    }

    connectWebSocket() {
        try {
            this.ws = new WebSocket(this.wsUrl);

            this.ws.onopen = () => {
                this.connectionStatus.textContent = 'Connected';
                this.connectionStatus.className = 'status success';
            };

            this.ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                this.handleWebSocketMessage(data);
            };

            this.ws.onclose = () => {
                this.connectionStatus.textContent = 'Disconnected';
                this.connectionStatus.className = 'status error';

                // Attempt to reconnect after 3 seconds
                setTimeout(() => {
                    this.connectWebSocket();
                }, 3000);
            };

            this.ws.onerror = () => {
                this.connectionStatus.textContent = 'Connection Error';
                this.connectionStatus.className = 'status error';
            };
        } catch (error) {
            console.error('WebSocket connection failed:', error);
            this.connectionStatus.textContent = 'WebSocket Failed';
            this.connectionStatus.className = 'status error';
        }
    }

    handleWebSocketMessage(data) {
        switch (data.type) {
            case 'suggestions':
                this.displaySuggestions(data.suggestions);
                this.updateStatus('Suggestions received');
                break;
            case 'error':
                this.updateStatus(`Error: ${data.error}`, 'error');
                break;
            case 'pong':
                // Keep-alive response
                break;
        }
    }

    async createSession() {
        try {
            const response = await fetch(`${this.apiUrl}/session`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    metadata: {
                        userAgent: navigator.userAgent,
                        timestamp: new Date().toISOString()
                    }
                })
            });

            const data = await response.json();
            this.sessionId = data.sessionId;
            console.log('Session created:', this.sessionId);
        } catch (error) {
            console.error('Failed to create session:', error);
        }
    }

    async getSuggestions() {
        const code = this.codeEditor.value;
        const cursorPosition = this.codeEditor.selectionStart;
        const language = this.languageSelect.value;

        if (!code.trim()) {
            this.updateStatus('No code to analyze');
            return;
        }

        this.updateStatus('Getting suggestions...', 'loading');
        this.getSuggestionsBtn.disabled = true;

        try {
            // Try Puter's free AI API first
            if (this.usePuterFreeAPI && this.puterAI) {
                await this.getSuggestionsFromPuter(code, cursorPosition, language);
            }
            // Fallback to WebSocket if available
            else if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                const requestId = Date.now().toString();
                this.ws.send(JSON.stringify({
                    type: 'suggestion_request',
                    id: requestId,
                    code,
                    cursorPosition,
                    language,
                    options: {
                        maxTokens: 10000,
                        temperature: 0.3
                    }
                }));
            }
            // HTTP fallback
            else {
                const response = await fetch(`${this.apiUrl}/suggestions`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        code,
                        cursorPosition,
                        language,
                        sessionId: this.sessionId,
                        options: {
                            maxTokens: 150,
                            temperature: 0.3
                        }
                    })
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();
                this.displaySuggestions(data.suggestions);
                this.updateStatus('Suggestions received');
            }
        } catch (error) {
            console.error('Error getting suggestions:', error);
            this.updateStatus(`Error: ${error.message}`, 'error');
            this.clearSuggestions();
        } finally {
            this.getSuggestionsBtn.disabled = false;
        }
    }

    async getSuggestionsFromPuter(code, cursorPosition, language) {
        try {
            // Get the prompt from our server
            const promptResponse = await fetch(`${this.apiUrl}/suggestions/client`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    code,
                    cursorPosition,
                    language,
                    sessionId: this.sessionId
                })
            });

            if (!promptResponse.ok) {
                throw new Error('Failed to get prompt from server');
            }

            const { prompt } = await promptResponse.json();

            // Get selected model from dropdown
            const selectedModel = this.modelSelect.value;

            // Use Puter's free AI API with selected model
            const aiResponse = await this.puterAI.chat([
                {
                    role: 'system',
                    content: 'You are a helpful code completion assistant. Provide complete, working code without explanations. Ensure all code blocks are properly closed with matching braces, brackets, and semicolons.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ], {
                model: selectedModel,
                max_tokens: 10000, // Increased to 10000 for complete code implementations
                temperature: 0.3
            });

            // Log the Puter AI response to the server for debugging
            try {
                await fetch(`${this.apiUrl}/suggestions/puter-response`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        response: aiResponse,
                        model: selectedModel,
                        language: language,
                        originalPrompt: prompt
                    })
                });
            } catch (logError) {
                console.warn('Failed to log Puter response to server:', logError);
            }

            // Process the AI response
            const suggestions = this.processPuterResponse(aiResponse, language);

            // Temporary debug alert
            alert(`🎉 Puter AI Success!\nModel: ${selectedModel}\nSuggestions: ${suggestions.length}\nFirst suggestion preview: ${suggestions[0]?.text?.substring(0, 100)}...`);

            this.displaySuggestions(suggestions);
            this.updateStatus(`Suggestions received from ${this.getModelDisplayName(selectedModel)} (Free!)`, 'success');

        } catch (error) {
            console.error('🚨 Puter AI error:', error);
            console.error('Error details:', {
                message: error.message,
                stack: error.stack,
                name: error.name
            });

            this.updateStatus(`Puter AI error: ${error.message}`, 'error');

            // Log the error to server for debugging
            try {
                await fetch(`${this.apiUrl}/suggestions/puter-response`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        error: {
                            message: error.message,
                            name: error.name,
                            stack: error.stack
                        },
                        model: this.modelSelect.value,
                        language: language,
                        originalPrompt: prompt
                    })
                });
            } catch (logError) {
                console.warn('Failed to log Puter error to server:', logError);
            }

            // Fallback to server-side AI
            console.log('🔄 Falling back to server-side AI');
            this.usePuterFreeAPI = false;

            // Call server-side suggestions directly
            try {
                const response = await fetch(`${this.apiUrl}/suggestions`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        code,
                        cursorPosition,
                        language,
                        sessionId: this.sessionId,
                        options: {
                            maxTokens: 150,
                            temperature: 0.3
                        }
                    })
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();
                console.log('✅ Server-side fallback response:', data);
                this.displaySuggestions(data.suggestions);
                this.updateStatus('Suggestions received from server fallback', 'success');
            } catch (fallbackError) {
                console.error('❌ Server-side fallback also failed:', fallbackError);
                this.updateStatus(`All AI providers failed: ${fallbackError.message}`, 'error');
                this.clearSuggestions();
            }
        }
    }

    processPuterResponse(aiResponse, language) {
        console.log('🔍 Processing Puter response:', aiResponse);

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
            confidence: 0.8, // High confidence for Puter AI
            type: this.detectSuggestionType(content),
            language: language,
            insertText: content,
            source: 'puter'
        };

        console.log('✅ Created suggestion:', suggestion);
        return [suggestion];
    }

    detectSuggestionType(content) {
        const trimmed = content.trim();

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
        if (trimmed.startsWith('const') || trimmed.startsWith('let') || trimmed.startsWith('var')) {
            return 'variable';
        }

        return 'statement';
    }

    displaySuggestions(suggestions) {
        console.log('🎨 displaySuggestions called with:', suggestions);

        this.suggestions = suggestions || [];
        this.selectedSuggestion = -1;

        console.log(`📊 Number of suggestions: ${this.suggestions.length}`);

        if (this.suggestions.length === 0) {
            console.log('❌ No suggestions to display');
            this.suggestionsList.innerHTML = `
                <div style="text-align: center; color: #9cdcfe; margin-top: 2rem;">
                    No suggestions available
                </div>
            `;
            return;
        }

        console.log('✅ Displaying suggestions in UI');

        this.suggestionsList.innerHTML = this.suggestions.map((suggestion, index) => `
            <div class="suggestion-item" data-index="${index}">
                <div class="suggestion-meta">
                    <span>${suggestion.type || 'code'}</span>
                    <span class="suggestion-confidence">${Math.round((suggestion.confidence || 0.5) * 100)}%</span>
                </div>
                <div class="suggestion-code">${this.escapeHtml(suggestion.text || suggestion.insertText)}</div>
                <div class="suggestion-actions">
                    <button class="copy-btn" data-index="${index}" title="Copy to clipboard">
                        📋 Copy
                    </button>
                    <button class="accept-btn" data-index="${index}" title="Insert into editor">
                        ✅ Accept
                    </button>
                </div>
            </div>
        `).join('');

        // Add click handlers for copy buttons
        this.suggestionsList.querySelectorAll('.copy-btn').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent triggering the suggestion item click
                const index = parseInt(btn.getAttribute('data-index'));
                this.copySuggestion(index, btn);
            });
        });

        // Add click handlers for accept buttons
        this.suggestionsList.querySelectorAll('.accept-btn').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent triggering the suggestion item click
                const index = parseInt(btn.getAttribute('data-index'));
                this.acceptSuggestion(index);
            });
        });

        // Add click handlers for suggestion items (for selection)
        this.suggestionsList.querySelectorAll('.suggestion-item').forEach((item, index) => {
            item.addEventListener('click', (e) => {
                // Only select if not clicking on buttons
                if (!e.target.classList.contains('copy-btn') && !e.target.classList.contains('accept-btn')) {
                    this.selectedSuggestion = index;
                    this.updateSuggestionSelection();
                }
            });
        });

        // Auto-select first suggestion
        if (this.suggestions.length > 0) {
            this.selectedSuggestion = 0;
            this.updateSuggestionSelection();
        }
    }

    updateSuggestionSelection() {
        this.suggestionsList.querySelectorAll('.suggestion-item').forEach((item, index) => {
            item.classList.toggle('selected', index === this.selectedSuggestion);
        });
    }

    async copySuggestion(index, buttonElement) {
        if (index < 0 || index >= this.suggestions.length) return;

        const suggestion = this.suggestions[index];
        const textToCopy = suggestion.text || suggestion.insertText;

        try {
            // Use the modern Clipboard API if available
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(textToCopy);
            } else {
                // Fallback for older browsers or non-secure contexts
                const textArea = document.createElement('textarea');
                textArea.value = textToCopy;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                document.execCommand('copy');
                textArea.remove();
            }

            // Visual feedback
            const originalText = buttonElement.innerHTML;
            buttonElement.innerHTML = '✅ Copied!';
            buttonElement.classList.add('copied');

            setTimeout(() => {
                buttonElement.innerHTML = originalText;
                buttonElement.classList.remove('copied');
            }, 2000);

            this.updateStatus(`Code copied to clipboard (${textToCopy.length} characters)`, 'success');
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
            this.updateStatus('Failed to copy to clipboard', 'error');
        }
    }

    acceptSuggestion(index) {
        if (index < 0 || index >= this.suggestions.length) return;

        const suggestion = this.suggestions[index];
        const cursorPosition = this.codeEditor.selectionStart;
        const code = this.codeEditor.value;

        // Insert suggestion at cursor position
        const beforeCursor = code.substring(0, cursorPosition);
        const afterCursor = code.substring(cursorPosition);
        const newCode = beforeCursor + suggestion.text + afterCursor;

        this.codeEditor.value = newCode;

        // Move cursor to end of inserted text
        const newCursorPosition = cursorPosition + suggestion.text.length;
        this.codeEditor.setSelectionRange(newCursorPosition, newCursorPosition);
        this.codeEditor.focus();

        this.updateStatus(`Suggestion accepted (${Math.round((suggestion.confidence || 0.5) * 100)}% confidence)`, 'success');
        this.clearSuggestions();
    }

    clearSuggestions() {
        this.suggestions = [];
        this.selectedSuggestion = -1;
        this.suggestionsList.innerHTML = `
            <div style="text-align: center; color: #9cdcfe; margin-top: 2rem;">
                Start typing to see AI suggestions
            </div>
        `;
    }

    updateStatus(message, type = '') {
        this.status.textContent = message;
        this.status.className = `status ${type}`;

        // Clear status after 3 seconds unless it's an error
        if (type !== 'error') {
            setTimeout(() => {
                if (this.status.textContent === message) {
                    this.status.textContent = 'Ready';
                    this.status.className = 'status';
                }
            }, 3000);
        }
    }

    getModelDisplayName(modelValue) {
        const modelNames = {
            'gpt-4o-mini': 'GPT-4o Mini',
            'gpt-4o': 'GPT-4o',
            'gpt-4-turbo': 'GPT-4 Turbo',
            'gpt-4': 'GPT-4',
            'gpt-3.5-turbo': 'GPT-3.5 Turbo',
            'claude-3-5-sonnet-20241022': 'Claude 3.5 Sonnet',
            'claude-3-5-haiku-20241022': 'Claude 3.5 Haiku',
            'claude-3-opus-20240229': 'Claude 3 Opus',
            'gemini-1.5-flash': 'Gemini 1.5 Flash',
            'gemini-1.5-pro': 'Gemini 1.5 Pro',
            'llama-3.1-sonar-large-128k-online': 'Llama 3.1 Sonar Large',
            'llama-3.1-sonar-small-128k-online': 'Llama 3.1 Sonar Small',
            'llama-3.1-70b-instruct': 'Llama 3.1 70B',
            'llama-3.1-8b-instruct': 'Llama 3.1 8B',
            'mixtral-8x7b-instruct': 'Mixtral 8x7B',
            'mistral-7b-instruct': 'Mistral 7B'
        };

        return modelNames[modelValue] || modelValue;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AIPairProgrammerClient();
});