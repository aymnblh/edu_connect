import type { TranslationMap } from './types';

export const directorReportsTranslations: TranslationMap = {
  'insights.title': {
    fr: 'Vigilance du trimestre',
    ar: 'متابعة الفصل',
    en: 'Term early warning',
  },
  'insights.copy': {
    fr: 'Élèves à suivre, assiduité et tâches en attente.',
    ar: 'التلاميذ الواجب متابعتهم، المواظبة والمهام المعلقة.',
    en: 'Students to follow up, attendance and pending tasks.',
  },
  'insights.copyCompare': {
    fr: 'Élèves à suivre (comparaison avec {previous}), assiduité et tâches en attente.',
    ar: 'التلاميذ الواجب متابعتهم (مقارنة مع {previous})، المواظبة والمهام المعلقة.',
    en: 'Students to follow up (compared with {previous}), attendance and pending tasks.',
  },
  'insights.atRiskCount': {
    fr: 'élèves à suivre',
    ar: 'تلميذ للمتابعة',
    en: 'students to follow up',
  },
  'insights.pendingApprovals': {
    fr: 'notes à valider',
    ar: 'نقطة للمصادقة',
    en: 'grades to approve',
  },
  'insights.unjustified30d': {
    fr: 'absences non justifiées (30 j)',
    ar: 'غياب غير مبرر (30 يوما)',
    en: 'unexcused absences (30 days)',
  },
  'insights.trendTitle': {
    fr: 'Assiduité par semaine (12 dernières semaines)',
    ar: 'المواظبة أسبوعيا (آخر 12 أسبوعا)',
    en: 'Weekly attendance (last 12 weeks)',
  },
  'insights.trendAria': {
    fr: 'Courbes du taux d\'absence et du taux de retard par semaine scolaire.',
    ar: 'منحنى نسبة الغياب ونسبة التأخر لكل أسبوع دراسي.',
    en: 'Lines of the absence rate and late rate per school week.',
  },
  'insights.absenceRate': {
    fr: 'Taux d\'absence',
    ar: 'نسبة الغياب',
    en: 'Absence rate',
  },
  'insights.lateRate': {
    fr: 'Taux de retard',
    ar: 'نسبة التأخر',
    en: 'Late rate',
  },
  'insights.absencesShort': {
    fr: 'Absences',
    ar: 'الغياب',
    en: 'Absences',
  },
  'insights.latesShort': {
    fr: 'Retards',
    ar: 'التأخر',
    en: 'Lates',
  },
  'insights.weekOf': {
    fr: 'Semaine du {date}',
    ar: 'أسبوع {date}',
    en: 'Week of {date}',
  },
  'insights.records': {
    fr: '{count} pointages',
    ar: '{count} تسجيل',
    en: '{count} records',
  },
  'insights.noRecords': {
    fr: 'Aucun pointage cette semaine',
    ar: 'لا توجد تسجيلات هذا الأسبوع',
    en: 'No attendance recorded this week',
  },
  'insights.recordsShort': {
    fr: 'Pointages',
    ar: 'التسجيلات',
    en: 'Records',
  },
  'insights.week': {
    fr: 'Semaine',
    ar: 'الأسبوع',
    en: 'Week',
  },
  'insights.showTable': {
    fr: 'Voir les chiffres',
    ar: 'عرض الأرقام',
    en: 'Show the numbers',
  },
  'insights.hideTable': {
    fr: 'Masquer les chiffres',
    ar: 'إخفاء الأرقام',
    en: 'Hide the numbers',
  },
  'insights.atRiskTitle': {
    fr: 'Élèves à suivre',
    ar: 'تلاميذ للمتابعة',
    en: 'Students to follow up',
  },
  'insights.rulesHelp': {
    fr: 'Moyenne < 10, baisse de 2 points ou plus depuis le trimestre précédent, 3 absences non justifiées ou 5 retards sur 30 jours.',
    ar: 'معدل أقل من 10، تراجع بنقطتين أو أكثر عن الفصل السابق، 3 غيابات غير مبررة أو 5 تأخرات خلال 30 يوما.',
    en: 'Average below 10, a drop of 2+ points since last term, 3 unexcused absences or 5 late arrivals in 30 days.',
  },
  'insights.atRiskEmpty': {
    fr: 'Aucun élève ne correspond aux critères.',
    ar: 'لا يوجد تلميذ معني بهذه المعايير.',
    en: 'No student matches the criteria.',
  },
  'insights.average': {
    fr: 'Moyenne',
    ar: 'المعدل',
    en: 'Average',
  },
  'insights.before': {
    fr: 'avant : {value}',
    ar: 'سابقا: {value}',
    en: 'before: {value}',
  },
  'insights.last30d': {
    fr: '30 derniers jours',
    ar: 'آخر 30 يوما',
    en: 'Last 30 days',
  },
  'insights.recentCounts': {
    fr: '{absences} abs. non just., {lates} retards',
    ar: '{absences} غياب غير مبرر، {lates} تأخر',
    en: '{absences} unexcused abs., {lates} late',
  },
  'insights.reasons': {
    fr: 'Motifs',
    ar: 'الأسباب',
    en: 'Reasons',
  },
  'insights.reason.low_average': {
    fr: 'Moyenne < 10',
    ar: 'معدل أقل من 10',
    en: 'Average < 10',
  },
  'insights.reason.dropping': {
    fr: 'En baisse',
    ar: 'في تراجع',
    en: 'Dropping',
  },
  'insights.reason.absences': {
    fr: 'Absences',
    ar: 'غيابات',
    en: 'Absences',
  },
  'insights.reason.lateness': {
    fr: 'Retards',
    ar: 'تأخرات',
    en: 'Lateness',
  },
  'insights.classTitle': {
    fr: 'Assiduité par classe (trimestre)',
    ar: 'المواظبة حسب القسم (الفصل)',
    en: 'Attendance by class (term)',
  },
  'insights.classEmpty': {
    fr: 'Aucun pointage ce trimestre.',
    ar: 'لا توجد تسجيلات حضور هذا الفصل.',
    en: 'No attendance recorded this term.',
  },
  'audit.title': {
    fr: 'Journal d\'activité',
    ar: 'سجل النشاط',
    en: 'Activity log',
  },
  'audit.copy': {
    fr: 'Qui a fait quoi et quand : connexions, échecs de connexion, modifications de notes, réinitialisations, publications…',
    ar: 'من فعل ماذا ومتى: تسجيلات الدخول، المحاولات الفاشلة، تعديل النقاط، إعادة التعيين، النشر…',
    en: 'Who did what and when: sign-ins, failed sign-ins, grade changes, resets, publications…',
  },
  'audit.export': {
    fr: 'Exporter (CSV)',
    ar: 'تصدير (CSV)',
    en: 'Export (CSV)',
  },
  'audit.exportFailed': {
    fr: 'Export impossible.',
    ar: 'تعذر التصدير.',
    en: 'Export failed.',
  },
  'audit.category': {
    fr: 'Catégorie',
    ar: 'الفئة',
    en: 'Category',
  },
  'audit.allCategories': {
    fr: 'Toutes',
    ar: 'الكل',
    en: 'All',
  },
  'audit.person': {
    fr: 'Personne',
    ar: 'الشخص',
    en: 'Person',
  },
  'audit.everyone': {
    fr: 'Tout le monde',
    ar: 'الجميع',
    en: 'Everyone',
  },
  'audit.from': {
    fr: 'Du',
    ar: 'من',
    en: 'From',
  },
  'audit.to': {
    fr: 'Au',
    ar: 'إلى',
    en: 'To',
  },
  'audit.technical': {
    fr: 'Afficher aussi l\'activité technique détaillée',
    ar: 'عرض النشاط التقني المفصل أيضا',
    en: 'Also show detailed technical activity',
  },
  'audit.empty': {
    fr: 'Aucune entrée pour ces filtres.',
    ar: 'لا توجد عناصر لهذه المعايير.',
    en: 'No entries for these filters.',
  },
  'audit.when': {
    fr: 'Date',
    ar: 'التاريخ',
    en: 'When',
  },
  'audit.action': {
    fr: 'Action',
    ar: 'الإجراء',
    en: 'Action',
  },
  'audit.details': {
    fr: 'Détails',
    ar: 'التفاصيل',
    en: 'Details',
  },
  'audit.origin': {
    fr: 'Origine',
    ar: 'المصدر',
    en: 'Origin',
  },
  'audit.unknownPerson': {
    fr: '—',
    ar: '—',
    en: '—',
  },
  'audit.more': {
    fr: 'Afficher plus',
    ar: 'عرض المزيد',
    en: 'Load more',
  },
  'audit.category.auth': {
    fr: 'Connexions',
    ar: 'تسجيلات الدخول',
    en: 'Sign-ins',
  },
  'audit.category.user': {
    fr: 'Comptes (déconnexions)',
    ar: 'الحسابات (الخروج)',
    en: 'Accounts (sign-outs)',
  },
  'audit.category.staff': {
    fr: 'Personnel',
    ar: 'الطاقم',
    en: 'Staff',
  },
  'audit.category.parent': {
    fr: 'Parents',
    ar: 'الأولياء',
    en: 'Parents',
  },
  'audit.category.account': {
    fr: 'Suppressions de compte',
    ar: 'حذف الحسابات',
    en: 'Account deletions',
  },
  'audit.category.grade': {
    fr: 'Notes',
    ar: 'النقاط',
    en: 'Grades',
  },
  'audit.category.attendance': {
    fr: 'Présences',
    ar: 'الحضور',
    en: 'Attendance',
  },
  'audit.category.homework': {
    fr: 'Devoirs',
    ar: 'الواجبات',
    en: 'Homework',
  },
  'audit.category.lesson': {
    fr: 'Cahier de textes',
    ar: 'دفتر النصوص',
    en: 'Lesson diary',
  },
  'audit.category.student': {
    fr: 'Élèves et liens parents',
    ar: 'التلاميذ وربط الأولياء',
    en: 'Students and parent links',
  },
  'audit.category.class': {
    fr: 'Classes',
    ar: 'الأقسام',
    en: 'Classes',
  },
  'audit.category.report_cards': {
    fr: 'Bulletins',
    ar: 'كشوف النقاط',
    en: 'Report cards',
  },
  'audit.category.announcement': {
    fr: 'Annonces',
    ar: 'الإعلانات',
    en: 'Announcements',
  },
  'audit.category.dm': {
    fr: 'Messagerie',
    ar: 'المراسلة',
    en: 'Messaging',
  },
  'audit.category.data_export': {
    fr: 'Exports de données',
    ar: 'تصدير البيانات',
    en: 'Data exports',
  },
  'audit.category.audit': {
    fr: 'Exports du journal',
    ar: 'تصدير السجل',
    en: 'Log exports',
  },
  'audit.category.security': {
    fr: 'Alertes de sécurité',
    ar: 'تنبيهات أمنية',
    en: 'Security alerts',
  },
  'audit.category.fees': {
    fr: 'Frais scolaires',
    ar: 'المستحقات المدرسية',
    en: 'School fees',
  },
  'audit.category.health': {
    fr: 'Santé et infirmerie',
    ar: 'الصحة والتمريض',
    en: 'Health and infirmary',
  },
  'audit.category.canteen': {
    fr: 'Cantine',
    ar: 'المطعم المدرسي',
    en: 'Canteen',
  },
  'audit.category.transport': {
    fr: 'Transport scolaire',
    ar: 'النقل المدرسي',
    en: 'School transport',
  },
  'audit.category.school': {
    fr: 'Paramètres de l\'établissement',
    ar: 'إعدادات المؤسسة',
    en: 'School settings',
  },
  'audit.category.system': {
    fr: 'Administration plateforme',
    ar: 'إدارة المنصة',
    en: 'Platform administration',
  },
  'audit.action.system.school_created': {
    fr: 'Création d\'un établissement',
    ar: 'إنشاء مؤسسة',
    en: 'School created',
  },
  'audit.action.system.school_updated': {
    fr: 'Modification d\'un établissement',
    ar: 'تعديل مؤسسة',
    en: 'School updated',
  },
  'audit.action.system.school_deleted': {
    fr: 'Suppression d\'un établissement',
    ar: 'حذف مؤسسة',
    en: 'School deleted',
  },
  'audit.action.system.school_activated': {
    fr: 'Activation d\'un établissement',
    ar: 'تفعيل مؤسسة',
    en: 'School activated',
  },
  'audit.action.system.school_deactivated': {
    fr: 'Suspension d\'un établissement',
    ar: 'تعليق مؤسسة',
    en: 'School suspended',
  },
  'audit.action.system.subscription_payment_added': {
    fr: 'Paiement d\'abonnement enregistré',
    ar: 'تسجيل دفعة اشتراك',
    en: 'Subscription payment recorded',
  },
  'audit.action.system.payment_deleted': {
    fr: 'Paiement d\'abonnement supprimé',
    ar: 'حذف دفعة اشتراك',
    en: 'Subscription payment deleted',
  },
  'audit.action.system.school_sessions_revoked': {
    fr: 'Déconnexion forcée d\'un établissement',
    ar: 'إنهاء جميع جلسات المؤسسة',
    en: 'School sessions revoked',
  },
  'audit.action.system.school_impersonation_started': {
    fr: 'Inspection d\'un établissement démarrée',
    ar: 'بدء معاينة مؤسسة',
    en: 'School inspection started',
  },
  'audit.action.system.user_created': {
    fr: 'Utilisateur créé (Super Admin)',
    ar: 'إنشاء مستخدم (المشرف العام)',
    en: 'User created (Super Admin)',
  },
  'audit.action.system.user_updated': {
    fr: 'Utilisateur modifié (Super Admin)',
    ar: 'تعديل مستخدم (المشرف العام)',
    en: 'User updated (Super Admin)',
  },
  'audit.action.system.user_password_reset': {
    fr: 'Mot de passe réinitialisé (Super Admin)',
    ar: 'إعادة تعيين كلمة المرور (المشرف العام)',
    en: 'Password reset (Super Admin)',
  },
  'audit.action.system.user_sessions_revoked': {
    fr: 'Sessions utilisateur révoquées',
    ar: 'إنهاء جلسات المستخدم',
    en: 'User sessions revoked',
  },
  'audit.action.system.broadcast_sent': {
    fr: 'Annonce globale diffusée',
    ar: 'إرسال إعلان عام للمنصة',
    en: 'Platform broadcast sent',
  },
  'audit.action.auth.login_success': {
    fr: 'Connexion',
    ar: 'تسجيل الدخول',
    en: 'Signed in',
  },
  'audit.action.auth.login_failed': {
    fr: 'Échec de connexion',
    ar: 'فشل تسجيل الدخول',
    en: 'Failed sign-in',
  },
  'audit.action.auth.login_deactivated': {
    fr: 'Connexion refusée (compte désactivé)',
    ar: 'دخول مرفوض (حساب معطل)',
    en: 'Sign-in refused (deactivated)',
  },
  'audit.action.auth.logout': {
    fr: 'Déconnexion',
    ar: 'تسجيل الخروج',
    en: 'Signed out',
  },
  'audit.action.auth.password_changed': {
    fr: 'Mot de passe modifié',
    ar: 'تغيير كلمة المرور',
    en: 'Password changed',
  },
  'audit.action.auth.password_change_failed': {
    fr: 'Échec de changement de mot de passe',
    ar: 'فشل تغيير كلمة المرور',
    en: 'Password change failed',
  },
  'audit.action.auth.password_setup_required': {
    fr: 'Connexion sans mot de passe défini',
    ar: 'دخول بدون كلمة مرور',
    en: 'Sign-in without a password set',
  },
  'audit.action.auth.session_revoked': {
    fr: 'Appareil déconnecté',
    ar: 'فصل جهاز',
    en: 'Device signed out',
  },
  'audit.action.auth.sessions_revoked_all': {
    fr: 'Autres appareils déconnectés',
    ar: 'فصل الأجهزة الأخرى',
    en: 'Other devices signed out',
  },
  'audit.action.auth.refresh_failed': {
    fr: 'Session expirée ou réutilisée',
    ar: 'جلسة منتهية أو معاد استعمالها',
    en: 'Expired or reused session',
  },
  'audit.action.auth.teacher_completed': {
    fr: 'Compte enseignant activé',
    ar: 'تفعيل حساب أستاذ',
    en: 'Teacher account activated',
  },
  'audit.action.auth.secretary_completed': {
    fr: 'Compte secrétariat activé',
    ar: 'تفعيل حساب أمانة',
    en: 'Secretary account activated',
  },
  'audit.action.auth.parent_registered': {
    fr: 'Compte parent créé',
    ar: 'إنشاء حساب ولي',
    en: 'Parent account created',
  },
  'audit.action.auth.parent_access_restored': {
    fr: 'Accès parent rétabli',
    ar: 'استعادة دخول ولي',
    en: 'Parent access restored',
  },
  'audit.action.user.signed_out': {
    fr: 'Déconnecté par l\'administration',
    ar: 'تسجيل خروج من الإدارة',
    en: 'Signed out by administration',
  },
  'audit.action.staff.access_reset': {
    fr: 'Accès du personnel réinitialisé',
    ar: 'إعادة تعيين دخول موظف',
    en: 'Staff access reset',
  },
  'audit.action.staff.deactivated': {
    fr: 'Personnel désactivé',
    ar: 'تعطيل موظف',
    en: 'Staff deactivated',
  },
  'audit.action.parent.access_reset': {
    fr: 'Accès parent réinitialisé',
    ar: 'إعادة تعيين دخول ولي',
    en: 'Parent access reset',
  },
  'audit.action.account.deleted': {
    fr: 'Compte supprimé',
    ar: 'حذف حساب',
    en: 'Account deleted',
  },
  'audit.action.grade.updated': {
    fr: 'Note modifiée',
    ar: 'تعديل نقطة',
    en: 'Grade changed',
  },
  'audit.action.grade.deleted': {
    fr: 'Note supprimée',
    ar: 'حذف نقطة',
    en: 'Grade deleted',
  },
  'audit.action.homework.updated': {
    fr: 'Devoir modifié',
    ar: 'تعديل واجب',
    en: 'Homework changed',
  },
  'audit.action.homework.deleted': {
    fr: 'Devoir supprimé',
    ar: 'حذف واجب',
    en: 'Homework deleted',
  },
  'audit.action.lesson.updated': {
    fr: 'Séance modifiée',
    ar: 'تعديل حصة',
    en: 'Lesson changed',
  },
  'audit.action.lesson.deleted': {
    fr: 'Séance supprimée',
    ar: 'حذف حصة',
    en: 'Lesson deleted',
  },
  'audit.action.attendance.corrected': {
    fr: 'Présence corrigée',
    ar: 'تصحيح الحضور',
    en: 'Attendance corrected',
  },
  'audit.action.student.archived': {
    fr: 'Élève archivé',
    ar: 'أرشفة تلميذ',
    en: 'Student archived',
  },
  'audit.action.student.archive_restored': {
    fr: 'Élève désarchivé',
    ar: 'استرجاع تلميذ',
    en: 'Student restored',
  },
  'audit.action.student.parent_unlinked': {
    fr: 'Parent délié',
    ar: 'فك ربط ولي',
    en: 'Parent unlinked',
  },
  'audit.action.student.link_revoked': {
    fr: 'Lien parent révoqué',
    ar: 'إلغاء رابط ولي',
    en: 'Parent link revoked',
  },
  'audit.action.student.link_tokens_generated': {
    fr: 'QR de liaison généré',
    ar: 'إنشاء رمز ربط',
    en: 'Link QR generated',
  },
  'audit.action.report_cards.published': {
    fr: 'Bulletins publiés',
    ar: 'نشر كشوف النقاط',
    en: 'Report cards published',
  },
  'audit.action.report_cards.unpublished': {
    fr: 'Bulletins retirés',
    ar: 'سحب كشوف النقاط',
    en: 'Report cards unpublished',
  },
  'audit.action.announcement.created': {
    fr: 'Annonce publiée',
    ar: 'نشر إعلان',
    en: 'Announcement published',
  },
  'audit.action.announcement.deleted': {
    fr: 'Annonce supprimée',
    ar: 'حذف إعلان',
    en: 'Announcement deleted',
  },
  'audit.action.data_export.student': {
    fr: 'Export du dossier élève',
    ar: 'تصدير ملف تلميذ',
    en: 'Student record exported',
  },
  'audit.action.audit.exported': {
    fr: 'Journal exporté',
    ar: 'تصدير السجل',
    en: 'Log exported',
  },
  'audit.action.security.response_spike': {
    fr: 'Alerte : pic d\'erreurs d\'accès',
    ar: 'تنبيه: ارتفاع أخطاء الدخول',
    en: 'Alert: spike of access errors',
  },
  'audit.action.dm.user_blocked': {
    fr: 'Utilisateur bloqué',
    ar: 'حظر مستخدم',
    en: 'User blocked',
  },
  'audit.action.dm.user_unblocked': {
    fr: 'Utilisateur débloqué',
    ar: 'رفع الحظر',
    en: 'User unblocked',
  },
  'audit.action.dm.report_created': {
    fr: 'Signalement envoyé',
    ar: 'إرسال بلاغ',
    en: 'Report sent',
  },
  'audit.action.dm.report_reviewed': {
    fr: 'Signalement traité',
    ar: 'معالجة بلاغ',
    en: 'Report reviewed',
  },
  'audit.action.dm.bulk_send': {
    fr: 'Message groupé',
    ar: 'رسالة جماعية',
    en: 'Bulk message',
  },
  'audit.action.auth.nurse_completed': {
    fr: 'Compte infirmerie activé',
    ar: 'تفعيل حساب التمريض',
    en: 'School nurse account activated',
  },
  'audit.action.auth.canteen_completed': {
    fr: 'Compte cantine activé',
    ar: 'تفعيل حساب المطعم',
    en: 'Canteen staff account activated',
  },
  'audit.action.auth.driver_completed': {
    fr: 'Compte chauffeur activé',
    ar: 'تفعيل حساب السائق',
    en: 'Bus driver account activated',
  },
  'audit.action.grades.approved': {
    fr: 'Notes validées',
    ar: 'اعتماد النقاط',
    en: 'Grades approved',
  },
  'audit.action.staff.teachers_imported': {
    fr: 'Enseignants importés',
    ar: 'استيراد قائمة الأساتذة',
    en: 'Teachers imported',
  },
  'audit.action.parent_codes.viewed': {
    fr: 'Codes d\'accès parents consultés',
    ar: 'الاطلاع على رموز دخول الأولياء',
    en: 'Parent access codes viewed',
  },
  'audit.action.school.logo_updated': {
    fr: 'Logo de l\'école modifié',
    ar: 'تحديث شعار المدرسة',
    en: 'School logo updated',
  },
  'audit.action.school.logo_removed': {
    fr: 'Logo de l\'école supprimé',
    ar: 'حذف شعار المدرسة',
    en: 'School logo removed',
  },
  'audit.action.school.modules_updated': {
    fr: 'Modules de l\'école modifiés',
    ar: 'تعديل خدمات المدرسة',
    en: 'School modules updated',
  },
  'audit.action.school.academic_year_started': {
    fr: 'Nouvelle année scolaire ouverte',
    ar: 'فتح سنة دراسية جديدة',
    en: 'New school year started',
  },
  'audit.action.class.archived': {
    fr: 'Classe archivée',
    ar: 'أرشفة قسم',
    en: 'Class archived',
  },
  'audit.action.class.restored': {
    fr: 'Classe restaurée',
    ar: 'استعادة قسم',
    en: 'Class restored',
  },
  'audit.action.chat.message_reported': {
    fr: 'Message de classe signalé',
    ar: 'الإبلاغ عن رسالة في القسم',
    en: 'Class message reported',
  },
  'audit.action.demo.school_seeded': {
    fr: 'École de démonstration initialisée',
    ar: 'تهيئة المدرسة التجريبية',
    en: 'Demo school initialized',
  },
  'audit.action.fees.invoices_created': {
    fr: 'Frais scolaires générés',
    ar: 'إنشاء مستحقات مدرسية',
    en: 'School fees generated',
  },
  'audit.action.fees.invoice_updated': {
    fr: 'Facture modifiée',
    ar: 'تعديل فاتورة',
    en: 'Invoice updated',
  },
  'audit.action.fees.invoice_deleted': {
    fr: 'Facture supprimée',
    ar: 'حذف فاتورة',
    en: 'Invoice deleted',
  },
  'audit.action.fees.payment_recorded': {
    fr: 'Paiement enregistré',
    ar: 'تسجيل دفعة مالية',
    en: 'Payment recorded',
  },
  'audit.action.fees.payment_cancelled': {
    fr: 'Paiement annulé',
    ar: 'إلغاء دفعة مالية',
    en: 'Payment cancelled',
  },
  'audit.action.fees.reminders_sent': {
    fr: 'Rappels de paiement envoyés',
    ar: 'إرسال تذكيرات بالدفع',
    en: 'Payment reminders sent',
  },
  'audit.action.fees.settings_updated': {
    fr: 'Paramètres de rappels modifiés',
    ar: 'تعديل إعدادات التذكير بالدفع',
    en: 'Fee reminder settings updated',
  },
  'audit.action.health.viewed': {
    fr: 'Fiche santé consultée',
    ar: 'الاطلاع على البطاقة الصحية',
    en: 'Health sheet viewed',
  },
  'audit.action.health.updated': {
    fr: 'Fiche santé mise à jour',
    ar: 'تحديث البطاقة الصحية',
    en: 'Health sheet updated',
  },
  'audit.action.health.deleted': {
    fr: 'Fiche santé effacée',
    ar: 'حذف البطاقة الصحية',
    en: 'Health sheet erased',
  },
  'audit.action.health.directory_viewed': {
    fr: 'Liste des alertes santé consultée',
    ar: 'الاطلاع على قائمة التنبيهات الصحية',
    en: 'Health alerts directory viewed',
  },
  'audit.action.canteen.headcount_viewed': {
    fr: 'Effectif cantine du jour consulté',
    ar: 'الاطلاع على عدد وجبات المطعم اليومي',
    en: 'Daily canteen headcount viewed',
  },
  'audit.action.canteen.menu_saved': {
    fr: 'Menu cantine enregistré',
    ar: 'حفظ قائمة طعام المطعم',
    en: 'Canteen menu saved',
  },
  'audit.action.canteen.menu_deleted': {
    fr: 'Menu cantine supprimé',
    ar: 'حذف قائمة طعام المطعم',
    en: 'Canteen menu deleted',
  },
  'audit.action.canteen.menus_published': {
    fr: 'Menus de la semaine publiés',
    ar: 'نشر قوائم طعام الأسبوع',
    en: 'Weekly menus published',
  },
  'audit.action.canteen.enrollment_created': {
    fr: 'Élève inscrit à la cantine',
    ar: 'تسجيل تلميذ في المطعم',
    en: 'Student enrolled in canteen',
  },
  'audit.action.canteen.enrollment_updated': {
    fr: 'Inscription cantine modifiée',
    ar: 'تعديل تسجيل المطعم',
    en: 'Canteen enrollment updated',
  },
  'audit.action.canteen.enrollment_deleted': {
    fr: 'Inscription cantine supprimée',
    ar: 'إلغاء تسجيل المطعم',
    en: 'Canteen enrollment removed',
  },
  'audit.action.canteen.month_billed': {
    fr: 'Facturation mensuelle cantine générée',
    ar: 'إصدار فواتير المطعم الشهرية',
    en: 'Monthly canteen billing generated',
  },
  'audit.action.canteen.settings_updated': {
    fr: 'Tarifs cantine modifiés',
    ar: 'تعديل أسعار المطعم',
    en: 'Canteen pricing updated',
  },
  'audit.action.transport.route_created': {
    fr: 'Ligne de bus créée',
    ar: 'إنشاء خط نقل مدرسي',
    en: 'Bus route created',
  },
  'audit.action.transport.route_updated': {
    fr: 'Ligne de bus modifiée',
    ar: 'تعديل خط نقل مدرسي',
    en: 'Bus route updated',
  },
  'audit.action.transport.route_deleted': {
    fr: 'Ligne de bus supprimée',
    ar: 'حذف خط نقل مدرسي',
    en: 'Bus route deleted',
  },
  'audit.action.transport.stop_created': {
    fr: 'Arrêt de bus ajouté',
    ar: 'إضافة موقف حافلة',
    en: 'Bus stop added',
  },
  'audit.action.transport.stop_updated': {
    fr: 'Arrêt de bus modifié',
    ar: 'تعديل موقف حافلة',
    en: 'Bus stop updated',
  },
  'audit.action.transport.stop_deleted': {
    fr: 'Arrêt de bus supprimé',
    ar: 'حذف موقف حافلة',
    en: 'Bus stop deleted',
  },
  'audit.action.transport.assignment_saved': {
    fr: 'Affectation au bus enregistrée',
    ar: 'تسجيل تلميذ في النقل المدرسي',
    en: 'Bus assignment saved',
  },
  'audit.action.transport.assignment_deleted': {
    fr: 'Affectation au bus supprimée',
    ar: 'إلغاء تسجيل تلميذ في النقل المدرسي',
    en: 'Bus assignment removed',
  },
  'audit.action.transport.month_billed': {
    fr: 'Facturation mensuelle transport générée',
    ar: 'إصدار فواتير النقل الشهرية',
    en: 'Monthly transport billing generated',
  },
  'audit.action.transport.driver_manifest_viewed': {
    fr: 'Liste des passagers consultée (chauffeur)',
    ar: 'الاطلاع على قائمة ركاب الحافلة',
    en: 'Driver passenger list viewed',
  },
  'audit.action.transport.trip_started': {
    fr: 'Trajet de bus démarré',
    ar: 'بدء رحلة الحافلة',
    en: 'Bus trip started',
  },
  'audit.action.transport.trip_events_recorded': {
    fr: 'Montées / descentes enregistrées',
    ar: 'تسجيل صعود ونزول التلاميذ',
    en: 'Boarding and drop-off check-ins recorded',
  },
  'audit.action.transport.trip_delayed': {
    fr: 'Retard de bus signalé aux parents',
    ar: 'إبلاغ الأولياء بتأخر الحافلة',
    en: 'Bus delay reported to parents',
  },
  'audit.action.transport.trip_completed': {
    fr: 'Trajet de bus terminé',
    ar: 'إنهاء رحلة الحافلة',
    en: 'Bus trip completed',
  },
  'audit.action.transport.unaccounted_student_alert': {
    fr: 'Alerte sécurité : élève non descendu du bus',
    ar: 'تنبيه أمني: تلميذ لم يُسجَّل نزوله من الحافلة',
    en: 'Security alert: student not marked dropped off',
  },
  'audit.action.transport.exception_created': {
    fr: 'Absence au bus signalée par un parent',
    ar: 'إبلاغ ولي بعدم ركوب الحافلة',
    en: 'No-bus notice submitted by parent',
  },
  'audit.action.transport.exception_deleted': {
    fr: 'Absence au bus annulée',
    ar: 'إلغاء بلاغ عدم ركوب الحافلة',
    en: 'No-bus notice cancelled',
  },
  'audit.action.http.get': {
    fr: 'Consultation technique (GET)',
    ar: 'طلب قراءة تقني (GET)',
    en: 'Technical read request (GET)',
  },
  'audit.action.http.post': {
    fr: 'Envoi technique (POST)',
    ar: 'طلب إرسال تقني (POST)',
    en: 'Technical write request (POST)',
  },
  'audit.action.http.put': {
    fr: 'Mise à jour technique (PUT)',
    ar: 'طلب تحديث تقني (PUT)',
    en: 'Technical update request (PUT)',
  },
  'audit.action.http.patch': {
    fr: 'Modification technique (PATCH)',
    ar: 'طلب تعديل تقني (PATCH)',
    en: 'Technical edit request (PATCH)',
  },
  'audit.action.http.delete': {
    fr: 'Suppression technique (DELETE)',
    ar: 'طلب حذف تقني (DELETE)',
    en: 'Technical delete request (DELETE)',
  },
  'audit.resource.canteen': {
    fr: 'Cantine',
    ar: 'المطعم',
    en: 'Canteen',
  },
  'audit.resource.transport': {
    fr: 'Transport',
    ar: 'النقل',
    en: 'Transport',
  },
  'audit.resource.class': {
    fr: 'Classe',
    ar: 'القسم',
    en: 'Class',
  },
  'audit.resource.school': {
    fr: 'Établissement',
    ar: 'المؤسسة',
    en: 'School',
  },
  'audit.resource.student': {
    fr: 'Élève',
    ar: 'التلميذ',
    en: 'Student',
  },
  'audit.resource.staff': {
    fr: 'Personnel',
    ar: 'الطاقم',
    en: 'Staff',
  },
  'audit.resource.user': {
    fr: 'Compte',
    ar: 'الحساب',
    en: 'Account',
  },
  'audit.resource.fees': {
    fr: 'Frais scolaires',
    ar: 'المستحقات',
    en: 'Fees',
  },
  'audit.resource.health': {
    fr: 'Santé',
    ar: 'الصحة',
    en: 'Health',
  },
  'audit.resource.grade': {
    fr: 'Note',
    ar: 'نقطة',
    en: 'Grade',
  },
  'audit.resource.grades': {
    fr: 'Notes',
    ar: 'النقاط',
    en: 'Grades',
  },
  'audit.resource.attendance': {
    fr: 'Présences',
    ar: 'الحضور',
    en: 'Attendance',
  },
  'audit.resource.homework': {
    fr: 'Devoir',
    ar: 'واجب',
    en: 'Homework',
  },
  'audit.resource.lesson': {
    fr: 'Cours',
    ar: 'درس',
    en: 'Lesson',
  },
  'audit.resource.announcement': {
    fr: 'Annonce',
    ar: 'إعلان',
    en: 'Announcement',
  },
  'audit.resource.class_message': {
    fr: 'Message de classe',
    ar: 'رسالة القسم',
    en: 'Class message',
  },
  'audit.resource.direct_message_bulk': {
    fr: 'Message groupé',
    ar: 'رسالة جماعية',
    en: 'Bulk message',
  },
  'audit.resource.message_block': {
    fr: 'Blocage',
    ar: 'حظر',
    en: 'Block',
  },
  'audit.resource.message_report': {
    fr: 'Signalement',
    ar: 'بلاغ',
    en: 'Report',
  },
  'audit.resource.security_alert': {
    fr: 'Sécurité',
    ar: 'الأمان',
    en: 'Security',
  },
  'audit.resource.audit': {
    fr: 'Journal',
    ar: 'السجل',
    en: 'Log',
  },
  'audit.resource.auth': {
    fr: 'Connexion',
    ar: 'الدخول',
    en: 'Sign-in',
  },
  'audit.meta.date': {
    fr: 'Date',
    ar: 'التاريخ',
    en: 'Date',
  },
  'audit.meta.total': {
    fr: 'Total',
    ar: 'المجموع',
    en: 'Total',
  },
  'audit.meta.approved_count': {
    fr: 'Notes validées',
    ar: 'النقاط المعتمدة',
    en: 'Approved grades',
  },
  'audit.meta.count': {
    fr: 'Nombre',
    ar: 'العدد',
    en: 'Count',
  },
  'audit.meta.amount': {
    fr: 'Montant',
    ar: 'المبلغ',
    en: 'Amount',
  },
  'audit.meta.month': {
    fr: 'Mois',
    ar: 'الشهر',
    en: 'Month',
  },
  'audit.meta.year': {
    fr: 'Année',
    ar: 'السنة',
    en: 'Year',
  },
  'audit.meta.direction': {
    fr: 'Trajet',
    ar: 'الاتجاه',
    en: 'Trip',
  },
  'audit.meta.reason': {
    fr: 'Motif',
    ar: 'السبب',
    en: 'Reason',
  },
  'audit.meta.status': {
    fr: 'Statut',
    ar: 'الحالة',
    en: 'Status',
  },
  'audit.meta.purpose': {
    fr: 'Objet',
    ar: 'الغرض',
    en: 'Purpose',
  },
  'audit.meta.imported': {
    fr: 'Importés',
    ar: 'تم استيرادهم',
    en: 'Imported',
  },
  'audit.meta.skipped': {
    fr: 'Ignorés',
    ar: 'تم تجاوزهم',
    en: 'Skipped',
  },
  'audit.meta.created': {
    fr: 'Créés',
    ar: 'تم إنشاؤهم',
    en: 'Created',
  },
  'audit.meta.notified': {
    fr: 'Notifiés',
    ar: 'تم إشعارهم',
    en: 'Notified',
  },
  'audit.meta.minutes': {
    fr: 'Minutes',
    ar: 'دقائق',
    en: 'Minutes',
  },
  'audit.meta.forced': {
    fr: 'Clôture forcée',
    ar: 'إغلاق إجباري',
    en: 'Forced completion',
  },
  'audit.meta.recipient_count': {
    fr: 'Destinataires',
    ar: 'المستلمون',
    en: 'Recipients',
  },
  'audit.meta.day': {
    fr: 'Jour',
    ar: 'اليوم',
    en: 'Day',
  },
  'audit.meta.diet': {
    fr: 'Régime',
    ar: 'النظام الغذائي',
    en: 'Diet',
  },
  'audit.meta.all_overdue': {
    fr: 'Tous les retards',
    ar: 'كل المتأخرات',
    en: 'All overdue',
  },
  'audit.meta.attendance_count': {
    fr: 'Présences',
    ar: 'سجلات الحضور',
    en: 'Attendance records',
  },
  'audit.meta.auto_reminders': {
    fr: 'Rappels automatiques',
    ar: 'التذكير التلقائي',
    en: 'Automatic reminders',
  },
  'audit.meta.bytes': {
    fr: 'Taille (octets)',
    ar: 'الحجم (بايت)',
    en: 'Size (bytes)',
  },
  'audit.meta.category': {
    fr: 'Catégorie',
    ar: 'الفئة',
    en: 'Category',
  },
  'audit.meta.class_count': {
    fr: 'Classes',
    ar: 'الأقسام',
    en: 'Classes',
  },
  'audit.meta.consent_method': {
    fr: 'Mode de consentement',
    ar: 'طريقة الموافقة',
    en: 'Consent method',
  },
  'audit.meta.detail': {
    fr: 'Détail',
    ar: 'التفصيل',
    en: 'Detail',
  },
  'audit.meta.details': {
    fr: 'Détails',
    ar: 'التفاصيل',
    en: 'Details',
  },
  'audit.meta.email': {
    fr: 'E-mail',
    ar: 'البريد الإلكتروني',
    en: 'Email',
  },
  'audit.meta.expires_in_hours': {
    fr: 'Validité (heures)',
    ar: 'الصلاحية (ساعات)',
    en: 'Validity (hours)',
  },
  'audit.meta.grade_count': {
    fr: 'Notes',
    ar: 'النقاط',
    en: 'Grades',
  },
  'audit.meta.invited': {
    fr: 'Invités',
    ar: 'تمت دعوتهم',
    en: 'Invited',
  },
  'audit.meta.label': {
    fr: 'Libellé',
    ar: 'التسمية',
    en: 'Label',
  },
  'audit.meta.linked_students': {
    fr: 'Élèves liés',
    ar: 'التلاميذ المرتبطون',
    en: 'Linked students',
  },
  'audit.meta.method': {
    fr: 'Moyen',
    ar: 'الطريقة',
    en: 'Method',
  },
  'audit.meta.name': {
    fr: 'Nom',
    ar: 'الاسم',
    en: 'Name',
  },
  'audit.meta.no_parent': {
    fr: 'Sans parent connecté',
    ar: 'دون ولي متصل',
    en: 'Without connected parent',
  },
  'audit.meta.plan': {
    fr: 'Formule',
    ar: 'الصيغة',
    en: 'Plan',
  },
  'audit.meta.previous_reason': {
    fr: 'Ancien motif',
    ar: 'السبب السابق',
    en: 'Previous reason',
  },
  'audit.meta.published': {
    fr: 'Publié',
    ar: 'منشور',
    en: 'Published',
  },
  'audit.meta.reactivated': {
    fr: 'Réactivé',
    ar: 'إعادة تفعيل',
    en: 'Reactivated',
  },
  'audit.meta.receipt_number': {
    fr: 'N° reçu',
    ar: 'رقم الوصل',
    en: 'Receipt no.',
  },
  'audit.meta.recipients': {
    fr: 'Destinataires',
    ar: 'المستلمون',
    en: 'Recipients',
  },
  'audit.meta.recorded': {
    fr: 'Enregistrés',
    ar: 'مسجلون',
    en: 'Recorded',
  },
  'audit.meta.remark_count': {
    fr: 'Remarques',
    ar: 'الملاحظات',
    en: 'Remarks',
  },
  'audit.meta.republished': {
    fr: 'Republié',
    ar: 'إعادة نشر',
    en: 'Republished',
  },
  'audit.meta.requester_role': {
    fr: 'Rôle demandeur',
    ar: 'دور الطالب',
    en: 'Requester role',
  },
  'audit.meta.role': {
    fr: 'Rôle',
    ar: 'الدور',
    en: 'Role',
  },
  'audit.meta.routes': {
    fr: 'Lignes',
    ar: 'الخطوط',
    en: 'Routes',
  },
  'audit.meta.rows': {
    fr: 'Lignes exportées',
    ar: 'الصفوف المصدرة',
    en: 'Exported rows',
  },
  'audit.meta.sender_name': {
    fr: 'Expéditeur',
    ar: 'المرسل',
    en: 'Sender',
  },
  'audit.meta.sent': {
    fr: 'Envoyés',
    ar: 'تم إرسالها',
    en: 'Sent',
  },
  'audit.meta.sessions_revoked': {
    fr: 'Sessions déconnectées',
    ar: 'الجلسات المفصولة',
    en: 'Sessions signed out',
  },
  'audit.meta.skipped_recent': {
    fr: 'Déjà rappelés récemment',
    ar: 'تم تذكيرهم مؤخرا',
    en: 'Recently reminded',
  },
  'audit.meta.status_code': {
    fr: 'Code réponse',
    ar: 'رمز الاستجابة',
    en: 'Response code',
  },
  'audit.meta.students': {
    fr: 'Élèves',
    ar: 'التلاميذ',
    en: 'Students',
  },
  'audit.meta.subject': {
    fr: 'Matière',
    ar: 'المادة',
    en: 'Subject',
  },
  'audit.meta.threshold': {
    fr: 'Seuil',
    ar: 'العتبة',
    en: 'Threshold',
  },
  'audit.meta.title': {
    fr: 'Titre',
    ar: 'العنوان',
    en: 'Title',
  },
  'audit.meta.token_count': {
    fr: 'Codes générés',
    ar: 'الرموز المنشأة',
    en: 'Codes generated',
  },
  'audit.meta.type': {
    fr: 'Type',
    ar: 'النوع',
    en: 'Type',
  },
  'audit.meta.via': {
    fr: 'Via',
    ar: 'عبر',
    en: 'Via',
  },
  'audit.meta.was_approved': {
    fr: 'Était validée',
    ar: 'كانت معتمدة',
    en: 'Was approved',
  },
  'audit.meta.week_start': {
    fr: 'Semaine du',
    ar: 'أسبوع',
    en: 'Week of',
  },
  'audit.meta.whole_school': {
    fr: 'Toute l\'école',
    ar: 'كامل المدرسة',
    en: 'Whole school',
  },
  'audit.meta.window_seconds': {
    fr: 'Fenêtre (secondes)',
    ar: 'المدة (ثوان)',
    en: 'Window (seconds)',
  },
  'audit.meta.academic_year': {
    fr: 'Année scolaire',
    ar: 'السنة الدراسية',
    en: 'School year',
  },
  'audit.meta.archived_classes': {
    fr: 'Classes archivées',
    ar: 'الأقسام المؤرشفة',
    en: 'Archived classes',
  },
  'audit.value.cash': {
    fr: 'Espèces',
    ar: 'نقدا',
    en: 'Cash',
  },
  'audit.value.bank_transfer': {
    fr: 'Virement bancaire',
    ar: 'تحويل بنكي',
    en: 'Bank transfer',
  },
  'audit.value.ccp': {
    fr: 'CCP / BaridiMob',
    ar: 'بريد الجزائر / بريدي موب',
    en: 'CCP / BaridiMob',
  },
  'audit.value.cheque': {
    fr: 'Chèque',
    ar: 'شيك',
    en: 'Cheque',
  },
  'audit.value.monthly': {
    fr: 'Forfait mensuel',
    ar: 'اشتراك شهري',
    en: 'Monthly flat rate',
  },
  'audit.value.selected_days': {
    fr: 'Jours choisis',
    ar: 'أيام مختارة',
    en: 'Selected days',
  },
  'audit.value.app': {
    fr: 'Dans l\'application',
    ar: 'عبر التطبيق',
    en: 'In the app',
  },
  'audit.value.paper': {
    fr: 'Formulaire papier',
    ar: 'استمارة ورقية',
    en: 'Signed paper form',
  },
  'audit.value.yes': {
    fr: 'Oui',
    ar: 'نعم',
    en: 'Yes',
  },
  'audit.value.no': {
    fr: 'Non',
    ar: 'لا',
    en: 'No',
  },
  'audit.value.morning': {
    fr: 'Matin',
    ar: 'الصباح',
    en: 'Morning',
  },
  'audit.value.evening': {
    fr: 'Soir',
    ar: 'المساء',
    en: 'Evening',
  },
  'audit.value.both': {
    fr: 'Aller-retour',
    ar: 'ذهاب وإياب',
    en: 'Round trip',
  },
  'audit.value.schoolPresentation': {
    fr: 'Présentation de la démo',
    ar: 'عرض المدرسة التجريبية',
    en: 'Demo presentation',
  },
  'audit.origin.system': {
    fr: 'Système (automatique)',
    ar: 'النظام (تلقائي)',
    en: 'System (automatic)',
  },
  'records.openFile': {
    fr: 'Dossier complet de l\'élève',
    ar: 'الملف الكامل للتلميذ',
    en: 'Full student file',
  },
  'records.periodFilter': {
    fr: 'Période affichée',
    ar: 'الفترة المعروضة',
    en: 'Displayed period',
  },
  'records.activeTerm': {
    fr: 'Trimestre actif',
    ar: 'الفصل الحالي',
    en: 'Active term',
  },
  'records.studentFile': {
    fr: 'Dossier de l\'élève',
    ar: 'ملف التلميذ',
    en: 'Student file',
  },
  'records.identity': {
    fr: 'Identité et famille',
    ar: 'الهوية والعائلة',
    en: 'Identity and family',
  },
  'records.studentNumber': {
    fr: 'Matricule',
    ar: 'رقم التسجيل',
    en: 'Student no.',
  },
  'records.classes': {
    fr: 'Classes',
    ar: 'الأقسام',
    en: 'Classes',
  },
  'records.archived': {
    fr: 'Archivé',
    ar: 'مؤرشف',
    en: 'Archived',
  },
  'records.parents': {
    fr: 'Parents et responsables',
    ar: 'الأولياء',
    en: 'Parents',
  },
  'records.results': {
    fr: 'Résultats — {term}',
    ar: 'النتائج — {term}',
    en: 'Results — {term}',
  },
  'records.allTime': {
    fr: 'depuis l\'inscription',
    ar: 'منذ التسجيل',
    en: 'since enrolment',
  },
  'records.averageIn': {
    fr: 'moyenne en {name}',
    ar: 'المعدل في {name}',
    en: 'average in {name}',
  },
  'records.absences': {
    fr: 'absences ({justified} justifiées, {lates} retards)',
    ar: 'غياب ({justified} مبرر، {lates} تأخر)',
    en: 'absences ({justified} justified, {lates} late)',
  },
  'records.remarks': {
    fr: 'Remarques récentes',
    ar: 'الملاحظات الأخيرة',
    en: 'Recent remarks',
  },
  'records.none': {
    fr: 'Rien pour le moment.',
    ar: 'لا شيء حاليا.',
    en: 'Nothing yet.',
  },
  'records.history': {
    fr: 'Historique',
    ar: 'السجل',
    en: 'History',
  },
  'records.teacherHistory': {
    fr: 'Historique de l\'enseignant',
    ar: 'سجل الأستاذ',
    en: 'Teacher history',
  },
  'records.lastSignIn': {
    fr: 'Dernière connexion : {date}',
    ar: 'آخر دخول: {date}',
    en: 'Last sign-in: {date}',
  },
  'records.assignments': {
    fr: 'Classes et matières',
    ar: 'الأقسام والمواد',
    en: 'Classes and subjects',
  },
  'records.lastDays': {
    fr: '{days} derniers jours',
    ar: 'آخر {days} يوما',
    en: 'Last {days} days',
  },
  'records.stat.grades_entered': {
    fr: 'notes saisies',
    ar: 'نقطة مدخلة',
    en: 'grades entered',
  },
  'records.stat.grades_pending_approval': {
    fr: 'notes en attente de validation',
    ar: 'نقطة بانتظار المصادقة',
    en: 'grades awaiting approval',
  },
  'records.stat.attendance_records': {
    fr: 'pointages de présence',
    ar: 'تسجيل حضور',
    en: 'attendance records',
  },
  'records.stat.homework_posted': {
    fr: 'devoirs publiés',
    ar: 'واجب منشور',
    en: 'homework posted',
  },
  'records.stat.lessons_logged': {
    fr: 'séances au cahier de textes',
    ar: 'حصة في دفتر النصوص',
    en: 'lessons logged',
  },
  'records.stat.corrections': {
    fr: 'corrections (notes, présences…)',
    ar: 'تصحيح (نقاط، حضور…)',
    en: 'corrections (grades, attendance…)',
  },
  'records.stat.failed_sign_ins': {
    fr: 'échecs de connexion',
    ar: 'محاولة دخول فاشلة',
    en: 'failed sign-ins',
  },
  'records.historyNote': {
    fr: 'Les notes et présences saisies avant cette mise à jour ne sont pas attribuées.',
    ar: 'النقاط والحضور المسجلة قبل هذا التحديث غير منسوبة.',
    en: 'Grades and attendance entered before this update are not attributed.',
  },
  'records.recentActivity': {
    fr: 'Activité récente',
    ar: 'النشاط الأخير',
    en: 'Recent activity',
  },
  'monthly.title': {
    fr: 'Bilan mensuel — {month}',
    ar: 'الحصيلة الشهرية — {month}',
    en: 'Monthly report — {month}',
  },
  'monthly.copy': {
    fr: 'Ce que l\'application a fait pour votre école ce mois-ci, comparé au mois précédent.',
    ar: 'ما قدّمه التطبيق لمدرستك هذا الشهر مقارنة بالشهر السابق.',
    en: 'What the app did for your school this month, compared with the month before.',
  },
  'monthly.partial': {
    fr: 'Mois en cours : chiffres arrêtés au {date}.',
    ar: 'الشهر الجاري: الأرقام إلى غاية {date}.',
    en: 'Month in progress: figures as of {date}.',
  },
  'monthly.error': {
    fr: 'Impossible de charger le bilan.',
    ar: 'تعذر تحميل الحصيلة.',
    en: 'Could not load the report.',
  },
  'monthly.pickMonth': {
    fr: 'Choisir le mois',
    ar: 'اختيار الشهر',
    en: 'Choose the month',
  },
  'monthly.print': {
    fr: 'Imprimer / PDF',
    ar: 'طباعة / PDF',
    en: 'Print / PDF',
  },
  'monthly.attendanceRate': {
    fr: 'Taux de présence',
    ar: 'نسبة الحضور',
    en: 'Attendance rate',
  },
  'monthly.parentNotifications': {
    fr: 'Notifications envoyées aux parents',
    ar: 'إشعارات أُرسلت للأولياء',
    en: 'Notifications sent to parents',
  },
  'monthly.activeParents': {
    fr: 'Parents actifs',
    ar: 'أولياء نشطون',
    en: 'Active parents',
  },
  'monthly.ofLinkedParents': {
    fr: '{rate} des {total} parents connectés',
    ar: '{rate} من {total} ولي متصل',
    en: '{rate} of the {total} connected parents',
  },
  'monthly.gradesEntered': {
    fr: 'Notes saisies',
    ar: 'نقاط مُدخلة',
    en: 'Grades entered',
  },
  'monthly.vsPrevious': {
    fr: '{diff} par rapport à {month}',
    ar: '{diff} مقارنة بـ {month}',
    en: '{diff} vs {month}',
  },
  'monthly.noComparison': {
    fr: 'Pas de comparaison possible',
    ar: 'لا مقارنة ممكنة',
    en: 'No comparison available',
  },
  'monthly.points': {
    fr: 'pts',
    ar: 'نقطة',
    en: 'pts',
  },
  'monthly.schoolLife': {
    fr: 'Vie de l\'école',
    ar: 'الحياة المدرسية',
    en: 'School life',
  },
  'monthly.indicator': {
    fr: 'Indicateur',
    ar: 'المؤشر',
    en: 'Indicator',
  },
  'monthly.absences': {
    fr: 'Absences signalées',
    ar: 'غيابات مسجلة',
    en: 'Absences recorded',
  },
  'monthly.unjustified': {
    fr: 'dont non justifiées',
    ar: 'منها غير مبررة',
    en: 'of which unjustified',
  },
  'monthly.lates': {
    fr: 'Retards',
    ar: 'تأخرات',
    en: 'Late arrivals',
  },
  'monthly.homework': {
    fr: 'Devoirs publiés',
    ar: 'واجبات منشورة',
    en: 'Homework posted',
  },
  'monthly.lessons': {
    fr: 'Séances au cahier de textes',
    ar: 'حصص في دفتر النصوص',
    en: 'Lessons logged',
  },
  'monthly.messages': {
    fr: 'Messages échangés',
    ar: 'رسائل متبادلة',
    en: 'Messages exchanged',
  },
  'monthly.announcements': {
    fr: 'Annonces',
    ar: 'إعلانات',
    en: 'Announcements',
  },
  'monthly.reportCards': {
    fr: 'Bulletins publiés',
    ar: 'كشوف نقاط منشورة',
    en: 'Report cards published',
  },
  'monthly.meetings': {
    fr: 'Rendez-vous parents réservés',
    ar: 'مواعيد أولياء محجوزة',
    en: 'Parent meetings booked',
  },
  'monthly.activeTeachers': {
    fr: 'Enseignants actifs',
    ar: 'أساتذة نشطون',
    en: 'Active teachers',
  },
  'monthly.coverage': {
    fr: 'Couverture',
    ar: 'التغطية',
    en: 'Coverage',
  },
  'monthly.parentCoverage': {
    fr: 'des élèves ont un parent connecté ({linked} sur {total})',
    ar: 'من التلاميذ لهم ولي متصل ({linked} من {total})',
    en: 'of students have a parent connected ({linked} of {total})',
  },
  'monthly.teachersUsing': {
    fr: 'enseignants ont utilisé l\'application ce mois-ci',
    ar: 'أساتذة استعملوا التطبيق هذا الشهر',
    en: 'teachers used the app this month',
  },
  'monthly.classAttendance': {
    fr: 'Présence par classe',
    ar: 'الحضور حسب القسم',
    en: 'Attendance by class',
  },
  'monthly.noAttendance': {
    fr: 'Aucun appel enregistré ce mois-ci.',
    ar: 'لا توجد مناداة مسجلة هذا الشهر.',
    en: 'No attendance recorded this month.',
  },
  'monthly.method': {
    fr: 'Chiffres calculés à partir des enregistrements de l\'application (appels, notifications, journal d\'activité), heure d\'Algérie. Les retards comptent comme présents.',
    ar: 'أرقام محسوبة من سجلات التطبيق (المناداة، الإشعارات، سجل النشاط) بتوقيت الجزائر. التأخر يُحسب حضورًا.',
    en: 'Figures computed from the app\'s records (attendance, notifications, activity log), Algeria time. Late arrivals count as present.',
  },
  'monthly.feesCollected': {
    fr: 'Frais encaissés',
    ar: 'مصاريف محصّلة',
    en: 'Fees collected',
  },
  'monthly.services': {
    fr: 'Cantine et transport',
    ar: 'المطعم والنقل المدرسي',
    en: 'Canteen and transport',
  },
  'monthly.canteenEnrolled': {
    fr: 'élève(s) inscrits à la cantine · {menus} menu(s) publié(s)',
    ar: 'تلميذ مسجل في المطعم · {menus} قائمة طعام منشورة',
    en: 'student(s) registered in canteen · {menus} published menu(s)',
  },
  'monthly.transportAssigned': {
    fr: 'élève(s) transportés · {trips} trajet(s) ({delayed} retard(s))',
    ar: 'تلميذ في النقل · {trips} رحلة ({delayed} تأخر)',
    en: 'student(s) on buses · {trips} trip(s) ({delayed} delayed)',
  },
};
