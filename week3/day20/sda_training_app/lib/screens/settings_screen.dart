import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/auth_provider.dart';
import '../services/notification_service.dart';
import '../services/offline_service.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  Future<void> _testNotification(BuildContext context) async {
    try {
      final granted = await NotificationService.requestPermission();

      if (!context.mounted) return;

      if (granted) {
        await NotificationService.showTestNotification();
      }

      if (!context.mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            granted
                ? 'Test notification requested.'
                : 'Notification permission was not granted or is unavailable.',
          ),
        ),
      );
    } catch (error) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Notification error: $error')));
    }
  }

  Future<void> _syncQueue(BuildContext context) async {
    final offline = context.read<OfflineService>();
    final count = await offline.syncPendingRequests();

    if (!context.mounted) return;

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          !offline.isOnline
              ? 'Offline: the queue was preserved.'
              : count > 0
              ? '$count request(s) synced.'
              : 'No requests synced. Review the queue or API connection.',
        ),
      ),
    );
  }

  Future<void> _logout(BuildContext context) async {
    await context.read<AuthProvider>().logout();

    if (!context.mounted) return;

    Navigator.of(context).pushNamedAndRemoveUntil('/login', (_) => false);
  }

  @override
  Widget build(BuildContext context) {
    return Consumer2<OfflineService, AuthProvider>(
      builder: (context, offline, auth, _) {
        return Scaffold(
          appBar: AppBar(
            title: const Text(
              'Settings',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
          ),
          body: ListView(
            padding: const EdgeInsets.all(20),
            children: [
              Text(
                'Connectivity',
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
                      leading: Icon(
                        offline.isOnline
                            ? Icons.wifi_rounded
                            : Icons.wifi_off_rounded,
                        color: offline.isOnline ? Colors.green : Colors.orange,
                      ),
                      title: const Text('Network status'),
                      subtitle: Text(
                        offline.isOnline
                            ? 'A network connection is detected.'
                            : 'Offline or no connection detected.',
                      ),
                    ),
                    const Divider(height: 1),
                    ListTile(
                      leading: const Icon(Icons.pending_actions_outlined),
                      title: const Text('Queued requests'),
                      subtitle: Text('${offline.queueCount} pending'),
                      trailing: offline.isSyncing
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : null,
                    ),
                    if (offline.lastSyncAt != null) ...[
                      const Divider(height: 1),
                      ListTile(
                        leading: const Icon(Icons.sync_rounded),
                        title: const Text('Last successful sync'),
                        subtitle: Text(
                          offline.lastSyncAt!.toLocal().toString(),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 12),
              FilledButton.icon(
                onPressed: offline.isSyncing ? null : () => _syncQueue(context),
                icon: const Icon(Icons.sync_rounded),
                label: const Text('Synchronize offline queue'),
              ),
              const SizedBox(height: 26),
              Text(
                'Notifications',
                style: Theme.of(
                  context,
                ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 10),
              Card(
                elevation: 0,
                color: Colors.white,
                child: ListTile(
                  leading: const Icon(Icons.notifications_active_outlined),
                  title: const Text('Test local notification'),
                  subtitle: const Text(
                    'Request permission and display a test notification.',
                  ),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => _testNotification(context),
                ),
              ),
              const SizedBox(height: 26),
              Text(
                'Account',
                style: Theme.of(
                  context,
                ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 10),
              Card(
                elevation: 0,
                color: Colors.white,
                child: ListTile(
                  leading: const Icon(Icons.logout_rounded),
                  title: const Text('Sign out'),
                  subtitle: Text(
                    auth.isDemoMode
                        ? 'Clear the local demo session.'
                        : 'End the saved session.',
                  ),
                  onTap: () => _logout(context),
                ),
              ),
              const SizedBox(height: 24),
              const Text(
                'SDA Training App · Day 20 Flutter',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.black45, fontSize: 12),
              ),
            ],
          ),
        );
      },
    );
  }
}
