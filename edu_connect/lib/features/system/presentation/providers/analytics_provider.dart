import 'package:riverpod_annotation/riverpod_annotation.dart';
import '../../data/models/analytics_overview.dart';
import '../../data/repositories/analytics_repository.dart';

part 'analytics_provider.g.dart';

@riverpod
class AnalyticsOverviewState extends _$AnalyticsOverviewState {
  @override
  FutureOr<AnalyticsOverview> build() async {
    return _fetchOverview();
  }

  Future<AnalyticsOverview> _fetchOverview() async {
    final repo = ref.read(analyticsRepositoryProvider);
    return await repo.getOverview();
  }

  Future<void> refresh() async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() => _fetchOverview());
  }
}
