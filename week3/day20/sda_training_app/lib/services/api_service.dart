import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:logger/logger.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../models/analytics.dart';
import '../models/auth_response.dart';
import '../models/user.dart';

class ApiService {
  ApiService() {
    _dio = Dio(
      BaseOptions(
        baseUrl: baseUrl,
        connectTimeout: const Duration(seconds: 12),
        receiveTimeout: const Duration(seconds: 12),
        sendTimeout: const Duration(seconds: 12),
        headers: const {'Accept': 'application/json'},
      ),
    );

    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          try {
            final preferences = await SharedPreferences.getInstance();
            final token = preferences.getString(_tokenKey);

            if (token != null && token != demoToken) {
              options.headers['Authorization'] = 'Bearer $token';
            }
          } catch (error) {
            _logger.w('Could not load the saved API token: $error');
          }

          handler.next(options);
        },
        onError: (error, handler) {
          if (error.response?.statusCode == 401) {
            _clearInvalidToken();
          }
          handler.next(error);
        },
      ),
    );
  }

  static const demoToken = 'demo-local-token';
  static const _tokenKey = 'auth_token';

  static const _configuredBaseUrl = String.fromEnvironment('API_BASE_URL');

  static String get baseUrl {
    if (_configuredBaseUrl.isNotEmpty) {
      return _configuredBaseUrl;
    }

    if (kIsWeb ||
        defaultTargetPlatform == TargetPlatform.iOS ||
        defaultTargetPlatform == TargetPlatform.macOS) {
      return 'http://localhost:3000/api/v1';
    }

    return 'http://10.0.2.2:3000/api/v1';
  }

  static final Logger _logger = Logger();

  late final Dio _dio;

  Future<void> _clearInvalidToken() async {
    try {
      final preferences = await SharedPreferences.getInstance();
      if (preferences.getString(_tokenKey) != demoToken) {
        await preferences.remove(_tokenKey);
      }
    } catch (error) {
      _logger.w('Could not clear invalid token: $error');
    }
  }

  Future<AuthResponse> login(String email, String password) async {
    try {
      final response = await _dio.post<dynamic>(
        '/auth/login',
        data: {'email': email, 'password': password},
      );

      if (response.data is! Map) {
        throw const FormatException('Invalid login response.');
      }

      return AuthResponse.fromJson(
        Map<String, dynamic>.from(response.data as Map),
      );
    } on DioException catch (error) {
      throw Exception(_errorMessage(error, 'Login failed'));
    }
  }

  Future<void> logout() async {
    try {
      await _dio.post<dynamic>('/auth/logout');
    } catch (error) {
      _logger.i('Remote logout unavailable: $error');
    }
  }

  Future<AppUser> getCurrentUser() async {
    try {
      final response = await _dio.get<dynamic>('/auth/me');
      final payload = _extractPayload(response.data);
      final rawUser = payload['user'];

      return AppUser.fromJson(
        rawUser is Map ? Map<String, dynamic>.from(rawUser) : payload,
      );
    } on DioException catch (error) {
      throw Exception(_errorMessage(error, 'Could not load the current user'));
    }
  }

  Future<List<AppUser>> getUsers({Map<String, dynamic>? filters}) async {
    try {
      final response = await _dio.get<dynamic>(
        '/users',
        queryParameters: filters,
      );
      final payload = _extractPayload(response.data);
      final rawUsers = payload['users'] ?? payload['items'];

      if (rawUsers is! List) {
        return const [];
      }

      return rawUsers
          .whereType<Map>()
          .map((item) => AppUser.fromJson(Map<String, dynamic>.from(item)))
          .toList();
    } on DioException catch (error) {
      throw Exception(_errorMessage(error, 'Could not load users'));
    }
  }

  Future<AppUser> getUser(String id) async {
    try {
      final response = await _dio.get<dynamic>('/users/$id');
      final payload = _extractPayload(response.data);
      final rawUser = payload['user'];

      return AppUser.fromJson(
        rawUser is Map ? Map<String, dynamic>.from(rawUser) : payload,
      );
    } on DioException catch (error) {
      throw Exception(_errorMessage(error, 'Could not load user'));
    }
  }

  Future<AppUser> updateUser(String id, Map<String, dynamic> data) async {
    try {
      final response = await _dio.put<dynamic>('/users/$id', data: data);
      final payload = _extractPayload(response.data);
      final rawUser = payload['user'];

      return AppUser.fromJson(
        rawUser is Map ? Map<String, dynamic>.from(rawUser) : payload,
      );
    } on DioException catch (error) {
      throw Exception(_errorMessage(error, 'Could not update user'));
    }
  }

  Future<AnalyticsData> getAnalytics(String timeRange) async {
    try {
      final response = await _dio.get<dynamic>(
        '/analytics',
        queryParameters: {'timeRange': timeRange},
      );
      final payload = _extractPayload(response.data);
      final rawAnalytics = payload['analytics'];

      return AnalyticsData.fromJson(
        rawAnalytics is Map ? Map<String, dynamic>.from(rawAnalytics) : payload,
      );
    } on DioException catch (error) {
      throw Exception(_errorMessage(error, 'Could not load analytics'));
    }
  }

  Future<void> sendQueuedRequest({
    required String endpoint,
    required String method,
    required Map<String, dynamic> data,
  }) async {
    final normalizedMethod = method.toUpperCase();
    const allowedMethods = {'POST', 'PUT', 'PATCH', 'DELETE'};

    if (!endpoint.startsWith('/') || endpoint.startsWith('//')) {
      throw ArgumentError('Offline requests must use a relative API path.');
    }

    if (!allowedMethods.contains(normalizedMethod)) {
      throw ArgumentError('Unsupported offline request method.');
    }

    await _dio.request<dynamic>(
      endpoint,
      data: data,
      options: Options(method: normalizedMethod),
    );
  }

  Map<String, dynamic> _extractPayload(dynamic response) {
    if (response is! Map) {
      throw const FormatException('The API returned an invalid response.');
    }

    final root = Map<String, dynamic>.from(response);
    final data = root['data'];

    if (data is Map) {
      return Map<String, dynamic>.from(data);
    }

    return root;
  }

  String _errorMessage(DioException error, String fallback) {
    final responseData = error.response?.data;

    if (responseData is Map && responseData['message'] != null) {
      return responseData['message'].toString();
    }

    return error.message ?? fallback;
  }
}
