import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:web_socket_channel/web_socket_channel.dart';
import '../../../../core/services/api_service.dart';
import '../../../../core/constants/app_constants.dart';
import '../models/conversation_model.dart';

class MessagingContact {
  final String userId;
  final String fullName;
  final String role;
  final String? email;

  const MessagingContact({
    required this.userId,
    required this.fullName,
    required this.role,
    this.email,
  });

  factory MessagingContact.fromJson(Map<String, dynamic> json) {
    return MessagingContact(
      userId: json['user_id'] as String,
      fullName: json['full_name'] as String,
      role: json['role'] as String,
      email: json['email'] as String?,
    );
  }
}

class DmRepository {
  final ApiService _api = ApiService.instance;

  WebSocketChannel? _channel;
  final _messageController = StreamController<DirectMessageModel>.broadcast();

  Stream<DirectMessageModel> get messageStream => _messageController.stream;

  // ── Conversations ──────────────────────────────────────────────────────────

  /// Fetch all conversations the current user participates in.
  Future<List<ConversationModel>> getConversations() async {
    final data = await _api.get('/dm/conversations') as List<dynamic>;
    return data
        .map((e) => ConversationModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<List<MessagingContact>> getContacts() async {
    final data = await _api.get('/dm/contacts') as List<dynamic>;
    return data
        .map((e) => MessagingContact.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// Create (or resume) a direct 1-to-1 conversation with [recipientId].
  Future<ConversationModel> createDirect({
    required String recipientId,
    String? initialMessage,
  }) async {
    final body = <String, dynamic>{'recipient_id': recipientId};
    if (initialMessage != null && initialMessage.isNotEmpty) {
      body['initial_message'] = initialMessage;
    }
    final data = await _api.post('/dm/conversations', data: body);
    return ConversationModel.fromJson(data as Map<String, dynamic>);
  }

  /// Send the same first message to several users as separate private DMs.
  Future<List<ConversationModel>> createBulk({
    required List<String> recipientIds,
    required String initialMessage,
  }) async {
    final data = await _api.post('/dm/conversations/bulk', data: {
      'recipient_ids': recipientIds,
      'initial_message': initialMessage,
    }) as List<dynamic>;
    return data
        .map((e) => ConversationModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// Teacher broadcasts a message to all parents of a class.
  Future<ConversationModel> broadcast({
    required String classId,
    required String title,
    required String initialMessage,
  }) async {
    final data = await _api.post('/dm/conversations/broadcast', data: {
      'class_id': classId,
      'title': title,
      'initial_message': initialMessage,
    });
    return ConversationModel.fromJson(data as Map<String, dynamic>);
  }

  // ── Messages ───────────────────────────────────────────────────────────────

  /// Fetch message history for a conversation (REST fallback).
  Future<List<DirectMessageModel>> getMessages(String conversationId) async {
    final data = await _api.get('/dm/conversations/$conversationId/messages')
        as List<dynamic>;
    return data
        .map((e) => DirectMessageModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// Send a message via HTTP (reliable fallback if WS is disconnected).
  Future<DirectMessageModel> sendHttp({
    required String conversationId,
    required String content,
  }) async {
    final data = await _api.post(
      '/dm/conversations/$conversationId/messages',
      data: {'content': content},
    );
    return DirectMessageModel.fromJson(data as Map<String, dynamic>);
  }

  /// Mark a conversation as read.
  Future<void> markRead(String conversationId) async {
    await _api.post('/dm/conversations/$conversationId/read', data: {});
  }

  // ── WebSocket ──────────────────────────────────────────────────────────────

  Future<void> connect(String conversationId) async {
    const storage = FlutterSecureStorage();
    final token = await storage.read(key: 'access_token');
    final uri = Uri.parse(
            '${AppConstants.wsBaseUrl}/dm/conversations/$conversationId/ws')
        .replace(queryParameters: {'token': token ?? ''});
    _channel = WebSocketChannel.connect(uri);

    _channel!.stream.listen(
      (raw) {
        try {
          final json = jsonDecode(raw as String) as Map<String, dynamic>;
          if (json.containsKey('error')) {
            debugPrint('[DM WS] Error: ${json['error']}');
            return;
          }
          final msg = DirectMessageModel.fromJson(json);
          _messageController.add(msg);
        } catch (e) {
          debugPrint('[DM WS] Parse error: $e');
        }
      },
      onError: (e) => debugPrint('[DM WS] Stream error: $e'),
      onDone: () => debugPrint('[DM WS] Connection closed'),
    );
  }

  Future<void> sendWs(String content) async {
    const storage = FlutterSecureStorage();
    final token = await storage.read(key: 'access_token');
    _channel?.sink.add(jsonEncode({
      'token': token ?? '',
      'content': content,
    }));
  }

  void disconnect() {
    _channel?.sink.close();
    _channel = null;
  }

  void dispose() {
    disconnect();
    _messageController.close();
  }
}
