import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:file_picker/file_picker.dart';
import '../../../../core/theme/app_theme.dart';
import 'package:edu_connect/features/class/data/repositories/admin_repository.dart';
import 'package:edu_connect/features/class/data/repositories/student_repository.dart';

class AdminToolsScreen extends ConsumerStatefulWidget {
  const AdminToolsScreen({super.key});

  @override
  ConsumerState<AdminToolsScreen> createState() => _AdminToolsScreenState();
}

class _AdminToolsScreenState extends ConsumerState<AdminToolsScreen> {
  bool _isImporting = false;

  Future<void> _importStudents() async {
    final text = _AdminToolsText.of(context);
    final colors = context.appColors;
    final fileResult = await FilePicker.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['csv'],
    );

    if (fileResult == null || fileResult.files.single.path == null) return;

    setState(() => _isImporting = true);
    try {
      final result = await ref
          .read(adminRepositoryProvider)
          .importStudents(fileResult.files.single.path!);
      ref.invalidate(schoolStudentsProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(_importResultMessage(text, result)),
            backgroundColor: colors.successGreen,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('${text.importFailed}: $e'),
            backgroundColor: colors.dangerRed,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isImporting = false);
    }
  }

  String _importResultMessage(
    _AdminToolsText text,
    StudentImportResult result,
  ) {
    if (text.languageCode == 'ar') {
      return '${text.importSuccess} (${result.imported} مستورد، ${result.skipped} متروك)';
    }
    if (text.languageCode == 'fr') {
      return '${text.importSuccess} (${result.imported} importés, ${result.skipped} ignorés)';
    }
    return '${text.importSuccess} (${result.imported} imported, ${result.skipped} skipped)';
  }

  Future<void> _showCreateTeacherDialog() async {
    final text = _AdminToolsText.of(context);
    final colors = context.appColors;
    final colorScheme = Theme.of(context).colorScheme;
    final nameCtrl = TextEditingController();
    final emailCtrl = TextEditingController();
    final formKey = GlobalKey<FormState>();
    bool isLoading = false;

    await showDialog(
      context: context,
      barrierDismissible: !isLoading,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: Row(
            children: [
              Icon(Icons.person_add_rounded, color: colors.tealDark),
              const SizedBox(width: 10),
              Text(text.createTeacherTitle,
                  style: const TextStyle(fontSize: 18)),
            ],
          ),
          content: Form(
            key: formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  text.createTeacherHelp,
                  style: TextStyle(fontSize: 13, color: colors.mutedText),
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: nameCtrl,
                  textCapitalization: TextCapitalization.words,
                  decoration: InputDecoration(
                    labelText: text.fullName,
                    prefixIcon: const Icon(Icons.person_outline),
                  ),
                  validator: (v) => (v == null || v.trim().isEmpty)
                      ? text.requiredField
                      : null,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: emailCtrl,
                  keyboardType: TextInputType.emailAddress,
                  autocorrect: false,
                  decoration: InputDecoration(
                    labelText: text.workEmail,
                    prefixIcon: const Icon(Icons.email_outlined),
                  ),
                  validator: (v) {
                    if (v == null || v.trim().isEmpty) {
                      return text.requiredField;
                    }
                    if (!v.contains('@')) return text.invalidEmail;
                    return null;
                  },
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: isLoading ? null : () => Navigator.pop(ctx),
              child: Text(text.cancel),
            ),
            ElevatedButton(
              onPressed: isLoading
                  ? null
                  : () async {
                      if (!formKey.currentState!.validate()) return;
                      setDialogState(() => isLoading = true);
                      try {
                        await ref.read(adminRepositoryProvider).createTeacher(
                              email: emailCtrl.text.trim(),
                              fullName: nameCtrl.text.trim(),
                            );
                        if (!mounted) return;
                        if (ctx.mounted) {
                          Navigator.pop(ctx);
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text(
                                  text.teacherCreated(nameCtrl.text.trim())),
                              backgroundColor: colors.successGreen,
                            ),
                          );
                        }
                      } catch (e) {
                        setDialogState(() => isLoading = false);
                        if (!mounted) return;
                        if (ctx.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                                content: Text('${text.error}: $e'),
                                backgroundColor: colors.dangerRed),
                          );
                        }
                      }
                    },
              style: ElevatedButton.styleFrom(
                backgroundColor: colors.tealDark,
                foregroundColor: colorScheme.onPrimary,
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10)),
              ),
              child: isLoading
                  ? SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                          strokeWidth: 2, color: colorScheme.onPrimary),
                    )
                  : Text(text.createAccount),
            ),
          ],
        ),
      ),
    );
    nameCtrl.dispose();
    emailCtrl.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final text = _AdminToolsText.of(context);
    final colors = context.appColors;
    final colorScheme = Theme.of(context).colorScheme;
    final analyticsAsync = ref.watch(schoolAnalyticsProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(text.title),
        leading: IconButton(
          icon: Icon(Icons.adaptive.arrow_back),
          tooltip: MaterialLocalizations.of(context).backButtonTooltip,
          onPressed: () {
            if (context.canPop()) {
              context.pop();
            } else {
              context.go('/dashboard');
            }
          },
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            analyticsAsync.when(
              data: (analytics) => Column(
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: _buildStatCard(
                          text.schoolAverage,
                          '${analytics.schoolAvg}/20',
                          Icons.analytics_outlined,
                          colors.tealDark,
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: _buildStatCard(
                          text.parentAdoption,
                          '${analytics.adoptionRate}%',
                          Icons.family_restroom_outlined,
                          colorScheme.secondary,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),
                  Text(
                    text.classPerformance,
                    style: const TextStyle(
                        fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 12),
                  Container(
                    decoration: BoxDecoration(
                      color: colors.cardBg,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: colors.cardBorder),
                    ),
                    child: ListView.separated(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: analytics.classPerformance.length,
                      separatorBuilder: (ctx, i) =>
                          Divider(height: 1, color: colors.dividerColor),
                      itemBuilder: (ctx, i) {
                        final cp = analytics.classPerformance[i];
                        return ListTile(
                          title: Text(cp.className,
                              style:
                                  const TextStyle(fontWeight: FontWeight.w600)),
                          trailing: Text(
                            '${cp.averageScore}/20',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              color: cp.averageScore >= 10
                                  ? colors.successGreen
                                  : colors.dangerRed,
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                ],
              ),
              loading: () => const LinearProgressIndicator(),
              error: (e, _) =>
                  const SizedBox.shrink(), // Silent fallback for V1
            ),
            const SizedBox(height: 32),
            Text(text.managementTools,
                style:
                    const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            LayoutBuilder(
              builder: (context, constraints) {
                final isDesktop = constraints.maxWidth > 800;

                final toolCards = [
                  _buildToolCard(
                    title: text.createTeacherCardTitle,
                    subtitle: text.createTeacherCardSubtitle,
                    icon: Icons.person_add_rounded,
                    color: colorScheme.onSurface,
                    onTap: _showCreateTeacherDialog,
                  ).animate().fadeIn(delay: 100.ms).slideX(begin: 0.1),
                  _buildToolCard(
                    title: text.bulkImportTitle,
                    subtitle: text.bulkImportSubtitle,
                    icon: Icons.upload_file_rounded,
                    color: colors.tealDark,
                    onTap: _isImporting ? null : _importStudents,
                    isLoading: _isImporting,
                  ).animate().fadeIn(delay: 200.ms).slideX(begin: 0.1),
                  _buildToolCard(
                    title: text.studentRecordsTitle,
                    subtitle: text.studentRecordsSubtitle,
                    icon: Icons.people_alt_rounded,
                    color: colors.warningAmber,
                    onTap: () => context.push('/admin-tools/students'),
                  ).animate().fadeIn(delay: 400.ms).slideX(begin: 0.1),
                  _buildToolCard(
                    title: text.courseLibraryTitle,
                    subtitle: text.courseLibrarySubtitle,
                    icon: Icons.auto_stories_rounded,
                    color: colors.successGreen,
                    onTap: () => context.push('/admin-tools/courses'),
                  ).animate().fadeIn(delay: 600.ms).slideX(begin: 0.1),
                ];

                if (isDesktop) {
                  return GridView.count(
                    crossAxisCount: 2,
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    mainAxisSpacing: 16,
                    crossAxisSpacing: 16,
                    childAspectRatio: 3,
                    children: toolCards,
                  );
                }

                return Column(
                  children: toolCards
                      .map((card) => Padding(
                            padding: const EdgeInsets.only(bottom: 16.0),
                            child: card,
                          ))
                      .toList(),
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatCard(
      String label, String value, IconData icon, Color color) {
    final colors = context.appColors;
    final colorScheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color, size: 24),
          const SizedBox(height: 12),
          Text(value,
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: colorScheme.onSurface,
              )),
          Text(label, style: TextStyle(fontSize: 12, color: colors.mutedText)),
        ],
      ),
    ).animate().fadeIn().slideY(begin: 0.1);
  }

  Widget _buildToolCard({
    required String title,
    required String subtitle,
    required IconData icon,
    required Color color,
    required VoidCallback? onTap,
    bool isLoading = false,
  }) {
    final colors = context.appColors;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: colors.cardBg,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: colors.cardBorder),
          boxShadow: [
            BoxShadow(
              color: Theme.of(context).shadowColor.withValues(alpha: 0.06),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: color, size: 28),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(title,
                      style: const TextStyle(
                          fontSize: 16, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 4),
                  Text(subtitle,
                      style: TextStyle(fontSize: 13, color: colors.mutedText)),
                ],
              ),
            ),
            if (isLoading)
              SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(
                      strokeWidth: 2, color: colors.tealDark))
            else
              Icon(Icons.chevron_right, color: colors.mutedText),
          ],
        ),
      ),
    );
  }
}

class _AdminToolsText {
  final String languageCode;

  const _AdminToolsText(this.languageCode);

  static _AdminToolsText of(BuildContext context) =>
      _CleanAdminToolsText(Localizations.localeOf(context).languageCode);

  bool get _ar => languageCode == 'ar';
  bool get _fr => languageCode == 'fr';

  String get title => _ar
      ? 'الإدارة والمتابعة'
      : _fr
          ? 'Administration & Pilotage'
          : 'Administration & Steering';
  String get importSuccess => _ar
      ? 'تم استيراد التلاميذ بنجاح.'
      : _fr
          ? 'Import des élèves réussi.'
          : 'Student import successful.';
  String get importFailed => _ar
      ? 'فشل الاستيراد'
      : _fr
          ? 'Échec de l’import'
          : 'Import failed';
  String get createTeacherTitle => _ar
      ? 'إنشاء حساب معلم'
      : _fr
          ? 'Créer un enseignant'
          : 'Create a teacher';
  String get createTeacherHelp => _ar
      ? 'سيحدد المعلم كلمة المرور عند أول اتصال.'
      : _fr
          ? 'L’enseignant définira son mot de passe lors de sa première connexion.'
          : 'The teacher will set their password during the first login.';
  String get fullName => _ar
      ? 'الاسم الكامل'
      : _fr
          ? 'Nom complet'
          : 'Full name';
  String get workEmail => _ar
      ? 'البريد المهني'
      : _fr
          ? 'Email professionnel'
          : 'Work email';
  String get requiredField => _ar
      ? 'حقل مطلوب'
      : _fr
          ? 'Champ requis'
          : 'Required field';
  String get invalidEmail => _ar
      ? 'بريد غير صالح'
      : _fr
          ? 'Email invalide'
          : 'Invalid email';
  String get cancel => _ar
      ? 'إلغاء'
      : _fr
          ? 'Annuler'
          : 'Cancel';
  String get error => _ar
      ? 'خطأ'
      : _fr
          ? 'Erreur'
          : 'Error';
  String get createAccount => _ar
      ? 'إنشاء الحساب'
      : _fr
          ? 'Créer le compte'
          : 'Create account';
  String teacherCreated(String name) => _ar
      ? 'تم إنشاء حساب $name. يمكنه الآن تسجيل الدخول وتحديد كلمة المرور.'
      : _fr
          ? 'Compte créé pour $name. Il peut maintenant se connecter et définir son mot de passe.'
          : 'Account created for $name. They can now log in and set their password.';
  String get schoolAverage => _ar
      ? 'معدل المدرسة'
      : _fr
          ? 'Moyenne scolaire'
          : 'School average';
  String get parentAdoption => _ar
      ? 'اعتماد الأولياء'
      : _fr
          ? 'Adoption parents'
          : 'Parent adoption';
  String get classPerformance => _ar
      ? 'الأداء حسب الفصل'
      : _fr
          ? 'Performance par classe'
          : 'Class performance';
  String get managementTools => _ar
      ? 'أدوات التسيير'
      : _fr
          ? 'Outils de gestion'
          : 'Management tools';
  String get createTeacherCardTitle => _ar
      ? 'إنشاء حساب معلم'
      : _fr
          ? 'Créer un compte enseignant'
          : 'Create teacher account';
  String get createTeacherCardSubtitle => _ar
      ? 'ادعُ معلماً ليحدد كلمة المرور عند أول اتصال.'
      : _fr
          ? 'Invitez un enseignant. Il définira son mot de passe lors de sa première connexion.'
          : 'Invite a teacher. They will set their password on first login.';
  String get bulkImportTitle => _ar
      ? 'استيراد التلاميذ'
      : _fr
          ? 'Import massif des élèves'
          : 'Bulk import students';
  String get bulkImportSubtitle => _ar
      ? 'ارفع ملف CSV لتسجيل عدة تلاميذ دفعة واحدة.'
      : _fr
          ? 'Importez un fichier CSV pour inscrire plusieurs élèves.'
          : 'Upload a CSV file to enroll multiple students at once.';
  String get studentRecordsTitle => _ar
      ? 'إدارة سجلات التلاميذ'
      : _fr
          ? 'Gérer les dossiers élèves'
          : 'Manage student records';
  String get studentRecordsSubtitle => _ar
      ? 'اعرض معرفات التلاميذ والأولياء المرتبطين وأعد إنشاء رموز PIN.'
      : _fr
          ? 'Consultez les identifiants, parents liés et régénérez les PIN.'
          : 'View student IDs, linked parents, and regenerate PINs.';
  String get courseLibraryTitle => _ar
      ? 'إدارة مكتبة المواد'
      : _fr
          ? 'Gérer la bibliothèque des matières'
          : 'Manage course library';
  String get courseLibrarySubtitle => _ar
      ? 'حدد أسماء المواد القياسية مثل الرياضيات والعلوم.'
      : _fr
          ? 'Définissez les matières pour un nommage standardisé.'
          : 'Define subjects for standardized naming.';
}

class _CleanAdminToolsText extends _AdminToolsText {
  const _CleanAdminToolsText(super.languageCode);

  @override
  String get title => _ar
      ? 'الإدارة والمتابعة'
      : _fr
          ? 'Administration et suivi'
          : 'Administration';

  @override
  String get importSuccess => _ar
      ? 'تم استيراد التلاميذ بنجاح.'
      : _fr
          ? 'Import des élèves réussi.'
          : 'Student import successful.';

  @override
  String get importFailed => _ar
      ? 'فشل الاستيراد'
      : _fr
          ? 'Échec de l’import'
          : 'Import failed';

  @override
  String get createTeacherTitle => _ar
      ? 'إنشاء حساب أستاذ'
      : _fr
          ? 'Créer un enseignant'
          : 'Create a teacher';

  @override
  String get createTeacherHelp => _ar
      ? 'سيحدد الأستاذ كلمة المرور عند أول تسجيل دخول.'
      : _fr
          ? 'L’enseignant définira son mot de passe lors de sa première connexion.'
          : 'The teacher will set their password during the first login.';

  @override
  String get fullName => _ar
      ? 'الاسم الكامل'
      : _fr
          ? 'Nom complet'
          : 'Full name';

  @override
  String get workEmail => _ar
      ? 'البريد المهني'
      : _fr
          ? 'Email professionnel'
          : 'Work email';

  @override
  String get requiredField => _ar
      ? 'حقل مطلوب'
      : _fr
          ? 'Champ requis'
          : 'Required field';

  @override
  String get invalidEmail => _ar
      ? 'بريد غير صالح'
      : _fr
          ? 'Email invalide'
          : 'Invalid email';

  @override
  String get cancel => _ar
      ? 'إلغاء'
      : _fr
          ? 'Annuler'
          : 'Cancel';

  @override
  String get error => _ar
      ? 'خطأ'
      : _fr
          ? 'Erreur'
          : 'Error';

  @override
  String get createAccount => _ar
      ? 'إنشاء الحساب'
      : _fr
          ? 'Créer le compte'
          : 'Create account';

  @override
  String teacherCreated(String name) => _ar
      ? 'تم إنشاء حساب $name. يمكنه الآن تسجيل الدخول وتحديد كلمة المرور.'
      : _fr
          ? 'Compte créé pour $name. Il peut maintenant se connecter et définir son mot de passe.'
          : 'Account created for $name. They can now log in and set their password.';

  @override
  String get schoolAverage => _ar
      ? 'معدل المدرسة'
      : _fr
          ? 'Moyenne scolaire'
          : 'School average';

  @override
  String get parentAdoption => _ar
      ? 'اعتماد الأولياء'
      : _fr
          ? 'Adoption parents'
          : 'Parent adoption';

  @override
  String get classPerformance => _ar
      ? 'الأداء حسب القسم'
      : _fr
          ? 'Performance par classe'
          : 'Class performance';

  @override
  String get managementTools => _ar
      ? 'أدوات التسيير'
      : _fr
          ? 'Outils de gestion'
          : 'Management tools';

  @override
  String get createTeacherCardTitle => _ar
      ? 'إنشاء حساب أستاذ'
      : _fr
          ? 'Créer un compte enseignant'
          : 'Create teacher account';

  @override
  String get createTeacherCardSubtitle => _ar
      ? 'ادع أستاذا ليحدد كلمة المرور عند أول تسجيل دخول.'
      : _fr
          ? 'Invitez un enseignant. Il définira son mot de passe lors de sa première connexion.'
          : 'Invite a teacher. They will set their password on first login.';

  @override
  String get bulkImportTitle => _ar
      ? 'استيراد التلاميذ'
      : _fr
          ? 'Import massif des élèves'
          : 'Bulk import students';

  @override
  String get bulkImportSubtitle => _ar
      ? 'ارفع ملف CSV لإضافة عدة تلاميذ دفعة واحدة.'
      : _fr
          ? 'Importez un fichier CSV pour inscrire plusieurs élèves.'
          : 'Upload a CSV file to enroll multiple students at once.';

  @override
  String get studentRecordsTitle => _ar
      ? 'إدارة سجلات التلاميذ'
      : _fr
          ? 'Gérer les dossiers élèves'
          : 'Manage student records';

  @override
  String get studentRecordsSubtitle => _ar
      ? 'اعرض معرفات التلاميذ والأولياء المرتبطين وأعد إنشاء رموز PIN.'
      : _fr
          ? 'Consultez les identifiants, parents liés et régénérez les PIN.'
          : 'View student IDs, linked parents, and regenerate PINs.';

  @override
  String get courseLibraryTitle => _ar
      ? 'إدارة مكتبة المواد'
      : _fr
          ? 'Gérer la bibliothèque des matières'
          : 'Manage course library';

  @override
  String get courseLibrarySubtitle => _ar
      ? 'حدد أسماء المواد القياسية مثل الرياضيات والعلوم.'
      : _fr
          ? 'Définissez les matières pour un nommage standardisé.'
          : 'Define subjects for standardized naming.';
}
