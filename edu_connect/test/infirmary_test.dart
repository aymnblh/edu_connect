import 'package:edu_connect/features/auth/data/models/user_model.dart';
import 'package:edu_connect/features/infirmary/infirmary_screen.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('a nurse account is recognised, not mistaken for a parent', () {
    final user = UserModel.fromJson(const {
      'id': 'n1',
      'email': 'infirmerie@ecole.dz',
      'full_name': 'Infirmerie',
      'role': 'nurse',
      'created_at': '2026-10-01T10:00:00Z',
    });
    expect(user.isNurse, isTrue);
    expect(user.isParent, isFalse);
    expect(user.isAdmin, isFalse);
  });

  test('infirmary search matches name, code and class', () {
    final student = InfirmaryStudent.fromJson({
      'student_id': 's1',
      'student_name': 'Amina Benali',
      'student_code': 'EDU26-001',
      'classes': [
        {'id': 'c1', 'name': '1AM-A'}
      ],
      'has_record': true,
      'alert': 'Allergie arachides',
    });
    expect(student.matches('amina'), isTrue);
    expect(student.matches('edu26-001'), isTrue);
    expect(student.matches('1am'), isTrue);
    expect(student.matches('yacine'), isFalse);
  });
}
