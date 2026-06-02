import '../../../auth/data/models/user_model.dart';
import 'student_model.dart';

class ClassModel {
  final String id;
  final String schoolId;
  final String name;
  final String? subject;
  final String joinCode;
  final DateTime createdAt;
  final List<UserModel> teachers;
  final List<StudentModel> members;

  const ClassModel({
    required this.id,
    required this.schoolId,
    required this.name,
    this.subject,
    required this.joinCode,
    required this.createdAt,
    this.teachers = const [],
    this.members = const [],
  });

  int get memberCount => members.length;

  factory ClassModel.fromJson(Map<String, dynamic> json) {
    return ClassModel(
      id: json['id'] as String,
      schoolId: json['school_id'] as String,
      name: json['name'] as String,
      subject: json['subject'] as String?,
      joinCode: json['join_code'] as String,
      createdAt: DateTime.parse(json['created_at'] as String),
      teachers: (json['teachers'] as List<dynamic>?)
              ?.map((e) => UserModel.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      members: (json['members'] as List<dynamic>?)
              ?.map((e) => StudentModel.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'school_id': schoolId,
        'name': name,
        'subject': subject,
        'join_code': joinCode,
        'created_at': createdAt.toIso8601String(),
      };
}
