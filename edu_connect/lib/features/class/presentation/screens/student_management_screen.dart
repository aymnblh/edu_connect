import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:intl/intl.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../../data/repositories/student_repository.dart';
import '../../data/models/student_model.dart';
import 'package:edu_connect/l10n/app_localizations.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/shimmer_loading.dart';

class StudentManagementScreen extends ConsumerStatefulWidget {
  const StudentManagementScreen({super.key});

  @override
  ConsumerState<StudentManagementScreen> createState() =>
      _StudentManagementScreenState();
}

class _StudentManagementScreenState
    extends ConsumerState<StudentManagementScreen> {
  String _searchQuery = '';
  String? _generatingQrForStudentId;

  Future<void> _regeneratePin(StudentModel student) async {
    final l10n = AppLocalizations.of(context)!;
    final colors = context.appColors;
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(l10n.regeneratePin),
        content: Text(l10n.confirmRegeneratePin(student.fullName)),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: Text(l10n.cancel)),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: Text(l10n.regeneratePin,
                style: TextStyle(color: colors.dangerRed)),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    try {
      final newPin =
          await ref.read(studentRepositoryProvider).regeneratePin(student.id);
      if (mounted) {
        showDialog(
          context: context,
          builder: (ctx) => AlertDialog(
            title: Text(l10n.newPinGenerated),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(l10n.shareNewPin),
                const SizedBox(height: 16),
                Text(
                  newPin,
                  style: TextStyle(
                      fontSize: 32,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 8,
                      color: colors.tealDark),
                  textDirection: ui.TextDirection.ltr,
                ),
              ],
            ),
            actions: [
              TextButton(
                  onPressed: () => Navigator.pop(ctx),
                  child:
                      Text(MaterialLocalizations.of(context).closeButtonLabel)),
            ],
          ),
        );
        ref.invalidate(schoolStudentsProvider);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('${l10n.error}: $e'),
            backgroundColor: colors.dangerRed,
          ),
        );
      }
    }
  }

  Future<void> _generateParentQr(StudentModel student) async {
    final l10n = AppLocalizations.of(context)!;
    final colors = context.appColors;
    final copy = _StudentLinkingCopy(context);

    setState(() => _generatingQrForStudentId = student.id);
    try {
      final token =
          await ref.read(studentRepositoryProvider).generateParentLinkToken(
                student.id,
                label: copy.parentLabel,
              );
      if (!mounted) return;
      await _showParentQrDialog(student, token);
      ref.invalidate(schoolStudentsProvider);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('${l10n.error}: $e'),
            backgroundColor: colors.dangerRed,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _generatingQrForStudentId = null);
      }
    }
  }

  Future<void> _showParentQrDialog(
    StudentModel student,
    ParentLinkToken token,
  ) async {
    final copy = _StudentLinkingCopy(context);
    final colors = context.appColors;
    final expiresText = _formatExpiry(token.expiresAt);

    await showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(copy.qrTitle),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(
                child: Container(
                  width: 232,
                  height: 232,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: colors.cardBorder),
                  ),
                  child: QrImageView(
                    data: token.token,
                    version: QrVersions.auto,
                    backgroundColor: Colors.white,
                    eyeStyle: QrEyeStyle(
                      eyeShape: QrEyeShape.square,
                      color: colors.tealDark,
                    ),
                    dataModuleStyle: QrDataModuleStyle(
                      dataModuleShape: QrDataModuleShape.square,
                      color: colors.tealDark,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 18),
              Text(
                student.fullName,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontWeight: FontWeight.w700,
                  fontSize: 18,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                copy.studentCode(student.studentId ?? '-'),
                textAlign: TextAlign.center,
                textDirection: ui.TextDirection.ltr,
                style: TextStyle(color: colors.subtitleText),
              ),
              const SizedBox(height: 14),
              Text(
                copy.expiresAt(expiresText),
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: colors.warningAmber,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 12),
              Text(
                copy.qrHelp,
                textAlign: TextAlign.center,
                style: TextStyle(color: colors.subtitleText, height: 1.4),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text(MaterialLocalizations.of(context).closeButtonLabel),
          ),
          TextButton.icon(
            onPressed: () => _printLinkSheet(student, token),
            icon: const Icon(Icons.print_outlined),
            label: Text(copy.print),
          ),
          FilledButton.icon(
            onPressed: () => _shareLinkSheet(student, token),
            icon: const Icon(Icons.ios_share_outlined),
            label: Text(copy.share),
          ),
        ],
      ),
    );
  }

  Future<Uint8List> _buildLinkSheetPdf(
    StudentModel student,
    ParentLinkToken token,
  ) async {
    final copy = _StudentLinkingCopy(context);
    final locale = Localizations.localeOf(context).languageCode;
    final isRtl = locale == 'ar';
    final fontData = await rootBundle.load('assets/fonts/Cairo-Regular.ttf');
    final boldFontData = await rootBundle.load('assets/fonts/Cairo-Bold.ttf');
    final font = pw.Font.ttf(fontData);
    final boldFont = pw.Font.ttf(boldFontData);
    final pdf = pw.Document();
    final expiresText = _formatExpiry(token.expiresAt);

    pdf.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(40),
        theme: pw.ThemeData.withFont(base: font, bold: boldFont),
        build: (ctx) => pw.Directionality(
          textDirection: isRtl ? pw.TextDirection.rtl : pw.TextDirection.ltr,
          child: pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.stretch,
            children: [
              pw.Text(
                'Wasel Edu',
                textAlign: pw.TextAlign.center,
                style: pw.TextStyle(
                  color: PdfColor.fromHex('#087F6F'),
                  fontSize: 28,
                  fontWeight: pw.FontWeight.bold,
                ),
              ),
              pw.SizedBox(height: 12),
              pw.Text(
                copy.pdfTitle,
                textAlign: pw.TextAlign.center,
                style: pw.TextStyle(
                  fontSize: 18,
                  fontWeight: pw.FontWeight.bold,
                ),
              ),
              pw.SizedBox(height: 28),
              pw.Center(
                child: pw.Container(
                  padding: const pw.EdgeInsets.all(14),
                  decoration: pw.BoxDecoration(
                    border: pw.Border.all(color: PdfColors.grey400),
                  ),
                  child: pw.BarcodeWidget(
                    barcode: pw.Barcode.qrCode(),
                    data: token.token,
                    width: 190,
                    height: 190,
                    drawText: false,
                  ),
                ),
              ),
              pw.SizedBox(height: 28),
              pw.Text(
                student.fullName,
                textAlign: pw.TextAlign.center,
                style: pw.TextStyle(
                  fontSize: 20,
                  fontWeight: pw.FontWeight.bold,
                ),
              ),
              pw.SizedBox(height: 8),
              pw.Text(
                copy.studentCode(student.studentId ?? '-'),
                textAlign: pw.TextAlign.center,
                textDirection: pw.TextDirection.ltr,
                style: const pw.TextStyle(fontSize: 13),
              ),
              pw.SizedBox(height: 20),
              pw.Text(
                copy.pdfInstructions,
                textAlign: pw.TextAlign.center,
                style: const pw.TextStyle(fontSize: 13, lineSpacing: 4),
              ),
              pw.SizedBox(height: 18),
              pw.Text(
                copy.expiresAt(expiresText),
                textAlign: pw.TextAlign.center,
                style: pw.TextStyle(
                  color: PdfColors.orange800,
                  fontSize: 12,
                  fontWeight: pw.FontWeight.bold,
                ),
              ),
              pw.Spacer(),
              pw.Divider(),
              pw.Text(
                copy.pdfSecurityNote,
                textAlign: pw.TextAlign.center,
                style: const pw.TextStyle(
                  color: PdfColors.grey700,
                  fontSize: 10,
                  lineSpacing: 3,
                ),
              ),
            ],
          ),
        ),
      ),
    );

    return pdf.save();
  }

  Future<void> _printLinkSheet(
    StudentModel student,
    ParentLinkToken token,
  ) async {
    final bytes = await _buildLinkSheetPdf(student, token);
    await Printing.layoutPdf(onLayout: (_) async => bytes);
  }

  Future<void> _shareLinkSheet(
    StudentModel student,
    ParentLinkToken token,
  ) async {
    final bytes = await _buildLinkSheetPdf(student, token);
    await Printing.sharePdf(
      bytes: bytes,
      filename: 'wasel-edu-parent-link-${_safeFileName(student.fullName)}.pdf',
    );
  }

  String _formatExpiry(DateTime value) {
    final local = value.toLocal();
    return DateFormat('dd/MM/yyyy HH:mm').format(local);
  }

  String _safeFileName(String value) {
    final safe = value
        .toLowerCase()
        .replaceAll(RegExp(r'[^a-z0-9]+'), '-')
        .replaceAll(RegExp(r'^-+|-+$'), '');
    return safe.isEmpty ? 'student' : safe;
  }

  @override
  Widget build(BuildContext context) {
    final studentsAsync = ref.watch(schoolStudentsProvider);
    final l10n = AppLocalizations.of(context)!;
    final colors = context.appColors;

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.manageStudents),
        leading: IconButton(
          tooltip: MaterialLocalizations.of(context).backButtonTooltip,
          icon: Icon(Icons.adaptive.arrow_back),
          onPressed: () {
            if (context.canPop()) {
              context.pop();
            } else {
              context.go('/admin-tools');
            }
          },
        ),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: TextField(
              onChanged: (v) => setState(() => _searchQuery = v.toLowerCase()),
              decoration: InputDecoration(
                hintText: l10n.searchPlaceholder,
                prefixIcon: const Icon(Icons.search),
                filled: true,
                fillColor: colors.inputBg,
                border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide(color: colors.inputBorder)),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: colors.inputBorder),
                ),
              ),
            ),
          ),
          Expanded(
            child: studentsAsync.when(
              data: (students) {
                final filtered = students
                    .where((s) =>
                        s.fullName.toLowerCase().contains(_searchQuery) ||
                        (s.studentId?.toLowerCase().contains(_searchQuery) ??
                            false))
                    .toList();

                if (filtered.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.person_off_outlined,
                            size: 64, color: colors.cardBorder),
                        const SizedBox(height: 16),
                        Text(
                            _searchQuery.isEmpty
                                ? l10n.noStudentsFound
                                : l10n.noMatchingStudents,
                            style: TextStyle(color: colors.mutedText)),
                      ],
                    ),
                  );
                }

                return ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: filtered.length,
                  itemBuilder: (ctx, i) {
                    final student = filtered[i];
                    final isLinked = student.parents.isNotEmpty;

                    return Card(
                      margin: const EdgeInsetsDirectional.only(bottom: 12),
                      elevation: 0,
                      color: colors.cardBg,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                        side: BorderSide(color: colors.cardBorder),
                      ),
                      child: ListTile(
                        contentPadding: const EdgeInsets.all(16),
                        title: Text(student.fullName,
                            style:
                                const TextStyle(fontWeight: FontWeight.bold)),
                        subtitle: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const SizedBox(height: 4),
                            Text(l10n.studentIdLabel(student.studentId ?? '-'),
                                style: TextStyle(color: colors.subtitleText)),
                            const SizedBox(height: 4),
                            Row(
                              children: [
                                Icon(
                                  isLinked ? Icons.link : Icons.link_off,
                                  size: 14,
                                  color: isLinked
                                      ? colors.successGreen
                                      : colors.warningAmber,
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  isLinked
                                      ? '${l10n.linked} (${student.parents.length})'
                                      : l10n.notLinked,
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: isLinked
                                        ? colors.successGreen
                                        : colors.warningAmber,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                        trailing: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            IconButton(
                              icon: _generatingQrForStudentId == student.id
                                  ? SizedBox(
                                      width: 20,
                                      height: 20,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                        color: colors.tealDark,
                                      ),
                                    )
                                  : Icon(
                                      Icons.qr_code_2_rounded,
                                      color: colors.tealDark,
                                    ),
                              tooltip: _StudentLinkingCopy(context).generateQr,
                              onPressed: _generatingQrForStudentId == student.id
                                  ? null
                                  : () => _generateParentQr(student),
                            ),
                            IconButton(
                              icon: Icon(Icons.refresh_rounded,
                                  color: colors.tealDark),
                              tooltip: l10n.regeneratePin,
                              onPressed: () => _regeneratePin(student),
                            ),
                          ],
                        ),
                      ),
                    ).animate().fadeIn(delay: (i * 50).ms).slideX(begin: 0.1);
                  },
                );
              },
              loading: () => const ShimmerList(
                itemCount: 6,
                padding: EdgeInsetsDirectional.symmetric(horizontal: 16),
              ),
              error: (e, _) => Center(child: Text('${l10n.error}: $e')),
            ),
          ),
        ],
      ),
    );
  }
}

class _StudentLinkingCopy {
  _StudentLinkingCopy(BuildContext context)
      : _languageCode = Localizations.localeOf(context).languageCode;

  final String _languageCode;

  bool get _ar => _languageCode == 'ar';
  bool get _fr => _languageCode == 'fr';

  String pick(String ar, String fr, String en) => _ar ? ar : (_fr ? fr : en);

  String get parentLabel => pick('ولي الأمر', 'Parent', 'Parent');

  String get generateQr => pick(
        'إنشاء QR لولي الأمر',
        'Créer le QR parent',
        'Create parent QR',
      );

  String get qrTitle => pick(
        'رمز QR لربط ولي الأمر',
        'QR de liaison parent',
        'Parent linking QR',
      );

  String studentCode(String code) => pick(
        'رقم التلميذ: $code',
        'ID élève : $code',
        'Student ID: $code',
      );

  String expiresAt(String value) => pick(
        'صالح إلى: $value',
        'Valable jusqu’au : $value',
        'Valid until: $value',
      );

  String get qrHelp => pick(
        'يمكن لولي الأمر مسح هذا الرمز من تطبيق Wasel Edu لربط حسابه بالتلميذ. الرمز يستعمل مرة واحدة فقط.',
        'Le parent peut scanner ce code dans Wasel Edu pour lier son compte à l’élève. Ce code est à usage unique.',
        'The parent can scan this code in Wasel Edu to link their account to the student. This code is one-time use.',
      );

  String get print => pick('طباعة', 'Imprimer', 'Print');

  String get share => pick('مشاركة', 'Partager', 'Share');

  String get pdfTitle => pick(
        'دعوة ربط حساب ولي الأمر',
        'Invitation de liaison parent',
        'Parent account linking invitation',
      );

  String get pdfInstructions => pick(
        'افتح تطبيق Wasel Edu، اختر تسجيل الدخول بالرمز أو QR، ثم امسح هذا الرمز لإكمال ربط الحساب.',
        'Ouvrez l’application Wasel Edu, choisissez la connexion par code ou QR, puis scannez ce code pour finaliser la liaison du compte.',
        'Open the Wasel Edu app, choose code or QR sign-in, then scan this code to finish linking the account.',
      );

  String get pdfSecurityNote => pick(
        'هذا الرمز شخصي وسري. لا تشاركه إلا مع ولي الأمر المخول. إذا ضاع أو أرسل بالخطأ، أنشئ رمز QR جديدا من الإدارة.',
        'Ce code est personnel et confidentiel. Ne le partagez qu’avec le parent autorisé. S’il est perdu ou envoyé par erreur, générez un nouveau QR depuis l’administration.',
        'This code is personal and confidential. Share it only with the authorized parent. If it is lost or sent by mistake, generate a new QR from administration.',
      );
}
