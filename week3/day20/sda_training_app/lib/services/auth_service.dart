import '../models/auth_response.dart';
import '../models/user.dart';
import 'api_service.dart';

class AuthService {
  AuthService(this._apiService);

  final ApiService _apiService;

  Future<AuthResponse> login(String email, String password) {
    return _apiService.login(email, password);
  }

  Future<void> logout() {
    return _apiService.logout();
  }

  Future<AppUser> getCurrentUser() {
    return _apiService.getCurrentUser();
  }
}
