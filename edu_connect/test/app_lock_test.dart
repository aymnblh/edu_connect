import 'package:edu_connect/core/services/biometric_auth_service.dart';
import 'package:edu_connect/core/theme/app_theme.dart';
import 'package:edu_connect/core/widgets/app_lock_gate.dart';
import 'package:edu_connect/features/auth/data/models/user_model.dart';
import 'package:edu_connect/features/auth/data/repositories/auth_repository.dart';
import 'package:edu_connect/features/auth/presentation/providers/app_lock_provider.dart';
import 'package:edu_connect/features/auth/presentation/providers/auth_provider.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

class _FakeBiometricAuthService extends BiometricAuthService {
  BiometricAvailability availability;
  bool nextAuthResult;
  int authenticateCalls = 0;

  _FakeBiometricAuthService({
    this.availability = const BiometricAvailability(
      available: true,
      biometricAvailable: true,
      biometryType: BiometryType.faceId,
    ),
    this.nextAuthResult = true,
  });

  @override
  Future<BiometricAvailability> checkAvailability() async => availability;

  @override
  Future<BiometricAuthResult> authenticate({
    required String title,
    required String subtitle,
  }) async {
    authenticateCalls++;
    return BiometricAuthResult(
      authenticated: nextAuthResult,
      message: nextAuthResult ? null : 'Cancelled',
    );
  }
}

class _FakeAuthRepository extends AuthRepository {
  UserModel? cachedUser;
  int signOutCalls = 0;

  _FakeAuthRepository({this.cachedUser});

  @override
  Future<UserModel?> getCachedUser() async => cachedUser;

  @override
  Future<bool> refreshToken() async => true;

  @override
  Future<void> signOut() async {
    signOutCalls++;
    cachedUser = null;
  }
}

UserModel _makeUser({bool isDemo = false, UserRole role = UserRole.parent}) {
  return UserModel(
    id: isDemo ? 'demo-1' : 'user-1',
    email: isDemo ? 'demo@ecole.dz' : 'parent@ecole.dz',
    fullName: isDemo ? 'Compte Démo' : 'Amine Parent',
    schoolId: 'school-1',
    role: role,
    createdAt: DateTime.utc(2026, 1, 1),
    isDemo: isDemo,
  );
}

Widget _buildLockHarness({
  required _FakeAuthRepository repo,
  required _FakeBiometricAuthService bioService,
  Duration graceDuration = const Duration(seconds: 60),
  DateTime Function()? now,
}) {
  return ProviderScope(
    overrides: [
      authRepositoryProvider.overrideWithValue(repo),
      biometricAuthServiceProvider.overrideWithValue(bioService),
      appLockProvider.overrideWith((ref) {
        return AppLockNotifier(
          ref,
          bioService,
          lockGraceDuration: graceDuration,
          now: now,
        );
      }),
    ],
    child: MaterialApp(
      locale: const Locale('fr'),
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      supportedLocales: const [Locale('fr'), Locale('en'), Locale('ar')],
      theme: AppTheme.getTheme(const Locale('fr')),
      home: const AppLockGate(
        child: Scaffold(
          body: Center(child: Text('Secret Dashboard')),
        ),
      ),
    ),
  );
}

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  testWidgets('cold start with cached user locks and unlocks on biometric success',
      (tester) async {
    final repo = _FakeAuthRepository(cachedUser: _makeUser());
    final bio = _FakeBiometricAuthService(nextAuthResult: true);

    await tester.pumpWidget(_buildLockHarness(repo: repo, bioService: bio));
    await tester.pumpAndSettle();

    expect(bio.authenticateCalls, greaterThanOrEqualTo(1));
    expect(find.text('Secret Dashboard'), findsOneWidget);
    expect(find.text('Accès protégé'), findsNothing);
  });

  testWidgets('failed biometric keeps app locked with retry and sign-out',
      (tester) async {
    final repo = _FakeAuthRepository(cachedUser: _makeUser());
    final bio = _FakeBiometricAuthService(nextAuthResult: false);

    await tester.pumpWidget(_buildLockHarness(repo: repo, bioService: bio));
    await tester.pumpAndSettle();

    expect(find.text('Accès protégé'), findsOneWidget);
    expect(find.text('Secret Dashboard'), findsNothing);
    expect(find.text('Déverrouiller avec Face ID'), findsOneWidget);
    expect(find.text('Changer de compte / Se déconnecter'), findsOneWidget);

    // Retry succeeds.
    bio.nextAuthResult = true;
    await tester.tap(find.text('Déverrouiller avec Face ID'));
    await tester.pumpAndSettle();

    expect(find.text('Secret Dashboard'), findsOneWidget);
    expect(find.text('Accès protégé'), findsNothing);
  });

  testWidgets('fresh interactive login does not lock immediately',
      (tester) async {
    final repo = _FakeAuthRepository(cachedUser: null);
    final bio = _FakeBiometricAuthService(nextAuthResult: true);

    await tester.pumpWidget(_buildLockHarness(repo: repo, bioService: bio));
    await tester.pumpAndSettle();

    final container = ProviderScope.containerOf(
      tester.element(find.text('Secret Dashboard')),
    );
    container.read(authNotifierProvider.notifier).setUser(_makeUser());
    await tester.pumpAndSettle();

    expect(bio.authenticateCalls, 0);
    expect(find.text('Secret Dashboard'), findsOneWidget);
    expect(find.text('Accès protégé'), findsNothing);
  });

  testWidgets('demo user never triggers biometric lock', (tester) async {
    final repo = _FakeAuthRepository(cachedUser: _makeUser(isDemo: true));
    final bio = _FakeBiometricAuthService(nextAuthResult: false);

    await tester.pumpWidget(_buildLockHarness(repo: repo, bioService: bio));
    await tester.pumpAndSettle();

    expect(bio.authenticateCalls, 0);
    expect(find.text('Secret Dashboard'), findsOneWidget);
    expect(find.text('Accès protégé'), findsNothing);
  });

  testWidgets('device without biometrics skips lock gracefully',
      (tester) async {
    final repo = _FakeAuthRepository(cachedUser: _makeUser());
    final bio = _FakeBiometricAuthService(
      availability: BiometricAvailability.unavailable,
    );

    await tester.pumpWidget(_buildLockHarness(repo: repo, bioService: bio));
    await tester.pumpAndSettle();

    expect(bio.authenticateCalls, 0);
    expect(find.text('Secret Dashboard'), findsOneWidget);
  });

  testWidgets('background resume locks only after grace period expires',
      (tester) async {
    DateTime currentTime = DateTime.utc(2026, 11, 26, 12, 0, 0);
    final repo = _FakeAuthRepository(cachedUser: _makeUser());
    final bio = _FakeBiometricAuthService(nextAuthResult: true);

    await tester.pumpWidget(_buildLockHarness(
      repo: repo,
      bioService: bio,
      graceDuration: const Duration(seconds: 60),
      now: () => currentTime,
    ));
    await tester.pumpAndSettle();

    final container = ProviderScope.containerOf(
      tester.element(find.text('Secret Dashboard')),
    );
    final lockNotifier = container.read(appLockProvider.notifier);

    // Short pause (30s) should NOT lock.
    lockNotifier.onAppPaused();
    currentTime = currentTime.add(const Duration(seconds: 30));
    lockNotifier.onAppResumed();
    await tester.pumpAndSettle();
    expect(container.read(appLockProvider).isLocked, isFalse);

    // Long pause (65s) should lock.
    bio.nextAuthResult = false;
    lockNotifier.onAppPaused();
    currentTime = currentTime.add(const Duration(seconds: 65));
    lockNotifier.onAppResumed();
    await tester.pumpAndSettle();
    expect(container.read(appLockProvider).isLocked, isTrue);
    expect(find.text('Accès protégé'), findsOneWidget);
  });
}
