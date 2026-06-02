class CancellationModel {
  final String id;
  final String slotId;
  final String cancelledDate;
  final String? reason;
  final String cancelledBy;
  final DateTime createdAt;

  const CancellationModel({
    required this.id,
    required this.slotId,
    required this.cancelledDate,
    this.reason,
    required this.cancelledBy,
    required this.createdAt,
  });

  factory CancellationModel.fromJson(Map<String, dynamic> json) {
    return CancellationModel(
      id: json['id'] as String,
      slotId: json['slot_id'] as String,
      cancelledDate: json['cancelled_date'] as String,
      reason: json['reason'] as String?,
      cancelledBy: json['cancelled_by'] as String,
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }

  /// True if this cancellation applies to [date] (format "YYYY-MM-DD")
  bool isForDate(String date) => cancelledDate == date;
}

class ScheduleSlotModel {
  final String id;
  final String schoolId;
  final String classId;
  final String courseName;
  final String teacherId;
  final String? teacherName;
  final int dayOfWeek; // 0=Mon … 6=Sun
  final String dayName; // "Lundi" … "Dimanche"
  final String startTime; // "HH:MM"
  final String endTime; // "HH:MM"
  final String? room;
  final String createdBy;
  final DateTime createdAt;
  final DateTime updatedAt;
  final List<CancellationModel> cancellations;

  const ScheduleSlotModel({
    required this.id,
    required this.schoolId,
    required this.classId,
    required this.courseName,
    required this.teacherId,
    this.teacherName,
    required this.dayOfWeek,
    required this.dayName,
    required this.startTime,
    required this.endTime,
    this.room,
    required this.createdBy,
    required this.createdAt,
    required this.updatedAt,
    this.cancellations = const [],
  });

  /// Returns true if the slot is cancelled on [date] (format "YYYY-MM-DD").
  bool isCancelledOn(String date) =>
      cancellations.any((c) => c.cancelledDate == date);

  factory ScheduleSlotModel.fromJson(Map<String, dynamic> json) {
    return ScheduleSlotModel(
      id: json['id'] as String,
      schoolId: json['school_id'] as String,
      classId: json['class_id'] as String,
      courseName: json['course_name'] as String,
      teacherId: json['teacher_id'] as String,
      teacherName: json['teacher_name'] as String?,
      dayOfWeek: json['day_of_week'] as int,
      dayName: json['day_name'] as String? ?? '',
      startTime: json['start_time'] as String,
      endTime: json['end_time'] as String,
      room: json['room'] as String?,
      createdBy: json['created_by'] as String,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
      cancellations: (json['cancellations'] as List<dynamic>? ?? [])
          .map((c) => CancellationModel.fromJson(c as Map<String, dynamic>))
          .toList(),
    );
  }
}
