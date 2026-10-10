import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchAnalytics } from '../store/slices/analyticsSlice';

export default function AnalyticsScreen() {
  const dispatch = useAppDispatch();
  const { data, loading, error } = useAppSelector(
    state => state.analytics,
  );

  useEffect(() => {
    dispatch(fetchAnalytics('30d'));
  }, [dispatch]);

  const metrics = [
    { label: 'Total users', value: data?.totalUsers },
    { label: 'Active users', value: data?.activeUsers },
    { label: 'Sessions', value: data?.sessions },
    { label: 'Revenue', value: data?.revenue },
  ];

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Analytics</Text>
      <Text style={styles.subtitle}>
        Data returned by your configured backend API.
      </Text>

      {loading ? (
        <View style={styles.messageCard}>
          <ActivityIndicator color="#2563eb" size="large" />
          <Text style={styles.messageText}>Loading analytics…</Text>
        </View>
      ) : null}

      {error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>
            Unable to load analytics
          </Text>
          <Text style={styles.errorText}>{error}</Text>

          <Pressable
            accessibilityRole="button"
            style={styles.retryButton}
            onPress={() => dispatch(fetchAnalytics('30d'))}
          >
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      ) : null}

      {data ? (
        <View style={styles.grid}>
          {metrics.map(metric => (
            <View key={metric.label} style={styles.card}>
              <Text style={styles.label}>{metric.label}</Text>
              <Text style={styles.value}>
                {metric.value?.toLocaleString() ?? '—'}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>API integration</Text>
        <Text style={styles.infoBody}>
          Analytics requests use the /analytics endpoint. If your backend
          returns a different response shape, adjust apiService.ts.
        </Text>
      </View>
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
    paddingBottom: 30,
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
    marginTop: 7,
    marginBottom: 22,
  },
  messageCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 26,
    alignItems: 'center',
    marginBottom: 15,
  },
  messageText: {
    color: '#64748b',
    marginTop: 12,
    fontSize: 14,
  },
  errorCard: {
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fff7f7',
    marginBottom: 18,
  },
  errorTitle: {
    color: '#991b1b',
    fontSize: 15,
    fontWeight: '800',
  },
  errorText: {
    color: '#7f1d1d',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 7,
  },
  retryButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#b91c1c',
    paddingVertical: 9,
    paddingHorizontal: 15,
    borderRadius: 9,
    marginTop: 13,
  },
  retryText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    flexGrow: 1,
    width: '45%',
    borderRadius: 16,
    padding: 18,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  label: {
    color: '#64748b',
    fontSize: 12,
  },
  value: {
    color: '#0f172a',
    fontSize: 23,
    fontWeight: '800',
    marginTop: 10,
  },
  infoCard: {
    borderRadius: 16,
    padding: 18,
    backgroundColor: '#eff6ff',
    marginTop: 21,
  },
  infoTitle: {
    color: '#1e40af',
    fontSize: 14,
    fontWeight: '800',
  },
  infoBody: {
    color: '#1e3a8a',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 7,
  },
});