/**
 * Browser-side client for the Day 22 Flask AI service.
 */

class AIWebIntegration {
  constructor(apiBaseUrl = 'http://localhost:5000') {
    if (
      typeof apiBaseUrl !== 'string' ||
      !apiBaseUrl.trim()
    ) {
      throw new TypeError(
        'apiBaseUrl must be a non-empty URL string.'
      );
    }

    this.apiBaseUrl = apiBaseUrl.replace(/\/+$/, '');

    this.model = null;
    this.isLoaded = false;
  }

  async _request(path, options = {}) {
    const response = await fetch(
      `${this.apiBaseUrl}${path}`,
      {
        ...options,

        headers: {
          Accept: 'application/json',

          ...(options.body
            ? { 'Content-Type': 'application/json' }
            : {}),

          ...(options.headers || {}),
        },
      }
    );

    const payload = await response.json().catch(
      () => ({})
    );

    if (!response.ok) {
      throw new Error(
        payload.error ||
        `AI service returned HTTP ${response.status}.`
      );
    }

    return payload;
  }

  async loadModel() {
    try {
      const result = await this._request(
        '/ai/model/load'
      );

      this.model = result.model || null;

      this.isLoaded = result.success === true;

      return result;

    } catch (error) {
      this.isLoaded = false;

      console.error(
        'Failed to load AI model:',
        error
      );

      throw error;
    }
  }

  async predict(data) {
    if (
      !data ||
      typeof data !== 'object' ||
      Array.isArray(data)
    ) {
      throw new TypeError(
        'predict() expects one feature object.'
      );
    }

    if (!this.isLoaded) {
      await this.loadModel();
    }

    return this._request(
      '/ai/predict',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  }

  async batchPredict(dataArray) {
    if (
      !Array.isArray(dataArray) ||
      dataArray.length === 0
    ) {
      throw new TypeError(
        'batchPredict() expects a non-empty array.'
      );
    }

    if (
      !dataArray.every(
        (item) =>
          item &&
          typeof item === 'object' &&
          !Array.isArray(item)
      )
    ) {
      throw new TypeError(
        'Every batch item must be a feature object.'
      );
    }

    if (!this.isLoaded) {
      await this.loadModel();
    }

    return this._request(
      '/ai/batch-predict',
      {
        method: 'POST',
        body: JSON.stringify(dataArray),
      }
    );
  }

  async getModelInfo() {
    const result = await this._request(
      '/ai/model/info'
    );

    this.model = result;

    return result;
  }
}

if (
  typeof module !== 'undefined' &&
  module.exports
) {
  module.exports = AIWebIntegration;
}

if (typeof window !== 'undefined') {
  window.AIWebIntegration = AIWebIntegration;
}