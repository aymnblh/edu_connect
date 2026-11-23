import type { TranslationMap } from './types';

export const commonTranslations: TranslationMap = {
  'common.appName': {
    fr: 'WaselEdu',
    ar: 'WaselEdu',
    en: 'WaselEdu',
  },
  'common.loading': {
    fr: 'Chargement...',
    ar: 'جار التحميل...',
    en: 'Loading...',
  },
  'common.close': {
    fr: 'Fermer',
    ar: 'إغلاق',
    en: 'Close',
  },
  'common.cancel': {
    fr: 'Annuler',
    ar: 'إلغاء',
    en: 'Cancel',
  },
  'password.changeTitle': {
    fr: 'Changer le mot de passe',
    ar: 'تغيير كلمة المرور',
    en: 'Change password',
  },
  'password.current': {
    fr: 'Mot de passe actuel',
    ar: 'كلمة المرور الحالية',
    en: 'Current password',
  },
  'password.new': {
    fr: 'Nouveau mot de passe (8 caractères minimum)',
    ar: 'كلمة المرور الجديدة (8 أحرف على الأقل)',
    en: 'New password (at least 8 characters)',
  },
  'password.confirm': {
    fr: 'Confirmer le nouveau mot de passe',
    ar: 'تأكيد كلمة المرور الجديدة',
    en: 'Confirm new password',
  },
  'password.submit': {
    fr: 'Enregistrer',
    ar: 'حفظ',
    en: 'Save',
  },
  'password.otherSessionsNote': {
    fr: 'Vos autres appareils seront déconnectés.',
    ar: 'سيتم تسجيل خروج أجهزتك الأخرى.',
    en: 'Your other devices will be signed out.',
  },
  'password.tooShort': {
    fr: 'Le nouveau mot de passe doit contenir au moins 8 caractères.',
    ar: 'يجب أن تحتوي كلمة المرور الجديدة على 8 أحرف على الأقل.',
    en: 'The new password must be at least 8 characters.',
  },
  'password.mismatch': {
    fr: 'Les deux mots de passe ne correspondent pas.',
    ar: 'كلمتا المرور غير متطابقتين.',
    en: 'The two passwords do not match.',
  },
  'password.changeFailed': {
    fr: 'Impossible de changer le mot de passe.',
    ar: 'تعذر تغيير كلمة المرور.',
    en: 'Could not change the password.',
  },
  'password.changed': {
    fr: 'Mot de passe modifié. Vos autres appareils ont été déconnectés.',
    ar: 'تم تغيير كلمة المرور. تم تسجيل خروج أجهزتك الأخرى.',
    en: 'Password changed. Your other devices have been signed out.',
  },
  'common.save': {
    fr: 'Enregistrer',
    ar: 'حفظ',
    en: 'Save',
  },
  'common.edit': {
    fr: 'Modifier',
    ar: 'تعديل',
    en: 'Edit',
  },
  'common.delete': {
    fr: 'Supprimer',
    ar: 'حذف',
    en: 'Delete',
  },
  'nav.announcements': {
    fr: 'Annonces et calendrier',
    ar: 'الإعلانات والتقويم',
    en: 'Announcements & calendar',
  },
  'nav.reportCards': {
    fr: 'Bulletins',
    ar: 'كشوف النقاط',
    en: 'Report cards',
  },
  'nav.auditLog': {
    fr: 'Journal d\'activité',
    ar: 'سجل النشاط',
    en: 'Activity log',
  },
  'devices.title': {
    fr: 'Mes appareils',
    ar: 'أجهزتي',
    en: 'My devices',
  },
  'devices.copy': {
    fr: 'Appareils où votre compte est connecté. Déconnectez ceux que vous ne reconnaissez pas, puis changez votre mot de passe.',
    ar: 'الأجهزة المتصل بها حسابك. افصل ما لا تعرفه ثم غيّر كلمة المرور.',
    en: 'Devices where your account is signed in. Sign out any you don\'t recognise, then change your password.',
  },
  'devices.lastUsed': {
    fr: 'Dernière activité : {date}',
    ar: 'آخر نشاط: {date}',
    en: 'Last active: {date}',
  },
  'devices.since': {
    fr: 'Connecté depuis le {date}',
    ar: 'متصل منذ {date}',
    en: 'Signed in since {date}',
  },
  'devices.revoke': {
    fr: 'Déconnecter',
    ar: 'فصل',
    en: 'Sign out',
  },
  'devices.revokeConfirm': {
    fr: 'Déconnecter cet appareil ? (S\'il s\'agit de celui-ci, vous devrez vous reconnecter.)',
    ar: 'فصل هذا الجهاز؟ (إذا كان هذا الجهاز، ستحتاج لإعادة الدخول.)',
    en: 'Sign out this device? (If it\'s this one, you\'ll need to sign in again.)',
  },
  'devices.note': {
    fr: 'Un appareil déconnecté peut garder l\'accès jusqu\'à 30 minutes ; « déconnecter mes autres appareils » est immédiat.',
    ar: 'قد يبقى الجهاز المفصول متصلا حتى 30 دقيقة؛ أما «فصل أجهزتي الأخرى» ففوري.',
    en: 'A signed-out device can keep access for up to 30 minutes; "sign out my other devices" is immediate.',
  },
  'devices.revokeOthers': {
    fr: 'Déconnecter mes autres appareils',
    ar: 'فصل أجهزتي الأخرى',
    en: 'Sign out my other devices',
  },
  'devices.revokeOthersConfirm': {
    fr: 'Déconnecter tous vos autres appareils maintenant ? Cet appareil reste connecté.',
    ar: 'فصل كل أجهزتك الأخرى الآن؟ يبقى هذا الجهاز متصلا.',
    en: 'Sign out all your other devices now? This device stays signed in.',
  },
  'devices.revokedOthers': {
    fr: 'Vos autres appareils ont été déconnectés.',
    ar: 'تم فصل أجهزتك الأخرى.',
    en: 'Your other devices have been signed out.',
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
    fr: 'Conçu pour les écoles algériennes',
    ar: 'صُمم للمدارس الجزائرية',
    en: 'Designed for Algerian schools',
  },
  'login.heroTitleLine': {
    fr: 'L’école et les familles,',
    ar: 'المدرسة والعائلة،',
    en: 'School and home,',
  },
  'login.heroTitleHighlight': {
    fr: 'sur la même page.',
    ar: 'على نفس المسار.',
    en: 'on the same page.',
  },
  'login.heroCopy': {
    fr: 'Présence, notes, bulletins, frais et messages : chaque information est rattachée à la bonne classe et au bon élève.',
    ar: 'الحضور والدرجات وكشوف النقاط والمصاريف والرسائل: كل معلومة مرتبطة بالقسم وبالتلميذ المعني.',
    en: 'Attendance, grades, report cards, fees, and messages—every record belongs to the right class and student.',
  },
  'login.feature.securityTitle': {
    fr: 'Une école, un espace isolé',
    ar: 'لكل مدرسة فضاء مستقل',
    en: 'One school, one isolated workspace',
  },
  'login.feature.securityCopy': {
    fr: 'Chaque rôle donne accès uniquement aux classes, matières et enfants concernés.',
    ar: 'يمنح كل دور صلاحية الوصول فقط إلى الأقسام والمواد والأبناء المعنيين.',
    en: 'Each role grants access only to the relevant classes, subjects, and children.',
  },
  'login.feature.gradesTitle': {
    fr: 'Du cours au bulletin',
    ar: 'من الحصة إلى كشف النقاط',
    en: 'From the classroom to the report card',
  },
  'login.feature.gradesCopy': {
    fr: 'Notes validées, coefficients, moyennes et documents trimestriels restent liés.',
    ar: 'تبقى الدرجات المعتمدة والمعاملات والمعدلات والوثائق الفصلية مترابطة.',
    en: 'Approved grades, coefficients, averages, and term documents stay connected.',
  },
  'login.feature.messagingTitle': {
    fr: 'Les familles restent informées',
    ar: 'تبقى العائلات على اطلاع',
    en: 'Families stay informed',
  },
  'login.feature.messagingCopy': {
    fr: 'Absences, devoirs, annonces, rendez-vous et reçus arrivent dans le même espace.',
    ar: 'الغيابات والواجبات والإعلانات والمواعيد والوصولات تصل إلى نفس الفضاء.',
    en: 'Absences, homework, announcements, meetings, and receipts arrive in one place.',
  },
  'login.title': {
    fr: 'Connexion WaselEdu',
    ar: 'تسجيل الدخول إلى WaselEdu',
    en: 'WaselEdu sign in',
  },
  'login.welcome': {
    fr: 'Bienvenue',
    ar: 'مرحبا',
    en: 'Welcome',
  },
  'login.subtitle': {
    fr: 'L’espace sécurisé de votre établissement',
    ar: 'الفضاء الآمن لمؤسستكم',
    en: 'Your school’s secure workspace',
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
  'login.rememberDevice': {
    fr: 'Se souvenir de cet appareil',
    ar: 'تذكر هذا الجهاز',
    en: 'Remember this device',
  },
  'login.policiesLink': {
    fr: 'Mentions légales et confidentialité',
    ar: 'الشروط القانونية والخصوصية',
    en: 'Legal notices and privacy',
  },
  'login.activateLink': {
    fr: 'Activer un compte',
    ar: 'تفعيل حساب',
    en: 'Activate an account',
  },
  'login.registerSchool': {
    fr: 'Inscrire mon établissement',
    ar: 'تسجيل مؤسستي',
    en: 'Register my school',
  },
  'activate.heroTitle': {
    fr: 'Activez votre',
    ar: 'فعّلوا',
    en: 'Activate your',
  },
  'activate.heroHighlight': {
    fr: 'accès établissement',
    ar: 'حساب المؤسسة',
    en: 'school access',
  },
  'activate.heroCopy': {
    fr: "Utilisez le code remis par l'administration pour définir votre mot de passe et rejoindre votre espace WaselEdu.",
    ar: 'استعملوا رمز الدعوة الذي قدمته الإدارة لتحديد كلمة المرور والدخول إلى فضاء WaselEdu.',
    en: 'Use the invite code from school administration to set your password and enter WaselEdu.',
  },
  'activate.title': {
    fr: 'Activation du compte',
    ar: 'تفعيل الحساب',
    en: 'Account activation',
  },
  'activate.subtitle': {
    fr: 'Enseignants et secrétariat',
    ar: 'المعلمون والسكرتارية',
    en: 'Teachers and secretariat',
  },
  'activate.codeLabel': {
    fr: 'Code invitation',
    ar: 'رمز الدعوة',
    en: 'Invite code',
  },
  'activate.codePlaceholder': {
    fr: 'Ex : A1B2C3D4',
    ar: 'مثال: A1B2C3D4',
    en: 'Example: A1B2C3D4',
  },
  'activate.verify': {
    fr: 'Vérifier le code',
    ar: 'التحقق من الرمز',
    en: 'Verify code',
  },
  'activate.verifying': {
    fr: 'Vérification...',
    ar: 'جار التحقق...',
    en: 'Verifying...',
  },
  'activate.verifiedFor': {
    fr: 'Invitation validée pour {name}',
    ar: 'تم تأكيد الدعوة لـ {name}',
    en: 'Invite verified for {name}',
  },
  'activate.role': {
    fr: 'Rôle : {role}',
    ar: 'الدور: {role}',
    en: 'Role: {role}',
  },
  'activate.passwordLabel': {
    fr: 'Nouveau mot de passe',
    ar: 'كلمة المرور الجديدة',
    en: 'New password',
  },
  'activate.passwordPlaceholder': {
    fr: '8 caractères minimum',
    ar: '8 أحرف على الأقل',
    en: 'At least 8 characters',
  },
  'activate.termsLabel': {
    fr: "J'accepte les conditions d'utilisation et la politique de confidentialité.",
    ar: 'أوافق على شروط الاستخدام وسياسة الخصوصية.',
    en: 'I accept the terms of use and privacy policy.',
  },
  'activate.submit': {
    fr: 'Activer et entrer',
    ar: 'تفعيل والدخول',
    en: 'Activate and enter',
  },
  'activate.submitting': {
    fr: 'Activation...',
    ar: 'جار التفعيل...',
    en: 'Activating...',
  },
  'activate.invalidCode': {
    fr: 'Code invitation invalide ou expiré.',
    ar: 'رمز الدعوة غير صالح أو منتهي.',
    en: 'Invalid or expired invite code.',
  },
  'activate.unsupportedCode': {
    fr: "Ce code n'est pas un code d'activation personnel.",
    ar: 'هذا الرمز ليس رمز تفعيل لحساب موظف.',
    en: 'This code is not a staff activation code.',
  },
  'activate.backToLogin': {
    fr: 'Retour à la connexion',
    ar: 'العودة إلى تسجيل الدخول',
    en: 'Back to sign in',
  },
  'register.title': {
    fr: 'Inscrire un établissement',
    ar: 'تسجيل مؤسسة',
    en: 'Register a school',
  },
  'register.subtitle': {
    fr: 'Créez votre espace scolaire sur WaselEdu',
    ar: 'أنشئ فضاءك المدرسي على WaselEdu',
    en: 'Create your school workspace on WaselEdu',
  },
  'register.schoolName': {
    fr: 'Nom de l\'établissement',
    ar: 'اسم المؤسسة',
    en: 'School name',
  },
  'register.schoolNamePlaceholder': {
    fr: 'Ex: Lycée El Amel',
    ar: 'مثال: ثانوية الأمل',
    en: 'E.g.: El Amel High School',
  },
  'register.directorName': {
    fr: 'Nom complet du directeur',
    ar: 'الاسم الكامل للمدير',
    en: 'Director full name',
  },
  'register.email': {
    fr: 'Adresse email',
    ar: 'البريد الإلكتروني',
    en: 'Email address',
  },
  'register.password': {
    fr: 'Mot de passe',
    ar: 'كلمة المرور',
    en: 'Password',
  },
  'register.confirmPassword': {
    fr: 'Confirmer le mot de passe',
    ar: 'تأكيد كلمة المرور',
    en: 'Confirm password',
  },
  'register.termsLabel': {
    fr: 'J\'accepte la politique de confidentialité et les conditions d\'utilisation',
    ar: 'أوافق على سياسة الخصوصية وشروط الاستخدام',
    en: 'I accept the privacy policy and terms of use',
  },
  'register.submit': {
    fr: 'Créer l\'établissement',
    ar: 'إنشاء المؤسسة',
    en: 'Create school',
  },
  'register.submitting': {
    fr: 'Création en cours...',
    ar: 'جارٍ الإنشاء...',
    en: 'Creating...',
  },
  'register.success': {
    fr: 'Établissement créé avec succès ! Votre compte est en attente d\'activation par l\'administrateur.',
    ar: 'تم إنشاء المؤسسة بنجاح! حسابك في انتظار التفعيل من قبل المسؤول.',
    en: 'School created successfully! Your account is pending activation by the administrator.',
  },
  'register.backToLogin': {
    fr: 'Retour à la connexion',
    ar: 'العودة إلى تسجيل الدخول',
    en: 'Back to login',
  },
  'register.alreadyHaveAccount': {
    fr: 'Vous avez déjà un compte ?',
    ar: 'لديك حساب بالفعل؟',
    en: 'Already have an account?',
  },
  'register.passwordMismatch': {
    fr: 'Les mots de passe ne correspondent pas',
    ar: 'كلمات المرور غير متطابقة',
    en: 'Passwords do not match',
  },
  'register.termsRequired': {
    fr: 'Vous devez accepter les conditions',
    ar: 'يجب عليك قبول الشروط',
    en: 'You must accept the terms',
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
  'layout.closeMenu': {
    fr: 'Fermer le menu',
    ar: 'إغلاق القائمة',
    en: 'Close menu',
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
  'demo.title': {
    fr: 'Découvrir sans compte',
    ar: 'اكتشف بدون حساب',
    en: 'Explore without an account',
  },
  'demo.copy': {
    fr: 'Visitez une école de démonstration remplie de données fictives, en consultation seulement.',
    ar: 'تصفح مدرسة تجريبية ببيانات وهمية، للاطلاع فقط.',
    en: 'Visit a demo school filled with sample data, view only.',
  },
  'demo.asDirector': {
    fr: 'Directeur',
    ar: 'مدير',
    en: 'Director',
  },
  'demo.asTeacher': {
    fr: 'Enseignant',
    ar: 'أستاذ',
    en: 'Teacher',
  },
  'demo.asParent': {
    fr: 'Parent',
    ar: 'ولي',
    en: 'Parent',
  },
  'demo.banner': {
    fr: 'Démo : vous visitez une école fictive. Tout est consultable, rien n\'est enregistré.',
    ar: 'عرض تجريبي: أنت تتصفح مدرسة وهمية. يمكنك الاطلاع على كل شيء، ولا يُحفظ أي شيء.',
    en: 'Demo: you are visiting a sample school. You can look at everything; nothing is saved.',
  },
  'demo.blocked': {
    fr: 'Cette action est désactivée dans la démo. Créez votre école pour l\'essayer avec vos données.',
    ar: 'هذا الإجراء معطل في العرض التجريبي. أنشئ مدرستك لتجربته ببياناتك.',
    en: 'This action is disabled in the demo. Create your school to try it with your own data.',
  },
  'demo.createSchool': {
    fr: 'Créer mon école',
    ar: 'إنشاء مدرستي',
    en: 'Create my school',
  },
  'demo.leave': {
    fr: 'Quitter la démo',
    ar: 'مغادرة العرض',
    en: 'Leave the demo',
  },
  'codes.print': {
    fr: 'Imprimer les codes parents',
    ar: 'طباعة رموز الأولياء',
    en: 'Print parent codes',
  },
  'codes.title': {
    fr: 'Codes parents à distribuer',
    ar: 'رموز الأولياء للتوزيع',
    en: 'Parent codes to hand out',
  },
  'codes.class': {
    fr: 'Classe',
    ar: 'القسم',
    en: 'Class',
  },
  'codes.allClasses': {
    fr: 'Toutes les classes',
    ar: 'كل الأقسام',
    en: 'All classes',
  },
  'codes.onlyUnlinked': {
    fr: 'Seulement les élèves sans parent connecté',
    ar: 'فقط التلاميذ بدون ولي متصل',
    en: 'Only students with no parent connected',
  },
  'codes.printNow': {
    fr: 'Imprimer',
    ar: 'طباعة',
    en: 'Print',
  },
  'codes.privacy': {
    fr: 'Chaque code donne accès au dossier de l\'élève : remettez-le en main propre ou sous enveloppe. Cette impression est enregistrée dans le journal.',
    ar: 'كل رمز يتيح الوصول إلى ملف التلميذ: سلّمه يدا بيد أو في ظرف. تُسجَّل هذه الطباعة في السجل.',
    en: 'Each code opens the student\'s file: hand it over in person or in an envelope. This printout is recorded in the activity log.',
  },
  'codes.empty': {
    fr: 'Aucun élève à afficher.',
    ar: 'لا يوجد تلاميذ للعرض.',
    en: 'No students to show.',
  },
  'codes.studentId': {
    fr: 'Identifiant élève',
    ar: 'معرّف التلميذ',
    en: 'Student ID',
  },
  'codes.pin': {
    fr: 'Code PIN',
    ar: 'الرمز السري',
    en: 'PIN code',
  },
  'codes.instructions': {
    fr: 'Installez l\'application WaselEdu, choisissez « Code ou QR », saisissez l\'identifiant et le PIN, puis créez votre mot de passe.',
    ar: 'ثبّت تطبيق WaselEdu، اختر «رمز أو QR»، أدخل المعرّف والرمز السري، ثم أنشئ كلمة مرورك.',
    en: 'Install the WaselEdu app, choose “Code or QR”, enter the ID and PIN, then create your password.',
  },
  'nav.monthlyReport': {
    fr: 'Bilan mensuel',
    ar: 'الحصيلة الشهرية',
    en: 'Monthly report',
  },
  'nav.fees': {
    fr: 'Frais scolaires',
    ar: 'المصاريف المدرسية',
    en: 'School fees',
  },
  'role.nurse': {
    fr: 'Infirmerie',
    ar: 'التمريض',
    en: 'School nurse',
  },
  'nav.infirmary': {
    fr: 'Infirmerie',
    ar: 'التمريض',
    en: 'Infirmary',
  },
  'register.referralCode': {
    fr: 'Code de parrainage (facultatif)',
    ar: 'رمز الترشيح (اختياري)',
    en: 'Referral code (optional)',
  },
  'register.referralPlaceholder': {
    fr: 'Code donné par une école partenaire',
    ar: 'رمز من مدرسة شريكة',
    en: 'Code from a partner school',
  },
  'login.pricing': {
    fr: 'Offre et tarifs',
    ar: 'العرض والأسعار',
    en: 'Plans and pricing',
  },
  'login.discoverLanding': {
    fr: 'Découvrir la plateforme',
    ar: 'اكتشاف المنصة',
    en: 'Explore the platform',
  },
  'role.canteen': {
    fr: 'Cantine',
    ar: 'المطعم',
    en: 'Canteen staff',
  },
  'role.driver': {
    fr: 'Chauffeur / Accompagnateur',
    ar: 'سائق / مرافق',
    en: 'Bus driver / escort',
  },
  'nav.canteen': {
    fr: 'Cantine',
    ar: 'المطعم',
    en: 'Canteen',
  },
  'nav.transport': {
    fr: 'Transport',
    ar: 'النقل المدرسي',
    en: 'Transport',
  },
};
