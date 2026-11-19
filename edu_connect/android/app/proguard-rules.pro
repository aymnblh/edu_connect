# Keep Flutter embedding and plugin reflection targets intact under R8
-keep class io.flutter.app.** { *; }
-keep class io.flutter.plugin.** { *; }
-keep class io.flutter.util.** { *; }
-keep class io.flutter.view.** { *; }
-keep class io.flutter.** { *; }
-keep class io.flutter.plugins.** { *; }
-dontwarn io.flutter.embedding.**

# Keep Tink / EncryptedSharedPreferences (flutter_secure_storage)
-keep class com.google.crypto.tink.** { *; }
-keep class androidx.security.crypto.** { *; }

# Keep Firebase Messaging
-keep class com.google.firebase.messaging.** { *; }
-keep class io.flutter.plugins.firebase.messaging.** { *; }

# Keep Mobile Scanner / ML Kit barcode models
-keep class dev.steenbakker.mobile_scanner.** { *; }
-keep class com.google.mlkit.** { *; }

# Strip verbose debug logs in release builds
-assumenosideeffects class android.util.Log {
    public static int v(...);
    public static int d(...);
}
