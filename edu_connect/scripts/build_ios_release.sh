#!/usr/bin/env bash
# EduConnect iOS production build.
#
# Run this on macOS with Xcode installed and Apple signing configured.
#
# Usage:
#   cp config/production.example.json config/production.json
#   chmod +x scripts/build_ios_release.sh
#   ./scripts/build_ios_release.sh
#
# Optional:
#   DART_DEFINE_FILE=config/staging.json ./scripts/build_ios_release.sh

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

info() { echo -e "${GREEN}[INFO]${NC} $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

DART_DEFINE_FILE="${DART_DEFINE_FILE:-config/production.json}"
IPA_DIR="build/ios/ipa"

[[ "$(uname -s)" == "Darwin" ]] || error "iOS archives must be built on macOS."
[[ -f "$DART_DEFINE_FILE" ]] || error "$DART_DEFINE_FILE missing. Copy config/production.example.json and update it."
command -v flutter >/dev/null 2>&1 || error "flutter not found in PATH."
command -v xcodebuild >/dev/null 2>&1 || error "xcodebuild not found. Install Xcode."
command -v pod >/dev/null 2>&1 || error "CocoaPods not found. Install it before archiving."
command -v plutil >/dev/null 2>&1 || error "plutil not found. Install the Xcode command-line tools."

info "Using Dart defines: $DART_DEFINE_FILE"
flutter pub get
dart run tool/validate_mobile_config.dart "$DART_DEFINE_FILE"
flutter analyze
flutter test --no-pub

info "Validating Apple project files..."
plutil -lint ios/Runner/Info.plist
if [[ -f "ios/ExportOptions.plist" ]]; then
  plutil -lint ios/ExportOptions.plist
fi

info "Installing CocoaPods dependencies..."
(
  cd ios
  pod install
)
xcodebuild -workspace ios/Runner.xcworkspace -scheme Runner -list >/dev/null

BUILD_ARGS=(
  build ipa
  --release
  --no-pub
  --dart-define-from-file="$DART_DEFINE_FILE"
)

if [[ -f "ios/ExportOptions.plist" ]]; then
  BUILD_ARGS+=(--export-options-plist=ios/ExportOptions.plist)
fi

flutter "${BUILD_ARGS[@]}"

[[ -d "$IPA_DIR" ]] || error "IPA output directory not found at $IPA_DIR"
info "iOS production archive output: $IPA_DIR"
