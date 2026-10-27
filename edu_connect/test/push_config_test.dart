import 'package:edu_connect/core/constants/app_constants.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('push through Firebase stays off unless the build is given the settings',
      () {
    // Tests (and builds without --dart-define) carry no Firebase settings.
    expect(AppConstants.hasFirebase, isFalse);
  });
}
