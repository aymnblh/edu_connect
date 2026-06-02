import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:dio/dio.dart';
import '../../../../core/utils/validators.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../auth/data/models/user_model.dart';
import '../providers/class_provider.dart';
import '../../data/repositories/student_repository.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import 'package:edu_connect/l10n/app_localizations.dart';

class JoinClassScreen extends ConsumerStatefulWidget {
  const JoinClassScreen({super.key});

  @override
  ConsumerState<JoinClassScreen> createState() => _JoinClassScreenState();
}

class _JoinClassScreenState extends ConsumerState<JoinClassScreen> {
  final _formKey = GlobalKey<FormState>();
  final _codeCtrl = TextEditingController();
  final _studentIdCtrl = TextEditingController();
  final _pinCtrl = TextEditingController();
  bool _isLoading = false;

  @override
  void dispose() {
    _codeCtrl.dispose();
    _studentIdCtrl.dispose();
    _pinCtrl.dispose();
    super.dispose();
  }

  Future<void> _join() async {
    if (!_formKey.currentState!.validate()) return;
    final user = ref.read(authNotifierProvider).value;
    if (user == null) return;
    final copy = _JoinClassCopy.of(context);
    final colors = context.appColors;

    setState(() => _isLoading = true);
    try {
      if (user.isParent) {
        await ref.read(studentRepositoryProvider).requestLinkByPin(
              studentId: _studentIdCtrl.text.trim(),
              linkingPin: _pinCtrl.text.trim(),
            );
      } else {
        await ref.read(classNotifierProvider.notifier).joinClass(
              joinCode: _codeCtrl.text.trim().toUpperCase(),
            );
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              user.isParent
                  ? copy.linkRequestSent
                  : AppLocalizations.of(context)!.successfullyJoined,
            ),
            backgroundColor: colors.successGreen,
            behavior: SnackBarBehavior.floating,
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
        );
        context.go('/classes');
      }
    } catch (e) {
      if (mounted) {
        final message = _friendlyJoinError(context, e, user);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(message),
            backgroundColor: Theme.of(context).colorScheme.error,
            behavior: SnackBarBehavior.floating,
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final user = ref.watch(authNotifierProvider).valueOrNull;
    final isParentMode = user?.isParent ?? false;
    final copy = _JoinClassCopy.of(context);
    final colors = context.appColors;
    final colorScheme = Theme.of(context).colorScheme;

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _goBack();
      },
      child: Scaffold(
        appBar: AppBar(
          title: Text(isParentMode ? copy.linkChildTitle : l10n.joinClass),
          leading: IconButton(
            tooltip: MaterialLocalizations.of(context).backButtonTooltip,
            icon: Icon(Icons.adaptive.arrow_back),
            onPressed: _goBack,
          ),
        ),
        body: SingleChildScrollView(
          keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              // Hero
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(32),
                decoration: BoxDecoration(
                  color: colors.tealDark,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Column(
                  children: [
                    Container(
                      width: 56,
                      height: 56,
                      decoration: BoxDecoration(
                        color: colorScheme.onPrimary.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Icon(Icons.login_rounded,
                          color: colorScheme.onPrimary, size: 28),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      isParentMode ? copy.linkChildTitle : l10n.joinClass,
                      style: TextStyle(
                        color: colorScheme.onPrimary,
                        fontSize: 22,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      isParentMode ? copy.parentHelp : copy.classHelp,
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: colorScheme.onPrimary.withValues(alpha: 0.75),
                        fontSize: 13,
                        height: 1.5,
                      ),
                    ),
                  ],
                ),
              ).animate().fadeIn().slideY(begin: -0.1),
              const SizedBox(height: 40),

              Form(
                key: _formKey,
                child: isParentMode
                    ? _ParentLinkForm(
                        studentIdCtrl: _studentIdCtrl,
                        pinCtrl: _pinCtrl,
                        isLoading: _isLoading,
                        onSubmit: _join,
                      )
                    : _ClassCodeForm(
                        codeCtrl: _codeCtrl,
                        isLoading: _isLoading,
                        onSubmit: _join,
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _goBack() {
    if (context.canPop()) {
      context.pop();
    } else {
      context.go('/classes');
    }
  }
}

class _ClassCodeForm extends StatelessWidget {
  final TextEditingController codeCtrl;
  final bool isLoading;
  final VoidCallback onSubmit;

  const _ClassCodeForm({
    required this.codeCtrl,
    required this.isLoading,
    required this.onSubmit,
  });

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final colors = context.appColors;
    return Column(
      children: [
        TextFormField(
          controller: codeCtrl,
          textCapitalization: TextCapitalization.characters,
          textInputAction: TextInputAction.done,
          textAlign: TextAlign.center,
          maxLength: 6,
          onChanged: (value) {
            final normalized = value.toUpperCase();
            if (value != normalized) {
              codeCtrl.value = TextEditingValue(
                text: normalized,
                selection: TextSelection.collapsed(offset: normalized.length),
              );
            }
          },
          onFieldSubmitted: (_) => onSubmit(),
          style: TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.w800,
            letterSpacing: 8,
            color: colors.tealDark,
          ),
          validator: Validators.joinCode,
          decoration: InputDecoration(
            labelText: l10n.joinCode,
            hintText: 'QAM26A',
            hintStyle: TextStyle(
              color: colors.mutedText.withValues(alpha: 0.45),
              letterSpacing: 8,
              fontWeight: FontWeight.w800,
              fontSize: 24,
            ),
            counterText: '',
          ),
        ).animate().fadeIn(delay: 200.ms),
        const SizedBox(height: 12),
        _InlineHelp(text: _JoinClassCopy.of(context).pinNotClassCode),
        const SizedBox(height: 28),
        _SubmitButton(
          isLoading: isLoading,
          label: l10n.joinClass,
          icon: Icons.login,
          onPressed: onSubmit,
        ).animate().fadeIn(delay: 250.ms),
      ],
    );
  }
}

class _ParentLinkForm extends StatelessWidget {
  final TextEditingController studentIdCtrl;
  final TextEditingController pinCtrl;
  final bool isLoading;
  final VoidCallback onSubmit;

  const _ParentLinkForm({
    required this.studentIdCtrl,
    required this.pinCtrl,
    required this.isLoading,
    required this.onSubmit,
  });

  @override
  Widget build(BuildContext context) {
    final copy = _JoinClassCopy.of(context);
    return Column(
      children: [
        TextFormField(
          controller: studentIdCtrl,
          textCapitalization: TextCapitalization.characters,
          textInputAction: TextInputAction.next,
          validator: (value) => (value == null || value.trim().isEmpty)
              ? copy.studentIdRequired
              : null,
          decoration: InputDecoration(
            labelText: copy.studentIdLabel,
            hintText: 'QA26-003',
            prefixIcon: const Icon(Icons.badge_outlined),
          ),
        ).animate().fadeIn(delay: 200.ms),
        const SizedBox(height: 16),
        TextFormField(
          controller: pinCtrl,
          keyboardType: TextInputType.number,
          textInputAction: TextInputAction.done,
          inputFormatters: [FilteringTextInputFormatter.digitsOnly],
          maxLength: 6,
          onFieldSubmitted: (_) => onSubmit(),
          validator: (value) {
            final pin = value?.trim() ?? '';
            if (pin.isEmpty) return copy.pinRequired;
            if (pin.length != 6) return copy.pinLength;
            return null;
          },
          decoration: InputDecoration(
            labelText: copy.pinLabel,
            hintText: '778899',
            prefixIcon: const Icon(Icons.lock_outline),
            counterText: '',
          ),
        ).animate().fadeIn(delay: 230.ms),
        const SizedBox(height: 12),
        _InlineHelp(text: copy.parentRequestInfo),
        const SizedBox(height: 28),
        _SubmitButton(
          isLoading: isLoading,
          label: copy.sendRequest,
          icon: Icons.person_add_alt_1_outlined,
          onPressed: onSubmit,
        ).animate().fadeIn(delay: 280.ms),
      ],
    );
  }
}

class _SubmitButton extends StatelessWidget {
  final bool isLoading;
  final String label;
  final IconData icon;
  final VoidCallback onPressed;

  const _SubmitButton({
    required this.isLoading,
    required this.label,
    required this.icon,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return SizedBox(
      width: double.infinity,
      child: ElevatedButton.icon(
        onPressed: isLoading ? null : onPressed,
        icon: isLoading
            ? SizedBox(
                height: 18,
                width: 18,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: colorScheme.onPrimary,
                ),
              )
            : Icon(icon),
        label: Text(label),
      ),
    );
  }
}

class _InlineHelp extends StatelessWidget {
  final String text;

  const _InlineHelp({required this.text});

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: colors.glassSurface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: colors.cardBorder),
      ),
      child: Row(
        children: [
          Icon(Icons.info_outline, color: colors.subtitleText, size: 18),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              text,
              style: TextStyle(
                color: colors.subtitleText,
                fontSize: 12,
                height: 1.35,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

String _friendlyJoinError(BuildContext context, Object error, UserModel user) {
  final copy = _JoinClassCopy.of(context);
  if (error is DioException) {
    final status = error.response?.statusCode;
    if (status == 404) {
      return user.isParent ? copy.invalidStudentOrPin : copy.invalidClassCode;
    }
    if (status == 400) {
      final detail = error.response?.data is Map
          ? (error.response?.data as Map)['detail']?.toString()
          : null;
      if (detail?.toLowerCase().contains('already linked') ?? false) {
        return copy.alreadyLinked;
      }
      if (detail?.toLowerCase().contains('pending') ?? false) {
        return copy.requestAlreadyPending;
      }
      return detail ?? copy.requestCouldNotBeSent;
    }
    if (status == 403) return copy.notAllowed;
    if (error.type == DioExceptionType.connectionError ||
        error.type == DioExceptionType.connectionTimeout ||
        error.type == DioExceptionType.receiveTimeout ||
        error.type == DioExceptionType.sendTimeout) {
      return copy.connectionError;
    }
  }
  return copy.requestCouldNotBeSent;
}

class _JoinClassCopy {
  final String languageCode;

  const _JoinClassCopy(this.languageCode);

  factory _JoinClassCopy.of(BuildContext context) {
    return _JoinClassCopy(Localizations.localeOf(context).languageCode);
  }

  bool get _ar => languageCode == 'ar';
  bool get _fr => languageCode == 'fr';

  String pick(String ar, String fr, String en) => _ar
      ? ar
      : _fr
          ? fr
          : en;

  String get linkChildTitle =>
      pick('ربط طفل', 'Lier un enfant', 'Link a child');
  String get classHelp => pick(
        'أدخل رمز القسم المكوّن من 6 أحرف الذي تقدمه الإدارة أو الأستاذ.',
        "Entrez le code classe à 6 caractères fourni par l'administration ou l'enseignant.",
        'Enter the 6-character class code provided by the school or teacher.',
      );
  String get parentHelp => pick(
        'أدخل رقم التلميذ ورمز PIN المقدم من الإدارة.',
        "Entrez l'ID élève et le PIN fournis par l'administration.",
        'Enter the student ID and PIN provided by the school office.',
      );
  String get pinNotClassCode => pick(
        'رمز PIN الرقمي ليس رمز قسم. لربط طفل، استعمل شاشة ربط الطفل.',
        "Un PIN numérique n'est pas un code classe. Pour un parent, utilisez la liaison enfant.",
        'A numeric PIN is not a class code. Parents should use child linking.',
      );
  String get studentIdLabel => pick('رقم التلميذ', 'ID élève', 'Student ID');
  String get pinLabel => pick('رمز PIN', 'PIN élève', 'Student PIN');
  String get studentIdRequired => pick(
        'رقم التلميذ مطلوب',
        "L'ID élève est obligatoire",
        'Student ID is required',
      );
  String get pinRequired =>
      pick('رمز PIN مطلوب', 'Le PIN est obligatoire', 'PIN is required');
  String get pinLength => pick(
        'رمز PIN يجب أن يكون 6 أرقام',
        'Le PIN doit contenir 6 chiffres',
        'PIN must be 6 digits',
      );
  String get parentRequestInfo => pick(
        'سيتم إرسال طلب ربط إلى إدارة المدرسة للمراجعة.',
        "Une demande sera envoyée à l'administration pour validation.",
        'A link request will be sent to the school office for approval.',
      );
  String get sendRequest =>
      pick('إرسال الطلب', 'Envoyer la demande', 'Send request');
  String get linkRequestSent => pick(
        'تم إرسال طلب الربط إلى الإدارة.',
        "Demande de liaison envoyée à l'administration.",
        'Link request sent to the school office.',
      );
  String get invalidClassCode => pick(
        'رمز القسم غير صحيح. تحقق من الرمز وأعد المحاولة.',
        'Code classe invalide. Vérifiez le code puis réessayez.',
        'Invalid class code. Check the code and try again.',
      );
  String get invalidStudentOrPin => pick(
        'رقم التلميذ أو رمز PIN غير صحيح.',
        'ID élève ou PIN incorrect.',
        'Student ID or PIN is incorrect.',
      );
  String get alreadyLinked => pick('هذا الطفل مرتبط بالفعل.',
      'Cet enfant est déjà lié.', 'This child is already linked.');
  String get requestAlreadyPending => pick(
        'طلب الربط موجود بالفعل وينتظر موافقة الإدارة.',
        "Une demande est déjà en attente de validation.",
        'A link request is already waiting for approval.',
      );
  String get requestCouldNotBeSent => pick(
        'تعذر إرسال الطلب. حاول مرة أخرى.',
        "Impossible d'envoyer la demande. Réessayez.",
        'Could not send the request. Try again.',
      );
  String get notAllowed => pick('غير مسموح بهذا الإجراء.',
      'Action non autorisée.', 'Action not allowed.');
  String get connectionError => pick(
        'تعذر الاتصال بالخادم. تحقق من الإنترنت.',
        'Connexion au serveur impossible. Vérifiez internet.',
        'Could not reach the server. Check your connection.',
      );
}
