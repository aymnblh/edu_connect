import 'package:edu_connect/features/health/health_repository.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('parses a health record and trims contacts on save', () {
    final record = HealthRecord.fromJson({
      'exists': true,
      'student_id': 's1',
      'emergency_contacts': [
        {
          'name': 'Nadia Benali',
          'relationship': 'mere',
          'phone': '0555 12 34 56'
        },
      ],
      'allergies': 'Arachides',
      'blood_group': 'O+',
      'teacher_alert': 'Allergie arachides',
      'consent_given_at': '2026-10-01T10:00:00Z',
      'consent_method': 'app',
    });
    expect(record.exists, isTrue);
    expect(record.contacts.single.phone, '0555 12 34 56');
    expect(record.bloodGroup, 'O+');
    expect(record.consentMethod, 'app');

    final contact =
        EmergencyContact(name: '  Karim ', phone: ' 0661 00 00 00 ');
    expect(contact.toJson(),
        {'name': 'Karim', 'relationship': '', 'phone': '0661 00 00 00'});
    expect(EmergencyContact().isEmpty, isTrue);
  });

  test('a student without a sheet is reported as not existing', () {
    final empty = HealthRecord.fromJson(
        {'exists': false, 'student_id': 's2', 'emergency_contacts': []});
    expect(empty.exists, isFalse);
    expect(empty.contacts, isEmpty);
  });
}
