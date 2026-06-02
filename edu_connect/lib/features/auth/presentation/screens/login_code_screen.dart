import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../../../core/theme/app_theme.dart';
import '../../data/repositories/auth_repository.dart';

class LoginCodeScreen extends ConsumerStatefulWidget {
  const LoginCodeScreen({super.key});

  @override
  ConsumerState<LoginCodeScreen> createState() => _LoginCodeScreenState();
}

class _LoginCodeScreenState extends ConsumerState<LoginCodeScreen> {
  final _codeCtrl = TextEditingController();
  final _studentIdCtrl = TextEditingController();
  final _pinCtrl = TextEditingController();

  bool _isLoading = false;
  bool _isScannerOpen = false;
  bool _usePinMode = false;

  void _toggleScanner() {
    HapticFeedback.lightImpact();
    setState(() {
      _isScannerOpen = !_isScannerOpen;
    });
  }

  Future<void> _verifyCode({String? scannedToken}) async {
    final lang = Localizations.localeOf(context).languageCode;
    final txt = _LoginCodeLocalizer(lang);
    final code = scannedToken ?? _codeCtrl.text.trim();

    if (!_usePinMode && code.isEmpty) return;
    if (_usePinMode && (_studentIdCtrl.text.isEmpty || _pinCtrl.text.isEmpty)) {
      return;
    }

    setState(() => _isLoading = true);
    try {
      final repo = AuthRepository();

      final result = await repo.verifyCode(
        code: _usePinMode ? null : code,
        studentId: _usePinMode ? _studentIdCtrl.text.trim() : null,
        pin: _usePinMode ? _pinCtrl.text.trim() : null,
      );

      if (!mounted) return;

      HapticFeedback.mediumImpact();
      // Navigate to complete profile based on result
      context.push('/complete-profile', extra: {
        'verifyResult': result,
        'code': _usePinMode ? null : code,
        'studentId': _usePinMode ? _studentIdCtrl.text.trim() : null,
        'pin': _usePinMode ? _pinCtrl.text.trim() : null,
      });
    } catch (e) {
      if (!mounted) return;
      HapticFeedback.vibrate();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(txt.invalidCode),
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
    final scannerForeground =
        isDark ? colorScheme.onSurface : colorScheme.onInverseSurface;
    final lang = Localizations.localeOf(context).languageCode;
    final txt = _LoginCodeLocalizer(lang);
    final fontFamily = lang == 'ar' ? 'Cairo' : 'Inter';

    if (_isScannerOpen) {
      return Scaffold(
        backgroundColor: colorScheme.scrim,
        body: Stack(
          children: [
            MobileScanner(
              onDetect: (capture) {
                final barcodes = capture.barcodes;
                if (barcodes.isNotEmpty && barcodes.first.rawValue != null) {
                  _toggleScanner();
                  _verifyCode(scannedToken: barcodes.first.rawValue);
                }
              },
            ),
            // Premium Dark Mask Overlay
            Positioned.fill(
              child: Container(
                color: colorScheme.scrim.withValues(alpha: 0.55),
              ),
            ),
            // Scanner visual HUD frame cut-out
            Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 250,
                    height: 250,
                    decoration: BoxDecoration(
                      border: Border.all(
                        color: primaryColor,
                        width: 3.5,
                      ),
                      borderRadius: BorderRadius.circular(28),
                      boxShadow: [
                        BoxShadow(
                          color: primaryColor.withValues(alpha: 0.25),
                          blurRadius: 20,
                          spreadRadius: 2,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    decoration: BoxDecoration(
                      color: colorScheme.scrim.withValues(alpha: 0.6),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      txt.scanTitle,
                      style: TextStyle(
                        color: scannerForeground,
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            // Floating glassmorphic close/back trigger
            Positioned(
              top: 50,
              right: 20,
              child: ClipRRect(
                borderRadius: BorderRadius.circular(30),
                child: Container(
                  color: scannerForeground.withValues(alpha: 0.15),
                  child: IconButton(
                    icon: Icon(
                      Icons.close_rounded,
                      color: scannerForeground,
                    ),
                    tooltip:
                        MaterialLocalizations.of(context).closeButtonTooltip,
                    onPressed: _toggleScanner,
                  ),
                ),
              ),
            ),
          ],
        ),
      );
    }

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
              bottom: -60,
              right: -40,
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
              child: Padding(
                padding:
                    const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                child: SingleChildScrollView(
                  keyboardDismissBehavior:
                      ScrollViewKeyboardDismissBehavior.onDrag,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const SizedBox(height: 16),
                      Text(
                        txt.intro,
                        style: TextStyle(
                          fontSize: 16,
                          fontFamily: fontFamily,
                          color: colorScheme.onSurface,
                          fontWeight: FontWeight.w600,
                          height: 1.45,
                        ),
                      ).animate().fadeIn(duration: 400.ms),
                      const SizedBox(height: 28),
                      if (!_usePinMode) ...[
                        TextField(
                          controller: _codeCtrl,
                          decoration: InputDecoration(
                            labelText: txt.codeLabel,
                            prefixIcon: const Icon(Icons.key_rounded),
                          ),
                        ).animate().fadeIn(delay: 100.ms).slideY(begin: 0.2),
                        const SizedBox(height: 16),
                        OutlinedButton.icon(
                          onPressed: _toggleScanner,
                          icon: Icon(Icons.qr_code_scanner_rounded,
                              color: primaryColor),
                          label: Text(
                            txt.scanQrCta,
                            style: TextStyle(
                              color: primaryColor,
                              fontWeight: FontWeight.w600,
                              fontFamily: fontFamily,
                            ),
                          ),
                          style: OutlinedButton.styleFrom(
                            side: BorderSide(color: primaryColor),
                            padding: const EdgeInsets.symmetric(vertical: 14),
                          ),
                        ).animate().fadeIn(delay: 150.ms).slideY(begin: 0.2),
                      ] else ...[
                        TextField(
                          controller: _studentIdCtrl,
                          decoration: InputDecoration(
                            labelText: txt.studentIdLabel,
                            prefixIcon: const Icon(Icons.badge_outlined),
                          ),
                        ).animate().fadeIn(delay: 100.ms).slideY(begin: 0.2),
                        const SizedBox(height: 16),
                        TextField(
                          controller: _pinCtrl,
                          keyboardType: TextInputType.number,
                          inputFormatters: [
                            FilteringTextInputFormatter.digitsOnly
                          ],
                          decoration: InputDecoration(
                            labelText: txt.pinLabel,
                            prefixIcon: const Icon(Icons.lock_outline_rounded),
                          ),
                        ).animate().fadeIn(delay: 150.ms).slideY(begin: 0.2),
                      ],
                      const SizedBox(height: 32),
                      ElevatedButton(
                        onPressed: _isLoading ? null : () => _verifyCode(),
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
                                txt.verifyCta,
                                style: TextStyle(
                                  fontFamily: fontFamily,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                      ).animate().fadeIn(delay: 200.ms),
                      const SizedBox(height: 16),
                      TextButton(
                        onPressed: () {
                          HapticFeedback.lightImpact();
                          setState(() => _usePinMode = !_usePinMode);
                        },
                        child: Text(
                          _usePinMode ? txt.useCodeCta : txt.usePinCta,
                          style: TextStyle(
                            fontFamily: fontFamily,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ).animate().fadeIn(delay: 250.ms),
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

class _LoginCodeLocalizer {
  final String code;
  const _LoginCodeLocalizer(this.code);

  bool get _ar => code == 'ar';
  bool get _fr => code == 'fr';

  String get title => _ar
      ? 'تسجيل الدخول بالرمز'
      : _fr
          ? 'Se connecter'
          : 'Sign In with Code';

  String get intro => _ar
      ? 'أدخل رمز الدعوة الخاص بك أو امسح رمز QR.'
      : _fr
          ? 'Entrez votre code d\'invitation ou scannez votre QR Code.'
          : 'Enter your invitation code or scan your QR Code.';

  String get codeLabel => _ar
      ? 'رمز الدعوة / الرمز المميز'
      : _fr
          ? 'Code d\'invitation / Token'
          : 'Invitation Code / Token';

  String get scanQrCta => _ar
      ? 'مسح رمز QR'
      : _fr
          ? 'Scanner un Code QR'
          : 'Scan QR Code';

  String get studentIdLabel => _ar
      ? 'معرف الطالب (مثال: EDU26-XXX)'
      : _fr
          ? 'ID de l\'élève (ex: EDU26-XXX)'
          : 'Student ID (e.g. EDU26-XXX)';

  String get pinLabel => _ar
      ? 'رمز PIN (6 أرقام)'
      : _fr
          ? 'Code PIN (6 chiffres)'
          : 'PIN Code (6 digits)';

  String get verifyCta => _ar
      ? 'التحقق من الرمز'
      : _fr
          ? 'Vérifier le code'
          : 'Verify Code';

  String get usePinCta => _ar
      ? 'استخدام معرف الطالب و PIN'
      : _fr
          ? 'Utiliser ID Élève & PIN'
          : 'Use Student ID & PIN';

  String get useCodeCta => _ar
      ? 'استخدام رمز الدعوة / QR'
      : _fr
          ? 'Utiliser un Code / QR'
          : 'Use Invitation Code / QR';

  String get scanTitle => _ar
      ? 'ضع الرمز داخل الإطار للمسح'
      : _fr
          ? 'Scanner le QR Code'
          : 'Scan the QR Code';

  String get invalidCode => _ar
      ? 'الرمز غير صالح أو منتهي الصلاحية.'
      : _fr
          ? 'Code invalide ou expiré.'
          : 'Invalid or expired code.';
}
