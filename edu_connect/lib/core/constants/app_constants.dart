class AppConstants {
  AppConstants._();

  /// Release-safe defaults. Local/dev builds should override these at build
  /// time with --dart-define.
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://api.educonnect.local',
  );
  static const String wsBaseUrl = String.fromEnvironment(
    'WS_BASE_URL',
    defaultValue: 'wss://api.educonnect.local',
  );
  static const String ntfyBaseUrl = String.fromEnvironment(
    'NTFY_BASE_URL',
    defaultValue: 'https://ntfy.educonnect.local',
  );
  static const String ntfyWsBaseUrl = String.fromEnvironment(
    'NTFY_WS_BASE_URL',
    defaultValue: 'wss://ntfy.educonnect.local',
  );
  static const String appEnv = String.fromEnvironment(
    'APP_ENV',
    defaultValue: 'development',
  );

  static const String roleTeacher = 'teacher';
  static const String roleParent = 'parent';

  static const Duration shortAnimation = Duration(milliseconds: 200);
  static const Duration mediumAnimation = Duration(milliseconds: 350);
  static const Duration longAnimation = Duration(milliseconds: 500);

  static const int joinCodeLength = 6;
}
