import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:edu_connect/l10n/app_localizations.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/shimmer_loading.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../data/models/attendance_model.dart';
import '../../data/repositories/attendance_repository.dart';

final classAttendanceHistoryProvider =
    FutureProvider.family<List<AttendanceModel>, String>((ref, classId) async {
  return ref.watch(attendanceRepositoryProvider).getClassAttendance(classId);
});

class ClassAttendanceHistoryScreen extends ConsumerWidget {
  final String classId;

  const ClassAttendanceHistoryScreen({super.key, required this.classId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final historyAsync = ref.watch(classAttendanceHistoryProvider(classId));
    final user = ref.watch(authNotifierProvider).valueOrNull;
    final canCorrect = user != null && !user.isParent;

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.history),
      ),
      body: historyAsync.when(
        loading: () => const ShimmerList(showAvatar: false),
        error: (e, _) => Center(child: Text('${l10n.error}: $e')),
        data: (history) {
          if (history.isEmpty) {
            return Center(child: Text(l10n.noData));
          }

          final grouped = <String, List<AttendanceModel>>{};
          for (final item in history) {
            final dateStr = DateFormat(
              'dd MMM yyyy',
              Localizations.localeOf(context).toLanguageTag(),
            ).format(item.date);
            grouped.putIfAbsent(dateStr, () => []).add(item);
          }

          final dates = grouped.keys.toList()..sort((a, b) => b.compareTo(a));

          return ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: dates.length,
            itemBuilder: (ctx, i) {
              final dateStr = dates[i];
              final items = grouped[dateStr]!;
              final absents = items
                  .where((element) => element.status.name == 'absent')
                  .length;

              return ExpansionTile(
                title: Text(
                  dateStr,
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
                subtitle: Text('$absents ${l10n.absent} / ${items.length}'),
                children: items
                    .map(
                      (item) => ListTile(
                        onTap: canCorrect
                            ? () => _correct(context, ref, item)
                            : null,
                        title: Text(item.studentName),
                        trailing: _StatusBadge(
                          status: item.status.name,
                          label: _statusLabel(context, item.status.name),
                        ),
                        subtitle: item.isJustified
                            ? Text(
                                '${l10n.justified} ✓',
                                style: TextStyle(
                                  color: context.appColors.successGreen,
                                  fontSize: 12,
                                ),
                              )
                            : null,
                      ),
                    )
                    .toList(),
              );
            },
          );
        },
      ),
    );
  }
}

Future<void> _correct(
    BuildContext context, WidgetRef ref, AttendanceModel item) async {
  final isAr = Localizations.localeOf(context).languageCode == 'ar';
  final isFr = Localizations.localeOf(context).languageCode == 'fr';
  String pick(String ar, String fr, String en) => isAr ? ar : (isFr ? fr : en);

  final chosen = await showModalBottomSheet<AttendanceStatus>(
    context: context,
    useSafeArea: true,
    builder: (ctx) => SafeArea(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          ListTile(
            title: Text(
              pick(
                  'تصحيح الحضور', 'Corriger la presence', 'Correct attendance'),
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
            subtitle: Text(
              pick(
                'سيتم إعلام الأولياء بالتصحيح.',
                'Les parents seront informes de la correction.',
                'Parents will be told about the correction.',
              ),
            ),
          ),
          for (final status in AttendanceStatus.values)
            ListTile(
              leading: Icon(
                status == item.status
                    ? Icons.radio_button_checked
                    : Icons.radio_button_unchecked,
              ),
              title: Text(_statusLabel(ctx, status.name)),
              onTap: () => Navigator.of(ctx).pop(status),
            ),
        ],
      ),
    ),
  );
  if (chosen == null || chosen == item.status || !context.mounted) return;
  try {
    await ref.read(attendanceRepositoryProvider).correctAttendance(
          classId: item.classId,
          attendanceId: item.id,
          status: chosen,
        );
    ref.invalidate(classAttendanceHistoryProvider(item.classId));
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(pick('تم تصحيح الحضور.', 'Presence corrigee.',
              'Attendance corrected.')),
        ),
      );
    }
  } catch (e) {
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(pick('تعذر التصحيح: $e', 'Correction impossible : $e',
              'Could not correct: $e')),
        ),
      );
    }
  }
}

class _StatusBadge extends StatelessWidget {
  final String status;
  final String label;

  const _StatusBadge({required this.status, required this.label});

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    Color color = colors.successGreen;
    if (status == 'absent') color = colors.dangerRed;
    if (status == 'late') color = colors.warningAmber;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withValues(alpha: 0.5)),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontSize: 10,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }
}

String _statusLabel(BuildContext context, String status) {
  final l10n = AppLocalizations.of(context)!;
  return switch (status) {
    'absent' => l10n.absent,
    'late' => l10n.late,
    _ => l10n.present,
  };
}
