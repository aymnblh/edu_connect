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
- **Code expiré ou mot de passe oublié** : Le code est valable 72 heures. S'il a expiré, ou si l'enseignant a oublié son mot de passe, le directeur (ou le secrétariat) clique sur **« Réinitialiser l'accès »** dans la liste de l'équipe. Un nouveau code est généré, l'ancien mot de passe ne fonctionne plus et toutes les sessions sont fermées. L'enseignant refait l'activation avec ce nouveau code.
- **Départ d'un enseignant** : Le directeur (ou le secrétariat pour un enseignant) clique sur **« Désactiver »** dans la liste de l'équipe. La connexion est bloquée immédiatement et toutes les sessions sont fermées, y compris les messageries ouvertes. Le bouton **« Réactiver »** génère un nouveau code si la personne revient.
- **Affectation aux classes** : L'enseignant ne rejoint pas une classe lui-même. C'est l'administration qui lui attribue une ou plusieurs matières dans une classe ; il n'accède qu'à ces classes et ne voit que les notes de ses propres matières.
- **Corriger une erreur** : Une note peut être modifiée ou supprimée tant que l'administration ne l'a pas validée (ensuite, seule l'administration peut la corriger). L'enseignant peut modifier ou supprimer ses propres devoirs et séances du cahier de textes, et corriger une présence passée depuis l'historique ; les parents qui avaient reçu une alerte d'absence sont alors prévenus de la correction. Chaque modification est enregistrée dans le journal d'audit.
- **Responsabilités** : Il peut émettre des notes dans ses matières, des remarques de discipline, distribuer des devoirs, ou valider des absences.

### 3. Les Parents
Incroyablement intuitif : le compte d'un parent prend vie pile au moment où il scanne et relie son profil à un élève existant de la base !
- **Liaison Mobile** : À réception du carnet format papier par l'école, le parent télécharge EduConnect et sélectionne aussi *« S'authentifier par Code / QR »*.
- **Le Scan & Saisi** : Le parent scanne simplement le QR Code de l'élève. S'il ne peut pas scanner, il bascule en saisissant l'ID Élève et le Code PIN à la main.
- **Création du Compte** : Si le Code est valide (il n'a pas expiré), le système redirige le Parent sur un écran le priant d'entrer son propre Nom, un Email et de configurer son Mot de Passe.
- **Mot de passe oublié** : Le parent s'adresse à l'école. Dans la fiche de l'élève, rubrique **« Parents liés »**, l'administration clique sur **« Réinitialiser l'accès »** et lui remet le nouveau code (valable 72 h), qu'il saisit sur la page d'activation pour choisir un nouveau mot de passe.
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

### Changer son mot de passe
Tout utilisateur connecté peut changer son mot de passe : sur le web, bouton clé en bas de la barre latérale ; sur mobile, **Profil → Changer le mot de passe**. Le mot de passe actuel est demandé, et tous les autres appareils sont déconnectés.

### Annonces et calendrier
- **Publier** : la direction et le secrétariat publient pour toute l'école ou pour des classes choisies ; un enseignant publie pour ses propres classes. Types : annonce, vacances, examens, réunion, événement (tous sauf « annonce » demandent une date, éventuellement une date de fin).
- **Recevoir** : les parents et enseignants concernés reçoivent une notification. Les parents voient les annonces de toute l'école et celles des classes de leurs enfants.
- **Calendrier** : la rubrique « À venir » rassemble les vacances, examens, réunions et événements datés.
- **Suivi de lecture** : l'auteur et la direction voient « Lu par X/Y ». L'auteur ou la direction peut supprimer une annonce.
- **Où** : web — onglet « Annonces » (direction, enseignant, parent) ; mobile — menu « Annonces et calendrier ».

### Bulletins trimestriels
- **Publier** (direction / secrétariat, web — onglet « Bulletins ») : choisir la classe et le trimestre, vérifier l'aperçu (moyenne générale, rang, absences ; cliquer sur un élève pour voir son bulletin), puis « Publier les bulletins ». Les parents reçoivent une notification.
- **Contenu** : pour chaque matière, la moyenne /20, le coefficient et la moyenne de la classe ; la moyenne générale pondérée, le rang (ex. 3 / 28), la moyenne de la classe et l'assiduité du trimestre. Seules les notes validées dont la date est dans le trimestre comptent.
- **Document figé** : un bulletin publié ne change pas si une note est modifiée ensuite. Pour intégrer une correction, cliquer sur « Republier » : les parents sont prévenus de la mise à jour. « Retirer la publication » le masque aux parents.
- **Parents** : web — onglet « Bulletins » de l'enfant (bouton « Imprimer / PDF ») ; mobile — menu « Bulletins » ou bouton PDF de l'écran des notes, avec export PDF.

### Rendez-vous parents-enseignants
- **Enseignant** : onglet « Rendez-vous » (web) ou menu « Rendez-vous » (mobile) → choisir le jour, la plage horaire (ex. 16:00–18:00), la durée d'un rendez-vous (10 à 30 min), le lieu, et éventuellement une seule classe. Les créneaux sont créés automatiquement (40 maximum par plage, sans chevauchement avec vos créneaux existants).
- **Parent** : onglet « Rendez-vous » de l'enfant (web) ou menu « Rendez-vous » (mobile) → choisir un horaire libre chez un enseignant de l'enfant, ajouter un sujet si besoin, réserver. Un seul rendez-vous à venir par enseignant et par enfant ; deux parents ne peuvent jamais obtenir le même créneau.
- **Annulation** : le parent peut annuler (l'enseignant est prévenu) ; l'enseignant ou la direction peut libérer ou supprimer un créneau (le parent est prévenu).
- **Confidentialité** : les autres parents voient seulement qu'un créneau est pris, jamais par qui.
- **Heure** : tous les horaires sont en heure d'Algérie.

### Vigilance du trimestre (direction)
Dans l'onglet « Vue d'ensemble », sous les indicateurs habituels, pour le trimestre choisi :
- **Élèves à suivre**, avec le motif : moyenne inférieure à 10, baisse de 2 points ou plus depuis le trimestre précédent, 3 absences non justifiées ou 5 retards sur les 30 derniers jours.
- **Assiduité par semaine** (12 dernières semaines scolaires, du dimanche au jeudi) : taux d'absence et taux de retard ; les semaines sans pointage apparaissent comme un vide. « Voir les chiffres » affiche le tableau.
- **Assiduité par classe** sur le trimestre, et les tâches en attente : notes à valider, absences non justifiées.
- Le « taux d'absence » de la vue d'ensemble ne compte plus les retards.

### Journal d'activité et appareils
- **Journal (direction / secrétariat, web — onglet « Journal »)** : qui a fait quoi et quand — connexions et échecs de connexion, changements de mot de passe, réinitialisations, désactivations, modifications de notes, corrections de présence, publications de bulletins et d'annonces, exports. Filtres par catégorie, personne et dates ; « Exporter (CSV) ». Les lignes d'échec sont signalées par une barre orange.
- **Déconnecter quelqu'un** : bouton « Déconnecter » dans la liste de l'équipe et à côté de chaque parent lié. La personne est déconnectée de tous ses appareils immédiatement ; son mot de passe reste valable (pour un mot de passe compromis, utiliser « Réinitialiser l'accès »).
- **Mes appareils (tout utilisateur)** : web — bouton écran en bas de la barre latérale ; mobile — Profil → « Appareils connectés ». Liste des appareils connectés avec la dernière activité ; déconnecter un appareil, ou « Déconnecter mes autres appareils » (immédiat, cet appareil reste connecté).

### Dossier élève, historique enseignant et fiche santé
- **Dossier complet de l'élève** (direction, onglet « Élèves » → « Dossier complet ») : identité, matricule, classes, parents et téléphones, moyennes du trimestre par classe et par matière, absences, remarques, bulletins publiés et fiche santé.
- **Historique d'un enseignant** (onglet « Équipe » → « Historique ») : classes et matières, dernière connexion, et sur 30 jours : notes saisies, notes à valider, pointages de présence, devoirs, séances, corrections et échecs de connexion, avec l'activité récente. Les notes et présences saisies avant cette mise à jour ne sont pas attribuées.
- **Fiche santé et urgence** : contacts d'urgence (dans l'ordre d'appel), allergies, maladies, traitement, groupe sanguin, médecin, consignes et une alerte courte pour les enseignants.
  - Le **parent** la remplit (web : onglet « Santé » de l'enfant ; mobile : menu « Fiche santé ») en donnant son consentement ; il peut le retirer à tout moment, ce qui efface la fiche.
  - L'**école** peut la remplir à partir d'un formulaire papier signé par le parent (case « consentement écrit en dossier »).
  - Les **enseignants** ne voient que l'alerte courte, en haut de l'écran de présence (mobile) et de la page de la classe (web).
  - Chaque consultation de la fiche par le personnel est enregistrée dans le journal d'activité. Ce sont des données sensibles : ne renseigner que le nécessaire.

### Démarrer une nouvelle école
- **Liste « Démarrer votre école »** (direction, page d'accueil) : sept étapes avec leur avancement — trimestres, classes, matières, élèves (tous placés dans une classe), enseignants (invités et activés), matières attribuées à chaque classe, parents connectés (au moins la moitié des élèves). Chaque étape a un bouton « Y aller ». « Masquer » la retire pour toute la direction.
- **Import Excel des élèves** : onglet « Élèves » → « Modèle Excel » télécharge un fichier avec les colonnes `prenom ; nom ; classe`. Remplissez-le, enregistrez-le en CSV, puis « Importer CSV ». Les élèves dont la classe existe déjà y sont placés automatiquement ; les classes inconnues sont listées pour être créées.
- **Codes parents à imprimer** : « Imprimer les codes parents » (onglet « Élèves » ou dans la liste de démarrage) produit une carte à découper par élève avec son identifiant, son PIN et la marche à suivre. Filtre par classe et « seulement les élèves sans parent connecté ». Chaque code ouvre le dossier de l'enfant : remettez-le en main propre ou sous enveloppe. L'impression est enregistrée dans le journal.

### Bilan mensuel (direction)
- Onglet **« Bilan mensuel »** : pour le mois choisi, comparé au mois précédent — taux de présence, notifications envoyées aux parents, parents actifs, notes saisies, absences (dont non justifiées), retards, devoirs, séances, messages, annonces, bulletins, rendez-vous, enseignants actifs, part des élèves ayant un parent connecté et présence par classe.
- « Imprimer / PDF » pour le présenter au propriétaire ou au conseil de l'école.
- Le **1er de chaque mois**, le directeur reçoit une notification « Votre bilan de … est prêt » avec les chiffres clés.

### Démo publique
- Quand elle est activée sur le serveur (`PUBLIC_DEMO_ENABLED=true`), la page de connexion propose **« Découvrir sans compte »** : directeur, enseignant ou parent, dans une école fictive.
- La démo est **en lecture seule** : tout est consultable, rien n'est enregistré ; un bandeau le rappelle avec « Créer mon école ». Elle est reconstruite chaque nuit (après 3 h, heure d'Algérie) pour que les dates restent actuelles.

