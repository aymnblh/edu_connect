import Flutter
import LocalAuthentication
import UIKit
import UserNotifications

@main
@objc class AppDelegate: FlutterAppDelegate {
  private var privacyBlurView: UIVisualEffectView?
  private let biometricAuthChannelName = "dz.waseledu.app/biometric_auth"

  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    if #available(iOS 10.0, *) {
      UNUserNotificationCenter.current().delegate = self
    }
    GeneratedPluginRegistrant.register(with: self)

    if let controller = window?.rootViewController as? FlutterViewController {
      let biometricChannel = FlutterMethodChannel(
        name: biometricAuthChannelName,
        binaryMessenger: controller.binaryMessenger
      )
      biometricChannel.setMethodCallHandler { [weak self] call, result in
        switch call.method {
        case "checkAvailability":
          result(self?.checkBiometricAvailability() ?? [
            "available": false,
            "biometricAvailable": false,
            "biometryType": "none",
          ])
        case "authenticate":
          let args = call.arguments as? [String: Any]
          let title = (args?["title"] as? String)?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
          let subtitle = (args?["subtitle"] as? String)?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
          let reason = !subtitle.isEmpty ? subtitle : (!title.isEmpty ? title : "Authenticate to access WaselEdu")
          self?.authenticateWithDevice(reason: reason, result: result)
        default:
          result(FlutterMethodNotImplemented)
        }
      }
    }

    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  private func checkBiometricAvailability() -> [String: Any] {
    let context = LAContext()
    var bioError: NSError?
    let biometricAvailable = context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &bioError)
    var deviceError: NSError?
    let deviceAvailable = context.canEvaluatePolicy(.deviceOwnerAuthentication, error: &deviceError)

    let biometryType: String
    if biometricAvailable {
      switch context.biometryType {
      case .faceID:
        biometryType = "faceId"
      case .touchID:
        biometryType = "touchId"
      default:
        if #available(iOS 17.0, *), context.biometryType == .opticID {
          biometryType = "faceId"
        } else {
          biometryType = "biometric"
        }
      }
    } else if deviceAvailable {
      biometryType = "deviceCredential"
    } else {
      biometryType = "none"
    }

    return [
      "available": deviceAvailable,
      "biometricAvailable": biometricAvailable,
      "biometryType": biometryType,
    ]
  }

  private func authenticateWithDevice(reason: String, result: @escaping FlutterResult) {
    let context = LAContext()
    context.evaluatePolicy(.deviceOwnerAuthentication, localizedReason: reason) { success, error in
      DispatchQueue.main.async {
        result([
          "authenticated": success,
          "message": error?.localizedDescription ?? "",
        ])
      }
    }
  }

  override func applicationWillResignActive(_ application: UIApplication) {
    showPrivacyShield()
    super.applicationWillResignActive(application)
  }

  override func applicationDidEnterBackground(_ application: UIApplication) {
    showPrivacyShield()
    super.applicationDidEnterBackground(application)
  }

  override func applicationDidBecomeActive(_ application: UIApplication) {
    hidePrivacyShield()
    super.applicationDidBecomeActive(application)
  }

  private func showPrivacyShield() {
    guard privacyBlurView == nil, let targetWindow = window else { return }
    let blurEffect = UIBlurEffect(style: .systemMaterial)
    let blurView = UIVisualEffectView(effect: blurEffect)
    blurView.frame = targetWindow.bounds
    blurView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    targetWindow.addSubview(blurView)
    privacyBlurView = blurView
  }

  private func hidePrivacyShield() {
    privacyBlurView?.removeFromSuperview()
    privacyBlurView = nil
  }
}
