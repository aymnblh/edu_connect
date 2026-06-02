import '../../../../core/services/api_service.dart';
import '../models/notification_model.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class NotificationRepository {
  final ApiService _api;

  NotificationRepository(this._api);

  Future<List<NotificationModel>> getNotifications() async {
    final response = await _api.dio.get('/notifications/');
    return (response.data as List)
        .map((e) => NotificationModel.fromJson(e))
        .toList();
  }

  Future<void> markAsRead(String id) async {
    await _api.dio.patch('/notifications/$id/read');
  }

  Future<void> markAllAsRead() async {
    await _api.dio.post('/notifications/mark-all-read');
  }
}

final notificationRepositoryProvider = Provider<NotificationRepository>((ref) {
  final api = ref.watch(apiServiceProvider);
  return NotificationRepository(api);
});
