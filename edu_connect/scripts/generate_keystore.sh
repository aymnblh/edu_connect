#!/usr/bin/env bash
# ============================================================================
# EduConnect — Android keystore generator
#
# Run ONCE on a secure machine. Store the output files securely offline.
#
# Usage:
#   chmod +x scripts/generate_keystore.sh
#   ./scripts/generate_keystore.sh
# ============================================================================
set -euo pipefail

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

KEYSTORE_PATH="android/app/upload-keystore.jks"
KEY_ALIAS="upload"

command -v keytool >/dev/null 2>&1 || error "keytool not found. Install Java JDK first."

if [[ -f "$KEYSTORE_PATH" ]]; then
    warn "Keystore already exists at $KEYSTORE_PATH"
    read -p "Overwrite? This will break existing Play Store uploads! [y/N] " confirm
    [[ "$confirm" =~ ^[Yy]$ ]] || { info "Aborted."; exit 0; }
fi

info "Generating Android upload keystore..."
info "You will be asked for keystore password, key password, and identity info."
echo ""

keytool -genkey -v \
    -keystore "$KEYSTORE_PATH" \
    -storetype JKS \
    -keyalg RSA \
    -keysize 2048 \
    -validity 10000 \
    -alias "$KEY_ALIAS"

echo ""
info "Keystore generated at: $KEYSTORE_PATH"
info ""
info "Now create android/key.properties:"
echo ""
echo "storePassword=<THE_STORE_PASSWORD_YOU_JUST_SET>"
echo "keyPassword=<THE_KEY_PASSWORD_YOU_JUST_SET>"
echo "keyAlias=${KEY_ALIAS}"
echo "storeFile=app/upload-keystore.jks"
echo ""
warn "CRITICAL BACKUP CHECKLIST:"
warn "  1. Copy $KEYSTORE_PATH to an encrypted USB drive"
warn "  2. Copy $KEYSTORE_PATH to encrypted cloud storage"
warn "  3. Write both passwords in your password manager"
warn "  4. Add $KEYSTORE_PATH and android/key.properties to .gitignore"
warn ""
warn "Loss of this keystore = you CANNOT update your app on the Play Store."
