import AsyncStorage from "@react-native-async-storage/async-storage";

export interface AgentMessage {
  user: string;
  agent: string;
  timestamp: string;
  agentType: string;
}

export interface AgentMemory {
  thread_id: string;
  chat_history: unknown[];
  memory_variables: Record<string, unknown>;
}

type AgentType = "langchain" | "conversation";

interface ApiResponse<T = unknown> {
  success?: boolean;
  error?: string;
  response?: string;
  memory?: T;
  tools?: string[];
}

class MobileAIAgentIntegration {
  private apiBaseUrl: string;
  private conversationHistory: AgentMessage[] = [];
  private agentType: AgentType = "langchain";
  private threadId: string;
  private readonly storageKey = "day24_agent_conversation_history";

  constructor(apiBaseUrl: string, threadId?: string) {
    this.apiBaseUrl = apiBaseUrl.replace(/\/+$/, "");
    this.threadId = threadId || this.createThreadId();

    void this.loadConversationHistory();
  }

  private createThreadId(): string {
    return `mobile-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<ApiResponse<T>> {
    const response = await fetch(`${this.apiBaseUrl}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });

    const result = (await response.json()) as ApiResponse<T>;

    if (!response.ok) {
      throw new Error(result.error || `HTTP error: ${response.status}`);
    }

    return result;
  }

  private async loadConversationHistory(): Promise<void> {
    try {
      const value = await AsyncStorage.getItem(
        `${this.storageKey}:${this.threadId}`,
      );

      if (value) {
        this.conversationHistory = JSON.parse(value) as AgentMessage[];
      }
    } catch (error) {
      console.error("Failed to load conversation history:", error);
    }
  }

  private async saveConversationHistory(): Promise<void> {
    await AsyncStorage.setItem(
      `${this.storageKey}:${this.threadId}`,
      JSON.stringify(this.conversationHistory),
    );
  }

  async chat(
    message: string,
    agentType: AgentType = this.agentType,
  ): Promise<string> {
    if (!message.trim()) {
      throw new Error("A non-empty message is required.");
    }

    const result = await this.request<string>("/chat", {
      method: "POST",
      body: JSON.stringify({
        message,
        agent_type: agentType,
        thread_id: this.threadId,
      }),
    });

    if (typeof result.response !== "string") {
      throw new Error("The agent returned an invalid response.");
    }

    this.conversationHistory.push({
      user: message,
      agent: result.response,
      timestamp: new Date().toISOString(),
      agentType,
    });

    await this.saveConversationHistory();

    return result.response;
  }

  async getMemory(
    agentType: AgentType = this.agentType,
  ): Promise<AgentMemory | null> {
    const query = new URLSearchParams({
      agent_type: agentType,
      thread_id: this.threadId,
    });

    const result = await this.request<AgentMemory>(
      `/memory?${query.toString()}`,
    );

    return result.memory || null;
  }

  async clearMemory(
    agentType: AgentType = this.agentType,
  ): Promise<boolean> {
    const result = await this.request("/memory/clear", {
      method: "POST",
      body: JSON.stringify({
        agent_type: agentType,
        thread_id: this.threadId,
      }),
    });

    this.conversationHistory = [];
    await this.saveConversationHistory();

    return result.success === true;
  }

  async listTools(
    agentType: AgentType = this.agentType,
  ): Promise<string[]> {
    const query = new URLSearchParams({ agent_type: agentType });
    const result = await this.request<string[]>(
      `/tools?${query.toString()}`,
    );

    return result.tools || [];
  }

  async addTool(
    name: string,
    agentType: AgentType = this.agentType,
  ): Promise<boolean> {
    const result = await this.request("/tools/add", {
      method: "POST",
      body: JSON.stringify({ name, agent_type: agentType }),
    });

    return result.success === true;
  }

  async removeTool(
    name: string,
    agentType: AgentType = this.agentType,
  ): Promise<boolean> {
    const result = await this.request("/tools/remove", {
      method: "POST",
      body: JSON.stringify({ name, agent_type: agentType }),
    });

    return result.success === true;
  }

  getConversationHistory(): AgentMessage[] {
    return [...this.conversationHistory];
  }

  setAgentType(agentType: AgentType): void {
    this.agentType = agentType;
  }

  getAgentType(): AgentType {
    return this.agentType;
  }

  getThreadId(): string {
    return this.threadId;
  }

  async clearCache(): Promise<void> {
    await AsyncStorage.removeItem(`${this.storageKey}:${this.threadId}`);
    this.conversationHistory = [];
  }
}

export default MobileAIAgentIntegration;