import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/shimmer_loading.dart';
import '../../auth/data/models/user_model.dart';
import '../../auth/presentation/providers/auth_provider.dart';
import '../../class/data/models/class_model.dart';
import '../../class/presentation/providers/class_provider.dart';
import '../data/announcement_repository.dart';

const _categories = [
  'announcement',
  'holiday',
  'exam_period',
  'meeting',
  'event'
];

class AnnouncementsScreen extends ConsumerWidget {
  const AnnouncementsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final text = _AnnText.of(context);
    final user = ref.watch(authNotifierProvider).valueOrNull;
    final announcementsAsync = ref.watch(announcementsProvider);
    final classes =
        ref.watch(userClassesProvider).valueOrNull ?? const <ClassModel>[];
    final classNames = {for (final c in classes) c.id: c.name};
    final isSchoolAdmin = user != null &&
        (user.role == UserRole.principal || user.role == UserRole.secretary);
    final canCreate =
        isSchoolAdmin || (user?.isTeacher == true && classes.isNotEmpty);

    return Scaffold(
      appBar: AppBar(
        title: Text(text.title),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: text.refresh,
            onPressed: () => ref.invalidate(announcementsProvider),
          ),
        ],
      ),
      floatingActionButton: canCreate
          ? FloatingActionButton.extended(
              icon: const Icon(Icons.campaign_outlined),
              label: Text(text.newShort),
              onPressed: () => showModalBottomSheet<void>(
                context: context,
                useSafeArea: true,
                isScrollControlled: true,
                builder: (_) => _CreateAnnouncementSheet(
                  classes: classes,
                  allowWholeSchool: isSchoolAdmin,
                ),
              ),
            )
          : null,
      body: announcementsAsync.when(
        loading: () => const ShimmerList(showAvatar: false),
        error: (e, _) => Center(child: Text(text.loadError(e))),
        data: (items) {
          final today = DateTime.now();
          final todayDay = DateTime(today.year, today.month, today.day);
          final upcoming = items
              .where((a) =>
                  a.startsOn != null &&
                  !(a.endsOn ?? a.startsOn!).isBefore(todayDay))
              .toList()
            ..sort((a, b) => a.startsOn!.compareTo(b.startsOn!));

          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(announcementsProvider),
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 96),
              children: [
                _SectionTitle(text.upcoming),
                if (upcoming.isEmpty)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Text(text.noUpcoming,
                        style: TextStyle(color: context.appColors.mutedText)),
                  ),
                for (final a in upcoming.take(8))
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: Icon(_categoryIcon(a.category),
                        color: context.appColors.tealDark),
                    title: Text(a.title,
                        style: const TextStyle(fontWeight: FontWeight.w700)),
                    subtitle: Text(text.dateLabel(context, a)),
                  ),
                const SizedBox(height: 12),
                _SectionTitle(text.all),
                if (items.isEmpty)
                  Text(text.empty,
                      style: TextStyle(color: context.appColors.mutedText)),
                for (final a in items)
                  _AnnouncementCard(
                    key: PageStorageKey('announcement-${a.id}'),
                    announcement: a,
                    audience: a.wholeSchool
                        ? text.wholeSchool
                        : a.classIds
                            .map((id) => classNames[id] ?? text.classFallback)
                            .join(', '),
                  ),
              ],
            ),
          );
        },
      ),
    );
  }
}

IconData _categoryIcon(String category) => switch (category) {
      'holiday' => Icons.beach_access_outlined,
      'exam_period' => Icons.assignment_outlined,
      'meeting' => Icons.groups_outlined,
      'event' => Icons.celebration_outlined,
      _ => Icons.campaign_outlined,
    };

String _serverMessage(Object error) {
  if (error is DioException) {
    final detail = error.response?.data is Map
        ? (error.response!.data as Map)['detail']
        : null;
    if (detail is String) return detail;
    if (detail is List && detail.isNotEmpty && detail.first is Map) {
      final msg = (detail.first as Map)['msg'];
      if (msg is String) return msg.replaceFirst('Value error, ', '');
    }
  }
  return '$error';
}

class _SectionTitle extends StatelessWidget {
  final String label;
  const _SectionTitle(this.label);

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: Text(label,
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900)),
      );
}

class _AnnouncementCard extends ConsumerWidget {
  final AnnouncementModel announcement;
  final String audience;

  const _AnnouncementCard(
      {super.key, required this.announcement, required this.audience});

  Future<void> _delete(BuildContext context, WidgetRef ref) async {
    final text = _AnnText.of(context);
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(text.delete),
        content: Text(text.deleteConfirm),
        actions: [
          TextButton(
              onPressed: () => Navigator.of(ctx).pop(false),
              child: Text(text.cancel)),
          TextButton(
              onPressed: () => Navigator.of(ctx).pop(true),
              child: Text(text.delete)),
        ],
      ),
    );
    if (confirm != true || !context.mounted) return;
    try {
      await ref.read(announcementRepositoryProvider).delete(announcement.id);
      ref.invalidate(announcementsProvider);
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(text.actionFailed(_serverMessage(e)))));
      }
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final text = _AnnText.of(context);
    final colors = context.appColors;
    final a = announcement;
    final meta = [
      if (a.startsOn != null) text.dateLabel(context, a),
      audience,
      if (a.authorName != null) text.by(a.authorName!),
      if (a.canManage) text.readBy(a.readCount ?? 0, a.recipientCount ?? 0),
    ].join(' · ');

    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(10),
        side: BorderSide(
          color: a.isRead ? colors.cardBorder : colors.tealDark,
          width: a.isRead ? 1 : 1.5,
        ),
      ),
      child: ExpansionTile(
        leading: Icon(_categoryIcon(a.category), color: colors.tealDark),
        title: Text(a.title,
            style: TextStyle(
                fontWeight: a.isRead ? FontWeight.w600 : FontWeight.w900)),
        subtitle: Text(
          '${text.category(a.category)} · $meta',
          style: TextStyle(color: colors.mutedText, fontSize: 12),
        ),
        onExpansionChanged: (expanded) async {
          if (!expanded || a.isRead) return;
          try {
            await ref.read(announcementRepositoryProvider).markRead(a.id);
            ref.invalidate(announcementsProvider);
          } catch (_) {
            // Read receipts are best effort; the content is already shown.
          }
        },
        childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
        expandedCrossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(a.body, style: const TextStyle(height: 1.4)),
          if (a.canManage)
            Align(
              alignment: AlignmentDirectional.centerEnd,
              child: TextButton.icon(
                onPressed: () => _delete(context, ref),
                style: TextButton.styleFrom(
                    foregroundColor: Theme.of(context).colorScheme.error),
                icon: const Icon(Icons.delete_outline, size: 18),
                label: Text(text.delete),
              ),
            ),
        ],
      ),
    );
  }
}

class _CreateAnnouncementSheet extends ConsumerStatefulWidget {
  final List<ClassModel> classes;
  final bool allowWholeSchool;

  const _CreateAnnouncementSheet(
      {required this.classes, required this.allowWholeSchool});

  @override
  ConsumerState<_CreateAnnouncementSheet> createState() =>
      _CreateAnnouncementSheetState();
}

class _CreateAnnouncementSheetState
    extends ConsumerState<_CreateAnnouncementSheet> {
  final _formKey = GlobalKey<FormState>();
  final _titleCtrl = TextEditingController();
  final _bodyCtrl = TextEditingController();
  String _category = 'announcement';
  DateTime? _startsOn;
  DateTime? _endsOn;
  bool _wholeSchool = false;
  final Set<String> _classIds = {};
  bool _saving = false;
  String? _error;

  @override
  void dispose() {
    _titleCtrl.dispose();
    _bodyCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickDate({required bool start}) async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: (start ? _startsOn : _endsOn) ?? _startsOn ?? now,
      firstDate: start ? DateTime(now.year - 1) : (_startsOn ?? now),
      lastDate: DateTime(now.year + 2),
    );
    if (picked == null) return;
    setState(() {
      if (start) {
        _startsOn = picked;
        if (_endsOn != null && _endsOn!.isBefore(picked)) _endsOn = null;
      } else {
        _endsOn = picked;
      }
    });
  }

  Future<void> _submit() async {
    final text = _AnnText.of(context);
    if (!_formKey.currentState!.validate()) return;
    if (_category != 'announcement' && _startsOn == null) {
      setState(() => _error = text.dateRequired);
      return;
    }
    if (!_wholeSchool && _classIds.isEmpty) {
      setState(() => _error = text.audienceRequired);
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await ref.read(announcementRepositoryProvider).create(
            title: _titleCtrl.text.trim(),
            body: _bodyCtrl.text.trim(),
            category: _category,
            startsOn: _startsOn,
            endsOn: _endsOn,
            wholeSchool: _wholeSchool,
            classIds: _classIds.toList(),
          );
      ref.invalidate(announcementsProvider);
      if (mounted) Navigator.of(context).pop();
    } catch (e) {
      setState(() => _error = text.actionFailed(_serverMessage(e)));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final text = _AnnText.of(context);
    final dateFormat = DateFormat(
        'dd/MM/yyyy', Localizations.localeOf(context).toLanguageTag());
    return Padding(
      padding: EdgeInsets.fromLTRB(
          20, 16, 20, MediaQuery.of(context).viewInsets.bottom + 20),
      child: Form(
        key: _formKey,
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(text.newTitle,
                  style: const TextStyle(
                      fontSize: 18, fontWeight: FontWeight.w900)),
              const SizedBox(height: 16),
              TextFormField(
                controller: _titleCtrl,
                maxLength: 200,
                decoration: InputDecoration(labelText: text.titleLabel),
                validator: (v) =>
                    (v == null || v.trim().isEmpty) ? text.required : null,
              ),
              TextFormField(
                controller: _bodyCtrl,
                minLines: 3,
                maxLines: 6,
                maxLength: 5000,
                decoration: InputDecoration(labelText: text.bodyLabel),
                validator: (v) =>
                    (v == null || v.trim().isEmpty) ? text.required : null,
              ),
              DropdownButtonFormField<String>(
                initialValue: _category,
                decoration: InputDecoration(labelText: text.typeLabel),
                items: [
                  for (final c in _categories)
                    DropdownMenuItem(value: c, child: Text(text.category(c))),
                ],
                onChanged: (v) => setState(() => _category = v ?? _category),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => _pickDate(start: true),
                      icon: const Icon(Icons.event_outlined),
                      label: Text(_startsOn == null
                          ? text.pickDate
                          : dateFormat.format(_startsOn!)),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _startsOn == null
                          ? null
                          : () => _pickDate(start: false),
                      icon: const Icon(Icons.event_available_outlined),
                      label: Text(_endsOn == null
                          ? text.pickEndDate
                          : dateFormat.format(_endsOn!)),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(text.audience,
                  style: const TextStyle(fontWeight: FontWeight.w700)),
              if (widget.allowWholeSchool)
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text(text.wholeSchool),
                  value: _wholeSchool,
                  onChanged: (v) => setState(() => _wholeSchool = v),
                ),
              if (!_wholeSchool)
                for (final cls in widget.classes)
                  CheckboxListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text(cls.name),
                    value: _classIds.contains(cls.id),
                    onChanged: (v) => setState(() => v == true
                        ? _classIds.add(cls.id)
                        : _classIds.remove(cls.id)),
                  ),
              if (_error != null) ...[
                const SizedBox(height: 8),
                Text(_error!,
                    style:
                        TextStyle(color: Theme.of(context).colorScheme.error)),
              ],
              const SizedBox(height: 12),
              ElevatedButton.icon(
                onPressed: _saving ? null : _submit,
                icon: _saving
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2))
                    : const Icon(Icons.campaign_outlined),
                label: Text(text.publish),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _AnnText {
  final String languageCode;
  const _AnnText(this.languageCode);

  static _AnnText of(BuildContext context) =>
      _AnnText(Localizations.localeOf(context).languageCode);

  String pick(String ar, String fr, String en) =>
      languageCode == 'ar' ? ar : (languageCode == 'fr' ? fr : en);

  String get title =>
      pick('الإعلانات والتقويم', 'Annonces et calendrier', 'Announcements');
  String get refresh => pick('تحديث', 'Actualiser', 'Refresh');
  String get newShort => pick('إعلان', 'Annonce', 'Announce');
  String get newTitle =>
      pick('إعلان جديد', 'Nouvelle annonce', 'New announcement');
  String get upcoming => pick('القادم', 'A venir', 'Coming up');
  String get noUpcoming => pick('لا توجد أحداث قادمة.',
      'Aucun evenement a venir.', 'No upcoming events.');
  String get all =>
      pick('كل الإعلانات', 'Toutes les annonces', 'All announcements');
  String get empty => pick('لا توجد إعلانات حاليا.',
      'Aucune annonce pour le moment.', 'No announcements yet.');
  String get wholeSchool => pick('كل المؤسسة', "Toute l'ecole", 'Whole school');
  String get classFallback => pick('قسم', 'Classe', 'Class');
  String get delete => pick('حذف', 'Supprimer', 'Delete');
  String get cancel => pick('إلغاء', 'Annuler', 'Cancel');
  String get deleteConfirm => pick(
      'حذف هذا الإعلان لجميع المستلمين؟',
      'Supprimer cette annonce pour tous les destinataires ?',
      'Delete this announcement for all recipients?');
  String get titleLabel => pick('العنوان', 'Titre', 'Title');
  String get bodyLabel => pick('الرسالة', 'Message', 'Message');
  String get typeLabel => pick('النوع', 'Type', 'Type');
  String get required => pick('حقل مطلوب', 'Champ requis', 'Required');
  String get pickDate => pick('التاريخ', 'Date', 'Date');
  String get pickEndDate =>
      pick('إلى غاية (اختياري)', "Jusqu'au (optionnel)", 'Until (optional)');
  String get audience => pick('المستلمون', 'Destinataires', 'Recipients');
  String get publish =>
      pick('نشر وإشعار', 'Publier et notifier', 'Publish and notify');
  String get dateRequired => pick(
      'اختر تاريخا لحدث التقويم.',
      'Choisissez une date pour un evenement du calendrier.',
      'Choose a date for a calendar event.');
  String get audienceRequired => pick(
      'اختر قسما واحدا على الأقل أو كل المؤسسة.',
      "Choisissez au moins une classe ou toute l'ecole.",
      'Choose at least one class or the whole school.');
  String loadError(Object e) => pick(
      'تعذر تحميل الإعلانات: $e',
      'Impossible de charger les annonces : $e',
      'Could not load announcements: $e');
  String actionFailed(Object e) => pick('تعذر تنفيذ العملية: $e',
      'Operation impossible : $e', 'Action failed: $e');
  String by(String name) => pick('بواسطة $name', 'Par $name', 'By $name');
  String readBy(int read, int total) =>
      pick('قرأه $read/$total', 'Lu par $read/$total', 'Read by $read/$total');

  String category(String value) => switch (value) {
        'holiday' => pick('عطلة', 'Vacances', 'Holiday'),
        'exam_period' => pick('امتحانات', 'Examens', 'Exams'),
        'meeting' => pick('اجتماع', 'Reunion', 'Meeting'),
        'event' => pick('حدث', 'Evenement', 'Event'),
        _ => pick('إعلان', 'Annonce', 'Announcement'),
      };

  String dateLabel(BuildContext context, AnnouncementModel a) {
    final format = DateFormat(
        'd MMM yyyy', Localizations.localeOf(context).toLanguageTag());
    final start = format.format(a.startsOn!);
    if (a.endsOn == null || a.endsOn == a.startsOn) return start;
    final end = format.format(a.endsOn!);
    return pick(
        'من $start إلى $end', 'Du $start au $end', 'From $start to $end');
  }
}
