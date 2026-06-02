import '../../../auth/data/models/user_model.dart';

class StudentModel {
  final String id;
  final String schoolId;
  final String? studentId; // Human readable
  final String? linkingPin; // 6-digit PIN
  final String fullName;
  final List<UserModel> parents;
  final DateTime createdAt;

  const StudentModel({
    required this.id,
    required this.schoolId,
    this.studentId,
    this.linkingPin,
    required this.fullName,
    this.parents = const [],
    required this.createdAt,
  });

  factory StudentModel.fromJson(Map<String, dynamic> json) {
    return StudentModel(
      id: json['id'] as String,
      schoolId: json['school_id'] as String,
      studentId: json['student_id'] as String?,
      linkingPin: json['linking_pin'] as String?,
      fullName: json['full_name'] as String,
      parents: (json['parents'] as List<dynamic>?)
              ?.map((e) => UserModel.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'school_id': schoolId,
        'student_id': studentId,
        'linking_pin': linkingPin,
        'full_name': fullName,
        'created_at': createdAt.toIso8601String(),
      };
}
