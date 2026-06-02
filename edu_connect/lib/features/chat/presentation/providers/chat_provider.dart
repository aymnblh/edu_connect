import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/models/message_model.dart';
import '../../data/repositories/chat_repository.dart';

final chatRepositoryProvider = Provider<ChatRepository>((ref) {
  final repo = ChatRepository();
  ref.onDispose(() => repo.dispose());
  return repo;
});

class ChatState {
  final List<MessageModel> messages;
  final bool isLoading;
  final String? error;

  ChatState({
    this.messages = const [],
    this.isLoading = false,
    this.error,
  });

  ChatState copyWith({
    List<MessageModel>? messages,
    bool? isLoading,
    String? error,
  }) {
    return ChatState(
      messages: messages ?? this.messages,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

class ChatStateNotifier extends StateNotifier<ChatState> {
  final ChatRepository _repo;
  final String _classId;

  ChatStateNotifier(this._repo, this._classId)
      : super(ChatState(isLoading: true)) {
    _init();
  }

  void _init() async {
    try {
      // 1. Load history
      final history = await _repo.getHistory(_classId);
      state = state.copyWith(messages: history, isLoading: false);

      // 2. Connect WebSocket
      await _repo.connect(_classId);

      // 3. Listen for new messages
      _repo.messageStream.listen((msg) {
        state = state.copyWith(messages: [...state.messages, msg]);
      });
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<void> send(String content, {bool isAnnouncement = false}) async {
    try {
      await _repo.sendMessage(content: content, isAnnouncement: isAnnouncement);
    } catch (e) {
      state = state.copyWith(error: "Erreur d'envoi: $e");
    }
  }
}

final chatStateProvider =
    StateNotifierProvider.family<ChatStateNotifier, ChatState, String>(
        (ref, classId) {
  final repo = ref.watch(chatRepositoryProvider);
  return ChatStateNotifier(repo, classId);
});
