import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type {
  AnalyticsData,
  AnalyticsState,
} from '../../types';
import { apiService } from '../../services/apiService';

const initialState: AnalyticsState = {
  data: null,
  loading: false,
  error: null,
};

export const fetchAnalytics = createAsyncThunk<
  AnalyticsData,
  string | undefined
>('analytics/fetchAnalytics', async timeRange =>
  apiService.getAnalytics(timeRange ?? '30d'),
);

const analyticsSlice = createSlice({
  name: 'analytics',
  initialState,
  reducers: {
    clearAnalyticsError(state) {
      state.error = null;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(fetchAnalytics.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAnalytics.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(fetchAnalytics.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.error.message ?? 'Could not load analytics.';
      });
  },
});

export const { clearAnalyticsError } = analyticsSlice.actions;
export default analyticsSlice.reducer;