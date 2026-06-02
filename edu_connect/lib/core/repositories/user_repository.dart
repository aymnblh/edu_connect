import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/api_service.dart';
import '../../features/auth/data/models/user_model.dart';

class UserRepository {
  final ApiService _api = ApiService.instance;

  Future<UserModel> createProfile({
    required String id,
    required String email,
    required String fullName,
    required String role,
    String? phone,
  }) async {
    final data = await _api.post('/users/', data: {
      'id': id,
      'email': email,
      'full_name': fullName,
      'role': role,
      if (phone != null) 'phone': phone,
    });
    return UserModel.fromJson(data as Map<String, dynamic>);
  }

  Future<UserModel> getMe() async {
    final data = await _api.get('/users/me');
    return UserModel.fromJson(data as Map<String, dynamic>);
  }

  Future<UserModel> updateMe({String? phone, String? avatarUrl}) async {
    final data = await _api.put('/users/me', data: {
      if (phone != null) 'phone': phone,
      if (avatarUrl != null) 'avatar_url': avatarUrl,
    });
    return UserModel.fromJson(data as Map<String, dynamic>);
  }

  Future<void> registerPushToken(String token) async {
    await _api.patch('/users/me/push-token', data: {'push_token': token});
  }
}

final userRepositoryProvider =
    Provider<UserRepository>((ref) => UserRepository());
