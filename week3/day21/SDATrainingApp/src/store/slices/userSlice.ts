import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type {
  User,
  UserState,
  UserFilters,
} from '../../types';
import { apiService } from '../../services/apiService';

interface UpdateUserArgs {
  id: string;
  data: Partial<User>;
}

const initialState: UserState = {
  users: [],
  currentUser: null,
  loading: false,
  error: null,
};

export const fetchUsers = createAsyncThunk(
  'user/fetchUsers',
  async (filters: UserFilters = {}) => apiService.getUsers(filters),
);

export const fetchUser = createAsyncThunk<User, string>(
  'user/fetchUser',
  async id => apiService.getUser(id),
);

export const updateUser = createAsyncThunk<User, UpdateUserArgs>(
  'user/updateUser',
  async ({ id, data }) => apiService.updateUser(id, data),
);

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    clearUserError(state) {
      state.error = null;
    },
    clearUsers(state) {
      state.users = [];
      state.currentUser = null;
      state.error = null;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(fetchUsers.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.users = action.payload.users;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Could not load users.';
      })
      .addCase(fetchUser.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUser.fulfilled, (state, action) => {
        state.loading = false;
        state.currentUser = action.payload;
      })
      .addCase(fetchUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Could not load this user.';
      })
      .addCase(updateUser.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateUser.fulfilled, (state, action) => {
        state.loading = false;
        state.currentUser = action.payload;
        state.users = state.users.map(user =>
          user.id === action.payload.id ? action.payload : user,
        );
      })
      .addCase(updateUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Could not update user.';
      });
  },
});

export const { clearUserError, clearUsers } = userSlice.actions;
export default userSlice.reducer;