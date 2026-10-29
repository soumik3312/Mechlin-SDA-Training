import 'notification_service.dart';
import 'dart:async';
import 'dart:convert';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../models/offline_action.dart';
import 'api_service.dart';

class OfflineService extends ChangeNotifier {
  OfflineService(ApiService apiService) : _apiService = apiService {
    unawaited(_initialize());
  }

  static const _queueKey = 'offline_queue';

  final ApiService _apiService;
  final Connectivity _connectivity = Connectivity();

  StreamSubscription<List<ConnectivityResult>>? _subscription;
  List<OfflineAction> _offlineQueue = [];

  bool _isOnline = false;
  bool _isSyncing = false;
  DateTime? _lastSyncAt;

  bool get isOnline => _isOnline;
  bool get isSyncing => _isSyncing;
  int get queueCount => _offlineQueue.length;
  DateTime? get lastSyncAt => _lastSyncAt;
  List<OfflineAction> get queuedActions => List.unmodifiable(_offlineQueue);

  Future<void> _initialize() async {
    await _loadOfflineQueue();

    _subscription = _connectivity.onConnectivityChanged.listen(
      (results) {
        unawaited(_handleConnectivity(_hasConnection(results)));
      },
      onError: (_) {
        unawaited(_handleConnectivity(false));
      },
    );

    try {
      final results = await _connectivity.checkConnectivity();
      await _handleConnectivity(_hasConnection(results));
    } catch (_) {
      await _handleConnectivity(false);
    }
  }

  bool _hasConnection(List<ConnectivityResult> results) {
    return results.any((result) => result != ConnectivityResult.none);
  }

  Future<void> _handleConnectivity(bool online) async {
    final changed = _isOnline != online;
    _isOnline = online;

    if (changed) {
      notifyListeners();
    }

    if (_isOnline && _offlineQueue.isNotEmpty && !_isSyncing) {
      await syncPendingRequests();
    }
  }

  Future<void> _loadOfflineQueue() async {
    try {
      final preferences = await SharedPreferences.getInstance();
      final rawQueue = preferences.getString(_queueKey);

      if (rawQueue == null || rawQueue.isEmpty) {
        _offlineQueue = [];
        return;
      }

      final decoded = jsonDecode(rawQueue);
      if (decoded is List) {
        _offlineQueue = decoded
            .whereType<Map>()
            .map(
              (item) => OfflineAction.fromJson(Map<String, dynamic>.from(item)),
            )
            .where(
              (action) =>
                  action.id.isNotEmpty &&
                  action.endpoint.startsWith('/') &&
                  !action.endpoint.startsWith('//'),
            )
            .toList();
      }
    } catch (_) {
      _offlineQueue = [];
    } finally {
      notifyListeners();
    }
  }

  Future<void> _saveOfflineQueue() async {
    final preferences = await SharedPreferences.getInstance();
    final json = jsonEncode(
      _offlineQueue.map((action) => action.toJson()).toList(),
    );
    await preferences.setString(_queueKey, json);
  }

  Future<void> queueRequest({
    required String endpoint,
    required String method,
    required Map<String, dynamic> data,
  }) async {
    if (!endpoint.startsWith('/') || endpoint.startsWith('//')) {
      throw ArgumentError('Use a relative API endpoint.');
    }

    const allowedMethods = {'POST', 'PUT', 'PATCH', 'DELETE'};
    final normalizedMethod = method.toUpperCase();

    if (!allowedMethods.contains(normalizedMethod)) {
      throw ArgumentError('Unsupported offline request method.');
    }

    final action = OfflineAction(
      id: '${DateTime.now().microsecondsSinceEpoch}',
      endpoint: endpoint,
      method: normalizedMethod,
      data: Map<String, dynamic>.from(data),
      timestamp: DateTime.now(),
    );

    _offlineQueue.add(action);
    await _saveOfflineQueue();
    notifyListeners();
  }

  Future<int> syncPendingRequests() async {
    if (!_isOnline || _isSyncing || _offlineQueue.isEmpty) {
      return 0;
    }

    _isSyncing = true;
    notifyListeners();

    var syncedCount = 0;
    final batch = List<OfflineAction>.from(_offlineQueue);

    try {
      for (final action in batch) {
        if (!_isOnline) break;

        try {
          await _apiService.sendQueuedRequest(
            endpoint: action.endpoint,
            method: action.method,
            data: action.data,
          );

          _offlineQueue.removeWhere((queued) => queued.id == action.id);
          syncedCount++;
        } catch (_) {
          // Preserve failed actions and record the retry attempt.
          _offlineQueue = _offlineQueue.map((queued) {
            return queued.id == action.id
                ? queued.copyWith(attempts: queued.attempts + 1)
                : queued;
          }).toList();
        }

        await _saveOfflineQueue();
        notifyListeners();
      }
      if (syncedCount > 0) {
        _lastSyncAt = DateTime.now();

        try {
          await NotificationService.showSyncNotification(syncedCount);
        } catch (_) {
          // Sync has succeeded even if a notification cannot be displayed.
        }
      }

      return syncedCount;
    } finally {
      _isSyncing = false;
      notifyListeners();
    }
  }

  @override
  void dispose() {
    unawaited(_subscription?.cancel());
    super.dispose();
  }
}
