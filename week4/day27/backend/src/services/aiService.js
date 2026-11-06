class AIService {
  constructor(baseUrl = process.env.AI_GATEWAY_URL || 'http://127.0.0.1:5003') {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  async request(path, payload) {
    let response;

    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(120000)
      });
    } catch (error) {
      const unavailable = new Error(
        'The local AI gateway is unavailable. Start the Day 25 and Day 26 services.'
      );
      unavailable.status = 503;
      unavailable.cause = error;
      throw unavailable;
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok || data.success === false) {
      const failure = new Error(
        data.error || `AI request failed with HTTP ${response.status}.`
      );
      failure.status = response.status >= 500 ? 502 : response.status;
      throw failure;
    }

    return data;
  }

  chat(message, userId) {
    const safeUserId = String(userId).replace(/[^a-zA-Z0-9._:-]/g, '-');

    return this.request('/mobile/chat', {
      message,
      thread_id: `capstone-${safeUserId}`,
      agent_type: 'conversation'
    });
  }

  generateContent(input) {
    return this.request('/mobile/generate', {
      content_type: input.content_type,
      topic: input.topic,
      tone: input.tone,
      length: input.length,
      keywords: input.keywords || []
    });
  }

  recommendations(userProfile, maximum = 5) {
    return this.request('/mobile/recommendations', {
      user_profile: userProfile,
      max_recommendations: maximum
    });
  }
}

module.exports = { AIService };