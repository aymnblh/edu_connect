import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/services/api_service.dart';
import '../models/lesson_entry_model.dart';

class LessonRepository {
  final ApiService _api = ApiService.instance;

  Future<List<LessonEntryModel>> getLessons(String classId) async {
    final data = await _api.get('/classes/$classId/lessons/') as List<dynamic>;
    return data
        .map((e) => LessonEntryModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<LessonEntryModel> addLesson({
    required String classId,
    required String subject,
    required String content,
    String? homeworkSummary,
  }) async {
    final data = await _api.post('/classes/$classId/lessons/', data: {
      'subject': subject,
      'content': content,
      if (homeworkSummary != null && homeworkSummary.isNotEmpty)
        'homework_summary': homeworkSummary,
    });
    return LessonEntryModel.fromJson(data as Map<String, dynamic>);
  }
}

final lessonRepositoryProvider =
    Provider<LessonRepository>((ref) => LessonRepository());
