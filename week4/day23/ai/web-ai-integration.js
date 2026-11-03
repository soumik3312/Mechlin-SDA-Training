    /**
 * Web client for the Day 23 Generative AI API.
 */

class WebAIIntegration {
  constructor(apiBaseUrl = 'http://127.0.0.1:5001') {
    if (
      typeof apiBaseUrl !== 'string' ||
      !apiBaseUrl.trim()
    ) {
      throw new TypeError(
        'apiBaseUrl must be a non-empty URL.'
      );
    }

    this.apiBaseUrl = apiBaseUrl.replace(/\/+$/, '');

    this.conversationHistory = [];
  }

  async _post(endpoint, payload) {
    const response = await fetch(
      `${this.apiBaseUrl}${endpoint}`,
      {
        method: 'POST',

        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },

        body: JSON.stringify(payload),
      }
    );

    const result = await response.json().catch(
      () => ({})
    );

    if (!response.ok) {
      throw new Error(
        result.error ||
        `AI API returned HTTP ${response.status}.`
      );
    }

    return result;
  }

  async generateText(prompt, options = {}) {
    if (
      typeof prompt !== 'string' ||
      !prompt.trim()
    ) {
      throw new TypeError(
        'A non-empty prompt is required.'
      );
    }

    try {
      const result = await this._post(
        '/generate/text',
        {
          prompt,

          provider: options.provider || 'openai',

          model: options.model || 'gpt-4o-mini',

          max_tokens: options.maxTokens || 500,

          temperature:
            options.temperature ?? 0.7,
        }
      );

      return result.result;

    } catch (error) {
      console.error(
        'Text generation failed:',
        error
      );

      throw error;
    }
  }

  async generateSummary(text, maxLength = 150) {
    if (
      typeof text !== 'string' ||
      !text.trim()
    ) {
      throw new TypeError(
        'Text is required for summarization.'
      );
    }

    try {
      const result = await this._post(
        '/generate/summary',
        {
          text,

          max_length: maxLength,
        }
      );

      return result.summary;

    } catch (error) {
      console.error(
        'Summarization failed:',
        error
      );

      throw error;
    }
  }

  async generateCode(
    description,
    language = 'python'
  ) {
    if (
      typeof description !== 'string' ||
      !description.trim()
    ) {
      throw new TypeError(
        'Code generation description is required.'
      );
    }

    try {
      const result = await this._post(
        '/generate/code',
        {
          description,

          language,
        }
      );

      return result.code;

    } catch (error) {
      console.error(
        'Code generation failed:',
        error
      );

      throw error;
    }
  }

  async chat(
    message,
    model = 'gpt-4o-mini',
    provider = 'openai'
  ) {
    if (
      typeof message !== 'string' ||
      !message.trim()
    ) {
      throw new TypeError(
        'Chat message must not be empty.'
      );
    }

    const userMessage = {
      role: 'user',
      content: message,
    };

    this.conversationHistory.push(
      userMessage
    );

    try {
      const result = await this._post(
        '/chat',
        {
          messages: this.conversationHistory,

          model,

          provider,
        }
      );

      this.conversationHistory.push({
        role: 'assistant',
        content: result.response,
      });

      return result.response;

    } catch (error) {
      // Remove the failed user message rather than
      // leaving an incomplete conversation turn.

      this.conversationHistory.pop();

      console.error(
        'Chat request failed:',
        error
      );

      throw error;
    }
  }

  clearConversation() {
    this.conversationHistory = [];
  }

  getConversationHistory() {
    return this.conversationHistory.map(
      (message) => ({ ...message })
    );
  }
}

if (
  typeof module !== 'undefined' &&
  module.exports
) {
  module.exports = WebAIIntegration;
}

if (typeof window !== 'undefined') {
  window.WebAIIntegration = WebAIIntegration;
}