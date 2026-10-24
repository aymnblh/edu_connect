import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/services/api_service.dart';

class AnnouncementModel {
  final String id;
  final String title;
  final String body;
  final String category;
  final DateTime? startsOn;
  final DateTime? endsOn;
  final bool wholeSchool;
  final List<String> classIds;
  final String? authorName;
  final DateTime createdAt;
  final bool isRead;
  final int? readCount;
  final int? recipientCount;

  const AnnouncementModel({
    required this.id,
    required this.title,
    required this.body,
    required this.category,
    this.startsOn,
    this.endsOn,
    required this.wholeSchool,
    required this.classIds,
    this.authorName,
    required this.createdAt,
    required this.isRead,
    this.readCount,
    this.recipientCount,
  });

  /// The server only sends read counts to the author and school admins.
  bool get canManage => readCount != null;

  static DateTime? _day(Object? value) =>
      value is String ? DateTime.tryParse(value) : null;

  factory AnnouncementModel.fromJson(Map<String, dynamic> json) {
    return AnnouncementModel(
      id: json['id'] as String,
      title: json['title'] as String,
      body: json['body'] as String,
      category: json['category'] as String? ?? 'announcement',
      startsOn: _day(json['starts_on']),
      endsOn: _day(json['ends_on']),
      wholeSchool: json['whole_school'] as bool? ?? false,
      classIds: (json['class_ids'] as List<dynamic>? ?? const [])
          .map((e) => e as String)
          .toList(),
      authorName: json['author_name'] as String?,
      createdAt: DateTime.parse(json['created_at'] as String),
      isRead: json['is_read'] as bool? ?? false,
      readCount: json['read_count'] as int?,
      recipientCount: json['recipient_count'] as int?,
    );
  }
}

String _isoDay(DateTime day) =>
    '${day.year.toString().padLeft(4, '0')}-${day.month.toString().padLeft(2, '0')}-${day.day.toString().padLeft(2, '0')}';

class AnnouncementRepository {
  final ApiService _api = ApiService.instance;

  Future<List<AnnouncementModel>> list() async {
    final data = await _api.get('/announcements/') as List<dynamic>;
    return data
        .map((e) => AnnouncementModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<void> markRead(String id) async {
    await _api.post('/announcements/$id/read');
  }

  Future<void> delete(String id) async {
    await _api.delete('/announcements/$id');
  }

  Future<void> create({
    required String title,
    required String body,
    required String category,
    DateTime? startsOn,
    DateTime? endsOn,
    required bool wholeSchool,
    required List<String> classIds,
  }) async {
    await _api.post('/announcements/', data: {
      'title': title,
      'body': body,
      'category': category,
      'starts_on': startsOn == null ? null : _isoDay(startsOn),
      'ends_on': endsOn == null ? null : _isoDay(endsOn),
      'whole_school': wholeSchool,
      'class_ids': wholeSchool ? <String>[] : classIds,
    });
  }
}

final announcementRepositoryProvider =
    Provider<AnnouncementRepository>((ref) => AnnouncementRepository());

final announcementsProvider =
    FutureProvider.autoDispose<List<AnnouncementModel>>((ref) {
  return ref.watch(announcementRepositoryProvider).list();
});
