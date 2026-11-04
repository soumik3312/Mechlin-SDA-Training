import React, { useState } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  Pressable,
  View,
} from 'react-native';

import ReactNativeAIChatbot from '../ai/mobile-components/ReactNativeAIChatbot';
import MobileAIContentGenerator from '../ai/mobile-components/MobileAIContentGenerator';
import MobileAIRecommendations from '../ai/mobile-components/MobileAIRecommendations';
import { MOBILE_AI_BASE_URL } from '../ai/mobile-components/mobileConfig';

type Tab = 'chat' | 'create' | 'discover';

const TABS: { id: Tab; label: string }[] = [
  { id: 'chat', label: 'Chat' },
  { id: 'create', label: 'Create' },
  { id: 'discover', label: 'Discover' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('chat');

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.appHeader}>
        <View>
          <Text style={styles.appTitle}>Day 26 AI Mobile</Text>
          <Text style={styles.appSubtitle}>
            Your local AI companion
          </Text>
        </View>
        <View style={styles.localBadge}>
          <View style={styles.statusDot} />
          <Text style={styles.localBadgeText}>Local AI</Text>
        </View>
      </View>

      <View style={styles.tabBar}>
        {TABS.map((tab) => {
          const selected = activeTab === tab.id;

          return (
            <Pressable
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              style={[
                styles.tab,
                selected && styles.selectedTab,
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  selected && styles.selectedTabText,
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.screen}>
        {activeTab === 'chat' ? (
          <ReactNativeAIChatbot baseUrl={MOBILE_AI_BASE_URL} />
        ) : null}

        {activeTab === 'create' ? (
          <MobileAIContentGenerator baseUrl={MOBILE_AI_BASE_URL} />
        ) : null}

        {activeTab === 'discover' ? (
          <MobileAIRecommendations baseUrl={MOBILE_AI_BASE_URL} />
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  appHeader: {
    minHeight: 64,
    paddingHorizontal: 17,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
  },
  appTitle: {
    color: '#18233B',
    fontSize: 18,
    fontWeight: '800',
  },
  appSubtitle: {
    color: '#8791A3',
    fontSize: 11,
    marginTop: 2,
  },
  localBadge: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: '#EAF7EF',
  },
  statusDot: {
    height: 7,
    width: 7,
    borderRadius: 5,
    backgroundColor: '#26965A',
  },
  localBadgeText: {
    color: '#216E43',
    fontSize: 10,
    fontWeight: '700',
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#DDE2EC',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#F1F3F8',
  },
  selectedTab: {
    backgroundColor: '#4967D8',
  },
  tabText: {
    color: '#59657B',
    fontWeight: '600',
    fontSize: 12,
  },
  selectedTabText: {
    color: '#FFFFFF',
  },
  screen: {
    flex: 1,
  },
});