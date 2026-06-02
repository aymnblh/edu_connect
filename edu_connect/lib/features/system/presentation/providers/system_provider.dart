import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/repositories/system_repository.dart';

final systemRepositoryProvider = Provider<SystemRepository>((ref) {
  return SystemRepository();
});

final systemSchoolsProvider =
    FutureProvider<List<Map<String, dynamic>>>((ref) async {
  final repo = ref.watch(systemRepositoryProvider);
  return repo.getSchools();
});
