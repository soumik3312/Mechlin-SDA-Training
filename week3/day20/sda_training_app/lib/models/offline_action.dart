class OfflineAction {
  final String id;
  final String endpoint;
  final String method;
  final Map<String, dynamic> data;
  final DateTime timestamp;
  final int attempts;

  const OfflineAction({
    required this.id,
    required this.endpoint,
    required this.method,
    required this.data,
    required this.timestamp,
    this.attempts = 0,
  });

  factory OfflineAction.fromJson(Map<String, dynamic> json) {
    final timestampValue = json['timestamp']?.toString();
    final timestamp = DateTime.tryParse(timestampValue ?? '');

    if (timestamp == null) {
      throw const FormatException('Invalid offline action timestamp');
    }

    final rawData = json['data'];

    return OfflineAction(
      id: json['id']?.toString() ?? '',
      endpoint: json['endpoint']?.toString() ?? '',
      method: json['method']?.toString() ?? 'POST',
      data: rawData is Map
          ? Map<String, dynamic>.from(rawData)
          : <String, dynamic>{},
      timestamp: timestamp,
      attempts: (json['attempts'] as num?)?.toInt() ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'endpoint': endpoint,
      'method': method,
      'data': data,
      'timestamp': timestamp.toIso8601String(),
      'attempts': attempts,
    };
  }

  OfflineAction copyWith({
    String? id,
    String? endpoint,
    String? method,
    Map<String, dynamic>? data,
    DateTime? timestamp,
    int? attempts,
  }) {
    return OfflineAction(
      id: id ?? this.id,
      endpoint: endpoint ?? this.endpoint,
      method: method ?? this.method,
      data: data ?? this.data,
      timestamp: timestamp ?? this.timestamp,
      attempts: attempts ?? this.attempts,
    );
  }
}
