import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../../class/data/repositories/admin_repository.dart';
import '../../data/models/grade_model.dart';
import '../../data/repositories/grades_repository.dart';

final gradesRepositoryProvider = Provider<GradesRepository>((ref) {
  return GradesRepository();
});

final gradesProvider =
    FutureProvider.family<List<GradeModel>, String>((ref, classId) {
  return ref.watch(gradesRepositoryProvider).getGrades(classId);
});

/// Subjects the signed-in teacher can grade in a class. A substitute with no
/// assigned subject gets the whole class list; the API enforces the same rule.
final teacherGradeCoursesProvider = FutureProvider.autoDispose
    .family<List<ClassCourseModel>, String>((ref, classId) async {
  final userId = ref.watch(authNotifierProvider).valueOrNull?.id;
  final courses =
      await ref.watch(adminRepositoryProvider).getClassCourses(classId);
  final mine = userId == null
      ? <ClassCourseModel>[]
      : courses.where((course) => course.teacherId == userId).toList();
  return mine.isNotEmpty ? mine : courses;
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
    String? courseId,
    String? comment,
  }) async {
    state = const AsyncValue.loading();
    try {
      await _repo.addGrade(
        classId: classId,
        studentId: studentId,
        studentName: studentName,
        subject: subject,
        courseId: courseId,
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
