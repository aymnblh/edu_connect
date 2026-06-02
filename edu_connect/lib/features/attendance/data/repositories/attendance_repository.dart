import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/services/api_service.dart';
import '../models/attendance_model.dart';

class AttendanceRepository {
  final ApiService _api;

  AttendanceRepository(this._api);

  Future<AttendanceModel> markAttendance({
    required String classId,
    required String studentId,
    required String studentName,
    required AttendanceStatus status,
    String? note,
  }) async {
    final response =
        await _api.dio.post('/classes/$classId/attendance/', data: {
      'student_id': studentId,
      'student_name': studentName,
      'status': status.name,
      if (note != null) 'note': note,
    });
    return AttendanceModel.fromJson(response.data as Map<String, dynamic>);
  }

  Future<List<AttendanceModel>> getClassAttendance(String classId) async {
    final response = await _api.dio.get('/classes/$classId/attendance/');
    return (response.data as List)
        .map((e) => AttendanceModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<List<AttendanceModel>> getAttendanceForStudent(
      String classId, String studentId) async {
    final response =
        await _api.dio.get('/classes/$classId/attendance/student/$studentId');
    return (response.data as List)
        .map((e) => AttendanceModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<AttendanceModel> justifyAbsence({
    required String classId,
    required String attendanceId,
    required String text,
    String? attachmentUrl,
  }) async {
    final response = await _api.dio.patch(
      '/classes/$classId/attendance/$attendanceId/justify',
      data: {
        'justification': text,
        if (attachmentUrl != null) 'attachment_url': attachmentUrl,
      },
    );
    return AttendanceModel.fromJson(response.data as Map<String, dynamic>);
  }
}

final attendanceRepositoryProvider = Provider<AttendanceRepository>((ref) {
  final api = ref.watch(apiServiceProvider);
  return AttendanceRepository(api);
});
