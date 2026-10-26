import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../core/widgets/shimmer_loading.dart';
import '../fees/fees_screen.dart' show formatDA;
import 'director_repository.dart';

/// The director's monthly report on the phone (printing stays on the web).
class MonthlyReportScreen extends ConsumerStatefulWidget {
  const MonthlyReportScreen({super.key});

  @override
  ConsumerState<MonthlyReportScreen> createState() =>
      _MonthlyReportScreenState();
}

class _MonthlyReportScreenState extends ConsumerState<MonthlyReportScreen> {
  String? _month;

  @override
  Widget build(BuildContext context) {
    final text = _MText.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(text.title)),
      body: ref.watch(monthlyReportProvider(_month)).when(
            loading: () => const ShimmerList(showAvatar: false),
            error: (e, _) => Center(child: Text(text.error)),
            data: (report) => _ReportView(
              report: report,
              onMonth: (month) => setState(() => _month = month),
            ),
          ),
    );
  }
}

String monthLabel(String month, String languageCode) {
  final parts = month.split('-').map(int.parse).toList();
  final locale =
      languageCode == 'ar' ? 'ar' : (languageCode == 'fr' ? 'fr' : 'en');
  try {
    return DateFormat.yMMMM(locale).format(DateTime(parts[0], parts[1]));
  } catch (_) {
    return month;
  }
}

/// "+3" / "-2" / "=" next to last month, never coloured (up is not always good).
String delta(num current, num previous) {
  final diff = current - previous;
  if (diff == 0) return '=';
  final value = diff is double ? diff.toStringAsFixed(1) : '$diff';
  return diff > 0 ? '+$value' : value;
}

class _ReportView extends StatelessWidget {
  final MonthlyReport report;
  final ValueChanged<String> onMonth;

  const _ReportView({required this.report, required this.onMonth});

  @override
  Widget build(BuildContext context) {
    final text = _MText.of(context);
    final lang = text.code;
    final c = report.current;
    final p = report.previous;
    final theme = Theme.of(context);
    final previousName = monthLabel(report.previousMonth, lang);

    Widget tile(String label, String value, String change) => Card(
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: theme.textTheme.bodySmall),
                const SizedBox(height: 4),
                Text(value,
                    style: theme.textTheme.headlineSmall
                        ?.copyWith(fontWeight: FontWeight.w700)),
                Text(text.vs(change, previousName),
                    style: theme.textTheme.bodySmall),
              ],
            ),
          ),
        );

    final rows = <(String, int, int)>[
      (text.absences, c.absences, p.absences),
      (text.unjustified, c.unjustifiedAbsences, p.unjustifiedAbsences),
      (text.lates, c.lates, p.lates),
      (text.homework, c.homeworkPosted, p.homeworkPosted),
      (text.messages, c.messages, p.messages),
      (text.meetings, c.meetingsBooked, p.meetingsBooked),
      (text.teachers, c.activeTeachers, p.activeTeachers),
    ];

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        DropdownButtonFormField<String>(
          initialValue: report.month,
          decoration: InputDecoration(
              labelText: text.month, border: const OutlineInputBorder()),
          items: [
            for (final month in report.availableMonths)
              DropdownMenuItem(
                  value: month, child: Text(monthLabel(month, lang)))
          ],
          onChanged: (value) {
            if (value != null) onMonth(value);
          },
        ),
        if (report.isPartial)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Text(text.partial, style: theme.textTheme.bodySmall),
          ),
        const SizedBox(height: 12),
        GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          childAspectRatio: 1.35,
          children: [
            tile(
                text.attendance,
                c.attendanceRate == null
                    ? '—'
                    : '${c.attendanceRate!.toStringAsFixed(1)} %',
                c.attendanceRate == null || p.attendanceRate == null
                    ? '—'
                    : delta(c.attendanceRate!, p.attendanceRate!)),
            tile(text.notifications, '${c.parentNotifications}',
                delta(c.parentNotifications, p.parentNotifications)),
            tile(text.parents, '${c.activeParents}',
                delta(c.activeParents, p.activeParents)),
            tile(text.grades, '${c.gradesEntered}',
                delta(c.gradesEntered, p.gradesEntered)),
          ],
        ),
        Card(
          child: ListTile(
            leading: const Icon(Icons.account_balance_wallet_outlined),
            title: Text(text.fees),
            trailing: Text(formatDA(c.feesCollected, lang),
                style: const TextStyle(fontWeight: FontWeight.w700)),
            subtitle:
                Text(text.vs(formatDA(p.feesCollected, lang), previousName)),
          ),
        ),
        if (report.parentCoverage != null)
          Card(
            child: ListTile(
              leading: const Icon(Icons.family_restroom),
              title: Text(text.coverage),
              trailing: Text('${report.parentCoverage!.toStringAsFixed(1)} %',
                  style: const TextStyle(fontWeight: FontWeight.w700)),
            ),
          ),
        const SizedBox(height: 8),
        Text(text.schoolLife, style: theme.textTheme.titleMedium),
        for (final (label, now, before) in rows)
          ListTile(
            dense: true,
            title: Text(label),
            trailing: Text('$now  (${delta(now, before)})'),
          ),
        if (report.classAttendance.isNotEmpty) ...[
          const SizedBox(height: 8),
          Text(text.byClass, style: theme.textTheme.titleMedium),
          for (final (name, rate) in report.classAttendance)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 6),
              child: Row(children: [
                SizedBox(width: 80, child: Text(name)),
                Expanded(
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: LinearProgressIndicator(
                      value: (rate ?? 0) / 100,
                      minHeight: 10,
                      // Same single-series blue as the web report.
                      color: const Color(0xFF2A78D6),
                      backgroundColor:
                          theme.dividerColor.withValues(alpha: 0.3),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Text(rate == null ? '—' : '${rate.toStringAsFixed(1)} %'),
              ]),
            ),
        ],
        const SizedBox(height: 12),
        Text(text.printOnWeb, style: theme.textTheme.bodySmall),
      ],
    );
  }
}

class _MText {
  final String code;
  const _MText(this.code);

  static _MText of(BuildContext context) =>
      _MText(Localizations.localeOf(context).languageCode);

  String pick(String ar, String fr, String en) =>
      code == 'ar' ? ar : (code == 'fr' ? fr : en);

  String get title =>
      pick('الحصيلة الشهرية', 'Bilan mensuel', 'Monthly report');
  String get error => pick('تعذر تحميل الحصيلة.',
      'Impossible de charger le bilan.', 'Could not load the report.');
  String get month => pick('الشهر', 'Mois', 'Month');
  String get partial => pick(
      'الشهر الجاري: الأرقام إلى غاية اليوم.',
      'Mois en cours : chiffres arretes a aujourd\'hui.',
      'Month in progress: figures to date.');
  String vs(String change, String month) => pick('$change مقارنة بـ $month',
      '$change par rapport a $month', '$change vs $month');
  String get attendance =>
      pick('نسبة الحضور', 'Taux de presence', 'Attendance rate');
  String get notifications => pick('إشعارات للأولياء',
      'Notifications aux parents', 'Notifications to parents');
  String get parents =>
      pick('أولياء نشطون', 'Parents actifs', 'Active parents');
  String get grades => pick('نقاط مُدخلة', 'Notes saisies', 'Grades entered');
  String get fees => pick('مصاريف محصّلة', 'Frais encaisses', 'Fees collected');
  String get coverage => pick('تلاميذ لهم ولي متصل',
      'Eleves avec un parent connecte', 'Students with a parent connected');
  String get schoolLife =>
      pick('الحياة المدرسية', "Vie de l'ecole", 'School life');
  String get absences => pick('غيابات', 'Absences', 'Absences');
  String get unjustified =>
      pick('منها غير مبررة', 'dont non justifiees', 'of which unjustified');
  String get lates => pick('تأخرات', 'Retards', 'Late arrivals');
  String get homework =>
      pick('واجبات منشورة', 'Devoirs publies', 'Homework posted');
  String get messages => pick('رسائل', 'Messages', 'Messages');
  String get meetings =>
      pick('مواعيد أولياء', 'Rendez-vous parents', 'Parent meetings');
  String get teachers =>
      pick('أساتذة نشطون', 'Enseignants actifs', 'Active teachers');
  String get byClass =>
      pick('الحضور حسب القسم', 'Presence par classe', 'Attendance by class');
  String get printOnWeb => pick(
      'للطباعة أو PDF، افتح الحصيلة من نسخة الويب.',
      'Pour imprimer ou faire un PDF, ouvrez le bilan sur la version web.',
      'To print or save as PDF, open the report on the web.');
}
