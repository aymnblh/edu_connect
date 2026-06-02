import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import '../../data/models/school_model.dart';
import '../../data/repositories/platform_repository.dart';

part 'superadmin_provider.g.dart';

// Use a simple StateProvider for the secret so the user can input it once
final platformSecretProvider = StateProvider<String?>((ref) => null);

@riverpod
class SuperAdminSchools extends _$SuperAdminSchools {
  @override
  FutureOr<List<SchoolModel>> build() async {
    final secret = ref.watch(platformSecretProvider);
    if (secret == null || secret.isEmpty) return [];

    final repo = ref.read(platformRepositoryProvider);
    return await repo.getSchools(secret);
  }

  Future<void> addPayment({
    required String schoolId,
    required double amount,
    required int monthsAdded,
    required String paymentMethod,
    String? notes,
  }) async {
    final secret = ref.read(platformSecretProvider);
    if (secret == null) throw Exception("Clé secrète requise");

    final repo = ref.read(platformRepositoryProvider);
    await repo.addSubscriptionPayment(
      schoolId: schoolId,
      secret: secret,
      amount: amount,
      monthsAdded: monthsAdded,
      paymentMethod: paymentMethod,
      notes: notes,
    );

    // Refresh list
    ref.invalidateSelf();
  }
}
