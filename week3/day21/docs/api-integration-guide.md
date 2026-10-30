
# API Integration Guide

## 1. Introduction

This guide describes the API integration architecture and implementation developed for Day 21 of the Mechlin SDA Training Program.

The mobile application uses React Native and TypeScript to communicate with backend services, manage authentication, synchronize offline requests, receive real-time updates, and display notifications.

The implementation focuses on five major components:

1. API Client
2. Real-Time Service
3. Offline Service
4. Push Notification Service
5. Reusable API Integration Hook

---

## 2. API Integration Architecture

The application separates backend communication and mobile data handling into independent services.

| Component | File | Responsibility |
|---|---|---|
| API Client | `src/services/apiService.ts` | REST requests and authentication |
| Real-Time Service | `src/services/realtimeService.ts` | WebSocket connections and events |
| Offline Service | `src/services/offlineService.ts` | Offline queue, caching and synchronization |
| Notification Service | `src/services/notificationService.ts` | Local notifications and FCM message forwarding |
| API Hook | `src/hooks/useApi.ts` | React API state and lifecycle management |

### Application Data Flow

```text
React Native Screens
        |
        v
     useApi Hook
        |
        +------------------+
        |                  |
        v                  v
    API Client        Offline Service
        |                  |
        v                  v
    REST Backend       AsyncStorage
        |
        v
    WebSocket Service
        |
        v
   Real-Time Updates

Notification Service
        |
        v
 Local Notification System
```

---

## 3. API Client

### 3.1 Overview

The API client is implemented in:

`src/services/apiService.ts`

It uses the React Native Fetch API to communicate with backend endpoints.

The API client provides:

- Configurable API base URL.
- Bearer token authentication.
- JSON request and response handling.
- Request timeout management.
- HTTP error handling.
- Authentication session management.
- Automatic offline queue integration for eligible failed write requests.

### 3.2 API Base URL

The current development configuration is:

```typescript
export const API_BASE_URL = 'http://10.0.2.2:3000/api/v1';
```

The Android emulator uses `10.0.2.2` to access the development machine's localhost.

For a physical device, configure a reachable development-machine LAN address.

Use HTTPS for production API traffic.

### 3.3 Authentication

The API client supports the following authentication endpoints:

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/login` | Authenticate a user |
| POST | `/auth/logout` | End an authenticated session |
| GET | `/auth/me` | Retrieve the current user |

Authentication tokens are attached to requests through the header:

```http
Authorization: Bearer <token>
```

Session information is stored using AsyncStorage.

The application also clears the local session after receiving an HTTP 401 response.

**Security note:** AsyncStorage is persistent local storage, not encrypted secret storage. Production applications should evaluate platform-backed secure storage for authentication credentials.

### 3.4 User APIs

The API client exposes the following user operations:

| Method | Endpoint | Description |
|---|---|---|
| GET | `/users` | Retrieve users |
| GET | `/users/:id` | Retrieve a user |
| PUT | `/users/:id` | Update a user |

The list operation supports URL-encoded filters such as:

- Search
- Role
- Page
- Limit

### 3.5 Analytics API

The application supports:

```http
GET /analytics?timeRange=30d
```

The time range is configurable through the API service.

The backend must implement the endpoint and return data matching the application's `AnalyticsData` model.

### 3.6 Request Timeout and Error Handling

Requests use a default timeout of 30 seconds.

The implementation handles:

- Network connection failures.
- Request timeouts.
- HTTP error responses.
- Authentication failures.
- Invalid login response structures.

For failed HTTP 401 requests, the stored authentication session is cleared.

---

## 4. Real-Time Service

### 4.1 Overview

The real-time service is implemented in:

`src/services/realtimeService.ts`

It uses the React Native WebSocket interface for bidirectional communication.

### 4.2 Connection Configuration

The service derives the WebSocket URL from `API_BASE_URL`.

The HTTP scheme is converted as follows:

| API Scheme | WebSocket Scheme |
|---|---|
| HTTP | WS |
| HTTPS | WSS |

The service appends `/ws` to the configured API base URL.

The backend must expose a compatible WebSocket endpoint at that location.

### 4.3 Event Handling

The service supports:

- `connected`
- `disconnected`
- `message`
- `error`
- `parseError`
- `maxReconnectAttemptsReached`

Application-specific event types can also be subscribed to.

### 4.4 Message Structure

The expected incoming message format is:

```json
{
  "type": "dataUpdate",
  "data": {
    "totalUsers": 120,
    "activeUsers": 86,
    "sessions": 340,
    "revenue": 12500
  },
  "timestamp": 1793300000000
}
```

The `type` identifies the event, while `data` contains its payload.

### 4.5 Reconnection Strategy

The implementation uses exponential backoff.

| Attempt | Delay |
|---|---:|
| 1 | 1 second |
| 2 | 2 seconds |
| 3 | 4 seconds |
| 4 | 8 seconds |
| 5 | 16 seconds |

The maximum automatic reconnection count is five attempts.

The service also provides explicit disconnection and event unsubscription methods.

---

## 5. Offline Service

### 5.1 Overview

The offline service is implemented in:

`src/services/offlineService.ts`

It uses:

- AsyncStorage for persistent local data.
- NetInfo for network connectivity monitoring.
- The API client for synchronization.

### 5.2 Offline Request Queue

The service maintains a persistent queue of requests.

Each offline request contains:

```typescript
interface OfflineRequest {
  id: string;
  endpoint: string;
  method: HttpMethod;
  data?: unknown;
  timestamp: number;
  retries?: number;
}
```

The queue supports:

- Adding requests.
- Retrieving queued requests.
- Persisting requests.
- Synchronizing requests.
- Retaining failed requests.

Eligible write requests are added to the queue when the API client encounters a network failure.

Authentication endpoints are excluded.

### 5.3 Automatic Synchronization

The service monitors network connectivity using NetInfo.

When internet connectivity returns, synchronization is attempted.

The synchronization process:

1. Checks network availability.
2. Reads pending requests.
3. Sends requests to the backend.
4. Removes successfully synchronized requests.
5. Retains failed requests.
6. Increments retry counters for failed requests.

The automatic retry limit is three attempts per request.

Failed requests can also be reset for another synchronization attempt through the manual retry method.

### 5.4 Offline Data Caching

The offline service maintains a key-value cache.

Each cache record stores:

```typescript
interface OfflineCacheRecord {
  key: string;
  data: unknown;
  timestamp: number;
  expiresAt?: number;
}
```

The cache supports:

- Storing API responses.
- Retrieving cached data.
- Checking expiration.
- Removing expired entries.
- Listing valid cache keys.
- Clearing cached data.

Example:

```typescript
await offlineService.storeOfflineData(
  'analytics:30d',
  analyticsData,
  Date.now() + 5 * 60 * 1000,
);

const cachedData =
  await offlineService.getOfflineData('analytics:30d');
```

This example stores analytics data for five minutes.

### 5.5 Synchronization Safety

Offline request replay requires particular care.

Operations that create payments, transfer funds, or perform other non-idempotent actions should not be queued for replay without server-side idempotency protection.

The backend must authenticate and authorize every synchronized request.

---

## 6. Notification Service

### 6.1 Overview

The notification service is implemented in:

`src/services/notificationService.ts`

It uses the installed `react-native-notify-kit` package.

### 6.2 Local Notifications

The current implementation supports:

- Notification permission requests.
- Android notification channel creation.
- Local notification display.
- Notification title and body configuration.

Example:

```typescript
await notificationService.showLocalNotification(
  'Sync completed',
  'Your offline data has been synchronized.',
);
```

The application uses the notification channel:

`day21-updates`

### 6.3 Remote Push Notification Requirements

The service includes a method for forwarding an incoming FCM message to the notification library.

However, forwarding a message and receiving a remote push notification are separate operations.

Complete remote delivery requires:

- Firebase project configuration.
- Firebase Messaging integration.
- Android and/or iOS native configuration.
- Device token registration.
- Backend support for sending notifications.
- Permission handling on the target device.

These external configuration requirements must be completed and tested before claiming production-ready remote push delivery.

---

## 7. Reusable API Integration Hook

### 7.1 Overview

The reusable hook is implemented in:

`src/hooks/useApi.ts`

It provides a common interface for screens that retrieve backend data.

### 7.2 Hook Options

```typescript
export interface UseApiOptions {
  enableRealtime?: boolean;
  enableOffline?: boolean;
  cacheKey?: string;
  cacheExpiry?: number;
}
```

| Option | Description |
|---|---|
| `enableRealtime` | Enables WebSocket subscriptions |
| `enableOffline` | Enables local cache support |
| `cacheKey` | Defines the cache identifier |
| `cacheExpiry` | Defines the cache expiration duration |

The default cache duration is five minutes.

### 7.3 Returned State

The hook exposes:

```typescript
export interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  isOnline: boolean;
  isRealtimeConnected: boolean;
  refetch: () => Promise<void>;
}
```

This allows a screen to handle:

- Loading indicators.
- API response data.
- API error messages.
- Network connection status.
- WebSocket connection status.
- Manual data refresh.

### 7.4 Example Usage

```typescript
const {
  data,
  loading,
  error,
  isOnline,
  isRealtimeConnected,
  refetch,
} = useApi<AnalyticsData>('/analytics?timeRange=30d', {
  enableOffline: true,
  enableRealtime: true,
  cacheKey: 'analytics:30d',
  cacheExpiry: 5 * 60 * 1000,
});
```

The backend must return a payload matching the requested data type.

The current hook replaces its displayed data with incoming `dataUpdate` payloads. The real-time backend should therefore send complete compatible objects unless the hook is deliberately adapted to merge partial updates.

---

## 8. Testing and Validation

### 8.1 TypeScript Validation

Run:

```powershell
npx tsc --noEmit
```

This checks the application's TypeScript types without generating output files.

### 8.2 ESLint Validation

Run:

```powershell
npm run lint
```

This checks source files for linting issues.

### 8.3 Automated Tests

Run:

```powershell
npm test -- --runInBand
```

The test suite includes:

| Test File | Coverage |
|---|---|
| `App.test.tsx` | Existing Redux offline state |
| `apiService.test.ts` | Authentication, API responses, errors and offline request queuing |
| `offlineService.test.ts` | Persistent queue, cache, expiration and synchronization |
| `realtimeService.test.ts` | WebSocket events, sending and subscriptions |
| `notificationService.test.ts` | Local notifications and FCM message forwarding |

The previously reported validation result was five passing test suites and 25 passing tests.

These automated tests use mocks. They do not replace live backend, WebSocket, device notification, or remote push integration tests.

### 8.4 Live Integration Test Checklist

The following checks require a compatible backend or device environment:

- [ ] Successful API login.
- [ ] Failed API login.
- [ ] Authenticated API requests.
- [ ] Expired token handling.
- [ ] User profile retrieval and update.
- [ ] Analytics retrieval.
- [ ] WebSocket event reception.
- [ ] WebSocket reconnection.
- [ ] Offline request synchronization.
- [ ] Cache retrieval after connectivity loss.
- [ ] Android local notification display.
- [ ] Remote push delivery after Firebase configuration.

---

## 9. Performance and Security Best Practices

### Security

- Use HTTPS and WSS in production.
- Keep credentials and API secrets out of source control.
- Consider secure platform-backed token storage.
- Validate data received from backend services.
- Enforce server-side authentication and authorization.
- Protect replayable requests through idempotency mechanisms where necessary.

### Performance

- Cache frequently accessed API responses.
- Use appropriate cache expiration durations.
- Avoid unnecessary API calls.
- Limit reconnect attempts.
- Avoid repeated synchronization while another synchronization is in progress.
- Keep offline request data small.

### Error Handling

- Display clear network errors.
- Handle HTTP response failures.
- Provide manual retry actions.
- Preserve failed offline requests for later recovery.
- Avoid exposing sensitive backend response details to users.

---

## 10. Conclusion

The Day 21 implementation extends the React Native application with a structured API integration layer.

It demonstrates authenticated REST communication, WebSocket-based real-time updates, persistent offline storage, synchronization, notifications, and reusable API state management.

The architecture separates application screens from backend communication, making the services easier to test, maintain, and extend.

Remote push delivery and live backend integration remain dependent on external server and platform configuration.
