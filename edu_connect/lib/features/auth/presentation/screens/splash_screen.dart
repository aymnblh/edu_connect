import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../../../core/theme/app_theme.dart';
import 'package:edu_connect/l10n/app_localizations.dart';

class SplashScreen extends ConsumerWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final colors = context.appColors;
    final isDark = theme.brightness == Brightness.dark;
    final isArabic = Localizations.localeOf(context).languageCode == 'ar';
    final fontFamily = isArabic ? 'Cairo' : 'Inter';
    final appTitle = AppLocalizations.of(context)?.appTitle ?? 'Wasel Edu';

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
            Positioned(
              top: -100,
              right: -50,
              child: Container(
                width: 250,
                height: 250,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: colors.tealAccent.withValues(
                    alpha: isDark ? 0.08 : 0.05,
                  ),
                ),
              )
                  .animate(
                    onPlay: (controller) => controller.repeat(reverse: true),
                  )
                  .moveY(
                    begin: 0,
                    end: 30,
                    duration: 4.seconds,
                    curve: Curves.easeInOut,
                  )
                  .scaleXY(
                    begin: 1.0,
                    end: 1.15,
                    duration: 4.seconds,
                    curve: Curves.easeInOut,
                  ),
            ),
            Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    width: 90,
                    height: 90,
                    decoration: BoxDecoration(
                      color: colors.cardBg.withValues(
                        alpha: isDark ? 0.8 : 1,
                      ),
                      borderRadius: BorderRadius.circular(28),
                      border: Border.all(
                        color: colors.cardBorder,
                        width: 1.5,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: theme.shadowColor.withValues(
                            alpha: isDark ? 0.3 : 0.05,
                          ),
                          blurRadius: 20,
                          offset: const Offset(0, 10),
                        ),
                      ],
                    ),
                    child: Padding(
                      padding: const EdgeInsets.all(8),
                      child: Image.asset(
                        'assets/images/wasel_edu_logo.png',
                        fit: BoxFit.contain,
                        semanticLabel: appTitle,
                      ),
                    ),
                  )
                      .animate()
                      .scale(duration: 800.ms, curve: Curves.elasticOut)
                      .then()
                      .shimmer(
                        duration: 1200.ms,
                        color: colors.tealAccent.withValues(
                          alpha: isDark ? 1 : 0.3,
                        ),
                      ),
                  const SizedBox(height: 28),
                  Text(
                    appTitle,
                    style: TextStyle(
                      color: theme.colorScheme.onSurface,
                      fontSize: 32,
                      fontWeight: FontWeight.w800,
                      fontFamily: fontFamily,
                      letterSpacing: 0,
                    ),
                  ).animate().fadeIn(delay: 300.ms),
                  const SizedBox(height: 8),
                  Text(
                    AppLocalizations.of(context)?.connectingSchoolsFamilies ??
                        'Connecting schools & families',
                    style: TextStyle(
                      color: colors.subtitleText,
                      fontSize: 14,
                      fontFamily: fontFamily,
                      fontWeight: FontWeight.w500,
                    ),
                  ).animate().fadeIn(delay: 450.ms),
                  const SizedBox(height: 48),
                  CircularProgressIndicator(
                    valueColor: AlwaysStoppedAnimation<Color>(
                      colors.tealDark,
                    ),
                    strokeWidth: 2.5,
                  ).animate().fadeIn(delay: 600.ms),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
