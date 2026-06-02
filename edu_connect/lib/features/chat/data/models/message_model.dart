class MessageModel {
  final String id;
  final String classId;
  final String senderId;
  final String senderName;
  final String content;
  final bool isAnnouncement;
  final DateTime createdAt;

  const MessageModel({
    required this.id,
    required this.classId,
    required this.senderId,
    required this.senderName,
    required this.content,
    this.isAnnouncement = false,
    required this.createdAt,
  });

  factory MessageModel.fromJson(Map<String, dynamic> json) {
    return MessageModel(
      id: json['id'] as String,
      classId: json['class_id'] as String,
      senderId: json['sender_id'] as String,
      senderName: json['sender_name'] as String,
      content: json['content'] as String,
      isAnnouncement: json['is_announcement'] as bool? ?? false,
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }
}
