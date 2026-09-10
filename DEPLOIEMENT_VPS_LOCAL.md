# Deploiement EduConnect sur un VPS local

Ce guide prepare un hebergement autonome chez un fournisseur disposant d'un
datacenter en Algerie. Le serveur execute le frontend, l'API, PostgreSQL,
Redis, ClamAV et Caddy dans des conteneurs Docker. Seuls les ports 80 et 443
sont publics.

## 1. Configuration a louer

Pour un pilote avec plusieurs etablissements :

- Ubuntu Server 24.04 LTS, architecture x86_64.
- 4 vCPU, 8 Go de RAM et 100 a 160 Go de stockage SSD/NVMe.
- Une IPv4 publique fixe et un acces root ou sudo par cle SSH.
- Ports entrants 80/TCP, 443/TCP et 443/UDP autorises.
- Protection DDoS, console de secours KVM/VNC et snapshots quotidiens.
- Sauvegarde hors site distincte du disque et du datacenter principal.
- Possibilite d'augmenter RAM et stockage sans changer d'adresse IP.

ClamAV consomme une partie importante de la RAM. Ne pas choisir une machine de
2 Go. Pour une charge plus importante ou de nombreux fichiers, commencer avec
8 vCPU et 16 Go de RAM.

Avant de commander, demander par ecrit : emplacement physique des donnees,
SLA, delai de remplacement, retention des snapshots, protection DDoS, debit,
conditions de restitution des donnees et procedure d'incident. Les snapshots
du fournisseur ne remplacent pas la sauvegarde chiffree geree par EduConnect.

## 2. Domaines et DNS

Prevoir deux noms publics :

```text
app.votre-domaine.dz  -> adresse IPv4 du VPS
api.votre-domaine.dz  -> adresse IPv4 du VPS
```

Configurer les enregistrements DNS A, et AAAA uniquement si IPv6 est
correctement filtre. Faire pointer les deux noms vers le VPS avant le premier
deploiement. Caddy obtiendra automatiquement les certificats HTTPS.

## 3. Preparation du serveur

1. Creer un compte `deploy` avec sudo et une cle SSH.
2. Desactiver la connexion SSH par mot de passe et la connexion directe de root.
3. Activer les mises a jour de securite automatiques.
4. Installer Docker Engine et le plugin Docker Compose depuis le depot officiel Docker.
5. Installer `git`, `curl`, `openssl`, `age`, `rsync`, `ufw` et `fail2ban`.
6. Autoriser uniquement SSH, 80/TCP, 443/TCP et 443/UDP dans le pare-feu.

Attention : autoriser la cle SSH du compte `deploy` avant de fermer les acces
par mot de passe. Lorsque le fournisseur propose un pare-feu reseau, appliquer
les memes regles dans sa console.

Ne pas installer aaPanel, cPanel, Apache ou un autre proxy qui occupe les ports
80 et 443. Caddy assure deja cette fonction.

## 4. Installation de l'application

```bash
git clone https://github.com/aymnblh/edu_connect.git
cd edu_connect/edu_connect_backend

python3 scripts/generate_production_env.py --output .env.production
nano .env.production
```

Modifier au minimum :

```text
FQDN=api.votre-domaine.dz
WEB_FQDN=app.votre-domaine.dz
WEB_API_BASE_URL=https://api.votre-domaine.dz
CORS_ORIGINS=https://app.votre-domaine.dz
ACME_EMAIL=votre-adresse@votre-domaine.dz
BACKUP_REMOTE_HOST=backup@serveur-de-sauvegarde
BACKUP_REMOTE_PATH=/backups/educonnect
BACKUP_AGE_RECIPIENT=age1...
```

`generate_production_env.py` genere les mots de passe PostgreSQL, Redis, le
secret plateforme et le sel de securite. Ne jamais reutiliser le fichier de
Render et ne jamais ajouter `.env.production` dans Git.

Generer les cles JWT avec un proprietaire correspondant a l'utilisateur du
conteneur API :

```bash
install -d -m 700 secrets
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:3072 \
  -out secrets/private_key.pem
openssl pkey -in secrets/private_key.pem -pubout \
  -out secrets/public_key.pem
sudo chown -R 10001:10001 secrets
sudo chmod 600 secrets/private_key.pem
sudo chmod 644 secrets/public_key.pem
```

Lancer le deploiement :

```bash
chmod +x scripts/*.sh
./scripts/deploy.sh
./scripts/verify_deployment.sh
```

Creer ensuite le premier administrateur plateforme. Le mot de passe est demande
de maniere interactive et n'apparait pas dans l'historique du terminal :

```bash
docker compose --env-file .env.production exec api \
  python manage.py create-superadmin \
  --email admin@votre-domaine.dz \
  --full-name "Administrateur plateforme"
```

## 5. Sauvegardes chiffrees

Generer la cle `age` sur la machine de sauvegarde, jamais sur le VPS principal :

```bash
age-keygen -o wasel-edu-backup.key
```

Placer uniquement le destinataire public `age1...` dans
`BACKUP_AGE_RECIPIENT`. La cle privee reste hors du VPS.

Test manuel :

```bash
ENV_FILE=.env.production ./scripts/backup_educonnect.sh
```

La sauvegarde contient le dump PostgreSQL, le volume des fichiers prives, les
cles JWT et l'environnement. Elle est chiffree avant tout envoi hors site.
Programmer ce script toutes les six heures et effectuer un test de restauration
mensuel sur un environnement de staging.

Pour un exercice de restauration, dechiffrer d'abord l'archive hors production :

```bash
age --decrypt -i wasel-edu-backup.key \
  -o educonnect-backup.tar.gz educonnect-backup.tar.gz.age
```

Puis utiliser `scripts/restore_drill.sh` avec une configuration staging. Le
script refuse explicitement de restaurer dans `APP_ENV=production`.

## 6. Migration depuis Render et Vercel

1. Abaisser le TTL DNS a 300 secondes au moins 24 heures avant la bascule.
2. Mettre l'ancienne application en maintenance pour bloquer les nouvelles ecritures.
3. Exporter PostgreSQL avec `pg_dump --format=custom`.
4. Restaurer le dump sur le PostgreSQL du VPS et executer `alembic upgrade head`.
5. Deployer et executer `verify_deployment.sh`.
6. Basculer les DNS web/API vers le VPS.
7. Reconstruire Android et iOS avec `API_BASE_URL` et `WS_BASE_URL` du nouveau domaine.
8. Conserver Render/Vercel sans ecriture pendant quelques jours avant suppression.

Les notifications visibles lorsque l'application est ouverte utilisent l'API.
Le changement d'hebergeur ne remplace pas l'integration FCM/APNs necessaire aux
notifications lorsque l'application mobile est completement fermee.

## 7. Exploitation quotidienne

Surveiller au minimum :

- `https://api.votre-domaine.dz/health` et `/health/ready` depuis un service externe.
- Utilisation disque, RAM, charge CPU et redemarrages des conteneurs.
- Expiration des sauvegardes et resultat du dernier test de restauration.
- Taux de reponses 5xx et latence de l'API.
- Journaux de Caddy, de l'API, de PostgreSQL et de ClamAV.

Commandes utiles :

```bash
docker compose --env-file .env.production ps
docker compose --env-file .env.production logs -f --tail=200 api caddy
docker compose --env-file .env.production pull
./scripts/deploy.sh
```

Ne pas publier les ports 5432, 6379 ou 3310. PostgreSQL, Redis et ClamAV doivent
rester accessibles uniquement sur le reseau Docker interne.
