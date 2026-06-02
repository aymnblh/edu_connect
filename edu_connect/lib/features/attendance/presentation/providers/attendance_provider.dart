import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/models/attendance_model.dart';
import '../../data/repositories/attendance_repository.dart';

final classAttendanceProvider =
    FutureProvider.family<List<AttendanceModel>, String>((ref, classId) {
  return ref.watch(attendanceRepositoryProvider).getClassAttendance(classId);
});

final studentAttendanceProvider =
    FutureProvider.family<List<AttendanceModel>, (String, String)>((ref, args) {
  final (classId, studentId) = args;
  return ref
      .watch(attendanceRepositoryProvider)
      .getAttendanceForStudent(classId, studentId);
});

class AttendanceNotifier extends StateNotifier<AsyncValue<void>> {
  final AttendanceRepository _repo;

  AttendanceNotifier(this._repo) : super(const AsyncValue.data(null));

  Future<void> mark({
    required String classId,
    required String studentId,
    required String studentName,
    required AttendanceStatus status,
    String? note,
  }) async {
    state = const AsyncValue.loading();
    try {
      await _repo.markAttendance(
        classId: classId,
        studentId: studentId,
        studentName: studentName,
        status: status,
        note: note,
      );
      state = const AsyncValue.data(null);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      rethrow;
    }
  }

  Future<void> justify({
    required String classId,
    required String attendanceId,
    required String text,
  }) async {
    state = const AsyncValue.loading();
    try {
      await _repo.justifyAbsence(
        classId: classId,
        attendanceId: attendanceId,
        text: text,
      );
      state = const AsyncValue.data(null);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      rethrow;
    }
  }
}

final attendanceNotifierProvider =
    StateNotifierProvider<AttendanceNotifier, AsyncValue<void>>((ref) {
  return AttendanceNotifier(ref.watch(attendanceRepositoryProvider));
});
