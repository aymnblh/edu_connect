import Flutter
import UIKit
import UserNotifications

@main
@objc class AppDelegate: FlutterAppDelegate {
  private var privacyBlurView: UIVisualEffectView?

  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    if #available(iOS 10.0, *) {
      UNUserNotificationCenter.current().delegate = self
    }
    GeneratedPluginRegistrant.register(with: self)
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
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
