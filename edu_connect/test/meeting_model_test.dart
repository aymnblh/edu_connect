import 'package:edu_connect/features/meetings/data/meeting_repository.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('slots are shown in Algeria time whatever the device time zone', () {
    final slot = MeetingSlotModel.fromJson({
      'id': 's1',
      'teacher_id': 't1',
      'teacher_name': 'M. Karim',
      'starts_at': '2026-11-05T15:00:00+00:00',
      'ends_at': '2026-11-05T15:15:00+00:00',
      'is_booked': true,
      'booked_by_me': false,
      'parent_name': null,
    });

    final local = toSchoolTime(slot.startsAt);
    expect((local.hour, local.minute), (16, 0));
    expect(slot.isBooked && !slot.bookedByMe, isTrue);
    expect(slot.parentName, isNull);
  });
}
