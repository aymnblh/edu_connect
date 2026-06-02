# 📖 Guide de Fonctionnement — EduConnect

**EduConnect** est une plateforme complète (Backend serveur + Application Mobile Flutter) dédiée à la gestion de la communication et du suivi éducatif au sein d'un établissement scolaire. Le système est conçu pour interconnecter les Directeurs, les Enseignants, et les Parents de manière sécurisée et centralisée.

---

## 🏗 Architecture Globale

Le système est séparé en deux blocs principaux :
1. **L'Application Mobile (Frontend)** : Développée en **Flutter**, elle est téléchargeable par les parents, les professeurs et la direction. Moteurs clés : `Riverpod` (Gestion d'état), `GoRouter` (Navigation fluide) et `Dio` (Appels API & WebSockets).
2. **Le Serveur (Backend)** : Construit en **Python avec FastAPI** et une base de données **PostgreSQL**. Tout y est sécurisé par des jetons personnels (JWT - RS256).

> **Autonomie Totale** : Contrairement au système classique tel que Firebase Auth, le serveur gère entièrement l'authentification et les accès localement. Seule l'école détient le plein contrôle sur les données de ses comptes utilisateurs.

---

## 👥 Rôles et Leurs Interactions

Voici comment fonctionnent les différents profils connectés à la plateforme :

### 1. Le Directeur d'Établissement (Super Administrateur)
Le compte principal est l'unique compte qui peut se créer "seul" depuis l'extérieur. Sur l'écran de connexion initial, le directeur clique sur **"Inscrire mon établissement"**. Il y remplit les informations de l'école ainsi que son Email et Mot de passe personnel. Un administrateur système EduConnect valide ensuite l'activation pour qu'il puisse se connecter avec ce compte administrateur.
- **Importation en Masse** : Il peut importer un fichier CSV contenant la liste de tous ses élèves.
- **Gestion des Accès** : Il crée les "Comptes Enseignants" et génère pour ces derniers un *Code d'Invitation Privé*.
- **Sécurité des Parents** : Il génère et imprime pour chaque élève un **QR Code spécifique** ou un **ID Élève + Code PIN**. Ces invitations sont distribuées physiquement ; un parent a obligatoirement besoin de ces infos pour rejoindre virtuellement son enfant.
- **Analyse et Suivi** : Il possède un accès global aux notes moyennes, taux d'adoption, et journaux d'audit de sécurité de toute l'école.

### 2. Les Enseignants
Leur création de compte est fermée/stricte : ils ne peuvent pas s'inscrire librement.
- **Le Premier Accès** : Une fois enregistré par son directeur, l'enseignant reçoit de sa main un **Code d'Invitation**.
- **Processus de Connexion** : Il lance l'application, choisit *« S'authentifier par Code / QR »* depuis l'accueil, et saisit le code.
- **Configuration Finale** : Reconnu par le système, l'application lui donne la main pour définir son "Mot de passe", finalisant ainsi l'activation de son profil.
- **Responsabilités** : Il peut émettre des notes, des remarques de discipline, distribuer des devoirs, ou valider des absences.

### 3. Les Parents
Incroyablement intuitif : le compte d'un parent prend vie pile au moment où il scanne et relie son profil à un élève existant de la base !
- **Liaison Mobile** : À réception du carnet format papier par l'école, le parent télécharge EduConnect et sélectionne aussi *« S'authentifier par Code / QR »*.
- **Le Scan & Saisi** : Le parent scanne simplement le QR Code de l'élève. S'il ne peut pas scanner, il bascule en saisissant l'ID Élève et le Code PIN à la main.
- **Création du Compte** : Si le Code est valide (il n'a pas expiré), le système redirige le Parent sur un écran le priant d'entrer son propre Nom, un Email et de configurer son Mot de Passe.
- **Sécurité Long-terme** : Voilà ! Son profil unique de Parent est créé. Cette filiation est automatique : il utilisera désormais son adresse Email et son mot de passe normal à l'avenir pour s'y reconnecter.

---

## 🔒 La Sécurité des Appareils & Cryptographie

1. **Jetons Isolés et Révocables (QR)** : Les invitations QR administratives n'ont qu'une très courte espérance de vie (ex: 15 minutes à 7 jours) et s'autodétruisent dès qu'un parent les consomme.
2. **Déconnexion de Force (Invalidation de famille JWT)** : Le backend conserve une "Trace" des appareils que les utilisateurs emploient (`Refresh Token`). Ainsi, peu importe le nombre de parents connectés en même temps : si un directeur veut révoquer un droit de filiation ou bloquer un profil, la simple suppression côté Admin provoque une déconnexion intempestive mondiale de cet utilisateur en quelques millisecondes sur son application Flutter !

---

### Résumé Pédagogique Rapide (Cheat Sheet)

* **Règle absolue :** Ni les Parents, ni les Enseignants ne s'inscrivent librement. **Tout part de l'administration de l'école.**
* **Parcours du directeur :** Créer l'école -> Importer élèves -> Créer profs -> Imprimer QR Codes parents.
* **Parcours du professeur :** Reçoit un code -> S'y connecte -> Met un mot de passe permanent -> Administre sa classe.
* **Parcours du parent :** Reçoit le papier avec le QR ou le Code PIN de son enfant -> Le scanne via l'écran initial de l'app -> Renseigne qui il est (Nom, Email, Mdp) -> Relie son enfant définitivement et suit sa scolarité !
