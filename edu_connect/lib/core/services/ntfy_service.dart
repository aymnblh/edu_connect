import 'dart:async';
import 'dart:convert';

import 'package:crypto/crypto.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:web_socket_channel/web_socket_channel.dart';

import '../constants/app_constants.dart';
import 'api_service.dart';

class NtfyService {
  NtfyService._();
  static final NtfyService instance = NtfyService._();

  WebSocketChannel? _channel;
  String? _activeTopic;
  Timer? _reconnectTimer;
  Timer? _pollTimer;
  bool _disposedByUser = false;
  bool _localNotificationsReady = false;
  final Set<String> _seenBackendNotificationIds = <String>{};
  final Map<String, DateTime> _recentLocalNotifications = <String, DateTime>{};
  final FlutterLocalNotificationsPlugin _localNotifications =
      FlutterLocalNotificationsPlugin();

  static const AndroidNotificationChannel _androidChannel =
      AndroidNotificationChannel(
    'wasel_edu_notifications',
    'Wasel Edu',
    description: 'Notifications scolaires Wasel Edu',
    importance: Importance.high,
  );

  Future<void> initialize() async {
    _disposedByUser = false;
    const storage = FlutterSecureStorage();
    final userStr = await storage.read(key: 'user_profile');

    if (userStr == null) return;

    try {
      final user = jsonDecode(userStr) as Map<String, dynamic>;
      final userId = user['id'] as String?;
      if (userId == null || userId.isEmpty) return;

      final topic = _topicForUser(userId);
      if (_activeTopic == topic && _channel != null) return;

      await _ensureLocalNotificationsReady();
      _closeChannel();
      await ApiService.instance
          .patch('/users/me/push-token', data: {'push_token': topic});

      final wsUrl = Uri.parse('${AppConstants.ntfyWsBaseUrl}/$topic/ws');
      _channel = WebSocketChannel.connect(wsUrl);
      _activeTopic = topic;

      _channel!.stream.listen(
        (message) {
          if (kDebugMode) debugPrint('[Ntfy] notification: $message');
          _showLocalNotification(message);
        },
        onError: (err) {
          if (kDebugMode) debugPrint('[Ntfy] ws error: $err');
        },
        onDone: () {
          _channel = null;
          _activeTopic = null;
          _scheduleReconnect();
        },
      );

      await _primeBackendNotifications();
      _startBackendPolling();
    } catch (e) {
      if (kDebugMode) debugPrint('[Ntfy] init error: $e');
      _scheduleReconnect();
    }
  }

  Future<void> _ensureLocalNotificationsReady() async {
    if (_localNotificationsReady) return;

    const initializationSettings = InitializationSettings(
      android: AndroidInitializationSettings('ic_notification'),
    );
    await _localNotifications.initialize(settings: initializationSettings);

    final android = _localNotifications
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>();
    await android?.createNotificationChannel(_androidChannel);
    await android?.requestNotificationsPermission();

    _localNotificationsReady = true;
  }

  Future<void> _showLocalNotification(dynamic rawMessage) async {
    try {
      final parsed = rawMessage is String
          ? jsonDecode(rawMessage) as Map<String, dynamic>
          : <String, dynamic>{};
      if (parsed['event'] != null && parsed['event'] != 'message') return;

      final title = (parsed['title'] as String?)?.trim();
      final body = (parsed['message'] as String?)?.trim();
      final fallbackBody =
          rawMessage is String ? rawMessage.trim() : rawMessage.toString();
      final resolvedBody = body?.isNotEmpty == true ? body! : fallbackBody;
      await _showLocalNotificationFromParts(
        title: title?.isNotEmpty == true ? title : 'Wasel Edu',
        body: resolvedBody,
      );
    } catch (e) {
      if (kDebugMode) debugPrint('[Ntfy] local notification error: $e');
    }
  }

  Future<void> _showLocalNotificationFromParts({
    required String? title,
    required String body,
  }) async {
    final resolvedBody = body.trim();
    if (resolvedBody.isEmpty) return;

    final resolvedTitle =
        title?.trim().isNotEmpty == true ? title!.trim() : 'Wasel Edu';
    _rememberRecentNotification(resolvedTitle, resolvedBody);

    await _localNotifications.show(
      id: DateTime.now().millisecondsSinceEpoch.remainder(2147483647),
      title: resolvedTitle,
      body: resolvedBody,
      notificationDetails: const NotificationDetails(
        android: AndroidNotificationDetails(
          'wasel_edu_notifications',
          'Wasel Edu',
          channelDescription: 'Notifications scolaires Wasel Edu',
          importance: Importance.high,
          priority: Priority.high,
          icon: 'ic_notification',
        ),
      ),
    );
  }

  Future<void> _primeBackendNotifications() async {
    try {
      final notifications = await _fetchUnreadBackendNotifications();
      for (final notification in notifications) {
        final id = notification['id'] as String?;
        if (id != null) _seenBackendNotificationIds.add(id);
      }
    } catch (e) {
      if (kDebugMode) debugPrint('[Ntfy] notification prime error: $e');
    }
  }

  void _startBackendPolling() {
    _pollTimer?.cancel();
    _pollTimer = Timer.periodic(const Duration(seconds: 30), (_) {
      unawaited(_pollBackendNotifications());
    });
  }

  Future<void> _pollBackendNotifications() async {
    try {
      final notifications = await _fetchUnreadBackendNotifications();
      for (final notification in notifications.reversed) {
        final id = notification['id'] as String?;
        if (id == null || _seenBackendNotificationIds.contains(id)) continue;

        final title = (notification['title'] as String?)?.trim();
        final body = (notification['content'] as String?)?.trim();
        if (body == null || body.isEmpty) continue;

        _seenBackendNotificationIds.add(id);
        if (_wasRecentlyShown(title, body)) continue;

        await _showLocalNotificationFromParts(title: title, body: body);
      }
    } catch (e) {
      if (kDebugMode) debugPrint('[Ntfy] notification poll error: $e');
    }
  }

  Future<List<Map<String, dynamic>>> _fetchUnreadBackendNotifications() async {
    final response = await ApiService.instance.get('/notifications/');
    final rawList = response is List ? response : const [];

    return rawList
        .whereType<Map>()
        .map((item) => Map<String, dynamic>.from(item))
        .where((item) => item['is_read'] == false)
        .toList();
  }

  void _rememberRecentNotification(String title, String body) {
    final now = DateTime.now();
    _recentLocalNotifications.removeWhere(
      (_, shownAt) => now.difference(shownAt) > const Duration(minutes: 2),
    );
    _recentLocalNotifications[_notificationKey(title, body)] = now;
  }

  bool _wasRecentlyShown(String? title, String body) {
    final resolvedTitle =
        title?.trim().isNotEmpty == true ? title!.trim() : 'Wasel Edu';
    final shownAt = _recentLocalNotifications[_notificationKey(
      resolvedTitle,
      body.trim(),
    )];
    return shownAt != null &&
        DateTime.now().difference(shownAt) < const Duration(minutes: 2);
  }

  String _notificationKey(String title, String body) => '$title\n$body';

  void _scheduleReconnect() {
    if (_disposedByUser) return;
    _reconnectTimer?.cancel();
    _reconnectTimer = Timer(const Duration(seconds: 5), () {
      unawaited(initialize());
    });
  }

  String _topicForUser(String userId) {
    final digest =
        sha256.convert(utf8.encode(userId)).toString().substring(0, 16);
    return 'educonnect-$digest';
  }

  void dispose() {
    _disposedByUser = true;
    _reconnectTimer?.cancel();
    _reconnectTimer = null;
    _pollTimer?.cancel();
    _pollTimer = null;
    _closeChannel();
  }

  void _closeChannel() {
    _channel?.sink.close();
    _channel = null;
    _activeTopic = null;
  }
}
