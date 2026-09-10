import 'dart:io';

import 'package:edu_connect/core/theme/app_theme.dart';
import 'package:edu_connect/features/auth/presentation/screens/login_screen.dart';
import 'package:edu_connect/features/system/presentation/providers/system_provider.dart';
import 'package:edu_connect/features/system/presentation/screens/superadmin_dashboard_screen.dart';
import 'package:edu_connect/l10n/app_localizations.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('iOS project includes CocoaPods and foreground notification setup', () {
    final debugConfig = File('ios/Flutter/Debug.xcconfig').readAsStringSync();
    final releaseConfig =
        File('ios/Flutter/Release.xcconfig').readAsStringSync();
    final appDelegate = File('ios/Runner/AppDelegate.swift').readAsStringSync();

    expect(debugConfig, contains('Pods-Runner.debug.xcconfig'));
    expect(releaseConfig, contains('Pods-Runner.release.xcconfig'));
    expect(
        appDelegate, contains('UNUserNotificationCenter.current().delegate'));
  });

  test('every modal bottom sheet opts into the iOS safe area', () {
    final lib = Directory('lib');
    for (final file in lib
        .listSync(recursive: true)
        .whereType<File>()
        .where((file) => file.path.endsWith('.dart'))) {
      final source = file.readAsStringSync();
      final sheetCount = 'showModalBottomSheet('.allMatches(source).length;
      if (sheetCount == 0) continue;

      expect(
        'useSafeArea: true'.allMatches(source).length,
        greaterThanOrEqualTo(sheetCount),
        reason: '${file.path} has an unsafe modal bottom sheet',
      );
    }
  });

  testWidgets('login stays usable on a small iPhone with large text',
      (tester) async {
    debugDefaultTargetPlatformOverride = TargetPlatform.iOS;
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(320, 568);
    addTearDown(() {
      debugDefaultTargetPlatformOverride = null;
      tester.view.resetDevicePixelRatio();
      tester.view.resetPhysicalSize();
    });

    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp(
          locale: const Locale('fr'),
          localizationsDelegates: const [
            AppLocalizations.delegate,
            GlobalMaterialLocalizations.delegate,
            GlobalWidgetsLocalizations.delegate,
            GlobalCupertinoLocalizations.delegate,
          ],
          supportedLocales: AppLocalizations.supportedLocales,
          theme: AppTheme.getTheme(const Locale('fr')),
          builder: (context, child) => MediaQuery(
            data: MediaQuery.of(context).copyWith(
              textScaler: const TextScaler.linear(1.8),
            ),
            child: child!,
          ),
          home: const LoginScreen(),
        ),
      ),
    );
    await tester.pump(const Duration(milliseconds: 700));
    debugDefaultTargetPlatformOverride = null;

    expect(tester.takeException(), isNull);
    expect(find.byType(SingleChildScrollView), findsOneWidget);
    expect(find.byType(TextFormField), findsNWidgets(2));
    expect(find.byType(ElevatedButton), findsOneWidget);
  });

  testWidgets('superadmin metrics fit a small iPhone with large text',
      (tester) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(320, 568);
    addTearDown(() {
      tester.view.resetDevicePixelRatio();
      tester.view.resetPhysicalSize();
    });

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          systemSchoolsProvider.overrideWith((ref) async => [
                {
                  'id': 'school-1',
                  'name': 'Etablissement de validation',
                  'is_active': true,
                  'student_count': 125,
                  'user_count': 148,
                  'class_count': 8,
                },
              ]),
        ],
        child: MaterialApp(
          locale: const Locale('fr'),
          theme: AppTheme.getTheme(const Locale('fr')),
          builder: (context, child) => MediaQuery(
            data: MediaQuery.of(context).copyWith(
              textScaler: const TextScaler.linear(1.8),
            ),
            child: child!,
          ),
          home: const SuperAdminDashboardScreen(),
        ),
      ),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));

    expect(tester.takeException(), isNull);
    expect(find.byType(GridView), findsOneWidget);
  });
}
