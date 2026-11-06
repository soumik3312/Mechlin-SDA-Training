import 'package:flutter/material.dart';

import 'flutter_ai_chatbot.dart';

const String mobileAIBaseUrl = String.fromEnvironment(
  'MOBILE_AI_BASE_URL',
  defaultValue: 'http://10.0.2.2:5003',
);

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const Day26MobileApp());
}

class Day26MobileApp extends StatelessWidget {
  const Day26MobileApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Day 26 AI Mobile',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF4967D8),
        ),
        useMaterial3: true,
        scaffoldBackgroundColor: const Color(0xFFF5F7FC),
      ),
      home: FlutterAIChatbot(
        baseUrl: mobileAIBaseUrl,
        title: 'AI Assistant',
      ),
    );
  }
}