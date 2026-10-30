import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  loginDemo,
  loginUser,
} from '../store/slices/authSlice';

export default function LoginScreen() {
  const dispatch = useAppDispatch();
  const { loading, error } = useAppSelector(state => state.auth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  async function handleLogin() {
    setFormError(null);

    if (!email.trim() || !password) {
      setFormError('Enter your email and password.');
      return;
    }

    try {
      await dispatch(
        loginUser({
          email: email.trim(),
          password,
        }),
      ).unwrap();
    } catch {
      // The Redux auth state displays the login error.
    }
  }

  async function handleDemoLogin() {
    setFormError(null);

    try {
      await dispatch(loginDemo()).unwrap();
    } catch {
      setFormError('Demo login could not be completed.');
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>S</Text>
          </View>

          <Text style={styles.eyebrow}>SDA MOBILE</Text>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>
            Sign in to your training dashboard.
          </Text>

          <Text style={styles.label}>Email address</Text>
          <TextInput
            accessibilityLabel="Email address"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            placeholder="you@example.com"
            placeholderTextColor="#94a3b8"
            style={styles.input}
            value={email}
            onChangeText={setEmail}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            accessibilityLabel="Password"
            autoCapitalize="none"
            autoComplete="password"
            placeholder="Enter your password"
            placeholderTextColor="#94a3b8"
            secureTextEntry
            style={styles.input}
            value={password}
            onChangeText={setPassword}
          />

          {formError || error ? (
            <Text style={styles.error}>{formError ?? error}</Text>
          ) : null}

          <Pressable
            accessibilityRole="button"
            disabled={loading}
            style={[styles.primaryButton, loading && styles.disabled]}
            onPress={handleLogin}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryButtonText}>Sign in</Text>
            )}
          </Pressable>

          <View style={styles.separator}>
            <View style={styles.line} />
            <Text style={styles.separatorText}>OR</Text>
            <View style={styles.line} />
          </View>

          <Pressable
            accessibilityRole="button"
            disabled={loading}
            style={[styles.secondaryButton, loading && styles.disabled]}
            onPress={handleDemoLogin}
          >
            <Text style={styles.secondaryButtonText}>
              Continue with demo account
            </Text>
          </Pressable>

          <Text style={styles.footnote}>
            Demo mode is for local training only. Real sign-in requires a
            configured backend API.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#eff6ff',
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 22,
  },
  card: {
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
    padding: 24,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  logo: {
    width: 54,
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    marginBottom: 20,
  },
  logoText: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '800',
  },
  eyebrow: {
    fontSize: 11,
    letterSpacing: 2,
    color: '#2563eb',
    fontWeight: '800',
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 8,
  },
  subtitle: {
    color: '#64748b',
    fontSize: 14,
    lineHeight: 22,
    marginTop: 7,
    marginBottom: 24,
  },
  label: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 14,
    color: '#0f172a',
    fontSize: 15,
    marginBottom: 18,
    backgroundColor: '#ffffff',
  },
  error: {
    color: '#b91c1c',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 14,
  },
  primaryButton: {
    minHeight: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    marginTop: 2,
  },
  disabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 15,
  },
  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  separatorText: {
    color: '#94a3b8',
    paddingHorizontal: 12,
    fontSize: 11,
    fontWeight: '700',
  },
  secondaryButton: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
  },
  secondaryButtonText: {
    color: '#1d4ed8',
    fontSize: 14,
    fontWeight: '700',
  },
  footnote: {
    color: '#94a3b8',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 17,
    marginTop: 18,
  },
});