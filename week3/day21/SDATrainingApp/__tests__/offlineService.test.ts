jest.mock('@react-native-async-storage/async-storage', () => {
  const storage = new Map<string, string>();

  return {
    __esModule: true,
    default: {
      getItem: jest.fn((key: string) =>
        Promise.resolve(storage.get(key) ?? null),
      ),
      setItem: jest.fn((key: string, value: string) => {
        storage.set(key, value);
        return Promise.resolve();
      }),
      removeItem: jest.fn((key: string) => {
        storage.delete(key);
        return Promise.resolve();
      }),
    },
  };
});

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    fetch: jest.fn(),
    addEventListener: jest.fn(() => jest.fn()),
  },
}));

import NetInfo from '@react-native-community/netinfo';
import { apiService } from '../src/services/apiService';
import { offlineService } from '../src/services/offlineService';

const mockNetInfo = NetInfo as unknown as {
  fetch: jest.Mock;
};

const mockFetch = jest.fn();
const originalFetch = globalThis.fetch;

function installMockFetch(): void {
  Object.defineProperty(globalThis, 'fetch', {
    configurable: true,
    writable: true,
    value: mockFetch,
  });
}

function makeResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: jest.fn().mockResolvedValue(JSON.stringify(body)),
  } as unknown as Response;
}

describe('Day 21 offline service', () => {
  beforeEach(async () => {
    jest.clearAllMocks();

    mockFetch.mockReset();
    mockNetInfo.fetch.mockReset();

    installMockFetch();

    mockNetInfo.fetch.mockResolvedValue({
      isConnected: false,
      isInternetReachable: false,
    });

    apiService.setOfflineQueueHandler((endpoint, method, data) =>
      offlineService.queueRequest(endpoint, method, data),
    );

    await apiService.clearSession();
    await offlineService.clearOfflineData();
  });

  afterEach(() => {
    apiService.setOfflineQueueHandler(null);

    Object.defineProperty(globalThis, 'fetch', {
      configurable: true,
      writable: true,
      value: originalFetch,
    });
  });

  it('persists requests in the offline queue', async () => {
    await offlineService.queueRequest('/users/1', 'PUT', {
      name: 'Updated User',
    });

    const queue = await offlineService.getQueue();

    expect(queue).toHaveLength(1);
    expect(queue[0].endpoint).toBe('/users/1');
    expect(queue[0].method).toBe('PUT');
    expect(queue[0].retries).toBe(0);
  });

  it('stores and retrieves cached data', async () => {
    const analytics = {
      totalUsers: 100,
      activeUsers: 75,
      sessions: 250,
      revenue: 12000,
    };

    await offlineService.storeOfflineData(
      'analytics:30d',
      analytics,
      Date.now() + 60_000,
    );

    await expect(
      offlineService.getOfflineData('analytics:30d'),
    ).resolves.toEqual(analytics);
  });

  it('does not return expired cached data', async () => {
    await offlineService.storeOfflineData(
      'expired:data',
      { value: 'old' },
      Date.now() - 1000,
    );

    await expect(
      offlineService.getOfflineData('expired:data'),
    ).resolves.toBeNull();

    await expect(
      offlineService.getOfflineDataKeys(),
    ).resolves.not.toContain('expired:data');
  });

  it('automatically queues failed API write requests', async () => {
    mockFetch.mockRejectedValue(new Error('Network unavailable'));

    await expect(
      apiService.updateUser('user-42', {
        name: 'Offline Update',
      }),
    ).rejects.toThrow('saved for offline synchronization');

    const queue = await offlineService.getQueue();

    expect(queue).toHaveLength(1);
    expect(queue[0].endpoint).toBe('/users/user-42');
    expect(queue[0].data).toEqual({ name: 'Offline Update' });
  });

  it('preserves queued requests while the device is offline', async () => {
    await offlineService.queueRequest('/users/2', 'PATCH', {
      role: 'admin',
    });

    mockNetInfo.fetch.mockResolvedValue({
      isConnected: false,
      isInternetReachable: false,
    });

    await expect(offlineService.syncOfflineData()).resolves.toBe(0);

    expect(await offlineService.getQueue()).toHaveLength(1);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('removes successfully synchronized requests', async () => {
    await offlineService.queueRequest('/users/2', 'PATCH', {
      role: 'admin',
    });

    mockNetInfo.fetch.mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
    });

    mockFetch.mockResolvedValue(makeResponse({ success: true }));

    await expect(offlineService.syncOfflineData()).resolves.toBe(1);

    expect(await offlineService.getQueue()).toHaveLength(0);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('retains requests when synchronization fails', async () => {
    await offlineService.queueRequest('/users/3', 'PUT', {
      name: 'Test',
    });

    mockNetInfo.fetch.mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
    });

    mockFetch.mockRejectedValue(new Error('Network unavailable'));

    await expect(offlineService.syncOfflineData()).resolves.toBe(0);

    const queue = await offlineService.getQueue();

    expect(queue).toHaveLength(1);
    expect(queue[0].retries).toBe(1);
  });

  it('clears cached data and queued requests', async () => {
    await offlineService.queueRequest('/users/4', 'PUT', {
      name: 'Test',
    });

    await offlineService.storeOfflineData('profile:4', {
      name: 'Test',
    });

    await offlineService.clearOfflineData();

    expect(await offlineService.getQueue()).toHaveLength(0);
    expect(await offlineService.getOfflineData('profile:4')).toBeNull();
  });
});