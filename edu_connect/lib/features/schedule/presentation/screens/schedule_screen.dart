import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/shimmer_loading.dart';
import '../../../../features/auth/presentation/providers/auth_provider.dart';
import '../../../../core/widgets/child_switcher_bar.dart';
import '../providers/schedule_provider.dart';
import '../../data/models/schedule_model.dart';
import '../../../../features/class/data/repositories/admin_repository.dart';

class ScheduleScreen extends ConsumerStatefulWidget {
  final String classId;
  final String className;

  const ScheduleScreen({
    super.key,
    required this.classId,
    required this.className,
  });

  @override
  ConsumerState<ScheduleScreen> createState() => _ScheduleScreenState();
}

class _ScheduleScreenState extends ConsumerState<ScheduleScreen> {
  static const _daysFull = [
    'Lundi',
    'Mardi',
    'Mercredi',
    'Jeudi',
    'Vendredi',
    'Samedi',
    'Dimanche'
  ];

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(scheduleProvider(widget.classId));
    final user = ref.watch(authNotifierProvider).valueOrNull;
    final role = user?.role ?? '';
    final userId = user?.id ?? '';
    final canManage = role == 'principal' || role == 'secretary';
    final isTeacher = role == 'teacher';
    final colors = context.appColors;

    // Show snackbar on success/error
    ref.listen(scheduleProvider(widget.classId), (prev, next) {
      if (next.successMessage != null) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(next.successMessage!),
          backgroundColor: colors.successGreen,
        ));
      }
      if (next.error != null) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(next.error!),
          backgroundColor: colors.dangerRed,
        ));
      }
    });

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Planning',
                style: TextStyle(fontWeight: FontWeight.w700)),
            Text(widget.className,
                style: TextStyle(fontSize: 12, color: colors.mutedText)),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Actualiser',
            onPressed: () =>
                ref.read(scheduleProvider(widget.classId).notifier).load(),
          ),
          if (canManage)
            IconButton(
              icon: const Icon(Icons.add_circle_outline),
              tooltip: 'Ajouter un créneau',
              onPressed: () => _showSlotDialog(context, ref, canManage: true),
            ),
        ],
      ),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 800),
          child: Column(
            children: [
              if (role == 'parent') const ChildSwitcherBar(),
              Expanded(
                child: state.isLoading
                    ? const ShimmerList(showAvatar: false)
                    : state.slots.isEmpty
                        ? _emptyState()
                        : _buildWeekView(
                            context, ref, state, canManage, isTeacher, userId),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _emptyState() {
    final colors = context.appColors;
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.calendar_today_outlined,
              size: 64, color: colors.mutedText.withValues(alpha: 0.35)),
          const SizedBox(height: 16),
          Text('Aucun créneau défini',
              style: TextStyle(fontSize: 16, color: colors.mutedText)),
          const SizedBox(height: 8),
          Text('La direction peut ajouter des créneaux via le bouton +',
              style: TextStyle(fontSize: 13, color: colors.mutedText),
              textAlign: TextAlign.center),
        ],
      ),
    );
  }

  Widget _buildWeekView(
    BuildContext context,
    WidgetRef ref,
    ScheduleState state,
    bool canManage,
    bool isTeacher,
    String userId,
  ) {
    final colors = context.appColors;
    final byDay = state.byDay;
    // Show Mon-Sat (0-5) by default, but if Sunday (6) has slots, include it.
    final hasSunday = byDay.containsKey(6);
    final tabsCount = hasSunday ? 7 : 6;
    final activeDays = List.generate(tabsCount, (i) => i);

    return DefaultTabController(
      length: tabsCount,
      child: Column(
        children: [
          Container(
            color: colors.cardBg,
            child: TabBar(
              isScrollable: true,
              labelColor: colors.tealDark,
              unselectedLabelColor: colors.mutedText,
              indicatorColor: colors.tealDark,
              indicatorWeight: 3,
              labelStyle:
                  const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
              tabs: activeDays.map((day) {
                return Tab(text: _daysFull[day]);
              }).toList(),
            ),
          ),
          Expanded(
            child: TabBarView(
              children: activeDays.map((day) {
                final slots = byDay[day] ?? [];
                if (slots.isEmpty) {
                  return Center(
                    child: Text('Aucun cours ce jour-là',
                        style:
                            TextStyle(color: colors.mutedText, fontSize: 15)),
                  );
                }

                // Calculate dynamic hour bounds
                int minHour = 8;
                int maxHour = 18;
                for (var slot in slots) {
                  final sh = int.parse(slot.startTime.split(':')[0]);
                  final eh = int.parse(slot.endTime.split(':')[0]);
                  final em = int.parse(slot.endTime.split(':')[1]);
                  if (sh < minHour) minHour = sh;
                  if (eh > maxHour || (eh == maxHour && em > 0)) {
                    maxHour = (em > 0) ? eh + 1 : eh;
                  }
                }

                return _DailyTimelineView(
                  slots: slots,
                  minHour: minHour,
                  maxHour: maxHour,
                  canManage: canManage,
                  isTeacher: isTeacher,
                  userId: userId,
                  classId: widget.classId,
                  onEdit: (slot) => _showSlotDialog(context, ref,
                      canManage: true, existing: slot),
                  onDelete: (slot) => _confirmDelete(context, ref, slot),
                  onCancel: (slot) => _showCancelDialog(context, ref, slot),
                );
              }).toList(),
            ),
          ),
        ],
      ),
    );
  }

  void _showSlotDialog(
    BuildContext context,
    WidgetRef ref, {
    required bool canManage,
    ScheduleSlotModel? existing,
  }) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Theme.of(context).colorScheme.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => _SlotFormSheet(
        classId: widget.classId,
        existing: existing,
      ),
    );
  }

  void _confirmDelete(
      BuildContext context, WidgetRef ref, ScheduleSlotModel slot) {
    final colors = context.appColors;
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Supprimer ce créneau ?'),
        content: Text(
          'Le cours de ${slot.courseName} le ${slot.dayName} '
          '${slot.startTime}–${slot.endTime} sera supprimé.\n\n'
          'Les parents seront notifiés.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Annuler'),
          ),
          TextButton(
            style: TextButton.styleFrom(foregroundColor: colors.dangerRed),
            onPressed: () {
              Navigator.pop(context);
              ref
                  .read(scheduleProvider(widget.classId).notifier)
                  .deleteSlot(slot.id);
            },
            child: const Text('Supprimer'),
          ),
        ],
      ),
    );
  }

  void _showCancelDialog(
      BuildContext context, WidgetRef ref, ScheduleSlotModel slot) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Theme.of(context).colorScheme.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => _CancelSessionSheet(
        slot: slot,
        classId: widget.classId,
      ),
    );
  }
}

// ── Daily Timeline View ────────────────────────────────────────────────────────

class _DailyTimelineView extends StatelessWidget {
  final List<ScheduleSlotModel> slots;
  final int minHour;
  final int maxHour;
  final bool canManage;
  final bool isTeacher;
  final String userId;
  final String classId;
  final void Function(ScheduleSlotModel) onEdit;
  final void Function(ScheduleSlotModel) onDelete;
  final void Function(ScheduleSlotModel) onCancel;

  const _DailyTimelineView({
    required this.slots,
    required this.minHour,
    required this.maxHour,
    required this.canManage,
    required this.isTeacher,
    required this.userId,
    required this.classId,
    required this.onEdit,
    required this.onDelete,
    required this.onCancel,
  });

  static const double _hourHeight = 110.0;
  static const double _timeColumnWidth = 56.0;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    // Determine overlapping groups to adjust widths
    // A simple non-overlapping assumption is made for schools,
    // but we can just use fixed layout for now.

    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 8),
      child: SizedBox(
        height: (maxHour - minHour + 1) * _hourHeight,
        child: Stack(
          children: [
            // Background Grid & Time Labels
            Column(
              children: List.generate(maxHour - minHour + 1, (index) {
                final hour = minHour + index;
                return SizedBox(
                  height: _hourHeight,
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      SizedBox(
                        width: _timeColumnWidth,
                        child: Transform.translate(
                          offset: const Offset(0, -8),
                          child: Text(
                            '${hour.toString().padLeft(2, '0')}:00',
                            style: TextStyle(
                              color: colors.mutedText,
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                            ),
                            textAlign: TextAlign.center,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Container(
                          decoration: BoxDecoration(
                            border: Border(
                              top: BorderSide(
                                  color: colors.cardBorder, width: 1.5),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                );
              }),
            ),

            // Slots
            ...slots.map((slot) {
              final sh = int.parse(slot.startTime.split(':')[0]);
              final sm = int.parse(slot.startTime.split(':')[1]);
              final eh = int.parse(slot.endTime.split(':')[0]);
              final em = int.parse(slot.endTime.split(':')[1]);

              final top = (sh - minHour + (sm / 60)) * _hourHeight;
              final durationHours = (eh - sh) + ((em - sm) / 60);
              final height = durationHours * _hourHeight;

              final today = DateFormat('yyyy-MM-dd').format(DateTime.now());
              final isCancelled = slot.isCancelledOn(today);
              final canCancelThis =
                  canManage || (isTeacher && slot.teacherId == userId);

              return Positioned(
                top: top + 1, // slight offset to not overlap exact grid line
                left: _timeColumnWidth + 12,
                right: 8,
                height: height - 2, // slight gap between adjacent slots
                child: _TimelineSlotCard(
                  slot: slot,
                  isCancelledToday: isCancelled,
                  canManage: canManage,
                  canCancel: canCancelThis,
                  onEdit: () => onEdit(slot),
                  onDelete: () => onDelete(slot),
                  onCancel: () => onCancel(slot),
                ),
              );
            }),
          ],
        ),
      ),
    );
  }
}

// ── Timeline Slot Card ─────────────────────────────────────────────────────────

class _TimelineSlotCard extends StatelessWidget {
  final ScheduleSlotModel slot;
  final bool isCancelledToday;
  final bool canManage;
  final bool canCancel;
  final VoidCallback onEdit;
  final VoidCallback onDelete;
  final VoidCallback onCancel;

  const _TimelineSlotCard({
    required this.slot,
    required this.isCancelledToday,
    required this.canManage,
    required this.canCancel,
    required this.onEdit,
    required this.onDelete,
    required this.onCancel,
  });

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final colorScheme = Theme.of(context).colorScheme;
    // Generate a consistent color based on course name
    final colorVal = slot.courseName.hashCode;
    final hue = (colorVal % 360).toDouble();
    final cardColor = HSLColor.fromAHSL(1.0, hue, 0.65, 0.95).toColor();
    final borderColor = HSLColor.fromAHSL(1.0, hue, 0.75, 0.45).toColor();

    final bg =
        isCancelledToday ? colors.dangerRed.withValues(alpha: 0.08) : cardColor;
    final brd = isCancelledToday ? colors.dangerRed : borderColor;

    return Container(
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(12),
        border: Border(left: BorderSide(color: brd, width: 4)),
        boxShadow: [
          BoxShadow(
            color: brd.withValues(alpha: 0.15),
            blurRadius: 4,
            offset: const Offset(0, 2),
          )
        ],
      ),
      clipBehavior: Clip.hardEdge,
      child: Material(
        color: Theme.of(context).colorScheme.surface.withValues(alpha: 0),
        child: InkWell(
          onTap: (canManage || canCancel) ? () => _showOptions(context) : null,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        slot.courseName,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontWeight: FontWeight.w800,
                          fontSize: 14,
                          color: isCancelledToday ? colors.dangerRed : brd,
                          decoration: isCancelledToday
                              ? TextDecoration.lineThrough
                              : null,
                        ),
                      ),
                    ),
                    if (isCancelledToday)
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: colors.dangerRed,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          'ANNULÉ',
                          style: TextStyle(
                              color: colorScheme.onError,
                              fontSize: 9,
                              fontWeight: FontWeight.bold),
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 2),
                Text(
                  '${slot.startTime} – ${slot.endTime}',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: isCancelledToday
                        ? colors.dangerRed
                        : brd.withValues(alpha: 0.8),
                  ),
                ),
                if (slot.teacherName != null) ...[
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Icon(Icons.person,
                          size: 12, color: brd.withValues(alpha: 0.7)),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(
                          slot.teacherName!,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                              fontSize: 11, color: brd.withValues(alpha: 0.8)),
                        ),
                      ),
                    ],
                  ),
                ],
                if (slot.room != null) ...[
                  const SizedBox(height: 2),
                  Row(
                    children: [
                      Icon(Icons.room,
                          size: 12, color: brd.withValues(alpha: 0.7)),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(
                          'Salle ${slot.room}',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                              fontSize: 11, color: brd.withValues(alpha: 0.8)),
                        ),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _showOptions(BuildContext context) {
    final colors = context.appColors;
    showModalBottomSheet(
        context: context,
        shape: const RoundedRectangleBorder(
            borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
        builder: (_) {
          return SafeArea(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (canManage) ...[
                  ListTile(
                    leading: Icon(Icons.edit, color: colors.tealDark),
                    title: const Text('Modifier le créneau'),
                    onTap: () {
                      Navigator.pop(context);
                      onEdit();
                    },
                  ),
                  ListTile(
                    leading: Icon(Icons.delete, color: colors.dangerRed),
                    title: const Text('Supprimer définitivement'),
                    onTap: () {
                      Navigator.pop(context);
                      onDelete();
                    },
                  ),
                  const Divider(),
                ],
                if (canManage || canCancel)
                  ListTile(
                    leading:
                        Icon(Icons.warning_amber, color: colors.warningAmber),
                    title: const Text('Annuler une séance (exceptionnel)'),
                    onTap: () {
                      Navigator.pop(context);
                      onCancel();
                    },
                  ),
              ],
            ),
          );
        });
  }
}

// ── Cancel Session Bottom Sheet ───────────────────────────────────────────────

class _CancelSessionSheet extends ConsumerStatefulWidget {
  final ScheduleSlotModel slot;
  final String classId;
  const _CancelSessionSheet({required this.slot, required this.classId});

  @override
  ConsumerState<_CancelSessionSheet> createState() =>
      _CancelSessionSheetState();
}

class _CancelSessionSheetState extends ConsumerState<_CancelSessionSheet> {
  final _reasonCtrl = TextEditingController();
  DateTime _selectedDate = DateTime.now();
  bool _isSending = false;

  @override
  void dispose() {
    _reasonCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final colorScheme = Theme.of(context).colorScheme;
    return Padding(
      padding: EdgeInsetsDirectional.only(
        start: 20,
        end: 20,
        top: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Annuler une séance',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
          ),
          Text(
            '${widget.slot.courseName} — ${widget.slot.dayName} '
            '${widget.slot.startTime}–${widget.slot.endTime}',
            style: TextStyle(color: colors.mutedText, fontSize: 13),
          ),
          const SizedBox(height: 16),
          // Date picker
          InkWell(
            borderRadius: BorderRadius.circular(12),
            onTap: _pickDate,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              decoration: BoxDecoration(
                border: Border.all(color: colors.cardBorder),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  Icon(Icons.calendar_today, size: 18, color: colors.tealDark),
                  const SizedBox(width: 10),
                  Text(
                    DateFormat(
                      'EEEE d MMMM yyyy',
                      Localizations.localeOf(context).toLanguageTag(),
                    ).format(_selectedDate),
                    style: const TextStyle(fontWeight: FontWeight.w500),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _reasonCtrl,
            maxLines: 2,
            decoration: InputDecoration(
              hintText: 'Motif de l\'annulation (optionnel)',
              border:
                  OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              contentPadding:
                  const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            ),
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            height: 48,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: colors.dangerRed,
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12)),
              ),
              onPressed: _isSending ? null : _submit,
              child: _isSending
                  ? SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                          color: colorScheme.onError, strokeWidth: 2),
                    )
                  : Text(
                      'Annuler cette séance',
                      style: TextStyle(
                          color: colorScheme.onError,
                          fontWeight: FontWeight.w600),
                    ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: DateTime.now().subtract(const Duration(days: 30)),
      lastDate: DateTime.now().add(const Duration(days: 90)),
      locale: Localizations.localeOf(context),
    );
    if (picked != null) setState(() => _selectedDate = picked);
  }

  Future<void> _submit() async {
    setState(() => _isSending = true);
    final dateStr = DateFormat('yyyy-MM-dd').format(_selectedDate);
    final ok =
        await ref.read(scheduleProvider(widget.classId).notifier).cancelSession(
              slotId: widget.slot.id,
              cancelledDate: dateStr,
              reason: _reasonCtrl.text.trim().isEmpty
                  ? null
                  : _reasonCtrl.text.trim(),
            );
    setState(() => _isSending = false);
    if (mounted && ok) Navigator.pop(context);
  }
}

// ── Slot Form Sheet (create / edit) ──────────────────────────────────────────

class _SlotFormSheet extends ConsumerStatefulWidget {
  final String classId;
  final ScheduleSlotModel? existing;
  const _SlotFormSheet({required this.classId, this.existing});

  @override
  ConsumerState<_SlotFormSheet> createState() => _SlotFormSheetState();
}

class _SlotFormSheetState extends ConsumerState<_SlotFormSheet> {
  final _roomCtrl = TextEditingController();
  String? _selectedCourseName;
  String? _selectedTeacherId;
  int _day = 0;
  TimeOfDay _start = const TimeOfDay(hour: 8, minute: 0);
  TimeOfDay _end = const TimeOfDay(hour: 9, minute: 0);
  bool _isSending = false;

  static const _days = [
    'Lundi',
    'Mardi',
    'Mercredi',
    'Jeudi',
    'Vendredi',
    'Samedi',
    'Dimanche'
  ];

  @override
  void initState() {
    super.initState();
    final s = widget.existing;
    if (s != null) {
      _selectedCourseName = s.courseName;
      _selectedTeacherId = s.teacherId;
      _roomCtrl.text = s.room ?? '';
      _day = s.dayOfWeek;
      final sp = s.startTime.split(':');
      final ep = s.endTime.split(':');
      _start = TimeOfDay(hour: int.parse(sp[0]), minute: int.parse(sp[1]));
      _end = TimeOfDay(hour: int.parse(ep[0]), minute: int.parse(ep[1]));
    }
  }

  @override
  void dispose() {
    _roomCtrl.dispose();
    super.dispose();
  }

  String _fmt(TimeOfDay t) =>
      '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';

  @override
  Widget build(BuildContext context) {
    final isEdit = widget.existing != null;
    final coursesAsync = ref.watch(schoolCoursesProvider);
    final teachersAsync = ref.watch(schoolTeachersProvider);
    final colors = context.appColors;
    final colorScheme = Theme.of(context).colorScheme;

    return Padding(
      padding: EdgeInsetsDirectional.only(
        start: 20,
        end: 20,
        top: 24,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                      color: colors.tealDark.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(10)),
                  child: Icon(Icons.schedule, color: colors.tealDark, size: 20),
                ),
                const SizedBox(width: 12),
                Text(
                  isEdit ? 'Modifier le créneau' : 'Nouveau créneau',
                  style: const TextStyle(
                      fontSize: 18, fontWeight: FontWeight.w700),
                ),
              ],
            ),
            const SizedBox(height: 20),

            // Course dropdown
            coursesAsync.when(
              loading: () => const LinearProgressIndicator(),
              error: (_, __) => const Text('Erreur matières'),
              data: (courses) => DropdownButtonFormField<String>(
                initialValue: _selectedCourseName,
                isExpanded: true,
                decoration: InputDecoration(
                  labelText: 'Matière *',
                  prefixIcon: const Icon(Icons.menu_book_outlined),
                  border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12)),
                  contentPadding:
                      const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                ),
                items: courses
                    .map((c) => DropdownMenuItem(
                        value: c.name,
                        child: Text(c.name, overflow: TextOverflow.ellipsis)))
                    .toList(),
                onChanged: (v) => setState(() => _selectedCourseName = v),
              ),
            ),
            const SizedBox(height: 12),

            // Teacher dropdown
            teachersAsync.when(
              loading: () => const LinearProgressIndicator(),
              error: (_, __) => const Text('Erreur professeurs'),
              data: (teachers) => teachers.isEmpty
                  ? Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: colors.warningAmber.withValues(alpha: 0.10),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: colors.warningAmber.withValues(alpha: 0.30),
                        ),
                      ),
                      child: Row(children: [
                        Icon(Icons.warning_amber,
                            color: colors.warningAmber, size: 18),
                        const SizedBox(width: 8),
                        Expanded(
                            child: Text(
                                'Aucun professeur. Créez-en un d\'abord.',
                                style: TextStyle(
                                    color: colors.warningAmber, fontSize: 13))),
                      ]),
                    )
                  : DropdownButtonFormField<String>(
                      initialValue: _selectedTeacherId,
                      isExpanded: true,
                      decoration: InputDecoration(
                        labelText: 'Professeur *',
                        prefixIcon: const Icon(Icons.person_outlined),
                        border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12)),
                        contentPadding: const EdgeInsets.symmetric(
                            horizontal: 14, vertical: 12),
                      ),
                      items: teachers
                          .map((t) => DropdownMenuItem(
                              value: t.id,
                              child: Text(t.fullName,
                                  overflow: TextOverflow.ellipsis)))
                          .toList(),
                      onChanged: (v) => setState(() => _selectedTeacherId = v),
                    ),
            ),
            const SizedBox(height: 12),

            TextField(
              controller: _roomCtrl,
              decoration: InputDecoration(
                hintText: 'Salle (optionnel)',
                prefixIcon: const Icon(Icons.room_outlined, size: 20),
                border:
                    OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                contentPadding:
                    const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              ),
            ),
            const SizedBox(height: 12),

            DropdownButtonFormField<int>(
              initialValue: _day,
              decoration: InputDecoration(
                labelText: 'Jour *',
                prefixIcon: const Icon(Icons.calendar_today_outlined),
                border:
                    OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                contentPadding:
                    const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              ),
              items: List.generate(
                  7, (i) => DropdownMenuItem(value: i, child: Text(_days[i]))),
              onChanged: (v) => setState(() => _day = v ?? 0),
            ),
            const SizedBox(height: 12),

            Row(
              children: [
                Expanded(
                    child: _timeTile(
                        'Début', _start, (t) => setState(() => _start = t))),
                const SizedBox(width: 10),
                Expanded(
                    child: _timeTile(
                        'Fin', _end, (t) => setState(() => _end = t))),
              ],
            ),

            if (_selectedCourseName != null) ...[
              const SizedBox(height: 14),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: colors.tealDark.withValues(alpha: 0.06),
                  borderRadius: BorderRadius.circular(10),
                  border:
                      Border.all(color: colors.tealDark.withValues(alpha: 0.2)),
                ),
                child: Text(
                  '${_days[_day]}  •  ${_fmt(_start)} – ${_fmt(_end)}  •  $_selectedCourseName',
                  style: TextStyle(
                      fontWeight: FontWeight.w600,
                      color: colors.tealDark,
                      fontSize: 13),
                ),
              ),
            ],

            const SizedBox(height: 18),
            SizedBox(
              width: double.infinity,
              height: 50,
              child: FilledButton.icon(
                style: FilledButton.styleFrom(
                  backgroundColor: colors.tealDark,
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12)),
                ),
                onPressed: (_isSending ||
                        _selectedCourseName == null ||
                        _selectedTeacherId == null)
                    ? null
                    : _submit,
                icon: _isSending
                    ? SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                            color: colorScheme.onPrimary, strokeWidth: 2))
                    : Icon(isEdit
                        ? Icons.save_outlined
                        : Icons.add_circle_outline),
                label: Text(
                  isEdit ? 'Enregistrer' : 'Ajouter ce créneau',
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _timeTile(
      String label, TimeOfDay time, ValueChanged<TimeOfDay> onPick) {
    final colors = context.appColors;
    return InkWell(
      borderRadius: BorderRadius.circular(12),
      onTap: () async {
        final picked =
            await showTimePicker(context: context, initialTime: time);
        if (picked != null) onPick(picked);
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
        decoration: BoxDecoration(
          border: Border.all(color: colors.cardBorder),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            Icon(Icons.access_time, size: 18, color: colors.tealDark),
            const SizedBox(width: 8),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label,
                    style: TextStyle(fontSize: 11, color: colors.mutedText)),
                Text(_fmt(time),
                    style: const TextStyle(
                        fontWeight: FontWeight.w700, fontSize: 15)),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _submit() async {
    if (_selectedCourseName == null || _selectedTeacherId == null) return;
    setState(() => _isSending = true);
    bool ok;
    final notifier = ref.read(scheduleProvider(widget.classId).notifier);
    if (widget.existing != null) {
      ok = await notifier.updateSlot(
        widget.existing!.id,
        courseName: _selectedCourseName!,
        teacherId: _selectedTeacherId!,
        dayOfWeek: _day,
        startTime: _fmt(_start),
        endTime: _fmt(_end),
        room: _roomCtrl.text.trim().isEmpty ? null : _roomCtrl.text.trim(),
      );
    } else {
      ok = await notifier.createSlot(
        courseName: _selectedCourseName!,
        teacherId: _selectedTeacherId!,
        dayOfWeek: _day,
        startTime: _fmt(_start),
        endTime: _fmt(_end),
        room: _roomCtrl.text.trim().isEmpty ? null : _roomCtrl.text.trim(),
      );
    }
    setState(() => _isSending = false);
    if (mounted && ok) Navigator.pop(context);
  }
}
