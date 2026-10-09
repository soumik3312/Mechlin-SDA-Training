import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAppDispatch, useAppSelector } from '../store/hooks';
import { logoutUser } from '../store/slices/authSlice';
import { setOfflineQueueCount } from '../store/slices/offlineSlice';
import { notificationService } from '../services/notificationService';
import { offlineService } from '../services/offlineService';

export default function SettingsScreen() {
  const dispatch = useAppDispatch();
  const offline = useAppSelector(state => state.offline);
  const [busy, setBusy] = useState(false);

  async function handleNotification() {
    setBusy(true);

    try {
      await notificationService.showLocalNotification(
        'Day 19 notification',
        'Your React Native notification service is working.',
      );

      Alert.alert(
        'Notification requested',
        'Check your notification tray.',
      );
    } catch (error) {
      Alert.alert(
        'Notification unavailable',
        error instanceof Error
          ? error.message
          : 'Could not display notification.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleQueueOperation() {
    setBusy(true);

    try {
      await offlineService.queueRequest(
        '/training/offline-events',
        'POST',
        {
          type: 'DAY19_SAMPLE',
          createdAt: Date.now(),
        },
      );

      if (offline.isConnected) {
        await offlineService.syncOfflineData();
      }

      const queue = await offlineService.getQueue();

      dispatch(setOfflineQueueCount(queue.length));

      Alert.alert(
        'Offline queue updated',
        queue.length > 0
          ? `${queue.length} operation(s) are still pending. A matching backend endpoint is required for synchronization.`
          : 'The sample operation was synchronized.',
      );
    } catch (error) {
      Alert.alert(
        'Could not save operation',
        error instanceof Error ? error.message : 'Storage failed.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    try {
      await dispatch(logoutUser()).unwrap();
    } catch {
      Alert.alert(
        'Logout error',
        'The local session could not be cleared.',
      );
    }
  }

  const networkLabel =
    offline.isConnected === null
      ? 'Checking connection'
      : offline.isConnected
        ? 'Connected'
        : 'Offline';

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.subtitle}>
        Network, notifications, offline queue, and session controls.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Network status</Text>
        <Text style={styles.body}>{networkLabel}</Text>
        <Text style={styles.body}>
          Pending operations: {offline.queueCount}
        </Text>
        <Text style={styles.body}>
          {offline.syncing
            ? 'Synchronization in progress…'
            : 'No synchronization currently running.'}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Local notifications</Text>
        <Text style={styles.body}>
          Request notification permission and display a test notification.
        </Text>

        <Pressable
          accessibilityRole="button"
          disabled={busy}
          style={[styles.button, busy && styles.disabled]}
          onPress={handleNotification}
        >
          <Text style={styles.buttonText}>Send test notification</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Offline operations</Text>
        <Text style={styles.body}>
          Store a sample request locally. It remains queued until the
          backend accepts it.
        </Text>

        <Pressable
          accessibilityRole="button"
          disabled={busy}
          style={[styles.button, busy && styles.disabled]}
          onPress={handleQueueOperation}
        >
          <Text style={styles.buttonText}>Queue sample operation</Text>
        </Pressable>
      </View>

      <Pressable
        accessibilityRole="button"
        disabled={busy}
        style={[styles.logoutButton, busy && styles.disabled]}
        onPress={handleLogout}
      >
        <Text style={styles.logoutText}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 18,
    paddingBottom: 32,
  },
  title: {
    color: '#0f172a',
    fontSize: 27,
    fontWeight: '800',
  },
  subtitle: {
    color: '#64748b',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 6,
    marginBottom: 21,
  },
  card: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 17,
    marginBottom: 14,
  },
  cardTitle: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 8,
  },
  body: {
    color: '#64748b',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 3,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    borderRadius: 11,
    paddingVertical: 13,
    paddingHorizontal: 12,
    marginTop: 15,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  logoutButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fff1f2',
    marginTop: 8,
  },
  logoutText: {
    color: '#be123c',
    fontSize: 14,
    fontWeight: '800',
  },
  disabled: {
    opacity: 0.6,
  },
});