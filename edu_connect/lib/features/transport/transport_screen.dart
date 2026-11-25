import 'dart:convert';
import 'dart:math';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/services/api_service.dart';
import '../../core/services/app_secure_storage.dart';
import '../../core/widgets/shimmer_loading.dart';
import '../auth/presentation/providers/auth_provider.dart';

const _queueStorageKey = 'driver_offline_events';

/// School transport screen:
/// - For `driver` / `principal` / `secretary`: today's bus manifest with 1-tap boarding/drop-off,
///   offline check-in queue, delay button and forgotten-child safety lock.
/// - For `parent`: assigned bus line/stop, today's check-in state and "no bus" notice.
class TransportScreen extends ConsumerStatefulWidget {
  const TransportScreen({super.key});

  @override
  ConsumerState<TransportScreen> createState() => _TransportScreenState();
}

class _TransportScreenState extends ConsumerState<TransportScreen> {
  String _direction = 'morning';
  List<Map<String, dynamic>> _offlineQueue = [];
  late Future<Map<String, dynamic>> _future;

  @override
  void initState() {
    super.initState();
    _loadQueue();
    _future = _load();
  }

  Future<void> _loadQueue() async {
    final raw = await appSecureStorage.read(key: _queueStorageKey);
    if (raw == null || raw.isEmpty) return;
    try {
      final list = (jsonDecode(raw) as List<dynamic>)
          .map((e) => Map<String, dynamic>.from(e as Map))
          .toList();
      if (mounted) setState(() => _offlineQueue = list);
    } catch (_) {
      // Ignore malformed cache.
    }
  }

  Future<void> _saveQueue(List<Map<String, dynamic>> items) async {
    await appSecureStorage.write(key: _queueStorageKey, value: jsonEncode(items));
    if (mounted) setState(() => _offlineQueue = items);
  }

  String _newEventId() {
    final rand = Random().nextInt(1 << 30).toRadixString(36);
    return 'mob-${DateTime.now().microsecondsSinceEpoch}-$rand';
  }

  Future<Map<String, dynamic>> _load() async {
    final user = ref.read(authNotifierProvider).valueOrNull;
    final path = (user?.isParent ?? false) ? '/transport/my' : '/transport/driver/today';
    final data = await ApiService.instance.get(path);
    return Map<String, dynamic>.from(data as Map);
  }

  void _reload() {
    setState(() {
      _future = _load();
    });
  }

  Future<void> _syncQueue() async {
    if (_offlineQueue.isEmpty) return;
    final byTrip = <String, List<Map<String, dynamic>>>{};
    for (final ev in _offlineQueue) {
      final tripId = ev['trip_id'] as String;
      byTrip.putIfAbsent(tripId, () => []).add(ev);
    }
    final remaining = <Map<String, dynamic>>[];
    for (final entry in byTrip.entries) {
      try {
        await ApiService.instance.post(
          '/transport/driver/trips/${entry.key}/events',
          data: {
            'events': entry.value
                .map((e) => {
                      'student_id': e['student_id'],
                      'kind': e['kind'],
                      'client_event_id': e['client_event_id'],
                      'recorded_at': e['recorded_at'],
                    })
                .toList(),
          },
        );
      } catch (_) {
        remaining.addAll(entry.value);
      }
    }
    await _saveQueue(remaining);
    _reload();
  }

  Future<void> _sendEvent(String tripId, String studentId, String kind) async {
    final ev = {
      'trip_id': tripId,
      'student_id': studentId,
      'kind': kind,
      'client_event_id': _newEventId(),
      'recorded_at': DateTime.now().toUtc().toIso8601String(),
    };
    try {
      await ApiService.instance.post(
        '/transport/driver/trips/$tripId/events',
        data: {
          'events': [
            {
              'student_id': ev['student_id'],
              'kind': ev['kind'],
              'client_event_id': ev['client_event_id'],
              'recorded_at': ev['recorded_at'],
            }
          ],
        },
      );
      _reload();
    } catch (_) {
      await _saveQueue([..._offlineQueue, ev]);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(_TText.of(context).offlineQueued)),
        );
      }
    }
  }

  Future<void> _completeTrip(String tripId, _TText text) async {
    try {
      await ApiService.instance.post(
        '/transport/driver/trips/$tripId/complete',
        data: {'force': false},
      );
      _reload();
    } on DioException catch (err) {
      if (err.response?.statusCode == 409 && mounted) {
        final detail = err.response?.data is Map
            ? (err.response!.data as Map)['detail'] as Map?
            : null;
        final unaccounted = (detail?['unaccounted_student_ids'] as List<dynamic>? ?? const []).length;
        final confirm = await showDialog<bool>(
          context: context,
          builder: (ctx) => AlertDialog(
            title: Text(text.forgottenTitle),
            content: Text(text.forgottenBody(unaccounted)),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(ctx, false),
                child: Text(text.cancel),
              ),
              FilledButton(
                onPressed: () => Navigator.pop(ctx, true),
                child: Text(text.forceComplete),
              ),
            ],
          ),
        );
        if (confirm == true) {
          await ApiService.instance.post(
            '/transport/driver/trips/$tripId/complete',
            data: {'force': true},
          );
          _reload();
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authNotifierProvider).valueOrNull;
    final text = _TText.of(context);
    final isDriver = user?.isDriver ?? false;
    final isParent = user?.isParent ?? false;

    return Scaffold(
      appBar: AppBar(
        title: Text(isParent ? text.parentTitle : text.driverTitle),
        actions: [
          if (_offlineQueue.isNotEmpty)
            IconButton(
              tooltip: text.syncQueue(_offlineQueue.length),
              icon: Badge(
                label: Text('${_offlineQueue.length}'),
                child: const Icon(Icons.sync),
              ),
              onPressed: _syncQueue,
            ),
          if (isDriver) ...[
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
          return _buildDriverView(context, data, text);
        },
      ),
    );
  }

  Widget _buildDriverView(
    BuildContext context,
    Map<String, dynamic> data,
    _TText text,
  ) {
    final routes = (data['routes'] as List<dynamic>? ?? const []);
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
          child: SegmentedButton<String>(
            segments: [
              ButtonSegment(value: 'morning', label: Text(text.morning)),
              ButtonSegment(value: 'evening', label: Text(text.evening)),
            ],
            selected: {_direction},
            onSelectionChanged: (s) => setState(() => _direction = s.first),
          ),
        ),
        Expanded(
          child: RefreshIndicator(
            onRefresh: () async => _reload(),
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                if (routes.isEmpty) Center(child: Text(text.noRoutes)),
                for (final rRaw in routes)
                  _buildDriverRouteCard(
                    context,
                    Map<String, dynamic>.from(rRaw as Map),
                    text,
                  ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildDriverRouteCard(
    BuildContext context,
    Map<String, dynamic> route,
    _TText text,
  ) {
    final directions = Map<String, dynamic>.from(route['directions'] as Map? ?? {});
    final dir = Map<String, dynamic>.from(directions[_direction] as Map? ?? {});
    final trip = dir['trip'] as Map<String, dynamic>?;
    final stops = (dir['stops'] as List<dynamic>? ?? const []);
    final exceptions = (dir['exceptions'] as List<dynamic>? ?? const []);
    final routeId = route['id'] as String;
    final tripId = trip?['id'] as String?;

    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Wrap(
              spacing: 12,
              runSpacing: 8,
              alignment: WrapAlignment.spaceBetween,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                ConstrainedBox(
                  constraints: const BoxConstraints(minWidth: 160),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '${route['name'] ?? ''}',
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      if (route['vehicle_plate'] != null)
                        Text('${route['vehicle_plate']}'),
                    ],
                  ),
                ),
                if (trip == null)
                  FilledButton.icon(
                    icon: const Icon(Icons.play_arrow),
                    label: Text(text.startTrip),
                    onPressed: () async {
                      await ApiService.instance.post(
                        '/transport/driver/trips/$routeId/$_direction/start',
                      );
                      _reload();
                    },
                  )
                else if (trip['status'] == 'in_progress')
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      OutlinedButton(
                        onPressed: () async {
                          await ApiService.instance.post(
                            '/transport/driver/trips/$tripId/delay',
                            data: {'minutes': 15},
                          );
                          _reload();
                        },
                        child: const Text('+15 min'),
                      ),
                      FilledButton(
                        onPressed: () => _completeTrip(tripId!, text),
                        child: Text(text.completeTrip),
                      ),
                    ],
                  )
                else
                  Chip(label: Text(text.completed)),
              ],
            ),
            const Divider(),
            for (final stopRaw in stops)
              Builder(builder: (context) {
                final stop = Map<String, dynamic>.from(stopRaw as Map);
                final students = (stop['students'] as List<dynamic>? ?? const []);
                return Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '${stop['position']}. ${stop['name']} ${stop['time'] != null ? "(${stop['time']})" : ""}',
                        style: Theme.of(context).textTheme.labelLarge,
                      ),
                      for (final sRaw in students)
                        Builder(builder: (context) {
                          final s = Map<String, dynamic>.from(sRaw as Map);
                          final sid = s['student_id'] as String;
                          final alert = s['health_alert'] as String?;
                          final emergency = s['emergency_contact'] as Map<String, dynamic>?;
                          final state = _queuedState(tripId, sid) ?? (s['state'] as String? ?? 'pending');
                          return ListTile(
                            contentPadding: EdgeInsets.zero,
                            title: Text('${s['student_name']} ($state)'),
                            subtitle: Text([
                              '${s['class_name'] ?? ''}',
                              if (alert != null) alert,
                              if (emergency != null)
                                '${emergency['name']}: ${emergency['phone']}',
                            ].join(' · ')),
                            trailing: tripId != null && trip?['status'] == 'in_progress'
                                ? Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      IconButton(
                                        visualDensity: VisualDensity.compact,
                                        tooltip: text.boarded,
                                        icon: const Icon(Icons.login),
                                        onPressed: () => _sendEvent(tripId, sid, 'boarded'),
                                      ),
                                      IconButton(
                                        visualDensity: VisualDensity.compact,
                                        tooltip: text.dropped,
                                        icon: const Icon(Icons.check_circle_outline),
                                        onPressed: () => _sendEvent(tripId, sid, 'dropped'),
                                      ),
                                      IconButton(
                                        visualDensity: VisualDensity.compact,
                                        tooltip: text.noShow,
                                        icon: const Icon(Icons.cancel_outlined),
                                        onPressed: () => _sendEvent(tripId, sid, 'no_show'),
                                      ),
                                    ],
                                  )
                                : null,
                          );
                        }),
                    ],
                  ),
                );
              }),
            if (exceptions.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 6),
                child: Text(
                  '${text.exceptions}: ${exceptions.map((e) => (e as Map)['student_name']).join(', ')}',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ),
          ],
        ),
      ),
    );
  }

  String? _queuedState(String? tripId, String studentId) {
    if (tripId == null) return null;
    final matching = _offlineQueue
        .where((e) => e['trip_id'] == tripId && e['student_id'] == studentId)
        .toList();
    return matching.isEmpty ? null : matching.last['kind'] as String?;
  }

  Widget _buildParentView(
    BuildContext context,
    Map<String, dynamic> data,
    _TText text,
  ) {
    final children = (data['children'] as List<dynamic>? ?? const []);
    final today = data['date'] as String? ?? DateTime.now().toIso8601String().substring(0, 10);

    return RefreshIndicator(
      onRefresh: () async => _reload(),
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          for (final cRaw in children)
            Builder(builder: (context) {
              final c = Map<String, dynamic>.from(cRaw as Map);
              final assignment = c['assignment'] as Map<String, dynamic>?;
              final exceptions = (c['exceptions'] as List<dynamic>? ?? const []);
              final studentId = c['student_id'] as String;
              return Card(
                margin: const EdgeInsets.only(bottom: 12),
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '${c['student_name'] ?? ''}',
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      const SizedBox(height: 6),
                      if (assignment == null)
                        Text(text.notAssigned)
                      else ...[
                        Text('${assignment['route_name']} · ${assignment['stop_name']}'),
                        Text(
                          '${text.morning}: ${assignment['morning_time'] ?? '—'} · '
                          '${text.evening}: ${assignment['evening_time'] ?? '—'}',
                        ),
                        const SizedBox(height: 8),
                        OutlinedButton.icon(
                          icon: const Icon(Icons.no_transfer),
                          label: Text(text.noBusToday),
                          onPressed: () async {
                            try {
                              await ApiService.instance.post(
                                '/transport/exceptions',
                                data: {
                                  'student_id': studentId,
                                  'day': today,
                                  'direction': 'evening',
                                },
                              );
                              _reload();
                            } on DioException catch (err) {
                              if (context.mounted) {
                                final msg = (err.response?.data is Map
                                        ? (err.response!.data as Map)['detail']
                                        : null) ??
                                    '$err';
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(content: Text('$msg')),
                                );
                              }
                            }
                          },
                        ),
                        for (final excRaw in exceptions)
                          Builder(builder: (context) {
                            final exc = Map<String, dynamic>.from(excRaw as Map);
                            return ListTile(
                              dense: true,
                              contentPadding: EdgeInsets.zero,
                              title: Text('${exc['day']} (${exc['direction']})'),
                              trailing: IconButton(
                                icon: const Icon(Icons.delete_outline),
                                onPressed: () async {
                                  await ApiService.instance.delete('/transport/exceptions/${exc['id']}');
                                  _reload();
                                },
                              ),
                            );
                          }),
                      ],
                    ],
                  ),
                ),
              );
            }),
        ],
      ),
    );
  }
}

class _TText {
  final String code;
  const _TText(this.code);
  static _TText of(BuildContext context) =>
      _TText(Localizations.localeOf(context).languageCode);
  String pick(String ar, String fr, String en) =>
      code == 'ar' ? ar : (code == 'fr' ? fr : en);

  String get driverTitle => pick('رحلاتي لليوم', 'Trajets du jour', 'Bus runs');
  String get parentTitle => pick('النقل المدرسي', 'Transport scolaire', 'School transport');
  String get morning => pick('الصباح', 'Matin', 'Morning');
  String get evening => pick('المساء', 'Soir', 'Evening');
  String get noRoutes => pick('لا يوجد خط مسند', 'Aucune ligne attribuee', 'No routes assigned');
  String get startTrip => pick('بدء', 'Demarrer', 'Start');
  String get completeTrip => pick('إنهاء', 'Cloturer', 'Complete');
  String get completed => pick('مكتملة', 'Termine', 'Completed');
  String get boarded => pick('صعد', 'Monte', 'Boarded');
  String get dropped => pick('نزل', 'Depose', 'Dropped');
  String get noShow => pick('غائب', 'Absent', 'Absent');
  String get exceptions => pick('غيابات مُبلّغة', 'Absences signalees', 'Parent absences');
  String get offlineQueued => pick('تم الحفظ دون اتصال', 'Enregistre hors-ligne', 'Saved offline');
  String get forgottenTitle => pick('تنبيه تلميذ على الحافلة', 'Eleve non pointe', 'Unaccounted student');
  String forgottenBody(int count) => pick(
      '$count تلميذ مسجل في الصعود دون نزول. إغلاق وإشعار الإدارة؟',
      '$count eleve(s) monte(s) sans descente pointee. Cloturer et alerter l\'administration ?',
      '$count student(s) boarded without drop-off. Close and alert administration?');
  String get forceComplete => pick('إغلاق وتنبيه', 'Cloturer et alerter', 'Close & alert');
  String get cancel => pick('إلغاء', 'Annuler', 'Cancel');
  String syncQueue(int n) => pick('مزامنة ($n)', 'Synchroniser ($n)', 'Sync ($n)');
  String get notAssigned => pick('غير مسجل في النقل', 'Non inscrit au transport', 'Not assigned to bus');
  String get noBusToday => pick('لا حافلة هذا المساء', 'Pas de bus ce soir', 'No bus this evening');
}
