import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/models/conversation_model.dart';
import '../../data/repositories/dm_repository.dart';

// ── Repository Provider ──────────────────────────────────────────────────────

final dmRepositoryProvider = Provider<DmRepository>((ref) {
  final repo = DmRepository();
  ref.onDispose(() => repo.dispose());
  return repo;
});

// ── Conversations List ────────────────────────────────────────────────────────

class ConversationsState {
  final List<ConversationModel> conversations;
  final bool isLoading;
  final String? error;

  const ConversationsState({
    this.conversations = const [],
    this.isLoading = false,
    this.error,
  });

  ConversationsState copyWith({
    List<ConversationModel>? conversations,
    bool? isLoading,
    String? error,
  }) =>
      ConversationsState(
        conversations: conversations ?? this.conversations,
        isLoading: isLoading ?? this.isLoading,
        error: error,
      );
}

class ConversationsNotifier extends StateNotifier<ConversationsState> {
  final DmRepository _repo;

  ConversationsNotifier(this._repo)
      : super(const ConversationsState(isLoading: true)) {
    load();
  }

  Future<void> load() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final convs = await _repo.getConversations();
      // Sort by latest message date descending
      convs.sort((a, b) {
        final aDate = a.lastMessage?.createdAt ?? a.createdAt;
        final bDate = b.lastMessage?.createdAt ?? b.createdAt;
        return bDate.compareTo(aDate);
      });
      state = state.copyWith(conversations: convs, isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: _dmErrorMessage(e));
    }
  }

  Future<ConversationModel?> createDirect({
    required String recipientId,
    String? initialMessage,
  }) async {
    try {
      final conv = await _repo.createDirect(
        recipientId: recipientId,
        initialMessage: initialMessage,
      );
      // Prepend the new conversation (or refresh)
      await load();
      return conv;
    } catch (e) {
      state = state.copyWith(error: _dmErrorMessage(e));
      return null;
    }
  }

  Future<List<ConversationModel>> createBulk({
    required List<String> recipientIds,
    required String initialMessage,
  }) async {
    try {
      final convs = await _repo.createBulk(
        recipientIds: recipientIds,
        initialMessage: initialMessage,
      );
      await load();
      return convs;
    } catch (e) {
      state = state.copyWith(error: _dmErrorMessage(e));
      return const [];
    }
  }

  Future<ConversationModel?> broadcast({
    required String classId,
    required String title,
    required String message,
  }) async {
    try {
      final conv = await _repo.broadcast(
        classId: classId,
        title: title,
        initialMessage: message,
      );
      await load();
      return conv;
    } catch (e) {
      state = state.copyWith(error: _dmErrorMessage(e));
      return null;
    }
  }
}

final conversationsProvider =
    StateNotifierProvider<ConversationsNotifier, ConversationsState>((ref) {
  final repo = ref.watch(dmRepositoryProvider);
  return ConversationsNotifier(repo);
});

final dmContactsProvider = FutureProvider<List<MessagingContact>>((ref) {
  return ref.watch(dmRepositoryProvider).getContacts();
});

// ── DM Thread (messages in one conversation) ─────────────────────────────────

class DmThreadState {
  final List<DirectMessageModel> messages;
  final bool isLoading;
  final String? error;

  const DmThreadState({
    this.messages = const [],
    this.isLoading = false,
    this.error,
  });

  DmThreadState copyWith({
    List<DirectMessageModel>? messages,
    bool? isLoading,
    String? error,
  }) =>
      DmThreadState(
        messages: messages ?? this.messages,
        isLoading: isLoading ?? this.isLoading,
        error: error,
      );
}

class DmThreadNotifier extends StateNotifier<DmThreadState> {
  final DmRepository _repo;
  final String _conversationId;

  DmThreadNotifier(this._repo, this._conversationId)
      : super(const DmThreadState(isLoading: true)) {
    _init();
  }

  void _init() async {
    try {
      // 1. Load history
      final history = await _repo.getMessages(_conversationId);
      state = state.copyWith(messages: history, isLoading: false);

      // 2. Mark as read
      await _repo.markRead(_conversationId);

      // 3. Connect WebSocket
      await _repo.connect(_conversationId);

      // 4. Listen for incoming messages
      _repo.messageStream.listen((msg) {
        if (!state.messages.any((m) => m.id == msg.id)) {
          state = state.copyWith(messages: [...state.messages, msg]);
        }
      });
    } catch (e) {
      state = state.copyWith(isLoading: false, error: _dmErrorMessage(e));
    }
  }

  Future<void> send(String content) async {
    if (content.trim().isEmpty) return;
    try {
      // Try WebSocket first, HTTP as fallback
      await _repo.sendWs(content);
    } catch (_) {
      try {
        final msg = await _repo.sendHttp(
          conversationId: _conversationId,
          content: content,
        );
        if (!state.messages.any((m) => m.id == msg.id)) {
          state = state.copyWith(messages: [...state.messages, msg]);
        }
      } catch (e) {
        state = state.copyWith(error: "Erreur d'envoi: ${_dmErrorMessage(e)}");
      }
    }
  }

  @override
  void dispose() {
    _repo.disconnect();
    super.dispose();
  }
}

final dmThreadProvider =
    StateNotifierProvider.family<DmThreadNotifier, DmThreadState, String>(
        (ref, conversationId) {
  final repo = ref.watch(dmRepositoryProvider);
  return DmThreadNotifier(repo, conversationId);
});

String _dmErrorMessage(Object error) {
  if (error is DioException) {
    final data = error.response?.data;
    final detail = data is Map ? data['detail'] : null;
    if (detail is String && detail.trim().isNotEmpty) {
      return detail;
    }
    if (detail is Map) {
      final message = detail['message'];
      if (message is String && message.trim().isNotEmpty) {
        return message;
      }
    }
    final message = error.message;
    if (message != null && message.trim().isNotEmpty) {
      return message;
    }
  }
  return error.toString();
}
