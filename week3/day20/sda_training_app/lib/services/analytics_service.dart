import '../models/analytics.dart';
import 'api_service.dart';

class AnalyticsService {
  AnalyticsService(this._apiService);

  final ApiService _apiService;

  Future<AnalyticsData> getAnalytics(String timeRange) {
    return _apiService.getAnalytics(timeRange);
  }
}
