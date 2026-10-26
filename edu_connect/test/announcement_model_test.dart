import 'package:edu_connect/features/announcements/data/announcement_repository.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('parses calendar dates and manager-only read counts', () {
    final managed = AnnouncementModel.fromJson({
      'id': 'a1',
      'title': 'Vacances d\'hiver',
      'body': 'Reprise le 4 janvier.',
      'category': 'holiday',
      'starts_on': '2026-12-20',
      'ends_on': '2027-01-04',
      'whole_school': true,
      'class_ids': <String>[],
      'author_name': 'Direction',
      'created_at': '2026-10-13T08:00:00Z',
      'is_read': false,
      'read_count': 12,
      'recipient_count': 40,
    });

    expect(managed.startsOn, DateTime(2026, 12, 20));
    expect(managed.endsOn, DateTime(2027, 1, 4));
    expect(managed.canManage, isTrue);

    final forParent = AnnouncementModel.fromJson({
      'id': 'a2',
      'title': 'Sortie',
      'body': 'Musee',
      'category': 'event',
      'starts_on': '2026-11-05',
      'ends_on': null,
      'whole_school': false,
      'class_ids': ['class-a'],
      'created_at': '2026-10-13T08:00:00Z',
      'is_read': true,
      'read_count': null,
      'recipient_count': null,
    });

    expect(forParent.canManage, isFalse);
    expect(forParent.classIds, ['class-a']);
    expect(forParent.endsOn, isNull);
  });
}
