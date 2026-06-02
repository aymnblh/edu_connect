import 'package:equatable/equatable.dart';

enum UserRole { teacher, parent, principal, secretary, systemAdmin }

class UserModel extends Equatable {
  final String id;
  final String email;
  final String fullName;
  final String? phone;
  final String? avatarUrl;
  final String? schoolId;
  final UserRole role;
  final String? pushToken;
  final DateTime createdAt;

  const UserModel({
    required this.id,
    required this.email,
    required this.fullName,
    this.phone,
    this.avatarUrl,
    this.schoolId,
    required this.role,
    this.pushToken,
    required this.createdAt,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    UserRole parsedRole;
    switch (json['role']) {
      case 'teacher':
        parsedRole = UserRole.teacher;
        break;
      case 'principal':
        parsedRole = UserRole.principal;
        break;
      case 'secretary':
        parsedRole = UserRole.secretary;
        break;
      case 'system_admin':
        parsedRole = UserRole.systemAdmin;
        break;
      case 'parent':
      default:
        parsedRole = UserRole.parent;
    }

    return UserModel(
      id: json['id'] as String,
      schoolId: json['school_id'] as String?,
      email: json['email'] as String,
      fullName: json['full_name'] as String,
      role: parsedRole,
      phone: json['phone'] as String?,
      avatarUrl: json['avatar_url'] as String?,
      pushToken: json['push_token'] as String?,
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }

  UserModel copyWith({
    String? id,
    String? schoolId,
    String? email,
    String? fullName,
    UserRole? role,
    String? phone,
    String? avatarUrl,
    String? pushToken,
    DateTime? createdAt,
  }) =>
      UserModel(
        id: id ?? this.id,
        schoolId: schoolId ?? this.schoolId,
        email: email ?? this.email,
        fullName: fullName ?? this.fullName,
        role: role ?? this.role,
        phone: phone ?? this.phone,
        avatarUrl: avatarUrl ?? this.avatarUrl,
        pushToken: pushToken ?? this.pushToken,
        createdAt: createdAt ?? this.createdAt,
      );

  bool get isTeacher => role == UserRole.teacher;
  bool get isParent => role == UserRole.parent;
  bool get isAdmin =>
      role == UserRole.principal ||
      role == UserRole.secretary ||
      role == UserRole.systemAdmin;
  bool get isSystemAdmin => role == UserRole.systemAdmin;

  @override
  List<Object?> get props => [
        id,
        email,
        fullName,
        phone,
        avatarUrl,
        schoolId,
        role,
        pushToken,
        createdAt
      ];
}
