import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/services/api_service.dart';

class EmergencyContact {
  String name;
  String relationship;
  String phone;

  EmergencyContact({this.name = '', this.relationship = '', this.phone = ''});

  factory EmergencyContact.fromJson(Map<String, dynamic> json) =>
      EmergencyContact(
        name: json['name'] as String? ?? '',
        relationship: json['relationship'] as String? ?? '',
        phone: json['phone'] as String? ?? '',
      );

  Map<String, dynamic> toJson() => {
        'name': name.trim(),
        'relationship': relationship.trim(),
        'phone': phone.trim()
      };

  bool get isEmpty => name.trim().isEmpty && phone.trim().isEmpty;
}

class HealthRecord {
  final bool exists;
  final List<EmergencyContact> contacts;
  final String? allergies;
  final String? conditions;
  final String? medications;
  final String? bloodGroup;
  final String? doctorName;
  final String? doctorPhone;
  final String? instructions;
  final String? teacherAlert;
  final DateTime? consentGivenAt;
  final String? consentMethod;

  const HealthRecord({
    required this.exists,
    required this.contacts,
    this.allergies,
    this.conditions,
    this.medications,
    this.bloodGroup,
    this.doctorName,
    this.doctorPhone,
    this.instructions,
    this.teacherAlert,
    this.consentGivenAt,
    this.consentMethod,
  });

  factory HealthRecord.fromJson(Map<String, dynamic> json) => HealthRecord(
        exists: json['exists'] as bool? ?? false,
        contacts: (json['emergency_contacts'] as List<dynamic>? ?? const [])
            .map((e) => EmergencyContact.fromJson(e as Map<String, dynamic>))
            .toList(),
        allergies: json['allergies'] as String?,
        conditions: json['conditions'] as String?,
        medications: json['medications'] as String?,
        bloodGroup: json['blood_group'] as String?,
        doctorName: json['doctor_name'] as String?,
        doctorPhone: json['doctor_phone'] as String?,
        instructions: json['emergency_instructions'] as String?,
        teacherAlert: json['teacher_alert'] as String?,
        consentGivenAt: json['consent_given_at'] == null
            ? null
            : DateTime.parse(json['consent_given_at'] as String),
        consentMethod: json['consent_method'] as String?,
      );
}

class HealthAlert {
  final String studentId;
  final String studentName;
  final String alert;

  const HealthAlert(this.studentId, this.studentName, this.alert);
}

class HealthRepository {
  final ApiService _api = ApiService.instance;

  Future<HealthRecord> get(String studentId) async {
    final data =
        await _api.get('/students/$studentId/health') as Map<String, dynamic>;
    return HealthRecord.fromJson(data);
  }

  Future<HealthRecord> save(String studentId, Map<String, dynamic> body) async {
    final data = await _api.put('/students/$studentId/health', data: body)
        as Map<String, dynamic>;
    return HealthRecord.fromJson(data);
  }

  Future<void> delete(String studentId) async {
    await _api.delete('/students/$studentId/health');
  }

  Future<List<HealthAlert>> classAlerts(String classId) async {
    final data =
        await _api.get('/classes/$classId/health-alerts') as List<dynamic>;
    return data
        .map((e) => e as Map<String, dynamic>)
        .map((e) => HealthAlert(e['student_id'] as String,
            e['student_name'] as String, e['alert'] as String))
        .toList();
  }
}

final healthRepositoryProvider =
    Provider<HealthRepository>((ref) => HealthRepository());

final healthRecordProvider =
    FutureProvider.autoDispose.family<HealthRecord, String>((ref, studentId) {
  return ref.watch(healthRepositoryProvider).get(studentId);
});

final classHealthAlertsProvider = FutureProvider.autoDispose
    .family<List<HealthAlert>, String>((ref, classId) {
  return ref.watch(healthRepositoryProvider).classAlerts(classId);
});
