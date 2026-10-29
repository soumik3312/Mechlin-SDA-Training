import 'package:flutter_test/flutter_test.dart';
import 'package:sda_training_app/models/analytics.dart';
import 'package:sda_training_app/models/auth_response.dart';
import 'package:sda_training_app/models/offline_action.dart';
import 'package:sda_training_app/models/user.dart';

void main() {
  group('AppUser', () {
    test('parses and serializes a user', () {
      final user = AppUser.fromJson({
        'id': 'u-123',
        'name': 'SDA Learner',
        'email': 'learner@example.com',
        'role': 'trainee',
      });

      expect(user.id, 'u-123');
      expect(user.name, 'SDA Learner');
      expect(user.email, 'learner@example.com');
      expect(user.role, 'trainee');
      expect(AppUser.fromJson(user.toJson()).id, 'u-123');
    });
  });

  group('AuthResponse', () {
    test('parses a nested API response', () {
      final result = AuthResponse.fromJson({
        'data': {
          'token': 'test-token',
          'user': {
            'id': 'u-1',
            'name': 'Learner',
            'email': 'learner@example.com',
          },
        },
      });

      expect(result.token, 'test-token');
      expect(result.user.id, 'u-1');
    });

    test('rejects a response without a token', () {
      expect(
        () => AuthResponse.fromJson({
          'data': {
            'user': {'id': 'u-1', 'email': 'learner@example.com'},
          },
        }),
        throwsFormatException,
      );
    });
  });

  group('AnalyticsData', () {
    test('parses analytics and activity data', () {
      final data = AnalyticsData.fromJson({
        'totalUsers': 100,
        'activeUsers': 70,
        'newUsers': 12,
        'engagementRate': 68.5,
        'dailyActivity': [
          {'label': 'Mon', 'value': 35},
        ],
      });

      expect(data.totalUsers, 100);
      expect(data.activeUsers, 70);
      expect(data.newUsers, 12);
      expect(data.engagementRate, 68.5);
      expect(data.dailyActivity.single.label, 'Mon');
      expect(data.dailyActivity.single.value, 35);
    });

    test('provides visible sample analytics', () {
      expect(AnalyticsData.sample().dailyActivity, isNotEmpty);
      expect(AnalyticsData.sample().totalUsers, greaterThan(0));
    });
  });

  group('OfflineAction', () {
    test('round-trips a queued action', () {
      final action = OfflineAction(
        id: 'a-1',
        endpoint: '/users/u-1',
        method: 'PUT',
        data: const {'name': 'Learner'},
        timestamp: DateTime.utc(2026, 10, 24),
      );

      final restored = OfflineAction.fromJson(action.toJson());

      expect(restored.id, action.id);
      expect(restored.endpoint, action.endpoint);
      expect(restored.method, 'PUT');
      expect(restored.data['name'], 'Learner');
      expect(restored.timestamp, action.timestamp);
      expect(restored.copyWith(attempts: 2).attempts, 2);
    });
  });
}
