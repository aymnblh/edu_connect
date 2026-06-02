import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/services/api_service.dart';
import '../../data/models/child_model.dart';

// ── Repository ────────────────────────────────────────────────────────────────

class ChildrenRepository {
  final ApiService _api = ApiService.instance;

  /// Fetch all children linked to the current parent account.
  Future<List<ChildModel>> getMyChildren() async {
    final data = await _api.get('/users/students/me') as List<dynamic>;
    return data
        .map((e) => ChildModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }
}

// ── Provider: list of children ────────────────────────────────────────────────

final childrenRepositoryProvider =
    Provider<ChildrenRepository>((_) => ChildrenRepository());

final myChildrenProvider = FutureProvider<List<ChildModel>>((ref) {
  return ref.watch(childrenRepositoryProvider).getMyChildren();
});

// ── Provider: currently selected child ───────────────────────────────────────

class SelectedChildNotifier extends StateNotifier<ChildModel?> {
  SelectedChildNotifier() : super(null);

  /// Called once the children list is loaded — auto-selects the first child.
  void initWithChildren(List<ChildModel> children) {
    if (state == null && children.isNotEmpty) {
      state = children.first;
    }
  }

  void select(ChildModel child) => state = child;

  void clear() => state = null;
}

final selectedChildProvider =
    StateNotifierProvider<SelectedChildNotifier, ChildModel?>(
        (_) => SelectedChildNotifier());
