import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../../core/utils/validators.dart';
import '../../../../core/widgets/shimmer_loading.dart';
import '../../../auth/data/models/user_model.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../data/models/homework_model.dart';
import '../providers/homework_provider.dart';

class HomeworkListScreen extends ConsumerWidget {
  final String classId;

  const HomeworkListScreen({super.key, required this.classId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final text = _HomeworkText.of(context);
    final userAsync = ref.watch(authNotifierProvider);
    final homeworkAsync = ref.watch(homeworkProvider(classId));

    return userAsync.when(
      loading: () => const Scaffold(body: _LoadingState()),
      error: (e, _) => Scaffold(body: _ErrorState(message: '$e')),
      data: (UserModel? user) {
        if (user == null) return const SizedBox.shrink();

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
                onPressed: () => ref.invalidate(homeworkProvider(classId)),
              ),
            ],
          ),
          floatingActionButton: user.isTeacher
              ? FloatingActionButton.extended(
                  icon: const Icon(Icons.add),
                  label: Text(text.newShort),
                  onPressed: () => _showAddHomeworkDialog(context, ref),
                )
              : null,
          body: homeworkAsync.when(
            loading: () => const _LoadingState(),
            error: (e, _) => _ErrorState(
              message: text.loadError(e),
              onRetry: () => ref.invalidate(homeworkProvider(classId)),
            ),
            data: (homeworkList) {
              if (homeworkList.isEmpty) {
                return _EmptyState(canWrite: user.isTeacher);
              }

              final now = DateTime.now();
              final today = DateTime(now.year, now.month, now.day);
              final upcoming = homeworkList.where((h) {
                final due =
                    DateTime(h.dueDate.year, h.dueDate.month, h.dueDate.day);
                return due.isAfter(today) || due.isAtSameMomentAs(today);
              }).toList()
                ..sort((a, b) => a.dueDate.compareTo(b.dueDate));
              final past = homeworkList.where((h) {
                final due =
                    DateTime(h.dueDate.year, h.dueDate.month, h.dueDate.day);
                return due.isBefore(today);
              }).toList()
                ..sort((a, b) => b.dueDate.compareTo(a.dueDate));

              return RefreshIndicator(
                onRefresh: () async =>
                    ref.invalidate(homeworkProvider(classId)),
                child: ListView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 96),
                  children: [
                    _HomeworkSummary(
                      upcomingCount: upcoming.length,
                      pastCount: past.length,
                    ).animate().fadeIn(duration: 220.ms).slideY(begin: 0.04),
                    const SizedBox(height: 16),
                    if (upcoming.isNotEmpty) ...[
                      _SectionTitle(text.toDo),
                      ...upcoming.asMap().entries.map(
                            (entry) => _HomeworkCard(
                              homework: entry.value,
                              index: entry.key,
                              isPast: false,
                            ),
                          ),
                      const SizedBox(height: 18),
                    ],
                    if (past.isNotEmpty) ...[
                      _SectionTitle(text.history),
                      ...past.asMap().entries.map(
                            (entry) => _HomeworkCard(
                              homework: entry.value,
                              index: entry.key,
                              isPast: true,
                            ),
                          ),
                    ],
                  ],
                ),
              );
            },
          ),
        );
      },
    );
  }

  void _showAddHomeworkDialog(BuildContext context, WidgetRef ref) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor:
          Theme.of(context).colorScheme.surface.withValues(alpha: 0),
      builder: (ctx) => _AddHomeworkSheet(
        onSubmit: (subject, lessonContent, homeworkContent, dueDate) async {
          final newHomework = HomeworkModel(
            id: '',
            classId: classId,
            subject: subject,
            lessonContent: lessonContent,
            homeworkContent: homeworkContent,
            dueDate: dueDate,
            createdAt: DateTime.now(),
          );
          await ref.read(homeworkRepositoryProvider).addHomework(newHomework);
          ref.invalidate(homeworkProvider(classId));
          if (ctx.mounted) Navigator.pop(ctx);
        },
      ),
    );
  }
}

class _AddHomeworkSheet extends StatefulWidget {
  final Future<void> Function(String, String?, String, DateTime) onSubmit;

  const _AddHomeworkSheet({required this.onSubmit});

  @override
  State<_AddHomeworkSheet> createState() => _AddHomeworkSheetState();
}

class _AddHomeworkSheetState extends State<_AddHomeworkSheet> {
  final _formKey = GlobalKey<FormState>();
  final _subjectCtrl = TextEditingController();
  final _lessonCtrl = TextEditingController();
  final _homeworkCtrl = TextEditingController();
  DateTime? _dueDate;
  bool _loading = false;

  @override
  void dispose() {
    _subjectCtrl.dispose();
    _lessonCtrl.dispose();
    _homeworkCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: DateTime.now().add(const Duration(days: 1)),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (picked != null) setState(() => _dueDate = picked);
  }

  @override
  Widget build(BuildContext context) {
    final text = _HomeworkText.of(context);
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
                text.newHomework,
                style:
                    const TextStyle(fontSize: 18, fontWeight: FontWeight.w900),
              ),
              const SizedBox(height: 16),
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
                controller: _lessonCtrl,
                maxLines: 2,
                textCapitalization: TextCapitalization.sentences,
                decoration: InputDecoration(
                  labelText: text.optionalLesson,
                  prefixIcon: const Icon(Icons.school_outlined),
                ),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _homeworkCtrl,
                validator: (v) => Validators.required(v, text.homework),
                maxLines: 3,
                textCapitalization: TextCapitalization.sentences,
                decoration: InputDecoration(
                  labelText: text.homeworkToDo,
                  prefixIcon: const Icon(Icons.assignment_outlined),
                ),
              ),
              const SizedBox(height: 12),
              InkWell(
                onTap: _pickDate,
                borderRadius: BorderRadius.circular(8),
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                  decoration: BoxDecoration(
                    border: Border.all(color: colors.cardBorder),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.event_outlined, color: colors.tealDark),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          _dueDate == null
                              ? text.chooseDueDate
                              : text.dueOn(
                                  DateFormat(
                                    'dd/MM/yyyy',
                                    Localizations.localeOf(context)
                                        .toLanguageTag(),
                                  ).format(_dueDate!),
                                ),
                          style: TextStyle(
                            color: _dueDate == null
                                ? colors.mutedText
                                : colorScheme.onSurface,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 18),
              ElevatedButton.icon(
                onPressed: (_loading || _dueDate == null)
                    ? null
                    : () async {
                        if (!_formKey.currentState!.validate()) return;
                        setState(() => _loading = true);
                        try {
                          await widget.onSubmit(
                            _subjectCtrl.text.trim(),
                            _lessonCtrl.text.trim().isEmpty
                                ? null
                                : _lessonCtrl.text.trim(),
                            _homeworkCtrl.text.trim(),
                            _dueDate!,
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
                          strokeWidth: 2,
                          color: colorScheme.onPrimary,
                        ),
                      )
                    : const Icon(Icons.send_outlined),
                label: Text(text.publish),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _HomeworkSummary extends StatelessWidget {
  final int upcomingCount;
  final int pastCount;

  const _HomeworkSummary({
    required this.upcomingCount,
    required this.pastCount,
  });

  @override
  Widget build(BuildContext context) {
    final text = _HomeworkText.of(context);
    final colors = context.appColors;
    return _Panel(
      child: Row(
        children: [
          _IconBox(icon: Icons.assignment_outlined, tone: colors.tealDark),
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
                  style: TextStyle(color: colors.mutedText, height: 1.25),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          _Counter(value: '$upcomingCount', label: text.toDoShort),
          const SizedBox(width: 8),
          _Counter(value: '$pastCount', label: text.pastShort),
        ],
      ),
    );
  }
}

class _HomeworkCard extends StatelessWidget {
  final HomeworkModel homework;
  final int index;
  final bool isPast;

  const _HomeworkCard({
    required this.homework,
    required this.index,
    required this.isPast,
  });

  @override
  Widget build(BuildContext context) {
    final text = _HomeworkText.of(context);
    final colors = context.appColors;
    final colorScheme = Theme.of(context).colorScheme;
    final today = DateTime.now();
    final due = DateTime(
        homework.dueDate.year, homework.dueDate.month, homework.dueDate.day);
    final daysLeft =
        due.difference(DateTime(today.year, today.month, today.day)).inDays;
    final dueTone = isPast
        ? colors.tealDark
        : daysLeft <= 1
            ? colors.warningAmber
            : colors.successGreen;

    return _Panel(
      margin: const EdgeInsets.only(bottom: 12),
      padding: EdgeInsets.zero,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 14, 14, 10),
            child: Row(
              children: [
                _IconBox(
                  icon: Icons.assignment_outlined,
                  tone: isPast ? colors.tealDark : colors.tealDark,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    homework.subject,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontWeight: FontWeight.w900,
                      fontSize: 16,
                    ),
                  ),
                ),
                _DueChip(date: homework.dueDate, tone: dueTone),
              ],
            ),
          ),
          const Divider(),
          Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (homework.lessonContent?.isNotEmpty == true) ...[
                  _SmallLabel(text.lessonStudied),
                  const SizedBox(height: 4),
                  Text(
                    homework.lessonContent!,
                    style: TextStyle(
                      color: colorScheme.onSurface,
                      height: 1.35,
                    ),
                  ),
                  const SizedBox(height: 12),
                ],
                _SmallLabel(text.homeworkToDo, color: colors.tealDark),
                const SizedBox(height: 4),
                Text(
                  homework.homeworkContent,
                  style: TextStyle(
                    color: isPast ? colors.mutedText : colorScheme.onSurface,
                    fontWeight: FontWeight.w600,
                    height: 1.4,
                  ),
                ),
              ],
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

class _DueChip extends StatelessWidget {
  final DateTime date;
  final Color tone;

  const _DueChip({required this.date, required this.tone});

  @override
  Widget build(BuildContext context) {
    final locale = Localizations.localeOf(context).toLanguageTag();
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 6),
      decoration: BoxDecoration(
        color: tone.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        DateFormat('dd/MM', locale).format(date),
        style:
            TextStyle(color: tone, fontSize: 12, fontWeight: FontWeight.w900),
      ),
    );
  }
}

class _Counter extends StatelessWidget {
  final String value;
  final String label;

  const _Counter({required this.value, required this.label});

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    return Container(
      width: 56,
      padding: const EdgeInsets.symmetric(vertical: 8),
      decoration: BoxDecoration(
        color: colors.tealDark.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        children: [
          Text(
            value,
            style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w900),
          ),
          Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              color: colors.mutedText,
              fontSize: 10,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }
}

class _SmallLabel extends StatelessWidget {
  final String label;
  final Color? color;

  const _SmallLabel(this.label, {this.color});

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    return Text(
      label,
      style: TextStyle(
        color: color ?? colors.mutedText,
        fontSize: 12,
        fontWeight: FontWeight.w900,
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  final String label;

  const _SectionTitle(this.label);

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.fromLTRB(2, 0, 2, 10),
      child: Text(
        label,
        style: TextStyle(
          color: colorScheme.onSurface,
          fontSize: 16,
          fontWeight: FontWeight.w900,
        ),
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  final bool canWrite;

  const _EmptyState({required this.canWrite});

  @override
  Widget build(BuildContext context) {
    final text = _HomeworkText.of(context);
    final colors = context.appColors;
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(24),
      children: [
        const SizedBox(height: 88),
        _Panel(
          child: Column(
            children: [
              _IconBox(icon: Icons.assignment_outlined, tone: colors.tealDark),
              const SizedBox(height: 16),
              Text(
                text.emptyTitle,
                style:
                    const TextStyle(fontSize: 20, fontWeight: FontWeight.w900),
              ),
              const SizedBox(height: 8),
              Text(
                canWrite
                    ? text.teacherEmptySubtitle
                    : text.studentEmptySubtitle,
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
    final text = _HomeworkText.of(context);
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

class _HomeworkText {
  final String languageCode;

  const _HomeworkText(this.languageCode);

  static _HomeworkText of(BuildContext context) =>
      _HomeworkText(Localizations.localeOf(context).languageCode);

  bool get _ar => languageCode == 'ar';
  bool get _fr => languageCode == 'fr';

  String pick(String ar, String fr, String en) {
    if (_ar) return ar;
    if (_fr) return fr;
    return en;
  }

  String get title => pick('الواجبات', 'Devoirs', 'Homework');
  String get refresh => pick('تحديث', 'Actualiser', 'Refresh');
  String get newShort => pick('جديد', 'Nouveau', 'New');
  String get toDo => pick('للإنجاز', 'A faire', 'To do');
  String get history => pick('السجل', 'Historique', 'History');
  String get newHomework => pick('واجب جديد', 'Nouveau devoir', 'New homework');
  String get subject => pick('المادة', 'Matiere', 'Subject');
  String get homework => pick('الواجبات', 'Devoirs', 'Homework');
  String get optionalLesson => pick(
        'الدرس المرتبط (اختياري)',
        'Lecon associee (optionnel)',
        'Related lesson (optional)',
      );
  String get homeworkToDo =>
      pick('الواجب المطلوب', 'Devoirs a faire', 'Homework to do');
  String get chooseDueDate =>
      pick('اختيار تاريخ التسليم', 'Choisir la date limite', 'Choose due date');
  String dueOn(String date) =>
      pick('يسلم في $date', 'A rendre le $date', 'Due on $date');
  String get publish => pick('نشر', 'Publier', 'Publish');
  String get summaryTitle =>
      pick('العمل المنزلي', 'Travail a la maison', 'Homework');
  String get summarySubtitle => pick(
        'رتب الواجبات القادمة واحتفظ بالسجل قريبا.',
        'Priorisez les devoirs a venir et gardez l historique sous la main.',
        'Prioritize upcoming homework and keep the history close.',
      );
  String get toDoShort => pick('للإنجاز', 'a faire', 'to do');
  String get pastShort => pick('منتهية', 'passes', 'past');
  String get lessonStudied =>
      pick('الدرس المدروس', 'Lecon etudiee', 'Studied lesson');
  String get emptyTitle =>
      pick('لا توجد واجبات', 'Aucun devoir', 'No homework');
  String get teacherEmptySubtitle => pick(
        'انشر أول واجب للأولياء والتلاميذ.',
        'Publiez le premier devoir pour les parents et eleves.',
        'Publish the first homework item for parents and students.',
      );
  String get studentEmptySubtitle => pick(
        'ستظهر الواجبات المنشورة هنا.',
        'Les devoirs publies apparaitront ici.',
        'Published homework will appear here.',
      );
  String get unstableConnection =>
      pick('الاتصال غير مستقر', 'Connexion instable', 'Unstable connection');
  String get retry => pick('إعادة المحاولة', 'Reessayer', 'Retry');
  String loadError(Object error) => pick(
        'تعذر تحميل الواجبات. $error',
        'Impossible de charger les devoirs. $error',
        'Unable to load homework. $error',
      );
}
