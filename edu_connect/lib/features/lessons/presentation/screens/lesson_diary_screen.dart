import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/shimmer_loading.dart';
import '../../../auth/data/models/user_model.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../data/models/lesson_entry_model.dart';
import '../providers/lesson_provider.dart';

class LessonDiaryScreen extends ConsumerWidget {
  final String classId;

  const LessonDiaryScreen({super.key, required this.classId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final text = _LessonText.of(context);
    final user = ref.watch(authNotifierProvider).valueOrNull;
    final lessonsAsync = ref.watch(lessonsProvider(classId));
    final canWrite = user?.isTeacher == true ||
        user?.role == UserRole.principal ||
        user?.role == UserRole.secretary;

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
            onPressed: () => ref.invalidate(lessonsProvider(classId)),
          ),
        ],
      ),
      floatingActionButton: canWrite
          ? FloatingActionButton.extended(
              icon: const Icon(Icons.add),
              label: Text(text.courseShort),
              onPressed: () => _showLessonSheet(context, ref),
            )
          : null,
      body: lessonsAsync.when(
        loading: () => const _LoadingState(),
        error: (e, _) => _ErrorState(
          message: text.loadError(e),
          onRetry: () => ref.invalidate(lessonsProvider(classId)),
        ),
        data: (lessons) {
          if (lessons.isEmpty) {
            return _EmptyState(canWrite: canWrite);
          }

          final sorted = [...lessons]
            ..sort((a, b) => b.sessionDate.compareTo(a.sessionDate));

          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(lessonsProvider(classId)),
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 96),
              children: [
                _Header(lessonCount: sorted.length, canWrite: canWrite)
                    .animate()
                    .fadeIn(duration: 220.ms)
                    .slideY(begin: 0.04),
                const SizedBox(height: 14),
                ...sorted.asMap().entries.map(
                      (entry) => _LessonCard(
                        lesson: entry.value,
                        index: entry.key,
                      ),
                    ),
              ],
            ),
          );
        },
      ),
    );
  }

  void _showLessonSheet(BuildContext context, WidgetRef ref) {
    final subjectCtrl = TextEditingController();
    final contentCtrl = TextEditingController();
    final homeworkCtrl = TextEditingController();
    var saving = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor:
          Theme.of(context).colorScheme.surface.withValues(alpha: 0),
      builder: (sheetContext) {
        return StatefulBuilder(
          builder: (context, setSheetState) {
            final text = _LessonText.of(context);
            final colors = context.appColors;
            final colorScheme = Theme.of(context).colorScheme;
            return Container(
              decoration: BoxDecoration(
                color: colors.cardBg,
                borderRadius:
                    const BorderRadius.vertical(top: Radius.circular(8)),
              ),
              padding: EdgeInsets.fromLTRB(
                20,
                16,
                20,
                MediaQuery.of(sheetContext).viewInsets.bottom + 20,
              ),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
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
                      text.todayCourse,
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: subjectCtrl,
                      textCapitalization: TextCapitalization.words,
                      decoration: InputDecoration(
                        labelText: text.subject,
                        prefixIcon: const Icon(Icons.menu_book_outlined),
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: contentCtrl,
                      minLines: 3,
                      maxLines: 6,
                      textCapitalization: TextCapitalization.sentences,
                      decoration: InputDecoration(
                        labelText: text.courseContent,
                        prefixIcon: const Icon(Icons.edit_note_outlined),
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: homeworkCtrl,
                      minLines: 2,
                      maxLines: 4,
                      textCapitalization: TextCapitalization.sentences,
                      decoration: InputDecoration(
                        labelText: text.homeworkFollowUp,
                        prefixIcon: const Icon(Icons.assignment_outlined),
                      ),
                    ),
                    const SizedBox(height: 18),
                    ElevatedButton.icon(
                      onPressed: saving
                          ? null
                          : () async {
                              final subject = subjectCtrl.text.trim();
                              final content = contentCtrl.text.trim();
                              if (subject.isEmpty || content.isEmpty) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text(text.requiredWarning),
                                  ),
                                );
                                return;
                              }
                              setSheetState(() => saving = true);
                              try {
                                await ref
                                    .read(lessonNotifierProvider.notifier)
                                    .addLesson(
                                      classId: classId,
                                      subject: subject,
                                      content: content,
                                      homeworkSummary: homeworkCtrl.text.trim(),
                                    );
                                ref.invalidate(lessonsProvider(classId));
                                if (sheetContext.mounted) {
                                  Navigator.pop(sheetContext);
                                }
                              } finally {
                                if (sheetContext.mounted) {
                                  setSheetState(() => saving = false);
                                }
                              }
                            },
                      icon: saving
                          ? SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: colorScheme.onPrimary,
                              ),
                            )
                          : const Icon(Icons.save_outlined),
                      label: Text(text.save),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    ).whenComplete(() {
      subjectCtrl.dispose();
      contentCtrl.dispose();
      homeworkCtrl.dispose();
    });
  }
}

class _Header extends StatelessWidget {
  final int lessonCount;
  final bool canWrite;

  const _Header({required this.lessonCount, required this.canWrite});

  @override
  Widget build(BuildContext context) {
    final text = _LessonText.of(context);
    final colors = context.appColors;
    return _Panel(
      child: Row(
        children: [
          _IconBox(icon: Icons.menu_book_outlined, tone: colors.tealDark),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  text.headerTitle,
                  style: const TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  canWrite ? text.headerStaffSubtitle : text.headerReadSubtitle,
                  style: TextStyle(
                    color: colors.mutedText,
                    height: 1.25,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          _MiniMetric(value: '$lessonCount', label: text.courseMetric),
        ],
      ),
    );
  }
}

class _LessonCard extends StatelessWidget {
  final LessonEntryModel lesson;
  final int index;

  const _LessonCard({required this.lesson, required this.index});

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final colorScheme = Theme.of(context).colorScheme;
    final hasHomework = lesson.homeworkSummary != null &&
        lesson.homeworkSummary!.trim().isNotEmpty;

    return _Panel(
      margin: const EdgeInsetsDirectional.only(bottom: 12),
      padding: EdgeInsets.zero,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 14, 14, 10),
            child: Row(
              children: [
                _IconBox(icon: Icons.school_outlined, tone: colors.tealDark),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    lesson.subject,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w900,
                      color: colorScheme.onSurface,
                    ),
                  ),
                ),
                _DateChip(date: lesson.sessionDate),
              ],
            ),
          ),
          const Divider(),
          Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  lesson.content,
                  style: TextStyle(height: 1.35, color: colorScheme.onSurface),
                ),
                if (hasHomework) ...[
                  const SizedBox(height: 12),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: colors.tealDark.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: colors.tealDark.withValues(alpha: 0.16),
                      ),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(
                          Icons.assignment_outlined,
                          color: colors.tealDark,
                          size: 18,
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            lesson.homeworkSummary!,
                            style: TextStyle(
                              color: colorScheme.onSurface,
                              height: 1.3,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
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

class _DateChip extends StatelessWidget {
  final DateTime date;

  const _DateChip({required this.date});

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final locale = Localizations.localeOf(context).toLanguageTag();
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 6),
      decoration: BoxDecoration(
        color: colors.tealDark.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        DateFormat('dd/MM', locale).format(date),
        style: TextStyle(
          color: colors.tealDark,
          fontWeight: FontWeight.w900,
          fontSize: 12,
        ),
      ),
    );
  }
}

class _MiniMetric extends StatelessWidget {
  final String value;
  final String label;

  const _MiniMetric({required this.value, required this.label});

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    return Container(
      width: 62,
      padding: const EdgeInsets.symmetric(vertical: 8),
      decoration: BoxDecoration(
        color: colors.tealDark.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        children: [
          Text(
            value,
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900),
          ),
          Text(
            label,
            style: TextStyle(
              color: colors.mutedText,
              fontSize: 11,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  final bool canWrite;

  const _EmptyState({required this.canWrite});

  @override
  Widget build(BuildContext context) {
    final text = _LessonText.of(context);
    final colors = context.appColors;
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(24),
      children: [
        const SizedBox(height: 88),
        _Panel(
          child: Column(
            children: [
              _IconBox(icon: Icons.menu_book_outlined, tone: colors.tealDark),
              const SizedBox(height: 16),
              Text(
                text.emptyTitle,
                style:
                    const TextStyle(fontSize: 20, fontWeight: FontWeight.w900),
              ),
              const SizedBox(height: 8),
              Text(
                canWrite ? text.emptyStaffSubtitle : text.emptyReadSubtitle,
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
  final VoidCallback onRetry;

  const _ErrorState({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    final text = _LessonText.of(context);
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
              const SizedBox(height: 14),
              OutlinedButton.icon(
                onPressed: onRetry,
                icon: const Icon(Icons.refresh),
                label: Text(text.retry),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _LessonText {
  final String languageCode;

  const _LessonText(this.languageCode);

  static _LessonText of(BuildContext context) =>
      _LessonText(Localizations.localeOf(context).languageCode);

  bool get _ar => languageCode == 'ar';
  bool get _fr => languageCode == 'fr';

  String pick(String ar, String fr, String en) {
    if (_ar) return ar;
    if (_fr) return fr;
    return en;
  }

  String get title => pick('دفتر النصوص', 'Cahier de texte', 'Lesson diary');
  String get refresh => pick('تحديث', 'Actualiser', 'Refresh');
  String get courseShort => pick('درس', 'Cours', 'Lesson');
  String get todayCourse => pick('درس اليوم', 'Cours du jour', 'Today lesson');
  String get subject => pick('المادة', 'Matiere', 'Subject');
  String get courseContent =>
      pick('محتوى الدرس', 'Contenu du cours', 'Lesson content');
  String get homeworkFollowUp =>
      pick('واجبات / متابعة', 'Devoirs / suite', 'Homework / follow-up');
  String get requiredWarning => pick(
        'المادة والمحتوى مطلوبان.',
        'Matiere et contenu sont obligatoires.',
        'Subject and content are required.',
      );
  String get save => pick('حفظ', 'Enregistrer', 'Save');
  String get headerTitle =>
      pick('السجل البيداغوجي', 'Journal pedagogique', 'Teaching journal');
  String get headerStaffSubtitle => pick(
        'سجل الدروس المنجزة في القسم وما يجب تحضيره لاحقا.',
        'Saisissez les cours faits en classe et les suites a preparer.',
        'Record completed class lessons and follow-up work to prepare.',
      );
  String get headerReadSubtitle => pick(
        'اطلع على الدروس والواجبات والمتابعات التي يعلنها الأساتذة.',
        'Consultez les cours, devoirs et suites annoncees par les enseignants.',
        'View lessons, homework, and follow-up shared by teachers.',
      );
  String get courseMetric => pick('دروس', 'cours', 'lessons');
  String get emptyTitle =>
      pick('لا توجد دروس', 'Aucun cours saisi', 'No lessons yet');
  String get emptyStaffSubtitle => pick(
        'أضف أول درس لملء دفتر النصوص.',
        'Ajoutez le premier cours pour alimenter le cahier de texte.',
        'Add the first lesson to start the diary.',
      );
  String get emptyReadSubtitle => pick(
        'ستظهر الدروس هنا عندما ينشرها الأستاذ.',
        'Les cours apparaitront ici des que l enseignant les publie.',
        'Lessons will appear here once the teacher publishes them.',
      );
  String get unstableConnection =>
      pick('الاتصال غير مستقر', 'Connexion instable', 'Unstable connection');
  String get retry => pick('إعادة المحاولة', 'Reessayer', 'Retry');
  String loadError(Object error) => pick(
        'تعذر تحميل دفتر النصوص. $error',
        'Impossible de charger le cahier. $error',
        'Unable to load the lesson diary. $error',
      );
}
