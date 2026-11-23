# Guide de publication — Google Play Store & Apple App Store

Application mobile officielle : **WaselEdu** (Flutter native dans `edu_connect/`).
Identifiant unifie Android & iOS : **`dz.waseledu.app`**.

> Ne change jamais `dz.waseledu.app` apres la premiere publication sur Google Play ou App Store Connect.

---

## 1. Sauvegarde obligatoire de la cle Android

La cle de signature locale se trouve dans :

- `edu_connect/android/app/upload-keystore.jks`
- `edu_connect/android/key.properties`

Ces deux fichiers sont ignores par Git (`.gitignore`). Copie-les immediatement dans un coffre-fort prive hors du PC (gestionnaire de mots de passe + sauvegarde chiffree).

Pour generer l'encodage Base64 destine aux secrets GitHub Actions (PowerShell) :

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("edu_connect\android\app\upload-keystore.jks")) | Set-Clipboard
```

---

## 2. Build local Android (`.aab`) sur Windows

```powershell
cd edu_connect
.\scripts\build_android_release.ps1
```

Sorties :

- Bundle Play Store : `edu_connect/build/app/outputs/bundle/release/app-release.aab`
- Symboles d'obfuscation (a conserver pour dechiffrer les crashs) : `edu_connect/build/debug-info/`

A chaque nouvelle version envoyee sur les stores, incremente la version dans `edu_connect/pubspec.yaml` (`version: 1.0.0+1` -> `1.0.0+2`, etc.).

---

## 3. Publication automatisee (Android + iOS sans Mac) via GitHub Actions

Le workflow `.github/workflows/mobile-store-release.yml` compile l'app Android (`.aab`) sur Linux et l'app iOS (`.ipa`) sur macOS, puis peut les envoyer directement sur **Google Play** et **TestFlight / App Store Connect**.

### Secrets GitHub a configurer (`Settings > Secrets and variables > Actions`)

#### Commun (Android + iOS)

| Secret | Contenu |
| --- | --- |
| `MOBILE_PRODUCTION_CONFIG_JSON` | Contenu JSON complet de `edu_connect/config/production.json` (URL HTTPS/WSS de prod + cles Firebase si push active) |

#### Android (Google Play)

| Secret | Contenu |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | Fichier `upload-keystore.jks` encode en Base64 |
| `ANDROID_KEYSTORE_PASSWORD` | Valeur `storePassword` de `android/key.properties` |
| `ANDROID_KEY_PASSWORD` | Valeur `keyPassword` de `android/key.properties` |
| `ANDROID_KEY_ALIAS` | `upload` |
| `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` | Cle JSON du compte de service Google Cloud lie a Play Console *(requis uniquement quand `upload_to_stores=true`)* |

#### iOS (App Store / TestFlight)

| Secret | Contenu |
| --- | --- |
| `APPLE_TEAM_ID` | Identifiant d'equipe Apple Developer (10 caracteres) |
| `IOS_DIST_CERT_P12_BASE64` | Certificat *Apple Distribution* (`.p12`) encode en Base64 |
| `IOS_DIST_CERT_PASSWORD` | Mot de passe d'export du `.p12` |
| `IOS_PROVISIONING_PROFILE_BASE64` | Profil *App Store Distribution* pour `dz.waseledu.app` (`.mobileprovision`) encode en Base64 |
| `APP_STORE_CONNECT_API_KEY_ID` | ID de cle API App Store Connect *(requis pour `upload_to_stores=true`)* |
| `APP_STORE_CONNECT_API_ISSUER_ID` | Issuer ID App Store Connect *(requis pour `upload_to_stores=true`)* |
| `APP_STORE_CONNECT_API_KEY_P8_BASE64` | Fichier `AuthKey_<ID>.p8` encode en Base64 *(requis pour `upload_to_stores=true`)* |

> **Astuce sans Mac pour creer le certificat `.p12` Apple** : tu peux generer le CSR et la cle privee avec OpenSSL sur Windows (`openssl req -new -newkey rsa:2048 -nodes -keyout apple_dist.key -out apple_dist.csr`), uploader `apple_dist.csr` sur `developer.apple.com` pour obtenir `distribution.cer`, puis assembler le `.p12` avec :
> ```bash
> openssl x509 -in distribution.cer -inform DER -out distribution.pem -outform PEM
> openssl pkcs12 -export -inkey apple_dist.key -in distribution.pem -out distribution.p12
> ```

### Lancer une release

1. Ouvre GitHub -> onglet **Actions** -> **Mobile Store Release** -> **Run workflow**.
2. Premier essai : laisse `upload_to_stores = false` pour verifier que `.aab` et `.ipa` compilent et recuperer les artefacts.
3. Envoi sur les stores : passe `upload_to_stores = true` (`play_track = internal`, `play_release_status = draft` pour la toute premiere version Play Store).

---

## 4. Checklist fiches Stores (eviter les rejets)

- **Politique de confidentialite publique** : `https://<ton-domaine-web>/policies`
- **Suppression de compte** : deja integree dans l'ecran Profil de l'app (obligatoire Apple 5.1.1(v) et Google Play).
- **Acces pour les reviewers** : fournir un compte de test valide et signaler que le mode demo (*Decouvrir sans compte*) est accessible directement depuis l'ecran de connexion.
- **Public cible Google Play** : declarer **Parents / Adultes (18+ ou 13+)**, jamais « Enfants < 13 ans » (l'app est destinee aux parents et au personnel scolaire).
- **Modele economique (Apple 3.1.1)** : preciser dans les *App Review Notes* que WaselEdu est un SaaS B2B souscrit directement par les etablissements hors de l'application (aucun paiement dans l'app).
- **Moderation UGC (Apple 1.2)** : le signalement et le blocage sont actifs dans les discussions de classe et messages prives.
