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
    fr: 'Afficher aussi les requêtes techniques (http.*)',
    ar: 'عرض الطلبات التقنية أيضا (http.*)',
    en: 'Also show technical requests (http.*)',
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
  'records.openFile': {
    fr: 'Dossier complet de l\'élève',
    ar: 'الملف الكامل للتلميذ',
    en: 'Full student file',
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
