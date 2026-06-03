import { useCallback, useEffect, useState } from 'react';

export type Locale = 'fr' | 'ar' | 'en';

type TranslationParams = Record<string, string | number>;

const localeStorageKey = 'educonnect_locale';
const localeChangeEvent = 'educonnect_locale_change';
const supportedLocales: Locale[] = ['fr', 'ar', 'en'];

export const translations: Record<string, Record<Locale, string>> = {
  'common.appName': {
    fr: 'Wasel Edu',
    ar: 'Wasel Edu',
    en: 'Wasel Edu',
  },
  'common.loading': {
    fr: 'Chargement...',
    ar: 'جار التحميل...',
    en: 'Loading...',
  },
  'common.reload': {
    fr: 'Recharger',
    ar: 'إعادة التحميل',
    en: 'Reload',
  },
  'common.errorGeneric': {
    fr: 'Une erreur est survenue.',
    ar: 'حدث خطأ.',
    en: 'Something went wrong.',
  },
  'common.important': {
    fr: 'Important',
    ar: 'مهم',
    en: 'Important',
  },
  'calendar.weekday.0': {
    fr: 'Lundi',
    ar: 'الإثنين',
    en: 'Monday',
  },
  'calendar.weekday.1': {
    fr: 'Mardi',
    ar: 'الثلاثاء',
    en: 'Tuesday',
  },
  'calendar.weekday.2': {
    fr: 'Mercredi',
    ar: 'الأربعاء',
    en: 'Wednesday',
  },
  'calendar.weekday.3': {
    fr: 'Jeudi',
    ar: 'الخميس',
    en: 'Thursday',
  },
  'calendar.weekday.4': {
    fr: 'Vendredi',
    ar: 'الجمعة',
    en: 'Friday',
  },
  'calendar.weekday.5': {
    fr: 'Samedi',
    ar: 'السبت',
    en: 'Saturday',
  },
  'calendar.weekday.6': {
    fr: 'Dimanche',
    ar: 'الأحد',
    en: 'Sunday',
  },
  'auth.unauthorized': {
    fr: 'Accès non autorisé pour ce rôle web.',
    ar: 'هذا الدور غير مصرح له بالدخول إلى لوحة الويب.',
    en: 'This role is not authorized for the web portal.',
  },
  'auth.connectionError': {
    fr: 'Erreur de connexion',
    ar: 'خطأ في تسجيل الدخول',
    en: 'Sign-in error',
  },
  'login.kicker': {
    fr: 'Plateforme éducative premium',
    ar: 'منصة تعليمية متقدمة',
    en: 'Premium education platform',
  },
  'login.heroTitleLine': {
    fr: 'Connectez votre',
    ar: 'اربطوا',
    en: 'Connect your',
  },
  'login.heroTitleHighlight': {
    fr: 'établissement scolaire',
    ar: 'مؤسستكم التعليمية',
    en: 'school community',
  },
  'login.heroCopy': {
    fr: "La passerelle sécurisée et autonome qui unifie la direction, les enseignants et les parents d'élèves pour un suivi pédagogique d'excellence.",
    ar: 'بوابة آمنة ومستقلة تجمع الإدارة والمعلمين وأولياء الأمور لمتابعة تربوية دقيقة.',
    en: 'A secure school portal that brings administrators, teachers, and families together around student progress.',
  },
  'login.feature.securityTitle': {
    fr: 'Autonomie et sécurité totale',
    ar: 'استقلالية وأمان كامل',
    en: 'Autonomy and security',
  },
  'login.feature.securityCopy': {
    fr: 'Authentification chiffrée par jetons JWT asymétriques. Vos données restent dans votre école.',
    ar: 'مصادقة آمنة عبر رموز JWT غير متماثلة. تبقى بياناتكم داخل مدرستكم.',
    en: 'Encrypted authentication with asymmetric JWT tokens. Your data stays with your school.',
  },
  'login.feature.gradesTitle': {
    fr: 'Pédagogie et notes instantanées',
    ar: 'تعليم ودرجات فورية',
    en: 'Teaching and instant grades',
  },
  'login.feature.gradesCopy': {
    fr: 'Distribution de devoirs, saisie de relevés de notes et suivi pédagogique en temps réel.',
    ar: 'توزيع الواجبات، إدخال الدرجات، ومتابعة تعليمية مباشرة.',
    en: 'Share assignments, enter grades, and track learning progress in real time.',
  },
  'login.feature.messagingTitle': {
    fr: 'Liaison parents-profs fluide',
    ar: 'تواصل سلس بين الأسرة والمعلمين',
    en: 'Smooth family-teacher communication',
  },
  'login.feature.messagingCopy': {
    fr: 'Messagerie bidirectionnelle et bulletins numériques disponibles en un clic.',
    ar: 'رسائل ثنائية الاتجاه وكشوف رقمية متاحة بنقرة واحدة.',
    en: 'Two-way messaging and digital report cards available in one click.',
  },
  'login.title': {
    fr: 'Connexion Wasel Edu',
    ar: 'تسجيل الدخول إلى Wasel Edu',
    en: 'Wasel Edu sign in',
  },
  'login.welcome': {
    fr: 'Bienvenue',
    ar: 'مرحبا',
    en: 'Welcome',
  },
  'login.subtitle': {
    fr: 'Portail SaaS SuperAdmin et Directeur',
    ar: 'بوابة الإدارة والمدير',
    en: 'SaaS portal for super admins and directors',
  },
  'login.emailLabel': {
    fr: 'Email ou identifiant',
    ar: 'البريد الإلكتروني أو المعرف',
    en: 'Email or username',
  },
  'login.emailPlaceholder': {
    fr: 'nom@ecole.dz',
    ar: 'name@school.dz',
    en: 'name@school.dz',
  },
  'login.passwordLabel': {
    fr: 'Mot de passe',
    ar: 'كلمة المرور',
    en: 'Password',
  },
  'login.submit': {
    fr: 'Se connecter',
    ar: 'تسجيل الدخول',
    en: 'Sign in',
  },
  'login.submitLoading': {
    fr: 'Authentification...',
    ar: 'جار التحقق...',
    en: 'Signing in...',
  },
  'login.policiesLink': {
    fr: 'Mentions légales et confidentialité',
    ar: 'الشروط القانونية والخصوصية',
    en: 'Legal notices and privacy',
  },
  'language.label': {
    fr: 'Langue',
    ar: 'اللغة',
    en: 'Language',
  },
  'language.fr': {
    fr: 'Français',
    ar: 'الفرنسية',
    en: 'French',
  },
  'language.ar': {
    fr: 'Arabe',
    ar: 'العربية',
    en: 'Arabic',
  },
  'language.en': {
    fr: 'Anglais',
    ar: 'الإنجليزية',
    en: 'English',
  },
  'layout.skipContent': {
    fr: 'Aller au contenu principal',
    ar: 'الانتقال إلى المحتوى الرئيسي',
    en: 'Skip to main content',
  },
  'layout.openMenu': {
    fr: 'Ouvrir le menu',
    ar: 'فتح القائمة',
    en: 'Open menu',
  },
  'nav.main': {
    fr: 'Navigation principale',
    ar: 'التنقل الرئيسي',
    en: 'Main navigation',
  },
  'nav.schoolManagement': {
    fr: 'Gestion écoles',
    ar: 'إدارة المدارس',
    en: 'School management',
  },
  'nav.legal': {
    fr: 'Mentions légales',
    ar: 'الشروط القانونية',
    en: 'Legal notices',
  },
  'nav.directorAnalytics': {
    fr: 'Analyse établissement',
    ar: 'تحليلات المؤسسة',
    en: 'School analytics',
  },
  'nav.directorOverview': {
    fr: "Vue d'ensemble",
    ar: 'نظرة عامة',
    en: 'Overview',
  },
  'nav.studentsParents': {
    fr: 'Élèves & parents',
    ar: 'التلاميذ والأولياء',
    en: 'Students & parents',
  },
  'nav.classesCourses': {
    fr: 'Classes & matières',
    ar: 'الأقسام والمواد',
    en: 'Classes & courses',
  },
  'nav.teamTeachers': {
    fr: 'Enseignants',
    ar: 'المعلمون',
    en: 'Teachers',
  },
  'nav.teacherClass': {
    fr: 'Mon espace classe',
    ar: 'فضاء القسم',
    en: 'My class space',
  },
  'nav.parentSpace': {
    fr: 'Espace parents',
    ar: 'فضاء أولياء الأمور',
    en: 'Parent space',
  },
  'sidebar.collapse': {
    fr: 'Réduire le menu',
    ar: 'طي القائمة',
    en: 'Collapse menu',
  },
  'sidebar.expand': {
    fr: 'Agrandir le menu',
    ar: 'توسيع القائمة',
    en: 'Expand menu',
  },
  'sidebar.activeRole': {
    fr: 'Rôle actif',
    ar: 'الدور النشط',
    en: 'Active role',
  },
  'sidebar.userFallback': {
    fr: 'Utilisateur',
    ar: 'مستخدم',
    en: 'User',
  },
  'sidebar.logout': {
    fr: 'Se déconnecter',
    ar: 'تسجيل الخروج',
    en: 'Sign out',
  },
  'workspace.activeAria': {
    fr: 'Espace actif',
    ar: 'مساحة العمل النشطة',
    en: 'Active workspace',
  },
  'workspace.chooseTitle': {
    fr: 'Choisissez votre espace',
    ar: 'اختاروا مساحة العمل',
    en: 'Choose workspace',
  },
  'workspace.chooseCopy': {
    fr: 'Chaque relation reste dans son propre contexte.',
    ar: 'يبقى كل دور في سياقه الخاص.',
    en: 'Each relationship stays in its own context.',
  },
  'workspace.continueAs': {
    fr: 'Continuer comme {role}',
    ar: 'المتابعة كـ {role}',
    en: 'Continue as {role}',
  },
  'role.system_admin': {
    fr: 'SuperAdmin',
    ar: 'مدير النظام',
    en: 'SuperAdmin',
  },
  'role.principal': {
    fr: 'Directeur',
    ar: 'مدير',
    en: 'Director',
  },
  'role.secretary': {
    fr: 'Administration',
    ar: 'الإدارة',
    en: 'Administration',
  },
  'role.teacher': {
    fr: 'Enseignant',
    ar: 'معلم',
    en: 'Teacher',
  },
  'role.parent': {
    fr: 'Parent',
    ar: 'ولي أمر',
    en: 'Parent',
  },
  'superadmin.loading': {
    fr: 'Chargement des écoles...',
    ar: 'جار تحميل المدارس...',
    en: 'Loading schools...',
  },
  'superadmin.loadError': {
    fr: 'Erreur lors du chargement des écoles.',
    ar: 'حدث خطأ أثناء تحميل المدارس.',
    en: 'Error while loading schools.',
  },
  'superadmin.toastPaymentSuccess': {
    fr: 'Paiement enregistré avec succès !',
    ar: 'تم تسجيل الدفع بنجاح.',
    en: 'Payment saved successfully.',
  },
  'superadmin.toastPaymentError': {
    fr: 'Erreur : {message}',
    ar: 'خطأ: {message}',
    en: 'Error: {message}',
  },
  'superadmin.title': {
    fr: 'Gestion des écoles',
    ar: 'إدارة المدارس',
    en: 'School management',
  },
  'superadmin.subtitle': {
    fr: 'Gérez les abonnements et les paiements de vos clients SaaS.',
    ar: 'تابعوا اشتراكات ومدفوعات المدارس المشتركة.',
    en: 'Manage subscriptions and payments for your SaaS customers.',
  },
  'superadmin.statusExpired': {
    fr: 'Expiré',
    ar: 'منتهي',
    en: 'Expired',
  },
  'superadmin.statusActive': {
    fr: 'Actif',
    ar: 'نشط',
    en: 'Active',
  },
  'superadmin.expiration': {
    fr: 'Expiration : {date}',
    ar: 'تاريخ الانتهاء: {date}',
    en: 'Expiration: {date}',
  },
  'superadmin.never': {
    fr: 'Jamais',
    ar: 'لا يوجد',
    en: 'Never',
  },
  'superadmin.addPayment': {
    fr: 'Ajouter un paiement',
    ar: 'إضافة دفع',
    en: 'Add payment',
  },
  'superadmin.addPaymentFor': {
    fr: 'Ajouter un paiement pour {school}',
    ar: 'إضافة دفع لـ {school}',
    en: 'Add payment for {school}',
  },
  'superadmin.paymentTitle': {
    fr: 'Paiement espèces',
    ar: 'دفع نقدي',
    en: 'Cash payment',
  },
  'superadmin.schoolLabel': {
    fr: 'École :',
    ar: 'المدرسة:',
    en: 'School:',
  },
  'superadmin.amountLabel': {
    fr: 'Montant (DA)',
    ar: 'المبلغ (دج)',
    en: 'Amount (DZD)',
  },
  'superadmin.amountPlaceholder': {
    fr: 'Ex. 150000',
    ar: 'مثال: 150000',
    en: 'e.g. 150000',
  },
  'superadmin.schoolId': {
    fr: 'ID : {id}',
    ar: 'المعرف: {id}',
    en: 'ID: {id}',
  },
  'superadmin.monthsLabel': {
    fr: 'Mois à ajouter',
    ar: 'الأشهر المراد إضافتها',
    en: 'Months to add',
  },
  'superadmin.cancelPayment': {
    fr: 'Annuler',
    ar: 'إلغاء',
    en: 'Cancel',
  },
  'superadmin.validatePayment': {
    fr: 'Valider',
    ar: 'تأكيد',
    en: 'Confirm',
  },
  'superadmin.cancelPaymentAria': {
    fr: 'Annuler le paiement',
    ar: 'إلغاء الدفع',
    en: 'Cancel payment',
  },
  'superadmin.validatePaymentAria': {
    fr: 'Valider le paiement',
    ar: 'تأكيد الدفع',
    en: 'Confirm payment',
  },
  'director.tooltipAverage': {
    fr: 'Moyenne : {score}/20',
    ar: 'المعدل: {score}/20',
    en: 'Average: {score}/20',
  },
  'director.loading': {
    fr: "Chargement des données d'établissement...",
    ar: 'جار تحميل بيانات المؤسسة...',
    en: 'Loading school data...',
  },
  'director.loadError': {
    fr: 'Erreur lors de la récupération des statistiques scolaires.',
    ar: 'تعذر تحميل الإحصائيات المدرسية.',
    en: 'Error while loading school statistics.',
  },
  'director.eyebrow': {
    fr: 'Tableau de bord académique',
    ar: 'لوحة التحليل الأكاديمي',
    en: 'Academic dashboard',
  },
  'director.title': {
    fr: 'Wasel Edu Directeur',
    ar: 'Wasel Edu المدير',
    en: 'Wasel Edu Director',
  },
  'director.subtitle': {
    fr: "Analysez les performances scolaires globales et le taux d'adoption de votre école.",
    ar: 'حللوا الأداء الدراسي العام ونسبة استخدام المنصة في مدرستكم.',
    en: 'Analyze school-wide performance and platform adoption.',
  },
  'director.schoolAverage': {
    fr: 'Moyenne générale école',
    ar: 'المعدل العام للمدرسة',
    en: 'School average',
  },
  'director.absenceRate': {
    fr: "Taux moyen d'absence",
    ar: 'متوسط نسبة الغياب',
    en: 'Average absence rate',
  },
  'director.performanceTitle': {
    fr: 'Performances par classe',
    ar: 'الأداء حسب القسم',
    en: 'Performance by class',
  },
  'director.performanceCopy': {
    fr: 'Moyenne pondérée générale des élèves enregistrés pour chaque classe active.',
    ar: 'المعدل العام المرجح للطلاب المسجلين في كل قسم نشط.',
    en: 'Weighted average for registered students in each active class.',
  },
  'director.realtime': {
    fr: 'Données temps réel',
    ar: 'بيانات مباشرة',
    en: 'Real-time data',
  },
  'director.chartAria': {
    fr: 'Graphique des performances par classe',
    ar: 'رسم بياني للأداء حسب القسم',
    en: 'Class performance chart',
  },
  'director.topStudents': {
    fr: 'Élèves félicités',
    ar: 'الطلاب المتميزون',
    en: 'Top students',
  },
  'director.strugglingStudents': {
    fr: 'Élèves en difficulté',
    ar: 'الطلاب الذين يحتاجون دعما',
    en: 'Students needing support',
  },
  'director.emptyGrades': {
    fr: 'Aucune note enregistrée.',
    ar: 'لا توجد درجات مسجلة.',
    en: 'No grades recorded.',
  },
  'director.emptyStruggling': {
    fr: 'Aucun élève en difficulté.',
    ar: 'لا يوجد طلاب في وضع صعب.',
    en: 'No students currently need support.',
  },
  'director.tab.overview': {
    fr: "Vue d'ensemble",
    ar: 'نظرة عامة',
    en: 'Overview',
  },
  'director.tab.students': {
    fr: 'Élèves & parents',
    ar: 'التلاميذ والأولياء',
    en: 'Students & parents',
  },
  'director.tab.classes': {
    fr: 'Classes & matières',
    ar: 'الأقسام والمواد',
    en: 'Classes & courses',
  },
  'director.tab.team': {
    fr: 'Équipe enseignante',
    ar: 'الفريق التربوي',
    en: 'Teaching team',
  },
  'director.headerEyebrow': {
    fr: 'Console directeur',
    ar: 'لوحة المدير',
    en: 'Director console',
  },
  'director.headerCopy': {
    fr: "Pilotez l'établissement : données scolaires, familles, classes, matières et équipe enseignante.",
    ar: 'سيروا المؤسسة: البيانات المدرسية، العائلات، الأقسام، المواد والفريق التربوي.',
    en: 'Manage the school: academic data, families, classes, courses, and teaching team.',
  },
  'director.sectionsAria': {
    fr: 'Sections directeur',
    ar: 'أقسام المدير',
    en: 'Director sections',
  },
  'director.status.active': {
    fr: 'Actif',
    ar: 'نشط',
    en: 'Active',
  },
  'director.status.pending': {
    fr: 'En attente',
    ar: 'في الانتظار',
    en: 'Pending',
  },
  'director.archive.graduated': {
    fr: 'Diplômé',
    ar: 'متخرج',
    en: 'Graduated',
  },
  'director.archive.transferred': {
    fr: 'Transfert',
    ar: 'انتقال',
    en: 'Transferred',
  },
  'director.archive.other': {
    fr: 'Autre',
    ar: 'آخر',
    en: 'Other',
  },
  'director.pending.title': {
    fr: 'Absences à traiter',
    ar: 'غيابات تحتاج إلى معالجة',
    en: 'Attendance to review',
  },
  'director.pending.copy': {
    fr: "Elles restent visibles jusqu'à validation administrative de la justification.",
    ar: 'تبقى ظاهرة إلى أن تقبل الإدارة المبرر.',
    en: 'They stay visible until administration approves the justification.',
  },
  'director.pending.count': {
    fr: '{count} en attente',
    ar: '{count} في الانتظار',
    en: '{count} pending',
  },
  'director.pending.loading': {
    fr: 'Chargement des absences...',
    ar: 'جار تحميل الغيابات...',
    en: 'Loading attendance...',
  },
  'director.pending.error': {
    fr: 'Impossible de charger les absences à traiter.',
    ar: 'تعذر تحميل الغيابات التي تحتاج إلى معالجة.',
    en: 'Unable to load attendance to review.',
  },
  'director.pending.empty': {
    fr: 'Aucune absence non justifiée à traiter.',
    ar: 'لا توجد غيابات غير مبررة للمعالجة.',
    en: 'No unjustified attendance records to review.',
  },
  'director.pending.justificationReceived': {
    fr: 'Justificatif reçu',
    ar: 'تم استلام المبرر',
    en: 'Justification received',
  },
  'director.pending.adminJustification': {
    fr: 'Justificatif administratif',
    ar: 'مبرر إداري',
    en: 'Administrative justification',
  },
  'director.pending.placeholder': {
    fr: 'Saisir ou vérifier le motif avant validation',
    ar: 'أدخلوا أو تحققوا من السبب قبل التأكيد',
    en: 'Enter or verify the reason before approval',
  },
  'director.pending.validate': {
    fr: 'Valider',
    ar: 'قبول',
    en: 'Approve',
  },
  'director.attendance.absent': {
    fr: 'Absent',
    ar: 'غائب',
    en: 'Absent',
  },
  'director.attendance.late': {
    fr: 'Retard',
    ar: 'متأخر',
    en: 'Late',
  },
  'director.students.title': {
    fr: 'Élèves et liaison parents',
    ar: 'التلاميذ وربط الأولياء',
    en: 'Students and parent links',
  },
  'director.students.copy': {
    fr: "Importez les élèves, générez les QR de liaison parent, consultez les PIN et l'historique d'accès.",
    ar: 'استوردوا التلاميذ، أنشئوا رموز QR لربط الأولياء، وراجعوا أرقام PIN وسجل الوصول.',
    en: 'Import students, generate parent-link QR codes, review PINs and access history.',
  },
  'director.students.csvTemplate': {
    fr: 'Modèle CSV',
    ar: 'نموذج CSV',
    en: 'CSV template',
  },
  'director.students.importCsv': {
    fr: 'Importer CSV',
    ar: 'استيراد CSV',
    en: 'Import CSV',
  },
  'director.students.search': {
    fr: 'Rechercher par nom, identifiant ou PIN',
    ar: 'البحث بالاسم أو المعرف أو PIN',
    en: 'Search by name, ID, or PIN',
  },
  'director.students.active': {
    fr: 'Élèves actifs',
    ar: 'التلاميذ النشطون',
    en: 'Active students',
  },
  'director.students.archives': {
    fr: 'Archives',
    ar: 'الأرشيف',
    en: 'Archives',
  },
  'director.students.qrIssued': {
    fr: 'QR émis',
    ar: 'رموز QR الصادرة',
    en: 'QR issued',
  },
  'director.students.student': {
    fr: 'Élève',
    ar: 'التلميذ',
    en: 'Student',
  },
  'director.students.identifier': {
    fr: 'Identifiant',
    ar: 'المعرف',
    en: 'Identifier',
  },
  'director.students.status': {
    fr: 'Statut',
    ar: 'الحالة',
    en: 'Status',
  },
  'director.students.actions': {
    fr: 'Actions',
    ar: 'الإجراءات',
    en: 'Actions',
  },
  'director.students.loading': {
    fr: 'Chargement des élèves...',
    ar: 'جار تحميل التلاميذ...',
    en: 'Loading students...',
  },
  'director.students.empty': {
    fr: 'Aucun élève trouvé.',
    ar: 'لم يتم العثور على أي تلميذ.',
    en: 'No student found.',
  },
  'director.parentLink.title': {
    fr: 'Fiche liaison parent',
    ar: 'بطاقة ربط الولي',
    en: 'Parent link card',
  },
  'director.parentLink.copy': {
    fr: 'Choisissez un élève, puis générez un token QR nominatif pour un parent.',
    ar: 'اختاروا تلميذا ثم أنشئوا رمز QR خاصا بوليه.',
    en: 'Choose a student, then generate a named QR token for a parent.',
  },
  'director.parentLink.label': {
    fr: 'Libellé du token',
    ar: 'تسمية الرمز',
    en: 'Token label',
  },
  'director.parentLink.mother': {
    fr: 'Mère',
    ar: 'الأم',
    en: 'Mother',
  },
  'director.parentLink.father': {
    fr: 'Père',
    ar: 'الأب',
    en: 'Father',
  },
  'director.parentLink.guardian': {
    fr: 'Tuteur',
    ar: 'الوصي',
    en: 'Guardian',
  },
  'director.parentLink.parent': {
    fr: 'Parent',
    ar: 'ولي',
    en: 'Parent',
  },
  'director.parentLink.undefinedId': {
    fr: 'Identifiant non défini',
    ar: 'المعرف غير محدد',
    en: 'Identifier not set',
  },
  'director.parentLink.selectStudent': {
    fr: 'Sélectionnez un élève dans la liste.',
    ar: 'اختاروا تلميذا من القائمة.',
    en: 'Select a student from the list.',
  },
  'director.parentLink.generateQr': {
    fr: 'Générer QR parent',
    ar: 'إنشاء QR للولي',
    en: 'Generate parent QR',
  },
  'director.parentLink.history': {
    fr: 'Historique des liens',
    ar: 'سجل الروابط',
    en: 'Link history',
  },
  'director.parentLink.usedBy': {
    fr: 'Utilisé par {name}',
    ar: 'استعمله {name}',
    en: 'Used by {name}',
  },
  'director.parentLink.revokedOn': {
    fr: 'Révoqué le {date}',
    ar: 'أُلغي في {date}',
    en: 'Revoked on {date}',
  },
  'director.parentLink.usedOn': {
    fr: 'Utilisé le {date}',
    ar: 'استُعمل في {date}',
    en: 'Used on {date}',
  },
  'director.parentLink.revoke': {
    fr: 'Révoquer',
    ar: 'إلغاء',
    en: 'Revoke',
  },
  'director.parentLink.empty': {
    fr: 'Aucun token émis pour cet élève.',
    ar: 'لم يصدر أي رمز لهذا التلميذ.',
    en: 'No token issued for this student.',
  },
  'director.classes.createTitle': {
    fr: 'Créer une classe',
    ar: 'إنشاء قسم',
    en: 'Create a class',
  },
  'director.classes.createCopy': {
    fr: "Les classes portent les listes d'élèves, les enseignants et les matières affectées.",
    ar: 'تجمع الأقسام قوائم التلاميذ والمعلمين والمواد المسندة.',
    en: 'Classes carry student lists, teachers, and assigned courses.',
  },
  'director.classes.className': {
    fr: 'Nom de la classe',
    ar: 'اسم القسم',
    en: 'Class name',
  },
  'director.classes.classNamePlaceholder': {
    fr: 'Ex : 4AM1',
    ar: 'مثال: 4AM1',
    en: 'Example: 4AM1',
  },
  'director.classes.specialty': {
    fr: 'Spécialité ou niveau',
    ar: 'التخصص أو المستوى',
    en: 'Specialty or level',
  },
  'director.classes.specialtyPlaceholder': {
    fr: 'Ex : Cycle moyen',
    ar: 'مثال: الطور المتوسط',
    en: 'Example: Middle school',
  },
  'director.classes.createButton': {
    fr: 'Créer la classe',
    ar: 'إنشاء القسم',
    en: 'Create class',
  },
  'director.classes.addCourseTitle': {
    fr: 'Ajouter une matière',
    ar: 'إضافة مادة',
    en: 'Add a course',
  },
  'director.classes.addCourseCopy': {
    fr: "Adaptée au programme algérien ou aux besoins spécifiques de l'établissement.",
    ar: 'مناسبة للبرنامج الجزائري أو لاحتياجات المؤسسة الخاصة.',
    en: 'Adapted to the Algerian curriculum or the school’s needs.',
  },
  'director.classes.courseName': {
    fr: 'Nom de la matière',
    ar: 'اسم المادة',
    en: 'Course name',
  },
  'director.classes.courseNamePlaceholder': {
    fr: 'Ex : Mathématiques',
    ar: 'مثال: الرياضيات',
    en: 'Example: Mathematics',
  },
  'director.classes.add': {
    fr: 'Ajouter',
    ar: 'إضافة',
    en: 'Add',
  },
  'director.classes.title': {
    fr: 'Classes',
    ar: 'الأقسام',
    en: 'Classes',
  },
  'director.classes.copy': {
    fr: 'Consultez les codes, les enseignants et les effectifs.',
    ar: 'راجعوا الرموز والمعلمين وعدد التلاميذ.',
    en: 'Review codes, teachers, and headcounts.',
  },
  'director.classes.count': {
    fr: '{count} classe(s)',
    ar: '{count} قسم',
    en: '{count} class(es)',
  },
  'director.classes.code': {
    fr: 'Code',
    ar: 'الرمز',
    en: 'Code',
  },
  'director.classes.teachers': {
    fr: 'Enseignants',
    ar: 'المعلمون',
    en: 'Teachers',
  },
  'director.classes.students': {
    fr: 'Élèves',
    ar: 'التلاميذ',
    en: 'Students',
  },
  'director.classes.noSpecialty': {
    fr: 'Sans spécialité',
    ar: 'بدون تخصص',
    en: 'No specialty',
  },
  'director.classes.manage': {
    fr: 'Gérer',
    ar: 'تسيير',
    en: 'Manage',
  },
  'director.classes.loading': {
    fr: 'Chargement des classes...',
    ar: 'جار تحميل الأقسام...',
    en: 'Loading classes...',
  },
  'director.classes.empty': {
    fr: 'Aucune classe créée.',
    ar: 'لم يتم إنشاء أي قسم.',
    en: 'No class created.',
  },
  'director.classes.assignTitle': {
    fr: 'Affecter matière + enseignant',
    ar: 'إسناد مادة + معلم',
    en: 'Assign course + teacher',
  },
  'director.classes.assignCopy': {
    fr: "L'enseignant obtient ensuite l'accès pédagogique à cette classe.",
    ar: 'يحصل المعلم بعدها على الوصول التربوي لهذا القسم.',
    en: 'The teacher then gets teaching access to this class.',
  },
  'director.classes.chooseClass': {
    fr: 'Choisir une classe',
    ar: 'اختيار قسم',
    en: 'Choose a class',
  },
  'director.classes.course': {
    fr: 'Matière',
    ar: 'المادة',
    en: 'Course',
  },
  'director.classes.chooseCourse': {
    fr: 'Choisir une matière',
    ar: 'اختيار مادة',
    en: 'Choose a course',
  },
  'director.classes.coefficient': {
    fr: 'Coefficient',
    ar: 'المعامل',
    en: 'Coefficient',
  },
  'director.classes.teacher': {
    fr: 'Enseignant',
    ar: 'المعلم',
    en: 'Teacher',
  },
  'director.classes.chooseTeacher': {
    fr: 'Choisir un enseignant',
    ar: 'اختيار معلم',
    en: 'Choose a teacher',
  },
  'director.classes.assign': {
    fr: 'Affecter',
    ar: 'إسناد',
    en: 'Assign',
  },
  'director.classes.currentAssignments': {
    fr: 'Affectations actuelles',
    ar: 'الإسنادات الحالية',
    en: 'Current assignments',
  },
  'director.classes.noTeacher': {
    fr: 'Enseignant non défini',
    ar: 'المعلم غير محدد',
    en: 'Teacher not set',
  },
  'director.classes.noAssignment': {
    fr: 'Aucune affectation pour cette classe.',
    ar: 'لا توجد إسنادات لهذا القسم.',
    en: 'No assignment for this class.',
  },
  'director.classes.classStudentsTitle': {
    fr: 'Élèves de la classe',
    ar: 'تلاميذ القسم',
    en: 'Class students',
  },
  'director.classes.classStudentsCopy': {
    fr: "Remplacez la liste d'inscription de la classe sélectionnée.",
    ar: 'عدلوا قائمة التسجيل للقسم المحدد.',
    en: 'Replace the enrollment list for the selected class.',
  },
  'director.classes.importStudentsFirst': {
    fr: "Importez d'abord des élèves.",
    ar: 'استوردوا التلاميذ أولا.',
    en: 'Import students first.',
  },
  'director.classes.saveList': {
    fr: 'Enregistrer la liste',
    ar: 'حفظ القائمة',
    en: 'Save list',
  },
  'director.semesters.title': {
    fr: 'Trimestres',
    ar: 'الفصول الدراسية',
    en: 'Semesters',
  },
  'director.semesters.copy': {
    fr: 'Activez la période pédagogique courante.',
    ar: 'فعلوا الفترة الدراسية الحالية.',
    en: 'Activate the current academic period.',
  },
  'director.semesters.activate': {
    fr: 'Activer',
    ar: 'تفعيل',
    en: 'Activate',
  },
  'director.semesters.empty': {
    fr: 'Aucun trimestre configuré.',
    ar: 'لا يوجد أي فصل دراسي معد.',
    en: 'No semester configured.',
  },
  'director.team.inviteTitle': {
    fr: 'Inviter un enseignant',
    ar: 'دعوة معلم',
    en: 'Invite a teacher',
  },
  'director.team.inviteCopy': {
    fr: "Le compte est créé sans mot de passe. Le code invitation permet l'activation initiale.",
    ar: 'ينشأ الحساب بدون كلمة مرور. يسمح رمز الدعوة بالتفعيل الأول.',
    en: 'The account is created without a password. The invite code enables first activation.',
  },
  'director.team.fullName': {
    fr: 'Nom complet',
    ar: 'الاسم الكامل',
    en: 'Full name',
  },
  'director.team.fullNamePlaceholder': {
    fr: 'Ex : Samir Amrani',
    ar: 'مثال: سمير عمراني',
    en: 'Example: Samir Amrani',
  },
  'director.team.email': {
    fr: 'Email',
    ar: 'البريد الإلكتروني',
    en: 'Email',
  },
  'director.team.createInvite': {
    fr: "Créer l'invitation",
    ar: 'إنشاء الدعوة',
    en: 'Create invite',
  },
  'director.team.inviteCode': {
    fr: 'Code invitation',
    ar: 'رمز الدعوة',
    en: 'Invite code',
  },
  'director.team.shareInvite': {
    fr: 'Transmettez ce code à {name} pour finaliser son compte.',
    ar: 'أرسلوا هذا الرمز إلى {name} لإكمال حسابه.',
    en: 'Send this code to {name} to finish the account.',
  },
  'director.team.title': {
    fr: 'Enseignants',
    ar: 'المعلمون',
    en: 'Teachers',
  },
  'director.team.copy': {
    fr: "Comptes pédagogiques rattachés à l'établissement.",
    ar: 'الحسابات التربوية المرتبطة بالمؤسسة.',
    en: 'Teaching accounts attached to the school.',
  },
  'director.team.count': {
    fr: '{count} enseignant(s)',
    ar: '{count} معلم',
    en: '{count} teacher(s)',
  },
  'director.team.loading': {
    fr: 'Chargement des enseignants...',
    ar: 'جار تحميل المعلمين...',
    en: 'Loading teachers...',
  },
  'director.team.empty': {
    fr: 'Aucun enseignant créé.',
    ar: 'لم يتم إنشاء أي معلم.',
    en: 'No teacher created.',
  },
  'director.qr.title': {
    fr: 'QR parent',
    ar: 'QR الولي',
    en: 'Parent QR',
  },
  'director.qr.expiresOn': {
    fr: 'expire le {date}',
    ar: 'ينتهي في {date}',
    en: 'expires on {date}',
  },
  'director.qr.scanCopy': {
    fr: "Scannez ce QR depuis l'application mobile Wasel Edu avec un compte parent.",
    ar: 'امسحوا هذا الرمز من تطبيق Wasel Edu بحساب ولي.',
    en: 'Scan this QR from the Wasel Edu mobile app with a parent account.',
  },
  'director.qr.validUntil': {
    fr: "Valable jusqu'au {date}",
    ar: 'صالح إلى غاية {date}',
    en: 'Valid until {date}',
  },
  'director.qr.close': {
    fr: 'Fermer',
    ar: 'إغلاق',
    en: 'Close',
  },
  'director.qr.copy': {
    fr: 'Copier',
    ar: 'نسخ',
    en: 'Copy',
  },
  'director.qr.share': {
    fr: 'Partager',
    ar: 'مشاركة',
    en: 'Share',
  },
  'director.qr.print': {
    fr: 'Imprimer',
    ar: 'طباعة',
    en: 'Print',
  },
  'director.qr.student': {
    fr: 'Élève : {name}',
    ar: 'التلميذ: {name}',
    en: 'Student: {name}',
  },
  'director.qr.shareInstructions': {
    fr: "Ouvrez l'application mobile Wasel Edu, connectez-vous comme parent, puis utilisez la liaison par QR/token.",
    ar: 'افتحوا تطبيق Wasel Edu، سجلوا الدخول كولي، ثم استعملوا الربط عبر QR أو الرمز.',
    en: 'Open the Wasel Edu mobile app, sign in as a parent, then use QR/token linking.',
  },
  'director.qr.parentToken': {
    fr: 'Token parent : {token}',
    ar: 'رمز الولي: {token}',
    en: 'Parent token: {token}',
  },
  'director.qr.shareTitle': {
    fr: 'QR parent Wasel Edu',
    ar: 'QR ولي Wasel Edu',
    en: 'Wasel Edu parent QR',
  },
  'director.toast.justificationApproved': {
    fr: "Justification validée. L'absence sort du tableau de suivi.",
    ar: 'تم قبول المبرر. سيختفي الغياب من جدول المتابعة.',
    en: 'Justification approved. The attendance record leaves the review table.',
  },
  'director.toast.justificationRequired': {
    fr: "Ajoutez ou recevez un justificatif avant de retirer l'absence du suivi.",
    ar: 'أضيفوا أو استلموا مبررا قبل إزالة الغياب من المتابعة.',
    en: 'Add or receive a justification before removing the absence from review.',
  },
  'director.toast.importedStudents': {
    fr: '{imported} élève(s) importé(s). {skipped} ligne(s) ignorée(s).',
    ar: 'تم استيراد {imported} تلميذ. تم تجاهل {skipped} سطر.',
    en: '{imported} student(s) imported. {skipped} row(s) skipped.',
  },
  'director.toast.parentQrGenerated': {
    fr: 'QR parent généré pour 7 jours.',
    ar: 'تم إنشاء QR للولي لمدة 7 أيام.',
    en: 'Parent QR generated for 7 days.',
  },
  'director.toast.pinRegenerated': {
    fr: 'Nouveau PIN pour {student} : {pin}',
    ar: 'تم إنشاء رمز PIN جديد لـ {student}: {pin}',
    en: 'New PIN for {student}: {pin}',
  },
  'director.toast.linkRevoked': {
    fr: 'Lien parent révoqué et sessions invalidées.',
    ar: 'تم إلغاء رابط الولي وتعطيل الجلسات.',
    en: 'Parent link revoked and sessions invalidated.',
  },
  'director.toast.teacherCreated': {
    fr: 'Compte enseignant créé avec code invitation.',
    ar: 'تم إنشاء حساب المعلم مع رمز دعوة.',
    en: 'Teacher account created with invite code.',
  },
  'director.toast.classCreated': {
    fr: 'Classe {name} créée.',
    ar: 'تم إنشاء القسم {name}.',
    en: 'Class {name} created.',
  },
  'director.toast.courseAdded': {
    fr: 'Matière {name} ajoutée.',
    ar: 'تمت إضافة المادة {name}.',
    en: 'Course {name} added.',
  },
  'director.toast.courseAssigned': {
    fr: 'Matière affectée à la classe.',
    ar: 'تم إسناد المادة إلى القسم.',
    en: 'Course assigned to the class.',
  },
  'director.toast.classListSaved': {
    fr: 'Liste des élèves de la classe mise à jour.',
    ar: 'تم تحديث قائمة تلاميذ القسم.',
    en: 'Class student list updated.',
  },
  'director.toast.semesterActivated': {
    fr: 'Trimestre activé.',
    ar: 'تم تفعيل الثلاثي.',
    en: 'Semester activated.',
  },
  'director.toast.clipboardBlocked': {
    fr: 'Copie bloquée par le navigateur. Sélectionnez le token manuellement.',
    ar: 'منع المتصفح النسخ. يرجى تحديد الرمز يدويا.',
    en: 'Copy blocked by the browser. Select the token manually.',
  },
  'director.toast.csvCopied': {
    fr: 'Modèle CSV copié.',
    ar: 'تم نسخ نموذج CSV.',
    en: 'CSV template copied.',
  },
  'director.toast.inviteCopied': {
    fr: 'Code invitation copié.',
    ar: 'تم نسخ رمز الدعوة.',
    en: 'Invite code copied.',
  },
  'director.toast.qrCopied': {
    fr: 'Token QR copié.',
    ar: 'تم نسخ رمز QR.',
    en: 'QR token copied.',
  },
  'director.toast.shareFallback': {
    fr: 'Partage natif indisponible ici ; texte copié.',
    ar: 'المشاركة المباشرة غير متاحة هنا؛ تم نسخ النص.',
    en: 'Native sharing is unavailable here; text copied.',
  },
  'director.toast.smsCopied': {
    fr: 'Texte copié avant ouverture SMS.',
    ar: 'تم نسخ النص قبل فتح الرسائل.',
    en: 'Text copied before opening SMS.',
  },
  'director.error.missingSchoolId': {
    fr: "L'identifiant école est introuvable dans la session.",
    ar: 'معرف المدرسة غير موجود في الجلسة.',
    en: 'School identifier is missing from the session.',
  },
  'director.error.chooseClass': {
    fr: 'Choisissez une classe.',
    ar: 'اختاروا قسما.',
    en: 'Choose a class.',
  },
  'teacher.eyebrow': {
    fr: 'Espace pédagogique enseignant',
    ar: 'فضاء المعلم التربوي',
    en: 'Teacher workspace',
  },
  'teacher.title': {
    fr: 'Mon espace classe',
    ar: 'فضاء القسم',
    en: 'My class space',
  },
  'teacher.subtitle': {
    fr: "Gérez l'appel, consultez votre emploi du temps et communiquez directement avec les familles.",
    ar: 'سجلوا الحضور، تابعوا الجدول، وتواصلوا مباشرة مع العائلات.',
    en: 'Manage attendance, view your schedule, and communicate directly with families.',
  },
  'teacher.tabsAria': {
    fr: "Sections de l'espace enseignant",
    ar: 'أقسام فضاء المعلم',
    en: 'Teacher workspace sections',
  },
  'teacher.tabClasses': {
    fr: 'Appel et classes',
    ar: 'الحضور والأقسام',
    en: 'Attendance and classes',
  },
  'teacher.tabGrades': {
    fr: 'Notes',
    ar: 'الدرجات',
    en: 'Grades',
  },
  'teacher.tabSchedule': {
    fr: 'Emploi du temps',
    ar: 'جدول الحصص',
    en: 'Schedule',
  },
  'teacher.tabChat': {
    fr: 'Messagerie parents',
    ar: 'رسائل أولياء الأمور',
    en: 'Parent messages',
  },
  'teacher.assignedClasses': {
    fr: 'Mes classes assignées',
    ar: 'أقسامي المسندة',
    en: 'My assigned classes',
  },
  'teacher.selectClassAria': {
    fr: 'Sélectionner {name} - {subject}',
    ar: 'اختيار {name} - {subject}',
    en: 'Select {name} - {subject}',
  },
  'teacher.studentsCount': {
    fr: '{count} élèves',
    ar: '{count} طالب',
    en: '{count} students',
  },
  'teacher.averageShort': {
    fr: 'Moy. {average}/20',
    ar: 'المعدل {average}/20',
    en: 'Avg. {average}/20',
  },
  'teacher.attendanceTitle': {
    fr: "Fiche d'appel",
    ar: 'ورقة الحضور',
    en: 'Attendance sheet',
  },
  'teacher.attendanceCopy': {
    fr: '{className} - Appel du jour',
    ar: '{className} - حضور اليوم',
    en: '{className} - Today attendance',
  },
  'teacher.saveAttendance': {
    fr: "Enregistrer l'appel",
    ar: 'حفظ الحضور',
    en: 'Save attendance',
  },
  'teacher.toastIncomplete': {
    fr: "Veuillez faire l'appel pour tous les élèves.",
    ar: 'يرجى تسجيل الحضور لكل الطلاب.',
    en: 'Please mark attendance for every student.',
  },
  'teacher.toastSaved': {
    fr: "Fiche d'appel enregistrée avec succès !",
    ar: 'تم حفظ ورقة الحضور بنجاح.',
    en: 'Attendance saved successfully.',
  },
  'teacher.gradesTitle': {
    fr: 'Saisie des notes',
    ar: 'إدخال الدرجات',
    en: 'Grade entry',
  },
  'teacher.gradesCopy': {
    fr: '{className} - Notes par élève et par module',
    ar: '{className} - درجات حسب التلميذ والمادة',
    en: '{className} - Grades by student and course',
  },
  'teacher.gradePendingCount': {
    fr: '{count} en attente',
    ar: '{count} في الانتظار',
    en: '{count} pending',
  },
  'teacher.gradeStudent': {
    fr: 'Élève',
    ar: 'التلميذ',
    en: 'Student',
  },
  'teacher.gradeChooseStudent': {
    fr: 'Choisir un élève',
    ar: 'اختيار تلميذ',
    en: 'Choose a student',
  },
  'teacher.gradeCourse': {
    fr: 'Module',
    ar: 'المادة',
    en: 'Course',
  },
  'teacher.gradeManualSubject': {
    fr: 'Saisie manuelle du module',
    ar: 'إدخال المادة يدويا',
    en: 'Manual course entry',
  },
  'teacher.gradeCoefficientShort': {
    fr: 'coef. {coefficient}',
    ar: 'المعامل {coefficient}',
    en: 'coef. {coefficient}',
  },
  'teacher.gradeSubject': {
    fr: 'Nom du module',
    ar: 'اسم المادة',
    en: 'Course name',
  },
  'teacher.gradeScore': {
    fr: 'Note',
    ar: 'الدرجة',
    en: 'Score',
  },
  'teacher.gradeMaxScore': {
    fr: 'Barème',
    ar: 'السلم',
    en: 'Max score',
  },
  'teacher.gradeComment': {
    fr: 'Observation',
    ar: 'ملاحظة',
    en: 'Comment',
  },
  'teacher.gradeCommentPlaceholder': {
    fr: 'Ex. devoir surveillé, participation, rattrapage...',
    ar: 'مثال: فرض، مشاركة، استدراك...',
    en: 'Example: test, participation, retake...',
  },
  'teacher.gradeSave': {
    fr: 'Ajouter la note',
    ar: 'إضافة الدرجة',
    en: 'Add grade',
  },
  'teacher.gradeValidationHint': {
    fr: 'La note sera visible aux parents après validation par la direction.',
    ar: 'تظهر الدرجة للأولياء بعد اعتمادها من الإدارة.',
    en: 'Parents see the grade after administration approval.',
  },
  'teacher.latestGrades': {
    fr: 'Dernières notes',
    ar: 'آخر الدرجات',
    en: 'Latest grades',
  },
  'teacher.emptyGrades': {
    fr: 'Aucune note enregistrée pour cette classe.',
    ar: 'لا توجد درجات مسجلة لهذا القسم.',
    en: 'No grades recorded for this class.',
  },
  'teacher.gradeApproved': {
    fr: 'Validée',
    ar: 'معتمدة',
    en: 'Approved',
  },
  'teacher.gradePending': {
    fr: 'En attente',
    ar: 'في الانتظار',
    en: 'Pending',
  },
  'teacher.gradeToastSaved': {
    fr: 'Note ajoutée. Elle attend la validation administrative.',
    ar: 'تمت إضافة الدرجة وهي في انتظار اعتماد الإدارة.',
    en: 'Grade added. It is waiting for administration approval.',
  },
  'teacher.gradeStudentRequired': {
    fr: 'Choisissez un élève.',
    ar: 'اختاروا تلميذا.',
    en: 'Choose a student.',
  },
  'teacher.gradeSubjectRequired': {
    fr: 'Indiquez le module de la note.',
    ar: 'أدخلوا مادة الدرجة.',
    en: 'Enter the course for this grade.',
  },
  'teacher.gradeScoreInvalid': {
    fr: 'La note et le barème doivent être numériques.',
    ar: 'يجب أن تكون الدرجة والسلم أرقاما.',
    en: 'Score and max score must be numeric.',
  },
  'teacher.gradeScoreRange': {
    fr: 'La note doit être comprise entre 0 et le barème.',
    ar: 'يجب أن تكون الدرجة بين 0 والسلم.',
    en: 'Score must be between 0 and the max score.',
  },
  'teacher.studentName': {
    fr: "Nom de l'élève",
    ar: 'اسم الطالب',
    en: 'Student name',
  },
  'teacher.presence': {
    fr: 'Présence',
    ar: 'الحضور',
    en: 'Attendance',
  },
  'teacher.markPresent': {
    fr: 'Marquer {student} présent',
    ar: 'تسجيل {student} حاضر',
    en: 'Mark {student} present',
  },
  'teacher.markAbsent': {
    fr: 'Marquer {student} absent',
    ar: 'تسجيل {student} غائب',
    en: 'Mark {student} absent',
  },
  'teacher.present': {
    fr: 'Présent',
    ar: 'حاضر',
    en: 'Present',
  },
  'teacher.absent': {
    fr: 'Absent',
    ar: 'غائب',
    en: 'Absent',
  },
  'teacher.scheduleTitle': {
    fr: 'Mon emploi du temps hebdomadaire',
    ar: 'جدولي الأسبوعي',
    en: 'My weekly schedule',
  },
  'teacher.scheduleCopy': {
    fr: "Heures de cours assignées dans l'établissement.",
    ar: 'الحصص المسندة داخل المؤسسة.',
    en: 'Assigned teaching hours in the school.',
  },
  'teacher.day': {
    fr: 'Jour',
    ar: 'اليوم',
    en: 'Day',
  },
  'teacher.timeSlot': {
    fr: 'Créneau horaire',
    ar: 'الفترة الزمنية',
    en: 'Time slot',
  },
  'teacher.class': {
    fr: 'Classe',
    ar: 'القسم',
    en: 'Class',
  },
  'teacher.room': {
    fr: 'Salle de classe',
    ar: 'القاعة',
    en: 'Classroom',
  },
  'teacher.discussions': {
    fr: 'Discussions',
    ar: 'المحادثات',
    en: 'Conversations',
  },
  'teacher.parentConversationAria': {
    fr: 'Conversation avec M. Dubois',
    ar: 'محادثة مع السيد دوبوا',
    en: 'Conversation with Mr. Dubois',
  },
  'teacher.onlineParent': {
    fr: 'En ligne - Parent de Thomas Dubois (Terminale S1)',
    ar: 'متصل - ولي أمر توماس دوبوا (Terminale S1)',
    en: 'Online - Parent of Thomas Dubois (Terminale S1)',
  },
  'teacher.validatedLink': {
    fr: 'Filiation validée',
    ar: 'تم تأكيد الرابط العائلي',
    en: 'Relationship verified',
  },
  'teacher.messagesAria': {
    fr: 'Messages de la conversation',
    ar: 'رسائل المحادثة',
    en: 'Conversation messages',
  },
  'teacher.messagePlaceholder': {
    fr: 'Répondre au parent...',
    ar: 'الرد على ولي الأمر...',
    en: 'Reply to the parent...',
  },
  'teacher.writeMessage': {
    fr: 'Écrire un message',
    ar: 'كتابة رسالة',
    en: 'Write a message',
  },
  'teacher.sendMessage': {
    fr: 'Envoyer le message',
    ar: 'إرسال الرسالة',
    en: 'Send message',
  },
  'teacher.senderYou': {
    fr: 'Vous',
    ar: 'أنت',
    en: 'You',
  },
  'teacher.autoReply': {
    fr: 'Bien reçu ! Nous continuerons de suivre son travail à la maison.',
    ar: 'تم الاستلام. سنواصل متابعة عمله في المنزل.',
    en: 'Got it. We will keep following his work at home.',
  },
  'teacher.classNotFound': {
    fr: 'Classe introuvable.',
    ar: 'تعذر العثور على القسم.',
    en: 'Class not found.',
  },
  'teacher.socketConnecting': {
    fr: 'Messagerie en cours de connexion. Réessayez dans un instant.',
    ar: 'جاري ربط الرسائل. حاولوا مجددا بعد لحظة.',
    en: 'Messaging is still connecting. Try again in a moment.',
  },
  'teacher.emptyClasses': {
    fr: 'Aucune classe ne vous est encore assignée.',
    ar: 'لم يتم إسناد أي قسم لكم بعد.',
    en: 'No class has been assigned to you yet.',
  },
  'teacher.emptyStudents': {
    fr: 'Aucun élève inscrit dans cette classe.',
    ar: 'لا يوجد تلاميذ مسجلون في هذا القسم.',
    en: 'No students are enrolled in this class.',
  },
  'teacher.emptySchedule': {
    fr: 'Aucun créneau de planning disponible.',
    ar: 'لا يوجد أي موعد في الجدول حاليا.',
    en: 'No schedule slot is available.',
  },
  'teacher.emptyMessages': {
    fr: 'Aucun message dans cette classe.',
    ar: 'لا توجد رسائل في هذا القسم.',
    en: 'No messages in this class.',
  },
  'teacher.noMessagePreview': {
    fr: 'Aucun message.',
    ar: 'لا توجد رسائل.',
    en: 'No messages.',
  },
  'teacher.messagesPolicy': {
    fr: 'Messages de classe visibles selon les destinataires autorisés.',
    ar: 'رسائل القسم تظهر حسب المستلمين المصرح لهم.',
    en: 'Class messages are shown according to authorized recipients.',
  },
  'parent.eyebrow': {
    fr: "Espace parent d'élève",
    ar: 'فضاء ولي الأمر',
    en: 'Parent workspace',
  },
  'parent.title': {
    fr: 'Mon espace famille',
    ar: 'فضاء العائلة',
    en: 'My family space',
  },
  'parent.subtitle': {
    fr: "Consultez le relevé de notes, l'appel, et échangez en direct avec l'équipe pédagogique.",
    ar: 'تابعوا الدرجات والحضور وتواصلوا مباشرة مع الفريق التربوي.',
    en: 'View grades and attendance, and chat directly with the teaching team.',
  },
  'parent.average': {
    fr: 'Moyenne',
    ar: 'المعدل',
    en: 'Average',
  },
  'parent.tabsAria': {
    fr: "Sections de l'espace parent",
    ar: 'أقسام فضاء ولي الأمر',
    en: 'Parent workspace sections',
  },
  'parent.tabGrades': {
    fr: 'Notes et bulletins',
    ar: 'الدرجات والكشوف',
    en: 'Grades and reports',
  },
  'parent.tabAttendance': {
    fr: 'Absences et retards',
    ar: 'الغيابات والتأخرات',
    en: 'Absences and lateness',
  },
  'parent.tabMessage': {
    fr: "Contacter l'équipe",
    ar: 'التواصل مع الفريق',
    en: 'Contact the team',
  },
  'parent.selectChildAria': {
    fr: 'Sélectionner {name} - {className} - Moyenne : {average}/20',
    ar: 'اختيار {name} - {className} - المعدل: {average}/20',
    en: 'Select {name} - {className} - Average: {average}/20',
  },
  'parent.chartTitle': {
    fr: 'Courbe de progression',
    ar: 'منحنى التقدم',
    en: 'Progress curve',
  },
  'parent.latestEvaluations': {
    fr: '{student} / Dernières évaluations',
    ar: '{student} / آخر التقييمات',
    en: '{student} / Latest evaluations',
  },
  'parent.progressChartAria': {
    fr: 'Graphique de progression de {student}',
    ar: 'رسم تقدم {student}',
    en: 'Progress chart for {student}',
  },
  'parent.detailedGrades': {
    fr: 'Notes détaillées',
    ar: 'تفاصيل الدرجات',
    en: 'Detailed grades',
  },
  'parent.publishedOn': {
    fr: 'Publié le {date}',
    ar: 'نشر في {date}',
    en: 'Published on {date}',
  },
  'parent.daysPresence': {
    fr: 'Jours de présence',
    ar: 'أيام الحضور',
    en: 'Days present',
  },
  'parent.absences': {
    fr: 'Absences',
    ar: 'الغيابات',
    en: 'Absences',
  },
  'parent.lateness': {
    fr: 'Retards',
    ar: 'التأخرات',
    en: 'Late arrivals',
  },
  'parent.eventsHistory': {
    fr: 'Historique des événements',
    ar: 'سجل الأحداث',
    en: 'Event history',
  },
  'parent.date': {
    fr: 'Date',
    ar: 'التاريخ',
    en: 'Date',
  },
  'parent.statusPresence': {
    fr: 'Statut de présence',
    ar: 'حالة الحضور',
    en: 'Attendance status',
  },
  'parent.detailsJustification': {
    fr: 'Détails et justification',
    ar: 'التفاصيل والتبرير',
    en: 'Details and justification',
  },
  'parent.noEvent': {
    fr: 'Aucun événement particulier enregistré',
    ar: 'لا يوجد حدث خاص مسجل',
    en: 'No special event recorded',
  },
  'parent.present': {
    fr: 'Présent',
    ar: 'حاضر',
    en: 'Present',
  },
  'parent.absent': {
    fr: 'Absent',
    ar: 'غائب',
    en: 'Absent',
  },
  'parent.late': {
    fr: 'Retard',
    ar: 'متأخر',
    en: 'Late',
  },
  'parent.messaging': {
    fr: 'Messagerie',
    ar: 'المراسلة',
    en: 'Messaging',
  },
  'parent.martinConversationAria': {
    fr: 'Conversation avec M. Martin',
    ar: 'محادثة مع السيد مارتان',
    en: 'Conversation with Mr. Martin',
  },
  'parent.onlineTeacher': {
    fr: 'En ligne - Professeur principal de {student}',
    ar: 'متصل - الأستاذ الرئيسي لـ {student}',
    en: 'Online - Main teacher for {student}',
  },
  'parent.responseIn': {
    fr: 'Réponse en ~10m',
    ar: 'رد خلال ~10 دقائق',
    en: 'Reply in ~10m',
  },
  'parent.messagesAria': {
    fr: 'Messages de la conversation',
    ar: 'رسائل المحادثة',
    en: 'Conversation messages',
  },
  'parent.messagePlaceholder': {
    fr: "Écrire un message à l'enseignant...",
    ar: 'اكتبوا رسالة إلى المعلم...',
    en: 'Write a message to the teacher...',
  },
  'parent.writeMessage': {
    fr: 'Écrire un message',
    ar: 'كتابة رسالة',
    en: 'Write a message',
  },
  'parent.sendMessage': {
    fr: 'Envoyer le message',
    ar: 'إرسال الرسالة',
    en: 'Send message',
  },
  'parent.senderYou': {
    fr: 'Vous',
    ar: 'أنت',
    en: 'You',
  },
  'parent.initialQuestion': {
    fr: 'Bonjour Monsieur, {student} rencontre quelques difficultés sur le dernier chapitre. Des conseils ?',
    ar: 'مرحبا أستاذ، يواجه {student} بعض الصعوبات في الفصل الأخير. هل من نصائح؟',
    en: 'Hello, {student} is having some difficulty with the latest chapter. Any advice?',
  },
  'parent.initialReply': {
    fr: 'Bonjour. Oui, je conseille à {student} de revoir la fiche de révision. Je reste disponible à la fin du prochain cours.',
    ar: 'مرحبا. أنصح {student} بمراجعة ورقة التلخيص. سأبقى متاحا في نهاية الحصة القادمة.',
    en: 'Hello. I recommend that {student} review the study sheet. I am available after the next class.',
  },
  'parent.autoReply': {
    fr: "Parfait. D'ici là, encouragez-le à continuer ses efforts !",
    ar: 'ممتاز. إلى ذلك الحين، شجعوه على مواصلة جهوده.',
    en: 'Perfect. Until then, please encourage him to keep going.',
  },
  'parent.unassignedClass': {
    fr: 'Classe non assignée',
    ar: 'قسم غير معين',
    en: 'Unassigned class',
  },
  'parent.emptyChildren': {
    fr: "Aucun enfant n'est encore lié à votre compte.",
    ar: 'لا يوجد أي طفل مرتبط بحسابكم بعد.',
    en: 'No child is linked to your account yet.',
  },
  'parent.unassignedChildClass': {
    fr: "Cet enfant n'est pas encore rattaché à une classe.",
    ar: 'هذا الطفل غير مرتبط بقسم بعد.',
    en: 'This child is not assigned to a class yet.',
  },
  'parent.emptyApprovedGrades': {
    fr: 'Aucune note approuvée pour le moment.',
    ar: 'لا توجد درجات معتمدة حاليا.',
    en: 'No approved grades yet.',
  },
  'parent.emptyGrades': {
    fr: 'Aucune note publiée.',
    ar: 'لا توجد درجات منشورة.',
    en: 'No published grades.',
  },
  'parent.emptyMessages': {
    fr: 'Aucun message dans cette classe.',
    ar: 'لا توجد رسائل في هذا القسم.',
    en: 'No messages in this class.',
  },
  'parent.noMessagePreview': {
    fr: 'Aucun message.',
    ar: 'لا توجد رسائل.',
    en: 'No messages.',
  },
  'legal.back': {
    fr: 'Retour',
    ar: 'رجوع',
    en: 'Back',
  },
  'legal.hostingLocation': {
    fr: 'Algérie',
    ar: 'الجزائر',
    en: 'Algeria',
  },
  'legal.title': {
    fr: "Politique de confidentialité et conditions d'utilisation",
    ar: 'سياسة الخصوصية وشروط الاستخدام',
    en: 'Privacy policy and terms of use',
  },
  'legal.intro': {
    fr: 'Cette page explique comment {legalEntity} protège les données personnelles dans un contexte scolaire algérien et comment les utilisateurs peuvent exercer leurs droits.',
    ar: 'توضح هذه الصفحة كيف يحمي {legalEntity} البيانات الشخصية في سياق مدرسي جزائري وكيف يمكن للمستخدمين ممارسة حقوقهم.',
    en: 'This page explains how {legalEntity} protects personal data in an Algerian school context and how users can exercise their rights.',
  },
  'legal.lastUpdated': {
    fr: 'Dernière mise à jour : {date}',
    ar: 'آخر تحديث: {date}',
    en: 'Last updated: {date}',
  },
  'legal.hosting': {
    fr: 'Hébergement visé : {location}',
    ar: 'موقع الاستضافة المستهدف: {location}',
    en: 'Target hosting location: {location}',
  },
  'legal.contact': {
    fr: 'Contact : {email}',
    ar: 'التواصل: {email}',
    en: 'Contact: {email}',
  },
  'legal.warning': {
    fr: 'Ce modèle doit être relu par un conseil juridique avant publication officielle. Remplacez les champs Wasel Edu, email, adresse, hébergeur et durées de conservation par vos informations finales.',
    ar: 'يجب أن يراجَع هذا النموذج من طرف مستشار قانوني قبل النشر الرسمي. استبدلوا اسم Wasel Edu والبريد والعنوان والمضيف ومدد الاحتفاظ بمعلوماتكم النهائية.',
    en: 'This template must be reviewed by legal counsel before official publication. Replace Wasel Edu, email, address, host, and retention periods with your final information.',
  },
  'legal.controller.title': {
    fr: 'Responsable du traitement',
    ar: 'مسؤول المعالجة',
    en: 'Data controller',
  },
  'legal.controller.p1': {
    fr: '{legalEntity} agit comme responsable du traitement lorsque la plateforme détermine les finalités et les moyens de traitement des données personnelles.',
    ar: 'يتصرف {legalEntity} كمسؤول معالجة عندما تحدد المنصة أغراض ووسائل معالجة البيانات الشخصية.',
    en: '{legalEntity} acts as data controller when the platform determines the purposes and means of processing personal data.',
  },
  'legal.controller.p2': {
    fr: "Lorsqu'un établissement scolaire utilise {legalEntity} pour gérer ses élèves, enseignants, parents, classes, messages, absences, notes et paiements, l'établissement reste responsable de l'exactitude des informations qu'il importe ou valide.",
    ar: 'عندما تستخدم مؤسسة تعليمية {legalEntity} لإدارة الطلاب والمعلمين وأولياء الأمور والأقسام والرسائل والغيابات والدرجات والمدفوعات، تبقى المؤسسة مسؤولة عن دقة المعلومات التي تستوردها أو تعتمدها.',
    en: 'When a school uses {legalEntity} to manage students, teachers, parents, classes, messages, attendance, grades, and payments, the school remains responsible for the accuracy of the information it imports or validates.',
  },
  'legal.data.title': {
    fr: 'Données traitées',
    ar: 'البيانات المعالجة',
    en: 'Processed data',
  },
  'legal.data.p1': {
    fr: "Nous traitons uniquement les données nécessaires au fonctionnement scolaire de la plateforme : identité, rôle, email, informations de classe, liens parent-élève, présence, notes, devoirs, remarques, messages, notifications, abonnements, journaux de sécurité et identifiants techniques.",
    ar: 'نعالج فقط البيانات اللازمة لتشغيل المنصة المدرسية: الهوية، الدور، البريد الإلكتروني، معلومات القسم، روابط ولي الأمر بالطالب، الحضور، الدرجات، الواجبات، الملاحظات، الرسائل، الإشعارات، الاشتراكات، سجلات الأمان والمعرفات التقنية.',
    en: 'We process only the data needed to run the school platform: identity, role, email, class information, parent-student links, attendance, grades, assignments, notes, messages, notifications, subscriptions, security logs, and technical identifiers.',
  },
  'legal.data.p2': {
    fr: 'Les données des mineurs sont limitées aux usages scolaires attendus et ne sont pas utilisées pour de la publicité comportementale, du profilage commercial ou une revente de données.',
    ar: 'تقتصر بيانات القاصرين على الاستخدامات المدرسية المتوقعة ولا تُستخدم للإعلانات السلوكية أو التنميط التجاري أو إعادة بيع البيانات.',
    en: 'Data about minors is limited to expected school uses and is not used for behavioral advertising, commercial profiling, or data resale.',
  },
  'legal.purposes.title': {
    fr: 'Finalités',
    ar: 'الأغراض',
    en: 'Purposes',
  },
  'legal.purposes.p1': {
    fr: "Les données sont utilisées pour authentifier les utilisateurs, fournir les services scolaires, permettre la communication entre l'école et les familles, sécuriser les comptes, produire des bulletins ou justificatifs, gérer les abonnements et respecter les obligations légales applicables.",
    ar: 'تُستخدم البيانات لمصادقة المستخدمين، توفير الخدمات المدرسية، تمكين التواصل بين المدرسة والعائلات، تأمين الحسابات، إنتاج الكشوف أو الوثائق، إدارة الاشتراكات، والامتثال للالتزامات القانونية.',
    en: 'Data is used to authenticate users, provide school services, enable communication between the school and families, secure accounts, generate reports or supporting documents, manage subscriptions, and meet applicable legal obligations.',
  },
  'legal.purposes.p2': {
    fr: "Chaque traitement doit rester compatible avec la mission éducative de l'établissement et avec les informations communiquées aux personnes concernées.",
    ar: 'يجب أن تبقى كل معالجة متوافقة مع المهمة التعليمية للمؤسسة ومع المعلومات المقدمة للأشخاص المعنيين.',
    en: 'Each processing activity must remain compatible with the school’s educational mission and with the information provided to the people concerned.',
  },
  'legal.security.title': {
    fr: 'Sécurité et confidentialité',
    ar: 'الأمان والسرية',
    en: 'Security and confidentiality',
  },
  'legal.security.p1': {
    fr: "{legalEntity} applique des mesures techniques et organisationnelles de protection : authentification par jetons, chiffrement TLS en transit, mots de passe hachés, isolation par établissement, contrôle des rôles, journaux d'audit et limitation des accès administratifs.",
    ar: 'يطبق {legalEntity} تدابير تقنية وتنظيمية للحماية: مصادقة بالرموز، تشفير TLS أثناء النقل، كلمات مرور مجزأة، عزل حسب المؤسسة، ضبط الأدوار، سجلات تدقيق، وتقييد الوصول الإداري.',
    en: '{legalEntity} applies technical and organizational safeguards: token authentication, TLS encryption in transit, hashed passwords, tenant isolation by school, role controls, audit logs, and limited administrative access.',
  },
  'legal.security.p2': {
    fr: 'Les données de production doivent être hébergées dans un environnement contrôlé situé en {hostingLocation}, sauf autorisation ou base légale permettant un transfert conforme aux exigences applicables.',
    ar: 'يجب استضافة بيانات الإنتاج في بيئة مضبوطة داخل {hostingLocation}، إلا إذا وُجد ترخيص أو أساس قانوني يسمح بنقل متوافق مع المتطلبات المطبقة.',
    en: 'Production data should be hosted in a controlled environment located in {hostingLocation}, unless an authorization or legal basis allows a transfer that complies with applicable requirements.',
  },
  'legal.rights.title': {
    fr: 'Droits des personnes',
    ar: 'حقوق الأشخاص',
    en: 'Data subject rights',
  },
  'legal.rights.p1': {
    fr: "Conformément à la loi algérienne n° 18-07 relative à la protection des personnes physiques dans le traitement des données à caractère personnel, modifiée et complétée par la loi n° 25-11, les personnes concernées peuvent demander l'information sur les traitements, l'accès à leurs données, la rectification des données inexactes ou incomplètes, et l'opposition pour motif légitime lorsque la loi le permet.",
    ar: 'وفقا للقانون الجزائري رقم 18-07 المتعلق بحماية الأشخاص الطبيعيين في معالجة البيانات ذات الطابع الشخصي، كما عُدل وتمم بالقانون رقم 25-11، يمكن للأشخاص المعنيين طلب معلومات حول المعالجة، والوصول إلى بياناتهم، وتصحيح البيانات غير الدقيقة أو غير المكتملة، والاعتراض لسبب مشروع عندما يسمح القانون بذلك.',
    en: 'Under Algerian Law No. 18-07 on the protection of individuals in personal data processing, as amended and supplemented by Law No. 25-11, data subjects may request information about processing, access to their data, correction of inaccurate or incomplete data, and objection on legitimate grounds where the law allows it.',
  },
  'legal.rights.p2': {
    fr: "Les demandes peuvent être envoyées à {supportEmail}. Pour les données scolaires, {legalEntity} peut rediriger la demande vers l'établissement concerné afin de vérifier l'identité et le droit d'accès du demandeur.",
    ar: 'يمكن إرسال الطلبات إلى {supportEmail}. بالنسبة للبيانات المدرسية، يمكن لـ {legalEntity} تحويل الطلب إلى المؤسسة المعنية للتحقق من هوية الطالب وحقه في الوصول.',
    en: 'Requests can be sent to {supportEmail}. For school records, {legalEntity} may redirect the request to the relevant school to verify the requester’s identity and right of access.',
  },
  'legal.retention.title': {
    fr: 'Conservation et suppression',
    ar: 'الاحتفاظ والحذف',
    en: 'Retention and deletion',
  },
  'legal.retention.p1': {
    fr: 'Les données sont conservées pendant la durée nécessaire au service scolaire, à la sécurité, aux obligations comptables ou légales, puis supprimées ou anonymisées selon une procédure contrôlée.',
    ar: 'تُحتفظ البيانات طوال المدة اللازمة للخدمة المدرسية أو الأمان أو الالتزامات المحاسبية أو القانونية، ثم تُحذف أو تُجهل وفق إجراء مضبوط.',
    en: 'Data is retained for as long as needed for school services, security, accounting, or legal obligations, then deleted or anonymized through a controlled procedure.',
  },
  'legal.retention.p2': {
    fr: "Un parent, enseignant, élève majeur ou représentant légal peut demander la suppression d'un compte ou la limitation de certaines données lorsque cela ne contredit pas les obligations scolaires, contractuelles ou légales de l'établissement.",
    ar: 'يمكن لولي الأمر أو المعلم أو الطالب البالغ أو الممثل القانوني طلب حذف حساب أو تقييد بعض البيانات عندما لا يتعارض ذلك مع التزامات المؤسسة المدرسية أو التعاقدية أو القانونية.',
    en: 'A parent, teacher, adult student, or legal representative may request account deletion or restriction of certain data where this does not conflict with the school’s educational, contractual, or legal obligations.',
  },
  'legal.terms.title': {
    fr: "Conditions d'utilisation",
    ar: 'شروط الاستخدام',
    en: 'Terms of use',
  },
  'legal.terms.p1': {
    fr: "L'accès à {legalEntity} est réservé aux utilisateurs autorisés par un établissement scolaire ou par l'administrateur de la plateforme. Chaque utilisateur doit garder ses identifiants confidentiels, utiliser le service uniquement pour des finalités éducatives légitimes et signaler toute utilisation suspecte.",
    ar: 'يقتصر الوصول إلى {legalEntity} على المستخدمين المصرح لهم من طرف مؤسسة تعليمية أو مدير المنصة. يجب على كل مستخدم الحفاظ على سرية بيانات الدخول، واستخدام الخدمة فقط لأغراض تعليمية مشروعة، والإبلاغ عن أي استخدام مشبوه.',
    en: 'Access to {legalEntity} is limited to users authorized by a school or by the platform administrator. Each user must keep credentials confidential, use the service only for legitimate educational purposes, and report suspicious use.',
  },
  'legal.terms.p2': {
    fr: "Il est interdit de publier du contenu illicite, injurieux, discriminatoire, contraire à l'ordre public ou sans lien avec la scolarité. {legalEntity} peut suspendre un compte en cas d'abus, de risque de sécurité ou de demande justifiée de l'établissement.",
    ar: 'يُحظر نشر محتوى غير قانوني أو مسيء أو تمييزي أو مخالف للنظام العام أو غير مرتبط بالتمدرس. يمكن لـ {legalEntity} تعليق حساب في حالة إساءة الاستخدام أو وجود خطر أمني أو طلب مبرر من المؤسسة.',
    en: 'It is prohibited to publish unlawful, abusive, discriminatory, public-order violating, or non-school-related content. {legalEntity} may suspend an account in cases of abuse, security risk, or justified school request.',
  },
  'legal.terms.p3': {
    fr: "{legalEntity} fournit les outils techniques permettant la consultation, la correction et la protection des informations scolaires, mais ces informations restent sous la responsabilité de l'établissement qui les crée, importe ou valide.",
    ar: 'يوفر {legalEntity} الأدوات التقنية التي تتيح الاطلاع على المعلومات المدرسية وتصحيحها وحمايتها، لكن هذه المعلومات تبقى تحت مسؤولية المؤسسة التي تنشئها أو تستوردها أو تعتمدها.',
    en: '{legalEntity} provides technical tools for viewing, correcting, and protecting school information, but that information remains under the responsibility of the school that creates, imports, or validates it.',
  },
  'legal.references.title': {
    fr: 'Références légales et autorité compétente',
    ar: 'المراجع القانونية والسلطة المختصة',
    en: 'Legal references and competent authority',
  },
  'legal.references.p1': {
    fr: "Cette page s'appuie notamment sur la loi algérienne n° 18-07 du 10 juin 2018 relative à la protection des personnes physiques dans le traitement des données à caractère personnel, telle que référencée par le Portail du Droit Algérien, et sur les informations publiques de l'Autorité Nationale de Protection des Données à caractère Personnel.",
    ar: 'تستند هذه الصفحة خصوصا إلى القانون الجزائري رقم 18-07 المؤرخ في 10 يونيو 2018 المتعلق بحماية الأشخاص الطبيعيين في معالجة البيانات ذات الطابع الشخصي، كما يورده بوابة القانون الجزائري، وإلى المعلومات العمومية للسلطة الوطنية لحماية المعطيات ذات الطابع الشخصي.',
    en: 'This page is based in particular on Algerian Law No. 18-07 of June 10, 2018 on the protection of individuals in personal data processing, as referenced by the Algerian Law Portal, and on public information from the National Personal Data Protection Authority.',
  },
  'legal.link.lawPortal': {
    fr: 'Portail du Droit Algérien',
    ar: 'بوابة القانون الجزائري',
    en: 'Algerian Law Portal',
  },
  'legal.link.anpdp': {
    fr: 'ANPDP',
    ar: 'السلطة الوطنية لحماية المعطيات',
    en: 'ANPDP',
  },
  'legal.link.notice': {
    fr: 'Notice ANPDP',
    ar: 'إشعار السلطة الوطنية لحماية المعطيات',
    en: 'ANPDP notice',
  },
};

function normalizeLocale(value: string | null | undefined): Locale {
  const normalized = value?.toLowerCase().split('-')[0];
  return supportedLocales.includes(normalized as Locale) ? (normalized as Locale) : 'fr';
}

function detectLocale(): Locale {
  if (typeof window === 'undefined') {
    return 'fr';
  }

  return normalizeLocale(
    localStorage.getItem(localeStorageKey) ||
      document.documentElement.lang ||
      navigator.language
  );
}

function applyDocumentLocale(locale: Locale) {
  if (typeof document === 'undefined') {
    return;
  }

  document.documentElement.lang = locale;
  document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
}

function interpolate(value: string, params?: TranslationParams) {
  if (!params) {
    return value;
  }

  return Object.entries(params).reduce(
    (current, [key, replacement]) => current.replaceAll(`{${key}}`, String(replacement)),
    value
  );
}

export function t(key: string, params?: TranslationParams, locale: Locale = detectLocale()): string {
  const entry = translations[key];
  if (!entry) {
    return key;
  }

  return interpolate(entry[locale] || entry.fr || key, params);
}

export function useLocale() {
  const [locale, setLocaleState] = useState<Locale>(() => detectLocale());

  useEffect(() => {
    applyDocumentLocale(locale);
  }, [locale]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === localeStorageKey) {
        setLocaleState(normalizeLocale(event.newValue));
      }
    };

    const handleLocaleChange = (event: Event) => {
      const nextLocale = (event as CustomEvent<Locale>).detail;
      setLocaleState(normalizeLocale(nextLocale));
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener(localeChangeEvent, handleLocaleChange);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(localeChangeEvent, handleLocaleChange);
    };
  }, []);

  const setLocale = useCallback((nextLocale: Locale) => {
    const normalizedLocale = normalizeLocale(nextLocale);
    localStorage.setItem(localeStorageKey, normalizedLocale);
    setLocaleState(normalizedLocale);
    window.dispatchEvent(new CustomEvent(localeChangeEvent, { detail: normalizedLocale }));
  }, []);

  const translate = useCallback(
    (key: string, params?: TranslationParams) => t(key, params, locale),
    [locale]
  );

  return {
    locale,
    dir: locale === 'ar' ? 'rtl' : 'ltr',
    setLocale,
    t: translate,
  };
}
