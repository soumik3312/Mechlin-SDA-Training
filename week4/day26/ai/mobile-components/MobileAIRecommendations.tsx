import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type UserProfile = {
  interests: string[];
  experience?: string;
};

type Recommendation = {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  score: number;
  url: string;
};

type Props = {
  baseUrl?: string;
};

const DEFAULT_BASE_URL = 'http://10.0.2.2:5003';
const PROFILE_KEY = '@day26/recommendation_profile';
const BOOKMARKS_KEY = '@day26/recommendation_bookmarks';

async function parseResponse(response: Response): Promise<any> {
  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.success === false) {
    throw new Error(
      typeof data.error === 'string'
        ? data.error
        : `Request failed with HTTP ${response.status}.`,
    );
  }

  return data;
}

export default function MobileAIRecommendations({
  baseUrl = DEFAULT_BASE_URL,
}: Props) {
  const [profile, setProfile] = useState<UserProfile>({
    interests: ['python', 'ai', 'web'],
    experience: 'intermediate',
  });
  const [interestInput, setInterestInput] = useState('python, ai, web');
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;

    async function loadSavedData() {
      try {
        const [savedProfile, savedBookmarks, remoteResponse] =
          await Promise.all([
            AsyncStorage.getItem(PROFILE_KEY),
            AsyncStorage.getItem(BOOKMARKS_KEY),
            fetch(`${baseUrl}/mobile/profile`, {
              headers: { Accept: 'application/json' },
            }).then(parseResponse),
          ]);

        const parsedRemote: UserProfile =
          remoteResponse.profile &&
          Array.isArray(remoteResponse.profile.interests)
            ? remoteResponse.profile
            : {
                interests: ['python', 'ai', 'web'],
                experience: 'intermediate',
              };

        let nextProfile = parsedRemote;

        if (savedProfile) {
          const parsed: unknown = JSON.parse(savedProfile);

          if (
            parsed !== null &&
            typeof parsed === 'object' &&
            Array.isArray((parsed as UserProfile).interests)
          ) {
            nextProfile = parsed as UserProfile;
          }
        }

        let nextBookmarks: string[] = [];

        if (savedBookmarks) {
          const parsed: unknown = JSON.parse(savedBookmarks);
          if (
            Array.isArray(parsed) &&
            parsed.every((item) => typeof item === 'string')
          ) {
            nextBookmarks = parsed;
          }
        }

        if (active) {
          setProfile(nextProfile);
          setInterestInput(nextProfile.interests.join(', '));
          setBookmarks(nextBookmarks);
        }
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Could not load your saved recommendation profile.',
          );
        }
      }
    }

    void loadSavedData();

    return () => {
      active = false;
    };
  }, [baseUrl]);

  async function refreshRecommendations(
    nextProfile: UserProfile = profile,
  ) {
    setLoading(true);
    setError('');
    setNotice('');

    try {
      const response = await fetch(`${baseUrl}/mobile/recommendations`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_profile: nextProfile,
          max_recommendations: 8,
        }),
      });

      const data = await parseResponse(response);

      if (!Array.isArray(data.recommendations)) {
        throw new Error('The recommendation service returned invalid data.');
      }

      setRecommendations(
        data.recommendations.filter(
          (item: unknown): item is Recommendation =>
            item !== null &&
            typeof item === 'object' &&
            typeof (item as Recommendation).id === 'string' &&
            typeof (item as Recommendation).title === 'string' &&
            typeof (item as Recommendation).url === 'string',
        ),
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Could not load recommendations.',
      );
    } finally {
      setLoading(false);
    }
  }

  async function saveProfileAndRefresh() {
    const interests = interestInput
      .split(',')
      .map((interest) => interest.trim().toLowerCase())
      .filter(Boolean);

    if (interests.length === 0) {
      setError('Enter at least one interest.');
      return;
    }

    if (interests.length > 20) {
      setError('Enter no more than 20 interests.');
      return;
    }

    const nextProfile: UserProfile = {
      ...profile,
      interests,
    };

    setProfile(nextProfile);
    setError('');

    try {
      await AsyncStorage.setItem(
        PROFILE_KEY,
        JSON.stringify(nextProfile),
      );
      await refreshRecommendations(nextProfile);
    } catch {
      setError('Could not save your profile on this device.');
    }
  }

  async function toggleBookmark(id: string) {
    const nextBookmarks = bookmarks.includes(id)
      ? bookmarks.filter((item) => item !== id)
      : [...bookmarks, id];

    setBookmarks(nextBookmarks);

    try {
      await AsyncStorage.setItem(
        BOOKMARKS_KEY,
        JSON.stringify(nextBookmarks),
      );
    } catch {
      setError('Could not save the bookmark on this device.');
    }
  }

  async function openRecommendation(url: string) {
    try {
      if (!/^https:\/\/[^/\s]+/i.test(url)) {
        setError('Only secure HTTPS recommendation links are allowed.');
        return;
      }

      const supported = await Linking.canOpenURL(url);

      if (!supported) {
        setError('This link cannot be opened on this device.');
        return;
      }

      await Linking.openURL(url);
    } catch {
      setError('Could not open this recommendation link.');
    }
  }

  async function submitFeedback(rating: 1 | 2 | 3 | 4) {
    if (recommendations.length === 0 || feedbackLoading) return;

    setFeedbackLoading(true);
    setError('');
    setNotice('');

    try {
      const response = await fetch(
        `${baseUrl}/mobile/recommendations/feedback`,
        {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            rating,
            recommendations,
            user_profile: profile,
          }),
        },
      );

      await parseResponse(response);
      setNotice(`Thanks. Your ${rating}/4 feedback was saved.`);
    } catch (feedbackError) {
      setError(
        feedbackError instanceof Error
          ? feedbackError.message
          : 'Could not submit feedback.',
      );
    } finally {
      setFeedbackLoading(false);
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Text style={styles.title}>For You</Text>
        <Text style={styles.subtitle}>
          Learning and development recommendations based on your interests.
        </Text>
      </View>

      <View style={styles.profileCard}>
        <Text style={styles.sectionTitle}>Your interests</Text>
        <TextInput
          style={styles.input}
          value={interestInput}
          onChangeText={setInterestInput}
          placeholder="python, ai, web"
          placeholderTextColor="#8992A3"
          autoCapitalize="none"
        />
        <Text style={styles.hint}>
          Separate interests with commas.
        </Text>

        <Pressable
          style={styles.primaryButton}
          onPress={() => {
            void saveProfileAndRefresh();
          }}
          disabled={loading}
        >
          <Text style={styles.primaryButtonText}>
            Save interests and refresh
          </Text>
        </Pressable>
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {notice ? (
        <View style={styles.noticeBox}>
          <Text style={styles.noticeText}>{notice}</Text>
        </View>
      ) : null}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recommended for you</Text>
        <Pressable
          onPress={() => {
            void refreshRecommendations();
          }}
          disabled={loading}
        >
          <Text style={styles.refreshText}>Refresh</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color="#4967D8" size="large" />
          <Text style={styles.hint}>Finding relevant resources…</Text>
        </View>
      ) : null}

      {!loading && recommendations.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No recommendations yet</Text>
          <Text style={styles.hint}>
            Save your interests and refresh to discover resources.
          </Text>
        </View>
      ) : null}

      {recommendations.map((item) => {
        const bookmarked = bookmarks.includes(item.id);

        return (
          <View key={item.id} style={styles.recommendationCard}>
            <View style={styles.cardHeading}>
              <View style={styles.cardHeadingText}>
                <Text style={styles.category}>{item.category}</Text>
                <Text style={styles.recommendationTitle}>
                  {item.title}
                </Text>
              </View>

              <Pressable
                onPress={() => {
                  void toggleBookmark(item.id);
                }}
                style={styles.bookmarkButton}
                accessibilityLabel={
                  bookmarked ? 'Remove bookmark' : 'Bookmark recommendation'
                }
              >
                <Text style={styles.bookmarkIcon}>
                  {bookmarked ? '★' : '☆'}
                </Text>
              </Pressable>
            </View>

            <Text style={styles.description}>{item.description}</Text>

            <View style={styles.tags}>
              {item.tags.slice(0, 5).map((tag) => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>

            <View style={styles.cardFooter}>
              <Text style={styles.matchText}>
                {'Catalogue match: ' + Math.round(Number(item.score) * 100) + '%'}
              </Text>

              <Pressable
                onPress={() => {
                  void openRecommendation(item.url);
                }}
                style={styles.openButton}
              >
                <Text style={styles.openButtonText}>Open resource</Text>
              </Pressable>
            </View>
          </View>
        );
      })}

      {recommendations.length > 0 ? (
        <View style={styles.feedbackCard}>
          <Text style={styles.sectionTitle}>
            How useful are these recommendations?
          </Text>
          <Text style={styles.hint}>
            Rate the list from 1 (not useful) to 4 (very useful).
          </Text>

          <View style={styles.ratingRow}>
            {([1, 2, 3, 4] as const).map((rating) => (
              <Pressable
                key={rating}
                style={styles.ratingButton}
                onPress={() => {
                  void submitFeedback(rating);
                }}
                disabled={feedbackLoading}
              >
                <Text style={styles.ratingText}>{rating}</Text>
              </Pressable>
            ))}
          </View>

          {feedbackLoading ? (
            <ActivityIndicator color="#4967D8" />
          ) : null}
        </View>
      ) : null}

      {bookmarks.length > 0 ? (
        <Text style={styles.bookmarkSummary}>
          {bookmarks.length} saved bookmark
          {bookmarks.length === 1 ? '' : 's'} on this device
        </Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FC',
  },
  content: {
    padding: 16,
    paddingBottom: 36,
  },
  header: {
    marginBottom: 17,
  },
  title: {
    color: '#18233B',
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 5,
    color: '#7A8498',
    fontSize: 13,
    lineHeight: 19,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E6EAF2',
    marginBottom: 17,
  },
  sectionTitle: {
    color: '#26334D',
    fontSize: 17,
    fontWeight: '700',
  },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: '#DDE2EC',
    borderRadius: 11,
    paddingHorizontal: 12,
    marginTop: 12,
    color: '#253047',
    backgroundColor: '#FBFCFE',
    fontSize: 14,
  },
  hint: {
    color: '#8791A3',
    fontSize: 11,
    lineHeight: 17,
    marginTop: 6,
  },
  primaryButton: {
    marginTop: 14,
    paddingVertical: 13,
    borderRadius: 11,
    backgroundColor: '#4967D8',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  refreshText: {
    color: '#4967D8',
    fontWeight: '700',
    fontSize: 12,
  },
  recommendationCard: {
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#E6EAF2',
    marginBottom: 11,
  },
  cardHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardHeadingText: {
    flex: 1,
    paddingRight: 9,
  },
  category: {
    color: '#4967D8',
    textTransform: 'uppercase',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  recommendationTitle: {
    color: '#26334D',
    fontWeight: '700',
    fontSize: 16,
    lineHeight: 22,
    marginTop: 5,
  },
  bookmarkButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  bookmarkIcon: {
    color: '#D18A22',
    fontSize: 25,
  },
  description: {
    color: '#647087',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 10,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
  },
  tag: {
    backgroundColor: '#F0F3FA',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 7,
  },
  tagText: {
    color: '#59657B',
    fontSize: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    gap: 8,
  },
  matchText: {
    color: '#8791A3',
    fontSize: 10,
    flex: 1,
  },
  openButton: {
    backgroundColor: '#EAF0FF',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 9,
  },
  openButtonText: {
    color: '#3D58BE',
    fontSize: 11,
    fontWeight: '700',
  },
  feedbackCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#E6EAF2',
    marginTop: 7,
  },
  ratingRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  ratingButton: {
    flex: 1,
    minHeight: 43,
    borderRadius: 10,
    backgroundColor: '#EAF0FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ratingText: {
    color: '#3D58BE',
    fontWeight: '800',
    fontSize: 15,
  },
  loadingBox: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 14,
    alignItems: 'center',
  },
  emptyTitle: {
    color: '#26334D',
    fontSize: 15,
    fontWeight: '700',
  },
  errorBox: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#FFF0F0',
    marginBottom: 12,
  },
  errorText: {
    color: '#A12622',
    fontSize: 12,
  },
  noticeBox: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#EAF7EF',
    marginBottom: 12,
  },
  noticeText: {
    color: '#216E43',
    fontSize: 12,
  },
  bookmarkSummary: {
    color: '#8791A3',
    fontSize: 11,
    marginTop: 8,
    textAlign: 'center',
  },
});