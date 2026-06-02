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

info "Using Dart defines: $DART_DEFINE_FILE"
flutter pub get
flutter analyze

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
