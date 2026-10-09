export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  Analytics: undefined;
  Profile: undefined;
  Settings: undefined;
};

export interface User {
  id: string;
  name: string;
  email: string;
  role?: string;
  avatar?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginPayload {
  user: User;
  token: string;
}

export interface ApiEnvelope<T> {
  success?: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface UserFilters {
  search?: string;
  role?: string;
  page?: number;
  limit?: number;
}

export interface UsersResult {
  users: User[];
  pagination?: Pagination;
}

export interface AnalyticsData {
  totalUsers: number;
  activeUsers: number;
  sessions: number;
  revenue: number;
}

export interface OfflineRequest {
  id: string;
  endpoint: string;
  method: HttpMethod;
  data?: unknown;
  timestamp: number;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}

export interface UserState {
  users: User[];
  currentUser: User | null;
  loading: boolean;
  error: string | null;
}

export interface AnalyticsState {
  data: AnalyticsData | null;
  loading: boolean;
  error: string | null;
}

export interface OfflineState {
  isConnected: boolean | null;
  queueCount: number;
  syncing: boolean;
  lastSyncAt: number | null;
}