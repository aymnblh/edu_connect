enum RemarkType { information, warning, praise }

class RemarkModel {
  final String id;
  final String classId;
  final String studentId;
  final String studentName;
  final String title;
  final String content;
  final RemarkType type;
  final DateTime date;

  const RemarkModel({
    required this.id,
    required this.classId,
    required this.studentId,
    required this.studentName,
    required this.title,
    required this.content,
    this.type = RemarkType.information,
    required this.date,
  });

  factory RemarkModel.fromJson(Map<String, dynamic> json) {
    return RemarkModel(
      id: json['id'] as String,
      classId: json['class_id'] as String,
      studentId: json['student_id'] as String,
      studentName: json['student_name'] as String,
      title: json['title'] as String,
      content: json['content'] as String,
      type: RemarkType.values.firstWhere(
        (t) => t.name == json['type'],
        orElse: () => RemarkType.information,
      ),
      date: DateTime.parse(json['date'] as String),
    );
  }
}
