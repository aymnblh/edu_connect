class GradeModel {
  final String id;
  final String classId;
  final String studentId;
  final String studentName;
  final String? courseId;
  final String subject;
  final double value;
  final double maxValue;
  final double coefficient;
  final double? normalizedScore;
  final DateTime date;
  final String? comment;
  final bool isApproved;
  final String? approvedBy;
  final DateTime? approvedAt;

  const GradeModel({
    required this.id,
    required this.classId,
    required this.studentId,
    required this.studentName,
    this.courseId,
    required this.subject,
    required this.value,
    this.maxValue = 20.0,
    this.coefficient = 1.0,
    this.normalizedScore,
    required this.date,
    this.comment,
    this.isApproved = false,
    this.approvedBy,
    this.approvedAt,
  });

  factory GradeModel.fromJson(Map<String, dynamic> json) {
    return GradeModel(
      id: json['id'] as String,
      classId: json['class_id'] as String,
      studentId: json['student_id'] as String,
      studentName: json['student_name'] as String,
      courseId: json['course_id'] as String?,
      subject: json['subject'] as String,
      value: (json['score'] as num).toDouble(),
      maxValue: (json['max_score'] as num? ?? 20).toDouble(),
      coefficient: (json['coefficient'] as num? ?? 1).toDouble(),
      normalizedScore: (json['normalized_score'] as num?)?.toDouble(),
      date: DateTime.parse(json['date'] as String),
      comment: json['comment'] as String?,
      isApproved: json['is_approved'] as bool? ?? false,
      approvedBy: json['approved_by'] as String?,
      approvedAt: json['approved_at'] == null
          ? null
          : DateTime.parse(json['approved_at'] as String),
    );
  }

  String get formattedValue => value == value.floor()
      ? value.toInt().toString()
      : value.toStringAsFixed(1);

  double get scoreOnTwenty {
    if (normalizedScore != null) return normalizedScore!;
    if (maxValue <= 0) return value;
    return (value / maxValue) * 20;
  }
}
