class ParticipantModel {
  final String userId;
  final String fullName;
  final String role;

  const ParticipantModel({
    required this.userId,
    required this.fullName,
    required this.role,
  });

  factory ParticipantModel.fromJson(Map<String, dynamic> json) {
    return ParticipantModel(
      userId: json['user_id'] as String,
      fullName: json['full_name'] as String,
      role: json['role'] as String,
    );
  }
}

class DirectMessageModel {
  final String id;
  final String conversationId;
  final String senderId;
  final String senderName;
  final String content;
  final DateTime createdAt;

  const DirectMessageModel({
    required this.id,
    required this.conversationId,
    required this.senderId,
    required this.senderName,
    required this.content,
    required this.createdAt,
  });

  factory DirectMessageModel.fromJson(Map<String, dynamic> json) {
    return DirectMessageModel(
      id: json['id'] as String,
      conversationId: json['conversation_id'] as String,
      senderId: json['sender_id'] as String,
      senderName: json['sender_name'] as String,
      content: json['content'] as String,
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }
}

class ConversationModel {
  final String id;
  final String schoolId;
  final String type; // "direct" | "group"
  final String? title;
  final String createdBy;
  final DateTime createdAt;
  final int unreadCount;
  final DirectMessageModel? lastMessage;
  final List<ParticipantModel> participants;

  const ConversationModel({
    required this.id,
    required this.schoolId,
    required this.type,
    this.title,
    required this.createdBy,
    required this.createdAt,
    this.unreadCount = 0,
    this.lastMessage,
    this.participants = const [],
  });

  /// Display name for the conversation.
  /// For direct: show the OTHER participant's name.
  /// For group: show the title.
  String displayName(String currentUserId) {
    if (type == 'group') return title ?? 'Groupe';
    final other =
        participants.where((p) => p.userId != currentUserId).firstOrNull;
    return other?.fullName ?? 'Conversation';
  }

  /// BUG FIX: subtitle() previously called a private static _roleLabel() that
  /// was hardcoded in French regardless of the app locale. The role key (raw
  /// backend string) is now returned as-is so the UI layer (_MessagingText in
  /// conversations_list_screen.dart) can translate it with access to BuildContext.
  ///
  /// For groups, the participant count is returned as a plain integer string so
  /// the UI can wrap it in the correct translated phrase.
  ///
  /// Use [subtitleParticipantCount] for groups and [subtitleRoleKey] for directs.

  /// Raw role string for direct conversations (e.g. "teacher", "parent").
  /// The UI should pass this to its translation helper.
  String subtitleRoleKey(String currentUserId) {
    if (type == 'group') return '';
    final other =
        participants.where((p) => p.userId != currentUserId).firstOrNull;
    return other?.role ?? '';
  }

  /// Number of participants for group conversations.
  int get subtitleParticipantCount => participants.length;

  /// Legacy helper kept for backwards compatibility — returns a non-translated
  /// fallback. Prefer subtitleRoleKey() + UI-level translation.
  String subtitle(String currentUserId) {
    if (type == 'group') {
      return '${participants.length} participants';
    }
    final other =
        participants.where((p) => p.userId != currentUserId).firstOrNull;
    return other?.role ?? '';
  }

  factory ConversationModel.fromJson(Map<String, dynamic> json) {
    return ConversationModel(
      id: json['id'] as String,
      schoolId: json['school_id'] as String,
      type: json['type'] as String,
      title: json['title'] as String?,
      createdBy: json['created_by'] as String,
      createdAt: DateTime.parse(json['created_at'] as String),
      unreadCount: json['unread_count'] as int? ?? 0,
      lastMessage: json['last_message'] != null
          ? DirectMessageModel.fromJson(
              json['last_message'] as Map<String, dynamic>)
          : null,
      participants: (json['participants'] as List<dynamic>? ?? [])
          .map((p) => ParticipantModel.fromJson(p as Map<String, dynamic>))
          .toList(),
    );
  }
}
