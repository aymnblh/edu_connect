import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/utils/validators.dart';
import '../providers/auth_provider.dart';
import 'package:edu_connect/l10n/app_localizations.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  bool _obscurePassword = true;
  bool _isLoading = false;

  @override
  void dispose() {
    _emailCtrl.dispose();
    _passwordCtrl.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    final l10n = AppLocalizations.of(context)!;
    if (!_formKey.currentState!.validate()) return;
    setState(() => _isLoading = true);

    try {
      await ref.read(authNotifierProvider.notifier).login(
            email: _emailCtrl.text.trim(),
            password: _passwordCtrl.text,
          );
    } on DioException catch (e) {
      if (e.response?.statusCode == 403) {
        final data = e.response?.data;
        final detail = data is Map ? data['detail'] : null;
        if (detail is Map && detail['code'] == 'password_setup_required') {
          if (mounted) {
            context.push('/set-password', extra: _emailCtrl.text.trim());
          }
          return;
        }
      }
      if (mounted) _showError(_authErrorMessage(e, l10n));
    } catch (e) {
      if (mounted) _showError(l10n.error);
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  String _authErrorMessage(DioException error, AppLocalizations l10n) {
    if (error.type == DioExceptionType.connectionError ||
        error.type == DioExceptionType.connectionTimeout ||
        error.type == DioExceptionType.receiveTimeout ||
        error.type == DioExceptionType.sendTimeout ||
        error.response == null) {
      return l10n.serverUnavailable;
    }
    if (error.response?.statusCode == 401) {
      return l10n.invalidCredentials;
    }
    if (error.response?.statusCode == 403) {
      return l10n.accountForbidden;
    }
    final data = error.response?.data;
    if (data is Map && data['detail'] != null) {
      final detail = data['detail'];
      if (detail is String) return detail;
      if (detail is Map && detail['message'] is String) {
        return detail['message'] as String;
      }
    }
    return l10n.serverErrorWithCode(
      error.response?.statusCode?.toString() ?? l10n.unknown,
    );
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Theme.of(context).colorScheme.error,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  String _registerSchoolText(BuildContext context, AppLocalizations l10n) {
    final isArabic = Localizations.localeOf(context).languageCode == 'ar';
    return isArabic
        ? '← ${l10n.registerSchoolCta}'
        : '${l10n.registerSchoolCta} →';
  }

  String _policiesText(BuildContext context) {
    switch (Localizations.localeOf(context).languageCode) {
      case 'ar':
        return 'سياسة الخصوصية والشروط';
      case 'en':
        return 'Privacy policy and terms';
      default:
        return 'Politique de confidentialité et conditions';
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final colors = context.appColors;
    final isDark = theme.brightness == Brightness.dark;
    final primaryColor = colorScheme.primary;
    final isArabic = Localizations.localeOf(context).languageCode == 'ar';
    final fontFamily = isArabic ? 'Cairo' : 'Inter';

    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: isDark
                ? [theme.scaffoldBackgroundColor, colors.glassSurface]
                : [theme.scaffoldBackgroundColor, colors.dividerColor],
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
          ),
        ),
        child: Stack(
          children: [
            // Decorative Ambient Background Blob
            Positioned(
              top: -80,
              left: -40,
              child: Container(
                width: 200,
                height: 200,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: colors.tealAccent.withValues(
                    alpha: isDark ? 0.05 : 0.04,
                  ),
                ),
              )
                  .animate(
                      onPlay: (controller) => controller.repeat(reverse: true))
                  .moveY(
                      begin: 0,
                      end: 20,
                      duration: 5.seconds,
                      curve: Curves.easeInOut)
                  .scaleXY(
                      begin: 1.0,
                      end: 1.1,
                      duration: 5.seconds,
                      curve: Curves.easeInOut),
            ),

            SafeArea(
              child: Center(
                child: SingleChildScrollView(
                  keyboardDismissBehavior:
                      ScrollViewKeyboardDismissBehavior.onDrag,
                  padding:
                      const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Center(
                        child: Container(
                          width: 72,
                          height: 72,
                          decoration: BoxDecoration(
                            color: colors.cardBg.withValues(
                              alpha: isDark ? 0.9 : 1,
                            ),
                            borderRadius: BorderRadius.circular(24),
                            border: Border.all(color: colors.cardBorder),
                            boxShadow: [
                              BoxShadow(
                                color: primaryColor.withValues(alpha: 0.22),
                                blurRadius: 24,
                                offset: const Offset(0, 14),
                              ),
                            ],
                          ),
                          child: Padding(
                            padding: const EdgeInsets.all(6),
                            child: Image.asset(
                              'assets/images/wasel_edu_logo.png',
                              fit: BoxFit.contain,
                              semanticLabel: l10n.appTitle,
                            ),
                          ),
                        ),
                      )
                          .animate()
                          .scale(duration: 500.ms, curve: Curves.elasticOut),
                      const SizedBox(height: 24),

                      Text(
                        l10n.welcome,
                        textAlign: TextAlign.center,
                        style: TextStyle(
                            fontSize: 28,
                            fontFamily: fontFamily,
                            fontWeight: FontWeight.w700,
                            color: colorScheme.onSurface),
                      ).animate().fadeIn(delay: 100.ms).slideY(begin: 0.3),
                      const SizedBox(height: 8),
                      Text(
                        l10n.appTitle,
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 15,
                          fontFamily: fontFamily,
                          color: colors.subtitleText,
                        ),
                      ).animate().fadeIn(delay: 150.ms),
                      const SizedBox(height: 40),

                      Form(
                        key: _formKey,
                        child: Column(
                          children: [
                            TextFormField(
                              controller: _emailCtrl,
                              keyboardType: TextInputType.emailAddress,
                              textInputAction: TextInputAction.next,
                              autocorrect: false,
                              autofillHints: const [AutofillHints.email],
                              validator: Validators.email,
                              decoration: InputDecoration(
                                labelText: l10n.email,
                                prefixIcon: const Icon(Icons.email_outlined),
                              ),
                            )
                                .animate()
                                .fadeIn(delay: 200.ms)
                                .slideY(begin: 0.3),
                            const SizedBox(height: 16),
                            TextFormField(
                              controller: _passwordCtrl,
                              obscureText: _obscurePassword,
                              textInputAction: TextInputAction.done,
                              autocorrect: false,
                              enableSuggestions: false,
                              autofillHints: const [AutofillHints.password],
                              onFieldSubmitted: (_) => _login(),
                              validator: Validators.password,
                              decoration: InputDecoration(
                                labelText: l10n.password,
                                prefixIcon: const Icon(Icons.lock_outline),
                                suffixIcon: IconButton(
                                  icon: Icon(_obscurePassword
                                      ? Icons.visibility_outlined
                                      : Icons.visibility_off_outlined),
                                  tooltip: _passwordVisibilityTooltip(context),
                                  onPressed: () => setState(() =>
                                      _obscurePassword = !_obscurePassword),
                                ),
                              ),
                            )
                                .animate()
                                .fadeIn(delay: 250.ms)
                                .slideY(begin: 0.3),
                            const SizedBox(height: 28),
                            SizedBox(
                              width: double.infinity,
                              child: ElevatedButton(
                                onPressed: _isLoading ? null : _login,
                                child: _isLoading
                                    ? SizedBox(
                                        height: 20,
                                        width: 20,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2.5,
                                          valueColor:
                                              AlwaysStoppedAnimation<Color>(
                                                  colorScheme.onPrimary),
                                        ),
                                      )
                                    : Text(l10n.login),
                              ),
                            ).animate().fadeIn(delay: 300.ms),
                            const SizedBox(height: 16),
                            SizedBox(
                              width: double.infinity,
                              child: OutlinedButton.icon(
                                onPressed: () => context.push('/login-code'),
                                icon: Icon(Icons.qr_code_scanner,
                                    color: primaryColor),
                                label: Text(
                                  l10n.loginWithCodeQr,
                                  style: TextStyle(
                                    color: primaryColor,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                style: OutlinedButton.styleFrom(
                                  side: BorderSide(color: primaryColor),
                                ),
                              ),
                            ).animate().fadeIn(delay: 350.ms),
                          ],
                        ),
                      ),

                      const SizedBox(height: 32),

                      // ── Invite-only info banner ────────────────────────────────
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: colors.cardBg.withValues(
                            alpha: isDark ? 0.8 : 1,
                          ),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(
                            color: colors.cardBorder,
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: theme.shadowColor.withValues(
                                alpha: isDark ? 0.2 : 0.05,
                              ),
                              blurRadius: 20,
                              offset: const Offset(0, 10),
                            ),
                          ],
                        ),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Icon(Icons.info_outline,
                                size: 18, color: primaryColor),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Text(
                                l10n.inviteOnlyInfo,
                                style: TextStyle(
                                    fontSize: 12,
                                    color: colors.subtitleText,
                                    height: 1.4),
                              ),
                            ),
                          ],
                        ),
                      ).animate().fadeIn(delay: 400.ms),

                      const SizedBox(height: 24),

                      // ── New school registration link ───────────────────────────
                      Center(
                        child: GestureDetector(
                          onTap: () => context.push('/create-school'),
                          child: Text(
                            _registerSchoolText(context, l10n),
                            style: TextStyle(
                              color: primaryColor,
                              fontWeight: FontWeight.w600,
                              fontSize: 13,
                              fontFamily: fontFamily,
                            ),
                          ),
                        ),
                      ).animate().fadeIn(delay: 450.ms),
                      const SizedBox(height: 8),
                      TextButton(
                        onPressed: () => context.push('/policies'),
                        child: Text(
                          _policiesText(context),
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 12,
                            fontFamily: fontFamily,
                            color: colors.subtitleText,
                          ),
                        ),
                      ).animate().fadeIn(delay: 475.ms),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

String _passwordVisibilityTooltip(BuildContext context) {
  switch (Localizations.localeOf(context).languageCode) {
    case 'ar':
      return 'إظهار أو إخفاء كلمة المرور';
    case 'en':
      return 'Show or hide password';
    default:
      return 'Afficher ou masquer le mot de passe';
  }
}
