// Native implementation — selected when `dart.library.io` IS available.
// dart:io is safe to import here; this file is never compiled on Web.
import 'dart:io' show Platform;
import 'package:device_info_plus/device_info_plus.dart';

Future<Map<String, String>> getNativeDeviceInfo(DeviceInfoPlugin plugin) async {
  if (Platform.isAndroid) {
    final info = await plugin.androidInfo;
    return {'id': info.id, 'platform': 'android'};
  } else if (Platform.isIOS) {
    final info = await plugin.iosInfo;
    return {'id': info.identifierForVendor ?? 'unknown', 'platform': 'ios'};
  }
  return {'id': 'desktop-unknown', 'platform': 'desktop'};
}
