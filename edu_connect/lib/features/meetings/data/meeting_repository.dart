import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/services/api_service.dart';

/// Algeria is UTC+1 all year; slots are shown in school time on every device.
const schoolUtcOffset = Duration(hours: 1);

DateTime toSchoolTime(DateTime utc) => utc.toUtc().add(schoolUtcOffset);

class MeetingSlotModel {
  final String id;
  final String teacherId;
  final String? teacherName;
  final String? className;
  final DateTime startsAt;
  final DateTime endsAt;
  final String? location;
  final bool isBooked;
  final bool bookedByMe;
  final String? parentName;
  final String? studentId;
  final String? studentName;
  final String? note;

  const MeetingSlotModel({
    required this.id,
    required this.teacherId,
    this.teacherName,
    this.className,
    required this.startsAt,
    required this.endsAt,
    this.location,
    required this.isBooked,
    required this.bookedByMe,
    this.parentName,
    this.studentId,
    this.studentName,
    this.note,
  });

  factory MeetingSlotModel.fromJson(Map<String, dynamic> json) =>
      MeetingSlotModel(
        id: json['id'] as String,
        teacherId: json['teacher_id'] as String,
        teacherName: json['teacher_name'] as String?,
        className: json['class_name'] as String?,
        startsAt: DateTime.parse(json['starts_at'] as String),
        endsAt: DateTime.parse(json['ends_at'] as String),
        location: json['location'] as String?,
        isBooked: json['is_booked'] as bool? ?? false,
        bookedByMe: json['booked_by_me'] as bool? ?? false,
        parentName: json['parent_name'] as String?,
        studentId: json['student_id'] as String?,
        studentName: json['student_name'] as String?,
        note: json['note'] as String?,
      );
}

String _two(int value) => value.toString().padLeft(2, '0');

class MeetingRepository {
  final ApiService _api = ApiService.instance;

  Future<List<MeetingSlotModel>> list() async {
    final data = await _api.get('/meetings/slots') as List<dynamic>;
    return data
        .map((e) => MeetingSlotModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// [day] is a school-calendar day; times are school time (HH:mm).
  Future<int> open({
    required DateTime day,
    required int startMinutes,
    required int endMinutes,
    required int slotMinutes,
    String? location,
    String? classId,
  }) async {
    String hhmm(int minutes) => '${_two(minutes ~/ 60)}:${_two(minutes % 60)}';
    final data = await _api.post('/meetings/slots', data: {
      'date': '${day.year}-${_two(day.month)}-${_two(day.day)}',
      'start_time': hhmm(startMinutes),
      'end_time': hhmm(endMinutes),
      'slot_minutes': slotMinutes,
      'location': location,
      'class_id': classId,
    }) as List<dynamic>;
    return data.length;
  }

  Future<void> book(String slotId,
      {required String studentId, String? note}) async {
    await _api.post('/meetings/slots/$slotId/book',
        data: {'student_id': studentId, 'note': note});
  }

  Future<void> cancel(String slotId) async {
    await _api.post('/meetings/slots/$slotId/cancel');
  }

  Future<void> delete(String slotId) async {
    await _api.delete('/meetings/slots/$slotId');
  }
}

final meetingRepositoryProvider =
    Provider<MeetingRepository>((ref) => MeetingRepository());

final meetingSlotsProvider =
    FutureProvider.autoDispose<List<MeetingSlotModel>>((ref) {
  return ref.watch(meetingRepositoryProvider).list();
});
