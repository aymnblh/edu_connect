import 'package:riverpod_annotation/riverpod_annotation.dart';
import '../../data/models/school_model.dart';
import '../../data/repositories/platform_repository.dart';

part 'superadmin_provider.g.dart';

@riverpod
class SuperAdminSchools extends _$SuperAdminSchools {
  @override
  FutureOr<List<SchoolModel>> build() async {
    final repo = ref.read(platformRepositoryProvider);
    return repo.getSchools();
  }

  Future<void> addPayment({
    required String schoolId,
    required double amount,
    required int monthsAdded,
    required String paymentMethod,
    String? notes,
  }) async {
    final repo = ref.read(platformRepositoryProvider);
    await repo.addSubscriptionPayment(
      schoolId: schoolId,
      amount: amount,
      monthsAdded: monthsAdded,
      paymentMethod: paymentMethod,
      notes: notes,
    );
    ref.invalidateSelf();
  }
}
