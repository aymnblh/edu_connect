# Utilisation et stockage des donnees utilisateurs

Derniere mise a jour : 13 mai 2026  
Version liee aux conditions : `privacy-terms-2026-05-13`  
Produit : EduConnect

> Ce document explique comment EduConnect collecte, utilise, stocke et protege les donnees utilisateurs. Il sert de document de transparence pour les etablissements, les parents, les enseignants, les administrateurs et les plateformes de publication mobile. Il doit etre relu par un conseil juridique avant publication officielle.

## 1. Cadre general

EduConnect est une plateforme scolaire privee destinee a faciliter la communication entre les etablissements, les enseignants, les parents et l'administration. Les donnees sont traitees uniquement pour fournir les services scolaires prevus : gestion des comptes, classes, eleves, presences, notes, devoirs, remarques, messages, notifications, planning, abonnements et securite.

Le traitement des donnees personnelles est concu en tenant compte de la loi algerienne n 18-07 du 10 juin 2018 relative a la protection des personnes physiques dans le traitement des donnees a caractere personnel, modifiee et completee par la loi n 25-11 du 24 juillet 2025.

## 2. Donnees collectees

### Comptes utilisateurs

EduConnect peut collecter et stocker :

- nom complet ;
- adresse email ;
- role utilisateur : parent, enseignant, directeur, secretaire ou super administrateur ;
- identifiant interne du compte ;
- rattachement a un etablissement ;
- mot de passe sous forme de hash, jamais en clair ;
- jetons de session et jetons de rafraichissement sous forme securisee ;
- date d'acceptation des conditions et version acceptee ;
- eventuellement telephone, photo/avatar ou jeton de notification push si la fonctionnalite est activee.

### Donnees scolaires

Selon le role de l'utilisateur et les modules actives, EduConnect peut traiter :

- informations d'etablissement ;
- informations de classe ;
- liste des eleves ;
- identifiants scolaires internes ;
- liens parent-eleve ;
- presences, absences, retards et justificatifs ;
- notes, moyennes, bulletins et observations ;
- devoirs, cahier de texte et remarques ;
- emploi du temps et seances ;
- messages, conversations directes et annonces ;
- notifications in-app ou push ;
- factures, paiements, recus et informations d'abonnement.

### Donnees techniques et de securite

EduConnect peut traiter :

- adresse IP ;
- type de plateforme ou appareil ;
- identifiant technique d'appareil fourni par l'application ;
- empreinte serveur calculee pour l'audit ;
- horodatage des connexions, actions sensibles et notifications ;
- journaux techniques necessaires a la securite, au diagnostic et a la lutte contre les abus.

## 3. Finalites d'utilisation

Les donnees sont utilisees pour :

- authentifier les utilisateurs et proteger les comptes ;
- afficher a chaque utilisateur les informations autorisees par son role ;
- permettre aux parents de suivre les informations scolaires de leurs enfants ;
- permettre aux enseignants et a l'administration de gerer la vie scolaire ;
- envoyer des messages, annonces et notifications ;
- produire des bulletins, historiques, justificatifs ou exports necessaires ;
- gerer les abonnements des etablissements ;
- prevenir les acces non autorises, les abus et les erreurs de rattachement ;
- respecter les obligations contractuelles, comptables, scolaires ou legales applicables.

EduConnect n'utilise pas les donnees scolaires pour de la publicite comportementale, de la revente de donnees ou du profilage commercial.

## 4. Donnees des mineurs

EduConnect traite des donnees d'eleves, y compris des mineurs, uniquement dans le cadre scolaire. L'acces aux donnees d'un eleve est limite aux personnes autorisees : parents lies a l'eleve, enseignants concernes, direction de l'etablissement et administrateurs strictement habilites.

Les donnees des mineurs ne sont pas rendues publiques et ne sont pas partagees avec des tiers a des fins commerciales.

## 5. Acceptation des conditions

Lors de la creation ou de l'activation d'un compte, l'utilisateur doit accepter la politique de confidentialite et les conditions d'utilisation. Cette acceptation est bloquante dans l'application et verifiee cote serveur.

EduConnect enregistre :

- la date et l'heure d'acceptation ;
- la version des conditions acceptees ;
- le compte utilisateur concerne.

Cela permet de prouver qu'un utilisateur a pris connaissance des regles applicables avant l'activation de son compte.

## 6. Stockage des donnees

### Serveur backend

Les donnees principales sont stockees dans une base PostgreSQL privee. Chaque donnee scolaire est rattachee a un `school_id`, ce qui permet d'isoler les etablissements entre eux.

Le backend EduConnect utilise :

- FastAPI pour l'API ;
- PostgreSQL pour les donnees applicatives ;
- Alembic pour les migrations de schema ;
- JWT RS256 pour les sessions ;
- des cles RSA montees dans un dossier de secrets non integre a l'image Docker ;
- Redis pour certaines fonctions temps reel ;
- ntfy pour les notifications lorsque cette option est configuree.

### Application mobile

L'application mobile stocke localement certaines informations necessaires a la session :

- jeton d'acces ;
- jeton de rafraichissement ;
- cache du profil utilisateur.

Ces informations sont stockees via le stockage securise de la plateforme mobile lorsque disponible. Elles sont supprimees lors de la deconnexion.

### Portail web

Le portail web peut stocker dans le navigateur :

- jeton d'acces ;
- jeton de rafraichissement ;
- profil utilisateur minimal.

Ces donnees servent a maintenir la session et doivent etre supprimees lors de la deconnexion.

## 7. Securite

EduConnect applique plusieurs mesures de securite :

- mots de passe haches, jamais stockes en clair ;
- jetons d'acces courts ;
- rotation stricte des jetons de rafraichissement ;
- stockage des refresh tokens sous forme de hash ;
- authentification par role ;
- isolation des donnees par etablissement ;
- chiffrement TLS attendu en production ;
- CORS limite aux domaines autorises en production ;
- cles RSA stockees hors image Docker ;
- journaux d'audit pour les actions sensibles ;
- controle d'activation de l'etablissement avant l'acces complet.

Les administrateurs doivent proteger les variables d'environnement, les cles RSA, les sauvegardes, les acces serveur et les comptes ayant des privileges eleves.

## 8. Partage des donnees

Les donnees ne sont partagees qu'avec les personnes ou services necessaires a la fourniture d'EduConnect :

- utilisateurs autorises de l'etablissement ;
- administrateurs EduConnect habilites ;
- services techniques internes comme la base de donnees, Redis ou le service de notifications ;
- autorites competentes si une obligation legale l'exige.

EduConnect ne vend pas les donnees personnelles et ne les communique pas a des tiers pour de la publicite.

## 9. Conservation

Les donnees sont conservees pendant la duree necessaire au fonctionnement du service, aux obligations scolaires, contractuelles, comptables ou legales.

Les durees exactes doivent etre validees par l'operateur d'EduConnect et par chaque etablissement. A titre operationnel :

- les comptes actifs sont conserves tant que l'utilisateur est rattache a un etablissement ;
- les donnees scolaires sont conservees pendant la duree necessaire au suivi educatif et aux archives scolaires ;
- les journaux techniques sont conserves pendant une duree limitee necessaire a la securite et au diagnostic ;
- les donnees de paiement et facturation sont conservees selon les obligations comptables applicables ;
- les comptes supprimes ou resilies doivent etre effaces ou anonymises lorsque leur conservation n'est plus justifiee.

## 10. Suppression et rectification

Un utilisateur peut demander :

- l'information sur les traitements ;
- l'acces a ses donnees ;
- la rectification des donnees inexactes ou incompletes ;
- l'opposition pour motif legitime lorsque la loi le permet ;
- la suppression ou la limitation de certaines donnees lorsque cela ne contredit pas les obligations scolaires, contractuelles ou legales.

Pour les donnees scolaires, certaines demandes doivent etre verifiees ou traitees avec l'etablissement concerne afin de confirmer l'identite du demandeur et son droit d'acces.

Contact a remplacer avant publication : `privacy@educonnect.dz`

## 11. Hebergement et sauvegardes

L'objectif de production est d'heberger les donnees dans un environnement controle situe en Algerie. Si un transfert hors Algerie etait envisage, il devrait etre analyse juridiquement et realise uniquement avec une base legale ou une autorisation conforme aux exigences applicables.

Les sauvegardes doivent etre chiffrees ou protegees par controle d'acces, conservees pendant une duree limitee et restaurees uniquement par des personnes habilitees.

## 12. Responsabilites

L'etablissement reste responsable de l'exactitude des donnees scolaires qu'il saisit, importe ou valide. EduConnect fournit les moyens techniques de traitement, d'acces, de securisation et de consultation.

Les utilisateurs doivent :

- garder leurs identifiants confidentiels ;
- ne pas partager leur compte ;
- signaler toute anomalie ou acces suspect ;
- utiliser la plateforme uniquement pour des finalites scolaires legitimes.

## 13. References

- Portail du Droit Algerien : loi n 18-07 relative a la protection des personnes physiques dans le traitement des donnees a caractere personnel, modifiee et completee par la loi n 25-11 : https://droit.mjustice.gov.dz/fr/content/protection-des-personnes-physiques-dans-le-traitement-des-donn%C3%A9es-%C3%A0-caract%C3%A8re-personnel
- Journal officiel, loi 18-07 : https://droit.mjustice.gov.dz/sites/default/files/loi_fr_18-07.pdf
- Autorite Nationale de Protection des Donnees a caractere Personnel : https://portail.anpdp.dz/
- Notice ANPDP relative a la protection des donnees personnelles : https://plaintes.anpdp.dz/notice.php

