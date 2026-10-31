import 'package:flutter/foundation.dart';

import '../models/analytics.dart';
import '../services/analytics_service.dart';
import '../services/api_service.dart';

class AnalyticsProvider extends ChangeNotifier {
  AnalyticsProvider(ApiService apiService)
    : _analyticsService = AnalyticsService(apiService);

  final AnalyticsService _analyticsService;

  AnalyticsData _analyticsData = AnalyticsData.sample();
  bool _isLoading = false;
  bool _isUsingSampleData = true;
  String? _error;
  String _selectedTimeRange = '30d';

  AnalyticsData get analyticsData => _analyticsData;
  bool get isLoading => _isLoading;
  bool get isUsingSampleData => _isUsingSampleData;
  String? get error => _error;
  String get selectedTimeRange => _selectedTimeRange;

  Future<void> fetchAnalytics({String? timeRange}) async {
    _selectedTimeRange = timeRange ?? _selectedTimeRange;
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _analyticsData = await _analyticsService.getAnalytics(_selectedTimeRange);
      _isUsingSampleData = false;
    } catch (_) {
      // Never present the local sample values as live server data.
      _analyticsData = AnalyticsData.sample();
      _isUsingSampleData = true;
      _error = 'API unavailable. Displaying sample analytics.';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  void setTimeRange(String timeRange) {
    if (_selectedTimeRange == timeRange) return;

    _selectedTimeRange = timeRange;
    notifyListeners();
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }
}
