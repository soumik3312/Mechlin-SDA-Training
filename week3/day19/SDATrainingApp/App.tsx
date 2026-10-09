import React, { useEffect } from 'react';
import { StatusBar, StyleSheet } from 'react-native';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { store } from './src/store';
import { useAppDispatch } from './src/store/hooks';
import AppNavigator from './src/navigation/AppNavigator';

import { checkAuthStatus } from './src/store/slices/authSlice';
import {
  setConnectionStatus,
  setLastSyncAt,
  setOfflineQueueCount,
  setSyncing,
} from './src/store/slices/offlineSlice';

import { offlineService } from './src/services/offlineService';

function AppContent() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(checkAuthStatus());

    const refreshQueueCount = async () => {
      try {
        const queue = await offlineService.getQueue();
        dispatch(setOfflineQueueCount(queue.length));
      } catch (error) {
        console.warn('Could not refresh offline queue.', error);
      }
    };

    const synchronizeQueue = async () => {
      dispatch(setSyncing(true));

      try {
        await offlineService.syncOfflineData();
        dispatch(setLastSyncAt(Date.now()));
      } catch (error) {
        console.warn('Offline synchronization failed.', error);
      } finally {
        await refreshQueueCount();
        dispatch(setSyncing(false));
      }
    };

    refreshQueueCount().catch(error => {
      console.warn('Could not load offline queue.', error);
    });

    const unsubscribe = offlineService.watchConnection(connected => {
      dispatch(setConnectionStatus(connected));

      if (!connected) {
        refreshQueueCount().catch(error => {
          console.warn('Could not update offline queue.', error);
        });
        return;
      }

      synchronizeQueue().catch(error => {
        console.warn('Unexpected synchronization error.', error);
      });
    });

    return unsubscribe;
  }, [dispatch]);

  return (
    <>
      <StatusBar barStyle="dark-content" />
      <AppNavigator />
    </>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <Provider store={store}>
          <AppContent />
        </Provider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});