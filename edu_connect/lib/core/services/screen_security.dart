import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

/// Toggles Android FLAG_SECURE on sensitive screens (such as medical/infirmary
/// records) without blocking benign screenshots on general screens or Google
/// Play Pre-Launch Report captures.
class ScreenSecurity {
  ScreenSecurity._();

  static const MethodChannel _channel =
      MethodChannel('com.educonnect.edu_connect/screen_security');
  static int _activeLocks = 0;

  static Future<void> acquire() async {
    _activeLocks++;
    if (_activeLocks == 1) {
      await _setSecure(true);
    }
  }

  static Future<void> release() async {
    if (_activeLocks <= 0) {
      _activeLocks = 0;
      return;
    }
    _activeLocks--;
    if (_activeLocks == 0) {
      await _setSecure(false);
    }
  }

  static Future<void> _setSecure(bool secure) async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) {
      return;
    }
    try {
      await _channel.invokeMethod<void>('setSecureScreen', {'secure': secure});
    } catch (_) {
      // Ignore on unsupported platforms or test harnesses without native channel.
    }
  }
}
