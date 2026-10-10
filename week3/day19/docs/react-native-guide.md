# React Native Guide

## Day 19 Objectives

- Build a cross-platform mobile application with React Native and TypeScript.
- Implement navigation with React Navigation.
- Manage application state with Redux Toolkit.
- Store session data and queued requests locally.
- Integrate authentication, users, and analytics with backend APIs.
- Monitor connectivity and retry queued operations.
- Display local notifications.
- Test state management and validate the implementation.

## Project Structure

```text
week3/day19/
├── SDATrainingApp/
│   ├── App.tsx
│   ├── index.js
│   ├── babel.config.js
│   ├── src/
│   │   ├── navigation/AppNavigator.tsx
│   │   ├── screens/
│   │   │   ├── LoginScreen.tsx
│   │   │   ├── DashboardScreen.tsx
│   │   │   ├── AnalyticsScreen.tsx
│   │   │   ├── ProfileScreen.tsx
│   │   │   └── SettingsScreen.tsx
│   │   ├── services/
│   │   │   ├── apiService.ts
│   │   │   ├── offlineService.ts
│   │   │   └── notificationService.ts
│   │   ├── store/
│   │   │   ├── index.ts
│   │   │   ├── hooks.ts
│   │   │   └── slices/
│   │   │       ├── authSlice.ts
│   │   │       ├── userSlice.ts
│   │   │       ├── analyticsSlice.ts
│   │   │       └── offlineSlice.ts
│   │   └── types/index.ts
│   └── __tests__/App.test.tsx
├── docs/react-native-guide.md
└── scripts/test-day19.ps1
```

## Navigation

The application uses a stack navigator for authentication and the
main application. The main application contains four bottom tabs:
Dashboard, Analytics, Profile, and Settings.

The navigation tree responds to Redux authentication state. A
successful login displays the main application, while logout returns
the user to the login screen.

## State Management

Redux Toolkit stores the authentication, user, analytics, and offline
state. Async thunks handle asynchronous login and API requests.

Serializable application data belongs in Redux. Persistent sessions
and queued requests are stored through AsyncStorage.

## API Integration

The API service centralizes request headers, authentication, JSON
handling, and HTTP error reporting.

The sample API base URL is:

`http://10.0.2.2:3000/api/v1`

That address is for an Android emulator connecting to a backend on
the host computer. A physical device requires the host computer's
LAN IP address.

Sample endpoints:

- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`
- `GET /users`
- `GET /users/:id`
- `PUT /users/:id`
- `GET /analytics?timeRange=30d`

The backend must implement these routes and return data that matches
the TypeScript interfaces. Successful local compilation does not
prove that a remote API is running or reachable.

## Offline Support

AsyncStorage persists the offline request queue. NetInfo tracks
network connectivity. When a connection is restored, the service
attempts to synchronize queued requests.

Requests that fail remain available for future retries. Successfully
synchronized requests are removed from the queue.

The sample operation uses `/training/offline-events`; the backend
must implement this endpoint for the sample request to synchronize.

## Notifications

The application uses `react-native-notify-kit` to request permission,
create an Android notification channel, and show a local notification.

Local notifications and remote push notifications are different.
Remote push requires a messaging provider, native configuration,
device registration, and a sending backend.

## Security Considerations

- Never commit credentials, tokens, or private API keys.
- Use HTTPS for production API traffic.
- Treat demo authentication as development-only.
- Validate response data and report request errors.
- AsyncStorage is persistent storage, not encrypted secret storage.
- Use an appropriate secure-storage solution for sensitive credentials.
- Avoid logging credentials or private user information.

## Performance and Maintenance

- Keep UI components focused on presentation.
- Centralize HTTP requests in the API service.
- Use Redux async thunks for asynchronous workflows.
- Keep failed offline operations instead of silently deleting them.
- Review native dependency compatibility before upgrading React Native.
- Measure startup time, memory, network traffic, and UI responsiveness.

## Testing and Validation

The local validation script checks required files, package dependencies,
TypeScript compilation, and the Jest test suite.

Manual validation should also cover:

- App startup on a supported Android emulator or device.
- Login failure when the backend is unavailable.
- Demo login and session restoration after restarting the app.
- Navigation between all four tabs.
- Offline queue persistence across restarts.
- Reconnection and synchronization against a working backend.
- Notification permissions and local notification display.
- Responsive layouts and keyboard behavior.

Local tests alone do not prove that Android/iOS builds, backend
integration, or remote push delivery work.

## Success Criteria

- [ ] React Native project structure exists.
- [ ] Stack and bottom-tab navigation are implemented.
- [ ] Redux manages authentication, users, analytics, and offline state.
- [ ] Session data persists locally.
- [ ] The API service handles requests and HTTP errors.
- [ ] Offline operations persist and can be retried.
- [ ] Local notification service is implemented.
- [ ] TypeScript and Jest checks pass.
- [ ] Documentation describes setup and limitations.