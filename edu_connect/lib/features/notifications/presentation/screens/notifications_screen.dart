import 'package:edu_connect/l10n/app_localizations.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:intl/intl.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/shimmer_loading.dart';
import '../providers/notification_provider.dart';
import '../../data/models/notification_model.dart';

class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notificationsAsync = ref.watch(notificationNotifierProvider);
    final theme = Theme.of(context);
    final colors = context.appColors;

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        title: Text(AppLocalizations.of(context)!.notifications),
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.done_all),
            tooltip: AppLocalizations.of(context)!.markAllAsRead,
            onPressed: () =>
                ref.read(notificationNotifierProvider.notifier).markAllRead(),
          ),
        ],
      ),
      body: notificationsAsync.when(
        loading: () => const ShimmerList(itemCount: 7),
        error: (e, _) => _NotificationErrorState(
          onRetry: () => ref.read(notificationNotifierProvider.notifier).load(),
        ),
        data: (notifications) {
          if (notifications.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.notifications_none_outlined,
                      size: 64,
                      color: colors.mutedText.withValues(alpha: 0.35)),
                  const SizedBox(height: 16),
                  Text(AppLocalizations.of(context)!.noData,
                      style: TextStyle(
                          color: colors.mutedText.withValues(alpha: 0.72),
                          fontSize: 16,
                          fontWeight: FontWeight.w600)),
                ],
              ),
            );
          }

          return ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: notifications.length,
            itemBuilder: (ctx, i) {
              final n = notifications[i];
              return _NotificationCard(notification: n, index: i);
            },
          );
        },
      ),
    );
  }
}

class _NotificationErrorState extends StatelessWidget {
  final VoidCallback onRetry;

  const _NotificationErrorState({required this.onRetry});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = context.appColors;
    final isArabic = Localizations.localeOf(context).languageCode == 'ar';
    final title = isArabic
        ? 'تعذر تحميل التنبيهات'
        : 'Impossible de charger les notifications';
    final subtitle = isArabic
        ? 'تحقق من الاتصال ثم حاول مرة أخرى.'
        : 'Vérifiez la connexion puis réessayez.';
    final retry = isArabic ? 'إعادة المحاولة' : 'Réessayer';

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.notifications_off_outlined,
              size: 56,
              color: colors.mutedText.withValues(alpha: 0.35),
            ),
            const SizedBox(height: 16),
            Text(
              title,
              textAlign: TextAlign.center,
              style: TextStyle(
                color: theme.colorScheme.onSurface,
                fontSize: 17,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              subtitle,
              textAlign: TextAlign.center,
              style: TextStyle(
                color: colors.subtitleText,
                fontSize: 13,
                height: 1.4,
              ),
            ),
            const SizedBox(height: 18),
            FilledButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh),
              label: Text(retry),
            ),
          ],
        ),
      ),
    );
  }
}

class _NotificationCard extends ConsumerWidget {
  final NotificationModel notification;
  final int index;

  const _NotificationCard({required this.notification, required this.index});

  Color _color(AppColors colors) {
    switch (notification.type) {
      case 'WARNING':
        return colors.warningAmber;
      case 'SUCCESS':
        return colors.successGreen;
      default:
        return colors.tealDark;
    }
  }

  IconData get _icon {
    switch (notification.type) {
      case 'WARNING':
        return Icons.warning_amber_rounded;
      case 'SUCCESS':
        return Icons.check_circle_outline_rounded;
      default:
        return Icons.info_outline_rounded;
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final colors = context.appColors;
    final tone = _color(colors);

    return Card(
      margin: const EdgeInsetsDirectional.only(bottom: 12),
      elevation: notification.isRead ? 0 : 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(
          color: notification.isRead
              ? colors.cardBorder
              : tone.withValues(alpha: 0.3),
          width: notification.isRead ? 1 : 2,
        ),
      ),
      child: InkWell(
        onTap: () {
          if (!notification.isRead) {
            ref
                .read(notificationNotifierProvider.notifier)
                .markRead(notification.id);
          }
        },
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: notification.isRead
                ? colors.cardBg
                : tone.withValues(alpha: 0.05),
            borderRadius: BorderRadius.circular(16),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: tone.withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                ),
                child: Icon(_icon, color: tone, size: 20),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Text(
                            notification.title,
                            style: TextStyle(
                              fontWeight: notification.isRead
                                  ? FontWeight.w600
                                  : FontWeight.bold,
                              fontSize: 16,
                              color: notification.isRead
                                  ? colors.subtitleText
                                  : theme.colorScheme.onSurface,
                            ),
                          ),
                        ),
                        Text(
                          DateFormat('HH:mm').format(notification.createdAt),
                          style:
                              TextStyle(fontSize: 12, color: colors.mutedText),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      notification.content,
                      style: TextStyle(
                        fontSize: 14,
                        color: notification.isRead
                            ? colors.mutedText
                            : theme.colorScheme.onSurface,
                        height: 1.4,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      DateFormat('dd MMM yyyy').format(notification.createdAt),
                      style: TextStyle(
                          fontSize: 11,
                          color: colors.mutedText.withValues(alpha: 0.72),
                          fontWeight: FontWeight.w500),
                    ),
                  ],
                ),
              ),
              if (!notification.isRead)
                Container(
                  width: 8,
                  height: 8,
                  decoration:
                      BoxDecoration(color: tone, shape: BoxShape.circle),
                ),
            ],
          ),
        ),
      ),
    )
        .animate()
        .fadeIn(delay: Duration(milliseconds: index * 50))
        .slideX(begin: 0.1);
  }
}
