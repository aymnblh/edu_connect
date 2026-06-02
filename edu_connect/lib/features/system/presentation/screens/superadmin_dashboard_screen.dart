import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/shimmer_loading.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../providers/system_provider.dart';

class SuperAdminDashboardScreen extends ConsumerWidget {
  const SuperAdminDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final schoolsAsyncValue = ref.watch(systemSchoolsProvider);
    final theme = Theme.of(context);
    final text = _SuperAdminText.of(context);

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        title: Text(text.title),
        actions: [
          Semantics(
            button: true,
            label: text.refresh,
            child: IconButton(
              tooltip: text.refresh,
              icon: const Icon(Icons.refresh),
              onPressed: () => ref.invalidate(systemSchoolsProvider),
            ),
          ),
          Semantics(
            button: true,
            label: text.signOut,
            child: IconButton(
              tooltip: text.signOut,
              icon: const Icon(Icons.logout_rounded),
              onPressed: () => _signOut(context, ref),
            ),
          ),
        ],
      ),
      body: SafeArea(
        child: schoolsAsyncValue.when(
          data: (schools) => RefreshIndicator(
            onRefresh: () async => ref.refresh(systemSchoolsProvider.future),
            child: CustomScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              slivers: [
                SliverToBoxAdapter(child: _Header(schools: schools)),
                if (schools.isEmpty)
                  const SliverFillRemaining(
                    hasScrollBody: false,
                    child: _EmptyState(),
                  )
                else
                  SliverPadding(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                    sliver: SliverList.separated(
                      itemCount: schools.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 12),
                      itemBuilder: (context, index) {
                        return _SchoolTile(
                          school: schools[index],
                          onPayment: () =>
                              _showPaymentDialog(context, ref, schools[index]),
                          onToggleActive: () => _toggleSchool(
                            context,
                            ref,
                            schools[index],
                          ),
                        );
                      },
                    ),
                  ),
              ],
            ),
          ),
          loading: () => const ShimmerDashboard(),
          error: (error, _) => _ErrorState(
            message: text.loadError(error),
            onRetry: () => ref.invalidate(systemSchoolsProvider),
          ),
        ),
      ),
    );
  }

  Future<void> _signOut(BuildContext context, WidgetRef ref) async {
    await ref.read(authNotifierProvider.notifier).signOut();
  }

  Future<void> _toggleSchool(
    BuildContext context,
    WidgetRef ref,
    Map<String, dynamic> school,
  ) async {
    final messenger = ScaffoldMessenger.of(context);
    final errorColor = context.appColors.dangerRed;
    final text = _SuperAdminText.of(context);
    final id = school['id']?.toString();
    if (id == null || id.isEmpty) return;

    try {
      final isActive = school['is_active'] == true;
      if (isActive) {
        await ref.read(systemRepositoryProvider).deactivateSchool(id);
      } else {
        await ref.read(systemRepositoryProvider).activateSchool(id);
      }
      ref.invalidate(systemSchoolsProvider);
      messenger.showSnackBar(
        SnackBar(
          content: Text(isActive ? text.schoolSuspended : text.schoolActivated),
        ),
      );
    } catch (e) {
      messenger.showSnackBar(
        SnackBar(
          content: Text(text.actionFailed(e)),
          backgroundColor: errorColor,
        ),
      );
    }
  }

  void _showPaymentDialog(
    BuildContext context,
    WidgetRef ref,
    Map<String, dynamic> school,
  ) {
    final amountController = TextEditingController(text: '50000');
    final monthsController = TextEditingController(text: '12');
    final text = _SuperAdminText.of(context);

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(text.paymentTitle(school['name']?.toString())),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: amountController,
              keyboardType: TextInputType.number,
              decoration: InputDecoration(
                labelText: text.amountLabel,
                prefixIcon: const Icon(Icons.payments_outlined),
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: monthsController,
              keyboardType: TextInputType.number,
              decoration: InputDecoration(
                labelText: text.monthsLabel,
                prefixIcon: const Icon(Icons.calendar_month_outlined),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text(text.cancel),
          ),
          FilledButton(
            onPressed: () async {
              final amount = double.tryParse(amountController.text) ?? 0.0;
              final months = int.tryParse(monthsController.text) ?? 12;
              final id = school['id']?.toString();
              if (amount <= 0 || id == null || id.isEmpty) return;

              Navigator.pop(ctx);
              final messenger = ScaffoldMessenger.of(context);
              final errorColor = context.appColors.dangerRed;
              try {
                await ref.read(systemRepositoryProvider).addPayment(
                      schoolId: id,
                      amount: amount,
                      monthsAdded: months,
                      paymentMethod: 'cash',
                    );
                ref.invalidate(systemSchoolsProvider);
                messenger.showSnackBar(
                  SnackBar(content: Text(text.paymentSaved)),
                );
              } catch (e) {
                messenger.showSnackBar(
                  SnackBar(
                    content: Text(text.paymentFailed(e)),
                    backgroundColor: errorColor,
                  ),
                );
              }
            },
            child: Text(text.validate),
          ),
        ],
      ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({required this.schools});

  final List<Map<String, dynamic>> schools;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = context.appColors;
    final text = _SuperAdminText.of(context);
    final total = schools.length;
    final active = schools.where((s) => s['is_active'] == true).length;
    final pending = total - active;
    final students = schools.fold<int>(
      0,
      (sum, s) => sum + _asInt(s['student_count']),
    );
    final users = schools.fold<int>(
      0,
      (sum, s) => sum + _asInt(s['user_count']),
    );
    final classes = schools.fold<int>(
      0,
      (sum, s) => sum + _asInt(s['class_count']),
    );

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 18, 16, 18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            text.platformView,
            style: TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.w800,
              color: theme.colorScheme.onSurface,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            text.platformSubtitle,
            style: TextStyle(color: colors.subtitleText),
          ),
          const SizedBox(height: 18),
          GridView.count(
            crossAxisCount: MediaQuery.sizeOf(context).width >= 720 ? 4 : 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisSpacing: 10,
            mainAxisSpacing: 10,
            childAspectRatio: 1.55,
            children: [
              _MetricCard(
                icon: Icons.account_balance_outlined,
                label: text.schools,
                value: '$total',
                color: colors.subtitleText,
              ),
              _MetricCard(
                icon: Icons.verified_outlined,
                label: text.activeSchools,
                value: '$active',
                color: colors.successGreen,
              ),
              _MetricCard(
                icon: Icons.pending_actions_outlined,
                label: text.pending,
                value: '$pending',
                color: colors.warningAmber,
              ),
              _MetricCard(
                icon: Icons.groups_2_outlined,
                label: text.users,
                value: '$users',
                color: colors.subtitleText,
              ),
              _MetricCard(
                icon: Icons.school_outlined,
                label: text.students,
                value: '$students',
                color: colors.subtitleText,
              ),
              _MetricCard(
                icon: Icons.class_outlined,
                label: text.classes,
                value: '$classes',
                color: colors.subtitleText,
              ),
            ],
          ),
          const SizedBox(height: 20),
          Text(
            text.schoolsSection,
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w800,
              color: theme.colorScheme.onSurface,
            ),
          ),
        ],
      ),
    );
  }
}

class _MetricCard extends StatelessWidget {
  const _MetricCard({
    required this.icon,
    required this.label,
    required this.value,
    required this.color,
  });

  final IconData icon;
  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    return Semantics(
      label: '$label: $value',
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: colors.cardBg,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: colors.cardBorder),
        ),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Icon(icon, color: color),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    value,
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.w800,
                      color: color,
                    ),
                  ),
                  Text(
                    label,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: colors.mutedText,
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SchoolTile extends StatelessWidget {
  const _SchoolTile({
    required this.school,
    required this.onPayment,
    required this.onToggleActive,
  });

  final Map<String, dynamic> school;
  final VoidCallback onPayment;
  final VoidCallback onToggleActive;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = context.appColors;
    final text = _SuperAdminText.of(context);
    final isActive = school['is_active'] == true;
    final statusColor = isActive ? colors.successGreen : colors.warningAmber;
    final name = school['name']?.toString() ?? text.schoolFallback;
    final expiry = _dateLabel(school['subscription_expires_at']);
    final payment = school['last_payment_amount'];

    return Semantics(
      label: text.schoolSummary(name, isActive),
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  CircleAvatar(
                    backgroundColor: statusColor.withValues(alpha: 0.12),
                    foregroundColor: statusColor,
                    child: Icon(isActive
                        ? Icons.verified_outlined
                        : Icons.pending_actions_outlined),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          name,
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w800,
                            color: theme.colorScheme.onSurface,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          isActive ? text.activeStatus : text.pendingStatus,
                          style: TextStyle(
                            color: statusColor,
                            fontWeight: FontWeight.w700,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  _InfoPill(
                    icon: Icons.people_outline,
                    text: text.userCount(_asInt(school['user_count'])),
                  ),
                  _InfoPill(
                    icon: Icons.school_outlined,
                    text: text.studentCount(_asInt(school['student_count'])),
                  ),
                  _InfoPill(
                    icon: Icons.class_outlined,
                    text: text.classCount(_asInt(school['class_count'])),
                  ),
                  _InfoPill(
                    icon: Icons.event_available_outlined,
                    text: expiry == null
                        ? text.noSubscription
                        : text.expires(expiry),
                  ),
                  if (payment != null)
                    _InfoPill(
                      icon: Icons.payments_outlined,
                      text: '${_asNum(payment).toStringAsFixed(0)} DA',
                    ),
                ],
              ),
              const SizedBox(height: 14),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: onToggleActive,
                      icon: Icon(isActive
                          ? Icons.pause_circle_outline
                          : Icons.play_circle_outline),
                      label: Text(isActive ? text.suspend : text.activate),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: FilledButton.icon(
                      onPressed: onPayment,
                      icon: const Icon(Icons.add_card_outlined),
                      label: Text(text.payment),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _InfoPill extends StatelessWidget {
  const _InfoPill({required this.icon, required this.text});

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    return DecoratedBox(
      decoration: BoxDecoration(
        color: colors.glassSurface,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: colors.cardBorder),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 15, color: colors.mutedText),
            const SizedBox(width: 6),
            Text(
              text,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: colors.subtitleText,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState();

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Text(
          _SuperAdminText.of(context).noSchools,
          style: TextStyle(color: colors.mutedText),
        ),
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.error_outline,
              size: 42,
              color: colors.dangerRed,
            ),
            const SizedBox(height: 12),
            Text(
              message,
              textAlign: TextAlign.center,
              style: TextStyle(color: colors.mutedText),
            ),
            const SizedBox(height: 16),
            FilledButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh),
              label: Text(_SuperAdminText.of(context).retry),
            ),
          ],
        ),
      ),
    );
  }
}

int _asInt(dynamic value) {
  if (value is int) return value;
  if (value is num) return value.toInt();
  return int.tryParse(value?.toString() ?? '') ?? 0;
}

num _asNum(dynamic value) {
  if (value is num) return value;
  return num.tryParse(value?.toString() ?? '') ?? 0;
}

String? _dateLabel(dynamic value) {
  final raw = value?.toString();
  if (raw == null || raw.isEmpty) return null;
  final parsed = DateTime.tryParse(raw);
  if (parsed == null) return raw;
  final day = parsed.day.toString().padLeft(2, '0');
  final month = parsed.month.toString().padLeft(2, '0');
  return '$day/$month/${parsed.year}';
}

class _SuperAdminText {
  final String languageCode;

  const _SuperAdminText(this.languageCode);

  static _SuperAdminText of(BuildContext context) =>
      _SuperAdminText(Localizations.localeOf(context).languageCode);

  bool get _ar => languageCode == 'ar';
  bool get _fr => languageCode == 'fr';

  String get title => _ar
      ? 'مدير النظام'
      : _fr
          ? 'Super Admin'
          : 'Super Admin';
  String get refresh => _ar
      ? 'تحديث'
      : _fr
          ? 'Actualiser'
          : 'Refresh';
  String get signOut => _ar
      ? 'تسجيل الخروج'
      : _fr
          ? 'Déconnexion'
          : 'Sign out';
  String get platformView => _ar
      ? 'نظرة المنصة'
      : _fr
          ? 'Vue plateforme'
          : 'Platform overview';
  String get platformSubtitle => _ar
      ? 'متابعة المؤسسات والاشتراكات والتفعيلات.'
      : _fr
          ? 'Suivi des établissements, abonnements et activations.'
          : 'Track schools, subscriptions, and activations.';
  String get schools => _ar
      ? 'المدارس'
      : _fr
          ? 'Écoles'
          : 'Schools';
  String get activeSchools => _ar
      ? 'نشطة'
      : _fr
          ? 'Actives'
          : 'Active';
  String get pending => _ar
      ? 'قيد المعالجة'
      : _fr
          ? 'À traiter'
          : 'Pending';
  String get users => _ar
      ? 'المستخدمون'
      : _fr
          ? 'Utilisateurs'
          : 'Users';
  String get students => _ar
      ? 'الطلاب'
      : _fr
          ? 'Élèves'
          : 'Students';
  String get classes => _ar
      ? 'الأقسام'
      : _fr
          ? 'Classes'
          : 'Classes';
  String get schoolsSection => _ar
      ? 'المؤسسات'
      : _fr
          ? 'Établissements'
          : 'Schools';
  String get schoolFallback => _ar
      ? 'مؤسسة'
      : _fr
          ? 'Établissement'
          : 'School';
  String get activeStatus => _ar
      ? 'نشط'
      : _fr
          ? 'Actif'
          : 'Active';
  String get pendingStatus => _ar
      ? 'قيد الانتظار / معلق'
      : _fr
          ? 'En attente / suspendu'
          : 'Pending / suspended';
  String get noSubscription => _ar
      ? 'لا يوجد اشتراك'
      : _fr
          ? 'Pas d’abonnement'
          : 'No subscription';
  String get suspend => _ar
      ? 'تعليق'
      : _fr
          ? 'Suspendre'
          : 'Suspend';
  String get activate => _ar
      ? 'تفعيل'
      : _fr
          ? 'Activer'
          : 'Activate';
  String get payment => _ar
      ? 'دفع'
      : _fr
          ? 'Paiement'
          : 'Payment';
  String get amountLabel => _ar
      ? 'المبلغ (دج)'
      : _fr
          ? 'Montant (DA)'
          : 'Amount (DZD)';
  String get monthsLabel => _ar
      ? 'الأشهر المراد إضافتها'
      : _fr
          ? 'Mois à ajouter'
          : 'Months to add';
  String get cancel => _ar
      ? 'إلغاء'
      : _fr
          ? 'Annuler'
          : 'Cancel';
  String get validate => _ar
      ? 'تأكيد'
      : _fr
          ? 'Valider'
          : 'Confirm';
  String get retry => _ar
      ? 'إعادة المحاولة'
      : _fr
          ? 'Réessayer'
          : 'Retry';
  String get noSchools => _ar
      ? 'لم يتم العثور على أي مؤسسة.'
      : _fr
          ? 'Aucun établissement trouvé.'
          : 'No schools found.';
  String get schoolSuspended => _ar
      ? 'تم تعليق المؤسسة.'
      : _fr
          ? 'Établissement suspendu.'
          : 'School suspended.';
  String get schoolActivated => _ar
      ? 'تم تفعيل المؤسسة.'
      : _fr
          ? 'Établissement activé.'
          : 'School activated.';
  String get paymentSaved => _ar
      ? 'تم تسجيل الدفع.'
      : _fr
          ? 'Paiement enregistré.'
          : 'Payment recorded.';

  String loadError(Object error) => _ar
      ? 'تعذر تحميل المؤسسات. $error'
      : _fr
          ? 'Impossible de charger les établissements. $error'
          : 'Unable to load schools. $error';
  String actionFailed(Object error) => _ar
      ? 'تعذر تنفيذ الإجراء: $error'
      : _fr
          ? 'Action impossible : $error'
          : 'Action failed: $error';
  String paymentFailed(Object error) => _ar
      ? 'تعذر تسجيل الدفع: $error'
      : _fr
          ? 'Paiement impossible : $error'
          : 'Payment failed: $error';
  String paymentTitle(String? schoolName) => _ar
      ? 'الدفع: ${schoolName ?? schoolFallback}'
      : _fr
          ? 'Paiement : ${schoolName ?? schoolFallback}'
          : 'Payment: ${schoolName ?? schoolFallback}';
  String userCount(int count) => _ar
      ? '$count مستخدم'
      : _fr
          ? '$count utilisateurs'
          : '$count users';
  String studentCount(int count) => _ar
      ? '$count طالب'
      : _fr
          ? '$count élèves'
          : '$count students';
  String classCount(int count) => _ar
      ? '$count قسم'
      : _fr
          ? '$count classes'
          : '$count classes';
  String expires(String value) => _ar
      ? 'ينتهي $value'
      : _fr
          ? 'Expire $value'
          : 'Expires $value';
  String schoolSummary(String name, bool isActive) => _ar
      ? '$name، ${isActive ? activeStatus : pendingStatus}'
      : _fr
          ? '$name, ${isActive ? activeStatus : pendingStatus}'
          : '$name, ${isActive ? activeStatus : pendingStatus}';
}
