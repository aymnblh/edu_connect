import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:edu_connect/core/theme/app_theme.dart';
import 'package:edu_connect/l10n/app_localizations.dart';

class LinkingSuccessDialog extends StatelessWidget {
  final String? studentName;
  final double? average;
  final double? attendance;

  const LinkingSuccessDialog({
    super.key,
    this.studentName,
    this.average,
    this.attendance,
  });

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final colors = context.appColors;
    final colorScheme = Theme.of(context).colorScheme;

    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
      elevation: 0,
      backgroundColor: colorScheme.surface.withValues(alpha: 0),
      child: Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: colors.cardBg,
          borderRadius: BorderRadius.circular(28),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Success Icon
            Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(
                color: colors.successGreen.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(Icons.check_circle_rounded,
                  color: colors.successGreen, size: 40),
            ).animate().scale(duration: 600.ms, curve: Curves.elasticOut),
            const SizedBox(height: 20),

            Text(
              l10n.qrLinkSuccess,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w800,
                color: colorScheme.onSurface,
              ),
            ),
            const SizedBox(height: 8),
            if (studentName != null)
              Text(
                studentName!,
                style: TextStyle(
                  fontSize: 16,
                  color: colors.subtitleText,
                  fontWeight: FontWeight.w500,
                ),
              ),

            const SizedBox(height: 32),

            // Preview Stats
            Row(
              children: [
                Expanded(
                  child: _StatCard(
                    label: l10n.averageScore,
                    value: average != null
                        ? '${average!.toStringAsFixed(2)}/20'
                        : l10n.noGradesYet,
                    icon: Icons.auto_graph_rounded,
                    color: colors.tealDark,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _StatCard(
                    label: l10n.attendanceRate,
                    value: attendance != null
                        ? '${(attendance! * 100).toInt()}%'
                        : '-',
                    icon: Icons.calendar_today_rounded,
                    color: colors.successGreen,
                  ),
                ),
              ],
            ).animate().fadeIn(delay: 400.ms).slideY(begin: 0.1),

            const SizedBox(height: 32),

            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () => Navigator.pop(context),
                style: ElevatedButton.styleFrom(
                  backgroundColor: colors.tealDark,
                  foregroundColor: colorScheme.onPrimary,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16)),
                ),
                child: Text(l10n.save),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color color;

  const _StatCard({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withValues(alpha: 0.1)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(height: 12),
          Text(
            value,
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w800,
              color: color,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: colors.subtitleText,
              letterSpacing: 0.2,
            ),
          ),
        ],
      ),
    );
  }
}
