
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import { apiService } from '../services/apiService';
import { offlineService } from '../services/offlineService';
import { realtimeService } from '../services/realtimeService';

export interface UseApiOptions {
  enableRealtime?: boolean;
  enableOffline?: boolean;
  cacheKey?: string;
  cacheExpiry?: number;
}

export interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  isOnline: boolean;
  isRealtimeConnected: boolean;
  refetch: () => Promise<void>;
}

const DEFAULT_CACHE_EXPIRY_MS = 5 * 60 * 1000;

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'An unexpected API error occurred.';
}

export function useApi<T>(
  endpoint: string,
  options: UseApiOptions = {},
): UseApiResult<T> {
  const {
    enableRealtime = false,
    enableOffline = true,
    cacheKey,
    cacheExpiry = DEFAULT_CACHE_EXPIRY_MS,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);

  const mountedRef = useRef(true);
  const effectiveCacheKey = cacheKey ?? endpoint;

  // Track component mounting state.
  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Monitor network connectivity.
  useEffect(() => {
    return offlineService.watchConnection(connected => {
      if (mountedRef.current) {
        setIsOnline(connected);
      }
    });
  }, []);

  // Fetch API data with offline cache fallback.
  const fetchData = useCallback(async (): Promise<void> => {
    if (!mountedRef.current) {
      return;
    }

    setError(null);

    // Read cached data when the device is offline.
    if (!isOnline && enableOffline) {
      setLoading(false);

      try {
        const cached = await offlineService.getOfflineData<T>(
          effectiveCacheKey,
        );

        if (!mountedRef.current) {
          return;
        }

        if (cached !== null) {
          setData(cached);
          return;
        }

        setError(
          'You are offline and no cached data is available.',
        );
      } catch (cacheError) {
        if (mountedRef.current) {
          setError(getErrorMessage(cacheError));
        }
      }

      return;
    }

    setLoading(true);

    try {
      // Request fresh data from the API.
      const result = await apiService.get<T>(endpoint);

      if (!mountedRef.current) {
        return;
      }

      setData(result);

      // Save successful responses for offline use.
      if (enableOffline) {
        try {
          await offlineService.storeOfflineData(
            effectiveCacheKey,
            result,
            Date.now() + Math.max(0, cacheExpiry),
          );
        } catch (cacheError) {
          console.warn(
            'Could not persist API response cache.',
            cacheError,
          );
        }
      }
    } catch (requestError) {
      if (!mountedRef.current) {
        return;
      }

      const message = getErrorMessage(requestError);

      // Try cached data when the API request fails.
      if (enableOffline) {
        try {
          const cached = await offlineService.getOfflineData<T>(
            effectiveCacheKey,
          );

          if (!mountedRef.current) {
            return;
          }

          if (cached !== null) {
            setData(cached);
            setError(`${message} Showing cached data.`);
            return;
          }
        } catch (cacheError) {
          console.warn(
            'Could not read API response cache.',
            cacheError,
          );
        }
      }

      if (mountedRef.current) {
        setError(message);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [
    endpoint,
    isOnline,
    enableOffline,
    effectiveCacheKey,
    cacheExpiry,
  ]);

  // Fetch data when the endpoint or network state changes.
  useEffect(() => {
    fetchData().catch(fetchError => {
      if (mountedRef.current) {
        setError(getErrorMessage(fetchError));
        setLoading(false);
      }
    });
  }, [fetchData]);

  // Subscribe to real-time updates.
  useEffect(() => {
    if (!enableRealtime) {
      setIsRealtimeConnected(false);
      return;
    }

    const handleUpdate = (payload: unknown): void => {
      if (!mountedRef.current) {
        return;
      }

      const updatedData = payload as T;

      setData(updatedData);

      // Persist real-time data for offline access.
      if (enableOffline) {
        offlineService
          .storeOfflineData(
            effectiveCacheKey,
            updatedData,
            Date.now() + Math.max(0, cacheExpiry),
          )
          .catch(cacheError => {
            console.warn(
              'Could not cache real-time update.',
              cacheError,
            );
          });
      }
    };

    const handleConnected = (): void => {
      if (mountedRef.current) {
        setIsRealtimeConnected(true);
      }
    };

    const handleDisconnected = (): void => {
      if (mountedRef.current) {
        setIsRealtimeConnected(false);
      }
    };

    const unsubscribeUpdate = realtimeService.subscribe(
      'dataUpdate',
      handleUpdate,
    );

    const unsubscribeConnected = realtimeService.subscribe(
      'connected',
      handleConnected,
    );

    const unsubscribeDisconnected = realtimeService.subscribe(
      'disconnected',
      handleDisconnected,
    );

    return () => {
      unsubscribeUpdate();
      unsubscribeConnected();
      unsubscribeDisconnected();
    };
  }, [
    enableRealtime,
    enableOffline,
    effectiveCacheKey,
    cacheExpiry,
  ]);

  // Manually refresh API data.
  const refetch = useCallback(async (): Promise<void> => {
    await fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    isOnline,
    isRealtimeConnected,
    refetch,
  };
}
