import 'package:flutter/foundation.dart';
import 'package:web_socket_channel/web_socket_channel.dart';
import 'dart:convert';
import 'dart:async';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../../../../core/services/api_service.dart';
import '../../../../core/constants/app_constants.dart';
import '../models/message_model.dart';

class ChatRepository {
  final ApiService _api = ApiService.instance;

  WebSocketChannel? _channel;
  final _controller = StreamController<MessageModel>.broadcast();

  Stream<MessageModel> get messageStream => _controller.stream;

  /// Load historical messages via REST
  Future<List<MessageModel>> getHistory(String classId) async {
    final data = await _api.get('/classes/$classId/messages') as List<dynamic>;
    return data
        .map((e) => MessageModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// Connect to WebSocket room for real-time messages
  Future<void> connect(String classId) async {
    const storage = FlutterSecureStorage();
    final token = await storage.read(key: 'access_token');
    final uri = Uri.parse('${AppConstants.wsBaseUrl}/classes/$classId/ws')
        .replace(queryParameters: {'token': token ?? ''});
    _channel = WebSocketChannel.connect(uri);

    _channel!.stream.listen(
      (raw) {
        try {
          final json = jsonDecode(raw as String) as Map<String, dynamic>;
          if (json.containsKey('error')) {
            debugPrint('[WS] Error from server: ${json['error']}');
            return;
          }
          final msg = MessageModel.fromJson(json);
          _controller.add(msg);
        } catch (e) {
          debugPrint('[WS] Parse error: $e');
        }
      },
      onError: (e) => debugPrint('[WS] Stream error: $e'),
      onDone: () => debugPrint('[WS] Connection closed'),
    );
  }

  /// Send a message via WebSocket (includes auth token)
  Future<void> sendMessage({
    required String content,
    bool isAnnouncement = false,
  }) async {
    const storage = FlutterSecureStorage();
    final token = await storage.read(key: 'access_token');
    _channel?.sink.add(jsonEncode({
      'token': token ?? '',
      'content': content,
      'is_announcement': isAnnouncement,
    }));
  }

  void disconnect() {
    _channel?.sink.close();
    _channel = null;
  }

  void dispose() {
    disconnect();
    _controller.close();
  }
}
