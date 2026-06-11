# Guide de build Android

L'application Android est generee avec Capacitor a partir du front Vite.

## Formats

- `.apk`: pratique pour installer et tester directement sur un telephone Android.
- `.aab`: format demande pour publier sur Google Play Store.

## Premiere installation

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

## Ouvrir Android Studio

Si le dossier `android` existe deja:

```bash
npm run mobile:android
```

Si le dossier `android` n'existe pas encore:

```bash
npm run build
npm run mobile:android:add
npm run mobile:android
```

Android Studio va s'ouvrir sur le projet natif.

## Generer un APK de test

Dans Android Studio:

1. Ouvre le dossier `edu_connect_web/android`.
2. Attends la synchronisation Gradle.
3. Va dans `Build > Build Bundle(s) / APK(s) > Build APK(s)`.
4. L'APK debug sera genere dans:

```text
edu_connect_web/android/app/build/outputs/apk/debug/app-debug.apk
```

Cet APK sert aux tests internes. Il ne faut pas l'utiliser pour publier sur Play Store.

En ligne de commande, apres installation du SDK Android:

```bash
cd edu_connect_web/android
./gradlew assembleDebug
```

Sur Windows:

```powershell
cd edu_connect_web\android
.\gradlew.bat assembleDebug
```

Si Gradle indique que le SDK est introuvable, ouvre le projet une premiere fois avec Android Studio ou cree `android/local.properties` avec:

```text
sdk.dir=/chemin/vers/Android/Sdk
```

## Generer un AAB pour Play Store

Dans Android Studio:

1. Va dans `Build > Generate Signed Bundle / APK`.
2. Choisis `Android App Bundle`.
3. Cree ou selectionne une cle de signature.
4. Choisis `release`.
5. Genere le fichier `.aab`.

Le fichier sera dans:

```text
edu_connect_web/android/app/build/outputs/bundle/release/
```

## Apres une modification web

A chaque modification du front:

```bash
cd edu_connect_web
npm run mobile:android
```

Cette commande recompile l'app web, synchronise Capacitor et ouvre Android Studio.

## Notes de publication

Pour publier sur Play Store, il faudra aussi preparer:

- nom public de l'application
- icone Android finale
- screenshots telephone
- politique de confidentialite publique
- compte Google Play Console
- cle de signature conservee en lieu sur
