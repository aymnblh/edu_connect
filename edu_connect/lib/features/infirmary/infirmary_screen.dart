import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/services/api_service.dart';
import '../../core/widgets/shimmer_loading.dart';
import '../auth/presentation/providers/auth_provider.dart';
import '../health/health_repository.dart';

class InfirmaryStudent {
  final String id;
  final String name;
  final String? code;
  final List<String> classes;
  final bool hasRecord;
  final String? alert;

  const InfirmaryStudent({
    required this.id,
    required this.name,
    required this.classes,
    required this.hasRecord,
    this.code,
    this.alert,
  });

  factory InfirmaryStudent.fromJson(Map<String, dynamic> json) =>
      InfirmaryStudent(
        id: json['student_id'] as String,
        name: json['student_name'] as String? ?? '',
        code: json['student_code'] as String?,
        classes: (json['classes'] as List<dynamic>? ?? const [])
            .map((e) => (e as Map<String, dynamic>)['name'] as String)
            .toList(),
        hasRecord: json['has_record'] as bool? ?? false,
        alert: json['alert'] as String?,
      );

  bool matches(String query) {
    final q = query.trim().toLowerCase();
    return q.isEmpty ||
        name.toLowerCase().contains(q) ||
        (code ?? '').toLowerCase().contains(q) ||
        classes.any((c) => c.toLowerCase().contains(q));
  }
}

final infirmaryStudentsProvider =
    FutureProvider.autoDispose<List<InfirmaryStudent>>((ref) async {
  final data = await ApiService.instance.get('/infirmary/students') as List;
  return data
      .map((e) => InfirmaryStudent.fromJson(e as Map<String, dynamic>))
      .toList();
});

/// The school nurse's mobile view: find a student and read their health sheet.
/// Sheets are created and edited from the web (with the parent's paper consent).
class InfirmaryScreen extends ConsumerStatefulWidget {
  const InfirmaryScreen({super.key});

  @override
  ConsumerState<InfirmaryScreen> createState() => _InfirmaryScreenState();
}

class _InfirmaryScreenState extends ConsumerState<InfirmaryScreen> {
  String _query = '';
  bool _onlyAlerts = false;

  @override
  Widget build(BuildContext context) {
    final text = _IText.of(context);
    return Scaffold(
      appBar: AppBar(
        title: Text(text.title),
        actions: [
          IconButton(
            tooltip: text.notifications,
            icon: const Icon(Icons.notifications_outlined),
            onPressed: () => context.push('/notifications'),
          ),
          IconButton(
            tooltip: text.profile,
            icon: const Icon(Icons.person_outline),
            onPressed: () => context.push('/profile'),
          ),
          IconButton(
            tooltip: text.signOut,
            icon: const Icon(Icons.logout),
            onPressed: () => ref.read(authNotifierProvider.notifier).signOut(),
          ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
            child: TextField(
              decoration: InputDecoration(
                prefixIcon: const Icon(Icons.search),
                hintText: text.search,
                border: const OutlineInputBorder(),
              ),
              onChanged: (value) => setState(() => _query = value),
            ),
          ),
          SwitchListTile(
            title: Text(text.onlyAlerts),
            value: _onlyAlerts,
            onChanged: (value) => setState(() => _onlyAlerts = value),
          ),
          Expanded(
            child: ref.watch(infirmaryStudentsProvider).when(
                  loading: () => const ShimmerList(showAvatar: false),
                  error: (e, _) => Center(child: Text('$e')),
                  data: (students) {
                    final visible = students
                        .where((s) => s.matches(_query))
                        .where((s) => !_onlyAlerts || s.alert != null)
                        .toList();
                    return RefreshIndicator(
                      onRefresh: () =>
                          ref.refresh(infirmaryStudentsProvider.future),
                      child: ListView.builder(
                        itemCount: visible.length,
                        itemBuilder: (context, i) {
                          final s = visible[i];
                          return ListTile(
                            leading: Icon(
                              s.alert != null
                                  ? Icons.warning_amber_rounded
                                  : s.hasRecord
                                      ? Icons.favorite_outline
                                      : Icons.person_outline,
                              color: s.alert != null
                                  ? Theme.of(context).colorScheme.error
                                  : null,
                            ),
                            title: Text(s.name),
                            subtitle: Text([
                              if (s.classes.isNotEmpty) s.classes.join(', '),
                              if (s.alert != null) s.alert!,
                              if (!s.hasRecord) text.noRecord,
                            ].join(' · ')),
                            onTap: s.hasRecord
                                ? () => _showRecord(context, s)
                                : null,
                          );
                        },
                      ),
                    );
                  },
                ),
          ),
        ],
      ),
    );
  }

  Future<void> _showRecord(BuildContext context, InfirmaryStudent student) {
    final text = _IText.of(context);
    return showModalBottomSheet<void>(
      context: context,
      useSafeArea: true,
      isScrollControlled: true,
      builder: (ctx) => FutureBuilder<HealthRecord>(
        future: HealthRepository().get(student.id),
        builder: (ctx, snapshot) {
          if (snapshot.hasError) {
            final error = snapshot.error;
            final detail = error is DioException && error.response?.data is Map
                ? (error.response!.data as Map)['detail']
                : null;
            return Padding(
              padding: const EdgeInsets.all(24),
              child: Text(detail is String ? detail : '$error'),
            );
          }
          if (!snapshot.hasData) {
            return const Padding(
              padding: EdgeInsets.all(32),
              child: Center(child: CircularProgressIndicator()),
            );
          }
          final r = snapshot.data!;
          Widget row(String label, String? value) => value == null ||
                  value.isEmpty
              ? const SizedBox.shrink()
              : Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(label, style: Theme.of(ctx).textTheme.labelMedium),
                      Text(value),
                    ],
                  ),
                );
          return DraggableScrollableSheet(
            expand: false,
            initialChildSize: 0.75,
            builder: (ctx, controller) => ListView(
              controller: controller,
              padding: const EdgeInsets.all(20),
              children: [
                Text(student.name, style: Theme.of(ctx).textTheme.titleLarge),
                const SizedBox(height: 12),
                row(text.alert, r.teacherAlert),
                row(text.allergies, r.allergies),
                row(text.conditions, r.conditions),
                row(text.medications, r.medications),
                row(text.bloodGroup, r.bloodGroup),
                row(text.instructions, r.instructions),
                row(
                    text.doctor,
                    [r.doctorName, r.doctorPhone]
                        .whereType<String>()
                        .join(' — ')),
                Text(text.contacts, style: Theme.of(ctx).textTheme.labelMedium),
                for (final c in r.contacts)
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: const Icon(Icons.phone_outlined),
                    title: Text(c.name),
                    subtitle: Text('${c.relationship} · ${c.phone}'),
                  ),
                const SizedBox(height: 8),
                Text(text.editOnWeb, style: Theme.of(ctx).textTheme.bodySmall),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _IText {
  final String code;
  const _IText(this.code);

  static _IText of(BuildContext context) =>
      _IText(Localizations.localeOf(context).languageCode);

  String pick(String ar, String fr, String en) =>
      code == 'ar' ? ar : (code == 'fr' ? fr : en);

  String get title => pick('التمريض', 'Infirmerie', 'Infirmary');
  String get search => pick('بحث عن تلميذ أو قسم',
      'Rechercher un eleve ou une classe', 'Search a student or class');
  String get onlyAlerts => pick('فقط التلاميذ الذين لديهم تنبيه',
      'Seulement les eleves avec une alerte', 'Only students with an alert');
  String get noRecord => pick('لا توجد بطاقة', 'Pas de fiche', 'No sheet');
  String get notifications =>
      pick('الإشعارات', 'Notifications', 'Notifications');
  String get profile => pick('الملف الشخصي', 'Profil', 'Profile');
  String get signOut => pick('خروج', 'Deconnexion', 'Sign out');
  String get alert => pick('تنبيه', 'Alerte', 'Alert');
  String get allergies => pick('الحساسية', 'Allergies', 'Allergies');
  String get conditions => pick('الأمراض', 'Maladies', 'Conditions');
  String get medications => pick('العلاج', 'Traitement', 'Medication');
  String get bloodGroup => pick('فصيلة الدم', 'Groupe sanguin', 'Blood group');
  String get instructions =>
      pick('ما يجب فعله', 'Conduite a tenir', 'What to do');
  String get doctor => pick('الطبيب', 'Medecin', 'Doctor');
  String get contacts => pick(
      'جهات الاتصال في الطوارئ', "Contacts d'urgence", 'Emergency contacts');
  String get editOnWeb => pick(
      'تُنشأ البطاقات وتُعدَّل من نسخة الويب.',
      'Les fiches se creent et se modifient depuis la version web.',
      'Sheets are created and edited from the web version.');
}
