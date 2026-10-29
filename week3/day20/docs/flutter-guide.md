# Day 20: Flutter Guide

## Overview

The SDA Training App demonstrates Flutter widgets, Material Design, navigation, Provider state management, API communication, local storage, offline queuing, and local notifications.

## Features

- Provider-based authentication and analytics state.
- Splash screen with persisted-session restoration.
- Login screen with a local-only demo session.
- Dashboard, Analytics, Profile, and Settings tabs.
- Dio-based API client with authentication headers and error handling.
- Persistent session and offline request queue using SharedPreferences.
- Connectivity monitoring and queued-request retry.
- Local notification permission request and test notification.
- Model and widget tests.

## Project Structure

- `lib/main.dart`: app bootstrap, theme, and dependency providers.
- `lib/models/`: user, authentication response, analytics, and offline action models.
- `lib/providers/`: authentication and analytics state.
- `lib/services/`: API, authentication, analytics, connectivity, offline queue, and notifications.
- `lib/screens/`: splash, login, dashboard, analytics, profile, and settings screens.
- `lib/widgets/`: reusable metric card.
- `test/`: widget and model tests.
- `assets/images/` and `assets/icons/`: asset directories.

## API Configuration

The default URL is `http://10.0.2.2:3000/api/v1` for the Android emulator to reach a backend on the development computer.

For Flutter Web, use `http://localhost:3000/api/v1`.

For a physical Android device, configure the computer's LAN address and ensure the device can reach the development server.

Example:

```powershell
flutter run --dart-define=API_BASE_URL=http://192.168.1.10:3000/api/v1