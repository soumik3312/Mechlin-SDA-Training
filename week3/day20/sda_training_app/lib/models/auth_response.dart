import 'user.dart';

class AuthResponse {
  final String token;
  final AppUser user;

  const AuthResponse({
    required this.token,
    required this.user,
  });

  factory AuthResponse.fromJson(Map<String, dynamic> json) {
    final Map<String, dynamic> payload =
        json['data'] is Map
            ? Map<String, dynamic>.from(json['data'] as Map)
            : json;

    final String token = payload['token']?.toString() ?? '';

    if (token.isEmpty) {
      throw const FormatException('Authentication token is missing');
    }

    final userJson = payload['user'];

    if (userJson is! Map) {
      throw const FormatException('User data is missing');
    }

    return AuthResponse(
      token: token,
      user: AppUser.fromJson(
        Map<String, dynamic>.from(userJson),
      ),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'token': token,
      'user': user.toJson(),
    };
  }
}
