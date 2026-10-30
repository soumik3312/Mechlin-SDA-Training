import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type {
  AuthState,
  LoginCredentials,
  LoginPayload,
  User,
} from '../../types';
import { apiService } from '../../services/apiService';

const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  token: null,
  loading: false,
  error: null,
};

export const loginUser = createAsyncThunk<
  LoginPayload,
  LoginCredentials
>('auth/loginUser', async credentials => apiService.login(credentials));

export const loginDemo = createAsyncThunk<LoginPayload>(
  'auth/loginDemo',
  async () => {
    const payload: LoginPayload = {
      user: {
        id: 'demo-user',
        name: 'Demo User',
        email: 'demo@example.com',
        role: 'Developer',
      } satisfies User,
      token: 'demo-token',
    };

    await apiService.saveSession(payload.token, payload.user);
    return payload;
  },
);

export const checkAuthStatus = createAsyncThunk<LoginPayload | null>(
  'auth/checkAuthStatus',
  async () => apiService.getStoredSession(),
);

export const logoutUser = createAsyncThunk<void>(
  'auth/logoutUser',
  async () => apiService.logout(),
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearAuthError(state) {
      state.error = null;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(loginUser.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Login failed.';
      })
      .addCase(loginDemo.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginDemo.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.error = null;
      })
      .addCase(loginDemo.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Demo login failed.';
      })
      .addCase(checkAuthStatus.fulfilled, (state, action) => {
        state.isAuthenticated = action.payload !== null;
        state.user = action.payload?.user ?? null;
        state.token = action.payload?.token ?? null;
      })
      .addCase(logoutUser.fulfilled, state => {
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        state.loading = false;
        state.error = null;
      })
      .addCase(logoutUser.rejected, state => {
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        state.loading = false;
      });
  },
});

export const { clearAuthError } = authSlice.actions;
export default authSlice.reducer;