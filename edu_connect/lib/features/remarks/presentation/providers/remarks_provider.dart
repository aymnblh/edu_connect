import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/models/remark_model.dart';
import '../../data/repositories/remarks_repository.dart';

final remarksRepositoryProvider = Provider<RemarksRepository>((ref) {
  return RemarksRepository();
});

final classRemarksProvider =
    FutureProvider.family<List<RemarkModel>, String>((ref, classId) {
  return ref.watch(remarksRepositoryProvider).getRemarks(classId);
});

final studentRemarksProvider =
    FutureProvider.family<List<RemarkModel>, (String, String)>((ref, args) {
  final (classId, studentId) = args;
  return ref
      .watch(remarksRepositoryProvider)
      .getStudentRemarks(classId, studentId);
});

class RemarksNotifier extends StateNotifier<AsyncValue<void>> {
  final RemarksRepository _repo;

  RemarksNotifier(this._repo) : super(const AsyncValue.data(null));

  Future<void> addRemark(RemarkModel remark) async {
    state = const AsyncValue.loading();
    try {
      await _repo.addRemark(remark);
      state = const AsyncValue.data(null);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      rethrow;
    }
  }
}

final remarksNotifierProvider =
    StateNotifierProvider<RemarksNotifier, AsyncValue<void>>((ref) {
  return RemarksNotifier(ref.watch(remarksRepositoryProvider));
});
