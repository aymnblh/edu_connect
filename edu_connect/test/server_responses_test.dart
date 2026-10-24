// Parses responses captured from the real API (local demo data) so the app's
// models stay in step with what the server sends.
import 'dart:convert';
import 'dart:io';

import 'package:edu_connect/features/director/director_repository.dart';
import 'package:edu_connect/features/director/monthly_report_screen.dart';
import 'package:edu_connect/features/fees/fees_repository.dart';
import 'package:edu_connect/features/infirmary/infirmary_screen.dart';
import 'package:flutter_test/flutter_test.dart';

dynamic fixture(String name) =>
    jsonDecode(File('test/fixtures/$name').readAsStringSync());

void main() {
  test('monthly report', () {
    final report = MonthlyReport.fromJson(fixture('monthly_report.json'));
    expect(report.month, matches(RegExp(r'^\d{4}-\d{2}$')));
    expect(report.current.attendanceRate, isNotNull);
    expect(report.current.activeParents, greaterThan(0));
    expect(report.availableMonths, isNotEmpty);
    expect(report.classAttendance, isNotEmpty);
  });

  test('fee ledger', () {
    final ledger = FeeLedger.fromJson(fixture('fee_ledger.json'));
    expect(ledger.billed, greaterThan(0));
    expect(ledger.rows, isNotEmpty);
    final row = ledger.rows.first;
    expect(row.studentName, isNotEmpty);
    expect(row.invoice.amountDue, greaterThan(0));
  });

  test('setup status', () {
    final status = SetupStatus.fromJson(fixture('setup_status.json'));
    expect(status.total, status.steps.length);
    expect(status.steps.first.key, 'logo');
  });

  test('infirmary list', () {
    final students = (fixture('infirmary_students.json') as List)
        .map((e) => InfirmaryStudent.fromJson(e as Map<String, dynamic>))
        .toList();
    expect(students, isNotEmpty);
    expect(students.first.name, isNotEmpty);
  });

  test('parent fees', () {
    final fees = MyFees.fromJson(fixture('my_fees.json'));
    expect(fees.invoices, isNotEmpty);
    expect(fees.schoolName, isNotEmpty);
  });

  test('changes next to last month are signed, not coloured', () {
    expect(delta(12, 10), '+2');
    expect(delta(10, 12), '-2');
    expect(delta(5, 5), '=');
    expect(delta(94.2, 93.0), '+1.2');
  });
}
