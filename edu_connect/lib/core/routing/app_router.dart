// No material.dart needed — GoRouter handles navigation without it
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../features/auth/presentation/providers/auth_provider.dart';
import '../../features/auth/presentation/screens/splash_screen.dart';
import '../../features/auth/presentation/screens/login_screen.dart';
import '../../features/auth/presentation/screens/legal_policies_screen.dart';
import '../../features/auth/presentation/screens/profile_screen.dart';
import '../../features/auth/presentation/screens/login_code_screen.dart';
import '../../features/auth/presentation/screens/complete_profile_screen.dart';
import '../../features/class/presentation/screens/class_list_screen.dart';
import '../../features/class/presentation/screens/create_class_screen.dart';
import '../../features/class/presentation/screens/join_class_screen.dart';
import '../../features/chat/presentation/screens/chat_screen.dart';
import '../../features/attendance/presentation/screens/mark_attendance_screen.dart';
import '../../features/attendance/presentation/screens/class_attendance_history_screen.dart';
import '../../features/attendance/presentation/screens/student_attendance_screen.dart';
import '../../features/grades/presentation/screens/grades_list_screen.dart';
import '../../features/remarks/presentation/screens/remarks_list_screen.dart';
import '../../features/homework/presentation/screens/homework_list_screen.dart';
import '../../features/lessons/presentation/screens/lesson_diary_screen.dart';
import '../../features/grades/presentation/screens/grade_bulletin_screen.dart';
import '../../features/notifications/presentation/screens/notifications_screen.dart';
import '../../features/class/presentation/screens/admin_tools_screen.dart';
import '../../features/class/presentation/screens/course_library_screen.dart';
import '../../features/class/presentation/screens/linking_hub_screen.dart';
import '../../features/class/presentation/screens/qr_scanner_screen.dart';
import '../../features/auth/presentation/screens/school_registration_screen.dart';
import '../../features/auth/presentation/screens/set_password_screen.dart';
import '../../features/class/presentation/screens/student_management_screen.dart';
import '../../features/auth/presentation/screens/subscription_expired_screen.dart';
import '../../features/system/presentation/screens/superadmin_dashboard_screen.dart';
import '../../features/messaging/presentation/screens/conversations_list_screen.dart';
import '../../features/messaging/presentation/screens/dm_thread_screen.dart';
import '../../features/messaging/data/models/conversation_model.dart';
import '../../features/schedule/presentation/screens/schedule_screen.dart';
import '../../features/system/presentation/screens/director_dashboard_screen.dart';
import '../../features/class/presentation/screens/class_management_screen.dart';

final appRouterProvider = Provider<GoRouter>((ref) {
  final authStateNotifier = ValueNotifier(ref.read(authNotifierProvider));

  ref.listen(authNotifierProvider, (_, next) {
    authStateNotifier.value = next;
  });

  return GoRouter(
    initialLocation: '/splash',
    refreshListenable: authStateNotifier,
    redirect: (context, state) {
      final authState = authStateNotifier.value;
      final isLoading = authState.isLoading;
      final hasError = authState.hasError;
      final isLoggedIn = authState.valueOrNull != null;
      final location = state.matchedLocation;

      // Auth routes that don't require being logged in
      // ⚠️ Must be defined BEFORE the loading check so we don't redirect
      // the user to /splash while they're in the middle of logging in.
      final isAuthRoute = location == '/login' ||
          location == '/register' ||
          location == '/splash' ||
          location == '/set-password' ||
          location == '/login-code' ||
          location == '/complete-profile' ||
          location == '/policies' ||
          location == '/create-school';

      // During initial startup loading, protect only non-auth routes.
      // Never redirect /login → /splash, otherwise a login click gets stuck.
      if (isLoading && !isAuthRoute) return '/splash';

      // Auth finished (data or error) — leave the splash screen
      if (!isLoading && location == '/splash') {
        if (hasError) return '/login';
        if (isLoggedIn) {
          final user = authState.valueOrNull;
          if (user?.isSystemAdmin ?? false) return '/superadmin';
          if (user?.isAdmin ?? false) return '/dashboard';
          return '/classes';
        }
        return '/login';
      }

      // Protect authenticated routes when not logged in
      if (!isLoading && !isLoggedIn && !isAuthRoute) return '/login';

      // Redirect already-logged-in users away from auth screens
      if (!isLoading &&
          isLoggedIn &&
          (location == '/login' ||
              location == '/register' ||
              location == '/create-school')) {
        final user = authState.valueOrNull;
        if (user?.isSystemAdmin ?? false) return '/superadmin';
        if (user?.isAdmin ?? false) return '/dashboard';
        return '/classes';
      }

      if (!isLoading &&
          isLoggedIn &&
          location.startsWith('/admin-tools') &&
          !(authState.valueOrNull?.isAdmin ?? false)) {
        return '/classes';
      }

      return null;
    },
    routes: [
      GoRoute(
        path: '/dashboard',
        builder: (context, state) => const DirectorDashboardScreen(),
      ),
      GoRoute(
        path: '/class/:classId/manage',
        name: 'manage-class',
        builder: (ctx, state) {
          final classId = state.pathParameters['classId']!;
          return ClassManagementScreen(classId: classId);
        },
      ),
      GoRoute(
        path: '/school-registration',
        builder: (context, state) => const SchoolRegistrationScreen(),
      ),
      GoRoute(
        path: '/create-school',
        name: 'create-school',
        builder: (ctx, state) => const SchoolRegistrationScreen(),
      ),
      GoRoute(
        path: '/superadmin',
        name: 'superadmin',
        builder: (ctx, state) => const SuperAdminDashboardScreen(),
      ),
      GoRoute(
        path: '/set-password',
        name: 'set-password',
        builder: (ctx, state) {
          final email = state.extra as String? ?? '';
          return SetPasswordScreen(email: email);
        },
      ),
      GoRoute(
        path: '/splash',
        name: 'splash',
        builder: (ctx, state) => const SplashScreen(),
      ),
      GoRoute(
        path: '/login',
        name: 'login',
        builder: (ctx, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/policies',
        name: 'policies',
        builder: (ctx, state) => const LegalPoliciesScreen(),
      ),
      GoRoute(
        path: '/login-code',
        name: 'login-code',
        builder: (ctx, state) => const LoginCodeScreen(),
      ),
      GoRoute(
        path: '/complete-profile',
        name: 'complete-profile',
        builder: (ctx, state) {
          final extra = state.extra as Map<String, dynamic>? ?? {};
          return CompleteProfileScreen(extraData: extra);
        },
      ),
      GoRoute(
        path: '/register',
        name: 'register',
        // Registration is invite-only — accounts are created by the principal.
        // Redirect anyone who lands here back to login.
        redirect: (ctx, state) => '/login',
        builder: (ctx, state) =>
            const LoginScreen(), // unreachable but required
      ),
      GoRoute(
        path: '/classes',
        name: 'classes',
        builder: (ctx, state) => const ClassListScreen(),
      ),
      GoRoute(
        path: '/create-class',
        name: 'create-class',
        redirect: (ctx, state) {
          final user = ref.read(authNotifierProvider).valueOrNull;
          if (user != null && !user.isAdmin) return '/classes';
          return null;
        },
        builder: (ctx, state) => const CreateClassScreen(),
      ),
      GoRoute(
        path: '/join-class',
        name: 'join-class',
        builder: (ctx, state) => const JoinClassScreen(),
      ),
      GoRoute(
        path: '/class/:classId/chat',
        name: 'chat',
        builder: (ctx, state) {
          final classId = state.pathParameters['classId']!;
          return ChatScreen(classId: classId);
        },
      ),
      GoRoute(
        path: '/class/:classId/attendance',
        name: 'attendance',
        builder: (ctx, state) {
          final classId = state.pathParameters['classId']!;
          return MarkAttendanceScreen(classId: classId);
        },
      ),
      GoRoute(
        path: '/class/:classId/attendance-history',
        name: 'attendance-history',
        builder: (ctx, state) {
          final classId = state.pathParameters['classId']!;
          return ClassAttendanceHistoryScreen(classId: classId);
        },
      ),
      GoRoute(
        path: '/class/:classId/student-attendance',
        name: 'student-attendance',
        builder: (ctx, state) {
          final classId = state.pathParameters['classId']!;
          return StudentAttendanceScreen(classId: classId);
        },
      ),
      GoRoute(
        path: '/class/:classId/grades',
        name: 'grades',
        builder: (ctx, state) {
          final classId = state.pathParameters['classId']!;
          return GradesListScreen(classId: classId);
        },
      ),
      GoRoute(
        path: '/class/:classId/grades/bulletin',
        name: 'grade-bulletin',
        builder: (ctx, state) {
          final classId = state.pathParameters['classId']!;
          final studentId = state.uri.queryParameters['studentId'];
          return GradeBulletinScreen(classId: classId, studentId: studentId);
        },
      ),
      GoRoute(
        path: '/class/:classId/remarks',
        name: 'remarks',
        builder: (ctx, state) {
          final classId = state.pathParameters['classId']!;
          return RemarksListScreen(classId: classId);
        },
      ),
      GoRoute(
        path: '/class/:classId/homework',
        name: 'homework',
        builder: (ctx, state) {
          final classId = state.pathParameters['classId']!;
          return HomeworkListScreen(classId: classId);
        },
      ),
      GoRoute(
        path: '/class/:classId/lessons',
        name: 'lessons',
        builder: (ctx, state) {
          final classId = state.pathParameters['classId']!;
          return LessonDiaryScreen(classId: classId);
        },
      ),
      GoRoute(
        path: '/admin-tools',
        name: 'admin-tools',
        builder: (ctx, state) => const AdminToolsScreen(),
        routes: [
          GoRoute(
            path: 'courses',
            name: 'manage-courses',
            builder: (ctx, state) => const CourseLibraryScreen(),
          ),
          GoRoute(
            path: 'students',
            name: 'manage-students',
            builder: (ctx, state) => const StudentManagementScreen(),
          ),
        ],
      ),
      GoRoute(
        path: '/subscription-expired',
        name: 'subscription-expired',
        builder: (ctx, state) => const SubscriptionExpiredScreen(),
      ),
      GoRoute(
        path: '/notifications',
        name: 'notifications',
        builder: (ctx, state) => const NotificationsScreen(),
      ),
      GoRoute(
        path: '/profile',
        name: 'profile',
        builder: (ctx, state) => const ProfileScreen(),
      ),
      GoRoute(
        path: '/linking-hub',
        name: 'linking-hub',
        builder: (ctx, state) => const LinkingHubScreen(),
      ),
      GoRoute(
        path: '/scan-qr',
        name: 'scan-qr',
        builder: (ctx, state) => const QrScannerScreen(),
      ),
      GoRoute(
        path: '/messaging',
        name: 'messaging',
        builder: (ctx, state) => const ConversationsListScreen(),
      ),
      GoRoute(
        path: '/messaging/:convId',
        name: 'dm-thread',
        builder: (ctx, state) {
          final convId = state.pathParameters['convId']!;
          final conv = state.extra as ConversationModel?;
          return DmThreadScreen(conversationId: convId, conversation: conv);
        },
      ),
      GoRoute(
        path: '/class/:classId/schedule',
        name: 'schedule',
        builder: (ctx, state) {
          final classId = state.pathParameters['classId']!;
          final className = state.uri.queryParameters['name'] ?? 'Classe';
          return ScheduleScreen(classId: classId, className: className);
        },
      ),
    ],
  );
});
