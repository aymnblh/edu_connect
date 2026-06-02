import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../constants/app_constants.dart';
import '../utils/device_info.dart';

/// Singleton Dio client that injects Bearer token and Device Audit headers.
class ApiService {
  ApiService._();
  static final ApiService instance = ApiService._();
  static final ValueNotifier<int> unauthorizedEvents = ValueNotifier<int>(0);

  late final Dio _dio;
  final _storage = const FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
  );
  static const Duration _preRequestTimeout = Duration(seconds: 2);

  void initialize() {
    _validateRuntimeConfig();

    _dio = Dio(BaseOptions(
      baseUrl: AppConstants.apiBaseUrl,
      connectTimeout: const Duration(seconds: 8),
      receiveTimeout: const Duration(seconds: 10),
      sendTimeout: const Duration(seconds: 8),
      headers: {'Content-Type': 'application/json'},
    ));

    // Inject Headers before every request
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        // 1. Audit Headers
        final device = await _getDeviceAuditInfo();
        options.headers['X-Device-Id'] = device['id'];
        options.headers['X-Device-Platform'] = device['platform'];

        // 2. Auth Header — validate token before attaching to avoid FormatException
        // from corrupted values stored in flutter_secure_storage
        final token = await _readAccessToken();
        if (token != null && _isValidJwt(token)) {
          options.headers['Authorization'] = 'Bearer $token';
        } else if (token != null && !_isValidJwt(token)) {
          // Corrupted token — clear it so the user can log in fresh
          await _deleteAccessToken();
        }

        handler.next(options);
      },
      onError: (err, handler) {
        // Handle 403 password_setup_required
        if (err.response?.statusCode == 403) {
          final data = err.response?.data;
          final detail = data is Map ? data['detail'] : null;
          if (detail is Map && detail['code'] == 'password_setup_required') {
            // This will be caught by the UI/Repository to redirect
          }
        }

        if (err.response?.statusCode == 401 &&
            !_isAuthEndpoint(err.requestOptions.path)) {
          unauthorizedEvents.value++;
        }

        handler.next(err);
      },
    ));
  }

  static void _validateRuntimeConfig() {
    if (!kReleaseMode && AppConstants.appEnv != 'production') return;

    _validateEndpoint(
      name: 'API_BASE_URL',
      value: AppConstants.apiBaseUrl,
      allowedSchemes: const {'https'},
    );
    _validateEndpoint(
      name: 'WS_BASE_URL',
      value: AppConstants.wsBaseUrl,
      allowedSchemes: const {'wss'},
    );
    _validateEndpoint(
      name: 'NTFY_BASE_URL',
      value: AppConstants.ntfyBaseUrl,
      allowedSchemes: const {'https'},
    );
    _validateEndpoint(
      name: 'NTFY_WS_BASE_URL',
      value: AppConstants.ntfyWsBaseUrl,
      allowedSchemes: const {'wss'},
    );
  }

  static void _validateEndpoint({
    required String name,
    required String value,
    required Set<String> allowedSchemes,
  }) {
    final uri = Uri.tryParse(value);
    if (uri == null ||
        uri.host.isEmpty ||
        !allowedSchemes.contains(uri.scheme)) {
      throw StateError(
        '$name must be a valid ${allowedSchemes.join('/')} URL for production builds.',
      );
    }

    final host = uri.host.toLowerCase();
    final forbiddenHosts = <String>{
      'localhost',
      '127.0.0.1',
      '10.0.2.2',
      '0.0.0.0',
    };
    final forbiddenSuffixes = <String>{
      '.local',
      '.localhost',
      '.example',
      '.test',
      '.invalid',
      '.trycloudflare.com',
    };

    final isForbiddenHost = forbiddenHosts.contains(host) ||
        forbiddenSuffixes.any((suffix) => host.endsWith(suffix));

    if (isForbiddenHost) {
      throw StateError(
        '$name points to a local, placeholder, or temporary tunnel host. '
        'Use a stable production domain.',
      );
    }
  }

  /// Returns true if [token] looks like a valid JWT:
  /// - starts with "ey" (base64-encoded JSON header)
  /// - contains only safe ASCII printable characters (no control chars)
  static bool _isValidJwt(String token) {
    if (!token.startsWith('ey')) return false;
    // HTTP header field values must contain only printable US-ASCII chars (0x21-0x7E + spaces)
    return token.codeUnits.every((c) => c >= 0x20 && c <= 0x7E);
  }

  Dio get dio => _dio;

  Future<Map<String, String>> _getDeviceAuditInfo() async {
    try {
      return await DeviceInfoUtil.getDeviceAuditInfo()
          .timeout(_preRequestTimeout);
    } catch (_) {
      return {'id': 'unknown', 'platform': 'unknown'};
    }
  }

  Future<String?> _readAccessToken() async {
    try {
      return await _storage
          .read(key: 'access_token')
          .timeout(_preRequestTimeout);
    } catch (_) {
      return null;
    }
  }

  Future<void> _deleteAccessToken() async {
    try {
      await _storage.delete(key: 'access_token').timeout(_preRequestTimeout);
    } catch (_) {
      // Best effort cleanup. The request should not be blocked by storage.
    }
  }

  static bool _isAuthEndpoint(String path) {
    return path.startsWith('/auth/login') ||
        path.startsWith('/auth/refresh') ||
        path.startsWith('/auth/logout') ||
        path.startsWith('/auth/set-password') ||
        path.startsWith('/auth/verify-code') ||
        path.startsWith('/auth/register-parent-code') ||
        path.startsWith('/auth/complete-teacher-code');
  }

  // ── Convenience wrappers ──────────────────────────────────────────────────

  Future<dynamic> get(String path, {Map<String, dynamic>? query}) async {
    final res = await _dio.get(path, queryParameters: query);
    return res.data;
  }

  Future<dynamic> post(String path, {dynamic data}) async {
    final res = await _dio.post(path, data: data);
    return res.data;
  }

  Future<dynamic> put(String path, {dynamic data}) async {
    final res = await _dio.put(path, data: data);
    return res.data;
  }

  Future<dynamic> patch(String path, {dynamic data}) async {
    final res = await _dio.patch(path, data: data);
    return res.data;
  }

  Future<dynamic> delete(String path) async {
    final res = await _dio.delete(path);
    return res.data;
  }
}

final apiServiceProvider = Provider<ApiService>((ref) => ApiService.instance);
