#!/usr/bin/env bash
# EduConnect Android production build.
#
# Usage:
#   cp config/production.example.json config/production.json
#   chmod +x scripts/build_android.sh
#   ./scripts/build_android.sh
#
# Optional:
#   DART_DEFINE_FILE=config/staging.json ./scripts/build_android.sh

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

info() { echo -e "${GREEN}[INFO]${NC} $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

DART_DEFINE_FILE="${DART_DEFINE_FILE:-config/production.json}"
AAB_PATH="build/app/outputs/bundle/release/app-release.aab"

[[ -f "$DART_DEFINE_FILE" ]] || error "$DART_DEFINE_FILE missing. Copy config/production.example.json and update it."
[[ -f "android/key.properties" ]] || error "android/key.properties missing. Copy android/key.properties.example."
[[ -f "android/app/upload-keystore.jks" ]] || error "android/app/upload-keystore.jks missing. Generate the upload keystore."
command -v flutter >/dev/null 2>&1 || error "flutter not found in PATH."

if grep -q "REPLACE_WITH_" android/key.properties; then
  error "android/key.properties still contains placeholder values."
fi

info "Using Dart defines: $DART_DEFINE_FILE"
flutter pub get
flutter analyze

flutter build appbundle \
  --release \
  --no-pub \
  --dart-define-from-file="$DART_DEFINE_FILE"

[[ -f "$AAB_PATH" ]] || error "AAB not found at $AAB_PATH"
info "Android production AAB ready: $AAB_PATH"
