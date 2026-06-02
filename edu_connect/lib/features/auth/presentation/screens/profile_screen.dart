import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/shimmer_loading.dart';
import '../providers/auth_provider.dart';
import '../../data/models/user_model.dart';
import 'package:edu_connect/l10n/app_localizations.dart';
import '../../../../core/providers/locale_provider.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final text = _ProfileText.of(context);
    final userAsync = ref.watch(authNotifierProvider);

    return userAsync.when(
      loading: () => const Scaffold(
        body: SafeArea(child: ShimmerDashboard()),
      ),
      error: (e, _) => Scaffold(body: Center(child: Text('${l10n.error}: $e'))),
      data: (user) {
        if (user == null) return const SizedBox.shrink();

        return Scaffold(
          body: CustomScrollView(
            slivers: [
              _ProfileAppBar(user: user, text: text),
              SliverToBoxAdapter(
                child: Center(
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 600),
                    child: Padding(
                      padding: const EdgeInsets.all(20),
                      child: Column(
                        children: [
                          _InfoCard(
                            children: [
                              _InfoRow(
                                icon: Icons.email_outlined,
                                label: l10n.email,
                                value: user.email,
                              ),
                              const Divider(height: 1),
                              _InfoRow(
                                icon: Icons.person_outline,
                                label: text.role,
                                value: _roleLabel(user, text),
                              ),
                            ],
                          ).animate().fadeIn(delay: 100.ms).slideY(begin: 0.2),
                          const SizedBox(height: 16),
                          _InfoCard(
                            children: [
                              if (user.isAdmin) ...[
                                _ActionRow(
                                  icon: Icons.add_circle_outline,
                                  label: l10n.createClass,
                                  onTap: () => context.push('/create-class'),
                                ),
                                const Divider(height: 1),
                              ],
                              if (user.isParent) ...[
                                _ActionRow(
                                  icon: Icons.link,
                                  label: text.linkChild,
                                  onTap: () => context.push('/linking-hub'),
                                ),
                                const Divider(height: 1),
                              ],
                              _ActionRow(
                                icon: Icons.language_outlined,
                                label: text.language,
                                onTap: () => _showLanguagePicker(context, ref),
                              ),
                              const Divider(height: 1),
                              _ActionRow(
                                icon: Icons.privacy_tip_outlined,
                                label: text.policies,
                                onTap: () => context.push('/policies'),
                              ),
                              const Divider(height: 1),
                              _ActionRow(
                                icon: Icons.home_outlined,
                                label: user.isAdmin
                                    ? text.direction
                                    : text.dashboard,
                                onTap: () => context.go(
                                  user.isAdmin ? '/dashboard' : '/classes',
                                ),
                              ),
                            ],
                          ).animate().fadeIn(delay: 150.ms).slideY(begin: 0.2),
                          const SizedBox(height: 16),
                          Semantics(
                            button: true,
                            label: l10n.signOut,
                            child: SizedBox(
                              width: double.infinity,
                              child: OutlinedButton.icon(
                                style: OutlinedButton.styleFrom(
                                  foregroundColor: Theme.of(context)
                                      .extension<AppColors>()!
                                      .dangerRed,
                                  side: BorderSide(
                                    color: Theme.of(context)
                                        .extension<AppColors>()!
                                        .dangerRed,
                                    width: 1.5,
                                  ),
                                ),
                                icon: const Icon(Icons.logout),
                                label: Text(l10n.signOut),
                                onPressed: () async {
                                  await ref
                                      .read(authNotifierProvider.notifier)
                                      .signOut();
                                },
                              ),
                            ),
                          ).animate().fadeIn(delay: 250.ms),
                          const SizedBox(height: 30),
                          Semantics(
                            button: true,
                            label: text.deleteAccount,
                            child: TextButton(
                              style: TextButton.styleFrom(
                                foregroundColor: Theme.of(context)
                                    .extension<AppColors>()!
                                    .mutedText,
                                textStyle: const TextStyle(fontSize: 12),
                              ),
                              onPressed: () async {
                                final confirm = await showDialog<bool>(
                                  context: context,
                                  builder: (ctx) => AlertDialog(
                                    title: Text(text.deleteAccount),
                                    content: Text(text.deleteAccountConfirm),
                                    actions: [
                                      TextButton(
                                        onPressed: () =>
                                            Navigator.of(ctx).pop(false),
                                        child: Text(l10n.cancel),
                                      ),
                                      TextButton(
                                        style: TextButton.styleFrom(
                                          foregroundColor: Theme.of(context)
                                              .extension<AppColors>()!
                                              .dangerRed,
                                        ),
                                        onPressed: () =>
                                            Navigator.of(ctx).pop(true),
                                        child: Text(l10n.delete),
                                      ),
                                    ],
                                  ),
                                );

                                if (confirm == true) {
                                  await ref
                                      .read(authNotifierProvider.notifier)
                                      .deleteAccount();
                                }
                              },
                              child: Text(text.deleteAccount),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  void _showLanguagePicker(BuildContext context, WidgetRef ref) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        final l10n = AppLocalizations.of(context)!;
        final text = _ProfileText.of(context);
        final colors = Theme.of(context).extension<AppColors>()!;
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const SizedBox(height: 8),
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: colors.dividerColor,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: 16),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Text(
                  text.selectLanguage,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              const SizedBox(height: 16),
              ListTile(
                leading: const Text('EN', style: TextStyle(fontSize: 16)),
                title: Text(text.english),
                trailing: l10n.localeName == 'en'
                    ? Icon(Icons.check, color: colors.subtitleText)
                    : null,
                onTap: () {
                  ref
                      .read(localeProvider.notifier)
                      .setLocale(const Locale('en'));
                  Navigator.pop(ctx);
                },
              ),
              ListTile(
                leading: const Text('FR', style: TextStyle(fontSize: 16)),
                title: Text(text.french),
                trailing: l10n.localeName == 'fr'
                    ? Icon(Icons.check, color: colors.subtitleText)
                    : null,
                onTap: () {
                  ref
                      .read(localeProvider.notifier)
                      .setLocale(const Locale('fr'));
                  Navigator.pop(ctx);
                },
              ),
              ListTile(
                leading: const Text('AR', style: TextStyle(fontSize: 16)),
                title: Text(text.arabic),
                trailing: l10n.localeName == 'ar'
                    ? Icon(Icons.check, color: colors.subtitleText)
                    : null,
                onTap: () {
                  ref
                      .read(localeProvider.notifier)
                      .setLocale(const Locale('ar'));
                  Navigator.pop(ctx);
                },
              ),
              const SizedBox(height: 16),
            ],
          ),
        );
      },
    );
  }
}

class _ProfileAppBar extends StatelessWidget {
  final UserModel user;
  final _ProfileText text;

  const _ProfileAppBar({required this.user, required this.text});

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return SliverAppBar(
      expandedHeight: 220,
      pinned: true,
      backgroundColor: colorScheme.primary,
      flexibleSpace: FlexibleSpaceBar(
        background: Container(
          decoration: BoxDecoration(color: colorScheme.primary),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const SizedBox(height: 40),
              Semantics(
                label: text.avatarLabel(user.fullName),
                child: Hero(
                  tag: 'avatar',
                  child: CircleAvatar(
                    radius: 45,
                    backgroundColor:
                        colorScheme.onPrimary.withValues(alpha: 0.2),
                    child: Text(
                      user.fullName.isNotEmpty
                          ? user.fullName[0].toUpperCase()
                          : '?',
                      style: TextStyle(
                        fontSize: 36,
                        fontWeight: FontWeight.w700,
                        color: colorScheme.onPrimary,
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              Text(
                user.fullName,
                style: TextStyle(
                  color: colorScheme.onPrimary,
                  fontSize: 20,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 4),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 3,
                ),
                decoration: BoxDecoration(
                  color: colorScheme.onPrimary.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  _roleLabel(user, text),
                  style: TextStyle(
                    color: colorScheme.onPrimary,
                    fontSize: 13,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
      leading: IconButton(
        icon: Icon(Icons.adaptive.arrow_back, color: colorScheme.onPrimary),
        tooltip: MaterialLocalizations.of(context).backButtonTooltip,
        onPressed: () {
          if (context.canPop()) {
            context.pop();
          } else {
            context.go('/classes');
          }
        },
      ),
    );
  }
}

String _roleLabel(UserModel user, _ProfileText text) {
  if (user.isSystemAdmin) return text.superAdmin;
  if (user.isAdmin) return text.direction;
  if (user.isTeacher) return text.teacher;
  return text.parent;
}

class _ProfileText {
  final String languageCode;

  const _ProfileText(this.languageCode);

  static _ProfileText of(BuildContext context) =>
      _ProfileText(Localizations.localeOf(context).languageCode);

  bool get _ar => languageCode == 'ar';
  bool get _fr => languageCode == 'fr';

  String get role => _ar
      ? 'الدور'
      : _fr
          ? 'Rôle'
          : 'Role';
  String get direction => _ar
      ? 'الإدارة'
      : _fr
          ? 'Direction'
          : 'Direction';
  String get dashboard => _ar
      ? 'لوحة التحكم'
      : _fr
          ? 'Tableau de bord'
          : 'Dashboard';
  String get superAdmin => _ar
      ? 'الإدارة العامة'
      : _fr
          ? 'Super administration'
          : 'Super administration';
  String get teacher => _ar
      ? 'معلم'
      : _fr
          ? 'Enseignant'
          : 'Teacher';
  String get parent => _ar
      ? 'ولي أمر'
      : _fr
          ? 'Parent'
          : 'Parent';
  String get linkChild => _ar
      ? 'ربط طفل'
      : _fr
          ? 'Lier un enfant'
          : 'Link a child';
  String get language => _ar
      ? 'اللغة (العربية)'
      : _fr
          ? 'Langue (Français)'
          : 'Language (English)';
  String get policies => _ar
      ? 'الخصوصية والشروط'
      : _fr
          ? 'Confidentialite et conditions'
          : 'Privacy and terms';
  String get selectLanguage => _ar
      ? 'اختيار اللغة'
      : _fr
          ? 'Choisir la langue'
          : 'Select Language';
  String get english => _ar
      ? 'الإنجليزية'
      : _fr
          ? 'Anglais'
          : 'English';
  String get french => _ar
      ? 'الفرنسية'
      : _fr
          ? 'Français'
          : 'French';
  String get arabic => _ar
      ? 'العربية'
      : _fr
          ? 'Arabe'
          : 'Arabic';
  String get deleteAccount => _ar
      ? 'حذف الحساب'
      : _fr
          ? 'Supprimer le compte'
          : 'Delete account';
  String get deleteAccountConfirm => _ar
      ? 'هل أنت متأكد من حذف حسابك؟ لا يمكن التراجع عن هذا الإجراء.'
      : _fr
          ? 'Voulez-vous vraiment supprimer votre compte ? Cette action est irreversible.'
          : 'Are you sure you want to delete your account? This action cannot be undone.';
  String avatarLabel(String name) => _ar
      ? 'الصورة الرمزية لـ $name'
      : _fr
          ? 'Avatar de $name'
          : '$name avatar';
}

class _InfoCard extends StatelessWidget {
  final List<Widget> children;

  const _InfoCard({required this.children});

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<AppColors>()!;
    return Container(
      decoration: BoxDecoration(
        color: colors.cardBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: colors.cardBorder),
      ),
      child: Column(children: children),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _InfoRow(
      {required this.icon, required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<AppColors>()!;
    return Semantics(
      label: '$label: $value',
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        child: Row(
          children: [
            Icon(icon, color: colors.subtitleText, size: 20),
            const SizedBox(width: 12),
            Text(label,
                style: TextStyle(color: colors.mutedText, fontSize: 13)),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                value,
                textAlign: TextAlign.end,
                overflow: TextOverflow.ellipsis,
                maxLines: 1,
                style:
                    const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ActionRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _ActionRow(
      {required this.icon, required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<AppColors>()!;
    return Semantics(
      button: true,
      label: label,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          child: Row(
            children: [
              Icon(icon, color: colors.subtitleText, size: 20),
              const SizedBox(width: 12),
              Expanded(
                  child: Text(label,
                      style: const TextStyle(fontWeight: FontWeight.w500))),
              Icon(Icons.chevron_right, color: colors.mutedText, size: 20),
            ],
          ),
        ),
      ),
    );
  }
}
