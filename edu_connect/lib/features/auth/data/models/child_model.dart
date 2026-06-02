/// Represents a student linked to the currently logged-in parent account.
class ChildModel {
  final String id;
  final String schoolId;
  final String fullName;
  final String? studentId; // e.g. "2026-001"

  const ChildModel({
    required this.id,
    required this.schoolId,
    required this.fullName,
    this.studentId,
  });

  factory ChildModel.fromJson(Map<String, dynamic> json) {
    return ChildModel(
      id: json['id'] as String,
      schoolId: json['school_id'] as String,
      fullName: json['full_name'] as String,
      studentId: json['student_id'] as String?,
    );
  }

  /// Returns the child's initials for avatar display.
  String get initials {
    final parts = fullName.trim().split(' ');
    if (parts.length >= 2) {
      return '${parts.first[0]}${parts.last[0]}'.toUpperCase();
    }
    return fullName.isNotEmpty ? fullName[0].toUpperCase() : '?';
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) || other is ChildModel && other.id == id;

  @override
  int get hashCode => id.hashCode;
}
