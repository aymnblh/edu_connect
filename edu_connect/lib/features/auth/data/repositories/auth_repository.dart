import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../../../../core/services/api_service.dart';
import '../../../../core/services/ntfy_service.dart';
import '../models/user_model.dart';

class AuthRepository {
  final ApiService _api = ApiService.instance;
  final _storage = const FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
  );

  static const String _accessTokenKey = 'access_token';
  static const String _refreshTokenKey = 'refresh_token';
  static const String _userKey = 'user_profile';

  /// True when the last [refreshToken] failure was a network/connection error
  /// (as opposed to a server-side 401 rejection).
  bool lastFailWasNetwork = false;
  bool _signedOut = false;

  AuthRepository();

  /// Sign in with email + password using local backend.
  Future<UserModel> login({
    required String email,
    required String password,
  }) async {
    _signedOut = false;
    final response = await _api.post('/auth/login', data: {
      'email': email,
      'password': password,
    });

    final data = response as Map<String, dynamic>;
    await _saveTokens(data['access_token'], data['refresh_token']);

    // Fetch profile
    return _fetchAndSaveProfile();
  }

  Future<UserModel> register({
    required String email,
    required String password,
    required String name,
    required String role,
  }) async {
    _signedOut = false;
    final response = await _api.post('/auth/register', data: {
      'email': email,
      'password': password,
      'full_name': name,
      'role': role,
    });
    final data = response as Map<String, dynamic>;
    await _saveTokens(data['access_token'], data['refresh_token']);
    return _fetchAndSaveProfile();
  }

  /// Self-serve onboarding for a new school.
  Future<bool> registerSchool({
    required String schoolName,
    required String adminName,
    required String adminEmail,
    required String adminPassword,
    required bool termsAccepted,
  }) async {
    await _api.post('/onboarding/register-school', data: {
      'school_name': schoolName,
      'admin_full_name': adminName, // backend schema field is admin_full_name
      'admin_email': adminEmail,
      'admin_password': adminPassword,
      'terms_accepted': termsAccepted,
    });
    return true;
  }

  /// Initial password setup for migrated/invited users.
  Future<void> setPassword({
    required String email,
    required String password,
    required bool termsAccepted,
  }) async {
    await _api.post('/auth/set-password', data: {
      'email': email,
      'password': password,
      'terms_accepted': termsAccepted,
    });
  }

  // --- Auth by Code / QR ---

  Future<Map<String, dynamic>> verifyCode({
    String? code,
    String? studentId,
    String? pin,
  }) async {
    final response = await _api.post('/auth/verify-code', data: {
      if (code != null) 'code': code,
      if (studentId != null) 'student_id': studentId,
      if (pin != null) 'pin': pin,
    });
    return response as Map<String, dynamic>;
  }

  Future<UserModel> registerParentWithCode({
    required String fullName,
    required String email,
    required String password,
    required bool termsAccepted,
    String? code,
    String? studentId,
    String? pin,
  }) async {
    _signedOut = false;
    final response = await _api.post('/auth/register-parent-code', data: {
      'full_name': fullName,
      'email': email,
      'password': password,
      'terms_accepted': termsAccepted,
      if (code != null) 'code': code,
      if (studentId != null) 'student_id': studentId,
      if (pin != null) 'pin': pin,
    });
    final data = response as Map<String, dynamic>;
    await _saveTokens(data['access_token'], data['refresh_token']);
    return _fetchAndSaveProfile();
  }

  Future<UserModel> completeTeacherInvite({
    required String inviteCode,
    required String password,
    required bool termsAccepted,
  }) async {
    _signedOut = false;
    final response = await _api.post('/auth/complete-teacher-code', data: {
      'invite_code': inviteCode,
      'password': password,
      'terms_accepted': termsAccepted,
    });
    final data = response as Map<String, dynamic>;
    await _saveTokens(data['access_token'], data['refresh_token']);
    return _fetchAndSaveProfile();
  }

  /// Exchange refresh token for a new access token.
  Future<bool> refreshToken() async {
    lastFailWasNetwork = false;
    final refresh = await _storage.read(key: _refreshTokenKey);
    if (refresh == null) return false;

    try {
      final response = await _api.post('/auth/refresh', data: {
        'refresh_token': refresh,
      });

      final data = response as Map<String, dynamic>;
      if (_signedOut) return false;
      await _saveTokens(data['access_token'], data['refresh_token']);
      return true;
    } on DioException catch (e) {
      if (e.type == DioExceptionType.connectionTimeout ||
          e.type == DioExceptionType.receiveTimeout ||
          e.type == DioExceptionType.sendTimeout ||
          e.type == DioExceptionType.connectionError ||
          e.response == null) {
        // Network unreachable — keep the cached session alive
        lastFailWasNetwork = true;
        return false;
      }
      // Server explicitly rejected the token (401/403) — clear local tokens
      await _clearTokensLocally();
      return false;
    } catch (e) {
      // Unknown error — treat as network fault, keep session
      lastFailWasNetwork = true;
      return false;
    }
  }

  Future<UserModel> _fetchAndSaveProfile() async {
    final data = await _api.get('/users/me'); // Get current user by token
    final user = UserModel.fromJson(data as Map<String, dynamic>);
    await _storage.write(key: _userKey, value: jsonEncode(data));
    await NtfyService.instance.initialize();
    return user;
  }

  Future<void> _saveTokens(String access, String refresh) async {
    await _storage.write(key: _accessTokenKey, value: access);
    await _storage.write(key: _refreshTokenKey, value: refresh);
  }

  Future<String?> getAccessToken() => _storage.read(key: _accessTokenKey);

  /// Sign out — always clears local storage; attempts backend logout in background.
  Future<void> signOut() async {
    _signedOut = true;
    final refresh = await _storage.read(key: _refreshTokenKey);
    NtfyService.instance.dispose();
    // Clear local storage immediately so the app doesn't block
    await _clearTokensLocally();
    if (refresh != null) {
      // Fire-and-forget: don't await so the UI is never blocked
      _api.post('/auth/logout',
          data: {'refresh_token': refresh}).catchError((_) {});
    }
  }

  /// Clears all locally stored auth tokens and user cache without touching the network.
  Future<void> _clearTokensLocally() async {
    await _storage.delete(key: _accessTokenKey);
    await _storage.delete(key: _refreshTokenKey);
    await _storage.delete(key: _userKey);
    await _storage.deleteAll();

    // Older builds used default storage options in a few services. Clear those
    // too so a stale cached profile cannot resurrect a session after logout.
    const legacyStorage = FlutterSecureStorage();
    await legacyStorage.delete(key: _accessTokenKey);
    await legacyStorage.delete(key: _refreshTokenKey);
    await legacyStorage.delete(key: _userKey);
    await legacyStorage.deleteAll();
  }

  Future<UserModel?> getCachedUser() async {
    final userStr = await _storage.read(key: _userKey);
    if (userStr == null) return null;
    return UserModel.fromJson(jsonDecode(userStr));
  }
}
