import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../../core/services/api_service.dart';
import '../../../../core/widgets/app_drawer.dart';
import '../../../../core/widgets/shimmer_loading.dart';
import '../../../auth/data/models/user_model.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../../notifications/presentation/providers/notification_provider.dart';
import '../../data/models/class_model.dart';
import '../providers/class_provider.dart';

class ClassListScreen extends ConsumerWidget {
  const ClassListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final userAsync = ref.watch(authNotifierProvider);
    final classesAsync = ref.watch(userClassesProvider);
    final text = _ClassListText.of(context);

    return userAsync.when(
      loading: () => const _PageShell(child: _LoadingState()),
      error: (e, _) => _PageShell(child: _ErrorState(message: '$e')),
      data: (user) {
        if (user == null) return const SizedBox.shrink();

        return Scaffold(
          backgroundColor: Theme.of(context).scaffoldBackgroundColor,
          drawer: AppDrawer(user: user),
          appBar: _HomeAppBar(user: user),
          floatingActionButton: _HomeFab(user: user),
          body: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 800),
              child: classesAsync.when(
                loading: () => const _LoadingState(),
                error: (e, _) => _ErrorState(
                  message: '${text.classesLoadFailed} $e',
                  onRetry: () => ref.invalidate(userClassesProvider),
                ),
                data: (classes) {
                  if (classes.isEmpty) {
                    return _EmptyState(user: user);
                  }

                  return RefreshIndicator(
                    onRefresh: () async => ref.invalidate(userClassesProvider),
                    child: ListView(
                      physics: const AlwaysScrollableScrollPhysics(),
                      padding: const EdgeInsets.fromLTRB(16, 12, 16, 96),
                      children: [
                        _RoleHeader(user: user, classes: classes)
                            .animate()
                            .fadeIn(duration: 220.ms)
                            .slideY(begin: 0.04),
                        const SizedBox(height: 12),
                        _PulsePanel(user: user)
                            .animate()
                            .fadeIn(delay: 70.ms, duration: 220.ms),
                        const SizedBox(height: 18),
                        _SectionTitle(text.classes),
                        const SizedBox(height: 10),
                        ...classes.asMap().entries.map(
                              (entry) => _ClassCard(
                                user: user,
                                classModel: entry.value,
                                index: entry.key,
                              ),
                            ),
                      ],
                    ),
                  );
                },
              ),
            ),
          ),
        );
      },
    );
  }
}

class _HomeAppBar extends ConsumerWidget implements PreferredSizeWidget {
  final UserModel user;

  const _HomeAppBar({required this.user});

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final unreadCount = ref.watch(unreadNotificationsCountProvider);
    final firstName = user.fullName.trim().split(' ').first;
    final text = _ClassListText.of(context);
    final colors = context.appColors;

    return AppBar(
      title: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            firstName.isEmpty ? 'Wasel Edu' : firstName,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          Text(
            _roleLabel(context, user),
            style: TextStyle(
              fontSize: 12,
              color: colors.mutedText,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
      actions: [
        Stack(
          clipBehavior: Clip.none,
          children: [
            IconButton(
              icon: const Icon(Icons.notifications_outlined),
              tooltip: text.notifications,
              onPressed: () => context.push('/notifications'),
            ),
            if (unreadCount > 0)
              Positioned(
                right: 8,
                top: 8,
                child: _Badge(value: unreadCount),
              ),
          ],
        ),
        IconButton(
          icon: const Icon(Icons.person_outline),
          tooltip: text.profile,
          onPressed: () => context.push('/profile'),
        ),
      ],
    );
  }
}

class _HomeFab extends StatelessWidget {
  final UserModel user;

  const _HomeFab({required this.user});

  @override
  Widget build(BuildContext context) {
    final text = _ClassListText.of(context);
    if (user.isTeacher) return const SizedBox.shrink();

    if (user.isAdmin) {
      return FloatingActionButton.extended(
        icon: const Icon(Icons.add),
        label: Text(text.newClass),
        onPressed: () => context.push('/create-class'),
      );
    }

    return FloatingActionButton.extended(
      icon: const Icon(Icons.link),
      label: Text(text.linkChild),
      onPressed: () => context.push('/linking-hub'),
    );
  }
}

class _RoleHeader extends StatelessWidget {
  final UserModel user;
  final List<ClassModel> classes;

  const _RoleHeader({required this.user, required this.classes});

  @override
  Widget build(BuildContext context) {
    final text = _ClassListText.of(context);
    final colors = context.appColors;
    final colorScheme = Theme.of(context).colorScheme;
    final totalStudents =
        classes.fold<int>(0, (sum, cls) => sum + cls.memberCount);
    final title = user.isAdmin
        ? text.adminHeaderTitle
        : user.isTeacher
            ? text.teacherHeaderTitle
            : text.parentHeaderTitle;
    final subtitle = user.isAdmin
        ? text.adminHeaderSubtitle
        : user.isTeacher
            ? text.teacherHeaderSubtitle
            : text.parentHeaderSubtitle;

    return _Panel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              _IconBox(icon: _roleIcon(user), tone: colors.tealDark),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.w800,
                        color: colorScheme.onSurface,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      subtitle,
                      style: TextStyle(
                        color: colors.mutedText,
                        height: 1.25,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: _MetricPill(
                  icon: Icons.class_outlined,
                  label: text.classes,
                  value: '${classes.length}',
                  tone: colors.tealDark,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _MetricPill(
                  icon: Icons.groups_outlined,
                  label: user.isParent ? text.children : text.students,
                  value: '$totalStudents',
                  tone: colors.successGreen,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _MetricPill(
                  icon: user.pushToken == null
                      ? Icons.notifications_off_outlined
                      : Icons.notifications_active_outlined,
                  label: text.alerts,
                  value: user.pushToken == null ? text.off : text.on,
                  tone: user.pushToken == null
                      ? colors.warningAmber
                      : colors.successGreen,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _PulsePanel extends StatelessWidget {
  final UserModel user;

  const _PulsePanel({required this.user});

  @override
  Widget build(BuildContext context) {
    final text = _ClassListText.of(context);
    final colors = context.appColors;
    final items = user.isTeacher
        ? [
            _PulseItem(
              Icons.fact_check_outlined,
              text.attendanceCall,
              text.attendanceCallHint,
            ),
            _PulseItem(
              Icons.menu_book_outlined,
              text.lessonDiary,
              text.lessonDiaryHint,
            ),
          ]
        : user.isParent
            ? [
                _PulseItem(
                  Icons.warning_amber_outlined,
                  text.absences,
                  text.justifyQuickly,
                ),
                _PulseItem(
                  Icons.verified_outlined,
                  text.grades,
                  text.afterValidationOnly,
                ),
              ]
            : [
                _PulseItem(
                  Icons.verified_user_outlined,
                  text.validation,
                  text.finalGradesToCheck,
                ),
                _PulseItem(
                  Icons.receipt_long_outlined,
                  text.schoolFees,
                  text.paymentsAndReceipts,
                ),
              ];

    return Row(
      children: items
          .map(
            (item) => Expanded(
              child: Padding(
                padding: EdgeInsets.only(
                  right: item == items.last ? 0 : 8,
                ),
                child: _Panel(
                  padding: const EdgeInsets.all(12),
                  child: Row(
                    children: [
                      _IconBox(icon: item.icon, tone: colors.tealDark),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              item.title,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style:
                                  const TextStyle(fontWeight: FontWeight.w800),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              item.caption,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                fontSize: 12,
                                color: colors.mutedText,
                                height: 1.15,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          )
          .toList(),
    );
  }
}

class _PulseItem {
  final IconData icon;
  final String title;
  final String caption;

  const _PulseItem(this.icon, this.title, this.caption);
}

class _ClassCard extends StatelessWidget {
  final UserModel user;
  final ClassModel classModel;
  final int index;

  const _ClassCard({
    required this.user,
    required this.classModel,
    required this.index,
  });

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final colorScheme = Theme.of(context).colorScheme;
    final subject = classModel.subject?.trim();
    final actions = _actionsFor(context);

    return _Panel(
      margin: const EdgeInsetsDirectional.only(bottom: 12),
      padding: EdgeInsets.zero,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 14, 14, 10),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _IconBox(
                  icon: user.isParent
                      ? Icons.school_outlined
                      : Icons.class_outlined,
                  tone: colors.tealDark,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        classModel.name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w800,
                          color: colorScheme.onSurface,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        subject == null || subject.isEmpty
                            ? _classCaption(context, user)
                            : _displaySubject(context, subject),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          color: colors.mutedText,
                          fontSize: 13,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                _CountChip(count: classModel.memberCount),
              ],
            ),
          ),
          const Divider(),
          Padding(
            padding: const EdgeInsets.all(10),
            child: Wrap(
              spacing: 8,
              runSpacing: 8,
              children: actions,
            ),
          ),
        ],
      ),
    )
        .animate()
        .fadeIn(delay: Duration(milliseconds: 70 + index * 45))
        .slideY(begin: 0.04);
  }

  List<Widget> _actionsFor(BuildContext context) {
    final id = classModel.id;
    final text = _ClassListText.of(context);
    final colors = context.appColors;
    final colorScheme = Theme.of(context).colorScheme;
    final primaryTone = colors.tealDark;
    final successTone = colors.successGreen;
    final warningTone = colors.warningAmber;
    final infoTone = colors.tealAccent;
    final accentTone = colorScheme.secondary;

    if (user.isTeacher) {
      return [
        _ActionChipButton(
          icon: Icons.fact_check_outlined,
          label: text.attendanceCall,
          tone: warningTone,
          onTap: () => context.push('/class/$id/attendance'),
        ),
        _ActionChipButton(
          icon: Icons.menu_book_outlined,
          label: text.lessonDiary,
          tone: accentTone,
          onTap: () => context.push('/class/$id/lessons'),
        ),
        _ActionChipButton(
          icon: Icons.assignment_outlined,
          label: text.homework,
          tone: infoTone,
          onTap: () => context.push('/class/$id/homework'),
        ),
        _ActionChipButton(
          icon: Icons.stacked_line_chart_outlined,
          label: text.grades,
          tone: successTone,
          onTap: () => context.push('/class/$id/grades'),
        ),
        _ActionChipButton(
          icon: Icons.rate_review_outlined,
          label: text.remarks,
          tone: primaryTone,
          onTap: () => context.push('/class/$id/remarks'),
        ),
        _ActionChipButton(
          icon: Icons.chat_bubble_outline,
          label: text.chat,
          tone: primaryTone,
          onTap: () => context.push('/class/$id/chat'),
        ),
      ];
    }

    if (user.isParent) {
      return [
        _ActionChipButton(
          icon: Icons.verified_outlined,
          label: text.grades,
          tone: successTone,
          onTap: () => context.push('/class/$id/grades'),
        ),
        _ActionChipButton(
          icon: Icons.event_busy_outlined,
          label: text.absences,
          tone: warningTone,
          onTap: () => context.push('/class/$id/student-attendance'),
        ),
        _ActionChipButton(
          icon: Icons.assignment_outlined,
          label: text.homework,
          tone: infoTone,
          onTap: () => context.push('/class/$id/homework'),
        ),
        _ActionChipButton(
          icon: Icons.menu_book_outlined,
          label: text.lessonDiary,
          tone: accentTone,
          onTap: () => context.push('/class/$id/lessons'),
        ),
        _ActionChipButton(
          icon: Icons.calendar_month_outlined,
          label: text.schedule,
          tone: successTone,
          onTap: () => context.push(
            '/class/$id/schedule?name=${Uri.encodeComponent(classModel.name)}',
          ),
        ),
        _ActionChipButton(
          icon: Icons.forum_outlined,
          label: text.messages,
          tone: primaryTone,
          onTap: () => context.push('/class/$id/chat'),
        ),
      ];
    }

    return [
      _ActionChipButton(
        icon: Icons.settings_outlined,
        label: text.manage,
        tone: primaryTone,
        onTap: () => context.push('/class/$id/manage'),
      ),
      _ActionChipButton(
        icon: Icons.verified_outlined,
        label: text.grades,
        tone: successTone,
        onTap: () => context.push('/class/$id/grades'),
      ),
      _ActionChipButton(
        icon: Icons.menu_book_outlined,
        label: text.lessonDiary,
        tone: accentTone,
        onTap: () => context.push('/class/$id/lessons'),
      ),
      _ActionChipButton(
        icon: Icons.calendar_month_outlined,
        label: text.schedule,
        tone: successTone,
        onTap: () => context.push(
          '/class/$id/schedule?name=${Uri.encodeComponent(classModel.name)}',
        ),
      ),
      _ActionChipButton(
        icon: Icons.forum_outlined,
        label: text.chat,
        tone: primaryTone,
        onTap: () => context.push('/class/$id/chat'),
      ),
    ];
  }
}

class _ActionChipButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color tone;
  final VoidCallback onTap;

  const _ActionChipButton({
    required this.icon,
    required this.label,
    required this.tone,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: tone.withValues(alpha: 0.08),
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: Container(
          constraints: const BoxConstraints(minWidth: 92, minHeight: 38),
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: tone.withValues(alpha: 0.22)),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, color: tone, size: 16),
              const SizedBox(width: 6),
              Text(
                label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  color: tone,
                  fontSize: 12,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _MetricPill extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color tone;

  const _MetricPill({
    required this.icon,
    required this.label,
    required this.value,
    required this.tone,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: tone.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: tone.withValues(alpha: 0.16)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: tone, size: 16),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: tone,
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            value,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              color: colorScheme.onSurface,
              fontWeight: FontWeight.w900,
              fontSize: 18,
            ),
          ),
        ],
      ),
    );
  }
}

class _CountChip extends StatelessWidget {
  final int count;

  const _CountChip({required this.count});

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 6),
      decoration: BoxDecoration(
        color: colors.tealDark.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.people_outline,
            color: colors.tealDark,
            size: 14,
          ),
          const SizedBox(width: 4),
          Text(
            '$count',
            textDirection: TextDirection.ltr,
            style: TextStyle(
              color: colors.tealDark,
              fontSize: 12,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }
}

class _Panel extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  final EdgeInsetsGeometry? margin;

  const _Panel({
    required this.child,
    this.padding = const EdgeInsets.all(14),
    this.margin,
  });

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    return Container(
      margin: margin,
      padding: padding,
      decoration: BoxDecoration(
        color: colors.cardBg,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: colors.cardBorder),
        boxShadow: [
          BoxShadow(
            color: Theme.of(context).shadowColor.withValues(alpha: 0.08),
            blurRadius: 22,
            offset: const Offset(0, 12),
          ),
        ],
      ),
      child: child,
    );
  }
}

class _IconBox extends StatelessWidget {
  final IconData icon;
  final Color tone;

  const _IconBox({required this.icon, required this.tone});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 40,
      height: 40,
      decoration: BoxDecoration(
        color: tone.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Icon(icon, color: tone, size: 20),
    );
  }
}

class _Badge extends StatelessWidget {
  final int value;

  const _Badge({required this.value});

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final colorScheme = Theme.of(context).colorScheme;
    return Container(
      constraints: const BoxConstraints(minWidth: 16, minHeight: 16),
      padding: const EdgeInsets.symmetric(horizontal: 4),
      decoration: BoxDecoration(
        color: colors.dangerRed,
        shape: BoxShape.circle,
      ),
      alignment: Alignment.center,
      child: Text(
        value > 9 ? '9+' : '$value',
        style: TextStyle(
          color: colorScheme.onError,
          fontSize: 9,
          fontWeight: FontWeight.w900,
        ),
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  final String title;

  const _SectionTitle(this.title);

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Text(
      title,
      style: TextStyle(
        color: colorScheme.onSurface,
        fontSize: 16,
        fontWeight: FontWeight.w900,
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  final UserModel user;
  const _EmptyState({required this.user});

  @override
  Widget build(BuildContext context) {
    // Parents get a rich guided onboarding instead of a generic empty state
    if (user.isParent) return _ParentOnboardingState(user: user);

    final text = _ClassListText.of(context);
    final colors = context.appColors;
    final colorScheme = Theme.of(context).colorScheme;
    final title = user.isTeacher ? text.noClasses : text.noClasses;
    final body = user.isAdmin
        ? text.noClassesAdminBody
        : user.isTeacher
            ? text.noClassesTeacherBody
            : text.noClassesParentBody;

    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(24),
      children: [
        const SizedBox(height: 72),
        _Panel(
          child: Column(
            children: [
              _IconBox(icon: _roleIcon(user), tone: colors.tealDark)
                  .animate()
                  .scale(duration: 220.ms),
              const SizedBox(height: 16),
              Text(
                title,
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w900,
                  color: colorScheme.onSurface,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                body,
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: colors.mutedText,
                  height: 1.35,
                ),
              ),
              if (!user.isTeacher) ...[
                const SizedBox(height: 18),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    icon: Icon(user.isAdmin ? Icons.add : Icons.link),
                    label: Text(
                      user.isAdmin ? text.createClass : text.linkChild,
                    ),
                    onPressed: () => context.push(
                      user.isAdmin ? '/create-class' : '/linking-hub',
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }
}

// ─── Parent Onboarding ────────────────────────────────────────────────────────
// Shown when an authenticated parent has no linked children yet.
// Provides three escalating actions:
//   1. Enter student PIN  → POST /auth/verify-code
//   2. Scan QR code       → /scan-qr (existing route)
//   3. Contact direction  → /messaging

class _ParentOnboardingState extends StatefulWidget {
  final UserModel user;
  const _ParentOnboardingState({required this.user});

  @override
  State<_ParentOnboardingState> createState() => _ParentOnboardingStateState();
}

class _ParentOnboardingStateState extends State<_ParentOnboardingState> {
  final _pinController = TextEditingController();
  bool _isLoading = false;
  String? _error;

  @override
  void dispose() {
    _pinController.dispose();
    super.dispose();
  }

  Future<void> _submitPin() async {
    final pin = _pinController.text.trim();
    if (pin.isEmpty) return;
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      // Validate the PIN via the existing verify-code endpoint.
      // On success, navigate to linking-hub to complete registration.
      await ApiService.instance.post('/auth/verify-code', data: {'pin': pin});
      if (mounted) context.push('/linking-hub');
    } catch (e) {
      if (!mounted) return;
      final t = _ClassListText.of(context);
      setState(() {
        _isLoading = false;
        _error = t.invalidPin;
      });
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = _ClassListText.of(context);
    final colors = context.appColors;
    final colorScheme = Theme.of(context).colorScheme;
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(20, 32, 20, 32),
      children: [
        // ── Welcome header ─────────────────────────────────────────────────
        Row(
          children: [
            Container(
              width: 52,
              height: 52,
              decoration: BoxDecoration(
                color: colors.tealDark.withValues(alpha: 0.10),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Icon(
                Icons.family_restroom_outlined,
                color: colors.tealDark,
                size: 28,
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    t.onboardingWelcome,
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w900,
                      color: colorScheme.onSurface,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    t.onboardingSubtitle,
                    style: TextStyle(color: colors.mutedText, fontSize: 13),
                  ),
                ],
              ),
            ),
          ],
        ).animate().fadeIn(duration: 250.ms).slideY(begin: 0.05),

        const SizedBox(height: 28),

        // ── Step 1 — PIN ───────────────────────────────────────────────────
        _StepCard(
          step: '1',
          tone: colors.tealDark,
          icon: Icons.pin_outlined,
          title: t.onboardingPinTitle,
          subtitle: t.onboardingPinSubtitle,
          delay: 100.ms,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              TextField(
                controller: _pinController,
                keyboardType: TextInputType.number,
                inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                maxLength: 8,
                onSubmitted: (_) => _submitPin(),
                decoration: InputDecoration(
                  hintText: t.onboardingPinHint,
                  prefixIcon: Icon(Icons.lock_outline, color: colors.tealDark),
                  filled: true,
                  fillColor: colors.inputBg,
                  counterText: '',
                  errorText: _error,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide(
                      color: colors.tealDark.withValues(alpha: 0.3),
                    ),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide(
                      color: colors.tealDark.withValues(alpha: 0.2),
                    ),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide(color: colors.tealDark, width: 2),
                  ),
                  errorBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide(color: colors.dangerRed),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                height: 46,
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: colors.tealDark,
                    foregroundColor: colorScheme.onPrimary,
                    disabledBackgroundColor:
                        colors.tealDark.withValues(alpha: 0.5),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12)),
                  ),
                  onPressed: _isLoading ? null : _submitPin,
                  icon: _isLoading
                      ? SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: colorScheme.onPrimary,
                          ),
                        )
                      : const Icon(Icons.send_outlined, size: 18),
                  label: Text(
                    t.onboardingPinButton,
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 16),

        // ── OR divider ─────────────────────────────────────────────────────
        Row(
          children: [
            const Expanded(child: Divider()),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Text(
                t.orDivider,
                style: TextStyle(
                  color: colors.mutedText,
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 1.2,
                ),
              ),
            ),
            const Expanded(child: Divider()),
          ],
        ).animate().fadeIn(delay: 200.ms),

        const SizedBox(height: 16),

        // ── Step 2 — QR Scanner ────────────────────────────────────────────
        _StepCard(
          step: '2',
          tone: colors.successGreen,
          icon: Icons.qr_code_scanner_rounded,
          title: t.onboardingQrTitle,
          subtitle: t.onboardingQrSubtitle,
          delay: 250.ms,
          child: SizedBox(
            width: double.infinity,
            height: 46,
            child: OutlinedButton.icon(
              style: OutlinedButton.styleFrom(
                foregroundColor: colors.successGreen,
                side: BorderSide(
                  color: colors.successGreen.withValues(alpha: 0.5),
                ),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12)),
              ),
              onPressed: () => context.push('/scan-qr'),
              icon: const Icon(Icons.camera_alt_outlined, size: 18),
              label: Text(
                t.onboardingQrButton,
                style: const TextStyle(fontWeight: FontWeight.w700),
              ),
            ),
          ),
        ),

        const SizedBox(height: 12),

        // ── Step 3 — Contact direction ─────────────────────────────────────
        _StepCard(
          step: '?',
          tone: colors.warningAmber,
          icon: Icons.support_agent_outlined,
          title: t.onboardingContactTitle,
          subtitle: t.onboardingContactSubtitle,
          delay: 350.ms,
          child: SizedBox(
            width: double.infinity,
            height: 46,
            child: OutlinedButton.icon(
              style: OutlinedButton.styleFrom(
                foregroundColor: colors.warningAmber,
                side: BorderSide(
                  color: colors.warningAmber.withValues(alpha: 0.5),
                ),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12)),
              ),
              onPressed: () => context.push('/messaging'),
              icon: const Icon(Icons.chat_bubble_outline, size: 18),
              label: Text(
                t.onboardingContactButton,
                style: const TextStyle(fontWeight: FontWeight.w700),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

// ─── Step Card ────────────────────────────────────────────────────────────────

class _StepCard extends StatelessWidget {
  final String step;
  final Color tone;
  final IconData icon;
  final String title;
  final String subtitle;
  final Widget child;
  final Duration delay;

  const _StepCard({
    required this.step,
    required this.tone,
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.child,
    required this.delay,
  });

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final colorScheme = Theme.of(context).colorScheme;
    return Container(
      decoration: BoxDecoration(
        color: colors.cardBg,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: colors.cardBorder),
        boxShadow: [
          BoxShadow(
            color: Theme.of(context).shadowColor.withValues(alpha: 0.06),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header row: step badge + title + icon
            Row(
              children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: tone.withValues(alpha: 0.10),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  alignment: Alignment.center,
                  child: Text(
                    step,
                    style: TextStyle(
                      color: tone,
                      fontSize: 16,
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
                        title,
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w800,
                          color: colorScheme.onSurface,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        subtitle,
                        style: TextStyle(
                          fontSize: 12,
                          color: colors.mutedText,
                          height: 1.3,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                Icon(icon, color: tone.withValues(alpha: 0.55), size: 22),
              ],
            ),
            const SizedBox(height: 14),
            child,
          ],
        ),
      ),
    ).animate().fadeIn(delay: delay, duration: 280.ms).slideY(begin: 0.06);
  }
}

class _LoadingState extends StatelessWidget {
  const _LoadingState();

  @override
  Widget build(BuildContext context) {
    return const ShimmerDashboard();
  }
}

class _ErrorState extends StatelessWidget {
  final String message;
  final VoidCallback? onRetry;

  const _ErrorState({required this.message, this.onRetry});

  @override
  Widget build(BuildContext context) {
    final text = _ClassListText.of(context);
    final colors = context.appColors;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: _Panel(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.wifi_off_outlined,
                size: 42,
                color: colors.warningAmber,
              ),
              const SizedBox(height: 12),
              Text(
                text.unstableConnection,
                style:
                    const TextStyle(fontWeight: FontWeight.w900, fontSize: 17),
              ),
              const SizedBox(height: 6),
              Text(
                message,
                textAlign: TextAlign.center,
                style: TextStyle(color: colors.mutedText),
              ),
              if (onRetry != null) ...[
                const SizedBox(height: 14),
                OutlinedButton.icon(
                  onPressed: onRetry,
                  icon: const Icon(Icons.refresh),
                  label: Text(text.retry),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _PageShell extends StatelessWidget {
  final Widget child;

  const _PageShell({required this.child});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: child,
    );
  }
}

IconData _roleIcon(UserModel user) {
  if (user.isAdmin) return Icons.admin_panel_settings_outlined;
  if (user.isTeacher) return Icons.edit_note_outlined;
  return Icons.family_restroom_outlined;
}

String _roleLabel(BuildContext context, UserModel user) {
  final text = _ClassListText.of(context);
  if (user.isAdmin) return text.direction;
  if (user.isTeacher) return text.teacher;
  return text.parent;
}

String _classCaption(BuildContext context, UserModel user) {
  final text = _ClassListText.of(context);
  if (user.isTeacher) return text.assignedClass;
  if (user.isParent) return text.childFollowUp;
  return text.schoolClass;
}

String _displaySubject(BuildContext context, String subject) {
  final text = _ClassListText.of(context);
  if (text.isArabic) {
    final parenthesisIndex = subject.indexOf('(');
    if (parenthesisIndex > 0) {
      final arabicPart = subject.substring(0, parenthesisIndex).trim();
      if (RegExp(r'[\u0600-\u06FF]').hasMatch(arabicPart)) {
        return arabicPart;
      }
    }
  }
  if (text.isEnglish) {
    final match = RegExp(r'\(([^)]+)\)').firstMatch(subject);
    if (match != null) return match.group(1)!.trim();
  }
  return subject;
}

class _ClassListText {
  final String languageCode;

  const _ClassListText(this.languageCode);

  static _ClassListText of(BuildContext context) =>
      _ClassListText(Localizations.localeOf(context).languageCode);

  bool get isArabic => languageCode == 'ar';
  bool get isEnglish => languageCode == 'en';
  bool get _fr => languageCode == 'fr';

  String pick(String ar, String fr, String en) => isArabic
      ? ar
      : _fr
          ? fr
          : en;

  String get notifications =>
      pick('التنبيهات', 'Notifications', 'Notifications');
  String get profile => pick('الملف الشخصي', 'Profil', 'Profile');
  String get direction => pick('الإدارة', 'Direction', 'Direction');
  String get teacher => pick('معلم', 'Enseignant', 'Teacher');
  String get parent => pick('ولي أمر', 'Parent', 'Parent');
  String get classes => pick('الأقسام', 'Classes', 'Classes');
  String get students => pick('الطلاب', 'Élèves', 'Students');
  String get children => pick('الأطفال', 'Enfants', 'Children');
  String get alerts => pick('التنبيهات', 'Alertes', 'Alerts');
  String get on => pick('مفعلة', 'On', 'On');
  String get off => pick('متوقفة', 'Off', 'Off');
  String get newClass => pick('قسم جديد', 'Nouvelle classe', 'New class');
  String get createClass =>
      pick('إنشاء قسم', 'Créer une classe', 'Create class');
  String get linkChild => pick('ربط طفل', 'Lier un enfant', 'Link a child');

  String get adminHeaderTitle =>
      pick('إدارة المؤسسة', 'Pilotage de l’établissement', 'School steering');
  String get teacherHeaderTitle =>
      pick('يوم المعلم', 'Journée enseignant', 'Teacher day');
  String get parentHeaderTitle =>
      pick('متابعة العائلة', 'Suivi familial', 'Family follow-up');
  String get adminHeaderSubtitle => pick(
        'الأقسام، التعداد، المصادقات والإدارة في مكان واحد.',
        'Classes, effectifs, validations et administration au même endroit.',
        'Classes, enrollment, validations, and administration in one place.',
      );
  String get teacherHeaderSubtitle => pick(
        'الحضور، دفتر النصوص، الواجبات، الدرجات والملاحظات مباشرة.',
        'Appel, cahier, devoirs, notes et remarques en accès direct.',
        'Attendance, diary, homework, grades, and remarks in direct access.',
      );
  String get parentHeaderSubtitle => pick(
        'الدرجات المصادق عليها، الغيابات، الواجبات، التخطيط والرسائل بسرعة.',
        'Notes validées, absences, devoirs, planning et messages visibles rapidement.',
        'Approved grades, absences, homework, schedule, and messages at a glance.',
      );

  String get attendanceCall => pick('الحضور', 'Appel', 'Attendance');
  String get attendanceCallHint =>
      pick('في بداية الحصة', 'À faire en début de séance', 'Do at class start');
  String get lessonDiary => pick('دفتر النصوص', 'Cahier', 'Diary');
  String get lessonDiaryHint => pick(
      'درس اليوم للإدخال', 'Cours du jour à saisir', 'Enter today’s lesson');
  String get homework => pick('الواجبات', 'Devoirs', 'Homework');
  String get grades => pick('الدرجات', 'Notes', 'Grades');
  String get remarks => pick('الملاحظات', 'Remarques', 'Remarks');
  String get chat => pick('المحادثة', 'Chat', 'Chat');
  String get absences => pick('الغيابات', 'Absences', 'Absences');
  String get justifyQuickly =>
      pick('تبرير سريع', 'Justifier rapidement', 'Justify quickly');
  String get afterValidationOnly => pick(
        'بعد المصادقة فقط',
        'Uniquement après validation',
        'Only after validation',
      );
  String get validation => pick('المصادقة', 'Validation', 'Validation');
  String get finalGradesToCheck => pick(
        'مراقبة الدرجات النهائية',
        'Notes finales à contrôler',
        'Final grades to review',
      );
  String get schoolFees => pick('الرسوم المدرسية', 'Écolage', 'School fees');
  String get paymentsAndReceipts => pick(
      'المدفوعات والوصولات', 'Paiements et reçus', 'Payments and receipts');
  String get schedule => pick('التخطيط', 'Planning', 'Schedule');
  String get messages => pick('الرسائل', 'Messages', 'Messages');
  String get manage => pick('إدارة', 'Gérer', 'Manage');

  String get assignedClass =>
      pick('قسم معيّن', 'Classe affectée', 'Assigned class');
  String get childFollowUp =>
      pick('متابعة الطفل', 'Suivi de l’enfant', 'Child follow-up');
  String get schoolClass =>
      pick('قسم المؤسسة', 'Classe de l’établissement', 'School class');

  String get noLinkedChildren =>
      pick('لا يوجد طفل مرتبط', 'Aucun enfant lié', 'No linked child');
  String get noClasses => pick('لا توجد أقسام', 'Aucune classe', 'No classes');
  String get noClassesAdminBody => pick(
        'أنشئ قسماً للبدء في تنظيم المؤسسة.',
        'Créez une classe pour commencer à structurer l’établissement.',
        'Create a class to start structuring the school.',
      );
  String get noClassesTeacherBody => pick(
        'ستظهر الأقسام هنا عندما تعيّنك الإدارة.',
        'Les classes apparaissent ici dès que la direction vous affecte.',
        'Classes appear here once the administration assigns you.',
      );
  String get noClassesParentBody => pick(
        'اربط طفلك باستعمال رمز PIN المقدم من الإدارة.',
        'Liez votre enfant avec le PIN fourni par l’administration.',
        'Link your child with the PIN provided by the administration.',
      );

  // ── Parent onboarding strings ─────────────────────────────────────────────
  String get onboardingWelcome => pick('مرحباً بك في Wasel Edu',
      'Bienvenue sur Wasel Edu', 'Welcome to Wasel Edu');
  String get onboardingSubtitle => pick(
      'ابدأ بربط طفلك للوصول إلى معلوماته المدرسية.',
      "Commencez par lier votre enfant pour accéder à son suivi scolaire.",
      'Start by linking your child to access their school information.');
  String get onboardingPinTitle =>
      pick('رمز PIN الطالب', "Code PIN de l'élève", 'Student PIN code');
  String get onboardingPinSubtitle => pick(
      'موجود في الدفتر المدرسي أو مقدم من الإدارة.',
      "Disponible dans le carnet scolaire ou fourni par l'administration.",
      'Found in the school booklet or provided by the administration.');
  String get onboardingPinHint =>
      pick('أدخل رمز PIN', 'Saisir le code PIN', 'Enter PIN code');
  String get onboardingPinButton =>
      pick('ربط بهذا الرمز', 'Lier avec ce code', 'Link with this code');
  String get onboardingQrTitle =>
      pick('مسح رمز QR', 'Scanner le QR Code', 'Scan QR Code');
  String get onboardingQrSubtitle => pick(
      'امسح الرمز الموجود على بطاقة الطالب أو من الإدارة.',
      "Scannez le code sur la carte élève ou remis par l'école.",
      'Scan the code on the student card or provided by the school.');
  String get onboardingQrButton =>
      pick('فتح الكاميرا', 'Ouvrir la caméra', 'Open camera');
  String get onboardingContactTitle => pick('تواصل مع الإدارة',
      'Contacter la direction', 'Contact the administration');
  String get onboardingContactSubtitle => pick(
      'لم تحصل على رمز؟ اكتب مباشرة إلى إدارة المدرسة.',
      'Pas encore de code ? Écrivez directement à la direction.',
      'No code yet? Write directly to the school administration.');
  String get onboardingContactButton =>
      pick('فتح المراسلة', 'Ouvrir la messagerie', 'Open messaging');
  String get invalidPin =>
      pick('رمز PIN غير صحيح', 'Code PIN invalide', 'Invalid PIN code');
  String get orDivider => pick('أو', 'OU', 'OR');

  String get classesLoadFailed => pick(
        'تعذر تحميل الأقسام.',
        'Impossible de charger les classes.',
        'Unable to load classes.',
      );
  String get unstableConnection =>
      pick('الاتصال غير مستقر', 'Connexion instable', 'Unstable connection');
  String get retry => pick('إعادة المحاولة', 'Réessayer', 'Retry');
}
