import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/services/api_service.dart';
import '../models/class_model.dart';

class ClassRepository {
  final ApiService _api = ApiService.instance;

  Future<ClassModel> createClass({
    required String schoolId,
    required String name,
    String? subject,
    List<String> studentIds = const [],
  }) async {
    final data = await _api.post('/classes/', data: {
      'school_id': schoolId,
      'name': name,
      'subject': subject,
      'student_ids': studentIds,
    });
    return ClassModel.fromJson(data as Map<String, dynamic>);
  }

  Future<ClassModel> joinClass({
    required String joinCode,
  }) async {
    final data = await _api.post('/classes/join', data: {
      'join_code': joinCode,
    });
    return ClassModel.fromJson(data as Map<String, dynamic>);
  }

  Stream<List<ClassModel>> getClassesForUser() async* {
    final data = await _api.get('/classes/') as List<dynamic>;
    yield data
        .map((e) => ClassModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<ClassModel> getClassById(String classId) async {
    final data = await _api.get('/classes/$classId');
    return ClassModel.fromJson(data as Map<String, dynamic>);
  }
}

final classRepositoryProvider =
    Provider<ClassRepository>((ref) => ClassRepository());
