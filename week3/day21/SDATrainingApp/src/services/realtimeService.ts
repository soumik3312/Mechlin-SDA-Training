import { API_BASE_URL } from './apiService';

type RealtimeListener = (payload: unknown) => void;

interface RealtimeMessage {
  type?: string;
  data?: unknown;
  timestamp?: number;
}

const MAX_RECONNECT_ATTEMPTS = 5;
const BASE_RECONNECT_DELAY_MS = 1000;
const MAX_RECONNECT_DELAY_MS = 30_000;

class RealtimeService {
  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private manuallyDisconnected = false;
  private readonly listeners = new Map<string, Set<RealtimeListener>>();

  private getWebSocketUrl(): string {
    const base = API_BASE_URL.replace(/\/+$/, '');
    const websocketBase = base
      .replace(/^https:/i, 'wss:')
      .replace(/^http:/i, 'ws:');

    return `${websocketBase}/ws`;
  }

  connect(): void {
    if (this.socket && (this.socket.readyState === 0 ||
      this.socket.readyState === 1)) {
      return;
    }

    this.manuallyDisconnected = false;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    try {
      const socket = new WebSocket(this.getWebSocketUrl());
      this.socket = socket;

      socket.onopen = () => {
        if (this.socket !== socket) {
          return;
        }

        this.reconnectAttempts = 0;
        this.emit('connected', { timestamp: Date.now() });
      };

      socket.onmessage = event => {
        if (this.socket !== socket) {
          return;
        }

        try {
          const message = JSON.parse(
            String(event.data),
          ) as RealtimeMessage;

          this.emit('message', message);

          if (typeof message.type === 'string' && message.type.length > 0) {
            this.emit(message.type, message.data);
          }
        } catch (error) {
          console.warn('Could not parse WebSocket message.', error);
          this.emit('parseError', error);
        }
      };

      socket.onerror = error => {
        if (this.socket === socket) {
          this.emit('error', error);
        }
      };

      socket.onclose = event => {
        if (this.socket !== socket) {
          return;
        }

        this.socket = null;
        this.emit('disconnected', {
          code: event.code,
          reason: event.reason,
        });

        this.scheduleReconnect();
      };
    } catch (error) {
      this.socket = null;
      this.emit('error', error);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.manuallyDisconnected || this.reconnectTimer) {
      return;
    }

    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      this.emit('maxReconnectAttemptsReached', {
        attempts: this.reconnectAttempts,
      });
      return;
    }

    this.reconnectAttempts += 1;

    const delay = Math.min(
      BASE_RECONNECT_DELAY_MS *
        2 ** (this.reconnectAttempts - 1),
      MAX_RECONNECT_DELAY_MS,
    );

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  disconnect(): void {
    this.manuallyDisconnected = true;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    const socket = this.socket;
    this.socket = null;

    if (socket) {
      socket.close();
    }

    this.emit('disconnected', { manual: true });
  }

  send(data: unknown): boolean {
    if (!this.socket || this.socket.readyState !== 1) {
      return false;
    }

    try {
      this.socket.send(JSON.stringify(data));
      return true;
    } catch (error) {
      this.emit('error', error);
      return false;
    }
  }

  subscribe(eventType: string, callback: RealtimeListener): () => void {
    let eventListeners = this.listeners.get(eventType);

    if (!eventListeners) {
      eventListeners = new Set<RealtimeListener>();
      this.listeners.set(eventType, eventListeners);
    }

    eventListeners.add(callback);
    this.connect();

    return () => this.unsubscribe(eventType, callback);
  }

  unsubscribe(eventType: string, callback: RealtimeListener): void {
    const eventListeners = this.listeners.get(eventType);

    if (!eventListeners) {
      return;
    }

    eventListeners.delete(callback);

    if (eventListeners.size === 0) {
      this.listeners.delete(eventType);
    }

    const hasListeners = Array.from(this.listeners.values()).some(
      listeners => listeners.size > 0,
    );

    if (!hasListeners) {
      this.disconnect();
    }
  }

  private emit(eventType: string, payload: unknown): void {
    const eventListeners = this.listeners.get(eventType);

    if (!eventListeners) {
      return;
    }

    for (const listener of eventListeners) {
      try {
        listener(payload);
      } catch (error) {
        console.warn(`Realtime listener "${eventType}" failed.`, error);
      }
    }
  }

  getConnectionStatus(): {
    isConnected: boolean;
    reconnectAttempts: number;
  } {
    return {
      isConnected: this.socket?.readyState === 1,
      reconnectAttempts: this.reconnectAttempts,
    };
  }
}

export const realtimeService = new RealtimeService();