import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/services/api_service.dart';
import '../models/grade_model.dart';

class GradesRepository {
  final ApiService _api = ApiService.instance;

  Future<GradeModel> addGrade({
    required String classId,
    required String studentId,
    required String studentName,
    required String subject,
    required double score,
    double maxScore = 20.0,
    String? comment,
  }) async {
    final data = await _api.post('/classes/$classId/grades/', data: {
      'student_id': studentId,
      'student_name': studentName,
      'subject': subject,
      'score': score,
      'max_score': maxScore,
      if (comment != null) 'comment': comment,
    });
    return GradeModel.fromJson(data as Map<String, dynamic>);
  }

  Future<List<GradeModel>> getGrades(String classId) async {
    final data = await _api.get('/classes/$classId/grades/') as List<dynamic>;
    return data
        .map((e) => GradeModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<List<GradeModel>> getStudentGrades(
      String classId, String studentId) async {
    final data = await _api.get('/classes/$classId/grades/student/$studentId')
        as List<dynamic>;
    return data
        .map((e) => GradeModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<String> getGradesCsv(String classId) async {
    final data = await _api.get('/classes/$classId/grades/export');
    return data.toString();
  }

  Future<void> approveGrade({
    required String classId,
    required String gradeId,
  }) async {
    await _api.post('/classes/$classId/grades/$gradeId/approve');
  }
}

final gradesRepositoryProvider =
    Provider<GradesRepository>((ref) => GradesRepository());
