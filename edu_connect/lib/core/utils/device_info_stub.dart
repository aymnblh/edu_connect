// Web stub — dart:io is not available on Flutter Web.
// This file is selected when `dart.library.io` is NOT available (i.e., Web).
import 'package:device_info_plus/device_info_plus.dart';

Future<Map<String, String>> getNativeDeviceInfo(DeviceInfoPlugin plugin) async {
  // On Web, this function is never called (guarded by kIsWeb in device_info.dart),
  // but we need the stub to exist for the conditional import to compile.
  return {'id': 'web-stub', 'platform': 'web'};
}
