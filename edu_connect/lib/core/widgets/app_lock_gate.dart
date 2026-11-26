import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/auth/data/models/user_model.dart';
import '../../features/auth/presentation/providers/app_lock_provider.dart';
import '../../features/auth/presentation/providers/auth_provider.dart';
import '../services/biometric_auth_service.dart';
import '../theme/app_theme.dart';

/// Blocks access to an already-signed-in non-demo session until the user
/// verifies their identity with biometrics or device credentials.
class AppLockGate extends ConsumerStatefulWidget {
  final Widget child;

  const AppLockGate({super.key, required this.child});

  @override
  ConsumerState<AppLockGate> createState() => _AppLockGateState();
}

class _AppLockGateState extends ConsumerState<AppLockGate> {
  bool _autoPromptScheduled = false;

  void _triggerUnlock({bool force = false}) {
    final lockState = ref.read(appLockProvider);
    if (lockState.isAuthenticating) return;
    if (!force && lockState.hasAutoPrompted) return;

    final lang = Localizations.maybeLocaleOf(context)?.languageCode ?? 'fr';
    final text = _LockText(lang);
    unawaited(
      ref.read(appLockProvider.notifier).authenticate(
            title: text.promptTitle,
            subtitle: text.promptSubtitle,
            failureMessage: text.unlockFailed,
          ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authNotifierProvider).valueOrNull;
    final restoredFromCache = ref.watch(sessionRestoredFromCacheProvider);
    final lockState = ref.watch(appLockProvider);

    final isProtectedUser = user != null && !user.isDemo;
    final showPrivacyShield =
        isProtectedUser && restoredFromCache && !lockState.isReady;
    final showLockScreen = isProtectedUser && lockState.isLocked;
    final showOverlay = showPrivacyShield || showLockScreen;

    if (showLockScreen &&
        !lockState.hasAutoPrompted &&
        !lockState.isAuthenticating &&
        !_autoPromptScheduled) {
      _autoPromptScheduled = true;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _autoPromptScheduled = false;
        if (!mounted) return;
        final currentLock = ref.read(appLockProvider);
        final currentUser = ref.read(authNotifierProvider).valueOrNull;
        if (currentUser != null &&
            !currentUser.isDemo &&
            currentLock.isLocked &&
            !currentLock.hasAutoPrompted &&
            !currentLock.isAuthenticating) {
          _triggerUnlock();
        }
      });
    }

    return Stack(
      children: [
        Visibility(
          visible: !showOverlay,
          maintainState: true,
          child: widget.child,
        ),
        if (showPrivacyShield) const Positioned.fill(child: _PrivacyShield()),
        if (showLockScreen)
          Positioned.fill(
            child: _LockScreen(
              user: user,
              lockState: lockState,
              onUnlock: () => _triggerUnlock(force: true),
              onSignOut: () =>
                  ref.read(authNotifierProvider.notifier).signOut(),
            ),
          ),
      ],
    );
  }
}

class _PrivacyShield extends StatelessWidget {
  const _PrivacyShield();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = context.appColors;
    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: theme.brightness == Brightness.dark
                ? [theme.scaffoldBackgroundColor, colors.glassSurface]
                : [theme.scaffoldBackgroundColor, colors.dividerColor],
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
          ),
        ),
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Image.asset(
                'assets/images/wasel_edu_logo.png',
                width: 72,
                height: 72,
                fit: BoxFit.contain,
              ),
              const SizedBox(height: 24),
              CircularProgressIndicator(
                valueColor: AlwaysStoppedAnimation<Color>(colors.tealDark),
                strokeWidth: 2.5,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _LockScreen extends StatelessWidget {
  final UserModel user;
  final AppLockState lockState;
  final VoidCallback onUnlock;
  final VoidCallback onSignOut;

  const _LockScreen({
    required this.user,
    required this.lockState,
    required this.onUnlock,
    required this.onSignOut,
  });

  IconData _biometricIcon() {
    switch (lockState.availability.biometryType) {
      case BiometryType.faceId:
        return Icons.face_rounded;
      case BiometryType.touchId:
      case BiometryType.biometric:
        return Icons.fingerprint_rounded;
      case BiometryType.deviceCredential:
      case BiometryType.none:
        return Icons.lock_outline_rounded;
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final colors = context.appColors;
    final lang = Localizations.maybeLocaleOf(context)?.languageCode ?? 'fr';
    final text = _LockText(lang);
    final fontFamily = lang == 'ar' ? 'Cairo' : 'Inter';

    return Scaffold(
      body: Container(
        width: double.infinity,
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: theme.brightness == Brightness.dark
                ? [theme.scaffoldBackgroundColor, colors.glassSurface]
                : [theme.scaffoldBackgroundColor, colors.dividerColor],
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
          ),
        ),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 420),
                child: Container(
                  padding: const EdgeInsets.all(28),
                  decoration: BoxDecoration(
                    color: colors.cardBg,
                    borderRadius: BorderRadius.circular(24),
                    border: Border.all(color: colors.cardBorder),
                    boxShadow: [
                      BoxShadow(
                        color: theme.shadowColor.withValues(alpha: 0.08),
                        blurRadius: 24,
                        offset: const Offset(0, 12),
                      ),
                    ],
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 72,
                        height: 72,
                        decoration: BoxDecoration(
                          color: colorScheme.primary.withValues(alpha: 0.12),
                          shape: BoxShape.circle,
                        ),
                        child: Icon(
                          _biometricIcon(),
                          size: 38,
                          color: colorScheme.primary,
                        ),
                      ),
                      const SizedBox(height: 20),
                      Text(
                        text.title,
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontFamily: fontFamily,
                          fontSize: 22,
                          fontWeight: FontWeight.w700,
                          color: colorScheme.onSurface,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        text.subtitle,
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontFamily: fontFamily,
                          fontSize: 14,
                          color: colors.subtitleText,
                          height: 1.4,
                        ),
                      ),
                      const SizedBox(height: 20),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 14,
                          vertical: 10,
                        ),
                        decoration: BoxDecoration(
                          color: colors.glassSurface,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: colors.cardBorder),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            CircleAvatar(
                              radius: 16,
                              backgroundColor: colorScheme.primary,
                              child: Text(
                                user.fullName.isNotEmpty
                                    ? user.fullName[0].toUpperCase()
                                    : '?',
                                style: TextStyle(
                                  color: colorScheme.onPrimary,
                                  fontWeight: FontWeight.w700,
                                  fontSize: 14,
                                ),
                              ),
                            ),
                            const SizedBox(width: 10),
                            Flexible(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    user.fullName,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                      fontFamily: fontFamily,
                                      fontWeight: FontWeight.w600,
                                      fontSize: 14,
                                    ),
                                  ),
                                  Text(
                                    text.roleLabel(user.role),
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                      fontFamily: fontFamily,
                                      fontSize: 12,
                                      color: colors.mutedText,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                      if (lockState.errorMessage != null) ...[
                        const SizedBox(height: 16),
                        Text(
                          lockState.errorMessage!,
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontFamily: fontFamily,
                            fontSize: 13,
                            color: colorScheme.error,
                          ),
                        ),
                      ],
                      const SizedBox(height: 24),
                      SizedBox(
                        width: double.infinity,
                        child: FilledButton.icon(
                          onPressed:
                              lockState.isAuthenticating ? null : onUnlock,
                          icon: lockState.isAuthenticating
                              ? SizedBox(
                                  width: 18,
                                  height: 18,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: colorScheme.onPrimary,
                                  ),
                                )
                              : Icon(_biometricIcon()),
                          label: Text(
                            text.unlockButton(
                              lockState.availability.biometryType,
                            ),
                            style: TextStyle(fontFamily: fontFamily),
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
                      SizedBox(
                        width: double.infinity,
                        child: TextButton.icon(
                          onPressed:
                              lockState.isAuthenticating ? null : onSignOut,
                          icon: const Icon(Icons.logout_rounded, size: 18),
                          label: Text(
                            text.switchAccount,
                            style: TextStyle(fontFamily: fontFamily),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _LockText {
  final String code;

  const _LockText(this.code);

  bool get _ar => code == 'ar';
  bool get _fr => code == 'fr';

  String get title => _ar
      ? 'الجلسة محمية'
      : _fr
          ? 'Accès protégé'
          : 'Session locked';

  String get subtitle => _ar
      ? 'تأكد من هويتك بالبصمة أو Face ID أو رمز الجهاز للمتابعة.'
      : _fr
          ? 'Confirmez votre identité par empreinte, Face ID ou code de l’appareil.'
          : 'Verify your identity with fingerprint, Face ID, or device passcode.';

  String get promptTitle => _ar
      ? 'فتح WaselEdu'
      : _fr
          ? 'Déverrouiller WaselEdu'
          : 'Unlock WaselEdu';

  String get promptSubtitle => _ar
      ? 'استخدم البصمة أو Face ID للدخول إلى حسابك'
      : _fr
          ? 'Utilisez votre empreinte, Face ID ou code appareil'
          : 'Use biometrics or your device passcode to continue';

  String get unlockFailed => _ar
      ? 'تعذر التحقق. حاول مرة أخرى.'
      : _fr
          ? 'Vérification annulée ou échouée. Réessayez.'
          : 'Verification failed or was cancelled. Please try again.';

  String get switchAccount => _ar
      ? 'تبديل الحساب / تسجيل الخروج'
      : _fr
          ? 'Changer de compte / Se déconnecter'
          : 'Switch account / Sign out';

  String unlockButton(BiometryType type) {
    if (type == BiometryType.faceId) {
      return _ar
          ? 'فتح عبر Face ID'
          : _fr
              ? 'Déverrouiller avec Face ID'
              : 'Unlock with Face ID';
    }
    return _ar
        ? 'فتح بالبصمة / رمز الجهاز'
        : _fr
            ? 'Déverrouiller (Empreinte / Code)'
            : 'Unlock with Biometrics';
  }

  String roleLabel(UserRole role) {
    switch (role) {
      case UserRole.parent:
        return _ar ? 'ولي أمر' : (_fr ? 'Parent' : 'Parent');
      case UserRole.teacher:
        return _ar ? 'معلم' : (_fr ? 'Enseignant' : 'Teacher');
      case UserRole.principal:
        return _ar ? 'المدير' : (_fr ? 'Direction' : 'Principal');
      case UserRole.secretary:
        return _ar ? 'السكرتارية' : (_fr ? 'Secrétariat' : 'Secretary');
      case UserRole.nurse:
        return _ar ? 'الممرض' : (_fr ? 'Infirmerie' : 'Nurse');
      case UserRole.canteen:
        return _ar ? 'المطعم' : (_fr ? 'Cantine' : 'Canteen');
      case UserRole.driver:
        return _ar ? 'السائق' : (_fr ? 'Transport' : 'Driver');
      case UserRole.systemAdmin:
        return _ar ? 'الإدارة العامة' : (_fr ? 'Super admin' : 'Super admin');
    }
  }
}
