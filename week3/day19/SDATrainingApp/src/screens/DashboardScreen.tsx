import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAppSelector } from '../store/hooks';

export default function DashboardScreen() {
  const user = useAppSelector(state => state.auth.user);
  const offline = useAppSelector(state => state.offline);
  const analytics = useAppSelector(state => state.analytics.data);

  const networkLabel =
    offline.isConnected === null
      ? 'Checking connection'
      : offline.isConnected
        ? 'Online'
        : 'Offline';

  const stats = [
    {
      label: 'Total users',
      value: analytics?.totalUsers ?? '—',
      color: '#2563eb',
    },
    {
      label: 'Active users',
      value: analytics?.activeUsers ?? '—',
      color: '#0f766e',
    },
    {
      label: 'Sessions',
      value: analytics?.sessions ?? '—',
      color: '#7c3aed',
    },
    {
      label: 'Revenue',
      value:
        analytics?.revenue === undefined
          ? '—'
          : analytics.revenue.toLocaleString(),
      color: '#b45309',
    },
  ];

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>YOUR WORKSPACE</Text>
        <Text style={styles.title}>
          Hello, {user?.name ?? 'Developer'}.
        </Text>
        <Text style={styles.subtitle}>
          Your mobile dashboard is ready.
        </Text>

        <View style={styles.networkPill}>
          <View
            style={[
              styles.networkDot,
              offline.isConnected === false
                ? styles.offlineDot
                : styles.onlineDot,
            ]}
          />
          <Text style={styles.networkText}>{networkLabel}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Overview</Text>

      <View style={styles.grid}>
        {stats.map(stat => (
          <View key={stat.label} style={styles.statCard}>
            <View
              style={[styles.statAccent, { backgroundColor: stat.color }]}
            />
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Offline support</Text>
        <Text style={styles.infoBody}>
          Pending operations: {offline.queueCount}
        </Text>
        <Text style={styles.infoBody}>
          {offline.syncing
            ? 'Synchronization in progress…'
            : 'Pending operations are stored locally.'}
        </Text>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Day 19 progress</Text>
        <Text style={styles.infoBody}>
          Navigation, Redux, persistent storage, API integration, and
          local notifications are included in this training app.
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
    paddingBottom: 32,
  },
  hero: {
    padding: 23,
    borderRadius: 22,
    backgroundColor: '#0f172a',
    marginBottom: 25,
  },
  eyebrow: {
    color: '#93c5fd',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.7,
  },
  title: {
    fontSize: 27,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 11,
  },
  subtitle: {
    color: '#cbd5e1',
    fontSize: 14,
    marginTop: 7,
  },
  networkPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 18,
    backgroundColor: '#1e293b',
    borderRadius: 100,
  },
  networkDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  onlineDot: {
    backgroundColor: '#4ade80',
  },
  offlineDot: {
    backgroundColor: '#fb7185',
  },
  networkText: {
    color: '#f1f5f9',
    fontSize: 12,
    fontWeight: '700',
  },
  sectionTitle: {
    color: '#0f172a',
    fontSize: 19,
    fontWeight: '800',
    marginBottom: 13,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 22,
  },
  statCard: {
    width: '47%',
    flexGrow: 1,
    minHeight: 112,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 17,
    backgroundColor: '#ffffff',
  },
  statAccent: {
    width: 26,
    height: 4,
    borderRadius: 2,
    marginBottom: 15,
  },
  statValue: {
    color: '#0f172a',
    fontSize: 25,
    fontWeight: '800',
  },
  statLabel: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 4,
  },
  infoCard: {
    padding: 18,
    borderRadius: 17,
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    marginBottom: 13,
  },
  infoTitle: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 8,
  },
  infoBody: {
    color: '#64748b',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 3,
  },
});