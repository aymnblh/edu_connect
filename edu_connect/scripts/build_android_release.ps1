param(
    [string]$DartDefineFile = "config/production.json"
)

$ErrorActionPreference = "Stop"
$AabPath = "build/app/outputs/bundle/release/app-release.aab"

function Fail($Message) {
    Write-Error $Message
    exit 1
}

if (!(Test-Path $DartDefineFile)) {
    Fail "$DartDefineFile missing. Copy config/production.example.json to config/production.json and update it."
}
if (!(Test-Path "android/key.properties")) {
    Fail "android/key.properties missing. Copy android/key.properties.example."
}
if (!(Test-Path "android/app/upload-keystore.jks")) {
    Fail "android/app/upload-keystore.jks missing. Generate the upload keystore."
}
if ((Get-Content "android/key.properties" -Raw) -match "REPLACE_WITH_") {
    Fail "android/key.properties still contains placeholder values."
}

Write-Host "[INFO] Using Dart defines: $DartDefineFile"
flutter pub get
flutter analyze
flutter build appbundle --release --no-pub --dart-define-from-file="$DartDefineFile"

if (!(Test-Path $AabPath)) {
    Fail "AAB not found at $AabPath"
}

Write-Host "[INFO] Android production AAB ready: $AabPath"
