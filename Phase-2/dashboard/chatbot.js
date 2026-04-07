(function () {
    const API_URL = 'http://localhost:5000/chat';

    function ensureMarkup() {
        const oldToggle = document.getElementById('chatToggle');
        const oldWidget = document.getElementById('chatWidget');

        if (oldToggle) oldToggle.remove();
        if (oldWidget) oldWidget.remove();

        const toggle = document.createElement('button');
        toggle.className = 'chat-toggle';
        toggle.id = 'chatToggle';
        toggle.type = 'button';
        toggle.setAttribute('aria-label', 'Open AI chat assistant');
        toggle.setAttribute('title', 'Open AI Assistant');
        toggle.innerHTML = '<span style="font-size:30px;line-height:1">💬</span>';
        toggle.style.position = 'fixed';
        toggle.style.right = '24px';
        toggle.style.bottom = '24px';
        toggle.style.width = '64px';
        toggle.style.height = '64px';
        toggle.style.borderRadius = '50%';
        toggle.style.display = 'flex';
        toggle.style.alignItems = 'center';
        toggle.style.justifyContent = 'center';
        toggle.style.zIndex = '2147483647';
        toggle.style.boxShadow = '0 14px 34px rgba(0, 0, 0, 0.35)';
        toggle.style.cursor = 'pointer';
        document.body.appendChild(toggle);

        const widget = document.createElement('section');
        widget.className = 'chat-widget';
        widget.id = 'chatWidget';
        widget.setAttribute('aria-label', 'AI Assistant');
        widget.style.display = 'none';
        widget.style.bottom = '104px';
        widget.style.zIndex = '2147483647';
        widget.innerHTML = [
            '<header class="chat-header">',
            '  <div>',
            '    <h3>🤖 CropAI Assistant</h3>',
            '    <p>Powered by Groq</p>',
            '    <p id="chatContextStatus" style="margin-top:4px;font-size:11px;color:#9ca3af;">Context: general advice mode</p>',
            '  </div>',
            '  <button class="chat-close" id="chatClose" type="button" aria-label="Close AI chat">✕</button>',
            '</header>',
            '<div class="chat-messages" id="chatMessages">',
            '  <div class="chat-message bot">',
            '    <div class="bubble">Hi! I can help with crop yield, soil, and farming decisions.</div>',
            '  </div>',
            '</div>',
            '<form class="chat-input-row" id="chatForm">',
            '  <textarea id="chatInput" placeholder="Ask about your crop data..." rows="1"></textarea>',
            '  <button type="submit" id="chatSend">Send</button>',
            '</form>'
        ].join('');
        document.body.appendChild(widget);
    }

    function initChat() {
        ensureMarkup();

        const chatToggle = document.getElementById('chatToggle');
        const chatWidget = document.getElementById('chatWidget');
        const chatClose = document.getElementById('chatClose');
        const chatMessages = document.getElementById('chatMessages');
        const chatForm = document.getElementById('chatForm');
        const chatInput = document.getElementById('chatInput');
        const chatSend = document.getElementById('chatSend');
        const chatContextStatus = document.getElementById('chatContextStatus');

        if (!chatToggle || !chatWidget || !chatMessages || !chatForm || !chatInput || !chatSend) {
            return;
        }

        if (chatWidget.dataset.initialized === 'true') {
            return;
        }
        chatWidget.dataset.initialized = 'true';

        const chatHistory = [
            {
                role: 'assistant',
                content: 'Hi! I can help with crop yield, soil, and farming decisions.'
            }
        ];

        function updateContextStatus() {
            if (!chatContextStatus) return;
            if (window.latestPredictionContext && window.latestPredictionContext.prediction) {
                chatContextStatus.textContent = 'Context: latest prediction loaded';
                chatContextStatus.style.color = '#86efac';
            } else {
                chatContextStatus.textContent = 'Context: general advice mode';
                chatContextStatus.style.color = '#9ca3af';
            }
        }

        updateContextStatus();
        window.addEventListener('predictionContextUpdated', updateContextStatus);

        function appendMessage(role, text) {
            const row = document.createElement('div');
            row.className = 'chat-message ' + (role === 'user' ? 'user' : 'bot');
            const bubble = document.createElement('div');
            bubble.className = 'bubble';
            bubble.textContent = text;
            row.appendChild(bubble);
            chatMessages.appendChild(row);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }

        function setOpen(open) {
            chatWidget.style.display = open ? 'flex' : 'none';
            chatToggle.innerHTML = '<span style="font-size:30px;line-height:1">💬</span>';
            chatToggle.title = 'Open AI Assistant';
            updateContextStatus();
            if (open) {
                setTimeout(function () {
                    chatInput.focus();
                }, 80);
            }
        }

        async function sendMessage(text) {
            const userText = (text || '').trim();
            if (!userText) return;

            appendMessage('user', userText);
            chatHistory.push({ role: 'user', content: userText });

            chatSend.disabled = true;
            chatSend.textContent = '...';

            try {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        messages: chatHistory.slice(-8),
                        prediction_context: window.latestPredictionContext || null
                    })
                });

                const data = await response.json();
                if (!response.ok || data.status !== 'success') {
                    throw new Error((data && data.message) || 'Chat request failed');
                }

                const reply = data.reply || 'I could not generate a response right now.';
                appendMessage('assistant', reply);
                chatHistory.push({ role: 'assistant', content: reply });
            } catch (error) {
                const fallback = 'Chat service is unavailable. Make sure API is running on localhost:5000.';
                appendMessage('assistant', fallback);
                chatHistory.push({ role: 'assistant', content: fallback });
                console.error('Chatbot error:', error);
            } finally {
                chatSend.disabled = false;
                chatSend.textContent = 'Send';
            }
        }

        chatToggle.addEventListener('click', function () {
            setOpen(chatWidget.style.display === 'none');
        });

        if (chatClose) {
            chatClose.addEventListener('click', function () {
                setOpen(false);
            });
        }

        chatInput.addEventListener('input', function () {
            chatInput.style.height = 'auto';
            chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
        });

        chatInput.addEventListener('keydown', function (event) {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                const text = chatInput.value;
                chatInput.value = '';
                chatInput.style.height = '40px';
                sendMessage(text);
            }
        });

        chatForm.addEventListener('submit', function (event) {
            event.preventDefault();
            const text = chatInput.value;
            chatInput.value = '';
            chatInput.style.height = '40px';
            sendMessage(text);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initChat);
    } else {
        initChat();
    }
})();
