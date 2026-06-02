import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/utils/validators.dart';
import '../providers/auth_provider.dart';

class SetPasswordScreen extends ConsumerStatefulWidget {
  final String email;
  const SetPasswordScreen({super.key, required this.email});

  @override
  ConsumerState<SetPasswordScreen> createState() => _SetPasswordScreenState();
}

class _SetPasswordScreenState extends ConsumerState<SetPasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  final _passwordCtrl = TextEditingController();
  final _confirmPasswordCtrl = TextEditingController();
  bool _isLoading = false;
  bool _obscurePassword = true;
  bool _acceptedTerms = false;

  @override
  void dispose() {
    _passwordCtrl.dispose();
    _confirmPasswordCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    final text = _SetPasswordText.of(context);
    final colors = Theme.of(context).extension<AppColors>()!;
    if (!_acceptedTerms) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(text.acceptTermsWarning),
          backgroundColor: colors.dangerRed,
        ),
      );
      return;
    }

    setState(() => _isLoading = true);

    try {
      final repo = ref.read(authRepositoryProvider);
      await repo.setPassword(
        email: widget.email,
        password: _passwordCtrl.text,
        termsAccepted: _acceptedTerms,
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(text.passwordSetSuccess)),
        );
        context.go('/login');
      }
    } catch (e) {
      if (mounted) {
        _showError('${text.error}: ${e.toString()}');
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _showError(String message) {
    final colors = Theme.of(context).extension<AppColors>()!;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), backgroundColor: colors.dangerRed),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final colors = theme.extension<AppColors>()!;
    final text = _SetPasswordText.of(context);

    return Scaffold(
      backgroundColor: colorScheme.surface,
      appBar: AppBar(
        backgroundColor: colorScheme.surface,
        elevation: 0,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Semantics(
                label: text.lockIcon,
                child: Icon(Icons.lock_reset_rounded,
                        size: 80, color: colors.subtitleText)
                    .animate()
                    .scale(duration: 600.ms, curve: Curves.elasticOut),
              ),
              const SizedBox(height: 24),
              Text(
                text.title,
                textAlign: TextAlign.center,
                style: TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.bold,
                    color: colorScheme.onSurface),
              ),
              const SizedBox(height: 12),
              Text(
                text.subtitle(widget.email),
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 16, color: colors.mutedText),
              ),
              const SizedBox(height: 40),
              Form(
                key: _formKey,
                child: Column(
                  children: [
                    Semantics(
                      label: text.newPasswordLabel,
                      textField: true,
                      child: TextFormField(
                        controller: _passwordCtrl,
                        obscureText: _obscurePassword,
                        decoration: InputDecoration(
                          labelText: text.newPasswordLabel,
                          prefixIcon: const Icon(Icons.lock_outline),
                          suffixIcon: Semantics(
                            label: text.toggleVisibility,
                            button: true,
                            child: IconButton(
                              icon: Icon(_obscurePassword
                                  ? Icons.visibility
                                  : Icons.visibility_off),
                              onPressed: () => setState(
                                  () => _obscurePassword = !_obscurePassword),
                            ),
                          ),
                        ),
                        validator: Validators.password,
                      ),
                    ),
                    const SizedBox(height: 16),
                    Semantics(
                      label: text.confirmPasswordLabel,
                      textField: true,
                      child: TextFormField(
                        controller: _confirmPasswordCtrl,
                        obscureText: _obscurePassword,
                        decoration: InputDecoration(
                          labelText: text.confirmPasswordLabel,
                          prefixIcon: const Icon(Icons.check_circle_outline),
                        ),
                        validator: (val) {
                          if (val != _passwordCtrl.text) {
                            return text.passwordMismatch;
                          }
                          return null;
                        },
                      ),
                    ),
                    const SizedBox(height: 20),
                    CheckboxListTile(
                      value: _acceptedTerms,
                      onChanged: (value) =>
                          setState(() => _acceptedTerms = value ?? false),
                      controlAffinity: ListTileControlAffinity.leading,
                      contentPadding: EdgeInsets.zero,
                      title: Text(
                        text.termsAcceptance,
                        style: const TextStyle(fontSize: 13),
                      ),
                      subtitle: Align(
                        alignment: AlignmentDirectional.centerStart,
                        child: Semantics(
                          button: true,
                          label: text.readTerms,
                          child: TextButton(
                            onPressed: () => context.push('/policies'),
                            child: Text(text.readTerms),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 20),
                    Semantics(
                      button: true,
                      label: text.submitButton,
                      child: SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed:
                              _isLoading || !_acceptedTerms ? null : _submit,
                          style: ElevatedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 16),
                            shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12)),
                          ),
                          child: _isLoading
                              ? CircularProgressIndicator(
                                  color: colorScheme.onPrimary)
                              : Text(text.submitButton,
                                  style: const TextStyle(fontSize: 16)),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SetPasswordText {
  final String languageCode;

  const _SetPasswordText(this.languageCode);

  static _SetPasswordText of(BuildContext context) =>
      _SetPasswordText(Localizations.localeOf(context).languageCode);

  bool get _ar => languageCode == 'ar';
  bool get _fr => languageCode == 'fr';

  String get title => _ar
      ? 'أول تسجيل دخول'
      : _fr
          ? 'Première connexion'
          : 'First login';
  String subtitle(String email) => _ar
      ? 'لتأمين حسابك $email، يرجى تعيين كلمة مرور.'
      : _fr
          ? 'Pour sécuriser votre compte $email, veuillez définir un mot de passe.'
          : 'To secure your account $email, please set a password.';
  String get newPasswordLabel => _ar
      ? 'كلمة المرور الجديدة'
      : _fr
          ? 'Nouveau mot de passe'
          : 'New password';
  String get confirmPasswordLabel => _ar
      ? 'تأكيد كلمة المرور'
      : _fr
          ? 'Confirmer le mot de passe'
          : 'Confirm password';
  String get passwordMismatch => _ar
      ? 'كلمات المرور غير متطابقة'
      : _fr
          ? 'Les mots de passe ne correspondent pas'
          : 'Passwords do not match';
  String get termsAcceptance => _ar
      ? 'أوافق على سياسة الخصوصية وشروط الاستخدام.'
      : _fr
          ? 'J\'accepte la politique de confidentialité et les conditions d\'utilisation.'
          : 'I accept the privacy policy and terms of use.';
  String get readTerms => _ar
      ? 'اقرأ الشروط'
      : _fr
          ? 'Lire les conditions'
          : 'Read terms';
  String get submitButton => _ar
      ? 'تعيين والمتابعة'
      : _fr
          ? 'Définir et Continuer'
          : 'Set and Continue';
  String get acceptTermsWarning => _ar
      ? 'يرجى قبول سياسة الخصوصية والشروط.'
      : _fr
          ? 'Veuillez accepter la politique de confidentialité et les conditions.'
          : 'Please accept the privacy policy and terms.';
  String get passwordSetSuccess => _ar
      ? 'تم تعيين كلمة المرور! سجل دخولك الآن.'
      : _fr
          ? 'Mot de passe défini ! Connectez-vous maintenant.'
          : 'Password set! Log in now.';
  String get error => _ar
      ? 'خطأ'
      : _fr
          ? 'Erreur'
          : 'Error';
  String get lockIcon => _ar
      ? 'أيقونة القفل'
      : _fr
          ? 'Icône de cadenas'
          : 'Lock icon';
  String get toggleVisibility => _ar
      ? 'إظهار/إخفاء كلمة المرور'
      : _fr
          ? 'Afficher/masquer le mot de passe'
          : 'Toggle password visibility';
}
