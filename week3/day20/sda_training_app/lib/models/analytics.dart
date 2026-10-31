class DailyActivity {
  final String label;
  final int value;

  const DailyActivity({
    required this.label,
    required this.value,
  });

  factory DailyActivity.fromJson(Map<String, dynamic> json) {
    return DailyActivity(
      label: json['label']?.toString() ?? '',
      value: (json['value'] as num?)?.toInt() ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'label': label,
      'value': value,
    };
  }
}

class AnalyticsData {
  final int totalUsers;
  final int activeUsers;
  final int newUsers;
  final double engagementRate;
  final List<DailyActivity> dailyActivity;

  const AnalyticsData({
    required this.totalUsers,
    required this.activeUsers,
    required this.newUsers,
    required this.engagementRate,
    required this.dailyActivity,
  });

  factory AnalyticsData.fromJson(Map<String, dynamic> json) {
    final activity = json['dailyActivity'];

    return AnalyticsData(
      totalUsers: (json['totalUsers'] as num?)?.toInt() ?? 0,
      activeUsers: (json['activeUsers'] as num?)?.toInt() ?? 0,
      newUsers: (json['newUsers'] as num?)?.toInt() ?? 0,
      engagementRate:
          (json['engagementRate'] as num?)?.toDouble() ?? 0.0,
      dailyActivity: activity is List
          ? activity
              .whereType<Map>()
              .map(
                (item) => DailyActivity.fromJson(
                  Map<String, dynamic>.from(item),
                ),
              )
              .toList()
          : [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'totalUsers': totalUsers,
      'activeUsers': activeUsers,
      'newUsers': newUsers,
      'engagementRate': engagementRate,
      'dailyActivity':
          dailyActivity.map((item) => item.toJson()).toList(),
    };
  }

  factory AnalyticsData.sample() {
    return const AnalyticsData(
      totalUsers: 1250,
      activeUsers: 875,
      newUsers: 120,
      engagementRate: 68.5,
      dailyActivity: [
        DailyActivity(label: 'Mon', value: 35),
        DailyActivity(label: 'Tue', value: 42),
        DailyActivity(label: 'Wed', value: 38),
        DailyActivity(label: 'Thu', value: 55),
        DailyActivity(label: 'Fri', value: 48),
        DailyActivity(label: 'Sat', value: 62),
        DailyActivity(label: 'Sun', value: 50),
      ],
    );
  }
}
