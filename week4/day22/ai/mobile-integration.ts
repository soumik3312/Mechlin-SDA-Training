import { Platform } from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';


export interface AIPrediction {
  success: boolean;

  prediction: string | null;

  confidence: number | null;

  cached?: boolean;

  error?: string;
}


export interface AIModelInfo {
  name: string;

  version: string;

  accuracy: number | null;

  lastUpdated: number | null;

  trainingMetrics?: Record<string, number>;
}


interface CachedPrediction {
  result: AIPrediction;

  timestamp: number;
}


interface BatchPredictionResponse {
  success: boolean;

  predictions: string[];

  confidences: Array<number | null>;
}


class AIMobileIntegration {
  private readonly apiBaseUrl: string;

  private readonly cachePrefix = 'ai_prediction_';

  private readonly cacheTtlMs = 60 * 60 * 1000;

  private isOnline = true;


  constructor(
    apiBaseUrl: string =
      AIMobileIntegration.getDefaultApiBaseUrl()
  ) {
    if (!apiBaseUrl.trim()) {
      throw new TypeError(
        'apiBaseUrl must be a non-empty URL string.'
      );
    }

    this.apiBaseUrl = apiBaseUrl.replace(
      /\/+$/,
      ''
    );

    this.initializeNetworkListener();
  }


  static getDefaultApiBaseUrl(): string {

    // Android emulator address for the host machine.
    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:5000';
    }

    // iOS simulator development address.
    return 'http://localhost:5000';
  }


  private initializeNetworkListener(): void {

    // The host application can connect NetInfo here
    // and update status through setNetworkStatus().

    this.isOnline = true;
  }


  setNetworkStatus(
    isConnected: boolean | null
  ): void {

    this.isOnline = isConnected === true;
  }


  private async request<T>(
    path: string,
    body?: unknown
  ): Promise<T> {

    const response = await fetch(
      `${this.apiBaseUrl}${path}`,
      {
        method: body === undefined ? 'GET' : 'POST',

        headers: {
          Accept: 'application/json',

          ...(body === undefined
            ? {}
            : {
                'Content-Type': 'application/json',
              }),
        },

        ...(body === undefined
          ? {}
          : {
              body: JSON.stringify(body),
            }),
      }
    );

    const payload = await response.json().catch(
      () => ({})
    );

    if (!response.ok) {
      const message =
        typeof payload.error === 'string'
          ? payload.error
          : `AI service returned HTTP ${response.status}.`;

      throw new Error(message);
    }

    return payload as T;
  }


  async predict(
    data: Record<string, unknown>
  ): Promise<AIPrediction> {

    if (
      !data ||
      typeof data !== 'object' ||
      Array.isArray(data)
    ) {
      throw new TypeError(
        'predict() expects one feature object.'
      );
    }

    const cacheKey = this.generateCacheKey(
      data
    );

    const cached = await this.getCachedPrediction(
      cacheKey
    );

    if (!this.isOnline && cached) {
      return {
        ...cached,
        cached: true,
      };
    }

    try {
      const result = await this.request<AIPrediction>(
        '/ai/predict',
        data
      );

      this.isOnline = true;

      await this.cachePrediction(
        cacheKey,
        result
      );

      return result;

    } catch (error) {

      this.isOnline = false;

      if (cached) {
        return {
          ...cached,
          cached: true,
        };
      }

      return {
        success: false,
        prediction: null,
        confidence: null,

        error:
          error instanceof Error
            ? error.message
            : 'Unknown prediction error.',
      };
    }
  }


  async batchPredict(
    dataArray: Array<Record<string, unknown>>
  ): Promise<AIPrediction[]> {

    if (
      !Array.isArray(dataArray) ||
      dataArray.length === 0
    ) {
      throw new TypeError(
        'batchPredict() expects a non-empty array.'
      );
    }

    try {
      const result =
        await this.request<BatchPredictionResponse>(
          '/ai/batch-predict',
          dataArray
        );

      this.isOnline = true;

      return result.predictions.map(
        (prediction, index) => ({
          success: true,

          prediction,

          confidence:
            result.confidences[index] ?? null,
        })
      );

    } catch (error) {

      this.isOnline = false;

      console.error(
        'AI batch prediction failed:',
        error
      );

      return [];
    }
  }


  async getModelInfo(): Promise<AIModelInfo | null> {

    try {
      const result = await this.request<AIModelInfo>(
        '/ai/model/info'
      );

      this.isOnline = true;

      return result;

    } catch (error) {

      this.isOnline = false;

      console.error(
        'Failed to retrieve AI model information:',
        error
      );

      return null;
    }
  }


  private generateCacheKey(
    data: Record<string, unknown>
  ): string {

    const stableValue = (
      value: unknown
    ): string => {

      if (Array.isArray(value)) {
        return `[${value.map(stableValue).join(',')}]`;
      }

      if (value && typeof value === 'object') {

        const record = value as Record<
          string,
          unknown
        >;

        return `{${Object.keys(record)
          .sort()
          .map(
            (key) =>
              `${JSON.stringify(key)}:${stableValue(record[key])}`
          )
          .join(',')}}`;
      }

      return JSON.stringify(value) ?? 'null';
    };

    const text = stableValue(data);

    let hash = 2166136261;

    for (
      let index = 0;
      index < text.length;
      index += 1
    ) {
      hash ^= text.charCodeAt(index);

      hash = Math.imul(
        hash,
        16777619
      );
    }

    return (hash >>> 0).toString(16);
  }


  private async getCachedPrediction(
    cacheKey: string
  ): Promise<AIPrediction | null> {

    try {
      const cached = await AsyncStorage.getItem(
        `${this.cachePrefix}${cacheKey}`
      );

      if (!cached) {
        return null;
      }

      const entry = JSON.parse(
        cached
      ) as CachedPrediction;

      if (
        !entry ||
        typeof entry.timestamp !== 'number' ||
        !entry.result
      ) {
        return null;
      }

      if (
        Date.now() - entry.timestamp >= this.cacheTtlMs
      ) {
        await AsyncStorage.removeItem(
          `${this.cachePrefix}${cacheKey}`
        );

        return null;
      }

      return entry.result;

    } catch (error) {

      console.error(
        'Failed to read cached prediction:',
        error
      );

      return null;
    }
  }


  private async cachePrediction(
    cacheKey: string,
    result: AIPrediction
  ): Promise<void> {

    try {
      const entry: CachedPrediction = {
        result,
        timestamp: Date.now(),
      };

      await AsyncStorage.setItem(
        `${this.cachePrefix}${cacheKey}`,
        JSON.stringify(entry)
      );

    } catch (error) {

      console.error(
        'Failed to cache AI prediction:',
        error
      );
    }
  }


  async clearCache(): Promise<void> {

    try {
      const keys = await AsyncStorage.getAllKeys();

      const aiKeys = keys.filter(
        (key) => key.startsWith(this.cachePrefix)
      );

      if (aiKeys.length > 0) {
        await AsyncStorage.multiRemove(
          aiKeys
        );
      }

    } catch (error) {

      console.error(
        'Failed to clear AI prediction cache:',
        error
      );
    }
  }
}


export default AIMobileIntegration;