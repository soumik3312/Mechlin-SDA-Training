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

import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from '../src/services/apiService';
import type { User } from '../src/types';

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

const testUser: User = {
  id: 'user-1',
  name: 'Test User',
  email: 'test@example.com',
};

describe('Day 21 API service', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    mockFetch.mockReset();

    installMockFetch();

    apiService.setOfflineQueueHandler(null);
    await apiService.clearSession();
  });

  afterEach(() => {
    apiService.setOfflineQueueHandler(null);

    Object.defineProperty(globalThis, 'fetch', {
      configurable: true,
      writable: true,
      value: originalFetch,
    });
  });

  it('sends the stored token with authenticated requests', async () => {
    await apiService.saveSession('test-token', testUser);

    mockFetch.mockResolvedValue(makeResponse({ data: testUser }));

    const result = await apiService.get<User>('/auth/me');

    expect(result).toEqual(testUser);

    const requestOptions = mockFetch.mock.calls[0][1] as RequestInit;
    const headers = requestOptions.headers as Record<string, string>;

    expect(headers.Authorization).toBe('Bearer test-token');
  });

  it('returns data from API response envelopes', async () => {
    mockFetch.mockResolvedValue(
      makeResponse({
        success: true,
        data: testUser,
      }),
    );

    await expect(
      apiService.get<User>('/users/1'),
    ).resolves.toEqual(testUser);
  });

  it('clears the stored session after HTTP 401', async () => {
    await apiService.saveSession('expired-token', testUser);

    mockFetch.mockResolvedValue(
      makeResponse({ message: 'Session expired' }, 401),
    );

    await expect(apiService.get('/auth/me')).rejects.toThrow(
      'Session expired',
    );

    await expect(apiService.getStoredSession()).resolves.toBeNull();

    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('authToken');
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('authUser');
  });

  it('queues failed write requests when a handler is registered', async () => {
    const queueHandler = jest.fn().mockResolvedValue(undefined);

    apiService.setOfflineQueueHandler(queueHandler);
    mockFetch.mockRejectedValue(new Error('Network unavailable'));

    await expect(
      apiService.updateUser('user-1', { name: 'Updated User' }),
    ).rejects.toThrow('saved for offline synchronization');

    expect(queueHandler).toHaveBeenCalledWith(
      '/users/user-1',
      'PUT',
      { name: 'Updated User' },
    );
  });

  it('does not queue failed GET requests', async () => {
    const queueHandler = jest.fn().mockResolvedValue(undefined);

    apiService.setOfflineQueueHandler(queueHandler);
    mockFetch.mockRejectedValue(new Error('Network unavailable'));

    await expect(apiService.get('/users')).rejects.toThrow(
      'Unable to reach',
    );

    expect(queueHandler).not.toHaveBeenCalled();
  });

  it('does not queue authentication requests', async () => {
    const queueHandler = jest.fn().mockResolvedValue(undefined);

    apiService.setOfflineQueueHandler(queueHandler);
    mockFetch.mockRejectedValue(new Error('Network unavailable'));

    await expect(
      apiService.login({
        email: 'test@example.com',
        password: 'test-password',
      }),
    ).rejects.toThrow('Unable to reach');

    expect(queueHandler).not.toHaveBeenCalled();
  });

  it('reports when saving an offline request fails', async () => {
    const queueHandler = jest.fn().mockRejectedValue(
      new Error('Storage unavailable'),
    );

    apiService.setOfflineQueueHandler(queueHandler);
    mockFetch.mockRejectedValue(new Error('Network unavailable'));

    await expect(
      apiService.updateUser('user-1', { name: 'Updated User' }),
    ).rejects.toThrow('could not save the offline request');
  });
});