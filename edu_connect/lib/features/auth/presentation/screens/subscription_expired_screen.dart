import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_theme.dart';
import '../providers/auth_provider.dart';

class SubscriptionExpiredScreen extends ConsumerWidget {
  const SubscriptionExpiredScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final colors = theme.extension<AppColors>()!;
    final text = _SubscriptionExpiredText.of(context);

    return Scaffold(
      body: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(horizontal: 32),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              colorScheme.surface,
              colors.dangerRed.withValues(alpha: 0.06),
            ],
          ),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Semantics(
              label: text.statusIconLabel,
              child: Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: colors.dangerRed.withValues(alpha: 0.12),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  Icons.school_outlined,
                  size: 64,
                  color: colors.dangerRed,
                ),
              ).animate().scale(
                  delay: 200.ms, duration: 600.ms, curve: Curves.elasticOut),
            ),
            const SizedBox(height: 32),
            Text(
              text.title,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.w800,
                color: colorScheme.onSurface,
              ),
            ).animate().fadeIn(delay: 400.ms),
            const SizedBox(height: 16),
            Text(
              text.description,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 16,
                color: colors.mutedText,
                height: 1.5,
              ),
            ).animate().fadeIn(delay: 600.ms),
            const SizedBox(height: 48),
            Semantics(
              button: true,
              label: text.backToLogin,
              child: SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () async {
                    await ref.read(authNotifierProvider.notifier).signOut();
                    if (context.mounted) {
                      context.go('/login');
                    }
                  },
                  icon: const Icon(Icons.logout),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: colors.dangerRed,
                    foregroundColor: colorScheme.onPrimary,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                  label: Text(text.backToLogin),
                ),
              ).animate().fadeIn(delay: 800.ms).slideY(begin: 0.2),
            ),
            const SizedBox(height: 16),
            Semantics(
              button: true,
              label: text.viewContacts,
              child: TextButton(
                onPressed: () {
                  showDialog<void>(
                    context: context,
                    builder: (ctx) => AlertDialog(
                      title: Text(text.supportDialogTitle),
                      content: Text(text.supportDialogBody),
                      actions: [
                        TextButton(
                          onPressed: () {
                            Navigator.of(ctx).pop();
                            context.push('/policies');
                          },
                          child: Text(text.viewPolicies),
                        ),
                        TextButton(
                          onPressed: () => Navigator.of(ctx).pop(),
                          child: Text(
                            MaterialLocalizations.of(ctx).okButtonLabel,
                          ),
                        ),
                      ],
                    ),
                  );
                },
                child: Text(
                  text.viewContacts,
                  style: TextStyle(
                      color: colors.dangerRed, fontWeight: FontWeight.bold),
                ),
              ).animate().fadeIn(delay: 1000.ms),
            ),
          ],
        ),
      ),
    );
  }
}

class _SubscriptionExpiredText {
  final String languageCode;

  const _SubscriptionExpiredText(this.languageCode);

  static _SubscriptionExpiredText of(BuildContext context) =>
      _SubscriptionExpiredText(Localizations.localeOf(context).languageCode);

  bool get _ar => languageCode == 'ar';
  bool get _fr => languageCode == 'fr';

  String get title => _ar
      ? 'الوصول المدرسي معلّق'
      : _fr
          ? 'Accès établissement suspendu'
          : 'School Access Suspended';
  String get description => _ar
      ? 'تم تعليق وصول مدرستك إلى WaselEdu من قبل المسؤول. لإعادة تفعيل الخدمة، يرجى الاتصال بإدارة مدرستك.'
      : _fr
          ? 'L\'accès de votre école à WaselEdu est actuellement suspendu. Pour réactiver le service, veuillez contacter la direction de votre établissement.'
          : 'Your school\'s access to WaselEdu is currently suspended. To reactivate the service, please contact your school administration.';
  String get backToLogin => _ar
      ? 'العودة لتسجيل الدخول'
      : _fr
          ? 'Retour à la connexion'
          : 'Back to Login';
  String get viewContacts => _ar
      ? 'معلومات الدعم والمساعدة'
      : _fr
          ? 'Voir les contacts de support'
          : 'View Support Information';
  String get supportDialogTitle => _ar
      ? 'دعم WaselEdu'
      : _fr
          ? 'Support WaselEdu'
          : 'WaselEdu Support';
  String get supportDialogBody => _ar
      ? 'يرجى التواصل مع إدارة مدرستك أو مراسلة فريق الدعم على: privacy@waseledu.dz'
      : _fr
          ? 'Veuillez contacter la direction de votre établissement ou écrire au support WaselEdu : privacy@waseledu.dz.'
          : 'Please contact your school administration or email WaselEdu support at privacy@waseledu.dz.';
  String get viewPolicies => _ar
      ? 'الخصوصية والشروط'
      : _fr
          ? 'Confidentialité & Conditions'
          : 'Privacy & Terms';
  String get statusIconLabel => _ar
      ? 'أيقونة المدرسة'
      : _fr
          ? 'Icône établissement'
          : 'School status icon';
}
