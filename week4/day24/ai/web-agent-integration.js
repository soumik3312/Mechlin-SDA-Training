"use strict";

class WebAIAgentIntegration {
  constructor(apiBaseUrl, agentType = "langchain", threadId = null) {
    this.apiBaseUrl = apiBaseUrl.replace(/\/+$/, "");
    this.conversationHistory = [];
    this.agentType = agentType;
    this.threadId = threadId || this._createThreadId();
  }

  _createThreadId() {
    if (globalThis.crypto?.randomUUID) {
      return globalThis.crypto.randomUUID();
    }

    return `web-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  async _request(path, options = {}) {
    const response = await fetch(`${this.apiBaseUrl}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(result.error || `HTTP error: ${response.status}`);
    }

    return result;
  }

  async chat(message, agentType = this.agentType) {
    if (typeof message !== "string" || !message.trim()) {
      throw new Error("A non-empty message is required.");
    }

    const result = await this._request("/chat", {
      method: "POST",
      body: JSON.stringify({
        message,
        agent_type: agentType,
        thread_id: this.threadId,
      }),
    });

    this.conversationHistory.push({
      user: message,
      agent: result.response,
      timestamp: new Date().toISOString(),
      agentType,
    });

    return result.response;
  }

  async getMemory(agentType = this.agentType) {
    const query = new URLSearchParams({
      agent_type: agentType,
      thread_id: this.threadId,
    });

    const result = await this._request(`/memory?${query.toString()}`);
    return result.memory;
  }

  async clearMemory(agentType = this.agentType) {
    const result = await this._request("/memory/clear", {
      method: "POST",
      body: JSON.stringify({
        agent_type: agentType,
        thread_id: this.threadId,
      }),
    });

    this.conversationHistory = [];
    return result.success;
  }

  async listTools(agentType = this.agentType) {
    const query = new URLSearchParams({ agent_type: agentType });
    const result = await this._request(`/tools?${query.toString()}`);
    return result.tools;
  }

  async addTool(toolName, agentType = this.agentType) {
    const result = await this._request("/tools/add", {
      method: "POST",
      body: JSON.stringify({
        name: toolName,
        agent_type: agentType,
      }),
    });

    return result.success;
  }

  async removeTool(toolName, agentType = this.agentType) {
    const result = await this._request("/tools/remove", {
      method: "POST",
      body: JSON.stringify({
        name: toolName,
        agent_type: agentType,
      }),
    });

    return result.success;
  }

  async health() {
    return this._request("/health");
  }

  getConversationHistory() {
    return [...this.conversationHistory];
  }

  setAgentType(agentType) {
    if (!["langchain", "conversation"].includes(agentType)) {
      throw new Error("Unsupported agent type.");
    }

    this.agentType = agentType;
  }

  getAgentType() {
    return this.agentType;
  }

  getThreadId() {
    return this.threadId;
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = WebAIAgentIntegration;
}