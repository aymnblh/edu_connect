import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/child_switcher_bar.dart';
import '../../../core/widgets/shimmer_loading.dart';
import '../../auth/presentation/providers/auth_provider.dart';
import '../../auth/presentation/providers/children_provider.dart';
import '../../class/data/models/class_model.dart';
import '../../class/presentation/providers/class_provider.dart';
import '../data/meeting_repository.dart';

String _message(Object error) {
  if (error is DioException && error.response?.data is Map) {
    final detail = (error.response!.data as Map)['detail'];
    if (detail is String) return detail;
    if (detail is List && detail.isNotEmpty && detail.first is Map) {
      final msg = (detail.first as Map)['msg'];
      if (msg is String) return msg.replaceFirst('Value error, ', '');
    }
  }
  return '$error';
}

void _snack(BuildContext context, String text) {
  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(text)));
}

Future<bool> _confirm(BuildContext context, String body) async {
  final text = _MtText.of(context);
  final ok = await showDialog<bool>(
    context: context,
    builder: (ctx) => AlertDialog(
      content: Text(body),
      actions: [
        TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: Text(text.back)),
        TextButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            child: Text(text.confirm)),
      ],
    ),
  );
  return ok == true;
}

class MeetingsScreen extends ConsumerWidget {
  const MeetingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final text = _MtText.of(context);
    final user = ref.watch(authNotifierProvider).valueOrNull;
    final isTeacher = user?.isTeacher == true;
    final classes =
        ref.watch(userClassesProvider).valueOrNull ?? const <ClassModel>[];

    return Scaffold(
      appBar: AppBar(
        title: Text(text.title),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.invalidate(meetingSlotsProvider),
          ),
        ],
      ),
      floatingActionButton: isTeacher
          ? FloatingActionButton.extended(
              icon: const Icon(Icons.add),
              label: Text(text.open),
              onPressed: () => showModalBottomSheet<void>(
                context: context,
                useSafeArea: true,
                isScrollControlled: true,
                builder: (_) => _OpenSlotsSheet(classes: classes),
              ),
            )
          : null,
      body: Column(
        children: [
          if (!isTeacher) const ChildSwitcherBar(),
          Expanded(
            child: ref.watch(meetingSlotsProvider).when(
                  loading: () => const ShimmerList(showAvatar: false),
                  error: (e, _) => Center(child: Text(_message(e))),
                  data: (slots) => RefreshIndicator(
                    onRefresh: () async => ref.invalidate(meetingSlotsProvider),
                    child: isTeacher
                        ? _TeacherList(slots: slots)
                        : _ParentList(slots: slots),
                  ),
                ),
          ),
        ],
      ),
    );
  }
}

String _day(BuildContext context, DateTime utc) => DateFormat(
      'EEEE d MMMM',
      Localizations.localeOf(context).toLanguageTag(),
    ).format(toSchoolTime(utc));

String _time(DateTime utc) => DateFormat('HH:mm').format(toSchoolTime(utc));

class _TeacherList extends ConsumerWidget {
  final List<MeetingSlotModel> slots;
  const _TeacherList({required this.slots});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final text = _MtText.of(context);
    final repo = ref.read(meetingRepositoryProvider);
    if (slots.isEmpty) {
      return ListView(children: [
        Padding(
            padding: const EdgeInsets.all(24),
            child: Text(text.noSlots, textAlign: TextAlign.center)),
      ]);
    }
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 96),
      children: [
        for (final slot in slots)
          Card(
            child: ListTile(
              leading: Icon(
                slot.isBooked ? Icons.event_busy : Icons.event_available,
                color: slot.isBooked
                    ? context.appColors.tealDark
                    : context.appColors.mutedText,
              ),
              title: Text(
                  '${_day(context, slot.startsAt)} · ${_time(slot.startsAt)}'),
              subtitle: Text([
                slot.isBooked
                    ? text.bookedBy(
                        slot.parentName ?? '', slot.studentName ?? '')
                    : text.free,
                if (slot.note != null) '“${slot.note}”',
                if (slot.location != null) slot.location!,
              ].join('\n')),
              isThreeLine: slot.isBooked,
              trailing: PopupMenuButton<String>(
                onSelected: (action) async {
                  final body =
                      action == 'free' ? text.freeConfirm : text.deleteConfirm;
                  if (!await _confirm(context, body)) return;
                  try {
                    if (action == 'free') {
                      await repo.cancel(slot.id);
                    } else {
                      await repo.delete(slot.id);
                    }
                    ref.invalidate(meetingSlotsProvider);
                  } catch (e) {
                    if (context.mounted) _snack(context, _message(e));
                  }
                },
                itemBuilder: (_) => [
                  if (slot.isBooked)
                    PopupMenuItem(value: 'free', child: Text(text.freeSlot)),
                  PopupMenuItem(value: 'delete', child: Text(text.delete)),
                ],
              ),
            ),
          ),
      ],
    );
  }
}

class _ParentList extends ConsumerWidget {
  final List<MeetingSlotModel> slots;
  const _ParentList({required this.slots});

  Future<void> _book(BuildContext context, WidgetRef ref, MeetingSlotModel slot,
      String studentId) async {
    final text = _MtText.of(context);
    final noteCtrl = TextEditingController();
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(
            '${slot.teacherName ?? ''} · ${_day(context, slot.startsAt)} ${_time(slot.startsAt)}'),
        content: TextField(
          controller: noteCtrl,
          maxLength: 500,
          decoration: InputDecoration(labelText: text.topic),
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.of(ctx).pop(false),
              child: Text(text.back)),
          FilledButton(
              onPressed: () => Navigator.of(ctx).pop(true),
              child: Text(text.book)),
        ],
      ),
    );
    final note = noteCtrl.text.trim();
    noteCtrl.dispose();
    if (ok != true || !context.mounted) return;
    try {
      await ref.read(meetingRepositoryProvider).book(slot.id,
          studentId: studentId, note: note.isEmpty ? null : note);
      if (context.mounted) _snack(context, text.booked);
    } catch (e) {
      if (context.mounted) _snack(context, _message(e));
    } finally {
      ref.invalidate(meetingSlotsProvider);
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final text = _MtText.of(context);
    final child = ref.watch(selectedChildProvider);
    if (child == null) return const ShimmerList(showAvatar: false);

    final mine =
        slots.where((s) => s.bookedByMe && s.studentId == child.id).toList();
    final free = slots.where((s) => !s.isBooked).toList();
    final byTeacher = <String, List<MeetingSlotModel>>{};
    for (final slot in free) {
      byTeacher
          .putIfAbsent(slot.teacherName ?? slot.teacherId, () => [])
          .add(slot);
    }

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text(text.myMeetings,
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900)),
        if (mine.isEmpty)
          Padding(
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: Text(text.noBooking,
                  style: TextStyle(color: context.appColors.mutedText))),
        for (final slot in mine)
          Card(
            child: ListTile(
              leading: Icon(Icons.event, color: context.appColors.tealDark),
              title: Text(slot.teacherName ?? ''),
              subtitle: Text([
                '${_day(context, slot.startsAt)} · ${_time(slot.startsAt)}',
                if (slot.location != null) slot.location!,
              ].join('\n')),
              trailing: TextButton(
                onPressed: () async {
                  if (!await _confirm(context, text.cancelConfirm)) return;
                  try {
                    await ref.read(meetingRepositoryProvider).cancel(slot.id);
                  } catch (e) {
                    if (context.mounted) _snack(context, _message(e));
                  }
                  ref.invalidate(meetingSlotsProvider);
                },
                child: Text(text.cancel),
              ),
            ),
          ),
        const SizedBox(height: 16),
        Text(text.available,
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900)),
        if (byTeacher.isEmpty)
          Padding(
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: Text(text.noneAvailable,
                  style: TextStyle(color: context.appColors.mutedText))),
        for (final entry in byTeacher.entries)
          Card(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(entry.key,
                      style: const TextStyle(fontWeight: FontWeight.w800)),
                  for (final dayEntry
                      in _groupByDay(context, entry.value).entries) ...[
                    const SizedBox(height: 8),
                    Text(dayEntry.key,
                        style: TextStyle(color: context.appColors.mutedText)),
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: [
                        for (final slot in dayEntry.value)
                          ActionChip(
                            label: Text(_time(slot.startsAt)),
                            onPressed: () =>
                                _book(context, ref, slot, child.id),
                          ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
          ),
      ],
    );
  }

  Map<String, List<MeetingSlotModel>> _groupByDay(
      BuildContext context, List<MeetingSlotModel> slots) {
    final groups = <String, List<MeetingSlotModel>>{};
    for (final slot in slots) {
      groups.putIfAbsent(_day(context, slot.startsAt), () => []).add(slot);
    }
    return groups;
  }
}

class _OpenSlotsSheet extends ConsumerStatefulWidget {
  final List<ClassModel> classes;
  const _OpenSlotsSheet({required this.classes});

  @override
  ConsumerState<_OpenSlotsSheet> createState() => _OpenSlotsSheetState();
}

class _OpenSlotsSheetState extends ConsumerState<_OpenSlotsSheet> {
  DateTime _day = DateTime.now().add(const Duration(days: 1));
  TimeOfDay _start = const TimeOfDay(hour: 16, minute: 0);
  TimeOfDay _end = const TimeOfDay(hour: 18, minute: 0);
  int _minutes = 15;
  String? _classId;
  final _locationCtrl = TextEditingController();
  bool _saving = false;

  @override
  void dispose() {
    _locationCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final text = _MtText.of(context);
    setState(() => _saving = true);
    try {
      final count = await ref.read(meetingRepositoryProvider).open(
            day: _day,
            startMinutes: _start.hour * 60 + _start.minute,
            endMinutes: _end.hour * 60 + _end.minute,
            slotMinutes: _minutes,
            location: _locationCtrl.text.trim().isEmpty
                ? null
                : _locationCtrl.text.trim(),
            classId: _classId,
          );
      ref.invalidate(meetingSlotsProvider);
      if (mounted) {
        Navigator.of(context).pop();
        _snack(context, text.created(count));
      }
    } catch (e) {
      if (mounted) _snack(context, _message(e));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final text = _MtText.of(context);
    final dayLabel = DateFormat(
            'EEEE d MMMM', Localizations.localeOf(context).toLanguageTag())
        .format(_day);
    return Padding(
      padding: EdgeInsets.fromLTRB(
          20, 16, 20, MediaQuery.of(context).viewInsets.bottom + 20),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(text.openTitle,
                style:
                    const TextStyle(fontSize: 18, fontWeight: FontWeight.w900)),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              icon: const Icon(Icons.event_outlined),
              label: Text(dayLabel),
              onPressed: () async {
                final now = DateTime.now();
                final picked = await showDatePicker(
                  context: context,
                  initialDate: _day,
                  firstDate: now,
                  lastDate: now.add(const Duration(days: 180)),
                );
                if (picked != null) setState(() => _day = picked);
              },
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () async {
                      final t = await showTimePicker(
                          context: context, initialTime: _start);
                      if (t != null) setState(() => _start = t);
                    },
                    child: Text('${text.from} ${_start.format(context)}'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton(
                    onPressed: () async {
                      final t = await showTimePicker(
                          context: context, initialTime: _end);
                      if (t != null) setState(() => _end = t);
                    },
                    child: Text('${text.to} ${_end.format(context)}'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            DropdownButtonFormField<int>(
              initialValue: _minutes,
              decoration: InputDecoration(labelText: text.duration),
              items: [
                for (final m in const [10, 15, 20, 30])
                  DropdownMenuItem(value: m, child: Text('$m min')),
              ],
              onChanged: (v) => setState(() => _minutes = v ?? _minutes),
            ),
            TextField(
              controller: _locationCtrl,
              maxLength: 120,
              decoration: InputDecoration(labelText: text.location),
            ),
            DropdownButtonFormField<String?>(
              initialValue: _classId,
              decoration: InputDecoration(labelText: text.forClass),
              items: [
                DropdownMenuItem(value: null, child: Text(text.allClasses)),
                for (final c in widget.classes)
                  DropdownMenuItem(value: c.id, child: Text(c.name)),
              ],
              onChanged: (v) => setState(() => _classId = v),
            ),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              onPressed: _saving ? null : _submit,
              icon: _saving
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2))
                  : const Icon(Icons.event_available),
              label: Text(text.open),
            ),
          ],
        ),
      ),
    );
  }
}

class _MtText {
  final String code;
  const _MtText(this.code);

  static _MtText of(BuildContext context) =>
      _MtText(Localizations.localeOf(context).languageCode);

  String pick(String ar, String fr, String en) =>
      code == 'ar' ? ar : (code == 'fr' ? fr : en);

  String get title => pick('المواعيد', 'Rendez-vous', 'Meetings');
  String get open => pick('فتح مواعيد', 'Ouvrir des creneaux', 'Open slots');
  String get openTitle =>
      pick('اقتراح مواعيد', 'Proposer des rendez-vous', 'Offer meetings');
  String get from => pick('من', 'De', 'From');
  String get to => pick('إلى', 'A', 'To');
  String get duration =>
      pick('مدة الموعد', "Duree d'un rendez-vous", 'Meeting length');
  String get location =>
      pick('المكان (اختياري)', 'Lieu (optionnel)', 'Place (optional)');
  String get forClass =>
      pick('الأولياء المعنيون', 'Parents concernes', 'Which parents');
  String get allClasses =>
      pick('كل أقسامي', 'Toutes mes classes', 'All my classes');
  String created(int n) =>
      pick('تم فتح $n موعدا.', '$n creneaux ouverts.', '$n slots opened.');
  String get noSlots => pick(
      'لا توجد مواعيد قادمة. اضغط على "فتح مواعيد".',
      'Aucun creneau a venir. Touchez « Ouvrir des creneaux ».',
      'No upcoming slots. Tap "Open slots".');
  String get free => pick('متاح', 'Libre', 'Free');
  String bookedBy(String parent, String student) => pick(
      'محجوز من طرف $parent ($student)',
      'Reserve par $parent ($student)',
      'Booked by $parent ($student)');
  String get freeSlot => pick('تحرير الموعد', 'Liberer le creneau', 'Free up');
  String get delete => pick('حذف', 'Supprimer', 'Delete');
  String get freeConfirm => pick(
      'إلغاء هذا الحجز؟ سيتم إعلام الولي.',
      'Annuler cette reservation ? Le parent sera prevenu.',
      'Cancel this booking? The parent is told.');
  String get deleteConfirm => pick(
      'حذف هذا الموعد؟ إذا كان محجوزا سيتم إعلام الولي.',
      "Supprimer ce creneau ? Si un parent l'a reserve, il sera prevenu.",
      'Delete this slot? If a parent booked it, they are told.');
  String get myMeetings => pick('مواعيدي', 'Mes rendez-vous', 'My meetings');
  String get noBooking => pick(
      'لا يوجد موعد محجوز لهذا الطفل.',
      'Aucun rendez-vous reserve pour cet enfant.',
      'No meeting booked for this child.');
  String get available =>
      pick('المواعيد المتاحة', 'Creneaux disponibles', 'Available slots');
  String get noneAvailable => pick('لم يقترح الأساتذة أي موعد حاليا.',
      'Aucun creneau propose pour le moment.', 'No slots offered yet.');
  String get topic =>
      pick('الموضوع (اختياري)', 'Sujet (optionnel)', 'Topic (optional)');
  String get book => pick('حجز', 'Reserver', 'Book');
  String get booked =>
      pick('تم حجز الموعد.', 'Rendez-vous reserve.', 'Meeting booked.');
  String get cancel => pick('إلغاء', 'Annuler', 'Cancel');
  String get cancelConfirm => pick(
      'إلغاء هذا الموعد؟ سيتم إعلام الأستاذ.',
      "Annuler ce rendez-vous ? L'enseignant sera prevenu.",
      'Cancel this meeting? The teacher is told.');
  String get back => pick('رجوع', 'Retour', 'Back');
  String get confirm => pick('تأكيد', 'Confirmer', 'Confirm');
}
