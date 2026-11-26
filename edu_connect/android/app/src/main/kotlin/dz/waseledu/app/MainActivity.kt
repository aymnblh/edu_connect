package dz.waseledu.app

import android.app.Activity
import android.app.KeyguardManager
import android.content.Context
import android.content.Intent
import android.hardware.biometrics.BiometricManager
import android.hardware.biometrics.BiometricPrompt
import android.os.Build
import android.os.Bundle
import android.os.CancellationSignal
import android.view.WindowManager
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    private val screenSecurityChannel = "dz.waseledu.app/screen_security"
    private val biometricAuthChannel = "dz.waseledu.app/biometric_auth"
    private val deviceCredentialRequestCode = 9042
    private var pendingBiometricResult: MethodChannel.Result? = null
    private var activeCancellationSignal: CancellationSignal? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // Android 12+: hide non-system overlay windows while this activity is in the foreground.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            try {
                window.setHideOverlayWindows(true)
            } catch (_: SecurityException) {
                // Ignore if platform denies overlay hiding.
            }
        }
    }

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, screenSecurityChannel)
            .setMethodCallHandler { call, result ->
                when (call.method) {
                    "setSecureScreen" -> {
                        val secure = call.argument<Boolean>("secure") ?: false
                        runOnUiThread {
                            if (secure) {
                                window.addFlags(WindowManager.LayoutParams.FLAG_SECURE)
                            } else {
                                window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)
                            }
                        }
                        result.success(null)
                    }
                    else -> result.notImplemented()
                }
            }

        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, biometricAuthChannel)
            .setMethodCallHandler { call, result ->
                when (call.method) {
                    "checkAvailability" -> result.success(checkBiometricAvailability())
                    "authenticate" -> {
                        val title = call.argument<String>("title")?.trim().orEmpty()
                            .ifEmpty { "WaselEdu" }
                        val subtitle = call.argument<String>("subtitle")?.trim().orEmpty()
                        authenticateWithDevice(title, subtitle, result)
                    }
                    else -> result.notImplemented()
                }
            }
    }

    private fun checkBiometricAvailability(): Map<String, Any> {
        val keyguardManager = getSystemService(Context.KEYGUARD_SERVICE) as? KeyguardManager
        val deviceSecure = keyguardManager?.isDeviceSecure == true

        var biometricAvailable = false
        var available = deviceSecure

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            val biometricManager = getSystemService(BiometricManager::class.java)
            if (biometricManager != null) {
                val bioAuthenticators =
                    BiometricManager.Authenticators.BIOMETRIC_STRONG or
                        BiometricManager.Authenticators.BIOMETRIC_WEAK
                val anyAuthenticators =
                    bioAuthenticators or BiometricManager.Authenticators.DEVICE_CREDENTIAL
                biometricAvailable =
                    biometricManager.canAuthenticate(bioAuthenticators) ==
                        BiometricManager.BIOMETRIC_SUCCESS
                available =
                    biometricManager.canAuthenticate(anyAuthenticators) ==
                        BiometricManager.BIOMETRIC_SUCCESS
            }
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val biometricManager = getSystemService(BiometricManager::class.java)
            if (biometricManager != null) {
                @Suppress("DEPRECATION")
                biometricAvailable =
                    biometricManager.canAuthenticate() == BiometricManager.BIOMETRIC_SUCCESS
                available = biometricAvailable || deviceSecure
            }
        }

        val biometryType = when {
            biometricAvailable -> "biometric"
            available -> "deviceCredential"
            else -> "none"
        }

        return mapOf(
            "available" to available,
            "biometricAvailable" to biometricAvailable,
            "biometryType" to biometryType,
        )
    }

    private fun authenticateWithDevice(
        title: String,
        subtitle: String,
        result: MethodChannel.Result,
    ) {
        if (pendingBiometricResult != null) {
            result.success(mapOf("authenticated" to false, "reason" to "in_progress"))
            return
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            pendingBiometricResult = result
            val cancellationSignal = CancellationSignal()
            activeCancellationSignal = cancellationSignal

            try {
                val builder = BiometricPrompt.Builder(this).setTitle(title)
                if (subtitle.isNotEmpty()) {
                    builder.setSubtitle(subtitle)
                }
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    builder.setAllowedAuthenticators(
                        BiometricManager.Authenticators.BIOMETRIC_STRONG or
                            BiometricManager.Authenticators.BIOMETRIC_WEAK or
                            BiometricManager.Authenticators.DEVICE_CREDENTIAL,
                    )
                } else {
                    @Suppress("DEPRECATION")
                    builder.setDeviceCredentialAllowed(true)
                }

                builder.build().authenticate(
                    cancellationSignal,
                    mainExecutor,
                    object : BiometricPrompt.AuthenticationCallback() {
                        override fun onAuthenticationSucceeded(
                            authResult: BiometricPrompt.AuthenticationResult?,
                        ) {
                            completePendingBiometric(mapOf("authenticated" to true))
                        }

                        override fun onAuthenticationError(
                            errorCode: Int,
                            errString: CharSequence?,
                        ) {
                            completePendingBiometric(
                                mapOf(
                                    "authenticated" to false,
                                    "errorCode" to errorCode,
                                    "message" to (errString?.toString() ?: ""),
                                ),
                            )
                        }

                        override fun onAuthenticationFailed() {
                            // Keep the system prompt open so the user can retry.
                        }
                    },
                )
            } catch (e: Exception) {
                completePendingBiometric(
                    mapOf(
                        "authenticated" to false,
                        "message" to (e.message ?: "Biometric authentication failed"),
                    ),
                )
            }
            return
        }

        val keyguardManager = getSystemService(Context.KEYGUARD_SERVICE) as? KeyguardManager
        @Suppress("DEPRECATION")
        val intent = keyguardManager?.createConfirmDeviceCredentialIntent(
            title,
            subtitle.ifEmpty { null },
        )
        if (intent != null) {
            pendingBiometricResult = result
            @Suppress("DEPRECATION")
            startActivityForResult(intent, deviceCredentialRequestCode)
        } else {
            result.success(mapOf("authenticated" to false, "reason" to "unavailable"))
        }
    }

    private fun completePendingBiometric(payload: Map<String, Any?>) {
        val pending = pendingBiometricResult ?: return
        pendingBiometricResult = null
        activeCancellationSignal = null
        runOnUiThread {
            pending.success(payload)
        }
    }

    @Suppress("DEPRECATION")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == deviceCredentialRequestCode) {
            completePendingBiometric(mapOf("authenticated" to (resultCode == Activity.RESULT_OK)))
        }
    }

    override fun onDestroy() {
        activeCancellationSignal?.cancel()
        completePendingBiometric(mapOf("authenticated" to false, "reason" to "cancelled"))
        super.onDestroy()
    }
}
