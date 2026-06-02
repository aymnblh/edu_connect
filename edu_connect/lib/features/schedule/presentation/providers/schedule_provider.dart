import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/models/schedule_model.dart';
import '../../data/repositories/schedule_repository.dart';

// ── Repository ───────────────────────────────────────────────────────────────

final scheduleRepositoryProvider = Provider<ScheduleRepository>((ref) {
  return ScheduleRepository();
});

// ── Schedule State ────────────────────────────────────────────────────────────

class ScheduleState {
  final List<ScheduleSlotModel> slots;
  final bool isLoading;
  final String? error;
  final String? successMessage;

  const ScheduleState({
    this.slots = const [],
    this.isLoading = false,
    this.error,
    this.successMessage,
  });

  ScheduleState copyWith({
    List<ScheduleSlotModel>? slots,
    bool? isLoading,
    String? error,
    String? successMessage,
  }) =>
      ScheduleState(
        slots: slots ?? this.slots,
        isLoading: isLoading ?? this.isLoading,
        error: error,
        successMessage: successMessage,
      );

  /// Group slots by day_of_week for the weekly view.
  Map<int, List<ScheduleSlotModel>> get byDay {
    final map = <int, List<ScheduleSlotModel>>{};
    for (final slot in slots) {
      map.putIfAbsent(slot.dayOfWeek, () => []).add(slot);
    }
    // Sort each day's slots by start_time
    for (final list in map.values) {
      list.sort((a, b) => a.startTime.compareTo(b.startTime));
    }
    return map;
  }
}

class ScheduleNotifier extends StateNotifier<ScheduleState> {
  final ScheduleRepository _repo;
  final String _classId;

  ScheduleNotifier(this._repo, this._classId)
      : super(const ScheduleState(isLoading: true)) {
    load();
  }

  Future<void> load() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final slots = await _repo.getClassSchedule(_classId);
      state = state.copyWith(slots: slots, isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<bool> createSlot({
    required String courseName,
    required String teacherId,
    required int dayOfWeek,
    required String startTime,
    required String endTime,
    String? room,
  }) async {
    try {
      await _repo.createSlot(
        classId: _classId,
        courseName: courseName,
        teacherId: teacherId,
        dayOfWeek: dayOfWeek,
        startTime: startTime,
        endTime: endTime,
        room: room,
      );
      await load();
      state = state.copyWith(
          successMessage: 'Créneau ajouté. Les parents ont été notifiés.');
      return true;
    } catch (e) {
      state = state.copyWith(error: e.toString());
      return false;
    }
  }

  Future<bool> updateSlot(
    String slotId, {
    String? courseName,
    String? teacherId,
    int? dayOfWeek,
    String? startTime,
    String? endTime,
    String? room,
  }) async {
    try {
      await _repo.updateSlot(
        slotId,
        courseName: courseName,
        teacherId: teacherId,
        dayOfWeek: dayOfWeek,
        startTime: startTime,
        endTime: endTime,
        room: room,
      );
      await load();
      state = state.copyWith(
          successMessage: 'Planning mis à jour. Les parents ont été notifiés.');
      return true;
    } catch (e) {
      state = state.copyWith(error: e.toString());
      return false;
    }
  }

  Future<bool> deleteSlot(String slotId) async {
    try {
      await _repo.deleteSlot(slotId);
      await load();
      state = state.copyWith(
          successMessage: 'Créneau supprimé. Les parents ont été notifiés.');
      return true;
    } catch (e) {
      state = state.copyWith(error: e.toString());
      return false;
    }
  }

  Future<bool> cancelSession({
    required String slotId,
    required String cancelledDate,
    String? reason,
  }) async {
    try {
      await _repo.cancelSession(
        slotId: slotId,
        cancelledDate: cancelledDate,
        reason: reason,
      );
      await load();
      state = state.copyWith(
          successMessage: 'Séance annulée. Les parents ont été notifiés.');
      return true;
    } catch (e) {
      state = state.copyWith(error: e.toString());
      return false;
    }
  }
}

final scheduleProvider =
    StateNotifierProvider.family<ScheduleNotifier, ScheduleState, String>(
        (ref, classId) {
  final repo = ref.watch(scheduleRepositoryProvider);
  return ScheduleNotifier(repo, classId);
});
