import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/utils/validators.dart';
import '../../../../core/utils/date_formatter.dart';
import '../../../../core/widgets/shimmer_loading.dart';
import '../providers/remarks_provider.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../../auth/data/models/user_model.dart';
import '../../data/models/remark_model.dart';
import '../../../class/data/models/class_model.dart';
import '../../../class/data/models/student_model.dart';
import '../../../class/presentation/providers/class_provider.dart';
import 'package:edu_connect/l10n/app_localizations.dart';

class RemarksListScreen extends ConsumerWidget {
  final String classId;

  const RemarksListScreen({super.key, required this.classId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final text = _RemarksText.of(context);
    final colors = context.appColors;
    final colorScheme = Theme.of(context).colorScheme;
    final userAsync = ref.watch(authNotifierProvider);
    final remarksAsync = ref.watch(classRemarksProvider(classId));

    return userAsync.when(
      loading: () => const Scaffold(
        body: SafeArea(child: ShimmerList(showAvatar: false)),
      ),
      error: (e, _) => Scaffold(body: Center(child: Text(text.loadError(e)))),
      data: (UserModel? user) {
        if (user == null) return const SizedBox.shrink();

        return Scaffold(
          appBar: AppBar(
            title: Text(l10n.remarks),
            leading: IconButton(
              icon: Icon(Icons.adaptive.arrow_back),
              tooltip: MaterialLocalizations.of(context).backButtonTooltip,
              onPressed: () {
                if (context.canPop()) {
                  context.pop();
                } else {
                  context.go('/class/$classId/chat');
                }
              },
            ),
          ),
          floatingActionButton: user.isTeacher
              ? FloatingActionButton(
                  tooltip: text.addRemark,
                  backgroundColor: colors.tealDark,
                  foregroundColor: colorScheme.onPrimary,
                  child: const Icon(Icons.add),
                  onPressed: () {
                    final clsAsync = ref.read(classDetailProvider(classId));
                    clsAsync.whenData(
                        (cls) => _showAddRemarkDialog(context, ref, cls));
                  },
                )
              : null,
          body: remarksAsync.when(
            loading: () => const ShimmerList(showAvatar: false),
            error: (e, _) => Center(child: Text(text.loadError(e))),
            data: (remarks) {
              // Parents only see remarks addressed to them/their child
              final filtered = user.isParent
                  ? remarks.where((r) => r.studentId == user.id).toList()
                  : remarks;

              if (filtered.isEmpty) {
                return Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.speaker_notes_off_outlined,
                          size: 64,
                          color: colors.mutedText.withValues(alpha: 0.35)),
                      const SizedBox(height: 16),
                      Text(l10n.noData,
                          style: TextStyle(
                              color: colors.mutedText,
                              fontSize: 16,
                              fontWeight: FontWeight.w600)),
                    ],
                  ),
                );
              }

              return ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: filtered.length,
                itemBuilder: (ctx, i) {
                  return _RemarkCard(
                      remark: filtered[i], index: i, isTeacher: user.isTeacher);
                },
              );
            },
          ),
        );
      },
    );
  }

  void _showAddRemarkDialog(
      BuildContext context, WidgetRef ref, ClassModel cls) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor:
          Theme.of(context).colorScheme.surface.withValues(alpha: 0),
      builder: (ctx) => _AddRemarkSheet(
        classId: classId,
        members: cls.members,
        onSubmit: (studentId, studentName, title, content, type) async {
          final newRemark = RemarkModel(
            id: '',
            classId: classId,
            studentId: studentId,
            studentName: studentName,
            title: title,
            content: content,
            type: type,
            date: DateTime.now(),
          );
          await ref.read(remarksNotifierProvider.notifier).addRemark(newRemark);
          if (ctx.mounted) Navigator.pop(ctx);
        },
      ),
    );
  }
}

class _AddRemarkSheet extends ConsumerStatefulWidget {
  final String classId;
  final List<StudentModel> members;
  final Future<void> Function(String, String, String, String, RemarkType)
      onSubmit;

  const _AddRemarkSheet(
      {required this.classId, required this.members, required this.onSubmit});

  @override
  ConsumerState<_AddRemarkSheet> createState() => _AddRemarkSheetState();
}

class _AddRemarkSheetState extends ConsumerState<_AddRemarkSheet> {
  final _formKey = GlobalKey<FormState>();
  StudentModel? _selectedStudent;
  final _titleCtrl = TextEditingController();
  final _contentCtrl = TextEditingController();
  RemarkType _selectedType = RemarkType.information;
  bool _loading = false;

  @override
  void dispose() {
    _titleCtrl.dispose();
    _contentCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final text = _RemarksText.of(context);
    final colors = context.appColors;
    final colorScheme = Theme.of(context).colorScheme;
    return Container(
      decoration: BoxDecoration(
        color: colors.cardBg,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: EdgeInsets.fromLTRB(
          24, 16, 24, MediaQuery.of(context).viewInsets.bottom + 24),
      child: Form(
        key: _formKey,
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            mainAxisSize: MainAxisSize.min,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: colors.cardBorder,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 20),
              Text(text.newRemark,
                  style: const TextStyle(
                      fontSize: 20, fontWeight: FontWeight.w700)),
              const SizedBox(height: 20),
              DropdownButtonFormField<StudentModel>(
                initialValue: _selectedStudent,
                items: widget.members
                    .map((s) => DropdownMenuItem<StudentModel>(
                          value: s,
                          child: Text(s.fullName),
                        ))
                    .toList(),
                onChanged: (v) => setState(() => _selectedStudent = v),
                decoration: InputDecoration(labelText: text.selectStudent),
                validator: (v) => v == null ? text.selectStudentRequired : null,
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<RemarkType>(
                initialValue: _selectedType,
                decoration: InputDecoration(labelText: text.remarkType),
                items: [
                  DropdownMenuItem(
                      value: RemarkType.information,
                      child: Text(text.information,
                          style: TextStyle(color: colors.tealDark))),
                  DropdownMenuItem(
                      value: RemarkType.warning,
                      child: Text(text.warning,
                          style: TextStyle(color: colors.warningAmber))),
                  DropdownMenuItem(
                      value: RemarkType.praise,
                      child: Text(text.praise,
                          style: TextStyle(color: colors.successGreen))),
                ],
                onChanged: (val) {
                  if (val != null) setState(() => _selectedType = val);
                },
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _titleCtrl,
                validator: (v) => Validators.required(v, text.title),
                textCapitalization: TextCapitalization.sentences,
                decoration: InputDecoration(labelText: text.titleHint),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _contentCtrl,
                validator: (v) => Validators.required(v, text.content),
                maxLines: 3,
                textCapitalization: TextCapitalization.sentences,
                decoration: InputDecoration(labelText: text.detailedContent),
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: _loading
                    ? null
                    : () async {
                        if (!_formKey.currentState!.validate() ||
                            _selectedStudent == null) {
                          return;
                        }
                        setState(() => _loading = true);
                        try {
                          await widget.onSubmit(
                            _selectedStudent!.id,
                            _selectedStudent!.fullName,
                            _titleCtrl.text.trim(),
                            _contentCtrl.text.trim(),
                            _selectedType,
                          );
                        } finally {
                          if (mounted) setState(() => _loading = false);
                        }
                      },
                child: _loading
                    ? SizedBox(
                        height: 18,
                        width: 18,
                        child: CircularProgressIndicator(
                            strokeWidth: 2,
                            valueColor: AlwaysStoppedAnimation<Color>(
                                colorScheme.onPrimary)))
                    : Text(text.send),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _RemarkCard extends StatelessWidget {
  final RemarkModel remark;
  final int index;
  final bool isTeacher;

  const _RemarkCard(
      {required this.remark, required this.index, required this.isTeacher});

  Color _color(BuildContext context) {
    final colors = context.appColors;
    switch (remark.type) {
      case RemarkType.warning:
        return colors.warningAmber;
      case RemarkType.praise:
        return colors.successGreen;
      case RemarkType.information:
        return colors.tealDark;
    }
  }

  IconData get _icon {
    switch (remark.type) {
      case RemarkType.warning:
        return Icons.warning_amber_rounded;
      case RemarkType.praise:
        return Icons.star_border_rounded;
      case RemarkType.information:
        return Icons.info_outline_rounded;
    }
  }

  @override
  Widget build(BuildContext context) {
    final text = _RemarksText.of(context);
    final colors = context.appColors;
    final colorScheme = Theme.of(context).colorScheme;
    final tone = _color(context);

    return Card(
      margin: const EdgeInsetsDirectional.only(bottom: 12),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: tone.withValues(alpha: 0.3)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(_icon, color: tone, size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    remark.title,
                    style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                        color: colorScheme.onSurface),
                  ),
                ),
                Text(
                  DateFormatter.gradeDate(remark.date),
                  style: TextStyle(fontSize: 12, color: colors.mutedText),
                  textDirection: TextDirection.ltr,
                ),
              ],
            ),
            if (isTeacher) ...[
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: colors.glassSurface,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(text.studentPrefix(remark.studentName),
                    style: TextStyle(
                        fontSize: 12,
                        color: colors.tealDark,
                        fontWeight: FontWeight.w600)),
              ),
            ],
            const SizedBox(height: 12),
            Text(
              remark.content,
              style: TextStyle(
                  fontSize: 14, color: colors.subtitleText, height: 1.4),
            ),
          ],
        ),
      ),
    )
        .animate()
        .fadeIn(delay: Duration(milliseconds: index * 60))
        .slideX(begin: -0.1);
  }
}

class _RemarksText {
  final String languageCode;

  const _RemarksText(this.languageCode);

  static _RemarksText of(BuildContext context) =>
      _RemarksText(Localizations.localeOf(context).languageCode);

  bool get _ar => languageCode == 'ar';
  bool get _fr => languageCode == 'fr';

  String pick(String ar, String fr, String en) {
    if (_ar) return ar;
    if (_fr) return fr;
    return en;
  }

  String get addRemark =>
      pick('إضافة ملاحظة', 'Ajouter une remarque', 'Add remark');
  String get newRemark =>
      pick('ملاحظة جديدة', 'Nouvelle remarque', 'New remark');
  String get selectStudent =>
      pick('اختيار التلميذ', 'Sélectionner l’élève', 'Select student');
  String get selectStudentRequired => pick(
        'يرجى اختيار تلميذ',
        'Veuillez choisir un élève',
        'Please choose a student',
      );
  String get remarkType =>
      pick('نوع الملاحظة', 'Type de remarque', 'Remark type');
  String get information => pick('معلومة', 'Information', 'Information');
  String get warning => pick('تنبيه', 'Avertissement', 'Warning');
  String get praise => pick('تهنئة', 'Félicitation', 'Praise');
  String get title => pick('العنوان', 'Titre', 'Title');
  String get titleHint =>
      pick('العنوان (مثال: حديث كثير)', 'Titre (ex: Bavardage)', 'Title');
  String get content => pick('المحتوى', 'Contenu', 'Content');
  String get detailedContent =>
      pick('محتوى مفصل', 'Contenu détaillé', 'Detailed content');
  String get send => pick('إرسال', 'Envoyer', 'Send');
  String get unstableConnection =>
      pick('الاتصال غير مستقر', 'Connexion instable', 'Unstable connection');
  String get retry => pick('إعادة المحاولة', 'Réessayer', 'Retry');
  String studentPrefix(String name) =>
      pick('التلميذ: $name', 'Élève : $name', 'Student: $name');
  String loadError(Object error) => pick(
        'تعذر تحميل الملاحظات. $error',
        'Impossible de charger les remarques. $error',
        'Unable to load remarks. $error',
      );
}
