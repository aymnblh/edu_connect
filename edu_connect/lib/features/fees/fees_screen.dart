import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../core/theme/app_theme.dart';
import '../../core/widgets/child_switcher_bar.dart';
import '../../core/widgets/shimmer_loading.dart';
import '../auth/presentation/providers/children_provider.dart';
import 'fees_repository.dart';

String _message(Object error) {
  if (error is DioException && error.response?.data is Map) {
    final detail = (error.response!.data as Map)['detail'];
    if (detail is String) return detail;
  }
  return '$error';
}

/// 8500 -> "8 500 DA", 8500.5 -> "8 500,50 DA" (same as the receipts).
String formatDA(double value, String languageCode) {
  final cents = (value * 100).round();
  final whole = (cents ~/ 100)
      .toString()
      .replaceAllMapped(RegExp(r'\B(?=(\d{3})+(?!\d))'), (_) => ' ');
  final rest = cents % 100;
  final number =
      rest == 0 ? whole : '$whole,${rest.toString().padLeft(2, '0')}';
  return '$number ${languageCode == 'ar' ? 'دج' : 'DA'}';
}

/// Parent screen: the selected child's school fees and receipts.
class FeesScreen extends ConsumerWidget {
  const FeesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final text = _FText.of(context);
    final child = ref.watch(selectedChildProvider);
    return Scaffold(
      appBar: AppBar(title: Text(text.title)),
      body: Column(
        children: [
          const ChildSwitcherBar(),
          Expanded(
            child: child == null
                ? const ShimmerList(showAvatar: false)
                : ref.watch(myFeesProvider(child.id)).when(
                      loading: () => const ShimmerList(showAvatar: false),
                      error: (e, _) => Center(child: Text(_message(e))),
                      data: (fees) => RefreshIndicator(
                        onRefresh: () =>
                            ref.refresh(myFeesProvider(child.id).future),
                        child: _FeesList(fees: fees),
                      ),
                    ),
          ),
        ],
      ),
    );
  }
}

class _FeesList extends StatelessWidget {
  final MyFees fees;

  const _FeesList({required this.fees});

  @override
  Widget build(BuildContext context) {
    final text = _FText.of(context);
    final lang = text.code;
    final theme = Theme.of(context);
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Card(
          color: theme.colorScheme.primaryContainer,
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(children: [
              const Icon(Icons.account_balance_wallet_outlined),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  fees.totalRemaining > 0
                      ? text.left(formatDA(fees.totalRemaining, lang))
                      : text.nothingDue,
                  style: theme.textTheme.titleMedium,
                ),
              ),
            ]),
          ),
        ),
        if (fees.invoices.isEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 24),
            child: Text(text.empty, textAlign: TextAlign.center),
          ),
        for (final invoice in fees.invoices)
          _InvoiceCard(invoice: invoice, fees: fees),
        const SizedBox(height: 8),
        Text(text.how, style: theme.textTheme.bodySmall),
      ],
    );
  }
}

class _InvoiceCard extends StatelessWidget {
  final FeeInvoice invoice;
  final MyFees fees;

  const _InvoiceCard({required this.invoice, required this.fees});

  @override
  Widget build(BuildContext context) {
    final text = _FText.of(context);
    final lang = text.code;
    final theme = Theme.of(context);
    final colors = context.appColors;
    final date = DateFormat('dd/MM/yyyy');
    final (label, color) = invoice.isPaid
        ? (text.paid, Colors.green.shade700)
        : invoice.daysOverdue > 0
            ? (text.overdue(invoice.daysOverdue), theme.colorScheme.error)
            : (text.unpaid, colors.warningAmber);

    Widget figure(String name, String value, {bool strong = false}) => Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(name, style: TextStyle(color: colors.mutedText, fontSize: 12)),
            Text(value,
                style: TextStyle(
                    fontWeight: strong ? FontWeight.w700 : FontWeight.w500)),
          ],
        );

    return Card(
      margin: const EdgeInsets.only(top: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(children: [
              Expanded(
                  child:
                      Text(invoice.label, style: theme.textTheme.titleSmall)),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(12),
                ),
                child:
                    Text(label, style: TextStyle(color: color, fontSize: 12)),
              ),
            ]),
            const SizedBox(height: 12),
            Wrap(spacing: 24, runSpacing: 8, children: [
              figure(text.amount, formatDA(invoice.amountDue, lang)),
              figure(text.paidLabel, formatDA(invoice.amountPaid, lang)),
              figure(text.remaining, formatDA(invoice.remaining, lang),
                  strong: true),
              if (invoice.dueDate != null)
                figure(text.dueDate, date.format(invoice.dueDate!)),
            ]),
            for (final payment in invoice.payments)
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.receipt_long_outlined),
                title: Text(formatDA(payment.amount, lang)),
                subtitle: Text(
                    '${date.format(payment.paidAt)} · ${text.method(payment.method)}'),
                trailing: TextButton(
                  onPressed: () => _showReceipt(context, invoice, payment),
                  child: Text(text.receipt),
                ),
              ),
          ],
        ),
      ),
    );
  }

  void _showReceipt(
      BuildContext context, FeeInvoice invoice, FeePayment payment) {
    final text = _FText.of(context);
    final lang = text.code;
    final left = invoice.leftAfter(payment);
    showModalBottomSheet<void>(
      context: context,
      useSafeArea: true,
      isScrollControlled: true,
      builder: (ctx) {
        Widget row(String name, String value) => Padding(
              padding: const EdgeInsets.symmetric(vertical: 4),
              child: Row(children: [
                Expanded(child: Text(name)),
                Flexible(
                    child: Text(value,
                        textAlign: TextAlign.end,
                        style: const TextStyle(fontWeight: FontWeight.w600))),
              ]),
            );
        return Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(fees.schoolName, style: Theme.of(ctx).textTheme.titleMedium),
              Text(text.receiptTitle),
              const Divider(height: 24),
              row(text.receiptNumber, payment.receiptNumber),
              row(text.date, DateFormat('dd/MM/yyyy').format(payment.paidAt)),
              row(text.student, fees.studentName),
              row(text.fee, invoice.label),
              row(text.methodLabel, text.method(payment.method)),
              row(text.amountReceived, formatDA(payment.amount, lang)),
              row(text.leftAfter,
                  left > 0 ? formatDA(left, lang) : text.settled),
              const SizedBox(height: 12),
              Text(text.receiptFooter,
                  style: Theme.of(ctx).textTheme.bodySmall),
            ],
          ),
        );
      },
    );
  }
}

class _FText {
  final String code;
  const _FText(this.code);

  static _FText of(BuildContext context) =>
      _FText(Localizations.localeOf(context).languageCode);

  String pick(String ar, String fr, String en) =>
      code == 'ar' ? ar : (code == 'fr' ? fr : en);

  String get title =>
      pick('المصاريف المدرسية', 'Frais scolaires', 'School fees');
  String left(String amount) => pick(
      'الباقي للدفع لهذا الطفل: $amount',
      'Reste a payer pour cet enfant : $amount',
      'Left to pay for this child: $amount');
  String get nothingDue => pick(
      'لا شيء للدفع لهذا الطفل. شكرا!',
      'Rien a payer pour cet enfant. Merci !',
      'Nothing to pay for this child. Thank you!');
  String get empty => pick(
      'لم تسجل المدرسة أي مصاريف بعد.',
      "L'ecole n'a pas encore enregistre de frais.",
      'The school has not recorded any fees yet.');
  String get how => pick(
      'يتم الدفع لدى أمانة المدرسة؛ كل دفعة مسجلة تظهر هنا مع وصلها.',
      "Les paiements se font aupres du secretariat de l'ecole ; chaque paiement enregistre apparait ici avec son recu.",
      'Payments are made at the school office; every recorded payment appears here with its receipt.');
  String get paid => pick('مدفوع', 'Paye', 'Paid');
  String get unpaid => pick('غير مسدد', 'A payer', 'To pay');
  String overdue(int days) =>
      pick('متأخر بـ $days يوم', 'En retard de $days j', '$days days late');
  String get amount => pick('المبلغ', 'Montant', 'Amount');
  String get paidLabel => pick('المدفوع', 'Paye', 'Paid');
  String get remaining => pick('الباقي', 'Reste', 'Left');
  String get dueDate => pick('الأجل', 'Echeance', 'Due date');
  String get receipt => pick('الوصل', 'Recu', 'Receipt');
  String get receiptTitle => pick('وصل دفع — مصاريف مدرسية',
      'Recu de paiement — frais scolaires', 'Payment receipt — school fees');
  String get receiptNumber => pick('رقم الوصل', 'Recu n°', 'Receipt no.');
  String get date => pick('التاريخ', 'Date', 'Date');
  String get student => pick('التلميذ', 'Eleve', 'Student');
  String get fee => pick('المصاريف', 'Frais', 'Fee');
  String get methodLabel =>
      pick('طريقة الدفع', 'Mode de paiement', 'Payment method');
  String get amountReceived =>
      pick('المبلغ المستلم', 'Montant recu', 'Amount received');
  String get leftAfter => pick('الباقي بعد هذه الدفعة',
      'Reste apres ce paiement', 'Left after this payment');
  String get settled => pick('مسدد بالكامل', 'Solde', 'Fully paid');
  String get receiptFooter => pick(
      'وصل صادر عن Wasel Edu. احتفظ به كإثبات.',
      'Recu genere par Wasel Edu. Conservez-le comme justificatif.',
      'Receipt generated by Wasel Edu. Keep it as proof of payment.');
  String method(String value) => paymentMethodLabel(value, code);
}

const paymentMethods = ['cash', 'bank_transfer', 'ccp', 'cheque'];

/// The payment method as the school says it, in the app language.
String paymentMethodLabel(String value, String languageCode) {
  String pick(String ar, String fr, String en) =>
      languageCode == 'ar' ? ar : (languageCode == 'fr' ? fr : en);
  return switch (value) {
    'bank_transfer' => pick('تحويل بنكي', 'Virement bancaire', 'Bank transfer'),
    'ccp' => pick('CCP / بريدي موب', 'CCP / BaridiMob', 'CCP / BaridiMob'),
    'cheque' => pick('صك', 'Cheque', 'Cheque'),
    _ => pick('نقدا', 'Especes', 'Cash'),
  };
}
