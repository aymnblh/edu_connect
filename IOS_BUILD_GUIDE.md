# Guide de build iOS

Le depot contient deux applications iOS possibles. Une seule doit etre publiee sur l'App Store:

| Application | Dossier | Bundle identifier |
| --- | --- | --- |
| Flutter (native) | `edu_connect/ios` | `com.educonnect.eduConnect` |
| Capacitor (app web enveloppee) | `edu_connect_web` (projet `ios/` a generer) | `dz.waseledu.app` |

Le bundle identifier ne peut plus changer apres la premiere publication: choisis-le avant le premier envoi vers App Store Connect.

## Application Flutter

Le projet iOS existe deja dans `edu_connect/ios`. La CI (`Flutter iOS build`) compile une version release non signee a chaque push.

Sur le Mac:

```bash
cd edu_connect
cp config/production.example.json config/production.json
```

Modifie `config/production.json` avec les vraies URL HTTPS/WSS de production, puis:

```bash
flutter pub get
dart run tool/validate_mobile_config.dart config/production.json
flutter build ipa --release --dart-define-from-file=config/production.json --export-options-plist=ios/ExportOptions.plist
```

Avant la premiere archive, ouvre `ios/Runner.xcworkspace` dans Xcode, selectionne la target `Runner`, puis choisis ta team Apple dans `Signing & Capabilities`.

L'IPA est genere dans `build/ios/ipa/`. Envoie-le avec l'app Transporter ou depuis Xcode Organizer vers TestFlight.

Limite connue: les notifications passent par une connexion WebSocket ntfy. iOS coupe cette connexion quand l'app est en arriere-plan, donc les notifications n'arrivent que lorsque l'app est ouverte. Les notifications push avec l'app fermee demandent APNs (par exemple via Firebase Cloud Messaging).

## Application Capacitor

L'app web Vite peut aussi etre enveloppee avec Capacitor pour iOS.

### Important

iOS n'utilise pas de fichier APK. Android utilise `.apk` ou `.aab`; iOS utilise un fichier `.ipa`.

Il faut un Mac avec Xcode pour generer et signer l'application iOS. Un Apple ID gratuit suffit pour lancer l'app sur simulateur et generalement sur un iPhone branche en mode developpement. TestFlight, l'App Store et les tests externes propres demandent un compte Apple Developer Program.

### Premiere installation sur le Mac

```bash
git clone https://github.com/aymnblh/edu_connect.git
cd edu_connect/edu_connect_web
npm ci
```

Cree le fichier d'environnement de production:

```bash
cp .env.production.example .env.production
```

Modifie `.env.production` et mets:

```text
VITE_API_BASE_URL=https://educonnect-api-xx60.onrender.com
```

Compile l'app web:

```bash
npm run build
```

Ajoute le projet iOS natif la premiere fois seulement:

```bash
npm run mobile:ios:add
```

Ouvre le projet iOS dans Xcode:

```bash
npm run mobile:ios
```

### Dans Xcode

1. Selectionne la target `App`.
2. Ouvre `Signing & Capabilities`.
3. Selectionne la team Apple.
4. Garde ou modifie le bundle identifier. Valeur actuelle: `dz.waseledu.app`.
5. Choisis un simulateur iPhone ou un iPhone branche.
6. Clique sur Run.

### Generer un IPA

Dans Xcode:

1. Selectionne `Any iOS Device`.
2. Va dans `Product > Archive`.
3. Dans Organizer, clique sur `Distribute App`.
4. Choisis TestFlight/App Store Connect, Ad Hoc ou Development selon le compte Apple et la methode de test.

### Apres une modification web

A chaque modification de l'app React/Vite:

```bash
cd edu_connect_web
npm run mobile:ios
```

Cette commande recompile l'app web, synchronise Capacitor et ouvre Xcode.
