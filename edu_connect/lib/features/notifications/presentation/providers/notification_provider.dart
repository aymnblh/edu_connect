import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/repositories/notification_repository.dart';
import '../../data/models/notification_model.dart';

final notificationsProvider =
    FutureProvider<List<NotificationModel>>((ref) async {
  return ref.watch(notificationRepositoryProvider).getNotifications();
});

class NotificationNotifier
    extends StateNotifier<AsyncValue<List<NotificationModel>>> {
  final NotificationRepository _repo;

  NotificationNotifier(this._repo) : super(const AsyncValue.loading());

  Future<void> load() async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() => _repo.getNotifications());
  }

  Future<void> markRead(String id) async {
    await _repo.markAsRead(id);
    load(); // Refresh list
  }

  Future<void> markAllRead() async {
    await _repo.markAllAsRead();
    load();
  }
}

final notificationNotifierProvider = StateNotifierProvider<NotificationNotifier,
    AsyncValue<List<NotificationModel>>>((ref) {
  final repo = ref.watch(notificationRepositoryProvider);
  return NotificationNotifier(repo)..load();
});

final unreadNotificationsCountProvider = Provider<int>((ref) {
  final notifications =
      ref.watch(notificationNotifierProvider).asData?.value ?? [];
  return notifications.where((n) => !n.isRead).length;
});
