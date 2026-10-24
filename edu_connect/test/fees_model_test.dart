import 'package:edu_connect/features/fees/fees_repository.dart';
import 'package:edu_connect/features/fees/fees_screen.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('parses a child\'s fees and works out the balance after each payment',
      () {
    final fees = MyFees.fromJson({
      'school_name': 'Les Oliviers',
      'student_name': 'Amina',
      'total_remaining': 2500,
      'invoices': [
        {
          'id': 'inv-1',
          'label': 'Frais T1',
          'amount_due': 8500,
          'amount_paid': 6000,
          'remaining': 2500,
          'status': 'partial',
          'due_date': '2026-10-10T22:59:00Z',
          'days_overdue': 12,
          'payments': [
            {
              'id': 'p1',
              'amount': 4000,
              'payment_method': 'ccp',
              'receipt_number': 'REC-1',
              'paid_at': '2026-10-01T09:00:00Z'
            },
            {
              'id': 'p2',
              'amount': 2000.0,
              'payment_method': 'cash',
              'receipt_number': 'REC-2',
              'paid_at': '2026-10-15T09:00:00Z'
            },
          ],
        },
      ],
    });
    final invoice = fees.invoices.single;
    expect(fees.totalRemaining, 2500);
    expect(invoice.daysOverdue, 12);
    expect(invoice.isPaid, isFalse);
    expect(invoice.leftAfter(invoice.payments.first), 4500);
    expect(invoice.leftAfter(invoice.payments.last), 2500);
  });

  test('amounts read like Algerian dinars', () {
    expect(formatDA(8500, 'fr'), '8 500 DA');
    expect(formatDA(1234567.5, 'fr'), '1 234 567,50 DA');
    expect(formatDA(300, 'ar'), '300 دج');
  });
}
