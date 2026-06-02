import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:edu_connect/l10n/app_localizations.dart';

import '../../../../core/theme/app_theme.dart';

class LinkingHubScreen extends ConsumerWidget {
  const LinkingHubScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final colors = context.appColors;
    final colorScheme = Theme.of(context).colorScheme;

    return Scaffold(
      backgroundColor: colorScheme.surface,
      appBar: AppBar(
        title: Text(l10n.linkStudent),
        leading: IconButton(
          tooltip: MaterialLocalizations.of(context).backButtonTooltip,
          icon: Icon(Icons.adaptive.arrow_back),
          onPressed: () {
            if (context.canPop()) {
              context.pop();
            } else {
              context.go('/classes');
            }
          },
        ),
      ),
      body: Center(
        child: SingleChildScrollView(
          keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // Header
              Container(
                width: 80,
                height: 80,
                decoration: BoxDecoration(
                  color: colors.tealLight,
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  Icons.person_add_outlined,
                  size: 40,
                  color: colors.tealDark,
                ),
              ).animate().scale(duration: 400.ms, curve: Curves.elasticOut),
              const SizedBox(height: 24),
              Text(
                l10n.linkingMethodTitle,
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.w800,
                  color: colorScheme.onSurface,
                ),
              ),
              const SizedBox(height: 12),
              Text(
                l10n.linkingMethodDesc,
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: colors.subtitleText,
                  fontSize: 15,
                  height: 1.5,
                ),
              ),
              const SizedBox(height: 48),

              // Option 1: Scan QR (Primary)
              _MethodCard(
                title: l10n.scanQrCode,
                icon: Icons.qr_code_scanner_rounded,
                isPrimary: true,
                onTap: () => context.push('/scan-qr'),
              ).animate().fadeIn(delay: 200.ms).slideX(begin: 0.1),

              const SizedBox(height: 16),

              // Option 2: Manual PIN
              _MethodCard(
                title: l10n.manualEntry,
                icon: Icons.keyboard_alt_outlined,
                isPrimary: false,
                onTap: () => context
                    .push('/join-class'), // Reuse existing PIN entry logic
              ).animate().fadeIn(delay: 300.ms).slideX(begin: 0.1),
            ],
          ),
        ),
      ),
    );
  }
}

class _MethodCard extends StatelessWidget {
  final String title;
  final IconData icon;
  final bool isPrimary;
  final VoidCallback onTap;

  const _MethodCard({
    required this.title,
    required this.icon,
    required this.isPrimary,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final colorScheme = Theme.of(context).colorScheme;
    final foreground =
        isPrimary ? colorScheme.onPrimary : colorScheme.onSurface;
    final cardColor = isPrimary ? colors.tealDark : colors.cardBg;

    return Semantics(
      button: true,
      label: title,
      child: Material(
        color: colorScheme.surface.withValues(alpha: 0),
        borderRadius: BorderRadius.circular(20),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(20),
          child: Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: cardColor,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: isPrimary ? colors.tealDark : colors.cardBorder,
              ),
              boxShadow: [
                BoxShadow(
                  color: (isPrimary ? colors.tealDark : colorScheme.shadow)
                      .withValues(alpha: isPrimary ? 0.2 : 0.05),
                  blurRadius: 20,
                  offset: const Offset(0, 8),
                ),
              ],
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: isPrimary
                        ? colorScheme.onPrimary.withValues(alpha: 0.15)
                        : colors.tealLight,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(
                    icon,
                    color: isPrimary ? colorScheme.onPrimary : colors.tealDark,
                    size: 28,
                  ),
                ),
                const SizedBox(width: 20),
                Expanded(
                  child: Text(
                    title,
                    style: TextStyle(
                      color: foreground,
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                Icon(
                  Icons.arrow_forward_ios_rounded,
                  color: isPrimary
                      ? colorScheme.onPrimary.withValues(alpha: 0.5)
                      : colors.mutedText,
                  size: 16,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
