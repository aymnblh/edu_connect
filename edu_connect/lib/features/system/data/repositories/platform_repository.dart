import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import '../../../../core/providers/dio_provider.dart';
import '../models/school_model.dart';

part 'platform_repository.g.dart';

class PlatformRepository {
  final Dio _dio;

  PlatformRepository(this._dio);

  Future<List<SchoolModel>> getSchools(String secret) async {
    final response = await _dio.get(
      '/platform/schools',
      options: Options(headers: {'X-Platform-Secret': secret}),
    );
    return (response.data as List).map((x) => SchoolModel.fromJson(x)).toList();
  }

  Future<void> addSubscriptionPayment({
    required String schoolId,
    required String secret,
    required double amount,
    required int monthsAdded,
    required String paymentMethod,
    String? notes,
  }) async {
    await _dio.post(
      '/platform/schools/$schoolId/subscription',
      options: Options(headers: {'X-Platform-Secret': secret}),
      data: {
        'amount': amount,
        'months_added': monthsAdded,
        'payment_method': paymentMethod,
        'notes': notes,
      },
    );
  }
}

@riverpod
PlatformRepository platformRepository(Ref ref) {
  return PlatformRepository(ref.watch(dioProvider));
}
