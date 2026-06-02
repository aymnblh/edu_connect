import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/services/api_service.dart';
import '../../data/models/user_model.dart';
import '../../data/repositories/auth_repository.dart';

// ── Repository provider ────────────────────────────────────────────────────
final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository();
});

// ── Auth notifier ──────────────────────────────────────────────────────────
class AuthNotifier extends StateNotifier<AsyncValue<UserModel?>> {
  final AuthRepository _repo;
  bool _handlingUnauthorized = false;

  AuthNotifier(this._repo, Ref ref) : super(const AsyncValue.loading()) {
    ApiService.unauthorizedEvents.addListener(_handleUnauthorized);
    ref.onDispose(() {
      ApiService.unauthorizedEvents.removeListener(_handleUnauthorized);
    });
    _init();
  }

  void _handleUnauthorized() {
    if (_handlingUnauthorized || state.valueOrNull == null) return;
    _handlingUnauthorized = true;
    state = const AsyncValue.data(null);
    unawaited(_repo.signOut().whenComplete(() {
      _handlingUnauthorized = false;
    }));
  }

  Future<void> _init() async {
    try {
      final user = await _repo.getCachedUser();
      if (user != null) {
        // ✅ Show cached data IMMEDIATELY — router unblocks, splash disappears
        state = AsyncValue.data(user);
        // Background refresh: don't await, never block the UI
        _repo.refreshToken().then((success) {
          if (!success && !_repo.lastFailWasNetwork) {
            // Server explicitly rejected the token (e.g. 401) — log out
            if (mounted) state = const AsyncValue.data(null);
          }
        });
      } else {
        state = const AsyncValue.data(null);
      }
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<bool> registerSchool({
    required String schoolName,
    required String adminName,
    required String adminEmail,
    required String adminPassword,
    required bool termsAccepted,
  }) async {
    // No state change yet, as we stay on the success screen or login.
    return _repo.registerSchool(
      schoolName: schoolName,
      adminName: adminName,
      adminEmail: adminEmail,
      adminPassword: adminPassword,
      termsAccepted: termsAccepted,
    );
  }

  Future<void> login({required String email, required String password}) async {
    state = const AsyncValue.loading();
    try {
      final user = await _repo.login(email: email, password: password);
      state = AsyncValue.data(user);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      rethrow;
    }
  }

  Future<void> register({
    required String email,
    required String password,
    required String name,
    required UserRole role,
  }) async {
    state = const AsyncValue.loading();
    try {
      final user = await _repo.register(
        email: email,
        password: password,
        name: name,
        role: role.name,
      );
      state = AsyncValue.data(user);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      rethrow;
    }
  }

  Future<void> signOut() async {
    // BUG FIX: await the server revocation BEFORE clearing local state.
    // The previous unawaited() meant the refresh token could remain valid
    // on the server if the request was still in-flight when the app closed.
    try {
      await _repo.signOut();
    } catch (_) {
      // Network failure during logout is acceptable — clear locally anyway.
    } finally {
      state = const AsyncValue.data(null);
    }
  }

  Future<void> deleteAccount() async {
    // Delete account from backend API if needed locally.
    // For now, we clear the session.
    await _repo.signOut();
    state = const AsyncValue.data(null);
  }

  /// Reloads the cached user from storage and updates the auth state.
  /// Called after code-based registration to update the router.
  Future<void> checkAuth() async {
    try {
      final user = await _repo.getCachedUser();
      if (mounted) state = AsyncValue.data(user);
    } catch (e, st) {
      if (mounted) state = AsyncValue.error(e, st);
    }
  }

  /// Directly sets a logged-in user (e.g., after invite-based registration).
  void setUser(UserModel user) {
    state = AsyncValue.data(user);
  }
}

final authNotifierProvider =
    StateNotifierProvider<AuthNotifier, AsyncValue<UserModel?>>((ref) {
  return AuthNotifier(ref.watch(authRepositoryProvider), ref);
});

// Deprecated providers cleaned up
final currentUserProvider = Provider<UserModel?>((ref) {
  return ref.watch(authNotifierProvider).valueOrNull;
});
