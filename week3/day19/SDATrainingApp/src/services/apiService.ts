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

// Android emulator address. Change it when using a physical device.
export const API_BASE_URL = 'http://10.0.2.2:3000/api/v1';

const TOKEN_KEY = 'authToken';
const USER_KEY = 'authUser';

interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  headers?: Record<string, string>;
}

class ApiService {
  private token: string | null | undefined;

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

      if (!user.id || !user.name || !user.email) {
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

    let response: Response;

    try {
      response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: options.method ?? 'GET',
        headers,
        body:
          options.body === undefined
            ? undefined
            : JSON.stringify(options.body),
      });
    } catch {
      throw new Error(
        `Unable to reach ${API_BASE_URL}. Check the backend and API address.`,
      );
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

      if (
        typeof payload === 'object' &&
        payload !== null &&
        'message' in payload
      ) {
        message = String(
          (payload as { message?: unknown }).message ?? message,
        );
      }

      throw new Error(message);
    }

    return payload as T;
  }

  async login(credentials: LoginCredentials): Promise<LoginPayload> {
    const response = await this.request<
      ApiEnvelope<LoginPayload> | LoginPayload
    >('/auth/login', {
      method: 'POST',
      body: credentials,
    });

    const result = this.unwrapData(response);

    if (!result?.user || !result?.token) {
      throw new Error(
        'Login response must contain a user and token.',
      );
    }

    await this.saveSession(result.token, result.user);
    return result;
  }

  async logout(): Promise<void> {
    const token = await this.getToken();

    try {
      if (token && token !== 'demo-token') {
        await this.request('/auth/logout', { method: 'POST' });
      }
    } finally {
      await this.clearSession();
    }
  }

  async getCurrentUser(): Promise<User> {
    const response = await this.request<ApiEnvelope<User> | User>(
      '/auth/me',
    );

    return this.unwrapData(response);
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

    const response = await this.request<
      ApiEnvelope<UsersResult> | UsersResult
    >(`/users${query}`);

    return this.unwrapData(response);
  }

  async getUser(id: string): Promise<User> {
    const response = await this.request<ApiEnvelope<User> | User>(
      `/users/${encodeURIComponent(id)}`,
    );

    return this.unwrapData(response);
  }

  async updateUser(
    id: string,
    data: Partial<User>,
  ): Promise<User> {
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
    const response = await this.request<
      ApiEnvelope<AnalyticsData> | AnalyticsData
    >(`/analytics?timeRange=${encodeURIComponent(timeRange)}`);

    return this.unwrapData(response);
  }

  async sendQueuedRequest(item: OfflineRequest): Promise<void> {
    await this.request(item.endpoint, {
      method: item.method,
      body: item.data,
    });
  }
}

export const apiService = new ApiService();