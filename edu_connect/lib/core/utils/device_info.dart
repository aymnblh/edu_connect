import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:device_info_plus/device_info_plus.dart';

// BUG FIX: Original file had `import 'dart:io' show Platform` at the top level.
// dart:io does not exist on Flutter Web, causing a compile error.
//
// Correct pattern: use Dart's conditional imports to select a platform-specific
// implementation. The web stub returns safe defaults; the native stub uses dart:io.
import 'device_info_stub.dart'
    if (dart.library.io) 'device_info_native.dart';

class DeviceInfoUtil {
  static final DeviceInfoPlugin _deviceInfo = DeviceInfoPlugin();

  static Future<Map<String, String>> getDeviceAuditInfo() async {
    String deviceId = 'unknown';
    String platform = 'web';

    try {
      if (kIsWeb) {
        final webBrowserInfo = await _deviceInfo.webBrowserInfo;
        deviceId = webBrowserInfo.userAgent ?? 'web-unknown';
        platform = 'web';
      } else {
        final result = await getNativeDeviceInfo(_deviceInfo);
        deviceId = result['id'] ?? 'unknown';
        platform = result['platform'] ?? 'unknown';
      }
    } catch (_) {
      // Fallback to defaults
    }

    return {'id': deviceId, 'platform': platform};
  }
}
