import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAppSelector } from '../store/hooks';

export default function ProfileScreen() {
  const user = useAppSelector(state => state.auth.user);

  const fields = [
    { label: 'Full name', value: user?.name ?? 'Not available' },
    { label: 'Email address', value: user?.email ?? 'Not available' },
    { label: 'Role', value: user?.role ?? 'Member' },
    { label: 'User ID', value: user?.id ?? 'Not available' },
  ];

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(user?.name?.charAt(0) ?? 'U').toUpperCase()}
          </Text>
        </View>

        <Text style={styles.name}>{user?.name ?? 'User profile'}</Text>
        <Text style={styles.email}>{user?.email ?? ''}</Text>
      </View>

      <Text style={styles.sectionTitle}>Account information</Text>

      {fields.map(field => (
        <View style={styles.fieldCard} key={field.label}>
          <Text style={styles.label}>{field.label}</Text>
          <Text selectable style={styles.value}>
            {field.value}
          </Text>
        </View>
      ))}

      <Text style={styles.note}>
        Profile information comes from the saved authentication session.
        Connect the user-update endpoint when profile editing is required.
      </Text>
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
  profileCard: {
    alignItems: 'center',
    backgroundColor: '#0f172a',
    padding: 26,
    borderRadius: 21,
    marginBottom: 24,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 13,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 30,
    fontWeight: '800',
  },
  name: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
  },
  email: {
    color: '#cbd5e1',
    fontSize: 13,
    marginTop: 6,
  },
  sectionTitle: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12,
  },
  fieldCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderColor: '#e2e8f0',
    borderWidth: 1,
    padding: 16,
    marginBottom: 10,
  },
  label: {
    color: '#64748b',
    fontSize: 12,
    marginBottom: 5,
  },
  value: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '600',
  },
  note: {
    color: '#64748b',
    fontSize: 12,
    lineHeight: 19,
    marginTop: 8,
  },
});
