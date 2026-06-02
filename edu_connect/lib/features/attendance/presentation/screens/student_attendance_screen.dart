import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../../core/utils/validators.dart';
import '../../../../core/widgets/child_switcher_bar.dart';
import '../../../../core/widgets/shimmer_loading.dart';
import '../../../../l10n/app_localizations.dart';
import '../../../auth/data/models/user_model.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../../auth/presentation/providers/children_provider.dart';
import '../../data/models/attendance_model.dart';
import '../providers/attendance_provider.dart';

class StudentAttendanceScreen extends ConsumerWidget {
  final String classId;

  const StudentAttendanceScreen({super.key, required this.classId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final text = _AttendanceText.of(context);
    final userAsync = ref.watch(authNotifierProvider);
    final selectedChild = ref.watch(selectedChildProvider);

    return userAsync.when(
      loading: () => const Scaffold(body: _LoadingState()),
      error: (e, _) => Scaffold(body: _ErrorState(message: '$e')),
      data: (UserModel? user) {
        if (user == null) return const SizedBox.shrink();

        final attAsync = user.isParent && selectedChild != null
            ? ref.watch(studentAttendanceProvider((classId, selectedChild.id)))
            : user.isParent
                ? const AsyncValue<List<AttendanceModel>>.loading()
                : ref.watch(studentAttendanceProvider((classId, user.id)));

        void refresh() {
          if (user.isParent && selectedChild != null) {
            ref.invalidate(
                studentAttendanceProvider((classId, selectedChild.id)));
          } else {
            ref.invalidate(studentAttendanceProvider((classId, user.id)));
          }
        }

        return Scaffold(
          backgroundColor: Theme.of(context).scaffoldBackgroundColor,
          appBar: AppBar(
            title: Text(text.title),
            leading: IconButton(
              icon: Icon(Icons.adaptive.arrow_back),
              tooltip: MaterialLocalizations.of(context).backButtonTooltip,
              onPressed: () {
                if (context.canPop()) {
                  context.pop();
                } else {
                  context.go('/classes');
                }
              },
            ),
            actions: [
              IconButton(
                icon: const Icon(Icons.refresh),
                tooltip: text.refresh,
                onPressed: refresh,
              ),
            ],
          ),
          body: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 800),
              child: Column(
                children: [
                  if (user.isParent) const ChildSwitcherBar(),
                  Expanded(
                    child: attAsync.when(
                      loading: () => const _LoadingState(),
                      error: (e, _) => _ErrorState(
                        message: text.loadError(e),
                        onRetry: refresh,
                      ),
                      data: (records) {
                        if (records.isEmpty) {
                          return const _EmptyState();
                        }

                        final sorted = [...records]
                          ..sort((a, b) => b.date.compareTo(a.date));

                        return RefreshIndicator(
                          onRefresh: () async => refresh(),
                          child: ListView(
                            physics: const AlwaysScrollableScrollPhysics(),
                            padding: const EdgeInsets.fromLTRB(16, 12, 16, 28),
                            children: [
                              _AttendanceSummary(records: sorted)
                                  .animate()
                                  .fadeIn(duration: 220.ms)
                                  .slideY(begin: 0.04),
                              const SizedBox(height: 14),
                              ...sorted.asMap().entries.map(
                                    (entry) => _AttendanceRecordCard(
                                      record: entry.value,
                                      index: entry.key,
                                      classId: classId,
                                      studentId: user.isParent
                                          ? selectedChild!.id
                                          : user.id,
                                    ),
                                  ),
                            ],
                          ),
                        );
                      },
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}

class _AttendanceSummary extends StatelessWidget {
  final List<AttendanceModel> records;

  const _AttendanceSummary({required this.records});

  @override
  Widget build(BuildContext context) {
    final text = _AttendanceText.of(context);
    final colors = context.appColors;
    final absent = records
        .where((record) => record.status == AttendanceStatus.absent)
        .length;
    final late = records
        .where((record) => record.status == AttendanceStatus.late)
        .length;
    final pending = records
        .where(
          (record) =>
              !record.isJustified &&
              (record.status == AttendanceStatus.absent ||
                  record.status == AttendanceStatus.late),
        )
        .length;

    return _Panel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              _IconBox(
                icon: Icons.event_available_outlined,
                tone: colors.tealDark,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      text.summaryTitle,
                      style: const TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      text.summarySubtitle,
                      style: TextStyle(
                        color: colors.mutedText,
                        height: 1.25,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: _MetricPill(
                  label: text.absences,
                  value: '$absent',
                  tone: colors.dangerRed,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _MetricPill(
                  label: text.lateArrivals,
                  value: '$late',
                  tone: colors.warningAmber,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _MetricPill(
                  label: text.toJustify,
                  value: '$pending',
                  tone: pending > 0 ? colors.dangerRed : colors.successGreen,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _AttendanceRecordCard extends ConsumerWidget {
  final AttendanceModel record;
  final int index;
  final String classId;
  final String studentId;

  const _AttendanceRecordCard({
    required this.record,
    required this.index,
    required this.classId,
    required this.studentId,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final text = _AttendanceText.of(context);
    final colors = context.appColors;
    final tone = _statusColor(context, record.status);
    final needsJustification = !record.isJustified &&
        (record.status == AttendanceStatus.absent ||
            record.status == AttendanceStatus.late);
    final hasPendingJustification = needsJustification &&
        (record.justificationText?.trim().isNotEmpty ?? false);

    return _Panel(
      margin: const EdgeInsets.only(bottom: 12),
      padding: EdgeInsets.zero,
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 14, 14, 10),
            child: Row(
              children: [
                _IconBox(icon: _statusIcon(record.status), tone: tone),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _statusText(context, record.status),
                        style: TextStyle(
                          color: tone,
                          fontSize: 16,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        DateFormat(
                          'EEEE d MMMM yyyy',
                          Localizations.localeOf(context).toLanguageTag(),
                        ).format(record.date),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          color: colors.mutedText,
                          fontSize: 13,
                        ),
                      ),
                    ],
                  ),
                ),
                _StatusChip(
                  label: record.isJustified
                      ? text.justified
                      : hasPendingJustification
                          ? text.pendingApproval
                      : needsJustification
                          ? text.toJustify
                          : text.ok,
                  tone: record.isJustified
                      ? colors.successGreen
                      : hasPendingJustification
                          ? colors.warningAmber
                      : needsJustification
                          ? colors.dangerRed
                          : colors.tealDark,
                ),
              ],
            ),
          ),
          if (record.isJustified ||
              needsJustification ||
              (record.note?.isNotEmpty ?? false))
            const Divider(),
          if (record.isJustified)
            _JustificationBox(record: record)
          else if (hasPendingJustification)
            _PendingJustificationBox(record: record)
          else if (needsJustification)
            Padding(
              padding: const EdgeInsets.all(14),
              child: SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: () => _showJustifySheet(context, ref),
                  icon: const Icon(Icons.upload_file_outlined),
                  label: Text(text.sendJustification),
                ),
              ),
            )
          else if (record.note?.isNotEmpty ?? false)
            Padding(
              padding: const EdgeInsets.all(14),
              child: Align(
                alignment: AlignmentDirectional.centerStart,
                child: Text(
                  record.note!,
                  style: TextStyle(color: colors.mutedText),
                ),
              ),
            ),
        ],
      ),
    )
        .animate()
        .fadeIn(delay: Duration(milliseconds: 70 + index * 45))
        .slideY(begin: 0.04);
  }

  void _showJustifySheet(BuildContext context, WidgetRef ref) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor:
          Theme.of(context).colorScheme.surface.withValues(alpha: 0),
      builder: (ctx) => _JustifySheet(
        onSubmit: (text) async {
          await ref.read(attendanceNotifierProvider.notifier).justify(
                classId: classId,
                attendanceId: record.id,
                text: text,
              );
          ref.invalidate(studentAttendanceProvider((classId, studentId)));
          if (ctx.mounted) Navigator.pop(ctx);
        },
      ),
    );
  }
}

class _JustificationBox extends StatelessWidget {
  final AttendanceModel record;

  const _JustificationBox({required this.record});

  @override
  Widget build(BuildContext context) {
    final text = _AttendanceText.of(context);
    final colors = context.appColors;
    return Padding(
      padding: const EdgeInsets.all(14),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: colors.successGreen.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: colors.successGreen.withValues(alpha: 0.16),
          ),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(
              Icons.check_circle_outline,
              color: colors.successGreen,
              size: 19,
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                record.justificationText?.isNotEmpty == true
                    ? record.justificationText!
                    : text.justificationSent,
                style: const TextStyle(height: 1.3),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _PendingJustificationBox extends StatelessWidget {
  final AttendanceModel record;

  const _PendingJustificationBox({required this.record});

  @override
  Widget build(BuildContext context) {
    final text = _AttendanceText.of(context);
    final colors = context.appColors;
    return Padding(
      padding: const EdgeInsets.all(14),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: colors.warningAmber.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: colors.warningAmber.withValues(alpha: 0.2),
          ),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(
              Icons.pending_actions_outlined,
              color: colors.warningAmber,
              size: 19,
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                '${text.waitingAdminApproval}\n${record.justificationText!}',
                style: const TextStyle(height: 1.3),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _JustifySheet extends StatefulWidget {
  final Future<void> Function(String) onSubmit;

  const _JustifySheet({required this.onSubmit});

  @override
  State<_JustifySheet> createState() => _JustifySheetState();
}

class _JustifySheetState extends State<_JustifySheet> {
  final _formKey = GlobalKey<FormState>();
  final _ctrl = TextEditingController();
  bool _loading = false;

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final text = _AttendanceText.of(context);
    final colors = context.appColors;
    final colorScheme = Theme.of(context).colorScheme;
    return Container(
      decoration: BoxDecoration(
        color: colors.cardBg,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(8)),
      ),
      padding: EdgeInsets.fromLTRB(
        20,
        16,
        20,
        MediaQuery.of(context).viewInsets.bottom + 20,
      ),
      child: Form(
        key: _formKey,
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            mainAxisSize: MainAxisSize.min,
            children: [
              Center(
                child: Container(
                  width: 38,
                  height: 4,
                  decoration: BoxDecoration(
                    color: colors.cardBorder,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 18),
              Text(
                text.justifyTitle,
                style:
                    const TextStyle(fontSize: 18, fontWeight: FontWeight.w900),
              ),
              const SizedBox(height: 6),
              Text(
                text.justifySubtitle,
                style: TextStyle(
                  color: colors.mutedText,
                  height: 1.3,
                ),
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _ctrl,
                validator: (v) => Validators.required(v, text.reason),
                maxLines: 4,
                textCapitalization: TextCapitalization.sentences,
                decoration: InputDecoration(
                  labelText: text.detailedReason,
                  prefixIcon: const Icon(Icons.edit_note_outlined),
                ),
              ),
              const SizedBox(height: 18),
              ElevatedButton.icon(
                onPressed: _loading
                    ? null
                    : () async {
                        if (!_formKey.currentState!.validate()) return;
                        setState(() => _loading = true);
                        try {
                          await widget.onSubmit(_ctrl.text.trim());
                        } finally {
                          if (mounted) setState(() => _loading = false);
                        }
                      },
                icon: _loading
                    ? SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: colorScheme.onPrimary,
                        ),
                      )
                    : const Icon(Icons.send_outlined),
                label: Text(text.send),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _MetricPill extends StatelessWidget {
  final String label;
  final String value;
  final Color tone;

  const _MetricPill({
    required this.label,
    required this.value,
    required this.tone,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: tone.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: tone.withValues(alpha: 0.16)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              color: tone,
              fontSize: 11,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            value,
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900),
          ),
        ],
      ),
    );
  }
}

class _StatusChip extends StatelessWidget {
  final String label;
  final Color tone;

  const _StatusChip({required this.label, required this.tone});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 6),
      decoration: BoxDecoration(
        color: tone.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: tone,
          fontSize: 12,
          fontWeight: FontWeight.w900,
        ),
      ),
    );
  }
}

class _Panel extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  final EdgeInsetsGeometry? margin;

  const _Panel({
    required this.child,
    this.padding = const EdgeInsets.all(14),
    this.margin,
  });

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    return Container(
      margin: margin,
      padding: padding,
      decoration: BoxDecoration(
        color: colors.cardBg,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: colors.cardBorder),
      ),
      child: child,
    );
  }
}

class _IconBox extends StatelessWidget {
  final IconData icon;
  final Color tone;

  const _IconBox({required this.icon, required this.tone});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 40,
      height: 40,
      decoration: BoxDecoration(
        color: tone.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Icon(icon, color: tone, size: 20),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState();

  @override
  Widget build(BuildContext context) {
    final text = _AttendanceText.of(context);
    final colors = context.appColors;
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(24),
      children: [
        const SizedBox(height: 88),
        _Panel(
          child: Column(
            children: [
              _IconBox(
                icon: Icons.fact_check_outlined,
                tone: colors.tealDark,
              ),
              const SizedBox(height: 16),
              Text(
                text.emptyTitle,
                style: const TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                text.emptySubtitle,
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: colors.mutedText,
                  height: 1.35,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _LoadingState extends StatelessWidget {
  const _LoadingState();

  @override
  Widget build(BuildContext context) {
    return const ShimmerList(showAvatar: false);
  }
}

class _ErrorState extends StatelessWidget {
  final String message;
  final VoidCallback? onRetry;

  const _ErrorState({required this.message, this.onRetry});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final colors = context.appColors;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: _Panel(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.wifi_off_outlined,
                color: colors.warningAmber,
                size: 42,
              ),
              const SizedBox(height: 12),
              Text(
                l10n.unstableConnection,
                style:
                    const TextStyle(fontSize: 17, fontWeight: FontWeight.w900),
              ),
              const SizedBox(height: 6),
              Text(
                message,
                textAlign: TextAlign.center,
                style: TextStyle(color: colors.mutedText),
              ),
              if (onRetry != null) ...[
                const SizedBox(height: 14),
                OutlinedButton.icon(
                  onPressed: onRetry,
                  icon: const Icon(Icons.refresh),
                  label: Text(l10n.retry),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

String _statusText(BuildContext context, AttendanceStatus status) {
  final l10n = AppLocalizations.of(context)!;
  switch (status) {
    case AttendanceStatus.present:
      return l10n.present;
    case AttendanceStatus.absent:
      return l10n.absent;
    case AttendanceStatus.late:
      return l10n.late;
  }
}

IconData _statusIcon(AttendanceStatus status) {
  switch (status) {
    case AttendanceStatus.present:
      return Icons.check_circle_outline;
    case AttendanceStatus.absent:
      return Icons.cancel_outlined;
    case AttendanceStatus.late:
      return Icons.schedule_outlined;
  }
}

Color _statusColor(BuildContext context, AttendanceStatus status) {
  final colors = context.appColors;
  switch (status) {
    case AttendanceStatus.present:
      return colors.successGreen;
    case AttendanceStatus.absent:
      return colors.dangerRed;
    case AttendanceStatus.late:
      return colors.warningAmber;
  }
}

class _AttendanceText {
  final String languageCode;

  const _AttendanceText(this.languageCode);

  static _AttendanceText of(BuildContext context) =>
      _AttendanceText(Localizations.localeOf(context).languageCode);

  bool get _ar => languageCode == 'ar';
  bool get _fr => languageCode == 'fr';

  String pick(String ar, String fr, String en) {
    if (_ar) return ar;
    if (_fr) return fr;
    return en;
  }

  String get title => pick('الحضور', 'Assiduite', 'Attendance');
  String get refresh => pick('تحديث', 'Actualiser', 'Refresh');
  String get summaryTitle =>
      pick('متابعة الغياب', 'Suivi des absences', 'Attendance tracking');
  String get summarySubtitle => pick(
        'الغيابات والتأخرات غير المبررة تحتاج إلى متابعة سريعة.',
        'Les absences et retards non justifies demandent une action rapide.',
        'Unjustified absences and late arrivals need quick follow-up.',
      );
  String get absences => pick('الغيابات', 'Absences', 'Absences');
  String get lateArrivals => pick('التأخرات', 'Retards', 'Late');
  String get toJustify => pick('للتبرير', 'A justifier', 'To justify');
  String get pendingApproval =>
      pick('في انتظار القبول', 'En attente', 'Pending');
  String get justified => pick('مبرر', 'Justifie', 'Justified');
  String get ok => pick('جيد', 'OK', 'OK');
  String get sendJustification =>
      pick('إرسال مبرر', 'Envoyer un justificatif', 'Send justification');
  String get justificationSent =>
      pick('تم إرسال المبرر.', 'Justificatif transmis.', 'Justification sent.');
  String get waitingAdminApproval => pick(
        'تم إرسال المبرر، وهو في انتظار قبول الإدارة.',
        "Justificatif transmis. Il reste en attente de validation par l'administration.",
        'Justification sent. It is waiting for administration approval.',
      );
  String get justifyTitle =>
      pick('تبرير الغياب', 'Justifier l absence', 'Justify absence');
  String get justifySubtitle => pick(
        'اشرح السبب. يمكن إضافة مرفق في إصدار لاحق.',
        'Expliquez le motif. Une piece jointe pourra etre ajoutee dans une prochaine version.',
        'Explain the reason. An attachment can be added in a future version.',
      );
  String get reason => pick('السبب', 'Motif', 'Reason');
  String get detailedReason =>
      pick('السبب بالتفصيل', 'Motif detaille', 'Detailed reason');
  String get send => pick('إرسال', 'Envoyer', 'Send');
  String get emptyTitle =>
      pick('لا يوجد سجل', 'Aucun historique', 'No history');
  String get emptySubtitle => pick(
        'ستظهر الغيابات والتأخرات هنا بعد تسجيل الحضور.',
        'Les absences et retards apparaitront ici apres l appel.',
        'Absences and late arrivals will appear here after attendance is taken.',
      );
  String loadError(Object error) => pick(
        'تعذر تحميل الحضور. $error',
        'Impossible de charger les presences. $error',
        'Unable to load attendance. $error',
      );
}
