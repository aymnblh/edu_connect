import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import '../../../../core/providers/dio_provider.dart';
import '../models/analytics_overview.dart';

part 'analytics_repository.g.dart';

class AnalyticsRepository {
  final Dio _dio;

  AnalyticsRepository(this._dio);

  Future<AnalyticsOverview> getOverview() async {
    final response = await _dio.get('/admin/analytics/overview');
    return AnalyticsOverview.fromJson(response.data);
  }
}

@riverpod
AnalyticsRepository analyticsRepository(Ref ref) {
  return AnalyticsRepository(ref.watch(dioProvider));
}
