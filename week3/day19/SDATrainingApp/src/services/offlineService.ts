import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import type { HttpMethod, OfflineRequest } from '../types';
import { apiService } from './apiService';

const QUEUE_KEY = 'day19:offline-queue';

class OfflineService {
  private queue: OfflineRequest[] = [];
  private loaded = false;
  private loadingPromise: Promise<void> | null = null;
  private syncingPromise: Promise<number> | null = null;

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) {
      return;
    }

    if (this.loadingPromise) {
      await this.loadingPromise;
      return;
    }

    this.loadingPromise = (async () => {
      try {
        const stored = await AsyncStorage.getItem(QUEUE_KEY);

        if (stored) {
          const parsed: unknown = JSON.parse(stored);
          this.queue = Array.isArray(parsed)
            ? (parsed as OfflineRequest[])
            : [];
        }
      } catch (error) {
        console.warn('Could not load offline queue.', error);
        this.queue = [];
      }

      this.loaded = true;
    })();

    try {
      await this.loadingPromise;
    } finally {
      this.loadingPromise = null;
    }
  }

  private async persistQueue(): Promise<void> {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue));
  }

  async getQueue(): Promise<OfflineRequest[]> {
    await this.ensureLoaded();
    return this.queue.map(item => ({ ...item }));
  }

  async queueRequest(
    endpoint: string,
    method: HttpMethod,
    data?: unknown,
  ): Promise<void> {
    await this.ensureLoaded();

    const request: OfflineRequest = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      endpoint,
      method,
      data,
      timestamp: Date.now(),
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
      callback(connected === true && reachable !== false);
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
    await this.ensureLoaded();

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
        state.isInternetReachable === false ||
        this.queue.length === 0
      ) {
        return 0;
      }
    } catch {
      return 0;
    }

    let synced = 0;
    const pending = [...this.queue];

    for (const item of pending) {
      try {
        await apiService.sendQueuedRequest(item);

        this.queue = this.queue.filter(
          queued => queued.id !== item.id,
        );

        await this.persistQueue();
        synced += 1;
      } catch (error) {
        // Failed requests remain stored for a future retry.
        console.warn(`Request ${item.id} remains queued.`, error);
      }
    }

    return synced;
  }
}

export const offlineService = new OfflineService();