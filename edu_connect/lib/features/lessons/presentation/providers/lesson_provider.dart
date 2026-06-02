import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/models/lesson_entry_model.dart';
import '../../data/repositories/lesson_repository.dart';

final lessonsProvider =
    FutureProvider.family<List<LessonEntryModel>, String>((ref, classId) {
  return ref.watch(lessonRepositoryProvider).getLessons(classId);
});

class LessonNotifier extends StateNotifier<AsyncValue<void>> {
  final LessonRepository _repo;

  LessonNotifier(this._repo) : super(const AsyncValue.data(null));

  Future<void> addLesson({
    required String classId,
    required String subject,
    required String content,
    String? homeworkSummary,
  }) async {
    state = const AsyncValue.loading();
    try {
      await _repo.addLesson(
        classId: classId,
        subject: subject,
        content: content,
        homeworkSummary: homeworkSummary,
      );
      state = const AsyncValue.data(null);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      rethrow;
    }
  }
}

final lessonNotifierProvider =
    StateNotifierProvider<LessonNotifier, AsyncValue<void>>((ref) {
  return LessonNotifier(ref.watch(lessonRepositoryProvider));
});
