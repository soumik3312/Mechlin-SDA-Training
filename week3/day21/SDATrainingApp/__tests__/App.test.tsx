import offlineReducer, {
  setConnectionStatus,
  setLastSyncAt,
  setOfflineQueueCount,
  setSyncing,
} from '../src/store/slices/offlineSlice';

describe('Day 19 offline Redux state', () => {
  it('starts with the expected initial values', () => {
    const state = offlineReducer(undefined, { type: '@@INIT' });

    expect(state.isConnected).toBeNull();
    expect(state.queueCount).toBe(0);
    expect(state.syncing).toBe(false);
    expect(state.lastSyncAt).toBeNull();
  });

  it('updates network connection state', () => {
    const state = offlineReducer(
      undefined,
      setConnectionStatus(false),
    );

    expect(state.isConnected).toBe(false);
  });

  it('stores a non-negative queue count', () => {
    const queued = offlineReducer(
      undefined,
      setOfflineQueueCount(4),
    );

    expect(queued.queueCount).toBe(4);

    const cleared = offlineReducer(
      queued,
      setOfflineQueueCount(-5),
    );

    expect(cleared.queueCount).toBe(0);
  });

  it('tracks synchronization status and time', () => {
    let state = offlineReducer(undefined, setSyncing(true));

    expect(state.syncing).toBe(true);

    state = offlineReducer(state, setLastSyncAt(123456));

    expect(state.lastSyncAt).toBe(123456);
  });
});