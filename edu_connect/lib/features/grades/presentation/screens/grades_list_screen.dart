import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../../core/utils/date_formatter.dart';
import '../../../../core/utils/validators.dart';
import '../../../../core/widgets/child_switcher_bar.dart';
import '../../../../core/widgets/shimmer_loading.dart';
import '../../../auth/data/models/user_model.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../../auth/presentation/providers/children_provider.dart';
import '../../data/models/grade_model.dart';
import '../providers/grades_provider.dart';

class GradesListScreen extends ConsumerWidget {
  final String classId;

  const GradesListScreen({super.key, required this.classId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final text = _GradesText.of(context);
    final userAsync = ref.watch(authNotifierProvider);
    final gradesAsync = ref.watch(gradesProvider(classId));
    final selectedChild = ref.watch(selectedChildProvider);

    return userAsync.when(
      loading: () => const Scaffold(body: _LoadingState()),
      error: (e, _) => Scaffold(body: _ErrorState(message: '$e')),
      data: (UserModel? user) {
        if (user == null) return const SizedBox.shrink();

        final filteredAsync = user.isParent
            ? (selectedChild == null
                ? const AsyncValue<List<GradeModel>>.loading()
                : ref.watch(studentGradesProvider((classId, selectedChild.id))))
            : gradesAsync;

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
              if (user.isTeacher ||
                  user.role == UserRole.principal ||
                  user.role == UserRole.secretary)
                IconButton(
                  icon: const Icon(Icons.file_download_outlined),
                  tooltip: text.exportCsv,
                  onPressed: () => _exportCsv(context, ref),
                ),
              IconButton(
                icon: const Icon(Icons.picture_as_pdf_outlined),
                tooltip: text.bulletin,
                onPressed: () {
                  final studentId = user.isParent ? user.id : null;
                  context.push(
                    '/class/$classId/grades/bulletin'
                    '${studentId != null ? '?studentId=$studentId' : ''}',
                  );
                },
              ),
              IconButton(
                icon: const Icon(Icons.refresh),
                tooltip: text.refresh,
                onPressed: () => _refresh(ref, user),
              ),
            ],
          ),
          floatingActionButton: user.isTeacher
              ? FloatingActionButton.extended(
                  icon: const Icon(Icons.add),
                  label: Text(text.addGradeShort),
                  onPressed: () => _showAddGradeDialog(context, ref),
                )
              : null,
          body: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 800),
              child: Column(
                children: [
                  if (user.isParent) const ChildSwitcherBar(),
                  Expanded(
                    child: filteredAsync.when(
                      loading: () => const _LoadingState(),
                      error: (e, _) => _ErrorState(
                        message: text.loadError(e),
                        onRetry: () => _refresh(ref, user),
                      ),
                      data: (grades) {
                        if (grades.isEmpty) {
                          return _EmptyState(isParent: user.isParent);
                        }

                        final sorted = [...grades]
                          ..sort((a, b) => b.date.compareTo(a.date));
                        final canApprove = user.role == UserRole.principal ||
                            user.role == UserRole.secretary;

                        return RefreshIndicator(
                          onRefresh: () async => _refresh(ref, user),
                          child: ListView(
                            physics: const AlwaysScrollableScrollPhysics(),
                            padding: const EdgeInsets.fromLTRB(16, 12, 16, 96),
                            children: [
                              _GradesSummary(
                                      grades: sorted, isParent: user.isParent)
                                  .animate()
                                  .fadeIn(duration: 220.ms)
                                  .slideY(begin: 0.04),
                              const SizedBox(height: 14),
                              ...sorted.asMap().entries.map(
                                    (entry) => _GradeCard(
                                      grade: entry.value,
                                      index: entry.key,
                                      showStudentName: !user.isParent,
                                      canApprove:
                                          canApprove && !entry.value.isApproved,
                                      onApprove: () async {
                                        await ref
                                            .read(
                                                gradesNotifierProvider.notifier)
                                            .approveGrade(
                                              classId: classId,
                                              gradeId: entry.value.id,
                                            );
                                        _refresh(ref, user);
                                      },
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

  void _refresh(WidgetRef ref, UserModel user) {
    if (user.isParent) {
      final selectedChild = ref.read(selectedChildProvider);
      if (selectedChild != null) {
        ref.invalidate(studentGradesProvider((classId, selectedChild.id)));
      }
    }
    ref.invalidate(gradesProvider(classId));
  }

  Future<void> _exportCsv(BuildContext context, WidgetRef ref) async {
    final text = _GradesText.of(context);
    try {
      await ref.read(gradesRepositoryProvider).getGradesCsv(classId);
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(text.exportPrepared)),
        );
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(text.exportFailed(e))),
        );
      }
    }
  }

  void _showAddGradeDialog(BuildContext context, WidgetRef ref) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor:
          Theme.of(context).colorScheme.surface.withValues(alpha: 0),
      builder: (ctx) => _AddGradeSheet(
        onSubmit: (studentId, studentName, subject, value, comment) async {
          await ref.read(gradesNotifierProvider.notifier).addGrade(
                classId: classId,
                studentId: studentId,
                studentName: studentName,
                subject: subject,
                value: value,
                comment: comment,
              );
          ref.invalidate(gradesProvider(classId));
          if (ctx.mounted) Navigator.pop(ctx);
        },
      ),
    );
  }
}

class _AddGradeSheet extends StatefulWidget {
  final Future<void> Function(String, String, String, double, String?) onSubmit;

  const _AddGradeSheet({required this.onSubmit});

  @override
  State<_AddGradeSheet> createState() => _AddGradeSheetState();
}

class _AddGradeSheetState extends State<_AddGradeSheet> {
  final _formKey = GlobalKey<FormState>();
  final _studentIdCtrl = TextEditingController();
  final _studentNameCtrl = TextEditingController();
  final _subjectCtrl = TextEditingController();
  final _valueCtrl = TextEditingController();
  final _commentCtrl = TextEditingController();
  bool _loading = false;

  @override
  void dispose() {
    _studentIdCtrl.dispose();
    _studentNameCtrl.dispose();
    _subjectCtrl.dispose();
    _valueCtrl.dispose();
    _commentCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final text = _GradesText.of(context);
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
                text.newGrade,
                style:
                    const TextStyle(fontSize: 18, fontWeight: FontWeight.w900),
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _studentIdCtrl,
                validator: (v) => Validators.required(v, text.studentId),
                decoration: InputDecoration(
                  labelText: text.studentId,
                  prefixIcon: const Icon(Icons.badge_outlined),
                ),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _studentNameCtrl,
                validator: (v) => Validators.required(v, text.studentName),
                textCapitalization: TextCapitalization.words,
                decoration: InputDecoration(
                  labelText: text.studentName,
                  prefixIcon: const Icon(Icons.person_outline),
                ),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _subjectCtrl,
                validator: (v) => Validators.required(v, text.subject),
                textCapitalization: TextCapitalization.words,
                decoration: InputDecoration(
                  labelText: text.subject,
                  prefixIcon: const Icon(Icons.menu_book_outlined),
                ),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _valueCtrl,
                keyboardType:
                    const TextInputType.numberWithOptions(decimal: true),
                validator: Validators.gradeValue,
                decoration: InputDecoration(
                  labelText: text.gradeOutOf20,
                  prefixIcon: const Icon(Icons.stacked_line_chart_outlined),
                ),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _commentCtrl,
                textCapitalization: TextCapitalization.sentences,
                decoration: InputDecoration(
                  labelText: text.optionalComment,
                  prefixIcon: const Icon(Icons.notes_outlined),
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
                          await widget.onSubmit(
                            _studentIdCtrl.text.trim(),
                            _studentNameCtrl.text.trim(),
                            _subjectCtrl.text.trim(),
                            double.parse(_valueCtrl.text.trim()),
                            _commentCtrl.text.trim().isEmpty
                                ? null
                                : _commentCtrl.text.trim(),
                          );
                        } finally {
                          if (mounted) setState(() => _loading = false);
                        }
                      },
                icon: _loading
                    ? SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                          color: colorScheme.onPrimary,
                          strokeWidth: 2,
                        ),
                      )
                    : const Icon(Icons.save_outlined),
                label: Text(text.save),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _GradesSummary extends StatelessWidget {
  final List<GradeModel> grades;
  final bool isParent;

  const _GradesSummary({required this.grades, required this.isParent});

  @override
  Widget build(BuildContext context) {
    final text = _GradesText.of(context);
    final colors = context.appColors;
    final approved = grades.where((grade) => grade.isApproved).length;
    final pending = grades.length - approved;
    final average = _weightedAverage(grades);

    return _Panel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              _IconBox(
                icon: Icons.verified_outlined,
                tone: colors.successGreen,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      isParent
                          ? text.parentSummaryTitle
                          : text.staffSummaryTitle,
                      style: const TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      isParent
                          ? text.parentSummarySubtitle
                          : text.staffSummarySubtitle,
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
                  label: text.average,
                  value: '${average.toStringAsFixed(1)}/20',
                  tone: _gradeTone(context, average),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _MetricPill(
                  label: text.approved,
                  value: '$approved',
                  tone: colors.successGreen,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _MetricPill(
                  label: text.pending,
                  value: '$pending',
                  tone: pending > 0 ? colors.warningAmber : colors.tealDark,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _GradeCard extends StatelessWidget {
  final GradeModel grade;
  final int index;
  final bool showStudentName;
  final bool canApprove;
  final Future<void> Function()? onApprove;

  const _GradeCard({
    required this.grade,
    required this.index,
    required this.showStudentName,
    required this.canApprove,
    this.onApprove,
  });

  @override
  Widget build(BuildContext context) {
    final text = _GradesText.of(context);
    final colors = context.appColors;
    final tone = _gradeTone(context, grade.scoreOnTwenty);

    return _Panel(
      margin: const EdgeInsets.only(bottom: 12),
      padding: EdgeInsets.zero,
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 14, 14, 10),
            child: Row(
              children: [
                _ScoreBox(grade: grade, tone: tone),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        grade.subject,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.onSurface,
                          fontSize: 16,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        showStudentName
                            ? '${grade.studentName} - Coef. ${_formatCoefficient(grade.coefficient)}'
                            : '${DateFormatter.gradeDate(grade.date)} - Coef. ${_formatCoefficient(grade.coefficient)}',
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
                  label: grade.isApproved ? text.approvedStatus : text.pending,
                  tone: grade.isApproved
                      ? colors.successGreen
                      : colors.warningAmber,
                ),
              ],
            ),
          ),
          if (grade.comment?.isNotEmpty == true || canApprove) const Divider(),
          if (grade.comment?.isNotEmpty == true)
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 0, 14, 12),
              child: Align(
                alignment: AlignmentDirectional.centerStart,
                child: Text(
                  grade.comment!,
                  style: TextStyle(
                    color: colors.mutedText,
                    height: 1.3,
                  ),
                ),
              ),
            ),
          if (canApprove)
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 0, 14, 14),
              child: SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: onApprove,
                  icon: const Icon(Icons.check_circle_outline),
                  label: Text(text.approveAndNotify),
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
}

class _ScoreBox extends StatelessWidget {
  final GradeModel grade;
  final Color tone;

  const _ScoreBox({required this.grade, required this.tone});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 54,
      height: 54,
      decoration: BoxDecoration(
        color: tone.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: tone.withValues(alpha: 0.2)),
      ),
      child: Center(
        child: Text(
          grade.formattedValue,
          style: TextStyle(
            color: tone,
            fontSize: 18,
            fontWeight: FontWeight.w900,
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
  final bool isParent;

  const _EmptyState({required this.isParent});

  @override
  Widget build(BuildContext context) {
    final text = _GradesText.of(context);
    final colors = context.appColors;
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(24),
      children: [
        const SizedBox(height: 88),
        _Panel(
          child: Column(
            children: [
              _IconBox(icon: Icons.grade_outlined, tone: colors.successGreen),
              const SizedBox(height: 16),
              Text(
                text.emptyTitle,
                style:
                    const TextStyle(fontSize: 20, fontWeight: FontWeight.w900),
              ),
              const SizedBox(height: 8),
              Text(
                isParent ? text.parentEmptySubtitle : text.staffEmptySubtitle,
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
    final text = _GradesText.of(context);
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
                text.unstableConnection,
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
                  label: Text(text.retry),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

Color _gradeTone(BuildContext context, double value) {
  final colors = context.appColors;
  if (value >= 16) return colors.successGreen;
  if (value >= 10) return colors.warningAmber;
  return colors.dangerRed;
}

double _weightedAverage(List<GradeModel> grades) {
  if (grades.isEmpty) return 0.0;
  final modules = <String, _ModuleAverage>{};
  for (final grade in grades) {
    final key = grade.courseId ?? grade.subject.trim().toLowerCase();
    final module = modules.putIfAbsent(
      key.isEmpty ? grade.id : key,
      () => _ModuleAverage(grade.coefficient),
    );
    module.coefficient = grade.coefficient > 0 ? grade.coefficient : 1.0;
    module.scores.add(grade.scoreOnTwenty);
  }

  var weightedTotal = 0.0;
  var coefficientTotal = 0.0;
  for (final module in modules.values) {
    if (module.scores.isEmpty) continue;
    final moduleAverage =
        module.scores.fold<double>(0, (sum, score) => sum + score) /
            module.scores.length;
    weightedTotal += moduleAverage * module.coefficient;
    coefficientTotal += module.coefficient;
  }
  return coefficientTotal > 0 ? weightedTotal / coefficientTotal : 0.0;
}

class _ModuleAverage {
  double coefficient;
  final List<double> scores = [];

  _ModuleAverage(this.coefficient);
}

String _formatCoefficient(double value) {
  if (value == value.roundToDouble()) return value.toInt().toString();
  return value.toStringAsFixed(1);
}

class _GradesText {
  final String languageCode;

  const _GradesText(this.languageCode);

  static _GradesText of(BuildContext context) =>
      _GradesText(Localizations.localeOf(context).languageCode);

  bool get _ar => languageCode == 'ar';
  bool get _fr => languageCode == 'fr';

  String pick(String ar, String fr, String en) {
    if (_ar) return ar;
    if (_fr) return fr;
    return en;
  }

  String get title => pick('النقاط', 'Notes', 'Grades');
  String get exportCsv => pick('تصدير CSV', 'Export CSV', 'Export CSV');
  String get bulletin => pick('كشف النقاط', 'Bulletin', 'Report card');
  String get refresh => pick('تحديث', 'Actualiser', 'Refresh');
  String get addGradeShort => pick('نقطة', 'Note', 'Grade');
  String get exportPrepared =>
      pick('تم تجهيز ملف CSV.', 'Export CSV prepare.', 'CSV export prepared.');
  String exportFailed(Object error) => pick('تعذر التصدير: $error',
      'Export impossible: $error', 'Export failed: $error');
  String loadError(Object error) => pick(
        'تعذر تحميل النقاط. $error',
        'Impossible de charger les notes. $error',
        'Unable to load grades. $error',
      );
  String get newGrade => pick('نقطة جديدة', 'Nouvelle note', 'New grade');
  String get studentId => pick('معرف التلميذ', 'ID eleve', 'Student ID');
  String get studentName => pick('اسم التلميذ', 'Nom eleve', 'Student name');
  String get subject => pick('المادة', 'Matiere', 'Subject');
  String get gradeOutOf20 =>
      pick('النقطة من 20', 'Note sur 20', 'Grade out of 20');
  String get optionalComment =>
      pick('تعليق (اختياري)', 'Commentaire (optionnel)', 'Comment (optional)');
  String get save => pick('حفظ', 'Enregistrer', 'Save');
  String get parentSummaryTitle =>
      pick('النقاط المصادق عليها', 'Notes validees', 'Approved grades');
  String get staffSummaryTitle =>
      pick('متابعة التقييمات', 'Suivi des evaluations', 'Assessment tracking');
  String get parentSummarySubtitle => pick(
        'يرى الأولياء فقط النقاط التي صادقت عليها الإدارة.',
        'Les parents voient uniquement les notes approuvees par la direction.',
        'Parents only see grades approved by school leadership.',
      );
  String get staffSummarySubtitle => pick(
        'تبقى النقاط الجديدة في الانتظار قبل نشرها للأولياء.',
        'Les nouvelles notes restent en attente avant diffusion aux parents.',
        'New grades stay pending before they are shared with parents.',
      );
  String get average => pick('المعدل', 'Moyenne', 'Average');
  String get approved => pick('مصادق عليها', 'Validees', 'Approved');
  String get pending => pick('في الانتظار', 'En attente', 'Pending');
  String get approvedStatus => pick('مصادق عليها', 'Validee', 'Approved');
  String get approveAndNotify =>
      pick('المصادقة والإشعار', 'Valider et notifier', 'Approve and notify');
  String get emptyTitle => pick('لا توجد نقاط', 'Aucune note', 'No grades');
  String get parentEmptySubtitle => pick(
        'ستظهر هنا النقاط التي صادقت عليها الإدارة.',
        'Les notes validees par la direction apparaitront ici.',
        'Grades approved by school leadership will appear here.',
      );
  String get staffEmptySubtitle => pick(
        'ستظهر هنا التقييمات التي تم إدخالها.',
        'Les evaluations saisies apparaitront ici.',
        'Entered assessments will appear here.',
      );
  String get unstableConnection =>
      pick('الاتصال غير مستقر', 'Connexion instable', 'Unstable connection');
  String get retry => pick('إعادة المحاولة', 'Reessayer', 'Retry');
}
