import '../../../../core/services/api_service.dart';

class SystemRepository {
  final ApiService _api = ApiService.instance;

  SystemRepository();

  Future<List<Map<String, dynamic>>> getSchools() async {
    try {
      final response = await _api.get('/system/schools');
      return List<Map<String, dynamic>>.from(response as List);
    } catch (e) {
      rethrow;
    }
  }

  Future<bool> activateSchool(String schoolId) async {
    try {
      await _api.post('/system/schools/$schoolId/activate', data: {});
      return true;
    } catch (e) {
      return false;
    }
  }

  Future<bool> deactivateSchool(String schoolId) async {
    try {
      await _api.post('/system/schools/$schoolId/deactivate', data: {});
      return true;
    } catch (e) {
      return false;
    }
  }

  Future<void> addPayment({
    required String schoolId,
    required double amount,
    required int monthsAdded,
    required String paymentMethod,
    String? notes,
  }) async {
    await _api.post(
      '/system/schools/$schoolId/subscription',
      data: {
        'amount': amount,
        'months_added': monthsAdded,
        'payment_method': paymentMethod,
        'notes': notes,
      },
    );
  }
}
