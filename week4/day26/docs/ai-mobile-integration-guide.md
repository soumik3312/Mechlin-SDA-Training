# Day 26: AI Mobile Integration Guide

## 1. Overview

Day 26 integrates the existing Day 25 local AI web service with React Native
and Flutter mobile clients.

The mobile clients do not load a second AI model. They communicate with a
mobile gateway, which forwards requests to the existing Day 25 backend.

### Architecture

Mobile React Native / Flutter application
                 |
                 | HTTP requests, port 5003
                 v
       Day 26 Mobile AI Gateway
                 |
                 | Loopback HTTP, port 5002
                 v
        Day 25 AI Web Service
                 |
                 v
         Day 24 AI Agents
                 |
                 v
          Ollama / Mistral

The Day 25 service remains bound to 127.0.0.1:5002. The Day 26 gateway
provides the mobile-facing network endpoint.

## 2. Implemented features

### React Native

Files are located in `ai/mobile-components/`.

- `ReactNativeAIChatbot.tsx`
  - Persistent conversation thread ID.
  - Local chat history using AsyncStorage.
  - Chat requests to the Day 25 conversation agent.
  - Typing indicator and request-error display.
  - Server-side memory clear and local history clear.

- `MobileAIContentGenerator.tsx`
  - Article, blog post, social media, email, and product description.
  - Professional, casual, friendly, formal, and creative tones.
  - Short, medium, and long output lengths.
  - Comma-separated keywords.
  - Saved generation history using AsyncStorage.
  - Regeneration and native clipboard copy.

- `MobileAIRecommendations.tsx`
  - Loads the default Day 25 recommendation profile.
  - Saves customized interests on-device.
  - Retrieves up to eight catalogue recommendations.
  - Saves bookmarks using AsyncStorage.
  - Opens secure HTTPS recommendation links.
  - Sends feedback with the Day 25 rating scale of 1 to 4.

`react_native_app/App.tsx` provides a simple tab-based host application.

### Flutter

`ai/mobile-components/flutter_ai_chatbot.dart` provides:

- Persistent chat thread ID.
- Local conversation history using shared_preferences.
- Requests to the Day 25 conversation agent.
- Loading and error states.
- Server memory clearing and local history clearing.

`flutter_app/lib/main.dart` is the Flutter host application.

## 3. Dependencies

### React Native / Expo

The Expo app uses:

- `@react-native-async-storage/async-storage`
- `expo-clipboard`

Install compatible versions through the Expo CLI:

    npx expo install @react-native-async-storage/async-storage expo-clipboard

### Flutter

The Flutter app uses:

- `http: ^1.6.0`
- `shared_preferences: ^2.5.6`

Install dependencies:

    flutter pub get

## 4. Start the local AI backend

The mobile gateway depends on the Day 25 service. Keep both services running
in separate PowerShell terminals.

### Terminal 1: Day 25 backend

From the repository root:

    Set-Location "D:\Mechlin-SDA-Training\Mechlin-SDA-Training"
    python -B -m week4.day25.ai.run_web_service

The service should listen on:

    http://127.0.0.1:5002

Verify it from another terminal:

    Invoke-RestMethod -Uri "http://127.0.0.1:5002/health"

Expected health information includes:

- success: true
- status: healthy
- provider: ollama
- model: mistral:latest

### Terminal 2: Day 26 mobile gateway

From the repository root:

    Set-Location "D:\Mechlin-SDA-Training\Mechlin-SDA-Training"

    $env:MOBILE_AI_HOST = "0.0.0.0"
    $env:MOBILE_AI_PORT = "5003"

    python -B week4\day26\ai\run_mobile_ai_service.py

The gateway listens on port 5003 and forwards to Day 25 at
`http://127.0.0.1:5002`.

Verify:

    Invoke-RestMethod -Uri "http://127.0.0.1:5003/mobile/health"

The gateway must report the health of the upstream Day 25 service.

## 5. Configure the mobile device

### Android emulator

Use:

    http://10.0.2.2:5003

This address reaches the host computer from the standard Android emulator.

### iOS simulator

Use:

    http://127.0.0.1:5003

### Physical Android or iOS phone

The phone and development computer must be connected to the same trusted
private Wi-Fi network.

Find the computer's private IPv4 address:

    ipconfig

Locate the IPv4 address of the active Wi-Fi adapter.

Set the React Native URL in:

    ai/mobile-components/mobileConfig.ts

For example, replace the default address with:

    export const MOBILE_AI_BASE_URL = 'http://YOUR_COMPUTER_LAN_IP:5003';

Use the actual IPv4 address shown by `ipconfig`. Do not copy the placeholder.

For Flutter, pass the same address when running:

    flutter run --dart-define=MOBILE_AI_BASE_URL=http://YOUR_COMPUTER_LAN_IP:5003

### Windows Firewall

For a physical phone to reach the gateway, Windows may need an inbound rule
for TCP port 5003 on the Private network profile.

Run PowerShell as Administrator only if the connection is blocked:

    New-NetFirewallRule `
      -DisplayName "Day 26 Mobile AI Gateway" `
      -Direction Inbound `
      -Protocol TCP `
      -LocalPort 5003 `
      -Action Allow `
      -Profile Private

Do not create a public-profile firewall rule.

### Android debug HTTP traffic

The Flutter debug manifest permits cleartext traffic for local development.
The setting is in `src/debug/AndroidManifest.xml`, not the release manifest.

For production, use HTTPS and remove the debug-only cleartext allowance.

## 6. Run the React Native app

From the React Native project folder:

    Set-Location "D:\Mechlin-SDA-Training\Mechlin-SDA-Training\week4\day26\react_native_app"

    npx expo start

Open the project using Expo Go or an Android emulator.

The app contains three sections:

- Chat
- Create
- Discover

For a physical device, edit `MOBILE_AI_BASE_URL` before starting Expo.

## 7. Run the Flutter app

Set the Dart package cache to D: before resolving packages:

    $env:PUB_CACHE = "D:\Mechlin-SDA-Training\AI-Storage\FlutterPubCache"

Then:

    Set-Location "D:\Mechlin-SDA-Training\Mechlin-SDA-Training\week4\day26\flutter_app"

    flutter pub get
    flutter analyze
    flutter test

Run on the Android emulator:

    flutter run

For a physical phone:

    flutter run --dart-define=MOBILE_AI_BASE_URL=http://YOUR_COMPUTER_LAN_IP:5003

Replace the placeholder with the actual private IPv4 address.

## 8. API contract

| Mobile endpoint | Method | Day 25 upstream endpoint |
|---|---|---|
| `/mobile/health` | GET | `/health` |
| `/mobile/chat` | POST | `/api/ai/chat` |
| `/mobile/memory` | GET | `/api/ai/memory` |
| `/mobile/memory/clear` | POST | `/api/ai/memory/clear` |
| `/mobile/generate` | POST | `/api/ai/generate` |
| `/mobile/profile` | GET | `/api/ai/recommendations/profile` |
| `/mobile/recommendations` | POST | `/api/ai/recommendations` |
| `/mobile/recommendations/feedback` | POST | `/api/ai/recommendations/feedback` |

### Chat payload

    {
      "message": "Explain mobile AI integration",
      "thread_id": "mobile-demo-thread",
      "agent_type": "conversation"
    }

The response contains `response`, `agent_type`, and `thread_id`.

### Content generation payload

    {
      "content_type": "article",
      "topic": "AI in mobile applications",
      "tone": "professional",
      "length": "medium",
      "keywords": ["AI", "mobile", "Flutter"]
    }

### Recommendations payload

    {
      "user_profile": {
        "interests": ["python", "ai", "web"],
        "experience": "intermediate"
      },
      "max_recommendations": 8
    }

### Feedback payload

    {
      "rating": 4,
      "recommendations": [
        {
          "id": "example-resource"
        }
      ],
      "user_profile": {
        "interests": ["python", "ai"]
      }
    }

The backend accepts integer ratings from 1 through 4.

## 9. Persistence and offline behavior

React Native stores chat history, generation history, bookmarks, and the
recommendation profile using AsyncStorage.

Flutter stores the chat thread ID and chat history using shared_preferences.

Previously saved local information remains available while offline. New chat
responses, content generation, recommendations, memory operations, and
feedback require access to the mobile gateway and the Day 25 backend.

The mobile apps do not run Mistral locally and do not perform on-device
language-model inference.

## 10. Performance and user experience

- Uses local storage to avoid losing conversations after app restarts.
- Keeps the chat and generated content in local state for responsive rendering.
- Shows loading states while waiting for model responses.
- Avoids continuous polling.
- Limits content input to match backend validation.
- Limits recommendation results to the backend maximum of eight.
- Preserves the conversation thread ID across app restarts.

## 11. Security

- Do not embed paid AI API keys or Ollama credentials in mobile code.
- Do not expose the Ollama port directly to mobile clients.
- Keep local development gateway access restricted to a trusted private
  network.
- Use HTTPS, authentication, request limits, and server-side authorization
  for production deployments.
- Do not ship the debug-only Android cleartext configuration in production.

## 12. Current implementation boundaries

The current Day 25 API returns complete JSON responses. The mobile chatbot
therefore displays completed replies; token-by-token streaming is not
implemented.

The current mobile apps do not implement voice recognition, speech output,
image understanding, or background AI automation because the existing Day 25
API does not expose those capabilities.

The mobile clients cache user-visible history and preferences locally, but
new AI inference still requires the PC-hosted local AI service to be reachable.