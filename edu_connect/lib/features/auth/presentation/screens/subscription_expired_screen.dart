import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../../../core/theme/app_theme.dart';

class SubscriptionExpiredScreen extends StatelessWidget {
  const SubscriptionExpiredScreen({super.key});

  @override
  Widget build(BuildContext context) {
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
              label: text.paymentIconLabel,
              child: Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: colors.dangerRed.withValues(alpha: 0.12),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  Icons.payment_outlined,
                  size: 64,
                  color: colors.dangerRed,
                ),
              ).animate().scale(
                  delay: 200.ms, duration: 600.ms, curve: Curves.elasticOut),
            ),
            const SizedBox(height: 32),
            Text(
              text.title,
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
                  onPressed: () => context.go('/auth'),
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
                  // Direction to external regional support
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
      ? 'انتهى الاشتراك'
      : _fr
          ? 'Abonnement expiré'
          : 'Subscription Expired';
  String get description => _ar
      ? 'تم تعليق وصول مدرستك إلى Wasel Edu من قبل المسؤول. لإعادة تفعيل الخدمة، يرجى الاتصال بمكتب الدعم الإقليمي أو قسم تكنولوجيا المعلومات في مدرستك.'
      : _fr
          ? 'L\'accès de votre école à Wasel Edu a été suspendu par l\'administrateur. Pour réactiver le service, veuillez contacter le bureau de support régional ou le département informatique de votre école.'
          : 'Your school\'s access to Wasel Edu has been suspended by the administrator. To reactivate the service, please contact the regional support office or your school\'s IT department.';
  String get backToLogin => _ar
      ? 'العودة لتسجيل الدخول'
      : _fr
          ? 'Retour à la connexion'
          : 'Back to Login';
  String get viewContacts => _ar
      ? 'عرض جهات الاتصال المحلية'
      : _fr
          ? 'Voir les contacts de support'
          : 'View Local Support Contacts';
  String get paymentIconLabel => _ar
      ? 'أيقونة الدفع'
      : _fr
          ? 'Icône de paiement'
          : 'Payment icon';
}
