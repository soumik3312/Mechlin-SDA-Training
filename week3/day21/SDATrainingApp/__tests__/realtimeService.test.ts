import { realtimeService } from '../src/services/realtimeService';

type SocketMessageEvent = Parameters<
  NonNullable<WebSocket['onmessage']>
>[0];

type SocketCloseEvent = Parameters<
  NonNullable<WebSocket['onclose']>
>[0];

class MockWebSocket {
  static instances: MockWebSocket[] = [];

  readyState = 0;

  onopen: WebSocket['onopen'] = null;
  onmessage: WebSocket['onmessage'] = null;
  onclose: WebSocket['onclose'] = null;
  onerror: WebSocket['onerror'] = null;

  send = jest.fn();

  constructor(public url: string) {
    MockWebSocket.instances.push(this);
  }

  open(): void {
    this.readyState = 1;
    this.onopen?.();
  }

  receive(payload: unknown): void {
    this.onmessage?.({
      data: JSON.stringify(payload),
    } as SocketMessageEvent);
  }

  close(): void {
    this.readyState = 3;

    this.onclose?.({
      code: 1000,
      reason: 'Test close',
      wasClean: true,
    } as SocketCloseEvent);
  }
}

const originalWebSocket = globalThis.WebSocket;

describe('Day 21 real-time service', () => {
  beforeEach(() => {
    realtimeService.disconnect();

    MockWebSocket.instances = [];

    globalThis.WebSocket =
      MockWebSocket as unknown as typeof WebSocket;
  });

  afterEach(() => {
    realtimeService.disconnect();
    globalThis.WebSocket = originalWebSocket;
  });

  it('connects and receives subscribed events', () => {
    const callback = jest.fn();

    const unsubscribe = realtimeService.subscribe(
      'dataUpdate',
      callback,
    );

    const socket = MockWebSocket.instances[0];

    expect(socket).toBeDefined();

    socket.open();

    socket.receive({
      type: 'dataUpdate',
      data: { totalUsers: 120 },
      timestamp: Date.now(),
    });

    expect(callback).toHaveBeenCalledWith({
      totalUsers: 120,
    });

    expect(realtimeService.getConnectionStatus().isConnected).toBe(true);

    unsubscribe();
  });

  it('sends JSON messages when connected', () => {
    const unsubscribe = realtimeService.subscribe(
      'connected',
      jest.fn(),
    );

    const socket = MockWebSocket.instances[0];

    socket.open();

    expect(realtimeService.send({ type: 'ping' })).toBe(true);

    expect(socket.send).toHaveBeenCalledWith(
      JSON.stringify({ type: 'ping' }),
    );

    unsubscribe();
  });

  it('does not send messages when disconnected', () => {
    expect(realtimeService.send({ type: 'ping' })).toBe(false);
  });

  it('unsubscribes event listeners', () => {
    const callback = jest.fn();

    const unsubscribe = realtimeService.subscribe(
      'dataUpdate',
      callback,
    );

    const socket = MockWebSocket.instances[0];

    socket.open();
    unsubscribe();

    socket.receive({
      type: 'dataUpdate',
      data: { totalUsers: 20 },
    });

    expect(callback).not.toHaveBeenCalled();
  });
});