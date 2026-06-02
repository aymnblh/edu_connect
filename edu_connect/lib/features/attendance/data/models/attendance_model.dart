enum AttendanceStatus { present, absent, late }

class AttendanceModel {
  final String id;
  final String classId;
  final String studentId;
  final String studentName;
  final AttendanceStatus status;
  final DateTime date;
  final String? note;
  final bool isJustified;
  final String? justificationText;
  final String? justificationAttachmentUrl;

  const AttendanceModel({
    required this.id,
    required this.classId,
    required this.studentId,
    required this.studentName,
    required this.status,
    required this.date,
    this.note,
    this.isJustified = false,
    this.justificationText,
    this.justificationAttachmentUrl,
  });

  factory AttendanceModel.fromJson(Map<String, dynamic> json) {
    return AttendanceModel(
      id: json['id'] as String,
      classId: json['class_id'] as String,
      studentId: json['student_id'] as String,
      studentName: json['student_name'] as String,
      status: AttendanceStatus.values.firstWhere(
        (s) => s.name == json['status'],
        orElse: () => AttendanceStatus.present,
      ),
      date: DateTime.parse(json['date'] as String),
      note: json['note'] as String?,
      isJustified: json['is_justified'] as bool? ?? false,
      justificationText: json['justification_text'] as String?,
      justificationAttachmentUrl:
          json['justification_attachment_url'] as String?,
    );
  }
}
