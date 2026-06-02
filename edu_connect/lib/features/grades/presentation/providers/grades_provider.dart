import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/models/grade_model.dart';
import '../../data/repositories/grades_repository.dart';

final gradesRepositoryProvider = Provider<GradesRepository>((ref) {
  return GradesRepository();
});

final gradesProvider =
    FutureProvider.family<List<GradeModel>, String>((ref, classId) {
  return ref.watch(gradesRepositoryProvider).getGrades(classId);
});

final studentGradesProvider =
    FutureProvider.family<List<GradeModel>, (String, String)>((ref, args) {
  final (classId, studentId) = args;
  return ref
      .watch(gradesRepositoryProvider)
      .getStudentGrades(classId, studentId);
});

class GradesNotifier extends StateNotifier<AsyncValue<void>> {
  final GradesRepository _repo;

  GradesNotifier(this._repo) : super(const AsyncValue.data(null));

  Future<void> addGrade({
    required String classId,
    required String studentId,
    required String studentName,
    required String subject,
    required double value,
    String? comment,
  }) async {
    state = const AsyncValue.loading();
    try {
      await _repo.addGrade(
        classId: classId,
        studentId: studentId,
        studentName: studentName,
        subject: subject,
        score: value,
        comment: comment,
      );
      state = const AsyncValue.data(null);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      rethrow;
    }
  }

  Future<void> approveGrade({
    required String classId,
    required String gradeId,
  }) async {
    state = const AsyncValue.loading();
    try {
      await _repo.approveGrade(classId: classId, gradeId: gradeId);
      state = const AsyncValue.data(null);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      rethrow;
    }
  }
}

final gradesNotifierProvider =
    StateNotifierProvider<GradesNotifier, AsyncValue<void>>((ref) {
  return GradesNotifier(ref.watch(gradesRepositoryProvider));
});
