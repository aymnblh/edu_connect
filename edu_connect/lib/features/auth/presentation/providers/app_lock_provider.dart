import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../../core/services/biometric_auth_service.dart';
import '../../data/models/user_model.dart';
import 'auth_provider.dart';

final biometricAuthServiceProvider = Provider<BiometricAuthService>((ref) {
  return BiometricAuthService();
});

class AppLockState {
  final bool isReady;
  final bool enabled;
  final BiometricAvailability availability;
  final bool isLocked;
  final bool isAuthenticating;
  final String? errorMessage;
  final bool hasAutoPrompted;

  const AppLockState({
    this.isReady = false,
    this.enabled = true,
    this.availability = BiometricAvailability.unavailable,
    this.isLocked = false,
    this.isAuthenticating = false,
    this.errorMessage,
    this.hasAutoPrompted = false,
  });

  AppLockState copyWith({
    bool? isReady,
    bool? enabled,
    BiometricAvailability? availability,
    bool? isLocked,
    bool? isAuthenticating,
    String? errorMessage,
    bool clearError = false,
    bool? hasAutoPrompted,
  }) {
    return AppLockState(
      isReady: isReady ?? this.isReady,
      enabled: enabled ?? this.enabled,
      availability: availability ?? this.availability,
      isLocked: isLocked ?? this.isLocked,
      isAuthenticating: isAuthenticating ?? this.isAuthenticating,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
      hasAutoPrompted: hasAutoPrompted ?? this.hasAutoPrompted,
    );
  }
}

class AppLockNotifier extends StateNotifier<AppLockState> {
  static const String _enabledPrefKey = 'biometric_lock_enabled';

  final Ref _ref;
  final BiometricAuthService _service;
  final Duration lockGraceDuration;
  final DateTime Function() _now;
  DateTime? _backgroundedAt;

  AppLockNotifier(
    this._ref,
    this._service, {
    this.lockGraceDuration = const Duration(seconds: 60),
    DateTime Function()? now,
  })  : _now = now ?? DateTime.now,
        super(const AppLockState()) {
    _ref.listen<AsyncValue<UserModel?>>(authNotifierProvider, (prev, next) {
      _onAuthChanged(prev?.valueOrNull, next.valueOrNull);
    });
    unawaited(_init());
  }

  Future<void> _init() async {
    bool enabled = true;
    try {
      final prefs = await SharedPreferences.getInstance();
      final stored = prefs.getBool(_enabledPrefKey);
      if (stored != null) {
        enabled = stored;
      }
    } catch (_) {
      enabled = true;
    }

    final availability = await _service.checkAvailability();
    if (!mounted) return;

    final user = _ref.read(authNotifierProvider).valueOrNull;
    final restoredFromCache = _ref.read(sessionRestoredFromCacheProvider);
    final shouldLockOnStart = user != null &&
        !user.isDemo &&
        restoredFromCache &&
        enabled &&
        availability.available;

    state = state.copyWith(
      isReady: true,
      enabled: enabled,
      availability: availability,
      isLocked: shouldLockOnStart,
      clearError: true,
      hasAutoPrompted: false,
    );
  }

  void _onAuthChanged(UserModel? prevUser, UserModel? nextUser) {
    if (nextUser == null || nextUser.isDemo) {
      _backgroundedAt = null;
      if (state.isLocked || state.errorMessage != null || state.hasAutoPrompted) {
        state = state.copyWith(
          isLocked: false,
          clearError: true,
          hasAutoPrompted: false,
        );
      }
      return;
    }

    // User signed in or restored from cache.
    if (prevUser == null || prevUser.id != nextUser.id) {
      final restoredFromCache = _ref.read(sessionRestoredFromCacheProvider);
      if (restoredFromCache &&
          state.isReady &&
          state.enabled &&
          state.availability.available) {
        state = state.copyWith(
          isLocked: true,
          clearError: true,
          hasAutoPrompted: false,
        );
      } else if (!restoredFromCache && state.isLocked) {
        state = state.copyWith(
          isLocked: false,
          clearError: true,
          hasAutoPrompted: false,
        );
      }
    }
  }

  bool _shouldProtectCurrentUser() {
    final user = _ref.read(authNotifierProvider).valueOrNull;
    return user != null &&
        !user.isDemo &&
        state.isReady &&
        state.enabled &&
        state.availability.available;
  }

  void onAppPaused() {
    if (state.isAuthenticating || !_shouldProtectCurrentUser()) return;
    _backgroundedAt ??= _now();
  }

  void onAppResumed() {
    if (state.isAuthenticating) return;
    final pausedAt = _backgroundedAt;
    _backgroundedAt = null;
    if (pausedAt == null || !_shouldProtectCurrentUser()) return;

    final elapsed = _now().difference(pausedAt);
    if (elapsed >= lockGraceDuration && !state.isLocked) {
      state = state.copyWith(
        isLocked: true,
        clearError: true,
        hasAutoPrompted: false,
      );
    }
  }

  void lockNow() {
    if (!_shouldProtectCurrentUser()) return;
    state = state.copyWith(
      isLocked: true,
      clearError: true,
      hasAutoPrompted: false,
    );
  }

  Future<bool> authenticate({
    required String title,
    required String subtitle,
    String? failureMessage,
  }) async {
    if (state.isAuthenticating) return false;
    state = state.copyWith(
      isAuthenticating: true,
      hasAutoPrompted: true,
      clearError: true,
    );

    try {
      final result = await _service.authenticate(
        title: title,
        subtitle: subtitle,
      );
      if (!mounted) return result.authenticated;

      if (result.authenticated) {
        _backgroundedAt = null;
        state = state.copyWith(
          isLocked: false,
          isAuthenticating: false,
          clearError: true,
        );
        return true;
      }

      state = state.copyWith(
        isAuthenticating: false,
        errorMessage: failureMessage ??
            (result.message != null && result.message!.isNotEmpty
                ? result.message
                : null),
      );
      return false;
    } catch (_) {
      if (mounted) {
        state = state.copyWith(
          isAuthenticating: false,
          errorMessage: failureMessage,
        );
      }
      return false;
    }
  }

  Future<bool> setEnabled(
    bool nextEnabled, {
    required String title,
    required String subtitle,
  }) async {
    if (state.isAuthenticating) return false;
    if (!state.availability.available) return false;
    if (state.enabled == nextEnabled) return true;

    state = state.copyWith(isAuthenticating: true, clearError: true);
    try {
      final result = await _service.authenticate(
        title: title,
        subtitle: subtitle,
      );
      if (!mounted) return false;

      if (!result.authenticated) {
        state = state.copyWith(isAuthenticating: false);
        return false;
      }

      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool(_enabledPrefKey, nextEnabled);
      if (!mounted) return false;

      state = state.copyWith(
        enabled: nextEnabled,
        isAuthenticating: false,
        isLocked: nextEnabled ? state.isLocked : false,
        clearError: true,
      );
      return true;
    } catch (_) {
      if (mounted) {
        state = state.copyWith(isAuthenticating: false);
      }
      return false;
    }
  }
}

final appLockProvider =
    StateNotifierProvider<AppLockNotifier, AppLockState>((ref) {
  return AppLockNotifier(ref, ref.watch(biometricAuthServiceProvider));
});
