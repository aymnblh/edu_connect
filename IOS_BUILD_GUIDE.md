# Guide de build iOS

L'application est une app Vite enveloppee avec Capacitor pour iOS.

## Important

iOS n'utilise pas de fichier APK. Android utilise `.apk` ou `.aab`; iOS utilise un fichier `.ipa`.

Il faut un Mac avec Xcode pour generer et signer l'application iOS. Un Apple ID gratuit suffit pour lancer l'app sur simulateur et generalement sur un iPhone branche en mode developpement. TestFlight, l'App Store et les tests externes propres demandent un compte Apple Developer Program.

## Premiere installation sur le Mac

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

## Dans Xcode

1. Selectionne la target `App`.
2. Ouvre `Signing & Capabilities`.
3. Selectionne la team Apple.
4. Garde ou modifie le bundle identifier. Valeur actuelle: `dz.waseledu.app`.
5. Choisis un simulateur iPhone ou un iPhone branche.
6. Clique sur Run.

## Generer un IPA

Dans Xcode:

1. Selectionne `Any iOS Device`.
2. Va dans `Product > Archive`.
3. Dans Organizer, clique sur `Distribute App`.
4. Choisis TestFlight/App Store Connect, Ad Hoc ou Development selon le compte Apple et la methode de test.

## Apres une modification web

A chaque modification de l'app React/Vite:

```bash
cd edu_connect_web
npm run mobile:ios
```

Cette commande recompile l'app web, synchronise Capacitor et ouvre Xcode.
