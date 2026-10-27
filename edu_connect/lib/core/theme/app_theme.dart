import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

// ── ThemeExtension<AppColors> ──────────────────────────────────────────────
class AppColors extends ThemeExtension<AppColors> {
  final Color cardBg;
  final Color cardBorder;
  final Color subtitleText;
  final Color glassSurface;
  final Color tealAccent;
  final Color tealLight;
  final Color tealDark;
  final Color successGreen;
  final Color dangerRed;
  final Color warningAmber;
  final Color mutedText;
  final Color inputBg;
  final Color inputBorder;
  final Color dividerColor;
  final Color shimmerBase;
  final Color shimmerHighlight;

  const AppColors({
    required this.cardBg,
    required this.cardBorder,
    required this.subtitleText,
    required this.glassSurface,
    required this.tealAccent,
    required this.tealLight,
    required this.tealDark,
    required this.successGreen,
    required this.dangerRed,
    required this.warningAmber,
    required this.mutedText,
    required this.inputBg,
    required this.inputBorder,
    required this.dividerColor,
    required this.shimmerBase,
    required this.shimmerHighlight,
  });

  static const light = AppColors(
    cardBg: Colors.white,
    cardBorder: Color(0xFFE2E8F0),
    subtitleText: Color(0xFF475569),
    glassSurface: Color(0xFFF8FAFC),
    tealAccent: Color(0xFF14B8A6),
    tealLight: Color(0xFFCCFBF1),
    tealDark: Color(0xFF0F766E),
    successGreen: Color(0xFF10B981),
    dangerRed: Color(0xFFEF4444),
    warningAmber: Color(0xFFF59E0B),
    mutedText: Color(0xFF94A3B8),
    inputBg: Color(0xFFF1F5F9),
    inputBorder: Color(0xFFCBD5E1),
    dividerColor: Color(0xFFE2E8F0),
    shimmerBase: Color(0xFFE2E8F0),
    shimmerHighlight: Color(0xFFF8FAFC),
  );

  static const dark = AppColors(
    cardBg: Color(0xFF1E293B),
    cardBorder: Color(0xFF334155),
    subtitleText: Color(0xFF94A3B8),
    glassSurface: Color(0xFF0F172A),
    tealAccent: Color(0xFF14B8A6),
    tealLight: Color(0xFF134E4A),
    tealDark: Color(0xFF0D9488),
    successGreen: Color(0xFF10B981),
    dangerRed: Color(0xFFEF4444),
    warningAmber: Color(0xFFF59E0B),
    mutedText: Color(0xFF64748B),
    inputBg: Color(0xFF0F172A),
    inputBorder: Color(0xFF334155),
    dividerColor: Color(0xFF1E293B),
    shimmerBase: Color(0xFF1E293B),
    shimmerHighlight: Color(0xFF334155),
  );

  @override
  AppColors copyWith({
    Color? cardBg,
    Color? cardBorder,
    Color? subtitleText,
    Color? glassSurface,
    Color? tealAccent,
    Color? tealLight,
    Color? tealDark,
    Color? successGreen,
    Color? dangerRed,
    Color? warningAmber,
    Color? mutedText,
    Color? inputBg,
    Color? inputBorder,
    Color? dividerColor,
    Color? shimmerBase,
    Color? shimmerHighlight,
  }) {
    return AppColors(
      cardBg: cardBg ?? this.cardBg,
      cardBorder: cardBorder ?? this.cardBorder,
      subtitleText: subtitleText ?? this.subtitleText,
      glassSurface: glassSurface ?? this.glassSurface,
      tealAccent: tealAccent ?? this.tealAccent,
      tealLight: tealLight ?? this.tealLight,
      tealDark: tealDark ?? this.tealDark,
      successGreen: successGreen ?? this.successGreen,
      dangerRed: dangerRed ?? this.dangerRed,
      warningAmber: warningAmber ?? this.warningAmber,
      mutedText: mutedText ?? this.mutedText,
      inputBg: inputBg ?? this.inputBg,
      inputBorder: inputBorder ?? this.inputBorder,
      dividerColor: dividerColor ?? this.dividerColor,
      shimmerBase: shimmerBase ?? this.shimmerBase,
      shimmerHighlight: shimmerHighlight ?? this.shimmerHighlight,
    );
  }

  @override
  AppColors lerp(covariant AppColors? other, double t) {
    if (other is! AppColors) return this;
    return AppColors(
      cardBg: Color.lerp(cardBg, other.cardBg, t)!,
      cardBorder: Color.lerp(cardBorder, other.cardBorder, t)!,
      subtitleText: Color.lerp(subtitleText, other.subtitleText, t)!,
      glassSurface: Color.lerp(glassSurface, other.glassSurface, t)!,
      tealAccent: Color.lerp(tealAccent, other.tealAccent, t)!,
      tealLight: Color.lerp(tealLight, other.tealLight, t)!,
      tealDark: Color.lerp(tealDark, other.tealDark, t)!,
      successGreen: Color.lerp(successGreen, other.successGreen, t)!,
      dangerRed: Color.lerp(dangerRed, other.dangerRed, t)!,
      warningAmber: Color.lerp(warningAmber, other.warningAmber, t)!,
      mutedText: Color.lerp(mutedText, other.mutedText, t)!,
      inputBg: Color.lerp(inputBg, other.inputBg, t)!,
      inputBorder: Color.lerp(inputBorder, other.inputBorder, t)!,
      dividerColor: Color.lerp(dividerColor, other.dividerColor, t)!,
      shimmerBase: Color.lerp(shimmerBase, other.shimmerBase, t)!,
      shimmerHighlight:
          Color.lerp(shimmerHighlight, other.shimmerHighlight, t)!,
    );
  }
}

extension AppThemeContext on BuildContext {
  AppColors get appColors => Theme.of(this).extension<AppColors>()!;
}

class AppTheme {
  // ── Light Design Tokens ──────────────────────────────────────────────────
  static const _primary = Color(0xFF0F766E); // deep teal
  static const _primaryDark = Color(0xFF0B5D56);
  static const _primaryLight = Color(0xFFE6F4F1);
  static const _onPrimary = Colors.white;
  static const _accent = Color(0xFFEC6A5C);
  static const _success = Color(0xFF22A879);
  static const _warning = Color(0xFFF2C230);
  static const _error = Color(0xFFE85D57);
  static const _surface = Color(0xFFFFFFFF);
  static const _scaffoldBg = Color(0xFFF4F7F8);
  static const _surfaceSoft = Color(0xFFF8FBFB);
  static const _textPrimary = Color(0xFF12233D);
  static const _textSecondary = Color(0xFF718096);
  static const _border = Color(0xFFE4EAEE);
  static const _inputFill = Color(0xFFF2F6F6);
  static const _shadow = Color(0x1A203040);

  // ── Dark Design Tokens ──────────────────────────────────────────────────
  static const _primaryDarkTheme = Color(0xFF14B8A6); // vibrant teal
  static const _surfaceDark = Color(0xFF1E293B); // slate-blue glass
  static const _scaffoldBgDark = Color(0xFF0B0F19); // obsidian
  static const _textPrimaryDark = Color(0xFFF8FAFC); // ice white
  static const _textSecondaryDark = Color(0xFF94A3B8); // cool slate-grey
  static const _borderDark = Color(0x1AFFFFFF); // glass border
  static const _inputFillDark = Color(0xFF151922);
  static const _shadowDark = Color(0x33000000);

  static TextTheme _getArabicBalancedTextTheme(
      TextTheme base, String fontFamily) {
    // Custom height offsets to prevent clipping of Arabic accents/harakat
    return base.copyWith(
      displayLarge:
          base.displayLarge?.copyWith(height: 1.45, fontFamily: fontFamily),
      displayMedium:
          base.displayMedium?.copyWith(height: 1.45, fontFamily: fontFamily),
      displaySmall:
          base.displaySmall?.copyWith(height: 1.45, fontFamily: fontFamily),
      headlineLarge:
          base.headlineLarge?.copyWith(height: 1.4, fontFamily: fontFamily),
      headlineMedium:
          base.headlineMedium?.copyWith(height: 1.4, fontFamily: fontFamily),
      headlineSmall:
          base.headlineSmall?.copyWith(height: 1.4, fontFamily: fontFamily),
      titleLarge:
          base.titleLarge?.copyWith(height: 1.4, fontFamily: fontFamily),
      titleMedium:
          base.titleMedium?.copyWith(height: 1.4, fontFamily: fontFamily),
      titleSmall:
          base.titleSmall?.copyWith(height: 1.4, fontFamily: fontFamily),
      bodyLarge: base.bodyLarge?.copyWith(height: 1.5, fontFamily: fontFamily),
      bodyMedium:
          base.bodyMedium?.copyWith(height: 1.5, fontFamily: fontFamily),
      bodySmall: base.bodySmall?.copyWith(height: 1.5, fontFamily: fontFamily),
      labelLarge:
          base.labelLarge?.copyWith(height: 1.4, fontFamily: fontFamily),
      labelMedium:
          base.labelMedium?.copyWith(height: 1.4, fontFamily: fontFamily),
      labelSmall:
          base.labelSmall?.copyWith(height: 1.4, fontFamily: fontFamily),
    );
  }

  static ThemeData getTheme(Locale? locale) {
    final isArabic = locale?.languageCode == 'ar';
    final fontFamily = isArabic ? 'Cairo' : 'Inter';
    final isApplePlatform = defaultTargetPlatform == TargetPlatform.iOS ||
        defaultTargetPlatform == TargetPlatform.macOS;

    final colorScheme = ColorScheme.fromSeed(
      seedColor: _primary,
      brightness: Brightness.light,
      primary: _primary,
      error: _error,
      surface: _surface,
      surfaceContainerHighest: _scaffoldBg,
    );

    final baseTheme = ThemeData(
      useMaterial3: true,
      colorScheme: colorScheme,
      fontFamily: fontFamily,
      scaffoldBackgroundColor: _scaffoldBg,
      splashFactory: isApplePlatform ? NoSplash.splashFactory : null,
      highlightColor: isApplePlatform ? Colors.transparent : null,
      pageTransitionsTheme: const PageTransitionsTheme(
        builders: {
          TargetPlatform.android: ZoomPageTransitionsBuilder(),
          TargetPlatform.iOS: CupertinoPageTransitionsBuilder(),
          TargetPlatform.macOS: CupertinoPageTransitionsBuilder(),
        },
      ),

      // ── App Bar ──────────────────────────────────────────────────────
      appBarTheme: AppBarTheme(
        backgroundColor: _surface,
        foregroundColor: _textPrimary,
        elevation: 0,
        scrolledUnderElevation: 0.5,
        centerTitle: isApplePlatform,
        systemOverlayStyle: const SystemUiOverlayStyle(
          statusBarColor: Colors.transparent,
          statusBarIconBrightness: Brightness.dark,
          statusBarBrightness: Brightness.light,
        ),
        titleTextStyle: TextStyle(
          fontFamily: fontFamily,
          fontSize: 18,
          fontWeight: FontWeight.w600,
          color: _textPrimary,
        ),
      ),

      // ── Cards ────────────────────────────────────────────────────────
      cardTheme: CardThemeData(
        color: _surface,
        elevation: 1,
        shadowColor: _shadow,
        surfaceTintColor: Colors.transparent,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: const BorderSide(color: _border, width: 1),
        ),
      ),

      // ── Buttons ──────────────────────────────────────────────────────
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: _primary,
          foregroundColor: _onPrimary,
          elevation: 0,
          shadowColor: _shadow,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          textStyle: TextStyle(
            fontFamily: fontFamily,
            fontSize: 15,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: _primary,
          side: const BorderSide(color: _border, width: 1.5),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          textStyle: TextStyle(
            fontFamily: fontFamily,
            fontSize: 15,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: _primary,
          textStyle: TextStyle(
            fontFamily: fontFamily,
            fontSize: 14,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),

      // ── Inputs ───────────────────────────────────────────────────────
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: _inputFill,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide.none,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: _primary, width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: _error, width: 1),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: _error, width: 1.5),
        ),
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        hintStyle: const TextStyle(color: _textSecondary, fontSize: 14),
        labelStyle: const TextStyle(color: _textSecondary, fontSize: 14),
        prefixIconColor: _textSecondary,
      ),
      switchTheme: SwitchThemeData(
        thumbColor: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) return _surface;
          return null;
        }),
        trackColor: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) return _primary;
          return null;
        }),
      ),

      // ── Floating Action Button ───────────────────────────────────────
      floatingActionButtonTheme: const FloatingActionButtonThemeData(
        backgroundColor: _primary,
        foregroundColor: _onPrimary,
        elevation: 3,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(20)),
        ),
      ),

      // ── Snack Bars ───────────────────────────────────────────────────
      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        elevation: 4,
        insetPadding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
      ),

      // ── Bottom Nav ───────────────────────────────────────────────────
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: _surface,
        selectedItemColor: _primary,
        unselectedItemColor: _textSecondary,
        type: BottomNavigationBarType.fixed,
        elevation: 0,
      ),

      // ── Misc ─────────────────────────────────────────────────────────
      chipTheme: ChipThemeData(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(14),
        ),
      ),
      dividerTheme: const DividerThemeData(
        color: _border,
        thickness: 1,
        space: 0,
      ),
      dialogTheme: DialogThemeData(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        titleTextStyle: TextStyle(
          fontFamily: fontFamily,
          fontSize: 18,
          fontWeight: FontWeight.w700,
          color: _textPrimary,
        ),
      ),
      bottomSheetTheme: const BottomSheetThemeData(
        backgroundColor: _surface,
        modalBackgroundColor: _surface,
        showDragHandle: true,
        dragHandleColor: _border,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        ),
      ),
    );

    final themed = baseTheme.copyWith(
      extensions: [AppColors.light],
    );

    return isArabic
        ? themed.copyWith(
            textTheme:
                _getArabicBalancedTextTheme(themed.textTheme, fontFamily),
          )
        : themed;
  }

  static ThemeData getDarkTheme(Locale? locale) {
    final isArabic = locale?.languageCode == 'ar';
    final fontFamily = isArabic ? 'Cairo' : 'Inter';
    final isApplePlatform = defaultTargetPlatform == TargetPlatform.iOS ||
        defaultTargetPlatform == TargetPlatform.macOS;

    final colorScheme = ColorScheme.fromSeed(
      seedColor: _primaryDarkTheme,
      brightness: Brightness.dark,
      primary: _primaryDarkTheme,
      error: _error,
      surface: _surfaceDark,
      surfaceContainerHighest: _scaffoldBgDark,
    );

    final baseTheme = ThemeData(
      useMaterial3: true,
      colorScheme: colorScheme,
      fontFamily: fontFamily,
      scaffoldBackgroundColor: _scaffoldBgDark,
      splashFactory: isApplePlatform ? NoSplash.splashFactory : null,
      highlightColor: isApplePlatform ? Colors.transparent : null,
      pageTransitionsTheme: const PageTransitionsTheme(
        builders: {
          TargetPlatform.android: ZoomPageTransitionsBuilder(),
          TargetPlatform.iOS: CupertinoPageTransitionsBuilder(),
          TargetPlatform.macOS: CupertinoPageTransitionsBuilder(),
        },
      ),

      // ── App Bar ──────────────────────────────────────────────────────
      appBarTheme: AppBarTheme(
        backgroundColor: _surfaceDark,
        foregroundColor: _textPrimaryDark,
        elevation: 0,
        scrolledUnderElevation: 0.5,
        centerTitle: isApplePlatform,
        systemOverlayStyle: const SystemUiOverlayStyle(
          statusBarColor: Colors.transparent,
          statusBarIconBrightness: Brightness.light,
          statusBarBrightness: Brightness.dark,
        ),
        titleTextStyle: TextStyle(
          fontFamily: fontFamily,
          fontSize: 18,
          fontWeight: FontWeight.w600,
          color: _textPrimaryDark,
        ),
      ),

      // ── Cards ────────────────────────────────────────────────────────
      cardTheme: CardThemeData(
        color: _surfaceDark,
        elevation: 2,
        shadowColor: _shadowDark,
        surfaceTintColor: Colors.transparent,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: const BorderSide(color: _borderDark, width: 1),
        ),
      ),

      // ── Buttons ──────────────────────────────────────────────────────
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: _primaryDarkTheme,
          foregroundColor: Colors.black,
          elevation: 0,
          shadowColor: _shadowDark,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          textStyle: TextStyle(
            fontFamily: fontFamily,
            fontSize: 15,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: _primaryDarkTheme,
          side: const BorderSide(color: _borderDark, width: 1.5),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          textStyle: TextStyle(
            fontFamily: fontFamily,
            fontSize: 15,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: _primaryDarkTheme,
          textStyle: TextStyle(
            fontFamily: fontFamily,
            fontSize: 14,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),

      // ── Inputs ───────────────────────────────────────────────────────
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: _inputFillDark,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide.none,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: _primaryDarkTheme, width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: _error, width: 1),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: _error, width: 1.5),
        ),
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        hintStyle: const TextStyle(color: _textSecondaryDark, fontSize: 14),
        labelStyle: const TextStyle(color: _textSecondaryDark, fontSize: 14),
        prefixIconColor: _textSecondaryDark,
      ),
      switchTheme: SwitchThemeData(
        thumbColor: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) return Colors.black;
          return null;
        }),
        trackColor: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) return _primaryDarkTheme;
          return null;
        }),
      ),

      // ── Floating Action Button ───────────────────────────────────────
      floatingActionButtonTheme: const FloatingActionButtonThemeData(
        backgroundColor: _primaryDarkTheme,
        foregroundColor: Colors.black,
        elevation: 3,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(20)),
        ),
      ),

      // ── Snack Bars ───────────────────────────────────────────────────
      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        elevation: 4,
        insetPadding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
      ),

      // ── Bottom Nav ───────────────────────────────────────────────────
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: _surfaceDark,
        selectedItemColor: _primaryDarkTheme,
        unselectedItemColor: _textSecondaryDark,
        type: BottomNavigationBarType.fixed,
        elevation: 0,
      ),

      // ── Misc ─────────────────────────────────────────────────────────
      chipTheme: ChipThemeData(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(14),
        ),
      ),
      dividerTheme: const DividerThemeData(
        color: _borderDark,
        thickness: 1,
        space: 0,
      ),
      dialogTheme: DialogThemeData(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        titleTextStyle: TextStyle(
          fontFamily: fontFamily,
          fontSize: 18,
          fontWeight: FontWeight.w700,
          color: _textPrimaryDark,
        ),
      ),
      bottomSheetTheme: const BottomSheetThemeData(
        backgroundColor: _surfaceDark,
        modalBackgroundColor: _surfaceDark,
        showDragHandle: true,
        dragHandleColor: _borderDark,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        ),
      ),
    );

    final themed = baseTheme.copyWith(
      extensions: [AppColors.dark],
    );

    return isArabic
        ? themed.copyWith(
            textTheme:
                _getArabicBalancedTextTheme(themed.textTheme, fontFamily),
          )
        : themed;
  }

  // ── Convenience Getters ──────────────────────────────────────────────
  static Color get primary => _primary;
  static Color get primaryDark => _primaryDark;
  static Color get primaryLight => _primaryLight;
  static Color get accent => _accent;
  static Color get success => _success;
  static Color get warning => _warning;
  static Color get error => _error;
  static Color get surface => _surface;
  static Color get surfaceSoft => _surfaceSoft;
  static Color get scaffoldBg => _scaffoldBg;
  static Color get textPrimary => _textPrimary;
  static Color get textSecondary => _textSecondary;
  static Color get border => _border;
  static Color get shadow => _shadow;
}
