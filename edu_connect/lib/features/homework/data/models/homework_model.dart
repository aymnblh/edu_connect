class HomeworkModel {
  final String id;
  final String classId;
  final String? courseId;
  final String subject;
  final String? lessonContent;
  final String homeworkContent;
  final DateTime dueDate;
  final String? createdBy;
  final DateTime createdAt;

  const HomeworkModel({
    required this.id,
    required this.classId,
    this.courseId,
    required this.subject,
    this.lessonContent,
    required this.homeworkContent,
    required this.dueDate,
    this.createdBy,
    required this.createdAt,
  });

  factory HomeworkModel.fromJson(Map<String, dynamic> json) {
    return HomeworkModel(
      id: json['id'] as String,
      classId: json['class_id'] as String,
      courseId: json['course_id'] as String?,
      subject: json['subject'] as String,
      lessonContent: json['lesson_content'] as String?,
      homeworkContent: json['homework_content'] as String,
      dueDate: DateTime.parse(json['due_date'] as String),
      createdBy: json['created_by'] as String?,
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }
}
