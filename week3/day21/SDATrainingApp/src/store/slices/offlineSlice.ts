import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { OfflineState } from '../../types';

const initialState: OfflineState = {
  isConnected: null,
  queueCount: 0,
  syncing: false,
  lastSyncAt: null,
};

const offlineSlice = createSlice({
  name: 'offline',
  initialState,
  reducers: {
    setConnectionStatus(state, action: PayloadAction<boolean>) {
      state.isConnected = action.payload;
    },
    setOfflineQueueCount(state, action: PayloadAction<number>) {
      state.queueCount = Math.max(0, action.payload);
    },
    setSyncing(state, action: PayloadAction<boolean>) {
      state.syncing = action.payload;
    },
    setLastSyncAt(state, action: PayloadAction<number | null>) {
      state.lastSyncAt = action.payload;
    },
  },
});

export const {
  setConnectionStatus,
  setOfflineQueueCount,
  setSyncing,
  setLastSyncAt,
} = offlineSlice.actions;

export default offlineSlice.reducer;