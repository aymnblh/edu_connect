import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../../core/utils/validators.dart';
import '../providers/auth_provider.dart';

class SchoolRegistrationScreen extends ConsumerStatefulWidget {
  const SchoolRegistrationScreen({super.key});

  @override
  ConsumerState<SchoolRegistrationScreen> createState() =>
      _SchoolRegistrationScreenState();
}

class _SchoolRegistrationScreenState
    extends ConsumerState<SchoolRegistrationScreen> {
  final _formKey = GlobalKey<FormState>();
  final _schoolNameController = TextEditingController();
  final _adminNameController = TextEditingController();
  final _adminEmailController = TextEditingController();
  final _adminPasswordController = TextEditingController();

  bool _isLoading = false;
  bool _isSuccess = false;
  bool _acceptedTerms = false;

  @override
  void dispose() {
    _schoolNameController.dispose();
    _adminNameController.dispose();
    _adminEmailController.dispose();
    _adminPasswordController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    final text = _SchoolRegistrationText.of(context);
    final colors = context.appColors;

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
      final success =
          await ref.read(authNotifierProvider.notifier).registerSchool(
                schoolName: _schoolNameController.text.trim(),
                adminName: _adminNameController.text.trim(),
                adminEmail: _adminEmailController.text.trim(),
                adminPassword: _adminPasswordController.text.trim(),
                termsAccepted: _acceptedTerms,
              );

      if (success && mounted) {
        setState(() => _isSuccess = true);
      }
    } catch (e) {
      if (mounted) {
        String errorMessage = e.toString();
        if (e is DioException && e.response?.data is Map) {
          final data = e.response!.data as Map;
          if (data['detail'] != null) {
            errorMessage = data['detail'].toString();
          }
        }
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content: Text(errorMessage), backgroundColor: colors.dangerRed),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final colors = context.appColors;
    final text = _SchoolRegistrationText.of(context);

    if (_isSuccess) {
      return Scaffold(
        backgroundColor: theme.scaffoldBackgroundColor,
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(32.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Semantics(
                  label: text.successIconLabel,
                  child: Icon(
                    Icons.check_circle_outline,
                    size: 80,
                    color: colors.successGreen,
                  ),
                ),
                const SizedBox(height: 24),
                Text(
                  text.successTitle,
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: colorScheme.onSurface,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 16),
                Text(
                  text.successDescription,
                  style: TextStyle(fontSize: 16, color: colors.subtitleText),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 32),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () => context.go('/login'),
                    child: Text(text.backToLogin),
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(text.appBarTitle),
        leading: IconButton(
          icon: const Icon(Icons.close),
          tooltip: MaterialLocalizations.of(context).closeButtonTooltip,
          onPressed: () {
            if (context.canPop()) {
              context.pop();
            } else {
              context.go('/login');
            }
          },
        ),
      ),
      body: SingleChildScrollView(
        keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
        padding: const EdgeInsets.all(24.0),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                text.heading,
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.w800,
                  color: colorScheme.onSurface,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                text.subheading,
                style: TextStyle(color: colors.subtitleText),
              ),
              const SizedBox(height: 32),
              Text(
                text.schoolInfoTitle,
                style: const TextStyle(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _schoolNameController,
                decoration: InputDecoration(
                  labelText: text.schoolNameLabel,
                  prefixIcon: const Icon(Icons.school_outlined),
                ),
                validator: (value) =>
                    Validators.required(value, text.schoolNameLabel),
              ),
              const SizedBox(height: 32),
              Text(
                text.adminAccountTitle,
                style: const TextStyle(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _adminNameController,
                decoration: InputDecoration(
                  labelText: text.fullNameLabel,
                  prefixIcon: const Icon(Icons.person_outline),
                ),
                validator: (value) =>
                    Validators.required(value, text.fullNameLabel),
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _adminEmailController,
                keyboardType: TextInputType.emailAddress,
                decoration: InputDecoration(
                  labelText: text.professionalEmailLabel,
                  prefixIcon: const Icon(Icons.email_outlined),
                ),
                validator: Validators.email,
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _adminPasswordController,
                obscureText: true,
                decoration: InputDecoration(
                  labelText: text.passwordLabel,
                  prefixIcon: const Icon(Icons.lock_outline),
                ),
                validator: Validators.password,
              ),
              const SizedBox(height: 40),
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
                  child: TextButton(
                    onPressed: () => context.push('/policies'),
                    child: Text(text.readTerms),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              Semantics(
                button: true,
                label: text.submitButton,
                child: ElevatedButton(
                  onPressed: _isLoading || !_acceptedTerms ? null : _submit,
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    backgroundColor: colorScheme.primary,
                    foregroundColor: colorScheme.onPrimary,
                  ),
                  child: _isLoading
                      ? SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: colorScheme.onPrimary,
                          ),
                        )
                      : Text(
                          text.submitButton,
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                ),
              ),
              const SizedBox(height: 20),
              Text(
                text.activationNote,
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 12, color: colors.subtitleText),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SchoolRegistrationText {
  final String languageCode;

  const _SchoolRegistrationText(this.languageCode);

  static _SchoolRegistrationText of(BuildContext context) =>
      _SchoolRegistrationText(Localizations.localeOf(context).languageCode);

  bool get _ar => languageCode == 'ar';
  bool get _fr => languageCode == 'fr';

  String get appBarTitle => _ar
      ? 'تسجيل مؤسسة'
      : _fr
          ? 'Inscription établissement'
          : 'School registration';
  String get heading => _ar
      ? 'أنشئوا مساحة مدرستكم'
      : _fr
          ? 'Créez l’espace de votre école'
          : 'Create your school workspace';
  String get subheading => _ar
      ? 'املؤوا المعلومات أدناه لبدء التهيئة.'
      : _fr
          ? 'Remplissez les informations ci-dessous pour démarrer l’onboarding.'
          : 'Fill in the information below to start onboarding.';
  String get schoolInfoTitle => _ar
      ? 'معلومات المؤسسة'
      : _fr
          ? 'Informations établissement'
          : 'School information';
  String get schoolNameLabel => _ar
      ? 'اسم المدرسة'
      : _fr
          ? 'Nom de l’école'
          : 'School name';
  String get adminAccountTitle => _ar
      ? 'حساب المدير'
      : _fr
          ? 'Compte administrateur (directeur)'
          : 'Administrator account';
  String get fullNameLabel => _ar
      ? 'الاسم الكامل'
      : _fr
          ? 'Nom complet'
          : 'Full name';
  String get professionalEmailLabel => _ar
      ? 'البريد المهني'
      : _fr
          ? 'Email professionnel'
          : 'Professional email';
  String get passwordLabel => _ar
      ? 'كلمة المرور'
      : _fr
          ? 'Mot de passe'
          : 'Password';
  String get termsAcceptance => _ar
      ? 'أوافق على سياسة الخصوصية وشروط الاستخدام.'
      : _fr
          ? 'J’accepte la politique de confidentialité et les conditions d’utilisation.'
          : 'I accept the privacy policy and terms of use.';
  String get readTerms => _ar
      ? 'قراءة الشروط'
      : _fr
          ? 'Lire les conditions'
          : 'Read terms';
  String get submitButton => _ar
      ? 'إنشاء المساحة المدرسية'
      : _fr
          ? 'Créer l’espace scolaire'
          : 'Create school workspace';
  String get activationNote => _ar
      ? 'ملاحظة: التفعيل النهائي يتطلب موافقة إدارية.'
      : _fr
          ? 'Note : l’activation finale nécessite une validation administrative.'
          : 'Note: final activation requires administrative validation.';
  String get acceptTermsWarning => _ar
      ? 'يرجى قبول سياسة الخصوصية والشروط.'
      : _fr
          ? 'Veuillez accepter la politique de confidentialité et les conditions.'
          : 'Please accept the privacy policy and terms.';
  String get successTitle => _ar
      ? 'تم التسجيل بنجاح!'
      : _fr
          ? 'Inscription réussie !'
          : 'Registration successful!';
  String get successDescription => _ar
      ? 'تم إنشاء مؤسستكم. سيتواصل معكم مسؤول Wasel Edu لتفعيل الحساب بعد التحقق من الدفع.'
      : _fr
          ? 'Votre établissement a été créé. Un administrateur Wasel Edu va vous contacter pour l’activation de votre compte après validation du paiement.'
          : 'Your school has been created. An Wasel Edu administrator will contact you to activate your account after payment validation.';
  String get backToLogin => _ar
      ? 'العودة إلى تسجيل الدخول'
      : _fr
          ? 'Retour à la connexion'
          : 'Back to login';
  String get successIconLabel => _ar
      ? 'أيقونة نجاح التسجيل'
      : _fr
          ? 'Icône de réussite de l’inscription'
          : 'Registration success icon';
}
