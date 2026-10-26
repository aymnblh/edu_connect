import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../core/widgets/shimmer_loading.dart';
import '../fees/fees_repository.dart';
import '../fees/fees_screen.dart'
    show formatDA, paymentMethodLabel, paymentMethods;
import 'director_repository.dart';

String _message(Object error, String fallback) {
  if (error is DioException && error.response?.data is Map) {
    final detail = (error.response!.data as Map)['detail'];
    if (detail is String) return detail;
  }
  return fallback;
}

enum _Filter { all, overdue, unpaid, paid }

/// School fees for the director or secretary on the phone: who owes what,
/// collect a payment at the desk, remind the parents. Billing stays on the web.
class FeesAdminScreen extends ConsumerStatefulWidget {
  const FeesAdminScreen({super.key});

  @override
  ConsumerState<FeesAdminScreen> createState() => _FeesAdminScreenState();
}

class _FeesAdminScreenState extends ConsumerState<FeesAdminScreen> {
  _Filter _filter = _Filter.overdue;
  String _query = '';

  bool _keep(LedgerRow row) {
    final q = _query.trim().toLowerCase();
    if (q.isNotEmpty &&
        !row.studentName.toLowerCase().contains(q) &&
        !row.classes.any((c) => c.toLowerCase().contains(q))) {
      return false;
    }
    return switch (_filter) {
      _Filter.all => true,
      _Filter.overdue => row.invoice.daysOverdue > 0,
      _Filter.unpaid => !row.invoice.isPaid,
      _Filter.paid => row.invoice.isPaid,
    };
  }

  void _snack(String message) => ScaffoldMessenger.of(context)
      .showSnackBar(SnackBar(content: Text(message)));

  Future<void> _remindAll(FeeLedger ledger) async {
    final text = _AText.of(context);
    try {
      final result = await ref
          .read(directorRepositoryProvider)
          .remind(const [], allOverdue: true);
      _snack(text.reminded(
          result['sent'] as int? ?? 0, result['skipped_recent'] as int? ?? 0));
      ref.invalidate(feeLedgerProvider);
    } catch (e) {
      _snack(_message(e, text.error));
    }
  }

  @override
  Widget build(BuildContext context) {
    final text = _AText.of(context);
    final lang = text.code;
    final ledgerState = ref.watch(feeLedgerProvider);
    return Scaffold(
      appBar: AppBar(
        title: Text(text.title),
        actions: [
          if (ledgerState.valueOrNull?.overdueStudents case final count?
              when count > 0)
            IconButton(
              tooltip: text.remindAll,
              icon: const Icon(Icons.notifications_active_outlined),
              onPressed: () => _remindAll(ledgerState.value!),
            ),
        ],
      ),
      body: ledgerState.when(
        loading: () => const ShimmerList(showAvatar: false),
        error: (e, _) => Center(child: Text(_message(e, text.error))),
        data: (ledger) {
          final rows = ledger.rows.where(_keep).toList();
          return RefreshIndicator(
            onRefresh: () => ref.refresh(feeLedgerProvider.future),
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Wrap(spacing: 8, runSpacing: 8, children: [
                  _Figure(text.collected, formatDA(ledger.collected, lang)),
                  _Figure(text.outstanding, formatDA(ledger.outstanding, lang)),
                  _Figure(text.overdue, formatDA(ledger.overdue, lang),
                      note: text.students(ledger.overdueStudents)),
                ]),
                const SizedBox(height: 12),
                TextField(
                  decoration: InputDecoration(
                    prefixIcon: const Icon(Icons.search),
                    hintText: text.search,
                    border: const OutlineInputBorder(),
                  ),
                  onChanged: (value) => setState(() => _query = value),
                ),
                const SizedBox(height: 8),
                Wrap(spacing: 8, children: [
                  for (final f in _Filter.values)
                    ChoiceChip(
                      label: Text(text.filter(f)),
                      selected: _filter == f,
                      onSelected: (_) => setState(() => _filter = f),
                    ),
                ]),
                if (rows.isEmpty)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 24),
                    child: Text(text.empty, textAlign: TextAlign.center),
                  ),
                for (final row in rows)
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text(row.studentName),
                    subtitle: Text([
                      row.invoice.label,
                      if (row.classes.isNotEmpty) row.classes.join(', '),
                      if (row.invoice.daysOverdue > 0)
                        text.late(row.invoice.daysOverdue),
                    ].join(' · ')),
                    trailing: Text(formatDA(row.invoice.remaining, lang),
                        style: const TextStyle(fontWeight: FontWeight.w700)),
                    onTap: () => _openRow(ledger, row),
                  ),
                const SizedBox(height: 12),
                Text(text.webForBilling,
                    style: Theme.of(context).textTheme.bodySmall),
              ],
            ),
          );
        },
      ),
    );
  }

  Future<void> _openRow(FeeLedger ledger, LedgerRow row) async {
    final text = _AText.of(context);
    final lang = text.code;
    final date = DateFormat('dd/MM/yyyy');
    await showModalBottomSheet<void>(
      context: context,
      useSafeArea: true,
      isScrollControlled: true,
      builder: (ctx) => Padding(
        padding: EdgeInsets.fromLTRB(
            20, 20, 20, 20 + MediaQuery.viewInsetsOf(ctx).bottom),
        child: _RowSheet(
          row: row,
          schoolName: ledger.schoolName,
          onPaid: (payment) {
            Navigator.pop(ctx);
            ref.invalidate(feeLedgerProvider);
            _snack(text.paid(
                formatDA(payment.amount, lang), payment.receiptNumber));
          },
          onRemind: () async {
            Navigator.pop(ctx);
            try {
              final result = await ref
                  .read(directorRepositoryProvider)
                  .remind([row.invoice.id]);
              _snack(text.reminded(result['sent'] as int? ?? 0,
                  result['skipped_recent'] as int? ?? 0));
              ref.invalidate(feeLedgerProvider);
            } catch (e) {
              _snack(_message(e, text.error));
            }
          },
          dueText: row.invoice.dueDate == null
              ? '—'
              : date.format(row.invoice.dueDate!),
        ),
      ),
    );
  }
}

class _Figure extends StatelessWidget {
  final String label;
  final String value;
  final String? note;

  const _Figure(this.label, this.value, {this.note});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(label, style: theme.textTheme.bodySmall),
            Text(value,
                style: theme.textTheme.titleMedium
                    ?.copyWith(fontWeight: FontWeight.w700)),
            if (note != null) Text(note!, style: theme.textTheme.bodySmall),
          ],
        ),
      ),
    );
  }
}

class _RowSheet extends ConsumerStatefulWidget {
  final LedgerRow row;
  final String schoolName;
  final String dueText;
  final ValueChanged<FeePayment> onPaid;
  final VoidCallback onRemind;

  const _RowSheet({
    required this.row,
    required this.schoolName,
    required this.dueText,
    required this.onPaid,
    required this.onRemind,
  });

  @override
  ConsumerState<_RowSheet> createState() => _RowSheetState();
}

class _RowSheetState extends ConsumerState<_RowSheet> {
  late final _amount =
      TextEditingController(text: widget.row.invoice.remaining.toString());
  final _notes = TextEditingController();
  String _method = 'cash';
  bool _saving = false;
  String? _error;

  @override
  void dispose() {
    _amount.dispose();
    _notes.dispose();
    super.dispose();
  }

  Future<void> _pay() async {
    final text = _AText.of(context);
    final value = double.tryParse(_amount.text.replaceAll(',', '.').trim());
    final invoice = widget.row.invoice;
    if (value == null || value <= 0 || value > invoice.remaining) {
      setState(() => _error = text.amountInvalid);
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final payment = await ref.read(directorRepositoryProvider).recordPayment(
          invoice.id,
          value,
          _method,
          _notes.text.trim().isEmpty ? null : _notes.text.trim());
      widget.onPaid(payment);
    } catch (e) {
      setState(() {
        _saving = false;
        _error = _message(e, text.error);
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final text = _AText.of(context);
    final lang = text.code;
    final invoice = widget.row.invoice;
    final theme = Theme.of(context);
    return SingleChildScrollView(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(widget.row.studentName, style: theme.textTheme.titleLarge),
          Text('${invoice.label} · ${text.due} ${widget.dueText}'),
          const SizedBox(height: 8),
          Text(text.left(formatDA(invoice.remaining, lang),
              formatDA(invoice.amountDue, lang))),
          if (invoice.payments.isNotEmpty) ...[
            const SizedBox(height: 8),
            for (final p in invoice.payments)
              Text(
                  '${DateFormat('dd/MM/yyyy').format(p.paidAt)} · ${formatDA(p.amount, lang)} · ${paymentMethodLabel(p.method, lang)} · ${p.receiptNumber}',
                  style: theme.textTheme.bodySmall),
          ],
          if (!invoice.isPaid) ...[
            const Divider(height: 24),
            TextField(
              controller: _amount,
              keyboardType:
                  const TextInputType.numberWithOptions(decimal: true),
              inputFormatters: [
                FilteringTextInputFormatter.allow(RegExp(r'[0-9.,]'))
              ],
              decoration: InputDecoration(
                  labelText: text.amount, border: const OutlineInputBorder()),
            ),
            const SizedBox(height: 8),
            DropdownButtonFormField<String>(
              initialValue: _method,
              decoration: InputDecoration(
                  labelText: text.method, border: const OutlineInputBorder()),
              items: [
                for (final m in paymentMethods)
                  DropdownMenuItem(
                      value: m, child: Text(paymentMethodLabel(m, lang)))
              ],
              onChanged: (value) => setState(() => _method = value ?? 'cash'),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _notes,
              maxLength: 500,
              decoration: InputDecoration(
                  labelText: text.note, border: const OutlineInputBorder()),
            ),
            if (_error != null)
              Text(_error!, style: TextStyle(color: theme.colorScheme.error)),
            FilledButton.icon(
              onPressed: _saving ? null : _pay,
              icon: const Icon(Icons.receipt_long_outlined),
              label: Text(text.collect),
            ),
            if (widget.row.parentsLinked > 0)
              TextButton.icon(
                onPressed: widget.onRemind,
                icon: const Icon(Icons.notifications_outlined),
                label: Text(text.remind),
              ),
          ],
        ],
      ),
    );
  }
}

class _AText {
  final String code;
  const _AText(this.code);

  static _AText of(BuildContext context) =>
      _AText(Localizations.localeOf(context).languageCode);

  String pick(String ar, String fr, String en) =>
      code == 'ar' ? ar : (code == 'fr' ? fr : en);

  String get title =>
      pick('المصاريف المدرسية', 'Frais scolaires', 'School fees');
  String get error =>
      pick('حدث خطأ.', 'Une erreur est survenue.', 'Something went wrong.');
  String get collected => pick('المحصّل', 'Encaisse', 'Collected');
  String get outstanding => pick('الباقي', 'Reste a encaisser', 'Outstanding');
  String get overdue => pick('متأخر', 'En retard', 'Overdue');
  String students(int n) => pick('$n تلميذ', '$n eleve(s)', '$n student(s)');
  String get search => pick('بحث عن تلميذ أو قسم',
      'Rechercher un eleve ou une classe', 'Search a student or class');
  String filter(_Filter f) => switch (f) {
        _Filter.all => pick('الكل', 'Tous', 'All'),
        _Filter.overdue => pick('متأخر', 'En retard', 'Overdue'),
        _Filter.unpaid => pick('غير مسدد', 'A payer', 'To pay'),
        _Filter.paid => pick('مسدد', 'Payes', 'Paid'),
      };
  String get empty =>
      pick('لا توجد مصاريف هنا.', 'Aucun frais ici.', 'No fees here.');
  String late(int days) =>
      pick('متأخر بـ $days يوم', 'en retard de $days j', '$days days late');
  String get remindAll =>
      pick('تذكير كل المتأخرين', 'Relancer les retards', 'Remind all overdue');
  String reminded(int sent, int recent) => pick(
      'تذكيرات مرسلة: $sent (ذُكّر بها مؤخرا: $recent)',
      'Rappels envoyes : $sent (deja rappeles recemment : $recent)',
      'Reminders sent: $sent (reminded recently: $recent)');
  String paid(String amount, String receipt) => pick(
      'تم تسجيل $amount — وصل $receipt',
      '$amount encaisses — recu $receipt',
      '$amount collected — receipt $receipt');
  String get due => pick('الأجل', 'echeance', 'due');
  String left(String left, String total) => pick('الباقي $left من $total',
      'Reste $left sur $total', '$left left of $total');
  String get amount => pick('المبلغ (دج)', 'Montant (DA)', 'Amount (DZD)');
  String get method =>
      pick('طريقة الدفع', 'Mode de paiement', 'Payment method');
  String get note => pick('ملاحظة', 'Remarque', 'Note');
  String get collect => pick('تحصيل', 'Encaisser', 'Collect');
  String get remind =>
      pick('تذكير الأولياء', 'Relancer les parents', 'Remind the parents');
  String get amountInvalid =>
      pick('مبلغ غير صالح.', 'Montant invalide.', 'Invalid amount.');
  String get webForBilling => pick(
      'إنشاء المصاريف وطباعة الوصولات من نسخة الويب.',
      'La creation des frais et l\'impression des recus se font sur la version web.',
      'Creating fees and printing receipts is done on the web.');
}
