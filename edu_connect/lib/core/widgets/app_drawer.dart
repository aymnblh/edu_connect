import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../theme/app_theme.dart';
import '../../features/auth/data/models/user_model.dart';
import '../../features/auth/presentation/providers/auth_provider.dart';
import '../../features/messaging/presentation/providers/dm_provider.dart';
import '../../l10n/app_localizations.dart';

class AppDrawer extends ConsumerWidget {
  final UserModel user;

  const AppDrawer({super.key, required this.user});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final text = _DrawerText.of(context);
    final convState = ref.watch(conversationsProvider);
    final totalUnread =
        convState.conversations.fold<int>(0, (sum, c) => sum + c.unreadCount);
    final palette = _DrawerPalette.of(context);

    return Drawer(
      backgroundColor: palette.background,
      surfaceTintColor: palette.transparentSurface,
      child: SafeArea(
        child: Column(
          children: [
            _DrawerHeader(user: user),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(14, 10, 14, 14),
                children: [
                  _DrawerDivider(text.main),
                  if (user.isSystemAdmin)
                    _DrawerItem(
                      icon: Icons.shield_outlined,
                      label: text.superAdminHome,
                      onTap: () => _go(context, '/superadmin'),
                    ),
                  if (user.isAdmin && !user.isSystemAdmin)
                    _DrawerItem(
                      icon: Icons.space_dashboard_outlined,
                      label: text.direction,
                      onTap: () => _go(context, '/dashboard'),
                    ),
                  if (!user.isSystemAdmin)
                    _DrawerItem(
                      icon: Icons.class_outlined,
                      label: l10n.classList,
                      onTap: () => _go(context, '/classes'),
                    ),
                  if (user.isAdmin && !user.isSystemAdmin)
                    _DrawerItem(
                      icon: Icons.add_circle_outline,
                      label: text.createClass,
                      onTap: () =>
                          _go(context, '/create-class', replace: false),
                    ),
                  if (user.isParent)
                    _DrawerItem(
                      icon: Icons.link_outlined,
                      label: text.linkChild,
                      onTap: () => _go(context, '/linking-hub', replace: false),
                    ),
                  if (user.isParent)
                    _DrawerItem(
                      icon: Icons.qr_code_scanner_outlined,
                      label: text.scanQr,
                      onTap: () => _go(context, '/scan-qr', replace: false),
                    ),
                  _DrawerDivider(text.communication),
                  _DrawerItem(
                    icon: Icons.forum_outlined,
                    label: l10n.chat,
                    badge: totalUnread,
                    onTap: () => _go(context, '/messaging', replace: false),
                  ),
                  _DrawerItem(
                    icon: Icons.notifications_outlined,
                    label: l10n.notifications,
                    onTap: () => _go(context, '/notifications', replace: false),
                  ),
                  if (user.isAdmin && !user.isSystemAdmin)
                    _DrawerDivider(text.management),
                  if (user.isAdmin && !user.isSystemAdmin) ...[
                    _DrawerItem(
                      icon: Icons.admin_panel_settings_outlined,
                      label: text.administration,
                      onTap: () => _go(context, '/admin-tools'),
                    ),
                    _DrawerItem(
                      icon: Icons.people_alt_outlined,
                      label: text.studentRecords,
                      onTap: () =>
                          _go(context, '/admin-tools/students', replace: false),
                    ),
                    _DrawerItem(
                      icon: Icons.auto_stories_outlined,
                      label: text.courseLibrary,
                      onTap: () =>
                          _go(context, '/admin-tools/courses', replace: false),
                    ),
                  ],
                  _DrawerDivider(text.account),
                  _DrawerItem(
                    icon: Icons.person_outline,
                    label: l10n.profile,
                    onTap: () => _go(context, '/profile', replace: false),
                  ),
                  _DrawerItem(
                    icon: Icons.privacy_tip_outlined,
                    label: text.policies,
                    onTap: () => _go(context, '/policies', replace: false),
                  ),
                ],
              ),
            ),
            Divider(color: palette.line, height: 1),
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 12, 14, 14),
              child: _DrawerItem(
                icon: Icons.logout,
                label: l10n.signOut,
                tone: palette.logout,
                onTap: () async {
                  Navigator.of(context).pop();
                  await ref.read(authNotifierProvider.notifier).signOut();
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _go(BuildContext context, String route, {bool replace = true}) {
    final router = GoRouter.of(context);
    Navigator.pop(context);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (replace) {
        router.go(route);
      } else {
        router.push(route);
      }
    });
  }
}

class _DrawerPalette {
  final Color background;
  final Color panel;
  final Color line;
  final Color active;
  final Color muted;
  final Color subtle;
  final Color foreground;
  final Color transparentSurface;
  final Color logout;
  final Color badgeBackground;
  final Color badgeForeground;

  const _DrawerPalette({
    required this.background,
    required this.panel,
    required this.line,
    required this.active,
    required this.muted,
    required this.subtle,
    required this.foreground,
    required this.transparentSurface,
    required this.logout,
    required this.badgeBackground,
    required this.badgeForeground,
  });

  factory _DrawerPalette.of(BuildContext context) {
    final theme = Theme.of(context);
    final colors = context.appColors;
    final foreground = theme.brightness == Brightness.dark
        ? theme.colorScheme.onSurface
        : theme.colorScheme.onPrimary;

    return _DrawerPalette(
      background: colors.tealDark,
      panel: foreground.withValues(alpha: 0.10),
      line: foreground.withValues(alpha: 0.14),
      active: foreground.withValues(alpha: 0.97),
      muted: foreground.withValues(alpha: 0.76),
      subtle: foreground.withValues(alpha: 0.48),
      foreground: foreground.withValues(alpha: 0.92),
      transparentSurface: theme.colorScheme.surface.withValues(alpha: 0),
      logout: colors.warningAmber,
      badgeBackground: colors.dangerRed,
      badgeForeground: theme.colorScheme.onError,
    );
  }
}

class _DrawerHeader extends StatelessWidget {
  final UserModel user;

  const _DrawerHeader({required this.user});

  @override
  Widget build(BuildContext context) {
    final palette = _DrawerPalette.of(context);
    final initial = user.fullName.trim().isEmpty
        ? '?'
        : user.fullName.trim()[0].toUpperCase();

    return Padding(
      padding: const EdgeInsets.fromLTRB(18, 18, 18, 10),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: palette.panel,
          borderRadius: BorderRadius.circular(22),
          border: Border.all(color: palette.line),
        ),
        child: Row(
          children: [
            Container(
              width: 46,
              height: 46,
              decoration: BoxDecoration(
                color: palette.foreground.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(16),
              ),
              alignment: Alignment.center,
              child: Text(
                initial,
                style: TextStyle(
                  color: palette.active,
                  fontSize: 20,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    user.fullName,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: palette.active,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    _roleLabel(context, user),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: palette.muted,
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    user.email,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: palette.subtle,
                      fontSize: 11,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _DrawerItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final int? badge;
  final Color? tone;
  final VoidCallback onTap;

  const _DrawerItem({
    required this.icon,
    required this.label,
    required this.onTap,
    this.badge,
    this.tone,
  });

  @override
  Widget build(BuildContext context) {
    final palette = _DrawerPalette.of(context);
    final color = tone ?? palette.foreground;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Material(
        color: palette.transparentSurface,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: onTap,
          child: Container(
            constraints: const BoxConstraints(minHeight: 48),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            child: Row(
              children: [
                Icon(icon, color: color, size: 21),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    label,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: color,
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                if (badge != null && badge! > 0) _DrawerBadge(value: badge!),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _DrawerBadge extends StatelessWidget {
  final int value;

  const _DrawerBadge({required this.value});

  @override
  Widget build(BuildContext context) {
    final palette = _DrawerPalette.of(context);
    return Container(
      constraints: const BoxConstraints(minWidth: 22, minHeight: 20),
      padding: const EdgeInsets.symmetric(horizontal: 6),
      decoration: BoxDecoration(
        color: palette.badgeBackground,
        borderRadius: BorderRadius.circular(10),
      ),
      alignment: Alignment.center,
      child: Text(
        value > 99 ? '99+' : '$value',
        textDirection: TextDirection.ltr,
        style: TextStyle(
          color: palette.badgeForeground,
          fontSize: 11,
          fontWeight: FontWeight.w900,
        ),
      ),
    );
  }
}

class _DrawerDivider extends StatelessWidget {
  final String label;

  const _DrawerDivider(this.label);

  @override
  Widget build(BuildContext context) {
    final palette = _DrawerPalette.of(context);
    return Padding(
      padding: const EdgeInsets.fromLTRB(10, 18, 10, 6),
      child: Text(
        label.toUpperCase(),
        style: TextStyle(
          color: palette.muted.withValues(alpha: 0.86),
          fontSize: 10,
          fontWeight: FontWeight.w900,
        ),
      ),
    );
  }
}

String _roleLabel(BuildContext context, UserModel user) {
  final text = _DrawerText.of(context);
  if (user.isSystemAdmin) return text.superAdmin;
  if (user.isAdmin) return text.direction;
  if (user.isTeacher) return text.teacher;
  return text.parent;
}

class _DrawerText {
  final String languageCode;

  const _DrawerText(this.languageCode);

  static _DrawerText of(BuildContext context) =>
      _DrawerText(Localizations.localeOf(context).languageCode);

  bool get _ar => languageCode == 'ar';
  bool get _fr => languageCode == 'fr';

  String pick(String ar, String fr, String en) => _ar
      ? ar
      : _fr
          ? fr
          : en;

  String get main => pick(
        '\u0627\u0644\u0631\u0626\u064a\u0633\u064a\u0629',
        'Principal',
        'Main',
      );
  String get communication => pick(
        '\u0627\u0644\u062a\u0648\u0627\u0635\u0644',
        'Communication',
        'Communication',
      );
  String get management => pick(
        '\u0627\u0644\u062a\u0633\u064a\u064a\u0631',
        'Gestion',
        'Management',
      );
  String get direction => pick(
        '\u0627\u0644\u0625\u062f\u0627\u0631\u0629',
        'Direction',
        'Direction',
      );
  String get administration => pick(
        '\u0627\u0644\u0625\u0634\u0631\u0627\u0641',
        'Administration',
        'Administration',
      );
  String get students => pick(
        '\u0627\u0644\u062a\u0644\u0627\u0645\u064a\u0630',
        'Eleves',
        'Students',
      );
  String get family => pick(
        '\u0627\u0644\u0639\u0627\u0626\u0644\u0629',
        'Famille',
        'Family',
      );
  String get linkChild => pick(
        '\u0631\u0628\u0637 \u0637\u0641\u0644',
        'Lier un enfant',
        'Link a child',
      );
  String get scanQr => pick(
        '\u0645\u0633\u062d QR',
        'Scanner QR',
        'Scan QR',
      );
  String get createClass => pick(
        '\u0625\u0646\u0634\u0627\u0621 \u0642\u0633\u0645',
        'Creer une classe',
        'Create class',
      );
  String get studentRecords => pick(
        '\u0633\u062c\u0644\u0627\u062a \u0627\u0644\u062a\u0644\u0627\u0645\u064a\u0630',
        'Dossiers eleves',
        'Student records',
      );
  String get courseLibrary => pick(
        '\u0645\u0643\u062a\u0628\u0629 \u0627\u0644\u0645\u0648\u0627\u062f',
        'Matieres',
        'Subjects',
      );
  String get policies => pick(
        '\u0627\u0644\u062e\u0635\u0648\u0635\u064a\u0629 \u0648\u0627\u0644\u0634\u0631\u0648\u0637',
        'Confidentialite et conditions',
        'Privacy and terms',
      );
  String get account => pick(
        '\u0627\u0644\u062d\u0633\u0627\u0628',
        'Compte',
        'Account',
      );
  String get superAdminHome => pick(
        '\u0627\u0644\u0645\u0646\u0635\u0629',
        'Plateforme',
        'Platform',
      );
  String get superAdmin => pick(
        '\u0627\u0644\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0639\u0627\u0645\u0629',
        'Super administration',
        'Super administration',
      );
  String get teacher => pick(
        '\u0645\u0639\u0644\u0645',
        'Enseignant',
        'Teacher',
      );
  String get parent => pick(
        '\u0648\u0644\u064a \u0623\u0645\u0631',
        'Parent',
        'Parent',
      );
}
