import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/app_drawer.dart';
import '../../../../core/widgets/shimmer_loading.dart';
import '../../../../l10n/app_localizations.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../data/models/analytics_overview.dart';
import '../providers/analytics_provider.dart';

class DirectorDashboardScreen extends ConsumerWidget {
  const DirectorDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final text = _DashText.of(context);
    final analyticsState = ref.watch(analyticsOverviewStateProvider);
    final user = ref.watch(authNotifierProvider).valueOrNull;

    return Scaffold(
      drawer: user != null ? AppDrawer(user: user) : null,
      appBar: AppBar(
        title: Text(text.direction),
        actions: [
          Semantics(
            button: true,
            label: l10n.notifications,
            child: IconButton(
              icon: const Icon(Icons.notifications_outlined),
              tooltip: l10n.notifications,
              onPressed: () => context.push('/notifications'),
            ),
          ),
          Semantics(
            button: true,
            label: text.refresh,
            child: IconButton(
              icon: const Icon(Icons.refresh),
              tooltip: text.refresh,
              onPressed: () =>
                  ref.read(analyticsOverviewStateProvider.notifier).refresh(),
            ),
          ),
        ],
      ),
      body: analyticsState.when(
        loading: () => const ShimmerDashboard(),
        error: (err, _) => _ErrorState(
          message: _friendlyDashboardError(context, err),
          onRetry: () =>
              ref.read(analyticsOverviewStateProvider.notifier).refresh(),
        ),
        data: (data) => RefreshIndicator(
          onRefresh: () async {
            await ref.read(analyticsOverviewStateProvider.notifier).refresh();
          },
          child: SafeArea(
            top: false,
            child: Builder(
              builder: (context) {
                final bottomPadding = MediaQuery.paddingOf(context).bottom + 32;

                return CustomScrollView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  slivers: [
                    SliverPadding(
                      padding: EdgeInsetsDirectional.fromSTEB(
                          16, 12, 16, bottomPadding),
                      sliver: SliverList(
                        delegate: SliverChildListDelegate([
                          _DashboardHeader(data: data)
                              .animate()
                              .fadeIn(duration: 220.ms)
                              .slideY(begin: 0.04),
                          const SizedBox(height: 12),
                          _QuickActions()
                              .animate()
                              .fadeIn(delay: 80.ms, duration: 220.ms),
                          const SizedBox(height: 16),
                          _KpiGrid(data: data)
                              .animate()
                              .fadeIn(delay: 120.ms, duration: 260.ms)
                              .slideY(begin: 0.04),
                          const SizedBox(height: 20),
                          _SectionTitle(text.classPerformance),
                          const SizedBox(height: 10),
                          _ClassChart(data: data)
                              .animate()
                              .fadeIn(delay: 160.ms, duration: 260.ms),
                          const SizedBox(height: 20),
                          _SectionTitle(text.studentTracking),
                          const SizedBox(height: 10),
                          _StudentList(
                            title: text.topResults,
                            students: data.top_students,
                            tone: Theme.of(context)
                                .extension<AppColors>()!
                                .successGreen,
                          ),
                          const SizedBox(height: 12),
                          _StudentList(
                            title: text.watchList,
                            students: data.struggling_students,
                            tone: Theme.of(context)
                                .extension<AppColors>()!
                                .dangerRed,
                          ),
                        ]),
                      ),
                    ),
                  ],
                );
              },
            ),
          ),
        ),
      ),
    );
  }
}

String _friendlyDashboardError(BuildContext context, Object error) {
  final text = _DashText.of(context);
  final raw = error.toString().toLowerCase();
  if (raw.contains('status code of 500') || raw.contains('dioexception')) {
    return text.statsUnavailable;
  }
  if (raw.contains('connection') ||
      raw.contains('socket') ||
      raw.contains('timeout')) {
    return text.serverUnavailable;
  }
  return text.statsUnavailable;
}

class _DashboardHeader extends StatelessWidget {
  final AnalyticsOverview data;

  const _DashboardHeader({required this.data});

  @override
  Widget build(BuildContext context) {
    final text = _DashText.of(context);
    final colors = Theme.of(context).extension<AppColors>()!;
    return _Panel(
      child: Row(
        children: [
          const _IconBox(icon: Icons.space_dashboard_outlined),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  text.operationalView,
                  style: const TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  _summary(text),
                  style: TextStyle(color: colors.mutedText, height: 1.25),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  String _summary(_DashText text) {
    final absenceWarning = data.absence_rate >= 10;
    final gradeWarning = data.school_avg > 0 && data.school_avg < 10;
    if (absenceWarning && gradeWarning) {
      return text.summaryAbsenceAndGrades;
    }
    if (absenceWarning) return text.summaryAbsence;
    if (gradeWarning) return text.summaryGrades;
    return text.summaryStable;
  }
}

class _QuickActions extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final text = _DashText.of(context);
    return Row(
      children: [
        Expanded(
          child: _ActionButton(
            icon: Icons.class_outlined,
            label: l10n.classList,
            onTap: () => context.push('/classes'),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: _ActionButton(
            icon: Icons.admin_panel_settings_outlined,
            label: text.administration,
            onTap: () => context.push('/admin-tools'),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: _ActionButton(
            icon: Icons.mark_email_unread_outlined,
            label: l10n.chat,
            onTap: () => context.push('/messaging'),
          ),
        ),
      ],
    );
  }
}

class _ActionButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _ActionButton({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<AppColors>()!;
    return Semantics(
      button: true,
      label: label,
      child: Material(
        color: colors.cardBg,
        borderRadius: BorderRadius.circular(8),
        child: InkWell(
          borderRadius: BorderRadius.circular(8),
          onTap: onTap,
          child: Container(
            height: 72,
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: colors.cardBorder),
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(icon, size: 20, color: colors.subtitleText),
                const SizedBox(height: 6),
                Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                      fontSize: 12, fontWeight: FontWeight.w700),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _KpiGrid extends StatelessWidget {
  final AnalyticsOverview data;

  const _KpiGrid({required this.data});

  @override
  Widget build(BuildContext context) {
    final text = _DashText.of(context);
    final colors = context.appColors;
    return GridView.count(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisCount: 2,
      crossAxisSpacing: 8,
      mainAxisSpacing: 8,
      childAspectRatio: 1.75,
      children: [
        _KpiCard(
          label: text.average,
          value: '${data.school_avg.toStringAsFixed(2)}/20',
          icon: Icons.timeline,
          tone: colors.tealDark,
        ),
        _KpiCard(
          label: text.absenteeism,
          value: '${data.absence_rate.toStringAsFixed(1)}%',
          icon: Icons.event_busy_outlined,
          tone: colors.warningAmber,
        ),
        _KpiCard(
          label: text.linkedParents,
          value: '${data.adoption_rate.toStringAsFixed(0)}%',
          icon: Icons.family_restroom_outlined,
          tone: colors.successGreen,
        ),
        _KpiCard(
          label: text.subjects,
          value: '${data.subject_performance.length}',
          icon: Icons.menu_book_outlined,
          tone: colors.tealAccent,
        ),
      ],
    );
  }
}

class _KpiCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color tone;

  const _KpiCard({
    required this.label,
    required this.value,
    required this.icon,
    required this.tone,
  });

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<AppColors>()!;
    return Semantics(
      label: '$label: $value',
      child: _Panel(
        child: Row(
          children: [
            _IconBox(icon: icon, tone: tone),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    value,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                        fontSize: 18, fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    label,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(fontSize: 12, color: colors.mutedText),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ClassChart extends StatelessWidget {
  final AnalyticsOverview data;

  const _ClassChart({required this.data});

  @override
  Widget build(BuildContext context) {
    final text = _DashText.of(context);
    final colors = Theme.of(context).extension<AppColors>()!;
    if (data.class_performance.isEmpty) {
      return _EmptyPanel(message: text.noData);
    }

    final sortedClasses = List<ClassPerformance>.from(data.class_performance)
      ..sort((a, b) => b.average_score.compareTo(a.average_score));
    final displayClasses = sortedClasses.take(6).toList();

    return _Panel(
      height: 250,
      padding: const EdgeInsets.fromLTRB(8, 20, 16, 8),
      child: BarChart(
        BarChartData(
          alignment: BarChartAlignment.spaceAround,
          maxY: 20,
          minY: 0,
          gridData: FlGridData(
            show: true,
            drawVerticalLine: false,
            horizontalInterval: 5,
            getDrawingHorizontalLine: (value) =>
                FlLine(color: colors.dividerColor, strokeWidth: 1),
          ),
          titlesData: FlTitlesData(
            rightTitles:
                const AxisTitles(sideTitles: SideTitles(showTitles: false)),
            topTitles:
                const AxisTitles(sideTitles: SideTitles(showTitles: false)),
            bottomTitles: AxisTitles(
              sideTitles: SideTitles(
                showTitles: true,
                reservedSize: 42,
                getTitlesWidget: (double value, TitleMeta meta) {
                  if (value.toInt() >= displayClasses.length) {
                    return const SizedBox.shrink();
                  }
                  return Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Text(
                      displayClasses[value.toInt()].class_name,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                          fontSize: 10, fontWeight: FontWeight.w700),
                    ),
                  );
                },
              ),
            ),
            leftTitles: AxisTitles(
              sideTitles: SideTitles(
                showTitles: true,
                interval: 5,
                reservedSize: 28,
                getTitlesWidget: (value, meta) => Text(
                  value.toInt().toString(),
                  style: TextStyle(color: colors.mutedText, fontSize: 11),
                ),
              ),
            ),
          ),
          borderData: FlBorderData(show: false),
          barGroups: displayClasses.asMap().entries.map((entry) {
            final index = entry.key;
            final cls = entry.value;
            return BarChartGroupData(
              x: index,
              barRods: [
                BarChartRodData(
                  toY: cls.average_score,
                  width: 16,
                  color: colors.subtitleText,
                  borderRadius: BorderRadius.circular(4),
                  backDrawRodData: BackgroundBarChartRodData(
                    show: true,
                    toY: 20,
                    color: colors.inputBg,
                  ),
                ),
              ],
            );
          }).toList(),
        ),
      ),
    );
  }
}

class _StudentList extends StatelessWidget {
  final String title;
  final List<StudentRanking> students;
  final Color tone;

  const _StudentList({
    required this.title,
    required this.students,
    required this.tone,
  });

  @override
  Widget build(BuildContext context) {
    final text = _DashText.of(context);
    return _Panel(
      padding: EdgeInsets.zero,
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(14),
            child: Row(
              children: [
                Icon(Icons.person_search_outlined, color: tone, size: 18),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    title,
                    style: const TextStyle(fontWeight: FontWeight.w800),
                  ),
                ),
              ],
            ),
          ),
          if (students.isEmpty)
            Padding(
              padding: const EdgeInsetsDirectional.fromSTEB(14, 0, 14, 14),
              child: Align(
                alignment: AlignmentDirectional.centerStart,
                child: Text(text.noDataYet),
              ),
            )
          else
            ...students.take(5).map(
                  (student) => ListTile(
                    dense: true,
                    title: Text(student.student_name),
                    subtitle: Text(student.class_name),
                    trailing: Text(
                      student.average_score.toStringAsFixed(2),
                      style:
                          TextStyle(color: tone, fontWeight: FontWeight.w800),
                    ),
                  ),
                ),
        ],
      ),
    );
  }
}

class _Panel extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  final double? height;

  const _Panel({
    required this.child,
    this.padding = const EdgeInsets.all(14),
    this.height,
  });

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<AppColors>()!;
    return Container(
      height: height,
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
  final Color? tone;

  const _IconBox({required this.icon, this.tone});

  @override
  Widget build(BuildContext context) {
    final effectiveTone =
        tone ?? Theme.of(context).extension<AppColors>()!.subtitleText;
    return Container(
      width: 40,
      height: 40,
      decoration: BoxDecoration(
        color: effectiveTone.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Icon(icon, color: effectiveTone, size: 20),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  final String title;

  const _SectionTitle(this.title);

  @override
  Widget build(BuildContext context) {
    return Text(
      title,
      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
    );
  }
}

class _EmptyPanel extends StatelessWidget {
  final String message;

  const _EmptyPanel({required this.message});

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<AppColors>()!;
    return _Panel(
      child: Text(message, style: TextStyle(color: colors.mutedText)),
    );
  }
}

class _ErrorState extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;

  const _ErrorState({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<AppColors>()!;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.error_outline, size: 40, color: colors.dangerRed),
            const SizedBox(height: 12),
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh),
              label: Text(_DashText.of(context).retry),
            ),
          ],
        ),
      ),
    );
  }
}

class _DashText {
  final String languageCode;

  const _DashText(this.languageCode);

  static _DashText of(BuildContext context) =>
      _DashText(Localizations.localeOf(context).languageCode);

  bool get _ar => languageCode == 'ar';
  bool get _fr => languageCode == 'fr';

  String get direction => _ar
      ? 'الإدارة'
      : _fr
          ? 'Direction'
          : 'Direction';
  String get refresh => _ar
      ? 'تحديث'
      : _fr
          ? 'Actualiser'
          : 'Refresh';
  String get retry => _ar
      ? 'إعادة المحاولة'
      : _fr
          ? 'Réessayer'
          : 'Retry';
  String get classPerformance => _ar
      ? 'أداء الفصول'
      : _fr
          ? 'Performances par classe'
          : 'Class performance';
  String get studentTracking => _ar
      ? 'متابعة التلاميذ'
      : _fr
          ? 'Suivi élèves'
          : 'Student tracking';
  String get topResults => _ar
      ? 'أفضل النتائج'
      : _fr
          ? 'Meilleurs résultats'
          : 'Top results';
  String get watchList => _ar
      ? 'يحتاجون متابعة'
      : _fr
          ? 'À surveiller'
          : 'Watch list';
  String get statsUnavailable => _ar
      ? 'تعذر تحميل الإحصائيات الآن. حاول مرة أخرى بعد قليل.'
      : _fr
          ? 'Impossible de charger les statistiques pour le moment. Réessayez dans quelques secondes.'
          : 'Unable to load statistics right now. Try again in a few seconds.';
  String get serverUnavailable => _ar
      ? 'الاتصال بالخادم غير متاح. تحقق من الشبكة ثم حاول مرة أخرى.'
      : _fr
          ? 'Connexion au serveur indisponible. Vérifiez le réseau puis réessayez.'
          : 'Server connection unavailable. Check the network and retry.';
  String get operationalView => _ar
      ? 'نظرة تشغيلية'
      : _fr
          ? 'Vue opérationnelle'
          : 'Operational view';
  String get summaryAbsenceAndGrades => _ar
      ? 'الغيابات والمعدلات تحتاج إلى متابعة.'
      : _fr
          ? 'Absences et moyennes demandent une vérification.'
          : 'Absences and averages need review.';
  String get summaryAbsence => _ar
      ? 'نسبة الغياب فوق عتبة المتابعة.'
      : _fr
          ? 'Absentéisme au-dessus du seuil de vigilance.'
          : 'Absenteeism is above the watch threshold.';
  String get summaryGrades => _ar
      ? 'المعدل العام أقل من المستوى المنتظر.'
      : _fr
          ? 'Moyenne générale sous le seuil attendu.'
          : 'School average is below the expected threshold.';
  String get summaryStable => _ar
      ? 'الوضع مستقر. واصل متابعة التحقق من النقاط والمدفوعات.'
      : _fr
          ? 'Situation stable. Continuez le suivi des validations et paiements.'
          : 'Stable situation. Keep tracking approvals and payments.';
  String get administration => _ar
      ? 'الإشراف'
      : _fr
          ? 'Administration'
          : 'Administration';
  String get average => _ar
      ? 'المعدل'
      : _fr
          ? 'Moyenne'
          : 'Average';
  String get absenteeism => _ar
      ? 'الغياب'
      : _fr
          ? 'Absentéisme'
          : 'Absenteeism';
  String get linkedParents => _ar
      ? 'الأولياء المرتبطون'
      : _fr
          ? 'Parents liés'
          : 'Linked parents';
  String get subjects => _ar
      ? 'المواد'
      : _fr
          ? 'Matières'
          : 'Subjects';
  String get noData => _ar
      ? 'لا توجد بيانات متاحة'
      : _fr
          ? 'Aucune donnée disponible'
          : 'No data available';
  String get noDataYet => _ar
      ? 'لا توجد بيانات حالياً'
      : _fr
          ? 'Aucune donnée pour le moment'
          : 'No data yet';
}
