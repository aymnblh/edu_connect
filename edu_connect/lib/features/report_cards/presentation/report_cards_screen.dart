import 'package:flutter/material.dart';
import 'package:flutter/services.dart' show rootBundle;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/child_switcher_bar.dart';
import '../../../core/widgets/shimmer_loading.dart';
import '../../auth/presentation/providers/children_provider.dart';
import '../data/report_card_repository.dart';

String _score(double? value) => value == null ? '—' : value.toStringAsFixed(2);

String _coef(double value) => value == value.roundToDouble()
    ? value.toInt().toString()
    : value.toStringAsFixed(1);

/// Parent view: the selected child's published term report cards.
class ReportCardsScreen extends ConsumerWidget {
  const ReportCardsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final text = _RcText.of(context);
    final child = ref.watch(selectedChildProvider);

    return Scaffold(
      appBar: AppBar(title: Text(text.title)),
      body: Column(
        children: [
          const ChildSwitcherBar(),
          Expanded(
            child: child == null
                ? const ShimmerList(showAvatar: false)
                : ref.watch(studentReportCardsProvider(child.id)).when(
                      loading: () => const ShimmerList(showAvatar: false),
                      error: (e, _) => Center(child: Text(text.loadError(e))),
                      data: (cards) {
                        if (cards.isEmpty) {
                          return Center(
                            child: Padding(
                              padding: const EdgeInsets.all(24),
                              child:
                                  Text(text.empty, textAlign: TextAlign.center),
                            ),
                          );
                        }
                        return RefreshIndicator(
                          onRefresh: () async => ref
                              .invalidate(studentReportCardsProvider(child.id)),
                          child: ListView(
                            padding: const EdgeInsets.all(16),
                            children: [
                              for (final card in cards)
                                Card(
                                  child: ListTile(
                                    leading: Icon(Icons.description_outlined,
                                        color: context.appColors.tealDark),
                                    title: Text(card.semesterName ?? '',
                                        style: const TextStyle(
                                            fontWeight: FontWeight.w700)),
                                    subtitle: Text([
                                      '${_score(card.overallAverage)} / 20',
                                      if (card.rank != null)
                                        text.rankOf(card.rank!, card.classSize),
                                    ].join(' · ')),
                                    trailing: const Icon(Icons.chevron_right),
                                    onTap: () => Navigator.of(context).push(
                                      MaterialPageRoute<void>(
                                        builder: (_) =>
                                            ReportCardDetailScreen(id: card.id),
                                      ),
                                    ),
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
    );
  }
}

class ReportCardDetailScreen extends ConsumerWidget {
  final String id;

  const ReportCardDetailScreen({super.key, required this.id});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final text = _RcText.of(context);
    final detailAsync = ref.watch(reportCardDetailProvider(id));

    return Scaffold(
      appBar: AppBar(
        title: Text(text.title),
        actions: [
          if (detailAsync.hasValue)
            IconButton(
              icon: const Icon(Icons.picture_as_pdf_outlined),
              tooltip: text.pdf,
              onPressed: () => _printPdf(context, detailAsync.value!),
            ),
        ],
      ),
      body: detailAsync.when(
        loading: () => const ShimmerList(showAvatar: false),
        error: (e, _) => Center(child: Text(text.loadError(e))),
        data: (card) => ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Text(card.schoolName ?? '',
                style: const TextStyle(fontWeight: FontWeight.w800)),
            Text(text.sheetTitle(card.summary.semesterName ?? ''),
                style:
                    const TextStyle(fontSize: 18, fontWeight: FontWeight.w900)),
            const SizedBox(height: 4),
            Text([
              card.studentName,
              if (card.studentNumber != null) card.studentNumber!,
              card.summary.className ?? '',
            ].join(' · ')),
            const SizedBox(height: 16),
            Table(
              border: TableBorder.all(color: context.appColors.cardBorder),
              columnWidths: const {0: FlexColumnWidth(3)},
              defaultVerticalAlignment: TableCellVerticalAlignment.middle,
              children: [
                _row([text.subject, text.coef, text.average, text.classAvg],
                    bold: true),
                for (final line in card.subjects)
                  _row([
                    line.subject,
                    _coef(line.coefficient),
                    _score(line.average),
                    _score(line.classAverage),
                  ]),
              ],
            ),
            const SizedBox(height: 16),
            _Fact(text.overall, '${_score(card.summary.overallAverage)} / 20'),
            _Fact(
                text.rank,
                card.summary.rank == null
                    ? '—'
                    : text.rankOf(card.summary.rank!, card.summary.classSize)),
            _Fact(text.classOverall, _score(card.classAverage)),
            _Fact(
                text.attendance,
                text.attendanceCounts(
                    card.absences, card.justifiedAbsences, card.lates)),
            if (card.mention != null)
              _Fact(text.distinction, text.mention(card.mention!)),
          ],
        ),
      ),
    );
  }

  TableRow _row(List<String> cells, {bool bold = false}) => TableRow(
        children: [
          for (final cell in cells)
            Padding(
              padding: const EdgeInsets.all(8),
              child: Text(cell,
                  style: TextStyle(
                      fontWeight: bold ? FontWeight.w800 : FontWeight.w400)),
            ),
        ],
      );

  Future<void> _printPdf(BuildContext context, ReportCardDetail card) async {
    final text = _RcText.of(context);
    final isRtl = Localizations.localeOf(context).languageCode == 'ar';
    final base =
        pw.Font.ttf(await rootBundle.load('assets/fonts/Cairo-Regular.ttf'));
    final bold =
        pw.Font.ttf(await rootBundle.load('assets/fonts/Cairo-Bold.ttf'));
    List<String> ordered(List<String> row) =>
        isRtl ? row.reversed.toList() : row;

    final pdf = pw.Document();
    pdf.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.a4,
        theme: pw.ThemeData.withFont(base: base, bold: bold),
        textDirection: isRtl ? pw.TextDirection.rtl : pw.TextDirection.ltr,
        build: (ctx) => pw.Column(
          crossAxisAlignment: pw.CrossAxisAlignment.stretch,
          children: [
            pw.Text(card.schoolName ?? '',
                style:
                    pw.TextStyle(fontSize: 14, fontWeight: pw.FontWeight.bold)),
            pw.Text(text.sheetTitle(card.summary.semesterName ?? ''),
                style:
                    pw.TextStyle(fontSize: 18, fontWeight: pw.FontWeight.bold)),
            if (card.periodStart != null && card.periodEnd != null)
              pw.Text(text.period(card.periodStart!, card.periodEnd!)),
            pw.SizedBox(height: 8),
            pw.Text([
              card.studentName,
              if (card.studentNumber != null) card.studentNumber!,
              card.summary.className ?? '',
            ].join(' - ')),
            pw.Divider(),
            pw.TableHelper.fromTextArray(
              headers: ordered(
                  [text.subject, text.coef, text.average, text.classAvg]),
              data: [
                for (final line in card.subjects)
                  ordered([
                    line.subject,
                    _coef(line.coefficient),
                    _score(line.average),
                    _score(line.classAverage),
                  ]),
              ],
              headerStyle: pw.TextStyle(fontWeight: pw.FontWeight.bold),
              cellAlignment: pw.Alignment.center,
            ),
            pw.SizedBox(height: 12),
            pw.Text(
                '${text.overall} : ${_score(card.summary.overallAverage)} / 20',
                style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
            pw.Text(
                '${text.rank} : ${card.summary.rank == null ? '—' : text.rankOf(card.summary.rank!, card.summary.classSize)}'),
            pw.Text('${text.classOverall} : ${_score(card.classAverage)}'),
            pw.Text(
                '${text.attendance} : ${text.attendanceCounts(card.absences, card.justifiedAbsences, card.lates)}'),
          ],
        ),
      ),
    );
    await Printing.layoutPdf(
      name:
          '${text.title} ${card.studentName} ${card.summary.semesterName ?? ''}',
      onLayout: (_) async => pdf.save(),
    );
  }
}

class _Fact extends StatelessWidget {
  final String label;
  final String value;
  const _Fact(this.label, this.value);

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(
          children: [
            Expanded(
              child: Text(label,
                  style: TextStyle(color: context.appColors.mutedText)),
            ),
            Text(value, style: const TextStyle(fontWeight: FontWeight.w800)),
          ],
        ),
      );
}

class _RcText {
  final String code;
  const _RcText(this.code);

  static _RcText of(BuildContext context) =>
      _RcText(Localizations.localeOf(context).languageCode);

  String pick(String ar, String fr, String en) =>
      code == 'ar' ? ar : (code == 'fr' ? fr : en);

  String get title => pick('كشوف النقاط', 'Bulletins', 'Report cards');
  String get empty => pick('لا يوجد كشف نقاط منشور حاليا.',
      'Aucun bulletin publie pour le moment.', 'No report card published yet.');
  String get pdf => pick('PDF', 'PDF', 'PDF');
  String get subject => pick('المادة', 'Matiere', 'Subject');
  String get coef => pick('المعامل', 'Coef.', 'Coef.');
  String get average => pick('المعدل', 'Moyenne', 'Average');
  String get classAvg => pick('معدل القسم', 'Moy. classe', 'Class avg.');
  String get distinction => pick('التمييز', 'Distinction', 'Distinction');
  String mention(String key) => switch (key) {
        'felicitations' => pick('تهنئة', 'Felicitations', 'Congratulations'),
        'encouragements' => pick('تشجيع', 'Encouragements', 'Encouragement'),
        _ => pick('لوحة الشرف', "Tableau d'honneur", 'Honour roll'),
      };
  String get overall =>
      pick('المعدل العام', 'Moyenne generale', 'Overall average');
  String get rank => pick('الرتبة', 'Rang', 'Rank');
  String get classOverall =>
      pick('معدل القسم العام', 'Moyenne de la classe', 'Class average');
  String get attendance => pick('المواظبة', 'Assiduite', 'Attendance');
  String sheetTitle(String term) => pick(
      'كشف النقاط — $term', 'Bulletin de notes — $term', 'Report card — $term');
  String period(String start, String end) => pick('الفترة من $start إلى $end',
      'Periode du $start au $end', 'Period $start to $end');
  String rankOf(int rank, int size) => '$rank / $size';
  String attendanceCounts(int absences, int justified, int lates) => pick(
      '$absences غياب منها $justified مبرر، $lates تأخر',
      '$absences absence(s) dont $justified justifiee(s), $lates retard(s)',
      '$absences absence(s), $justified justified, $lates late');
  String loadError(Object e) => pick(
      'تعذر التحميل: $e', 'Chargement impossible : $e', 'Could not load: $e');
}
