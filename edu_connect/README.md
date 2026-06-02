# EduConnect Mobile

Flutter app for the EduConnect school SaaS. The mobile client uses the private EduConnect backend for auth, data, WebSockets, and local ntfy push topics.

## Stack

- Flutter + Material 3
- Riverpod + GoRouter
- Dio for REST API calls
- WebSocket channels for real-time chat and ntfy notifications
- Flutter secure storage for local JWT sessions
- French and Arabic UI support

## Local Run

1. Start the backend local stack from `edu_connect_backend`.
2. Pass local API URLs with `--dart-define` or use your IDE run configuration.
3. Install dependencies:

```bash
flutter pub get
flutter run
```

## Production Builds

Production builds must use stable HTTPS/WSS domains. The app refuses localhost, `.local`, placeholder domains, and temporary tunnel hosts when built in release mode or with `APP_ENV=production`.

1. Copy and edit the production Dart defines:

```bash
cp config/production.example.json config/production.json
```

2. Android Play Store bundle:

```bash
./scripts/build_android.sh
```

On Windows PowerShell:

```powershell
.\scripts\build_android_release.ps1
```

3. iOS App Store archive:

Run on macOS with Xcode signing configured:

```bash
./scripts/build_ios_release.sh
```

The iOS archive cannot be produced on Windows because Apple signing and Xcode archiving require macOS.

## Backend Contract

- Auth: `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`
- Profile: `GET /users/me`
- Push registration: `PATCH /users/me/push-token`
- Chat: backend WebSockets
- Notifications: in-app notifications plus private ntfy topics

## Notes

- No Firebase project is required.
- No cloud database is required.
- Offline and weak-network behavior relies on cached local session data and short network timeouts.
