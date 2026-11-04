import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ChatRole = 'user' | 'assistant';

type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  createdAt: string;
};

type Props = {
  /**
   * Android emulator: http://10.0.2.2:5003
   * iOS simulator: http://127.0.0.1:5003
   * Physical phone: http://YOUR_COMPUTER_LAN_IP:5003
   */
  baseUrl?: string;
  title?: string;
};

const DEFAULT_BASE_URL = 'http://10.0.2.2:5003';
const THREAD_STORAGE_KEY = '@day26/mobile_chat_thread';
const HISTORY_STORAGE_PREFIX = '@day26/mobile_chat_history:';

function createMessage(
  role: ChatRole,
  text: string,
): ChatMessage {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    role,
    text,
    createdAt: new Date().toISOString(),
  };
}

async function readJsonResponse(response: Response): Promise<any> {
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

export default function ReactNativeAIChatbot({
  baseUrl = DEFAULT_BASE_URL,
  title = 'AI Assistant',
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const threadIdRef = useRef<string | null>(null);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  useEffect(() => {
    let active = true;

    async function loadConversation() {
      try {
        let threadId = await AsyncStorage.getItem(THREAD_STORAGE_KEY);

        if (!threadId) {
          threadId =
            `mobile-${Date.now().toString(36)}-` +
            Math.random().toString(36).slice(2, 10);

          await AsyncStorage.setItem(THREAD_STORAGE_KEY, threadId);
        }

        const saved = await AsyncStorage.getItem(
          `${HISTORY_STORAGE_PREFIX}${threadId}`,
        );

        let history: ChatMessage[] = [];

        if (saved) {
          const parsed: unknown = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            history = parsed.filter(
              (item): item is ChatMessage =>
                item !== null &&
                typeof item === 'object' &&
                typeof item.id === 'string' &&
                (item.role === 'user' || item.role === 'assistant') &&
                typeof item.text === 'string',
            );
          }
        }

        if (active) {
          threadIdRef.current = threadId;
          setMessages(history);
        }
      } catch {
        if (active) {
          setError(
            'Could not load saved chat history. Check device storage permissions.',
          );
        }
      } finally {
        if (active) {
          setReady(true);
        }
      }
    }

    void loadConversation();

    return () => {
      active = false;
    };
  }, []);

  async function persistMessages(nextMessages: ChatMessage[]) {
    const threadId = threadIdRef.current;
    if (!threadId) return;

    await AsyncStorage.setItem(
      `${HISTORY_STORAGE_PREFIX}${threadId}`,
      JSON.stringify(nextMessages),
    );
  }

  async function sendMessage() {
    const message = input.trim();
    const threadId = threadIdRef.current;

    if (!message || !threadId || loading || !ready) return;

    if (message.length > 10_000) {
      setError('Messages must be 10,000 characters or fewer.');
      return;
    }

    const userMessage = createMessage('user', message);
    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);
    setInput('');
    setError('');
    setLoading(true);

    try {
      await persistMessages(nextMessages);

      const response = await fetch(`${baseUrl}/mobile/chat`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          thread_id: threadId,
          agent_type: 'conversation',
        }),
      });

      const data = await readJsonResponse(response);

      if (typeof data.response !== 'string' || !data.response.trim()) {
        throw new Error('The AI service returned an empty response.');
      }

      const assistantMessage = createMessage(
        'assistant',
        data.response.trim(),
      );
      const updatedMessages = [...nextMessages, assistantMessage];

      setMessages(updatedMessages);
      await persistMessages(updatedMessages);
    } catch (requestError) {
      setInput(message);
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Could not contact the AI service. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  }

  function confirmClearConversation() {
    Alert.alert(
      'Clear conversation?',
      'This clears the saved chat on this device and the AI conversation memory on the server.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            void clearConversation();
          },
        },
      ],
    );
  }

  async function clearConversation() {
    const threadId = threadIdRef.current;
    if (!threadId || loading) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${baseUrl}/mobile/memory/clear`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ thread_id: threadId }),
      });

      await readJsonResponse(response);

      setMessages([]);
      setInput('');
      await persistMessages([]);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Could not clear the server conversation memory.',
      );
    } finally {
      setLoading(false);
    }
  }

  function renderMessage({ item }: { item: ChatMessage }) {
    const isUser = item.role === 'user';

    return (
      <View
        style={[
          styles.messageRow,
          isUser ? styles.userRow : styles.assistantRow,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isUser ? styles.userBubble : styles.assistantBubble,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isUser ? styles.userMessageText : styles.assistantMessageText,
            ]}
          >
            {item.text}
          </Text>
          <Text
            style={[
              styles.messageTime,
              isUser ? styles.userTime : styles.assistantTime,
            ]}
          >
            {new Date(item.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>
            Powered by your local AI service
          </Text>
        </View>

        <Pressable
          onPress={confirmClearConversation}
          disabled={!ready || loading || messages.length === 0}
          style={({ pressed }) => [
            styles.clearButton,
            (loading || messages.length === 0) && styles.disabledButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.clearButtonText}>Clear</Text>
        </Pressable>
      </View>

      {!ready ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#4967D8" />
          <Text style={styles.helperText}>Loading saved conversation…</Text>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          style={styles.messageList}
          contentContainerStyle={styles.messageContent}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() =>
            listRef.current?.scrollToEnd({ animated: true })
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Start a conversation</Text>
              <Text style={styles.helperText}>
                Ask a question or tell the assistant what you need.
              </Text>
            </View>
          }
          ListFooterComponent={
            loading ? (
              <View style={styles.typingRow}>
                <ActivityIndicator size="small" color="#4967D8" />
                <Text style={styles.helperText}>AI is thinking…</Text>
              </View>
            ) : null
          }
        />
      )}

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.inputArea}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Write your message…"
          placeholderTextColor="#8992A3"
          multiline
          maxLength={10_000}
          editable={ready && !loading}
          onSubmitEditing={() => {
            void sendMessage();
          }}
          blurOnSubmit={false}
        />

        <Pressable
          style={({ pressed }) => [
            styles.sendButton,
            (!input.trim() || loading || !ready) && styles.disabledButton,
            pressed && styles.pressed,
          ]}
          onPress={() => {
            void sendMessage();
          }}
          disabled={!input.trim() || loading || !ready}
        >
          <Text style={styles.sendButtonText}>
            {loading ? '…' : 'Send'}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FC',
  },
  header: {
    minHeight: 76,
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#DDE2EC',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    color: '#18233B',
    fontSize: 19,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 3,
    color: '#7A8498',
    fontSize: 12,
  },
  clearButton: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#FDECEC',
  },
  clearButtonText: {
    color: '#B42318',
    fontWeight: '600',
  },
  messageList: {
    flex: 1,
  },
  messageContent: {
    paddingHorizontal: 14,
    paddingVertical: 18,
    flexGrow: 1,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  assistantRow: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '86%',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: '#4967D8',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E9F1',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userMessageText: {
    color: '#FFFFFF',
  },
  assistantMessageText: {
    color: '#27334A',
  },
  messageTime: {
    fontSize: 10,
    marginTop: 6,
    textAlign: 'right',
  },
  userTime: {
    color: '#DCE4FF',
  },
  assistantTime: {
    color: '#929BAD',
  },
  emptyState: {
    flex: 1,
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    color: '#26334D',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  helperText: {
    color: '#7B8598',
    fontSize: 13,
    marginTop: 7,
    textAlign: 'center',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  errorBox: {
    marginHorizontal: 12,
    marginBottom: 8,
    padding: 11,
    backgroundColor: '#FFF0F0',
    borderRadius: 10,
  },
  errorText: {
    color: '#A12622',
    fontSize: 12,
  },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#DDE2EC',
    gap: 9,
  },
  input: {
    flex: 1,
    minHeight: 46,
    maxHeight: 120,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 14,
    backgroundColor: '#F1F3F8',
    color: '#253047',
    fontSize: 15,
  },
  sendButton: {
    minWidth: 64,
    height: 46,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4967D8',
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.75,
  },
});