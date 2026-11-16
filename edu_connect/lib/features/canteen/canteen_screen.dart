import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/services/api_service.dart';
import '../../core/widgets/shimmer_loading.dart';
import '../auth/presentation/providers/auth_provider.dart';

/// School canteen screen:
/// - For `canteen` / `principal` / `secretary`: daily headcount (with diets & short alerts) and weekly menus.
/// - For `parent`: each child's registration and the published weekly menu.
class CanteenScreen extends ConsumerStatefulWidget {
  const CanteenScreen({super.key});

  @override
  ConsumerState<CanteenScreen> createState() => _CanteenScreenState();
}

class _CanteenScreenState extends ConsumerState<CanteenScreen> {
  int _tabIndex = 0;
  late Future<Map<String, dynamic>> _future;

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  Future<Map<String, dynamic>> _load() async {
    final user = ref.read(authNotifierProvider).valueOrNull;
    if (user?.isParent ?? false) {
      final data = await ApiService.instance.get('/canteen/my');
      return Map<String, dynamic>.from(data as Map);
    }
    final headcount = await ApiService.instance.get('/canteen/headcount');
    final menus = await ApiService.instance.get('/canteen/menus');
    return {
      'headcount': Map<String, dynamic>.from(headcount as Map),
      'menus': Map<String, dynamic>.from(menus as Map),
    };
  }

  void _reload() {
    setState(() {
      _future = _load();
    });
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authNotifierProvider).valueOrNull;
    final text = _CText.of(context);
    final isStandaloneRole = user?.isCanteen ?? false;
    final isParent = user?.isParent ?? false;

    return Scaffold(
      appBar: AppBar(
        title: Text(text.title),
        actions: [
          if (isStandaloneRole) ...[
            IconButton(
              icon: const Icon(Icons.notifications_outlined),
              onPressed: () => context.push('/notifications'),
            ),
            IconButton(
              icon: const Icon(Icons.person_outline),
              onPressed: () => context.push('/profile'),
            ),
            IconButton(
              icon: const Icon(Icons.logout),
              onPressed: () => ref.read(authNotifierProvider.notifier).signOut(),
            ),
          ] else
            IconButton(
              icon: const Icon(Icons.refresh),
              onPressed: _reload,
            ),
        ],
      ),
      body: FutureBuilder<Map<String, dynamic>>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const ShimmerList(showAvatar: false);
          }
          if (snapshot.hasError) {
            final err = snapshot.error;
            final detail = err is DioException && err.response?.data is Map
                ? (err.response!.data as Map)['detail']
                : null;
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Text(detail is String ? detail : '$err'),
              ),
            );
          }
          final data = snapshot.data ?? {};
          if (isParent) {
            return _buildParentView(context, data, text);
          }
          return _buildStaffView(context, data, text);
        },
      ),
    );
  }

  Widget _buildStaffView(
    BuildContext context,
    Map<String, dynamic> data,
    _CText text,
  ) {
    final headcount = Map<String, dynamic>.from(data['headcount'] as Map? ?? {});
    final menus = Map<String, dynamic>.from(data['menus'] as Map? ?? {});
    final days = (menus['days'] as List<dynamic>? ?? const []);
    final byClass = (headcount['by_class'] as List<dynamic>? ?? const []);
    final students = (headcount['students'] as List<dynamic>? ?? const []);

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
          child: SegmentedButton<int>(
            segments: [
              ButtonSegment(value: 0, label: Text(text.headcount)),
              ButtonSegment(value: 1, label: Text(text.menus)),
            ],
            selected: {_tabIndex},
            onSelectionChanged: (s) => setState(() => _tabIndex = s.first),
          ),
        ),
        Expanded(
          child: RefreshIndicator(
            onRefresh: () async => _reload(),
            child: _tabIndex == 0
                ? ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      Card(
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceAround,
                            children: [
                              _Metric(
                                label: text.expected,
                                value: '${headcount['total'] ?? 0}',
                              ),
                              _Metric(
                                label: text.absent,
                                value: '${headcount['absent'] ?? 0}',
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
                      for (final clsRaw in byClass)
                        Builder(builder: (context) {
                          final cls = Map<String, dynamic>.from(clsRaw as Map);
                          return ListTile(
                            title: Text('${cls['class_name'] ?? '-'}'),
                            subtitle: Text(
                              (cls['attendance_taken'] as bool? ?? false)
                                  ? text.rollTaken
                                  : text.rollPending,
                            ),
                            trailing: Text(
                              '${cls['expected'] ?? 0}',
                              style: Theme.of(context).textTheme.titleMedium,
                            ),
                          );
                        }),
                      const Divider(height: 24),
                      for (final sRaw in students)
                        Builder(builder: (context) {
                          final s = Map<String, dynamic>.from(sRaw as Map);
                          final alert = s['alert'] as String?;
                          return ListTile(
                            leading: Icon(
                              alert != null
                                  ? Icons.warning_amber_rounded
                                  : Icons.restaurant_outlined,
                              color: alert != null
                                  ? Theme.of(context).colorScheme.error
                                  : null,
                            ),
                            title: Text('${s['student_name'] ?? ''}'),
                            subtitle: Text([
                              '${s['class_name'] ?? ''}',
                              if (s['diet'] != null && s['diet'] != 'none')
                                '${s['diet']}',
                              if (alert != null) alert,
                            ].join(' · ')),
                          );
                        }),
                    ],
                  )
                : _menuListView(days, text),
          ),
        ),
      ],
    );
  }

  Widget _buildParentView(
    BuildContext context,
    Map<String, dynamic> data,
    _CText text,
  ) {
    final children = (data['children'] as List<dynamic>? ?? const []);
    final days = (data['days'] as List<dynamic>? ?? const []);
    return RefreshIndicator(
      onRefresh: () async => _reload(),
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          for (final cRaw in children)
            Builder(builder: (context) {
              final c = Map<String, dynamic>.from(cRaw as Map);
              final enr = c['enrollment'] as Map<String, dynamic>?;
              return Card(
                margin: const EdgeInsets.only(bottom: 12),
                child: ListTile(
                  leading: const Icon(Icons.restaurant_menu_outlined),
                  title: Text('${c['student_name'] ?? ''}'),
                  subtitle: Text(
                    enr == null
                        ? text.notEnrolled
                        : '${enr['plan'] == 'monthly' ? text.monthlyPlan : text.daysPlan} · ${enr['diet'] ?? 'none'}',
                  ),
                ),
              );
            }),
          const SizedBox(height: 8),
          Text(text.menus, style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          ..._menuCards(days, text),
        ],
      ),
    );
  }

  Widget _menuListView(List<dynamic> days, _CText text) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: _menuCards(days, text),
    );
  }

  List<Widget> _menuCards(List<dynamic> days, _CText text) {
    return days.map((raw) {
      final item = Map<String, dynamic>.from(raw as Map);
      final menu = item['menu'] as Map<String, dynamic>?;
      final allergens = (menu?['allergens'] as List<dynamic>? ?? const []).join(', ');
      return Card(
        margin: const EdgeInsets.only(bottom: 10),
        child: ListTile(
          title: Text('${item['day']}'),
          subtitle: menu == null
              ? Text(text.notPublished)
              : Text([
                  if (menu['starter'] != null) '${menu['starter']}',
                  '${menu['main']}',
                  if (menu['dessert'] != null) '${menu['dessert']}',
                  if (allergens.isNotEmpty) '${text.allergens}: $allergens',
                ].join(' · ')),
        ),
      );
    }).toList();
  }
}

class _Metric extends StatelessWidget {
  final String label;
  final String value;
  const _Metric({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(value, style: Theme.of(context).textTheme.headlineSmall),
        Text(label, style: Theme.of(context).textTheme.bodySmall),
      ],
    );
  }
}

class _CText {
  final String code;
  const _CText(this.code);
  static _CText of(BuildContext context) =>
      _CText(Localizations.localeOf(context).languageCode);
  String pick(String ar, String fr, String en) =>
      code == 'ar' ? ar : (code == 'fr' ? fr : en);

  String get title => pick('المطعم المدرسي', 'Cantine', 'Canteen');
  String get headcount => pick('عدد اليوم', 'Effectif du jour', 'Headcount');
  String get menus => pick('قائمة الأسبوع', 'Menu semaine', 'Weekly menu');
  String get expected => pick('وجبات متوقعة', 'Repas prevus', 'Expected meals');
  String get absent => pick('غائبون مخصومون', 'Absents deduits', 'Absent deducted');
  String get rollTaken => pick('تمت المناداة', 'Appel fait', 'Roll taken');
  String get rollPending => pick('في انتظار المناداة', 'Appel non fait', 'Roll pending');
  String get notEnrolled => pick('غير مسجل', 'Non inscrit', 'Not enrolled');
  String get monthlyPlan => pick('اشتراك شهري', 'Forfait mensuel', 'Monthly plan');
  String get daysPlan => pick('أيام محددة', 'Jours choisis', 'Selected days');
  String get notPublished => pick('غير منشور', 'Menu non publie', 'Not published');
  String get allergens => pick('مسببات الحساسية', 'Allergenes', 'Allergens');
}
