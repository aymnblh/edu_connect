import 'package:edu_connect/features/report_cards/data/report_card_repository.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('parses a published report card snapshot', () {
    final card = ReportCardDetail.fromJson({
      'id': 'rc1',
      'semester_name': 'Trimester 1',
      'class_name': '3A',
      'overall_average': 12.67,
      'rank': 2,
      'class_size': 28,
      'published_at': '2026-12-20T09:00:00Z',
      'data': {
        'school_name': 'Ecole Demo',
        'student_name': 'Amine',
        'student_number': 'EDU26-001',
        'period_start': '2026-09-15',
        'period_end': '2026-12-15',
        'subjects': [
          {
            'subject': 'Math',
            'coefficient': 4,
            'average': 14.0,
            'class_average': 15.0
          },
          {
            'subject': 'Dessin',
            'coefficient': 1,
            'average': null,
            'class_average': null
          },
        ],
        'class_average': 13.2,
        'attendance': {'absences': 2, 'justified_absences': 1, 'lates': 1},
      },
    });

    expect(card.summary.rank, 2);
    expect(card.summary.overallAverage, 12.67);
    expect(card.subjects.first.coefficient, 4.0);
    expect(card.subjects.last.average, isNull);
    expect(card.studentNumber, 'EDU26-001');
    expect((card.absences, card.justifiedAbsences, card.lates), (2, 1, 1));
  });
}
