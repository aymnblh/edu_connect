import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/models/class_model.dart';
import '../../data/repositories/admin_repository.dart';
import '../../data/repositories/class_repository.dart';
import '../../../auth/presentation/providers/auth_provider.dart';

// ── Repository provider ────────────────────────────────────────────────────
final classRepositoryProvider = Provider<ClassRepository>((ref) {
  return ClassRepository();
});

// ── User's classes stream ──────────────────────────────────────────────────
final userClassesProvider = StreamProvider<List<ClassModel>>((ref) {
  final userAsync = ref.watch(authNotifierProvider);
  return userAsync.when(
    data: (user) {
      if (user == null) return Stream.value([]);
      return ref.watch(classRepositoryProvider).getClassesForUser();
    },
    loading: () => Stream.value([]),
    error: (_, __) => Stream.value([]),
  );
});

// ── Single class provider ──────────────────────────────────────────────────
final classDetailProvider =
    FutureProvider.family<ClassModel, String>((ref, classId) {
  return ref.watch(classRepositoryProvider).getClassById(classId);
});

// ── Create class notifier ──────────────────────────────────────────────────
class ClassNotifier extends StateNotifier<AsyncValue<void>> {
  final ClassRepository _repo;

  ClassNotifier(this._repo) : super(const AsyncValue.data(null));

  Future<ClassModel?> createClass({
    required String schoolId,
    required String name,
    String? subject,
    List<String> studentIds = const [],
  }) async {
    state = const AsyncValue.loading();
    try {
      final result = await _repo.createClass(
        schoolId: schoolId,
        name: name,
        subject: subject,
        studentIds: studentIds,
      );
      state = const AsyncValue.data(null);
      return result;
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      rethrow;
    }
  }
}

final classNotifierProvider =
    StateNotifierProvider<ClassNotifier, AsyncValue<void>>((ref) {
  return ClassNotifier(ref.watch(classRepositoryProvider));
});

/// Subjects the signed-in teacher teaches in a class (grades, homework). A substitute with no
/// assigned subject gets the whole class list; the API enforces the same rule.
final teacherCoursesProvider = FutureProvider.autoDispose
    .family<List<ClassCourseModel>, String>((ref, classId) async {
  final userId = ref.watch(authNotifierProvider).valueOrNull?.id;
  final courses =
      await ref.watch(adminRepositoryProvider).getClassCourses(classId);
  final mine = userId == null
      ? <ClassCourseModel>[]
      : courses.where((course) => course.teacherId == userId).toList();
  return mine.isNotEmpty ? mine : courses;
});
