import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

enum BiometryType {
  faceId,
  touchId,
  biometric,
  deviceCredential,
  none,
}

class BiometricAvailability {
  final bool available;
  final bool biometricAvailable;
  final BiometryType biometryType;

  const BiometricAvailability({
    required this.available,
    required this.biometricAvailable,
    required this.biometryType,
  });

  static const unavailable = BiometricAvailability(
    available: false,
    biometricAvailable: false,
    biometryType: BiometryType.none,
  );
}

class BiometricAuthResult {
  final bool authenticated;
  final String? message;
  final String? reason;

  const BiometricAuthResult({
    required this.authenticated,
    this.message,
    this.reason,
  });
}

/// Native bridge to Android BiometricPrompt / Keyguard and iOS LocalAuthentication.
class BiometricAuthService {
  static const MethodChannel _channel =
      MethodChannel('dz.waseledu.app/biometric_auth');

  Future<BiometricAvailability> checkAvailability() async {
    if (kIsWeb ||
        (defaultTargetPlatform != TargetPlatform.android &&
            defaultTargetPlatform != TargetPlatform.iOS)) {
      return BiometricAvailability.unavailable;
    }

    try {
      final raw =
          await _channel.invokeMapMethod<String, dynamic>('checkAvailability');
      if (raw == null) return BiometricAvailability.unavailable;

      return BiometricAvailability(
        available: raw['available'] == true,
        biometricAvailable: raw['biometricAvailable'] == true,
        biometryType: _parseBiometryType(raw['biometryType'] as String?),
      );
    } on MissingPluginException {
      return BiometricAvailability.unavailable;
    } on PlatformException {
      return BiometricAvailability.unavailable;
    }
  }

  Future<BiometricAuthResult> authenticate({
    required String title,
    required String subtitle,
  }) async {
    if (kIsWeb ||
        (defaultTargetPlatform != TargetPlatform.android &&
            defaultTargetPlatform != TargetPlatform.iOS)) {
      return const BiometricAuthResult(
        authenticated: false,
        reason: 'unsupported',
      );
    }

    try {
      final raw = await _channel.invokeMapMethod<String, dynamic>(
        'authenticate',
        {'title': title, 'subtitle': subtitle},
      );
      if (raw == null) {
        return const BiometricAuthResult(authenticated: false);
      }
      return BiometricAuthResult(
        authenticated: raw['authenticated'] == true,
        message: raw['message'] as String?,
        reason: raw['reason'] as String?,
      );
    } on MissingPluginException {
      return const BiometricAuthResult(
        authenticated: false,
        reason: 'unsupported',
      );
    } on PlatformException catch (e) {
      return BiometricAuthResult(
        authenticated: false,
        message: e.message,
        reason: e.code,
      );
    }
  }

  static BiometryType _parseBiometryType(String? raw) {
    switch (raw) {
      case 'faceId':
        return BiometryType.faceId;
      case 'touchId':
        return BiometryType.touchId;
      case 'biometric':
        return BiometryType.biometric;
      case 'deviceCredential':
        return BiometryType.deviceCredential;
      default:
        return BiometryType.none;
    }
  }
}
