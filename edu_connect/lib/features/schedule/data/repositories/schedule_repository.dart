import '../../../../core/services/api_service.dart';
import '../models/schedule_model.dart';

class ScheduleRepository {
  final ApiService _api = ApiService.instance;

  /// Get the full weekly timetable for a class.
  Future<List<ScheduleSlotModel>> getClassSchedule(String classId) async {
    final data = await _api.get('/schedule/class/$classId') as List<dynamic>;
    return data
        .map((e) => ScheduleSlotModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// Create a new timetable slot (principal only).
  Future<ScheduleSlotModel> createSlot({
    required String classId,
    required String courseName,
    required String teacherId,
    required int dayOfWeek,
    required String startTime,
    required String endTime,
    String? room,
  }) async {
    final data = await _api.post('/schedule/', data: {
      'class_id': classId,
      'course_name': courseName,
      'teacher_id': teacherId,
      'day_of_week': dayOfWeek,
      'start_time': startTime,
      'end_time': endTime,
      if (room != null) 'room': room,
    });
    return ScheduleSlotModel.fromJson(data as Map<String, dynamic>);
  }

  /// Update an existing slot (principal only).
  Future<ScheduleSlotModel> updateSlot(
    String slotId, {
    String? courseName,
    String? teacherId,
    int? dayOfWeek,
    String? startTime,
    String? endTime,
    String? room,
  }) async {
    final body = <String, dynamic>{
      if (courseName != null) 'course_name': courseName,
      if (teacherId != null) 'teacher_id': teacherId,
      if (dayOfWeek != null) 'day_of_week': dayOfWeek,
      if (startTime != null) 'start_time': startTime,
      if (endTime != null) 'end_time': endTime,
      if (room != null) 'room': room,
    };
    final data = await _api.put('/schedule/$slotId', data: body);
    return ScheduleSlotModel.fromJson(data as Map<String, dynamic>);
  }

  /// Delete a slot (principal only).
  Future<void> deleteSlot(String slotId) async {
    await _api.delete('/schedule/$slotId');
  }

  /// Cancel a specific session date (teacher or principal).
  Future<CancellationModel> cancelSession({
    required String slotId,
    required String cancelledDate,
    String? reason,
  }) async {
    final data = await _api.post('/schedule/$slotId/cancel', data: {
      'cancelled_date': cancelledDate,
      if (reason != null && reason.isNotEmpty) 'reason': reason,
    });
    return CancellationModel.fromJson(data as Map<String, dynamic>);
  }
}
