import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/models/homework_model.dart';
import '../../data/repositories/homework_repository.dart';

final homeworkRepositoryProvider = Provider<HomeworkRepository>((ref) {
  return HomeworkRepository();
});

final homeworkProvider =
    FutureProvider.family<List<HomeworkModel>, String>((ref, classId) {
  return ref.watch(homeworkRepositoryProvider).getHomework(classId);
});

class HomeworkNotifier extends StateNotifier<AsyncValue<void>> {
  final HomeworkRepository _repo;

  HomeworkNotifier(this._repo) : super(const AsyncValue.data(null));

  Future<void> addHomework(HomeworkModel homework) async {
    state = const AsyncValue.loading();
    try {
      await _repo.addHomework(homework);
      state = const AsyncValue.data(null);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      rethrow;
    }
  }
}

final homeworkNotifierProvider =
    StateNotifierProvider<HomeworkNotifier, AsyncValue<void>>((ref) {
  return HomeworkNotifier(ref.watch(homeworkRepositoryProvider));
});
