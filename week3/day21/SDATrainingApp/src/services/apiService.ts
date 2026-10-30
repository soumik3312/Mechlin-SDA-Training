import AsyncStorage from '@react-native-async-storage/async-storage';

import type {
  AnalyticsData,
  ApiEnvelope,
  HttpMethod,
  LoginCredentials,
  LoginPayload,
  OfflineRequest,
  User,
  UserFilters,
  UsersResult,
} from '../types';

export const API_BASE_URL = 'http://10.0.2.2:3000/api/v1';

const TOKEN_KEY = 'authToken';
const USER_KEY = 'authUser';
const REQUEST_TIMEOUT_MS = 30_000;

interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  headers?: Record<string, string>;
  timeoutMs?: number;
  queueIfOffline?: boolean;
}

type OfflineQueueHandler = (
  endpoint: string,
  method: HttpMethod,
  data?: unknown,
) => Promise<void>;

class ApiService {
  private token: string | null | undefined;
  private offlineQueueHandler: OfflineQueueHandler | null = null;

  setOfflineQueueHandler(handler: OfflineQueueHandler | null): void {
    this.offlineQueueHandler = handler;
  }

  private unwrapData<T>(payload: T | ApiEnvelope<T>): T {
    if (
      typeof payload === 'object' &&
      payload !== null &&
      'data' in payload
    ) {
      const envelope = payload as ApiEnvelope<T>;

      if (envelope.data !== undefined) {
        return envelope.data;
      }
    }

    return payload as T;
  }

  private async getToken(): Promise<string | null> {
    if (this.token === undefined) {
      try {
        this.token = await AsyncStorage.getItem(TOKEN_KEY);
      } catch {
        this.token = null;
      }
    }

    return this.token;
  }

  async saveSession(token: string, user: User): Promise<void> {
    this.token = token;

    await Promise.all([
      AsyncStorage.setItem(TOKEN_KEY, token),
      AsyncStorage.setItem(USER_KEY, JSON.stringify(user)),
    ]);
  }

  async getStoredSession(): Promise<LoginPayload | null> {
    try {
      const [token, storedUser] = await Promise.all([
        AsyncStorage.getItem(TOKEN_KEY),
        AsyncStorage.getItem(USER_KEY),
      ]);

      if (!token || !storedUser) {
        this.token = null;
        return null;
      }

      const user = JSON.parse(storedUser) as User;

      if (!user?.id || !user?.name || !user?.email) {
        await this.clearSession();
        return null;
      }

      this.token = token;
      return { token, user };
    } catch {
      this.token = null;
      return null;
    }
  }

  async clearSession(): Promise<void> {
    this.token = null;

    await Promise.all([
      AsyncStorage.removeItem(TOKEN_KEY),
      AsyncStorage.removeItem(USER_KEY),
    ]);
  }

  private async request<T>(
    endpoint: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const token = await this.getToken();
    const method = options.method ?? 'GET';

    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...options.headers,
    };

    if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const controller = new AbortController();
    const timeoutMs = options.timeoutMs ?? REQUEST_TIMEOUT_MS;

    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    let response: Response;

    try {
      response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method,
        headers,
        body:
          options.body === undefined
            ? undefined
            : JSON.stringify(options.body),
        signal: controller.signal,
      });
    } catch (error) {
      const timedOut =
        controller.signal.aborted ||
        (error instanceof Error && error.name === 'AbortError');

      if (timedOut) {
        throw new Error(`API request timed out after ${timeoutMs} ms.`);
      }

      const isWriteRequest = [
        'POST',
        'PUT',
        'PATCH',
        'DELETE',
      ].includes(method);

      const isSafeEndpoint =
        endpoint.startsWith('/') &&
        !endpoint.startsWith('//') &&
        !endpoint.startsWith('/auth/');

      if (
        options.queueIfOffline !== false &&
        isWriteRequest &&
        isSafeEndpoint &&
        this.offlineQueueHandler
      ) {
        try {
          await this.offlineQueueHandler(
            endpoint,
            method,
            options.body,
          );
        } catch (queueError) {
          const detail =
            queueError instanceof Error
              ? queueError.message
              : 'Unknown storage error';

          throw new Error(
            `Unable to reach API and could not save the offline request: ${detail}`,
          );
        }

        throw new Error(
          `${method} ${endpoint} was saved for offline synchronization.`,
        );
      }

      throw new Error(
        `Unable to reach ${API_BASE_URL}. Check your network, backend, and API address.`,
      );
    } finally {
      clearTimeout(timeoutId);
    }

    const responseText = await response.text();
    let payload: unknown = null;

    if (responseText) {
      try {
        payload = JSON.parse(responseText) as unknown;
      } catch {
        payload = responseText;
      }
    }

    if (!response.ok) {
      let message = `Request failed with HTTP ${response.status}.`;

      if (typeof payload === 'object' && payload !== null) {
        if ('message' in payload && payload.message) {
          message = String(payload.message);
        } else if ('error' in payload && payload.error) {
          message = String(payload.error);
        }
      }

      if (response.status === 401) {
        try {
          await this.clearSession();
        } catch {
          // Preserve the original authentication error.
        }
      }

      throw new Error(message);
    }

    return payload as T;
  }

  async get<T>(endpoint: string): Promise<T> {
    const response = await this.request<ApiEnvelope<T> | T>(endpoint);
    return this.unwrapData(response);
  }

  async login(credentials: LoginCredentials): Promise<LoginPayload> {
    const response = await this.request<
      ApiEnvelope<LoginPayload> | LoginPayload
    >('/auth/login', {
      method: 'POST',
      body: credentials,
      queueIfOffline: false,
    });

    const result = this.unwrapData(response);

    if (!result?.user || !result?.token) {
      throw new Error('Login response must contain a user and token.');
    }

    await this.saveSession(result.token, result.user);
    return result;
  }

  async logout(): Promise<void> {
    const token = await this.getToken();

    try {
      if (token && token !== 'demo-token') {
        await this.request('/auth/logout', {
          method: 'POST',
          queueIfOffline: false,
        });
      }
    } finally {
      await this.clearSession();
    }
  }

  async getCurrentUser(): Promise<User> {
    return this.get<User>('/auth/me');
  }

  async getUsers(filters: UserFilters = {}): Promise<UsersResult> {
    const params: string[] = [];

    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== '') {
        params.push(
          `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`,
        );
      }
    }

    const query = params.length > 0 ? `?${params.join('&')}` : '';

    return this.get<UsersResult>(`/users${query}`);
  }

  async getUser(id: string): Promise<User> {
    return this.get<User>(`/users/${encodeURIComponent(id)}`);
  }

  async updateUser(id: string, data: Partial<User>): Promise<User> {
    const response = await this.request<ApiEnvelope<User> | User>(
      `/users/${encodeURIComponent(id)}`,
      {
        method: 'PUT',
        body: data,
      },
    );

    return this.unwrapData(response);
  }

  async getAnalytics(timeRange = '30d'): Promise<AnalyticsData> {
    return this.get<AnalyticsData>(
      `/analytics?timeRange=${encodeURIComponent(timeRange)}`,
    );
  }

  async sendQueuedRequest(item: OfflineRequest): Promise<void> {
    if (
      !item.endpoint.startsWith('/') ||
      item.endpoint.startsWith('//') ||
      item.endpoint.startsWith('/auth/')
    ) {
      throw new Error('Invalid endpoint for offline synchronization.');
    }

    await this.request(item.endpoint, {
      method: item.method,
      body: item.data,
      queueIfOffline: false,
    });
  }
}

export const apiService = new ApiService();