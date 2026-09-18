import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import '../../../../core/providers/dio_provider.dart';
import '../models/school_model.dart';

part 'platform_repository.g.dart';

class PlatformRepository {
  final Dio _dio;

  PlatformRepository(this._dio);

  Future<List<SchoolModel>> getSchools() async {
    final response = await _dio.get('/platform/schools');
    return (response.data as List).map((x) => SchoolModel.fromJson(x)).toList();
  }

  Future<Map<String, dynamic>> createSchool(String name) async {
    final response = await _dio.post('/admin/schools', data: {'name': name});
    return response.data as Map<String, dynamic>;
  }

  Future<void> activateSchool(String schoolId) async {
    await _dio.post('/system/schools/$schoolId/activate');
  }

  Future<void> deactivateSchool(String schoolId) async {
    await _dio.post('/system/schools/$schoolId/deactivate');
  }

  Future<void> addSubscriptionPayment({
    required String schoolId,
    required double amount,
    required int monthsAdded,
    required String paymentMethod,
    String? notes,
  }) async {
    await _dio.post(
      '/platform/schools/$schoolId/subscription',
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
