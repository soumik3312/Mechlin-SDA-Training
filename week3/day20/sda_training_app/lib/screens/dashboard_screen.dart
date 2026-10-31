import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../providers/analytics_provider.dart';
import '../providers/auth_provider.dart';
import '../services/offline_service.dart';
import '../widgets/stat_card.dart';

class DashboardScreen extends StatelessWidget {
  const DashboardScreen({super.key});

  Future<void> _queueExampleUpdate(BuildContext context) async {
    final user = context.read<AuthProvider>().user;
    if (user == null) return;

    await context.read<OfflineService>().queueRequest(
      endpoint: '/users/${user.id}',
      method: 'PUT',
      data: {
        'name': user.name,
        'trainingDay': 20,
        'updatedAt': DateTime.now().toIso8601String(),
      },
    );

    if (!context.mounted) return;

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Training update saved to the offline queue.'),
      ),
    );
  }

  Future<void> _syncQueue(BuildContext context) async {
    final synced = await context.read<OfflineService>().syncPendingRequests();

    if (!context.mounted) return;

    final offline = context.read<OfflineService>();
    final message = !offline.isOnline
        ? 'You are offline. Requests remain queued.'
        : synced > 0
        ? '$synced request(s) synced.'
        : 'No requests synced. Check the queue or backend connection.';

    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    return Consumer3<AuthProvider, OfflineService, AnalyticsProvider>(
      builder: (context, auth, offline, analytics, _) {
        final user = auth.user;

        return Scaffold(
          appBar: AppBar(
            title: const Text(
              'Dashboard',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
            actions: [
              Padding(
                padding: const EdgeInsets.only(right: 16),
                child: Icon(
                  offline.isOnline
                      ? Icons.cloud_done_outlined
                      : Icons.cloud_off_outlined,
                  color: offline.isOnline ? Colors.green : Colors.deepOrange,
                ),
              ),
            ],
          ),
          body: RefreshIndicator(
            onRefresh: () => analytics.fetchAnalytics(),
            child: ListView(
              padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
              children: [
                Text(
                  DateFormat('EEEE, d MMMM').format(DateTime.now()),
                  style: Theme.of(
                    context,
                  ).textTheme.bodyMedium?.copyWith(color: Colors.black54),
                ),
                const SizedBox(height: 8),
                Text(
                  'Hello, ${user?.name ?? 'Learner'} 👋',
                  style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Your learning progress at a glance.',
                  style: Theme.of(
                    context,
                  ).textTheme.bodyLarge?.copyWith(color: Colors.black54),
                ),
                const SizedBox(height: 20),
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: offline.isOnline
                        ? const Color(0xFFE6F6EE)
                        : const Color(0xFFFFF0E2),
                    borderRadius: BorderRadius.circular(18),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        offline.isOnline
                            ? Icons.wifi_rounded
                            : Icons.wifi_off_rounded,
                        color: offline.isOnline
                            ? Colors.green.shade800
                            : Colors.deepOrange.shade800,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              offline.isOnline
                                  ? 'Network connection detected'
                                  : 'Offline mode',
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 3),
                            Text(
                              '${offline.queueCount} pending request(s) in queue',
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
                GridView.count(
                  crossAxisCount: 2,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 12,
                  childAspectRatio: 1.08,
                  children: [
                    StatCard(
                      title: 'Total users',
                      value: '${analytics.analyticsData.totalUsers}',
                      icon: Icons.groups_outlined,
                      tint: const Color(0xFF3456D1),
                    ),
                    StatCard(
                      title: 'Active users',
                      value: '${analytics.analyticsData.activeUsers}',
                      icon: Icons.bolt_rounded,
                      tint: const Color(0xFF12805C),
                    ),
                    StatCard(
                      title: 'New users',
                      value: '${analytics.analyticsData.newUsers}',
                      icon: Icons.person_add_alt_1_outlined,
                      tint: const Color(0xFFAA6700),
                    ),
                    StatCard(
                      title: 'Engagement',
                      value:
                          '${analytics.analyticsData.engagementRate.toStringAsFixed(1)}%',
                      icon: Icons.show_chart_rounded,
                      tint: const Color(0xFF7C3AED),
                    ),
                  ],
                ),
                if (analytics.isUsingSampleData) ...[
                  const SizedBox(height: 12),
                  const Text(
                    'Sample analytics are shown because the API is not available.',
                    style: TextStyle(color: Colors.black54, fontSize: 12),
                  ),
                ],
                const SizedBox(height: 24),
                Text(
                  'Offline actions',
                  style: Theme.of(
                    context,
                  ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 10),
                OutlinedButton.icon(
                  onPressed: () => _queueExampleUpdate(context),
                  icon: const Icon(Icons.save_outlined),
                  label: const Text('Save a queued training update'),
                ),
                FilledButton.icon(
                  onPressed: offline.isSyncing
                      ? null
                      : () => _syncQueue(context),
                  icon: offline.isSyncing
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.sync_rounded),
                  label: Text(
                    offline.isSyncing ? 'Syncing…' : 'Sync queued requests',
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  auth.isDemoMode
                      ? 'You are using a local demo session.'
                      : 'Pull down to refresh analytics from your API.',
                  style: const TextStyle(color: Colors.black54, fontSize: 12),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
