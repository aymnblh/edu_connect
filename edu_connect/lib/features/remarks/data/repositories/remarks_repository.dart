import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/services/api_service.dart';
import '../models/remark_model.dart';

class RemarksRepository {
  final ApiService _api = ApiService.instance;

  Future<RemarkModel> addRemark(RemarkModel remark) async {
    final data = await _api.post('/classes/${remark.classId}/remarks/', data: {
      'student_id': remark.studentId,
      'student_name': remark.studentName,
      'title': remark.title,
      'content': remark.content,
      'type': remark.type.name,
    });
    return RemarkModel.fromJson(data as Map<String, dynamic>);
  }

  Future<List<RemarkModel>> getRemarks(String classId) async {
    final data = await _api.get('/classes/$classId/remarks/') as List<dynamic>;
    return data
        .map((e) => RemarkModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<List<RemarkModel>> getStudentRemarks(
      String classId, String studentId) async {
    final data = await _api.get('/classes/$classId/remarks/student/$studentId')
        as List<dynamic>;
    return data
        .map((e) => RemarkModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }
}

final remarksRepositoryProvider =
    Provider<RemarksRepository>((ref) => RemarksRepository());
