import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/analytics_provider.dart';
import '../widgets/stat_card.dart';

class AnalyticsScreen extends StatelessWidget {
  const AnalyticsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<AnalyticsProvider>(
      builder: (context, provider, _) {
        final data = provider.analyticsData;
        final maxValue = data.dailyActivity.fold<int>(
          1,
          (highest, item) => item.value > highest ? item.value : highest,
        );

        return Scaffold(
          appBar: AppBar(
            title: const Text(
              'Analytics',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
            actions: [
              IconButton(
                tooltip: 'Refresh analytics',
                onPressed: provider.isLoading
                    ? null
                    : () => provider.fetchAnalytics(),
                icon: const Icon(Icons.refresh_rounded),
              ),
            ],
          ),
          body: ListView(
            padding: const EdgeInsets.all(20),
            children: [
              Text(
                'Performance overview',
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Review users, engagement and activity trends.',
                style: TextStyle(color: Colors.black54),
              ),
              const SizedBox(height: 20),
              DropdownButtonFormField<String>(
                initialValue: provider.selectedTimeRange,
                decoration: const InputDecoration(
                  labelText: 'Time range',
                  prefixIcon: Icon(Icons.date_range_rounded),
                ),
                items: const [
                  DropdownMenuItem(value: '7d', child: Text('Last 7 days')),
                  DropdownMenuItem(value: '30d', child: Text('Last 30 days')),
                  DropdownMenuItem(value: '90d', child: Text('Last 90 days')),
                ],
                onChanged: provider.isLoading
                    ? null
                    : (value) {
                        if (value != null) {
                          provider.fetchAnalytics(timeRange: value);
                        }
                      },
              ),
              if (provider.isLoading) ...[
                const SizedBox(height: 16),
                const LinearProgressIndicator(),
              ],
              if (provider.isUsingSampleData) ...[
                const SizedBox(height: 16),
                const Card(
                  elevation: 0,
                  color: Color(0xFFFFF2D9),
                  child: Padding(
                    padding: EdgeInsets.all(14),
                    child: Row(
                      children: [
                        Icon(Icons.info_outline, color: Color(0xFF885500)),
                        SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            'Sample data — connect the backend to load live analytics.',
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
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
                    value: '${data.totalUsers}',
                    icon: Icons.groups_outlined,
                    tint: const Color(0xFF3456D1),
                  ),
                  StatCard(
                    title: 'Active users',
                    value: '${data.activeUsers}',
                    icon: Icons.bolt_rounded,
                    tint: const Color(0xFF12805C),
                  ),
                  StatCard(
                    title: 'New users',
                    value: '${data.newUsers}',
                    icon: Icons.person_add_alt_1_outlined,
                    tint: const Color(0xFFAA6700),
                  ),
                  StatCard(
                    title: 'Engagement',
                    value: '${data.engagementRate.toStringAsFixed(1)}%',
                    icon: Icons.show_chart_rounded,
                    tint: const Color(0xFF7C3AED),
                  ),
                ],
              ),
              const SizedBox(height: 28),
              Text(
                'Daily activity',
                style: Theme.of(
                  context,
                ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 12),
              Card(
                elevation: 0,
                color: Colors.white,
                child: Padding(
                  padding: const EdgeInsets.all(18),
                  child: data.dailyActivity.isEmpty
                      ? const Text('No activity data is available.')
                      : Column(
                          children: data.dailyActivity.map((activity) {
                            return Padding(
                              padding: const EdgeInsets.only(bottom: 16),
                              child: Row(
                                children: [
                                  SizedBox(
                                    width: 42,
                                    child: Text(
                                      activity.label,
                                      style: const TextStyle(
                                        color: Colors.black54,
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: LinearProgressIndicator(
                                      minHeight: 12,
                                      borderRadius: BorderRadius.circular(8),
                                      value: (activity.value / maxValue)
                                          .clamp(0.0, 1.0)
                                          .toDouble(),
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  SizedBox(
                                    width: 32,
                                    child: Text(
                                      '${activity.value}',
                                      textAlign: TextAlign.end,
                                      style: const TextStyle(
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            );
                          }).toList(),
                        ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
