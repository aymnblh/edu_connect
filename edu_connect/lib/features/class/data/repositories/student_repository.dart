import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/services/api_service.dart';
import '../models/student_model.dart';
import '../../../auth/presentation/providers/auth_provider.dart';

class ParentLinkToken {
  final String label;
  final String token;
  final DateTime expiresAt;

  const ParentLinkToken({
    required this.label,
    required this.token,
    required this.expiresAt,
  });

  factory ParentLinkToken.fromJson(Map<String, dynamic> json) {
    return ParentLinkToken(
      label: json['label'] as String? ?? 'Parent',
      token: json['token'] as String,
      expiresAt: DateTime.parse(json['expires_at'] as String),
    );
  }
}

class StudentRepository {
  final ApiService _api = ApiService.instance;

  Future<List<StudentModel>> getStudentsBySchool(String schoolId) async {
    // Admins use the admin endpoint; this provides all students in the school
    final data = await _api.get('/admin/students') as List<dynamic>;
    return data
        .map((e) => StudentModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<String> regeneratePin(String studentId, {bool notify = false}) async {
    final data = await _api.post('/admin/students/$studentId/regenerate-pin',
        data: {'notify': notify});
    return (data as Map<String, dynamic>)['new_pin'] as String;
  }

  Future<ParentLinkToken> generateParentLinkToken(
    String studentId, {
    required String label,
    int expiresInHours = 168,
  }) async {
    final data = await _api.post(
      '/admin/students/$studentId/generate-link-tokens',
      data: {
        'labels': [label],
        'expires_in_hours': expiresInHours,
      },
    ) as Map<String, dynamic>;
    final tokens = data['tokens'] as List<dynamic>;
    return ParentLinkToken.fromJson(tokens.first as Map<String, dynamic>);
  }

  Future<void> linkByQr(String token) async {
    await _api.post('/verification/link-by-qr', data: {'token': token});
  }

  Future<void> requestLinkByPin({
    required String studentId,
    required String linkingPin,
  }) async {
    await _api.post('/verification/request', data: {
      'student_id': studentId,
      'linking_pin': linkingPin,
    });
  }
}

final studentRepositoryProvider =
    Provider<StudentRepository>((ref) => StudentRepository());

final schoolStudentsProvider = FutureProvider<List<StudentModel>>((ref) async {
  final user = ref.watch(authNotifierProvider).value;
  if (user == null || user.schoolId == null) return [];
  return ref
      .watch(studentRepositoryProvider)
      .getStudentsBySchool(user.schoolId!);
});
