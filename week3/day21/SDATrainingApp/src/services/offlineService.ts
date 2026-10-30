import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

import type { HttpMethod, OfflineRequest } from '../types';
import { apiService } from './apiService';

const QUEUE_KEY = 'day21:offline-queue';
const CACHE_KEY = 'day21:offline-cache';
const MAX_RETRIES = 3;

interface OfflineCacheRecord {
  key: string;
  data: unknown;
  timestamp: number;
  expiresAt?: number;
}

class OfflineService {
  private queue: OfflineRequest[] = [];
  private cache = new Map<string, OfflineCacheRecord>();

  private queueLoaded = false;
  private cacheLoaded = false;

  private queueLoading: Promise<void> | null = null;
  private cacheLoading: Promise<void> | null = null;
  private syncingPromise: Promise<number> | null = null;

  private async ensureQueueLoaded(): Promise<void> {
    if (this.queueLoaded) {
      return;
    }

    if (this.queueLoading) {
      await this.queueLoading;
      return;
    }

    this.queueLoading = (async () => {
      try {
        const stored = await AsyncStorage.getItem(QUEUE_KEY);

        if (stored) {
          const parsed: unknown = JSON.parse(stored);

          if (Array.isArray(parsed)) {
            this.queue = parsed.filter(
              (item): item is OfflineRequest =>
                typeof item === 'object' &&
                item !== null &&
                typeof item.id === 'string' &&
                typeof item.endpoint === 'string' &&
                typeof item.method === 'string' &&
                typeof item.timestamp === 'number',
            );
          }
        }
      } catch (error) {
        console.warn('Could not load offline queue.', error);
        this.queue = [];
      }

      this.queueLoaded = true;
    })();

    try {
      await this.queueLoading;
    } finally {
      this.queueLoading = null;
    }
  }

  private async ensureCacheLoaded(): Promise<void> {
    if (this.cacheLoaded) {
      return;
    }

    if (this.cacheLoading) {
      await this.cacheLoading;
      return;
    }

    this.cacheLoading = (async () => {
      try {
        const stored = await AsyncStorage.getItem(CACHE_KEY);

        if (stored) {
          const parsed: unknown = JSON.parse(stored);

          if (Array.isArray(parsed)) {
            for (const entry of parsed) {
              if (
                Array.isArray(entry) &&
                typeof entry[0] === 'string' &&
                typeof entry[1] === 'object' &&
                entry[1] !== null
              ) {
                this.cache.set(
                  entry[0],
                  entry[1] as OfflineCacheRecord,
                );
              }
            }
          }
        }
      } catch (error) {
        console.warn('Could not load offline cache.', error);
        this.cache.clear();
      }

      this.cacheLoaded = true;
    })();

    try {
      await this.cacheLoading;
    } finally {
      this.cacheLoading = null;
    }
  }

  private async persistQueue(): Promise<void> {
    await AsyncStorage.setItem(
      QUEUE_KEY,
      JSON.stringify(this.queue),
    );
  }

  private async persistCache(): Promise<void> {
    await AsyncStorage.setItem(
      CACHE_KEY,
      JSON.stringify(Array.from(this.cache.entries())),
    );
  }

  async getQueue(): Promise<OfflineRequest[]> {
    await this.ensureQueueLoaded();
    return this.queue.map(item => ({ ...item }));
  }

  async queueRequest(
    endpoint: string,
    method: HttpMethod,
    data?: unknown,
  ): Promise<void> {
    await this.ensureQueueLoaded();

    if (!endpoint.startsWith('/') || endpoint.startsWith('//')) {
      throw new Error('Queued endpoints must be relative API paths.');
    }

    if (endpoint.startsWith('/auth/')) {
      throw new Error('Authentication requests cannot be queued.');
    }

    const request: OfflineRequest = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      endpoint,
      method,
      data,
      timestamp: Date.now(),
      retries: 0,
    };

    this.queue.push(request);
    await this.persistQueue();
  }

  watchConnection(
    callback: (connected: boolean) => void,
  ): () => void {
    const publish = (
      connected: boolean | null,
      reachable: boolean | null,
    ) => {
      const online = connected === true && reachable !== false;

      callback(online);

      if (online) {
        this.syncOfflineData().catch(error => {
          console.warn('Automatic offline synchronization failed.', error);
        });
      }
    };

    const unsubscribe = NetInfo.addEventListener(state => {
      publish(state.isConnected, state.isInternetReachable);
    });

    NetInfo.fetch()
      .then(state => {
        publish(state.isConnected, state.isInternetReachable);
      })
      .catch(() => {
        callback(false);
      });

    return unsubscribe;
  }

  async syncOfflineData(): Promise<number> {
    await this.ensureQueueLoaded();

    if (this.syncingPromise) {
      return this.syncingPromise;
    }

    this.syncingPromise = this.performSync();

    try {
      return await this.syncingPromise;
    } finally {
      this.syncingPromise = null;
    }
  }

  private async performSync(): Promise<number> {
    try {
      const state = await NetInfo.fetch();

      if (
        state.isConnected !== true ||
        state.isInternetReachable === false
      ) {
        return 0;
      }
    } catch {
      return 0;
    }

    const pending = this.queue.filter(
      item => (item.retries ?? 0) < MAX_RETRIES,
    );

    let synced = 0;

    for (const item of pending) {
      try {
        await apiService.sendQueuedRequest(item);

        this.queue = this.queue.filter(
          queued => queued.id !== item.id,
        );

        await this.persistQueue();
        synced += 1;
      } catch (error) {
        const retries = (item.retries ?? 0) + 1;

        this.queue = this.queue.map(queued =>
          queued.id === item.id
            ? { ...queued, retries }
            : queued,
        );

        await this.persistQueue();

        console.warn(
          `Offline request ${item.id} failed (${retries}/${MAX_RETRIES}).`,
          error,
        );
      }
    }

    return synced;
  }

  async retryFailedRequests(): Promise<number> {
    await this.ensureQueueLoaded();

    this.queue = this.queue.map(item => ({
      ...item,
      retries: 0,
    }));

    await this.persistQueue();

    return this.syncOfflineData();
  }

  async storeOfflineData(
    key: string,
    data: unknown,
    expiresAt?: number,
  ): Promise<void> {
    await this.ensureCacheLoaded();

    this.cache.set(key, {
      key,
      data,
      timestamp: Date.now(),
      expiresAt,
    });

    await this.persistCache();
  }

  async getOfflineData<T = unknown>(key: string): Promise<T | null> {
    await this.ensureCacheLoaded();

    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    if (
      entry.expiresAt !== undefined &&
      Date.now() >= entry.expiresAt
    ) {
      this.cache.delete(key);
      await this.persistCache();
      return null;
    }

    return entry.data as T;
  }

  async getOfflineDataKeys(): Promise<string[]> {
    await this.ensureCacheLoaded();

    const now = Date.now();
    let changed = false;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt !== undefined && now >= entry.expiresAt) {
        this.cache.delete(key);
        changed = true;
      }
    }

    if (changed) {
      await this.persistCache();
    }

    return Array.from(this.cache.keys());
  }

  async clearOfflineData(): Promise<void> {
    await this.ensureQueueLoaded();
    await this.ensureCacheLoaded();

    this.queue = [];
    this.cache.clear();

    await Promise.all([
      AsyncStorage.removeItem(QUEUE_KEY),
      AsyncStorage.removeItem(CACHE_KEY),
    ]);
  }
}

export const offlineService = new OfflineService();

apiService.setOfflineQueueHandler((endpoint, method, data) =>
  offlineService.queueRequest(endpoint, method, data),
);