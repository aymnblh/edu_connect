import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'package:intl/intl.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/shimmer_loading.dart';
import '../../../grades/presentation/providers/grades_provider.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import 'package:edu_connect/l10n/app_localizations.dart';

class GradeBulletinScreen extends ConsumerWidget {
  final String classId;
  final String? studentId;

  const GradeBulletinScreen({super.key, required this.classId, this.studentId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final colors = context.appColors;
    final colorScheme = Theme.of(context).colorScheme;
    final userAsync = ref.watch(authNotifierProvider);
    final gradesAsync = ref.watch(gradesProvider(classId));

    return Scaffold(
      appBar: AppBar(title: Text(l10n.gradeBulletin)),
      body: gradesAsync.when(
        loading: () => const ShimmerList(showAvatar: false),
        error: (e, _) => Center(child: Text('${l10n.error}: $e')),
        data: (grades) {
          return userAsync.when(
            loading: () => const ShimmerList(showAvatar: false),
            error: (e, _) => const SizedBox.shrink(),
            data: (user) {
              final sid = studentId ?? user?.id ?? '';
              final studentGrades =
                  grades.where((g) => g.studentId == sid).toList();

              if (studentGrades.isEmpty) {
                return Center(child: Text(l10n.noData));
              }

              final studentName = studentGrades.first.studentName;

              return Column(
                children: [
                  Expanded(
                    child: ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: studentGrades.length,
                      itemBuilder: (ctx, i) {
                        final g = studentGrades[i];
                        return Card(
                          margin: const EdgeInsetsDirectional.only(bottom: 8),
                          child: ListTile(
                            leading: CircleAvatar(
                              backgroundColor: colors.tealDark,
                              child: Text(
                                g.formattedValue,
                                style: TextStyle(
                                  color: colorScheme.onPrimary,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 12,
                                ),
                                textDirection: ui.TextDirection.ltr,
                              ),
                            ),
                            title: Text(
                              g.subject,
                              style:
                                  const TextStyle(fontWeight: FontWeight.w600),
                            ),
                            subtitle: Text(
                              '/ ${g.maxValue.toInt()} - Coef. ${_formatCoefficient(g.coefficient)} - ${DateFormat('dd/MM/yyyy').format(g.date)}',
                              textDirection: ui.TextDirection.ltr,
                            ),
                            trailing: g.comment != null
                                ? Tooltip(
                                    message: g.comment!,
                                    child: Icon(
                                      Icons.comment_outlined,
                                      color: colors.tealDark,
                                    ),
                                  )
                                : null,
                          ),
                        );
                      },
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: ElevatedButton.icon(
                      onPressed: () => _generateAndPrint(
                        context,
                        studentName,
                        studentGrades,
                      ),
                      icon: const Icon(Icons.picture_as_pdf_outlined),
                      label: Text(l10n.generatePdf),
                    ),
                  ),
                ],
              );
            },
          );
        },
      ),
    );
  }

  Future<void> _generateAndPrint(
    BuildContext context,
    String studentName,
    List grades,
  ) async {
    final l10n = AppLocalizations.of(context)!;
    final isRtl = Localizations.localeOf(context).languageCode == 'ar';

    final fontData = await rootBundle.load('assets/fonts/Cairo-Regular.ttf');
    final ttf = pw.Font.ttf(fontData);
    final fontBoldData = await rootBundle.load('assets/fonts/Cairo-Bold.ttf');
    final ttfBold = pw.Font.ttf(fontBoldData);

    final pdf = pw.Document();

    pdf.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        theme: pw.ThemeData.withFont(
          base: ttf,
          bold: ttfBold,
        ),
        textDirection: isRtl ? pw.TextDirection.rtl : pw.TextDirection.ltr,
        header: (ctx) => pw.Column(
          crossAxisAlignment:
              isRtl ? pw.CrossAxisAlignment.end : pw.CrossAxisAlignment.start,
          children: [
            pw.Text(
              'Wasel Edu - ${l10n.gradeBulletin}',
              style: pw.TextStyle(
                fontSize: 22,
                fontWeight: pw.FontWeight.bold,
              ),
            ),
            pw.SizedBox(height: 4),
            pw.Text(
              '${l10n.student} : $studentName',
              style: const pw.TextStyle(fontSize: 14),
            ),
            pw.Text(
              'Date : ${DateFormat('dd/MM/yyyy').format(DateTime.now())}',
              style: const pw.TextStyle(fontSize: 12),
              textDirection: pw.TextDirection.ltr,
            ),
            pw.Divider(),
          ],
        ),
        build: (ctx) => [
          pw.TableHelper.fromTextArray(
            headers: isRtl
                ? [
                    'Date',
                    l10n.observation,
                    'Coef.',
                    '/Max',
                    'Note',
                    l10n.subject
                  ]
                : [
                    l10n.subject,
                    'Note',
                    '/Max',
                    'Coef.',
                    l10n.observation,
                    'Date'
                  ],
            data: grades.map((g) {
              final row = [
                g.subject,
                g.formattedValue,
                '${g.maxValue.toInt()}',
                _formatCoefficient(g.coefficient),
                g.comment ?? '',
                DateFormat('dd/MM/yy').format(g.date),
              ];
              return isRtl ? row.reversed.toList() : row;
            }).toList(),
            headerStyle: pw.TextStyle(fontWeight: pw.FontWeight.bold),
            cellAlignment: pw.Alignment.center,
          ),
        ],
        footer: (ctx) => pw.Align(
          alignment: isRtl ? pw.Alignment.centerLeft : pw.Alignment.centerRight,
          child: pw.Text(
            isRtl
                ? '${ctx.pagesCount} / ${ctx.pageNumber} صفحة'
                : 'Page ${ctx.pageNumber} / ${ctx.pagesCount}',
            style: const pw.TextStyle(fontSize: 10),
            textDirection: isRtl ? pw.TextDirection.rtl : pw.TextDirection.ltr,
          ),
        ),
      ),
    );

    await Printing.layoutPdf(onLayout: (format) async => pdf.save());
  }
}

String _formatCoefficient(double value) {
  if (value == value.roundToDouble()) return value.toInt().toString();
  return value.toStringAsFixed(1);
}
