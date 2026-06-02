// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for French (`fr`).
class AppLocalizationsFr extends AppLocalizations {
  AppLocalizationsFr([String locale = 'fr']) : super(locale);

  @override
  String get appTitle => 'Wasel Edu';

  @override
  String get login => 'Connexion';

  @override
  String get email => 'E-mail';

  @override
  String get password => 'Mot de passe';

  @override
  String get welcome => 'Bon retour';

  @override
  String get teacherDashboard => 'Tableau de bord Enseignant';

  @override
  String get parentDashboard => 'Tableau de bord Parent';

  @override
  String get classList => 'Liste des classes';

  @override
  String get notifications => 'Notifications';

  @override
  String get profile => 'Profil';

  @override
  String get chat => 'Chat';

  @override
  String get grades => 'Notes';

  @override
  String get attendance => 'Présence';

  @override
  String get homework => 'Devoirs';

  @override
  String get remarks => 'Remarques';

  @override
  String get add => 'Ajouter';

  @override
  String get save => 'Enregistrer';

  @override
  String get cancel => 'Annuler';

  @override
  String get error => 'Une erreur est survenue';

  @override
  String get loading => 'Chargement...';

  @override
  String get noData => 'Aucune donnée trouvée';

  @override
  String get markAllAsRead => 'Tout marquer comme lu';

  @override
  String get history => 'Historique';

  @override
  String get justified => 'Justifié';

  @override
  String get present => 'Présent';

  @override
  String get absent => 'Absent';

  @override
  String get late => 'En retard';

  @override
  String get presentS => 'P';

  @override
  String get lateS => 'R';

  @override
  String get absentS => 'A';

  @override
  String get noStudents => 'Aucun élève pour le moment';

  @override
  String get studentsJoinViaCode =>
      'Les élèves rejoignent via le code de la classe.';

  @override
  String get announcements => 'Annonces';

  @override
  String get writeMessage => 'Écrire un message...';

  @override
  String get writeAnnouncement => 'Écrire une annonce...';

  @override
  String get noMessages => 'Aucun message pour le moment';

  @override
  String get noAnnouncements => 'Aucune annonce pour le moment';

  @override
  String get startConversation => 'Commencez la conversation !';

  @override
  String get teachersPostAnnouncements =>
      'Les enseignants peuvent poster des annonces ici.';

  @override
  String get deleteMessage => 'Supprimer le message ?';

  @override
  String get deleteMessageConfirm =>
      'Ceci supprimera le message pour tout le monde.';

  @override
  String get delete => 'Supprimer';

  @override
  String get textbook => 'Cahier de Texte';

  @override
  String get newLabel => 'Nouveau';

  @override
  String get createNewClass => 'Créer un nouveau cours';

  @override
  String get upcoming => 'À faire';

  @override
  String get completed => 'Terminé';

  @override
  String get createAccount => 'Créer un compte';

  @override
  String get joinEduConnect => 'Rejoignez Wasel Edu aujourd\'hui';

  @override
  String get fullName => 'Nom complet';

  @override
  String get alreadyHaveAccount => 'Vous avez déjà un compte ?';

  @override
  String get signIn => 'Se connecter';

  @override
  String get signOut => 'Se déconnecter';

  @override
  String get createClass => 'Créer une classe';

  @override
  String get joinClass => 'Rejoindre une classe';

  @override
  String get joinCode => 'Code d\'accès';

  @override
  String get classCreated => 'Classe créée ! 🎉';

  @override
  String get shareJoinCode => 'Partagez ce code avec les parents :';

  @override
  String get goToClasses => 'Aller aux classes';

  @override
  String get enrolled => 'inscrit';

  @override
  String get successfullyJoined => 'Classe rejointe avec succès ! 🎉';

  @override
  String get enterJoinCode =>
      'Entrez le code à 6 caractères fourni par l\'enseignant.';

  @override
  String get teacher => 'Enseignant';

  @override
  String get parent => 'Parent';

  @override
  String get myAttendance => 'Mes Présences';

  @override
  String get noHistory => 'Aucun historique';

  @override
  String get gradeBulletin => 'Bulletin de Notes';

  @override
  String get generatePdf => 'Générer & Partager le PDF';

  @override
  String get student => 'Élève';

  @override
  String get observation => 'Observation';

  @override
  String get subject => 'Matière';

  @override
  String get connectingSchoolsFamilies => 'Relier les écoles et les familles';

  @override
  String get absenceLateJustified => 'Absence / Retard justifié(e)';

  @override
  String get justifyAbsence => 'Justifier cette absence';

  @override
  String get reason => 'Motif';

  @override
  String get detailedReason => 'Motif détaillé...';

  @override
  String get sendJustification => 'Envoyer le justificatif';

  @override
  String get scanQrCode => 'Scanner le QR Code';

  @override
  String get linkStudent => 'Lier un élève';

  @override
  String get manualEntry => 'Saisie manuelle (PIN)';

  @override
  String get linkingMethodTitle => 'Liez votre enfant';

  @override
  String get linkingMethodDesc =>
      'Choisissez une méthode de liaison pour commencer à suivre les progrès de votre enfant.';

  @override
  String get qrLinkSuccess => 'Élève lié avec succès ! 🎉';

  @override
  String get averageScore => 'Moyenne Générale';

  @override
  String get attendanceRate => 'Assiduité';

  @override
  String get noGradesYet => 'Aucune note ce trimestre';

  @override
  String get scanInstructions =>
      'Positionnez le QR code dans le cadre pour scanner';

  @override
  String get manageStudents => 'Gérer les élèves';

  @override
  String get searchPlaceholder => 'Rechercher par nom ou ID...';

  @override
  String get noStudentsFound => 'Aucun élève trouvé.';

  @override
  String get noMatchingStudents => 'Aucun élève correspondant.';

  @override
  String studentIdLabel(Object id) {
    return 'ID : $id';
  }

  @override
  String get linked => 'Lié';

  @override
  String get notLinked => 'Non Lié';

  @override
  String get regeneratePin => 'Régénérer le PIN';

  @override
  String get signUp => 'S\'inscrire';

  @override
  String get noAccountQuestion => 'Pas encore de compte ?';

  @override
  String get enrollmentCode => 'Code d\'inscription';

  @override
  String get success => 'Succès';

  @override
  String confirmRegeneratePin(Object name) {
    return 'Voulez-vous vraiment générer un nouveau PIN pour $name ? L\'ancien PIN ne fonctionnera plus.';
  }

  @override
  String get newPinGenerated => 'Nouveau PIN généré';

  @override
  String get shareNewPin => 'Veuillez partager ce nouveau PIN avec le parent :';

  @override
  String get serverUnavailable =>
      'Impossible de joindre le serveur. Vérifiez le Wi-Fi et que le backend est lancé.';

  @override
  String get invalidCredentials => 'Email ou mot de passe incorrect.';

  @override
  String get accountForbidden =>
      'Compte non autorisé ou établissement non activé.';

  @override
  String get unknown => 'inconnue';

  @override
  String serverErrorWithCode(Object code) {
    return 'Erreur serveur ($code).';
  }

  @override
  String get loginWithCodeQr => 'S\'authentifier par Code / QR';

  @override
  String get inviteOnlyInfo =>
      'Votre compte est créé par l\'administrateur de votre école. Lors de votre première connexion, vous serez invité à définir votre mot de passe.';

  @override
  String get registerSchoolCta => 'Inscrire mon établissement';

  @override
  String get unstableConnection => 'Connexion instable';

  @override
  String get retry => 'Réessayer';
}
