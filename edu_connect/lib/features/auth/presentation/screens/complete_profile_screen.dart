import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../../../core/theme/app_theme.dart';
import '../../data/repositories/auth_repository.dart';
import '../providers/auth_provider.dart';

class CompleteProfileScreen extends ConsumerStatefulWidget {
  final Map<String, dynamic> extraData;
  const CompleteProfileScreen({super.key, required this.extraData});

  @override
  ConsumerState<CompleteProfileScreen> createState() =>
      _CompleteProfileScreenState();
}

class _CompleteProfileScreenState extends ConsumerState<CompleteProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();

  bool _isLoading = false;
  bool _acceptedTerms = false;

  late Map<String, dynamic> _verifyResult;

  @override
  void initState() {
    super.initState();
    _verifyResult = widget.extraData['verifyResult'];
    if (_isTeacher()) {
      _emailCtrl.text = _verifyResult['email'] ?? '';
      _nameCtrl.text = _verifyResult['name'] ?? '';
    } else {
      if (_verifyResult['label'] != null) {
        _nameCtrl.text = _verifyResult['label'];
      }
    }
  }

  bool _isTeacher() => _verifyResult['type'] == 'teacher_invite';

  Future<void> _submit() async {
    final lang = Localizations.localeOf(context).languageCode;
    final txt = _CompleteProfileLocalizer(lang);

    if (!_formKey.currentState!.validate()) return;
    if (!_acceptedTerms) {
      HapticFeedback.vibrate();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(txt.termsError),
          backgroundColor: Theme.of(context).colorScheme.error,
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    setState(() => _isLoading = true);

    try {
      final repo = AuthRepository();

      if (_isTeacher()) {
        final user = await repo.completeTeacherInvite(
          inviteCode: widget.extraData['code'],
          password: _passwordCtrl.text,
          termsAccepted: _acceptedTerms,
        );
        if (!mounted) return;
        HapticFeedback.mediumImpact();
        ref.read(authNotifierProvider.notifier).setUser(user);
      } else {
        final user = await repo.registerParentWithCode(
          fullName: _nameCtrl.text.trim(),
          email: _emailCtrl.text.trim(),
          password: _passwordCtrl.text,
          termsAccepted: _acceptedTerms,
          code: widget.extraData['code'],
          studentId: widget.extraData['studentId'],
          pin: widget.extraData['pin'],
        );
        if (!mounted) return;
        HapticFeedback.mediumImpact();
        ref.read(authNotifierProvider.notifier).setUser(user);
      }
    } catch (e) {
      if (!mounted) return;
      HapticFeedback.vibrate();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(txt.serverError),
          backgroundColor: Theme.of(context).colorScheme.error,
          behavior: SnackBarBehavior.floating,
        ),
      );
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final colors = context.appColors;
    final isDark = theme.brightness == Brightness.dark;
    final primaryColor = colorScheme.primary;
    final lang = Localizations.localeOf(context).languageCode;
    final txt = _CompleteProfileLocalizer(lang);
    final fontFamily = lang == 'ar' ? 'Cairo' : 'Inter';

    return Scaffold(
      appBar: AppBar(
        title: Text(
          txt.title,
          style: TextStyle(fontFamily: fontFamily, fontWeight: FontWeight.bold),
        ),
        elevation: 0,
        backgroundColor: colorScheme.surface.withValues(alpha: 0),
      ),
      extendBodyBehindAppBar: true,
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
              top: -60,
              left: -40,
              child: Container(
                width: 220,
                height: 220,
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
                      end: 25,
                      duration: 4.5.seconds,
                      curve: Curves.easeInOut)
                  .scaleXY(
                      begin: 1.0,
                      end: 1.12,
                      duration: 4.5.seconds,
                      curve: Curves.easeInOut),
            ),

            SafeArea(
              child: SingleChildScrollView(
                keyboardDismissBehavior:
                    ScrollViewKeyboardDismissBehavior.onDrag,
                padding:
                    const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const SizedBox(height: 16),
                      Text(
                        _isTeacher()
                            ? txt.teacherIntro(_nameCtrl.text)
                            : txt.parentIntro,
                        style: TextStyle(
                          fontSize: 16,
                          fontFamily: fontFamily,
                          color: colorScheme.onSurface,
                          fontWeight: FontWeight.w600,
                          height: 1.45,
                        ),
                      ).animate().fadeIn(duration: 400.ms),
                      const SizedBox(height: 28),
                      if (!_isTeacher()) ...[
                        TextFormField(
                          controller: _nameCtrl,
                          decoration: InputDecoration(
                            labelText: txt.fullNameLabel,
                            prefixIcon:
                                const Icon(Icons.person_outline_rounded),
                          ),
                          validator: (v) =>
                              v!.isEmpty ? txt.requiredError : null,
                        ).animate().fadeIn(delay: 100.ms).slideY(begin: 0.2),
                        const SizedBox(height: 16),
                        TextFormField(
                          controller: _emailCtrl,
                          keyboardType: TextInputType.emailAddress,
                          decoration: InputDecoration(
                            labelText: txt.emailLabel,
                            prefixIcon: const Icon(Icons.email_outlined),
                          ),
                          validator: (v) =>
                              v!.isEmpty ? txt.requiredError : null,
                        ).animate().fadeIn(delay: 150.ms).slideY(begin: 0.2),
                        const SizedBox(height: 16),
                      ],
                      TextFormField(
                        controller: _passwordCtrl,
                        obscureText: true,
                        decoration: InputDecoration(
                          labelText: txt.passwordLabel,
                          prefixIcon: const Icon(Icons.lock_outline_rounded),
                        ),
                        validator: (v) =>
                            v!.length < 6 ? txt.shortPasswordError : null,
                      )
                          .animate()
                          .fadeIn(delay: _isTeacher() ? 100.ms : 200.ms)
                          .slideY(begin: 0.2),
                      const SizedBox(height: 24),
                      CheckboxListTile(
                        value: _acceptedTerms,
                        onChanged: (value) {
                          HapticFeedback.lightImpact();
                          setState(() => _acceptedTerms = value ?? false);
                        },
                        activeColor: primaryColor,
                        checkColor: colorScheme.onPrimary,
                        controlAffinity: ListTileControlAffinity.leading,
                        contentPadding: EdgeInsets.zero,
                        title: Text(
                          txt.checkboxLabel,
                          style: TextStyle(
                            fontSize: 13,
                            fontFamily: fontFamily,
                            color: colors.subtitleText,
                            height: 1.4,
                          ),
                        ),
                        subtitle: Align(
                          alignment: AlignmentDirectional.centerStart,
                          child: TextButton(
                            onPressed: () => context.push('/policies'),
                            style: TextButton.styleFrom(
                              padding: EdgeInsets.zero,
                              minimumSize: Size.zero,
                              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                            ),
                            child: Text(
                              txt.readTermsBtn,
                              style: TextStyle(
                                fontFamily: fontFamily,
                                fontWeight: FontWeight.bold,
                                fontSize: 13,
                              ),
                            ),
                          ),
                        ),
                      ).animate().fadeIn(delay: _isTeacher() ? 150.ms : 250.ms),
                      const SizedBox(height: 28),
                      ElevatedButton(
                        onPressed:
                            _isLoading || !_acceptedTerms ? null : _submit,
                        child: _isLoading
                            ? SizedBox(
                                height: 20,
                                width: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2.5,
                                  valueColor: AlwaysStoppedAnimation<Color>(
                                    colorScheme.onPrimary,
                                  ),
                                ),
                              )
                            : Text(
                                txt.confirmBtn,
                                style: TextStyle(
                                  fontFamily: fontFamily,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                      ).animate().fadeIn(delay: _isTeacher() ? 200.ms : 300.ms),
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

class _CompleteProfileLocalizer {
  final String code;
  const _CompleteProfileLocalizer(this.code);

  bool get _ar => code == 'ar';
  bool get _fr => code == 'fr';

  String get title => _ar
      ? 'إكمال التسجيل'
      : _fr
          ? 'Finaliser l\'inscription'
          : 'Complete Registration';

  String teacherIntro(String name) => _ar
      ? 'مرحباً بك $name. يرجى تعيين كلمة المرور الخاصة بك لتأمين حسابك.'
      : _fr
          ? 'Bienvenue $name. Veuillez définir votre mot de passe privé pour sécuriser votre compte.'
          : 'Welcome $name. Please set your private password to secure your account.';

  String get parentIntro => _ar
      ? 'يرجى إدخال معلوماتك لإنشاء حساب ولي الأمر الخاص بك.'
      : _fr
          ? 'Veuillez saisir vos informations pour créer votre compte parent.'
          : 'Please enter your information to create your parent account.';

  String get fullNameLabel => _ar
      ? 'الاسم الكامل'
      : _fr
          ? 'Nom complet'
          : 'Full Name';
  String get emailLabel => _ar
      ? 'البريد الإلكتروني'
      : _fr
          ? 'Email'
          : 'Email';
  String get passwordLabel => _ar
      ? 'كلمة المرور الجديدة'
      : _fr
          ? 'Mot de passe'
          : 'New Password';

  String get checkboxLabel => _ar
      ? 'أوافق على سياسة الخصوصية وشروط الاستخدام.'
      : _fr
          ? 'J\'accepte la politique de confidentialité et les conditions d\'utilisation.'
          : 'I accept the privacy policy and terms of use.';

  String get readTermsBtn => _ar
      ? 'قراءة الشروط والسياسات'
      : _fr
          ? 'Lire les conditions'
          : 'Read Terms & Policies';
  String get confirmBtn => _ar
      ? 'تأكيد الحساب'
      : _fr
          ? 'Confirmer'
          : 'Confirm Account';

  String get requiredError => _ar
      ? 'مطلوب'
      : _fr
          ? 'Requis'
          : 'Required';
  String get shortPasswordError => _ar
      ? 'كلمة المرور قصيرة جداً (أقل من 6 أحرف)'
      : _fr
          ? 'Trop court'
          : 'Too short (min 6 chars)';
  String get termsError => _ar
      ? 'يرجى قبول سياسة الخصوصية والشروط.'
      : _fr
          ? 'Veuillez accepter la politique de confidentialité et les conditions.'
          : 'Please accept the privacy policy and terms.';

  String get serverError => _ar
      ? 'حدث خطأ غير متوقع أثناء إكمال حسابك.'
      : _fr
          ? 'Une erreur est survenue.'
          : 'An unexpected error occurred while completing your profile.';
}
