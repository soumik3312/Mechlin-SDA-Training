import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import type {
  MainTabParamList,
  RootStackParamList,
} from '../types';

import { useAppSelector } from '../store/hooks';

import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const symbols: Record<keyof MainTabParamList, string> = {
  Dashboard: '▦',
  Analytics: '▥',
  Profile: '●',
  Settings: '⚙',
};

function TabIcon({
  routeName,
  color,
}: {
  routeName: keyof MainTabParamList;
  color: string;
}) {
  const iconStyle =
    color === '#2563eb'
      ? styles.activeTabIcon
      : styles.inactiveTabIcon;

  return <Text style={iconStyle}>{symbols[routeName]}</Text>;
}

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#64748b',
        tabBarLabelStyle: styles.tabBarLabel,

        // React Navigation requires a render callback for tabBarIcon.
        // eslint-disable-next-line react/no-unstable-nested-components
        tabBarIcon: ({ color }) => (
          <TabIcon routeName={route.name} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Analytics" component={AnalyticsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const isAuthenticated = useAppSelector(
    state => state.auth.isAuthenticated,
  );

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: styles.header,
          headerTintColor: '#0f172a',
          headerTitleStyle: styles.headerTitle,
        }}
      >
        {isAuthenticated ? (
          <Stack.Screen
            name="Main"
            component={TabNavigator}
            options={{ headerShown: false }}
          />
        ) : (
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#ffffff',
  },
  headerTitle: {
    fontWeight: '700',
  },
  tabBarLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  activeTabIcon: {
    fontSize: 19,
    color: '#2563eb',
  },
  inactiveTabIcon: {
    fontSize: 19,
    color: '#64748b',
  },
});