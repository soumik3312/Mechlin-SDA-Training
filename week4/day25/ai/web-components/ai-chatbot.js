"use strict";

class AIChatbot {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);

        if (!this.container) {
            throw new Error(`Chatbot container not found: ${containerId}`);
        }

        this.options = {
            apiUrl: "/api/ai/chat",
            memoryUrl: "/api/ai/memory/clear",
            theme: "light",
            title: "AI Assistant",
            agentType: "conversation",
            storageKey: "day25_ai_chatbot",
            ...options,
        };

        this.isSending = false;
        this.history = [];
        this.threadId = this.getOrCreateThreadId();
        this.historyStorageKey = `${this.options.storageKey}:history`;

        this.loadHistory();
        this.createUI();
        this.bindEvents();
        this.renderHistory();
    }

    getOrCreateThreadId() {
        const key = `${this.options.storageKey}:thread`;
        let threadId = null;

        try {
            threadId = localStorage.getItem(key);
        } catch (error) {
            console.warn("Chatbot local storage is unavailable:", error);
        }

        if (!threadId) {
            threadId = typeof crypto !== "undefined" && crypto.randomUUID
                ? crypto.randomUUID()
                : `web-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;

            try {
                localStorage.setItem(key, threadId);
            } catch (error) {
                console.warn("Could not persist chatbot thread ID:", error);
            }
        }

        return threadId;
    }

    createElement(tag, className, text) {
        const element = document.createElement(tag);

        if (className) {
            element.className = className;
        }

        if (text !== undefined) {
            element.textContent = text;
        }

        return element;
    }

    createUI() {
        this.root = this.createElement(
            "section",
            `ai-chatbot ai-chatbot--${this.options.theme}`,
        );
        this.root.setAttribute("aria-label", "AI chatbot");

        const header = this.createElement("header", "ai-chatbot__header");
        const headingGroup = this.createElement("div", "ai-chatbot__heading");
        const title = this.createElement("h3", "", this.options.title);
        const status = this.createElement(
            "span",
            "ai-chatbot__status",
            "Local AI · Mistral",
        );

        headingGroup.append(title, status);

        this.clearButton = this.createElement(
            "button",
            "ai-chatbot__clear",
            "Clear",
        );
        this.clearButton.type = "button";
        this.clearButton.setAttribute("aria-label", "Clear conversation");

        header.append(headingGroup, this.clearButton);

        this.messagesContainer = this.createElement(
            "div",
            "ai-chatbot__messages",
        );
        this.messagesContainer.setAttribute("role", "log");
        this.messagesContainer.setAttribute("aria-live", "polite");
        this.messagesContainer.setAttribute("aria-label", "Conversation");

        this.typingIndicator = this.createElement(
            "div",
            "ai-chatbot__typing",
            "Mistral is thinking…",
        );
        this.typingIndicator.hidden = true;

        this.inputArea = this.createElement(
            "form",
            "ai-chatbot__input-area",
        );

        this.messageInput = this.createElement(
            "textarea",
            "ai-chatbot__input",
        );
        this.messageInput.rows = 2;
        this.messageInput.maxLength = 10000;
        this.messageInput.placeholder = "Ask your AI assistant…";
        this.messageInput.setAttribute("aria-label", "Your message");

        this.sendButton = this.createElement(
            "button",
            "ai-chatbot__send",
            "Send",
        );
        this.sendButton.type = "submit";

        const hint = this.createElement(
            "small",
            "ai-chatbot__hint",
            "Enter to send · Shift + Enter for a new line",
        );

        this.inputArea.append(this.messageInput, this.sendButton);

        this.root.append(
            header,
            this.messagesContainer,
            this.typingIndicator,
            this.inputArea,
            hint,
        );

        this.container.replaceChildren(this.root);
    }

    bindEvents() {
        this.inputArea.addEventListener("submit", (event) => {
            event.preventDefault();
            this.sendMessage();
        });

        this.messageInput.addEventListener("keydown", (event) => {
            if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                this.sendMessage();
            }
        });

        this.clearButton.addEventListener("click", () => {
            this.clearHistory();
        });
    }

    addMessage(content, role, timestamp = new Date().toISOString()) {
        const message = {
            role,
            content: String(content),
            timestamp,
        };

        this.history.push(message);
        this.renderMessage(message);
        this.saveHistory();

        return message;
    }

    renderMessage(message) {
        const wrapper = this.createElement(
            "article",
            `ai-chatbot__message ai-chatbot__message--${message.role}`,
        );

        const sender = this.createElement(
            "span",
            "ai-chatbot__sender",
            message.role === "user" ? "You" : "AI Assistant",
        );

        const content = this.createElement(
            "p",
            "ai-chatbot__message-content",
            message.content,
        );

        const time = this.createElement(
            "time",
            "ai-chatbot__time",
            this.formatTime(message.timestamp),
        );

        wrapper.append(sender, content, time);
        this.messagesContainer.append(wrapper);
        this.scrollToBottom();
    }

    formatTime(value) {
        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "";
        }

        return date.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
        });
    }

    renderHistory() {
        this.messagesContainer.replaceChildren();

        if (this.history.length === 0) {
            this.renderMessage({
                role: "assistant",
                content: "Hello! I'm your local AI assistant. How can I help you today?",
                timestamp: new Date().toISOString(),
            });
            return;
        }

        for (const message of this.history) {
            this.renderMessage(message);
        }
    }

    async sendMessage() {
        const message = this.messageInput.value.trim();

        if (!message || this.isSending) {
            return;
        }

        this.messageInput.value = "";
        this.addMessage(message, "user");

        this.isSending = true;
        this.setLoading(true);

        try {
            const response = await fetch(this.options.apiUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                body: JSON.stringify({
                    message,
                    thread_id: this.threadId,
                    agent_type: this.options.agentType,
                }),
            });

            const result = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(
                    result.error || `Chat request failed (${response.status}).`,
                );
            }

            if (typeof result.response !== "string" || !result.response.trim()) {
                throw new Error("The AI service returned an empty response.");
            }

            this.addMessage(result.response, "assistant");
        } catch (error) {
            console.error("AI chatbot request failed:", error);

            this.addMessage(
                `I couldn't reach the AI service. ${error.message || "Please check that the backend is running and try again."}`,
                "assistant",
            );
        } finally {
            this.isSending = false;
            this.setLoading(false);
            this.messageInput.focus();
        }
    }

    setLoading(loading) {
        this.typingIndicator.hidden = !loading;
        this.sendButton.disabled = loading;
        this.messageInput.disabled = loading;
        this.clearButton.disabled = loading;
        this.sendButton.textContent = loading ? "Sending…" : "Send";
        this.root.setAttribute("aria-busy", String(loading));
        this.scrollToBottom();
    }

    scrollToBottom() {
        this.messagesContainer.scrollTop =
            this.messagesContainer.scrollHeight;
    }

    loadHistory() {
        try {
            const raw = localStorage.getItem(this.historyStorageKey);
            const parsed = raw ? JSON.parse(raw) : [];

            if (Array.isArray(parsed)) {
                this.history = parsed.filter((item) => (
                    item
                    && ["user", "assistant"].includes(item.role)
                    && typeof item.content === "string"
                )).slice(-100);
            }
        } catch (error) {
            console.warn("Could not restore chatbot history:", error);
            this.history = [];
        }
    }

    saveHistory() {
        try {
            localStorage.setItem(
                this.historyStorageKey,
                JSON.stringify(this.history.slice(-100)),
            );
        } catch (error) {
            console.warn("Could not save chatbot history:", error);
        }
    }

    async clearHistory() {
        if (this.isSending) {
            return;
        }

        this.clearButton.disabled = true;

        try {
            const response = await fetch(this.options.memoryUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                body: JSON.stringify({
                    thread_id: this.threadId,
                }),
            });

            const result = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(
                    result.error || `Could not clear memory (${response.status}).`,
                );
            }

            this.history = [];

            try {
                localStorage.removeItem(this.historyStorageKey);
            } catch (error) {
                console.warn("Could not clear local chat history:", error);
            }

            this.renderHistory();
        } catch (error) {
            console.error("Could not clear chatbot memory:", error);
            this.addMessage(
                `I couldn't clear server memory: ${error.message}`,
                "assistant",
            );
        } finally {
            this.clearButton.disabled = false;
        }
    }
}

window.AIChatbot = AIChatbot;