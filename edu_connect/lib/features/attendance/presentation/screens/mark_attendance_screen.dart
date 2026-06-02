import 'package:edu_connect/l10n/app_localizations.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:intl/intl.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/shimmer_loading.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../../class/data/models/class_model.dart';
import '../../../class/data/models/student_model.dart';
import '../../../class/presentation/providers/class_provider.dart';
import '../providers/attendance_provider.dart';
import '../../data/models/attendance_model.dart';

class MarkAttendanceScreen extends ConsumerWidget {
  final String classId;

  const MarkAttendanceScreen({super.key, required this.classId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final colors = context.appColors;
    final classAsync = ref.watch(classDetailProvider(classId));
    final userAsync = ref.watch(authNotifierProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.attendance),
        leading: IconButton(
          icon: Icon(Icons.adaptive.arrow_back),
          tooltip: MaterialLocalizations.of(context).backButtonTooltip,
          onPressed: () {
            if (context.canPop()) {
              context.pop();
            } else {
              context.go('/class/$classId/chat');
            }
          },
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.history_outlined),
            tooltip: l10n.history,
            onPressed: () => context.push('/class/$classId/attendance-history'),
          ),
          Padding(
            padding: const EdgeInsetsDirectional.only(end: 16),
            child: Center(
              child: Text(
                DateFormat(
                  'EEE, MMM d, yyyy',
                  Localizations.localeOf(context).toLanguageTag(),
                ).format(DateTime.now()),
                style: TextStyle(fontSize: 12, color: colors.mutedText),
              ),
            ),
          ),
        ],
      ),
      body: userAsync.when(
        loading: () => const ShimmerList(showAvatar: false),
        error: (e, _) => Center(child: Text('${l10n.error}: $e')),
        data: (user) => classAsync.when(
          loading: () => const ShimmerList(showAvatar: false),
          error: (e, _) => Center(child: Text('${l10n.error}: $e')),
          data: (ClassModel? cls) {
            if (cls == null) {
              return const ShimmerList(showAvatar: false);
            }
            final students = cls.members;

            if (students.isEmpty) {
              return Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.group_off_outlined,
                        size: 64,
                        color: colors.mutedText.withValues(alpha: 0.35)),
                    const SizedBox(height: 16),
                    Text(
                      l10n.noStudents,
                      style: TextStyle(
                          color: colors.mutedText,
                          fontSize: 16,
                          fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      l10n.studentsJoinViaCode,
                      style: TextStyle(color: colors.mutedText, fontSize: 13),
                    ),
                  ],
                ),
              );
            }

            return ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: students.length,
              itemBuilder: (ctx, i) {
                return _AttendanceRow(
                  classId: classId,
                  student: students[i],
                  index: i,
                );
              },
            );
          },
        ),
      ),
    );
  }
}

class _AttendanceRow extends ConsumerStatefulWidget {
  final String classId;
  final StudentModel student;
  final int index;

  const _AttendanceRow({
    required this.classId,
    required this.student,
    required this.index,
  });

  @override
  ConsumerState<_AttendanceRow> createState() => _AttendanceRowState();
}

class _AttendanceRowState extends ConsumerState<_AttendanceRow> {
  AttendanceStatus? _selected;
  bool _saving = false;

  Future<void> _mark(AttendanceStatus status) async {
    setState(() {
      _selected = status;
      _saving = true;
    });

    try {
      await ref.read(attendanceNotifierProvider.notifier).mark(
            classId: widget.classId,
            studentId: widget.student.id,
            studentName: widget.student.fullName,
            status: status,
          );
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final l10n = AppLocalizations.of(context)!;
    return Card(
      margin: const EdgeInsetsDirectional.only(bottom: 10),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        child: Row(
          children: [
            CircleAvatar(
              radius: 20,
              backgroundColor: colors.tealDark.withValues(alpha: 0.1),
              child: Text(
                '${widget.index + 1}',
                style: TextStyle(
                  color: colors.tealDark,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                widget.student.fullName,
                style:
                    const TextStyle(fontWeight: FontWeight.w500, fontSize: 14),
                overflow: TextOverflow.ellipsis,
              ),
            ),
            if (_saving)
              SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: colors.tealDark,
                  ))
            else
              Row(
                children: [
                  _StatusButton(
                    icon: Icons.check_circle_outline,
                    label: AppLocalizations.of(context)!.presentS,
                    semanticLabel: l10n.present,
                    color: colors.successGreen,
                    selected: _selected == AttendanceStatus.present,
                    onTap: () => _mark(AttendanceStatus.present),
                  ),
                  const SizedBox(width: 6),
                  _StatusButton(
                    icon: Icons.remove_circle_outline,
                    label: AppLocalizations.of(context)!.lateS,
                    semanticLabel: l10n.late,
                    color: colors.warningAmber,
                    selected: _selected == AttendanceStatus.late,
                    onTap: () => _mark(AttendanceStatus.late),
                  ),
                  const SizedBox(width: 6),
                  _StatusButton(
                    icon: Icons.cancel_outlined,
                    label: AppLocalizations.of(context)!.absentS,
                    semanticLabel: l10n.absent,
                    color: colors.dangerRed,
                    selected: _selected == AttendanceStatus.absent,
                    onTap: () => _mark(AttendanceStatus.absent),
                  ),
                ],
              ),
          ],
        ),
      ),
    )
        .animate()
        .fadeIn(delay: Duration(milliseconds: widget.index * 60))
        .slideX(begin: -0.1);
  }
}

class _StatusButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final String semanticLabel;
  final Color color;
  final bool selected;
  final VoidCallback onTap;

  const _StatusButton({
    required this.icon,
    required this.label,
    required this.semanticLabel,
    required this.color,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      selected: selected,
      label: semanticLabel,
      child: Tooltip(
        message: semanticLabel,
        child: GestureDetector(
          onTap: onTap,
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: selected ? color : color.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(
                color: selected ? color : color.withValues(alpha: 0.3),
              ),
            ),
            child: Center(
              child: Text(
                label,
                style: TextStyle(
                  color: selected
                      ? Theme.of(context).colorScheme.onPrimary
                      : color,
                  fontWeight: FontWeight.w700,
                  fontSize: 13,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
