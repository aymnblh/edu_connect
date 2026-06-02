import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/services/api_service.dart';
import '../models/homework_model.dart';

class HomeworkRepository {
  final ApiService _api = ApiService.instance;

  Future<HomeworkModel> addHomework(HomeworkModel homework) async {
    final data =
        await _api.post('/classes/${homework.classId}/homework/', data: {
      'subject': homework.subject,
      if (homework.lessonContent != null)
        'lesson_content': homework.lessonContent,
      'homework_content': homework.homeworkContent,
      'due_date': homework.dueDate.toUtc().toIso8601String(),
    });
    return HomeworkModel.fromJson(data as Map<String, dynamic>);
  }

  Future<List<HomeworkModel>> getHomework(String classId) async {
    final data = await _api.get('/classes/$classId/homework/') as List<dynamic>;
    return data
        .map((e) => HomeworkModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }
}

final homeworkRepositoryProvider =
    Provider<HomeworkRepository>((ref) => HomeworkRepository());
