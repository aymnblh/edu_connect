class LessonEntryModel {
  final String id;
  final String classId;
  final String subject;
  final String content;
  final String? homeworkSummary;
  final DateTime sessionDate;
  final DateTime createdAt;

  const LessonEntryModel({
    required this.id,
    required this.classId,
    required this.subject,
    required this.content,
    this.homeworkSummary,
    required this.sessionDate,
    required this.createdAt,
  });

  factory LessonEntryModel.fromJson(Map<String, dynamic> json) {
    return LessonEntryModel(
      id: json['id'] as String,
      classId: json['class_id'] as String,
      subject: json['subject'] as String,
      content: json['content'] as String,
      homeworkSummary: json['homework_summary'] as String?,
      sessionDate: DateTime.parse(json['session_date'] as String),
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }
}
