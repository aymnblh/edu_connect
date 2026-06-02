# Déploiement gratuit pour test

Ce guide sert à partager une version de test avec une école ou quelques personnes.
Ce n'est pas une configuration de production finale.

## Choix recommandé

- API FastAPI + PostgreSQL + Redis: Render Free.
- Frontend React/Vite: Vercel Hobby.
- Swagger API: `https://<ton-api>.onrender.com/docs`.

Références vérifiées le 2 juin 2026:

- Render propose des web services gratuits, mais ils dorment après 15 minutes sans trafic et redémarrent à la prochaine requête.
- Render donne 750 heures gratuites par workspace et par mois pour les web services gratuits.
- Render Blueprints permet de créer un service, une base Postgres, un cache Key Value et des variables générées.
- Vercel Hobby est gratuit pour les projets personnels/non commerciaux avec des limites d'usage.
- Supabase Free reste une alternative Postgres gratuite: 500 MB de base par projet, pause après une semaine d'inactivité.

## 1. Préparer les clés JWT

Depuis `edu_connect_backend`:

```powershell
python manage.py generate-keys --output render-secrets
```

Ensuite, garde ces deux fichiers localement:

- `edu_connect_backend/render-secrets/private_key.pem`
- `edu_connect_backend/render-secrets/public_key.pem`

Le dossier `render-secrets/` est ignoré par Git.

## 2. Déployer l'API sur Render

1. Va sur Render, puis `New` -> `Blueprint`.
2. Choisis le repo GitHub `aymnblh/edu_connect`.
3. Render lit le fichier `render.yaml`.
4. Quand Render demande les variables `sync: false`, colle:
   - `PRIVATE_KEY`: contenu complet de `private_key.pem`
   - `PUBLIC_KEY`: contenu complet de `public_key.pem`
   - `CORS_ORIGINS`: mets temporairement l'URL prévue du frontend, par exemple `https://edu-connect-web.vercel.app`
5. Lance le déploiement.

Après le déploiement, note l'URL API:

```text
https://<ton-service>.onrender.com
```

Teste:

```text
https://<ton-service>.onrender.com/health
https://<ton-service>.onrender.com/docs
```

## 3. Déployer le frontend sur Vercel

1. Va sur Vercel, puis `Add New Project`.
2. Importe le repo GitHub.
3. Root Directory: `edu_connect_web`.
4. Framework: Vite.
5. Build Command: `npm run build`.
6. Output Directory: `dist`.
7. Ajoute la variable d'environnement:

```text
VITE_API_BASE_URL=https://<ton-service>.onrender.com
```

8. Déploie.

Après le déploiement, note l'URL frontend:

```text
https://<ton-frontend>.vercel.app
```

## 4. Corriger CORS après avoir l'URL Vercel

Dans Render, ouvre le service `educonnect-api`, puis `Environment`.

Mets:

```text
CORS_ORIGINS=https://<ton-frontend>.vercel.app
```

Si tu veux aussi tester en local:

```text
CORS_ORIGINS=https://<ton-frontend>.vercel.app,http://localhost:5173,http://127.0.0.1:5173
```

Sauvegarde et redéploie l'API.

## 5. Créer des données de test

Quand l'API est en ligne, la base Render est vide. Il faut donc créer au moins:

- un compte directeur,
- une école active,
- une classe,
- un enseignant,
- des élèves,
- quelques notes avec coefficients.

Pour débloquer immédiatement la connexion SuperAdmin, ouvre le service API sur Render, puis `Shell`, et lance:

```bash
SUPERADMIN_EMAIL=system.admin@demo.educonnect.dz \
SUPERADMIN_PASSWORD='Demo2026!' \
SUPERADMIN_NAME='Admin Demo' \
python create_superadmin.py
```

Tu peux ensuite te connecter sur le frontend avec:

```text
system.admin@demo.educonnect.dz
Demo2026!
```

Pour une démo rapide, le script local `edu_connect_backend/scripts/seed_demo_presentation_data.py` peut servir de base, mais il doit être lancé contre une base de test seulement.

## Dépannage login après déploiement

Si le frontend affiche seulement `Erreur de connexion`:

1. Ouvre l'API Render: `https://<ton-api>.onrender.com/health`.
2. Ouvre Swagger: `https://<ton-api>.onrender.com/docs`.
3. Vérifie dans Vercel que `VITE_API_BASE_URL` vaut exactement l'URL Render, par exemple `https://educonnect-api.onrender.com`.
4. Vérifie dans Render que `CORS_ORIGINS` contient exactement l'URL Vercel, par exemple `https://educonnect-web.vercel.app`.
5. Si le Network du navigateur montre `401`, le compte n'existe pas ou le mot de passe est faux.
6. Si le Network montre `CORS` ou aucune réponse, c'est `CORS_ORIGINS` ou `VITE_API_BASE_URL`.
7. Si le Network montre `500`, regarde les logs Render: souvent la base, les clés RSA, ou les migrations.

## Limites du gratuit

- Render Free peut être lent au premier chargement parce que le service dort après inactivité.
- La base gratuite est suffisante pour un test, pas pour une vraie école en production.
- Pas de SLA, pas de sauvegardes sérieuses garanties sur les plans gratuits.
- Ne mets pas de vraies données sensibles d'élèves pendant la phase gratuite.

## Checklist

- [ ] API Render accessible sur `/health`.
- [ ] Swagger accessible sur `/docs`.
- [ ] Frontend Vercel construit sans erreur.
- [ ] `VITE_API_BASE_URL` pointe vers Render.
- [ ] `CORS_ORIGINS` contient l'URL Vercel exacte.
- [ ] Données de démonstration créées.
- [ ] Aucun fichier `.env` ou clé privée n'est commité.
