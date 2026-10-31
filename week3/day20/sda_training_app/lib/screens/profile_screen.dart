import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/auth_provider.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<AuthProvider>(
      builder: (context, auth, _) {
        final user = auth.user;

        if (user == null) {
          return const Scaffold(
            body: Center(child: Text('No profile is available.')),
          );
        }

        final nameParts = user.name.trim().split(RegExp(r'\s+'));
        final initials = nameParts
            .take(2)
            .map((part) => part.isEmpty ? '' : part[0].toUpperCase())
            .join();

        return Scaffold(
          appBar: AppBar(
            title: const Text(
              'My Profile',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
          ),
          body: ListView(
            padding: const EdgeInsets.all(20),
            children: [
              Card(
                elevation: 0,
                color: Colors.white,
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    children: [
                      CircleAvatar(
                        radius: 42,
                        backgroundColor: const Color(0xFFE5EBFF),
                        backgroundImage: user.avatarUrl == null
                            ? null
                            : CachedNetworkImageProvider(user.avatarUrl!),
                        child: user.avatarUrl == null
                            ? Text(
                                initials.isEmpty ? 'S' : initials,
                                style: const TextStyle(
                                  color: Color(0xFF3456D1),
                                  fontSize: 24,
                                  fontWeight: FontWeight.bold,
                                ),
                              )
                            : null,
                      ),
                      const SizedBox(height: 16),
                      Text(
                        user.name,
                        style: Theme.of(context).textTheme.headlineSmall
                            ?.copyWith(fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        user.email,
                        style: const TextStyle(color: Colors.black54),
                      ),
                      const SizedBox(height: 12),
                      Chip(
                        avatar: const Icon(Icons.badge_outlined, size: 18),
                        label: Text(user.role),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 20),
              Text(
                'Account details',
                style: Theme.of(
                  context,
                ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 10),
              Card(
                elevation: 0,
                color: Colors.white,
                child: Column(
                  children: [
                    ListTile(
                      leading: const Icon(Icons.person_outline),
                      title: const Text('Display name'),
                      subtitle: Text(user.name),
                    ),
                    const Divider(height: 1),
                    ListTile(
                      leading: const Icon(Icons.email_outlined),
                      title: const Text('Email address'),
                      subtitle: Text(user.email),
                    ),
                    const Divider(height: 1),
                    ListTile(
                      leading: const Icon(Icons.fingerprint_rounded),
                      title: const Text('User ID'),
                      subtitle: SelectableText(user.id),
                    ),
                  ],
                ),
              ),
              if (auth.isDemoMode) ...[
                const SizedBox(height: 12),
                const Text(
                  'This profile is a locally stored demo profile, not a server account.',
                  style: TextStyle(color: Colors.black54, fontSize: 12),
                ),
              ],
            ],
          ),
        );
      },
    );
  }
}
