import 'package:flutter/foundation.dart';
import 'package:web_socket_channel/web_socket_channel.dart';
import 'dart:convert';
import 'dart:async';
import '../../../../core/services/api_service.dart';
import '../../../../core/services/app_secure_storage.dart';
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
    final token = await appSecureStorage.read(key: 'access_token');
    await _channel?.sink.close();
    final uri = Uri.parse('${AppConstants.wsBaseUrl}/classes/$classId/ws');
    _channel = WebSocketChannel.connect(uri);
    _channel!.sink.add(jsonEncode({'type': 'auth', 'token': token ?? ''}));

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

  /// Send a message via WebSocket after the connection was authenticated.
  Future<void> sendMessage({
    required String content,
    bool isAnnouncement = false,
  }) async {
    _channel?.sink.add(jsonEncode({
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
