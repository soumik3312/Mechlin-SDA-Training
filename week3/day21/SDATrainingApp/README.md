
# SDA Training App — Day 21: API Integration

## Overview

This React Native application implements the Day 21 API Integration requirements of the Mechlin SDA Training Program.

It extends the existing mobile application foundation with authenticated API communication, real-time WebSocket updates, persistent offline data management, local notifications, and reusable API hooks.

## Technology Stack

- React Native
- TypeScript
- React Hooks
- Fetch API
- AsyncStorage
- NetInfo
- WebSocket
- Redux Toolkit
- react-native-notify-kit
- Jest
- ESLint

## Project Structure

```text
SDATrainingApp/
├── __tests__/
│   ├── App.test.tsx
│   ├── apiService.test.ts
│   ├── offlineService.test.ts
│   ├── realtimeService.test.ts
│   └── notificationService.test.ts
├── src/
│   ├── hooks/
│   │   └── useApi.ts
│   ├── navigation/
│   ├── screens/
│   ├── services/
│   │   ├── apiService.ts
│   │   ├── offlineService.ts
│   │   ├── notificationService.ts
│   │   └── realtimeService.ts
│   ├── store/
│   └── types/
├── App.tsx
├── package.json
├── package-lock.json
├── tsconfig.json
└── README.md
```

## Implemented Features

### 1. API Client

Implemented in `src/services/apiService.ts`.

- Authenticated REST API requests.
- Bearer token authentication.
- Login and logout operations.
- Current-user retrieval.
- User and analytics API operations.
- Generic GET method.
- Request timeout handling.
- HTTP error handling.
- Unauthorized session clearing.
- Automatic offline queuing for eligible failed write requests.

### 2. Real-Time Service

Implemented in `src/services/realtimeService.ts`.

- WebSocket connection handling.
- Real-time event subscriptions.
- JSON message processing.
- Sending messages.
- Connection status tracking.
- Exponential reconnection.
- Maximum of five automatic reconnect attempts.
- Subscription cleanup.

### 3. Offline Service

Implemented in `src/services/offlineService.ts`.

- Persistent offline request queue.
- Network connectivity monitoring.
- Automatic synchronization attempts.
- Successful request removal.
- Failed request retention.
- Three automatic retry attempts.
- Manual retry functionality.
- Persistent local cache.
- Cache expiration.
- Offline data clearing.

### 4. Notification Service

Implemented in `src/services/notificationService.ts`.

- Notification permissions.
- Android notification channel creation.
- Local notification display.
- FCM message forwarding through the installed notification package.

Remote push delivery requires Firebase Messaging, native platform configuration, and backend integration.

### 5. API Integration Hook

Implemented in `src/hooks/useApi.ts`.

- Generic API data fetching.
- Loading state.
- Error handling.
- Manual refresh.
- Network status.
- Offline cache fallback.
- Configurable cache duration.
- Optional real-time subscriptions.
- Component lifecycle cleanup.

## API Configuration

The development API base URL is defined in `src/services/apiService.ts`:

```typescript
export const API_BASE_URL = 'http://10.0.2.2:3000/api/v1';
```

For Android emulators, `10.0.2.2` accesses the development machine's localhost.

For physical Android devices, use a reachable development-machine LAN address.

Use HTTPS for production deployments.

## Installation

Requirements:

- Node.js 22.11 or newer.
- npm.
- Android Studio and Android SDK for Android development.
- Xcode and CocoaPods for iOS development on macOS.

Install dependencies:

```powershell
npm ci
```

## Running the Application

Start Metro:

```powershell
npm start
```

Run Android:

```powershell
npm run android
```

An Android emulator or connected Android device is required.

## Validation Commands

TypeScript:

```powershell
npx tsc --noEmit
```

ESLint:

```powershell
npm run lint
```

Jest:

```powershell
npm test -- --runInBand
```

## Automated Testing

The Day 21 test suite covers:

| Test Suite | Coverage |
|---|---|
| App tests | Existing offline Redux state |
| API service tests | Authentication, responses, errors, queue integration |
| Offline service tests | Queue, cache, expiration and synchronization |
| Real-time service tests | WebSocket connections, sending and subscriptions |
| Notification service tests | Permissions, local notifications and FCM forwarding |

Latest reported validation:

- TypeScript compilation passed.
- ESLint passed with zero warnings and zero errors.
- All five Jest test suites passed.
- All 25 tests passed.

The tests use mocked services. Live backend communication, WebSocket operation, native notification behavior, and remote push delivery require separate integration testing.

## Backend Requirements

The application expects a compatible backend supporting:

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/auth/login` | User authentication |
| POST | `/auth/logout` | Session termination |
| GET | `/auth/me` | Current-user retrieval |
| GET | `/users` | User listing |
| GET | `/users/:id` | Individual user retrieval |
| PUT | `/users/:id` | User updates |
| GET | `/analytics` | Analytics retrieval |

The real-time server must expose the WebSocket endpoint derived from the configured API base URL, ending in `/ws`.

Expected event payloads use `type`, `data`, and an optional `timestamp`.

## Security Considerations

- Use HTTPS and WSS for production.
- Do not commit authentication secrets or credentials.
- Consider platform-backed secure storage for authentication tokens.
- Validate and authorize requests on the backend.
- Use server-side idempotency protection for replayable operations.
- Protect sensitive information in application logs.

## Known Limitations

- Live API functionality requires a compatible backend.
- WebSocket functionality requires an available WebSocket server.
- Local notifications are implemented, but device-level behavior requires native testing.
- Remote push delivery requires Firebase Messaging integration and device registration.
- The current automated tests mock the network and native services.

## Documentation

See:

`../docs/api-integration-guide.md`

for detailed information about API architecture, authentication, WebSocket communication, offline synchronization, caching, notifications, testing, and security.

## Day 21 Status

- [x] API client.
- [x] Authentication and error handling.
- [x] Real-time WebSocket service.
- [x] Persistent offline queue.
- [x] Offline data caching.
- [x] Automatic synchronization and retry handling.
- [x] Notification service.
- [x] Reusable API integration hook.
- [x] Documentation.
- [x] TypeScript validation.
- [x] ESLint validation.
- [x] Automated Jest tests.
