import 'dart:async';
import 'dart:io' show Platform;

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';

import '../constants/app_constants.dart';
import 'api_service.dart';
import 'ntfy_service.dart';

/// Push notifications through Firebase, so parents and teachers are alerted
/// even when the app is closed. Does nothing unless the build was given the
/// Firebase settings (see AppConstants.hasFirebase), so the app works the same
/// without them.
class PushService {
  PushService._();
  static final PushService instance = PushService._();

  bool _started = false;
  String? _registeredToken;
  StreamSubscription<String>? _refreshSub;
  StreamSubscription<RemoteMessage>? _foregroundSub;

  static FirebaseOptions? get _options {
    if (!AppConstants.hasFirebase) return null;
    final appId = Platform.isIOS
        ? AppConstants.firebaseAppIdIos
        : AppConstants.firebaseAppIdAndroid;
    if (appId.trim().isEmpty) return null;
    return FirebaseOptions(
      apiKey: AppConstants.firebaseApiKey,
      appId: appId,
      messagingSenderId: AppConstants.firebaseSenderId,
      projectId: AppConstants.firebaseProjectId,
    );
  }

  /// Starts after sign-in: asks permission, registers this phone, shows
  /// notifications that arrive while the app is open.
  Future<void> start() async {
    if (_started) return;
    final options = _options;
    if (options == null || kIsWeb) return;
    try {
      if (Firebase.apps.isEmpty) await Firebase.initializeApp(options: options);
      final messaging = FirebaseMessaging.instance;
      final settings = await messaging.requestPermission();
      if (settings.authorizationStatus == AuthorizationStatus.denied) return;
      _started = true;

      // getToken is flagged as deprecated in favour of Firebase installation IDs;
      // it still returns the registration token the server's FCM v1 calls expect.
      // ignore: deprecated_member_use
      final token = await messaging.getToken();
      if (token != null) await _register(token);
      // ignore: deprecated_member_use
      _refreshSub = messaging.onTokenRefresh.listen(
        (fresh) => unawaited(_register(fresh)),
      );
      // The system shows notifications when the app is in the background;
      // while it is open we show them ourselves.
      _foregroundSub = FirebaseMessaging.onMessage.listen((message) {
        final notification = message.notification;
        if (notification == null) return;
        unawaited(NtfyService.instance.showRemote(
          title: notification.title,
          body: notification.body ?? '',
        ));
      });
    } catch (e) {
      _started = false;
      if (kDebugMode) debugPrint('[Push] start error: $e');
    }
  }

  Future<void> _register(String token) async {
    if (token == _registeredToken) return;
    try {
      await ApiService.instance.post('/users/me/push-devices', data: {
        'token': token,
        'platform': Platform.isIOS ? 'ios' : 'android',
      });
      _registeredToken = token;
    } catch (e) {
      if (kDebugMode) debugPrint('[Push] register error: $e');
    }
  }

  /// Before signing out: this phone must stop receiving the account's alerts.
  Future<void> stop() async {
    final token = _registeredToken;
    await _refreshSub?.cancel();
    await _foregroundSub?.cancel();
    _refreshSub = null;
    _foregroundSub = null;
    _started = false;
    _registeredToken = null;
    if (token == null) return;
    try {
      await ApiService.instance.delete('/users/me/push-devices', data: {
        'token': token,
        'platform': Platform.isIOS ? 'ios' : 'android',
      });
    } catch (e) {
      if (kDebugMode) debugPrint('[Push] unregister error: $e');
    }
  }
}
