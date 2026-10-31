import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../models/user.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';

class AuthProvider extends ChangeNotifier {
  AuthProvider(ApiService apiService) : _authService = AuthService(apiService);

  static const _tokenKey = 'auth_token';
  static const _userKey = 'auth_user';

  final AuthService _authService;

  AppUser? _user;
  String? _token;
  bool _isLoading = false;
  String? _error;

  AppUser? get user => _user;
  String? get token => _token;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get isAuthenticated => _user != null && _token != null;
  bool get isDemoMode => _token == ApiService.demoToken;

  Future<bool> login(String email, String password) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await _authService.login(email, password);
      await _saveSession(response.user, response.token);
      return true;
    } catch (error) {
      _error = _cleanError(error);
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> loginDemo() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      const demoUser = AppUser(
        id: 'demo-user',
        name: 'SDA Learner',
        email: 'demo@example.com',
        role: 'trainee',
      );

      await _saveSession(demoUser, ApiService.demoToken);
    } catch (error) {
      _error = _cleanError(error);
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> checkAuthStatus() async {
    _isLoading = true;
    notifyListeners();

    try {
      final preferences = await SharedPreferences.getInstance();
      final savedToken = preferences.getString(_tokenKey);

      if (savedToken == null || savedToken.isEmpty) {
        _user = null;
        _token = null;
        return;
      }

      final cachedUser = _readCachedUser(preferences);

      if (savedToken == ApiService.demoToken) {
        if (cachedUser != null) {
          _user = cachedUser;
          _token = savedToken;
        } else {
          await _removeSavedSession(preferences);
        }
        return;
      }

      try {
        final currentUser = await _authService.getCurrentUser();
        _user = currentUser;
        _token = savedToken;
        await preferences.setString(_userKey, jsonEncode(currentUser.toJson()));
      } catch (_) {
        // Allow a previously saved user to view the app while offline.
        if (cachedUser != null) {
          _user = cachedUser;
          _token = savedToken;
        } else {
          await _removeSavedSession(preferences);
        }
      }
    } catch (error) {
      _error = _cleanError(error);
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> logout() async {
    _isLoading = true;
    notifyListeners();

    try {
      if (_token != null && !isDemoMode) {
        await _authService.logout();
      }

      final preferences = await SharedPreferences.getInstance();
      await _removeSavedSession(preferences);
      _user = null;
      _token = null;
      _error = null;
    } catch (error) {
      _error = _cleanError(error);
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }

  Future<void> _saveSession(AppUser user, String token) async {
    final preferences = await SharedPreferences.getInstance();
    await preferences.setString(_tokenKey, token);
    await preferences.setString(_userKey, jsonEncode(user.toJson()));

    _user = user;
    _token = token;
  }

  AppUser? _readCachedUser(SharedPreferences preferences) {
    final rawUser = preferences.getString(_userKey);

    if (rawUser == null || rawUser.isEmpty) {
      return null;
    }

    try {
      final decoded = jsonDecode(rawUser);
      if (decoded is Map) {
        return AppUser.fromJson(Map<String, dynamic>.from(decoded));
      }
    } catch (_) {
      return null;
    }

    return null;
  }

  Future<void> _removeSavedSession(SharedPreferences preferences) async {
    await preferences.remove(_tokenKey);
    await preferences.remove(_userKey);
  }

  String _cleanError(Object error) {
    return error.toString().replaceFirst('Exception: ', '');
  }
}
