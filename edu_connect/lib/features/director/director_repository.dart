import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/services/api_service.dart';
import '../fees/fees_repository.dart';

double _num(dynamic value) => (value as num?)?.toDouble() ?? 0;

/// One month of activity (GET /admin/reports/monthly), the figures the app shows.
class MonthlyActivity {
  final double? attendanceRate;
  final int absences;
  final int unjustifiedAbsences;
  final int lates;
  final int parentNotifications;
  final int activeParents;
  final int activeTeachers;
  final int gradesEntered;
  final int homeworkPosted;
  final int messages;
  final int meetingsBooked;
  final double feesCollected;

  const MonthlyActivity({
    required this.attendanceRate,
    required this.absences,
    required this.unjustifiedAbsences,
    required this.lates,
    required this.parentNotifications,
    required this.activeParents,
    required this.activeTeachers,
    required this.gradesEntered,
    required this.homeworkPosted,
    required this.messages,
    required this.meetingsBooked,
    required this.feesCollected,
  });

  factory MonthlyActivity.fromJson(Map<String, dynamic> json) {
    int count(String key) => (json[key] as num?)?.toInt() ?? 0;
    return MonthlyActivity(
      attendanceRate: (json['attendance_rate'] as num?)?.toDouble(),
      absences: count('absences'),
      unjustifiedAbsences: count('unjustified_absences'),
      lates: count('lates'),
      parentNotifications: count('parent_notifications'),
      activeParents: count('active_parents'),
      activeTeachers: count('active_teachers'),
      gradesEntered: count('grades_entered'),
      homeworkPosted: count('homework_posted'),
      messages: count('messages'),
      meetingsBooked: count('meetings_booked'),
      feesCollected: _num(json['fees_collected']),
    );
  }
}

class MonthlyReport {
  final String month;
  final String previousMonth;
  final bool isPartial;
  final MonthlyActivity current;
  final MonthlyActivity previous;
  final double? parentCoverage;
  final List<String> availableMonths;
  final List<(String, double?)> classAttendance;

  const MonthlyReport({
    required this.month,
    required this.previousMonth,
    required this.isPartial,
    required this.current,
    required this.previous,
    required this.parentCoverage,
    required this.availableMonths,
    required this.classAttendance,
  });

  factory MonthlyReport.fromJson(Map<String, dynamic> json) => MonthlyReport(
        month: json['month'] as String,
        previousMonth: json['previous_month'] as String,
        isPartial: json['is_partial'] as bool? ?? false,
        current:
            MonthlyActivity.fromJson(json['current'] as Map<String, dynamic>),
        previous:
            MonthlyActivity.fromJson(json['previous'] as Map<String, dynamic>),
        parentCoverage: (json['parent_coverage'] as num?)?.toDouble(),
        availableMonths:
            (json['available_months'] as List<dynamic>? ?? []).cast<String>(),
        classAttendance: (json['class_attendance'] as List<dynamic>? ?? [])
            .map((e) => e as Map<String, dynamic>)
            .map((e) => (
                  e['class_name'] as String? ?? '',
                  (e['attendance_rate'] as num?)?.toDouble()
                ))
            .toList(),
      );
}

class SetupStep {
  final String key;
  final bool done;
  final int count;
  final int? total;

  const SetupStep(
      {required this.key, required this.done, required this.count, this.total});
}

class SetupStatus {
  final bool dismissed;
  final int completed;
  final int total;
  final List<SetupStep> steps;

  const SetupStatus(
      {required this.dismissed,
      required this.completed,
      required this.total,
      required this.steps});

  bool get visible => !dismissed && completed < total;

  factory SetupStatus.fromJson(Map<String, dynamic> json) => SetupStatus(
        dismissed: json['dismissed'] as bool? ?? false,
        completed: (json['completed'] as num?)?.toInt() ?? 0,
        total: (json['total'] as num?)?.toInt() ?? 0,
        steps: (json['steps'] as List<dynamic>? ?? [])
            .map((e) => e as Map<String, dynamic>)
            .map((e) => SetupStep(
                  key: e['key'] as String,
                  done: e['done'] as bool? ?? false,
                  count: (e['count'] as num?)?.toInt() ?? 0,
                  total: (e['total'] as num?)?.toInt(),
                ))
            .toList(),
      );
}

class LedgerRow {
  final FeeInvoice invoice;
  final String studentName;
  final List<String> classes;
  final int parentsLinked;

  const LedgerRow({
    required this.invoice,
    required this.studentName,
    required this.classes,
    required this.parentsLinked,
  });

  factory LedgerRow.fromJson(Map<String, dynamic> json) => LedgerRow(
        invoice: FeeInvoice.fromJson(json),
        studentName: json['student_name'] as String? ?? '',
        classes: (json['classes'] as List<dynamic>? ?? [])
            .map((e) => (e as Map<String, dynamic>)['name'] as String)
            .toList(),
        parentsLinked: (json['parents_linked'] as num?)?.toInt() ?? 0,
      );
}

class FeeLedger {
  final String schoolName;
  final double billed;
  final double collected;
  final double outstanding;
  final double overdue;
  final int overdueStudents;
  final List<LedgerRow> rows;

  const FeeLedger({
    required this.schoolName,
    required this.billed,
    required this.collected,
    required this.outstanding,
    required this.overdue,
    required this.overdueStudents,
    required this.rows,
  });

  factory FeeLedger.fromJson(Map<String, dynamic> json) {
    final summary = json['summary'] as Map<String, dynamic>;
    return FeeLedger(
      schoolName: json['school_name'] as String? ?? '',
      billed: _num(summary['billed']),
      collected: _num(summary['collected']),
      outstanding: _num(summary['outstanding']),
      overdue: _num(summary['overdue']),
      overdueStudents: (summary['overdue_students'] as num?)?.toInt() ?? 0,
      rows: (json['invoices'] as List<dynamic>? ?? [])
          .map((e) => LedgerRow.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}

class DirectorRepository {
  final ApiService _api = ApiService.instance;

  Future<MonthlyReport> monthlyReport(String? month) async =>
      MonthlyReport.fromJson(await _api.get('/admin/reports/monthly',
              query: month == null ? null : {'month': month})
          as Map<String, dynamic>);

  Future<SetupStatus> setupStatus() async => SetupStatus.fromJson(
      await _api.get('/admin/setup-status') as Map<String, dynamic>);

  Future<FeeLedger> ledger() async => FeeLedger.fromJson(
      await _api.get('/finance/ledger') as Map<String, dynamic>);

  Future<FeePayment> recordPayment(
      String invoiceId, double amount, String method, String? notes) async {
    final data = await _api.post('/finance/invoices/$invoiceId/payments',
        data: {'amount': amount, 'payment_method': method, 'notes': notes});
    return FeePayment.fromJson(data as Map<String, dynamic>);
  }

  Future<Map<String, dynamic>> remind(List<String> invoiceIds,
      {bool allOverdue = false}) async {
    return await _api.post('/finance/reminders',
            data: {'invoice_ids': invoiceIds, 'all_overdue': allOverdue})
        as Map<String, dynamic>;
  }
}

final directorRepositoryProvider =
    Provider<DirectorRepository>((ref) => DirectorRepository());

final monthlyReportProvider = FutureProvider.autoDispose
    .family<MonthlyReport, String?>((ref, month) =>
        ref.watch(directorRepositoryProvider).monthlyReport(month));

final setupStatusProvider = FutureProvider.autoDispose<SetupStatus>(
    (ref) => ref.watch(directorRepositoryProvider).setupStatus());

final feeLedgerProvider = FutureProvider.autoDispose<FeeLedger>(
    (ref) => ref.watch(directorRepositoryProvider).ledger());
