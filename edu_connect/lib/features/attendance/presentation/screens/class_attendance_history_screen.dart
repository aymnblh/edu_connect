import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:edu_connect/l10n/app_localizations.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/shimmer_loading.dart';
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
