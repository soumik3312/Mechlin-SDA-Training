import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';

type ContentType =
  | 'article'
  | 'blog-post'
  | 'social-media'
  | 'email'
  | 'product-description';

type Tone =
  | 'professional'
  | 'casual'
  | 'friendly'
  | 'formal'
  | 'creative';

type Length = 'short' | 'medium' | 'long';

type GenerationRequest = {
  content_type: ContentType;
  topic: string;
  tone: Tone;
  length: Length;
  keywords: string[];
};

type GeneratedItem = {
  id: string;
  content: string;
  request: GenerationRequest;
  createdAt: string;
};

type Props = {
  baseUrl?: string;
};

const DEFAULT_BASE_URL = 'http://10.0.2.2:5003';
const HISTORY_KEY = '@day26/generated_content_history';

const CONTENT_TYPES: ContentType[] = [
  'article',
  'blog-post',
  'social-media',
  'email',
  'product-description',
];

const TONES: Tone[] = [
  'professional',
  'casual',
  'friendly',
  'formal',
  'creative',
];

const LENGTHS: Length[] = ['short', 'medium', 'long'];

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

function ChoiceGroup<T extends string>({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string;
  options: T[];
  selected: T;
  onSelect: (value: T) => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.choiceWrap}>
        {options.map((option) => {
          const active = selected === option;

          return (
            <Pressable
              key={option}
              onPress={() => onSelect(option)}
              style={[
                styles.choice,
                active && styles.choiceActive,
              ]}
            >
              <Text
                style={[
                  styles.choiceText,
                  active && styles.choiceTextActive,
                ]}
              >
                {option.replace('-', ' ')}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function MobileAIContentGenerator({
  baseUrl = DEFAULT_BASE_URL,
}: Props) {
  const [topic, setTopic] = useState('');
  const [contentType, setContentType] =
    useState<ContentType>('article');
  const [tone, setTone] = useState<Tone>('professional');
  const [length, setLength] = useState<Length>('medium');
  const [keywordsText, setKeywordsText] = useState('');
  const [content, setContent] = useState('');
  const [history, setHistory] = useState<GeneratedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastRequest, setLastRequest] =
    useState<GenerationRequest | null>(null);

  useEffect(() => {
    let active = true;

    async function loadHistory() {
      try {
        const saved = await AsyncStorage.getItem(HISTORY_KEY);
        if (!saved) return;

        const parsed: unknown = JSON.parse(saved);
        if (Array.isArray(parsed) && active) {
          setHistory(
            parsed.filter(
              (item): item is GeneratedItem =>
                item !== null &&
                typeof item === 'object' &&
                typeof item.id === 'string' &&
                typeof item.content === 'string' &&
                typeof item.createdAt === 'string',
            ),
          );
        }
      } catch {
        if (active) {
          setError('Could not load saved generation history.');
        }
      }
    }

    void loadHistory();

    return () => {
      active = false;
    };
  }, []);

  async function persistHistory(items: GeneratedItem[]) {
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(items));
  }

  async function generate(request: GenerationRequest) {
    if (loading) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${baseUrl}/mobile/generate`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const data = await parseResponse(response);

      if (typeof data.content !== 'string' || !data.content.trim()) {
        throw new Error('The AI service returned empty content.');
      }

      const generatedContent = data.content.trim();
      const item: GeneratedItem = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        content: generatedContent,
        request,
        createdAt: new Date().toISOString(),
      };

      const updatedHistory = [item, ...history].slice(0, 20);

      setContent(generatedContent);
      setHistory(updatedHistory);
      setLastRequest(request);
      await persistHistory(updatedHistory);
    } catch (generationError) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : 'Content generation failed. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  }

  function handleGenerate() {
    const normalizedTopic = topic.trim();

    if (!normalizedTopic) {
      setError('Enter a topic before generating content.');
      return;
    }

    if (normalizedTopic.length > 500) {
      setError('Topic must not exceed 500 characters.');
      return;
    }

    const keywords = keywordsText
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    if (keywords.length > 12) {
      setError('Enter no more than 12 comma-separated keywords.');
      return;
    }

    if (keywords.some((item) => item.length > 60)) {
      setError('Each keyword must be 60 characters or fewer.');
      return;
    }

    void generate({
      content_type: contentType,
      topic: normalizedTopic,
      tone,
      length,
      keywords,
    });
  }

  async function handleCopy() {
    if (!content) return;

    await Clipboard.setStringAsync(content);
    Alert.alert('Copied', 'Generated content copied to the clipboard.');
  }

  async function clearHistory() {
    Alert.alert(
      'Clear generation history?',
      'This removes saved generations from this device. It does not delete any backend data.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await AsyncStorage.removeItem(HISTORY_KEY);
                setHistory([]);
              } catch {
                setError('Could not clear local generation history.');
              }
            })();
          },
        },
      ],
    );
  }

  function restoreHistoryItem(item: GeneratedItem) {
    setContent(item.content);
    setTopic(item.request.topic);
    setContentType(item.request.content_type);
    setTone(item.request.tone);
    setLength(item.request.length);
    setKeywordsText(item.request.keywords.join(', '));
    setLastRequest(item.request);
    setError('');
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Text style={styles.title}>AI Content Studio</Text>
        <Text style={styles.subtitle}>
          Create content with your local AI assistant.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Content settings</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Topic</Text>
          <TextInput
            style={styles.input}
            value={topic}
            onChangeText={setTopic}
            placeholder="What should the AI write about?"
            placeholderTextColor="#8992A3"
            maxLength={500}
            multiline
          />
          <Text style={styles.counter}>{topic.length}/500</Text>
        </View>

        <ChoiceGroup
          label="Content type"
          options={CONTENT_TYPES}
          selected={contentType}
          onSelect={setContentType}
        />

        <ChoiceGroup
          label="Writing tone"
          options={TONES}
          selected={tone}
          onSelect={setTone}
        />

        <ChoiceGroup
          label="Content length"
          options={LENGTHS}
          selected={length}
          onSelect={setLength}
        />

        <View style={styles.field}>
          <Text style={styles.label}>Keywords (comma-separated)</Text>
          <TextInput
            style={styles.input}
            value={keywordsText}
            onChangeText={setKeywordsText}
            placeholder="AI, mobile development, Flutter"
            placeholderTextColor="#8992A3"
            maxLength={800}
          />
          <Text style={styles.hint}>Maximum 12 keywords.</Text>
        </View>

        <Pressable
          onPress={handleGenerate}
          disabled={loading}
          style={({ pressed }) => [
            styles.primaryButton,
            loading && styles.disabled,
            pressed && styles.pressed,
          ]}
        >
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Generating…</Text>
            </View>
          ) : (
            <Text style={styles.primaryButtonText}>Generate content</Text>
          )}
        </Pressable>
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {content ? (
        <View style={styles.card}>
          <View style={styles.outputHeader}>
            <Text style={styles.sectionTitle}>Generated content</Text>
            <Pressable onPress={handleCopy} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Copy</Text>
            </Pressable>
          </View>

          <Text selectable style={styles.outputText}>
            {content}
          </Text>

          <Pressable
            style={styles.regenerateButton}
            disabled={loading || !lastRequest}
            onPress={() => {
              if (lastRequest) void generate(lastRequest);
            }}
          >
            <Text style={styles.regenerateText}>Regenerate</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.historyHeader}>
        <View>
          <Text style={styles.sectionTitle}>Saved generations</Text>
          <Text style={styles.hint}>
            {history.length} of 20 recent items stored on this device
          </Text>
        </View>

        {history.length > 0 ? (
          <Pressable onPress={clearHistory}>
            <Text style={styles.deleteText}>Clear history</Text>
          </Pressable>
        ) : null}
      </View>

      {history.map((item) => (
        <Pressable
          key={item.id}
          onPress={() => restoreHistoryItem(item)}
          style={({ pressed }) => [
            styles.historyItem,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.historyTitle} numberOfLines={1}>
            {item.request.topic}
          </Text>
          <Text style={styles.historyMeta}>
            {item.request.content_type} · {item.request.tone} ·{' '}
            {new Date(item.createdAt).toLocaleDateString()}
          </Text>
          <Text style={styles.historyPreview} numberOfLines={2}>
            {item.content}
          </Text>
        </Pressable>
      ))}

      {history.length === 0 ? (
        <Text style={styles.emptyText}>
          Your generated content will appear here.
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
    marginBottom: 16,
  },
  title: {
    color: '#18233B',
    fontSize: 23,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 5,
    color: '#7A8498',
    fontSize: 13,
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 17,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E6EAF2',
  },
  sectionTitle: {
    color: '#26334D',
    fontSize: 17,
    fontWeight: '700',
  },
  field: {
    marginTop: 17,
  },
  label: {
    color: '#414D65',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'capitalize',
  },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: '#DDE2EC',
    borderRadius: 11,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: '#253047',
    backgroundColor: '#FBFCFE',
    fontSize: 14,
  },
  counter: {
    marginTop: 5,
    color: '#9099AA',
    textAlign: 'right',
    fontSize: 10,
  },
  hint: {
    color: '#8791A3',
    fontSize: 11,
    marginTop: 6,
  },
  choiceWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  choice: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#DDE2EC',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
  },
  choiceActive: {
    backgroundColor: '#4967D8',
    borderColor: '#4967D8',
  },
  choiceText: {
    color: '#59657B',
    fontSize: 12,
    textTransform: 'capitalize',
  },
  choiceTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  primaryButton: {
    minHeight: 48,
    marginTop: 21,
    borderRadius: 12,
    backgroundColor: '#4967D8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  loadingRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  outputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  secondaryButton: {
    backgroundColor: '#EAF0FF',
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 9,
  },
  secondaryButtonText: {
    color: '#3D58BE',
    fontSize: 12,
    fontWeight: '700',
  },
  outputText: {
    color: '#38445A',
    fontSize: 14,
    lineHeight: 23,
    marginTop: 15,
  },
  regenerateButton: {
    marginTop: 17,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E9ECF3',
    alignItems: 'center',
  },
  regenerateText: {
    color: '#4967D8',
    fontWeight: '700',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5,
    marginBottom: 12,
  },
  deleteText: {
    color: '#B42318',
    fontSize: 12,
    fontWeight: '600',
  },
  historyItem: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6EAF2',
    borderRadius: 13,
    padding: 13,
    marginBottom: 9,
  },
  historyTitle: {
    color: '#26334D',
    fontSize: 14,
    fontWeight: '700',
  },
  historyMeta: {
    color: '#8791A3',
    fontSize: 10,
    marginTop: 5,
    textTransform: 'capitalize',
  },
  historyPreview: {
    color: '#647087',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },
  emptyText: {
    color: '#8791A3',
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 24,
  },
  errorBox: {
    backgroundColor: '#FFF0F0',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  errorText: {
    color: '#A12622',
    fontSize: 12,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.75,
  },
});