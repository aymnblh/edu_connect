import 'package:edu_connect/features/auth/data/models/user_model.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('the profile says when the session is the public demo', () {
    final base = {
      'id': 'u1',
      'email': 'parent.nadia@demo.educonnect.dz',
      'full_name': 'Nadia',
      'role': 'parent',
      'created_at': '2026-10-01T10:00:00Z',
    };
    expect(UserModel.fromJson({...base, 'is_demo': true}).isDemo, isTrue);
    expect(UserModel.fromJson(base).isDemo, isFalse);
  });
}
