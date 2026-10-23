import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/services/api_service.dart';

double _num(dynamic value) => (value as num?)?.toDouble() ?? 0;

DateTime? _date(dynamic value) =>
    value == null ? null : DateTime.parse(value as String).toLocal();

class FeePayment {
  final String id;
  final double amount;
  final String method;
  final String receiptNumber;
  final String? notes;
  final DateTime paidAt;

  const FeePayment({
    required this.id,
    required this.amount,
    required this.method,
    required this.receiptNumber,
    required this.paidAt,
    this.notes,
  });

  factory FeePayment.fromJson(Map<String, dynamic> json) => FeePayment(
        id: json['id'] as String,
        amount: _num(json['amount']),
        method: json['payment_method'] as String? ?? 'cash',
        receiptNumber: json['receipt_number'] as String? ?? '',
        notes: json['notes'] as String?,
        paidAt: _date(json['paid_at']) ?? DateTime.now(),
      );
}

class FeeInvoice {
  final String id;
  final String label;
  final double amountDue;
  final double amountPaid;
  final double remaining;
  final String status;
  final DateTime? dueDate;
  final int daysOverdue;
  final List<FeePayment> payments;

  const FeeInvoice({
    required this.id,
    required this.label,
    required this.amountDue,
    required this.amountPaid,
    required this.remaining,
    required this.status,
    required this.daysOverdue,
    required this.payments,
    this.dueDate,
  });

  bool get isPaid => status == 'paid';

  factory FeeInvoice.fromJson(Map<String, dynamic> json) => FeeInvoice(
        id: json['id'] as String,
        label: json['label'] as String? ?? '',
        amountDue: _num(json['amount_due']),
        amountPaid: _num(json['amount_paid']),
        remaining: _num(json['remaining']),
        status: json['status'] as String? ?? 'unpaid',
        dueDate: _date(json['due_date']),
        daysOverdue: (json['days_overdue'] as num?)?.toInt() ?? 0,
        payments: (json['payments'] as List<dynamic>? ?? const [])
            .map((e) => FeePayment.fromJson(e as Map<String, dynamic>))
            .toList(),
      );

  /// What was left to pay right after [payment].
  double leftAfter(FeePayment payment) {
    final paid = payments
        .where((p) => !p.paidAt.isAfter(payment.paidAt))
        .fold<double>(0, (sum, p) => sum + p.amount);
    final left = amountDue - paid;
    return left > 0 ? left : 0;
  }
}

class MyFees {
  final String schoolName;
  final String studentName;
  final double totalRemaining;
  final List<FeeInvoice> invoices;

  const MyFees({
    required this.schoolName,
    required this.studentName,
    required this.totalRemaining,
    required this.invoices,
  });

  factory MyFees.fromJson(Map<String, dynamic> json) => MyFees(
        schoolName: json['school_name'] as String? ?? '',
        studentName: json['student_name'] as String? ?? '',
        totalRemaining: _num(json['total_remaining']),
        invoices: (json['invoices'] as List<dynamic>? ?? const [])
            .map((e) => FeeInvoice.fromJson(e as Map<String, dynamic>))
            .toList(),
      );
}

class FeesRepository {
  final ApiService _api = ApiService.instance;

  Future<MyFees> myFees(String studentId) async {
    final data =
        await _api.get('/finance/my-fees', query: {'student_id': studentId})
            as Map<String, dynamic>;
    return MyFees.fromJson(data);
  }
}

final feesRepositoryProvider =
    Provider<FeesRepository>((ref) => FeesRepository());

final myFeesProvider =
    FutureProvider.autoDispose.family<MyFees, String>((ref, studentId) {
  return ref.watch(feesRepositoryProvider).myFees(studentId);
});
