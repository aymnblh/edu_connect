import type { TranslationMap } from './types';

export const parentTranslations: TranslationMap = {
  'health.tab': {
    fr: 'Santé',
    ar: 'الصحة',
    en: 'Health',
  },
  'health.title': {
    fr: 'Fiche santé et urgence',
    ar: 'البطاقة الصحية والطوارئ',
    en: 'Health and emergency sheet',
  },
  'health.parentIntro': {
    fr: 'Ces informations aident l\'école à réagir en cas d\'urgence. Elles ne sont visibles que par la direction et vous ; les enseignants voient seulement l\'alerte courte. Ne renseignez que le nécessaire.',
    ar: 'تساعد هذه المعلومات المؤسسة على التصرف في حالة الطوارئ. لا يراها إلا الإدارة وأنتم؛ يرى الأساتذة التنبيه القصير فقط. أدخلوا الضروري فقط.',
    en: 'This helps the school act in an emergency. Only the administration and you can see it; teachers only see the short alert. Enter only what is needed.',
  },
  'health.schoolIntro': {
    fr: 'Visible par la direction, le secrétariat et les parents. Chaque consultation est enregistrée dans le journal.',
    ar: 'مرئية للإدارة والأمانة والأولياء. يتم تسجيل كل اطلاع في السجل.',
    en: 'Visible to the administration and the parents. Every view is recorded in the log.',
  },
  'health.consentApp': {
    fr: 'Consentement donné par le parent dans l\'application le {date}.',
    ar: 'موافقة الولي عبر التطبيق في {date}.',
    en: 'Parent consent given in the app on {date}.',
  },
  'health.consentPaper': {
    fr: 'Consentement écrit du parent attesté par l\'école le {date}.',
    ar: 'موافقة كتابية للولي أكدتها المؤسسة في {date}.',
    en: 'Parent\'s written consent attested by the school on {date}.',
  },
  'health.contacts': {
    fr: 'Contacts d\'urgence (dans l\'ordre d\'appel)',
    ar: 'جهات الاتصال في الطوارئ (حسب ترتيب الاتصال)',
    en: 'Emergency contacts (in calling order)',
  },
  'health.contactName': {
    fr: 'Nom',
    ar: 'الاسم',
    en: 'Name',
  },
  'health.relationship': {
    fr: 'Lien (mère, oncle…)',
    ar: 'القرابة (أم، عم…)',
    en: 'Relationship (mother, uncle…)',
  },
  'health.phone': {
    fr: 'Téléphone',
    ar: 'الهاتف',
    en: 'Phone',
  },
  'health.addContact': {
    fr: 'Ajouter un contact',
    ar: 'إضافة جهة اتصال',
    en: 'Add a contact',
  },
  'health.allergies': {
    fr: 'Allergies',
    ar: 'الحساسية',
    en: 'Allergies',
  },
  'health.allergiesHint': {
    fr: 'ex. arachides, pénicilline, piqûres d\'abeille',
    ar: 'مثال: الفول السوداني، البنسلين، لسعات النحل',
    en: 'e.g. peanuts, penicillin, bee stings',
  },
  'health.conditions': {
    fr: 'Maladies ou conditions',
    ar: 'الأمراض أو الحالات',
    en: 'Conditions',
  },
  'health.conditionsHint': {
    fr: 'ex. asthme, diabète, épilepsie',
    ar: 'مثال: الربو، السكري، الصرع',
    en: 'e.g. asthma, diabetes, epilepsy',
  },
  'health.medications': {
    fr: 'Traitement / médicaments',
    ar: 'العلاج / الأدوية',
    en: 'Treatment / medication',
  },
  'health.bloodGroup': {
    fr: 'Groupe sanguin',
    ar: 'فصيلة الدم',
    en: 'Blood group',
  },
  'health.doctor': {
    fr: 'Médecin traitant',
    ar: 'الطبيب المعالج',
    en: 'Doctor',
  },
  'health.doctorPhone': {
    fr: 'Téléphone du médecin',
    ar: 'هاتف الطبيب',
    en: 'Doctor\'s phone',
  },
  'health.instructions': {
    fr: 'Que faire en cas d\'urgence',
    ar: 'ما العمل في حالة الطوارئ',
    en: 'What to do in an emergency',
  },
  'health.instructionsHint': {
    fr: 'ex. inhalateur dans le cartable ; appeler la mère d\'abord',
    ar: 'مثال: البخاخ في المحفظة؛ الاتصال بالأم أولا',
    en: 'e.g. inhaler in the schoolbag; call the mother first',
  },
  'health.teacherAlert': {
    fr: 'Alerte courte pour les enseignants',
    ar: 'تنبيه قصير للأساتذة',
    en: 'Short alert for teachers',
  },
  'health.teacherAlertHint': {
    fr: 'ex. Allergie arachides — EpiPen dans le cartable',
    ar: 'مثال: حساسية الفول السوداني — حقنة في المحفظة',
    en: 'e.g. Peanut allergy — EpiPen in schoolbag',
  },
  'health.teacherAlertNote': {
    fr: 'Seule cette ligne est visible par les enseignants de la classe. Laissez vide si rien n\'est nécessaire.',
    ar: 'هذا السطر فقط مرئي لأساتذة القسم. اتركوه فارغا إذا لم يكن ضروريا.',
    en: 'Only this line is visible to the class\'s teachers. Leave empty if nothing is needed.',
  },
  'health.consentParent': {
    fr: 'J\'accepte que l\'école conserve ces informations de santé pour protéger mon enfant. Je peux les retirer à tout moment.',
    ar: 'أوافق على احتفاظ المؤسسة بهذه المعلومات الصحية لحماية طفلي. يمكنني سحبها في أي وقت.',
    en: 'I agree that the school keeps this health information to protect my child. I can withdraw it at any time.',
  },
  'health.consentSchool': {
    fr: 'Le consentement écrit et signé du parent est conservé dans le dossier de l\'élève.',
    ar: 'الموافقة الكتابية الموقعة من الولي محفوظة في ملف التلميذ.',
    en: 'The parent\'s signed written consent is kept in the student\'s file.',
  },
  'health.consentRequired': {
    fr: 'Le consentement est requis.',
    ar: 'الموافقة مطلوبة.',
    en: 'Consent is required.',
  },
  'health.save': {
    fr: 'Enregistrer la fiche',
    ar: 'حفظ البطاقة',
    en: 'Save the sheet',
  },
  'health.saved': {
    fr: 'Fiche santé enregistrée.',
    ar: 'تم حفظ البطاقة الصحية.',
    en: 'Health sheet saved.',
  },
  'health.withdraw': {
    fr: 'Retirer mon consentement',
    ar: 'سحب موافقتي',
    en: 'Withdraw my consent',
  },
  'health.withdrawConfirm': {
    fr: 'Retirer votre consentement efface définitivement la fiche santé de votre enfant. Continuer ?',
    ar: 'سحب الموافقة يمحو البطاقة الصحية لطفلكم نهائيا. متابعة؟',
    en: 'Withdrawing consent permanently erases your child\'s health sheet. Continue?',
  },
  'health.delete': {
    fr: 'Effacer la fiche',
    ar: 'محو البطاقة',
    en: 'Erase the sheet',
  },
  'health.deleteConfirm': {
    fr: 'Effacer définitivement cette fiche santé ?',
    ar: 'محو هذه البطاقة الصحية نهائيا؟',
    en: 'Permanently erase this health sheet?',
  },
  'health.deleted': {
    fr: 'Fiche santé effacée.',
    ar: 'تم محو البطاقة الصحية.',
    en: 'Health sheet erased.',
  },
  'health.classAlerts': {
    fr: 'Alertes santé de la classe',
    ar: 'تنبيهات صحية للقسم',
    en: 'Class health alerts',
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
  'parent.nav.overview': {
    fr: 'Vue d’ensemble',
    ar: 'نظرة عامة',
    en: 'Overview',
  },
  'parent.nav.schoolwork': {
    fr: 'Travail scolaire',
    ar: 'الدراسة',
    en: 'Schoolwork',
  },
  'parent.nav.attendance': {
    fr: 'Présence et vie scolaire',
    ar: 'الحضور والحياة المدرسية',
    en: 'Attendance & school life',
  },
  'parent.nav.finance': {
    fr: 'Documents et frais',
    ar: 'الوثائق والمصاريف',
    en: 'Documents & finance',
  },
  'parent.nav.communication': {
    fr: 'Communication',
    ar: 'التواصل',
    en: 'Communication',
  },
  'parent.subtabsAria': {
    fr: 'Sous-sections de l’espace parent',
    ar: 'الأقسام الفرعية لفضاء ولي الأمر',
    en: 'Parent workspace subsections',
  },
  'parent.overview.title': {
    fr: 'L’essentiel pour {student}',
    ar: 'أهم ما يخص {student}',
    en: 'What matters for {student}',
  },
  'parent.overview.copy': {
    fr: 'Les prochaines échéances et les derniers résultats, sans parcourir toutes les rubriques.',
    ar: 'المواعيد القادمة وأحدث النتائج دون التنقل بين جميع الأقسام.',
    en: 'Upcoming deadlines and the latest results, without visiting every section.',
  },
  'parent.overview.average': {
    fr: 'Moyenne générale',
    ar: 'المعدل العام',
    en: 'Overall average',
  },
  'parent.overview.gradesDetail': {
    fr: 'Voir le détail des notes',
    ar: 'عرض تفاصيل الدرجات',
    en: 'View detailed grades',
  },
  'parent.overview.homework': {
    fr: 'Devoirs à venir',
    ar: 'الواجبات القادمة',
    en: 'Upcoming homework',
  },
  'parent.overview.nextDue': {
    fr: 'Prochaine échéance : {date}',
    ar: 'الموعد القادم: {date}',
    en: 'Next deadline: {date}',
  },
  'parent.overview.noUpcomingHomework': {
    fr: 'Aucune échéance à venir',
    ar: 'لا توجد واجبات قادمة',
    en: 'No upcoming deadlines',
  },
  'parent.overview.attendance': {
    fr: 'Absences et retards',
    ar: 'الغيابات والتأخرات',
    en: 'Absences and lateness',
  },
  'parent.overview.attendanceDetail': {
    fr: '{count} événement(s) à consulter',
    ar: '{count} من السجلات للاطلاع عليها',
    en: '{count} records to review',
  },
  'parent.overview.attendanceClear': {
    fr: 'Aucune absence ni retard enregistré',
    ar: 'لا توجد غيابات أو تأخرات مسجلة',
    en: 'No absences or lateness recorded',
  },
  'parent.overview.exams': {
    fr: 'Examens à venir',
    ar: 'الاختبارات القادمة',
    en: 'Upcoming exams',
  },
  'parent.overview.nextExam': {
    fr: 'Prochain examen : {date}',
    ar: 'الاختبار القادم: {date}',
    en: 'Next exam: {date}',
  },
  'parent.overview.noUpcomingExams': {
    fr: 'Aucun examen à venir',
    ar: 'لا توجد اختبارات قادمة',
    en: 'No upcoming exams',
  },
  'parent.overview.nextTitle': {
    fr: 'Prochains devoirs',
    ar: 'الواجبات القادمة',
    en: 'Next assignments',
  },
  'parent.overview.latestTitle': {
    fr: 'Dernières notes',
    ar: 'أحدث الدرجات',
    en: 'Latest grades',
  },
  'parent.overview.viewAll': {
    fr: 'Tout voir',
    ar: 'عرض الكل',
    en: 'View all',
  },
  'parent.overview.emptyHomework': {
    fr: 'Rien à préparer pour le moment.',
    ar: 'لا توجد واجبات للتحضير لها حالياً.',
    en: 'Nothing to prepare right now.',
  },
  'parent.overview.emptyGrades': {
    fr: 'Aucune note publiée pour le moment.',
    ar: 'لا توجد درجات منشورة حالياً.',
    en: 'No grades published yet.',
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
  'parent.tabHomework': {
    fr: 'Devoirs et examens',
    ar: 'الواجبات والاختبارات',
    en: 'Homework and exams',
  },
  'parent.tabSchedule': {
    fr: 'Planning',
    ar: 'الجدول',
    en: 'Schedule',
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
  'parent.homeworkTitle': {
    fr: 'Devoirs et examens',
    ar: 'الواجبات والاختبارات',
    en: 'Homework and exams',
  },
  'parent.homeworkCopy': {
    fr: 'Annonces pédagogiques publiées pour {className}.',
    ar: 'الإعلانات التعليمية المنشورة لقسم {className}.',
    en: 'Academic announcements published for {className}.',
  },
  'parent.homeworkCount': {
    fr: '{count} annonces',
    ar: '{count} إعلانات',
    en: '{count} announcements',
  },
  'parent.homeworkKind.homework': {
    fr: 'Devoir maison',
    ar: 'واجب منزلي',
    en: 'Homework',
  },
  'parent.homeworkKind.assignment': {
    fr: 'Devoir',
    ar: 'واجب',
    en: 'Assignment',
  },
  'parent.homeworkKind.exam': {
    fr: 'Examen',
    ar: 'اختبار',
    en: 'Exam',
  },
  'parent.homeworkDueOn': {
    fr: 'Pour le {date}',
    ar: 'ليوم {date}',
    en: 'For {date}',
  },
  'parent.homeworkPreparation': {
    fr: 'Préparation',
    ar: 'التحضير',
    en: 'Preparation',
  },
  'parent.emptyHomework': {
    fr: 'Aucun devoir ou examen publié pour le moment.',
    ar: 'لا توجد واجبات أو اختبارات منشورة حاليا.',
    en: 'No homework or exam has been published yet.',
  },
  'parent.emptyUpcomingHomework': {
    fr: 'Aucun devoir ou examen à venir. Vous êtes à jour.',
    ar: 'لا توجد واجبات أو اختبارات قادمة.',
    en: 'No upcoming homework or exams. You are up to date.',
  },
  'parent.emptyPastHomework': {
    fr: 'Aucun devoir ou examen passé.',
    ar: 'لا توجد واجبات أو اختبارات سابقة.',
    en: 'No past homework or exams.',
  },
  'parent.schoolworkFilter.label': {
    fr: 'Filtrer les travaux scolaires',
    ar: 'تصفية الأعمال المدرسية',
    en: 'Filter schoolwork',
  },
  'parent.schoolworkFilter.upcoming': {
    fr: 'À venir ({count})',
    ar: 'القادمة ({count})',
    en: 'Upcoming ({count})',
  },
  'parent.schoolworkFilter.past': {
    fr: 'Passés ({count})',
    ar: 'السابقة ({count})',
    en: 'Past ({count})',
  },
  'parent.schoolworkFilter.all': {
    fr: 'Tous ({count})',
    ar: 'الكل ({count})',
    en: 'All ({count})',
  },
  'parent.scheduleTitle': {
    fr: 'Emploi du temps hebdomadaire',
    ar: 'التوقيت الأسبوعي',
    en: 'Weekly timetable',
  },
  'parent.scheduleCopy': {
    fr: 'Cours hebdomadaires pour {className}.',
    ar: 'الحصص الأسبوعية لقسم {className}.',
    en: 'Weekly classes for {className}.',
  },
  'parent.scheduleExamsTab': {
    fr: 'Examens programmés',
    ar: 'الاختبارات المبرمجة',
    en: 'Scheduled exams',
  },
  'parent.examsCopy': {
    fr: 'Dates, horaires et consignes des examens pour {className}.',
    ar: 'تواريخ وأوقات وتعليمات اختبارات قسم {className}.',
    en: 'Exam dates, times, and instructions for {className}.',
  },
  'parent.examCount': {
    fr: '{count} examens',
    ar: '{count} اختبارات',
    en: '{count} exams',
  },
  'parent.scheduleSlotsCount': {
    fr: '{count} cours / semaine',
    ar: '{count} حصص / أسبوعياً',
    en: '{count} classes / week',
  },
  'parent.emptyScheduleWeekly': {
    fr: "Aucun cours programmé dans l'emploi du temps pour le moment.",
    ar: 'لا توجد حصص مبرمجة في التوقيت الأسبوعي حاليا.',
    en: 'No classes scheduled in the timetable yet.',
  },
  'parent.scheduleDay': {
    fr: 'Jour',
    ar: 'اليوم',
    en: 'Day',
  },
  'parent.scheduleTime': {
    fr: 'Horaire',
    ar: 'التوقيت',
    en: 'Time',
  },
  'parent.scheduleCourse': {
    fr: 'Matière',
    ar: 'المادة',
    en: 'Subject',
  },
  'parent.scheduleTeacher': {
    fr: 'Enseignant',
    ar: 'الأستاذ',
    en: 'Teacher',
  },
  'parent.scheduleRoomCol': {
    fr: 'Salle',
    ar: 'القاعة',
    en: 'Room',
  },
  'parent.scheduleCancelled': {
    fr: 'Séance annulée',
    ar: 'حصة ملغاة',
    en: 'Cancelled',
  },
  'parent.emptyScheduleExams': {
    fr: 'Aucun examen planifié pour le moment.',
    ar: 'لا يوجد اختبار مبرمج حاليا.',
    en: 'No exam is scheduled yet.',
  },
  'parent.emptyUpcomingExams': {
    fr: 'Aucun examen à venir.',
    ar: 'لا توجد اختبارات قادمة.',
    en: 'No upcoming exams.',
  },
  'parent.emptyPastExams': {
    fr: 'Aucun examen passé.',
    ar: 'لا توجد اختبارات سابقة.',
    en: 'No past exams.',
  },
  'parent.scheduleExamFor': {
    fr: 'Planning de {className}',
    ar: 'جدول {className}',
    en: '{className} schedule',
  },
  'parent.scheduleRoom': {
    fr: 'Salle',
    ar: 'القاعة',
    en: 'Room',
  },
  'parent.scheduleInstructions': {
    fr: 'Consignes',
    ar: 'تعليمات',
    en: 'Instructions',
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
  'fees.currency': {
    fr: 'DA',
    ar: 'دج',
    en: 'DZD',
  },
  'fees.tab': {
    fr: 'Frais',
    ar: 'المصاريف',
    en: 'Fees',
  },
  'fees.title': {
    fr: 'Frais scolaires',
    ar: 'المصاريف المدرسية',
    en: 'School fees',
  },
  'fees.copy': {
    fr: 'Qui doit quoi, les paiements, les reçus et les rappels aux parents.',
    ar: 'من عليه ماذا، المدفوعات، الوصولات وتذكير الأولياء.',
    en: 'Who owes what, payments, receipts and reminders to parents.',
  },
  'fees.new': {
    fr: 'Nouveaux frais',
    ar: 'مصاريف جديدة',
    en: 'New fees',
  },
  'fees.remindAll': {
    fr: 'Relancer les retards ({count})',
    ar: 'تذكير المتأخرين ({count})',
    en: 'Remind overdue ({count})',
  },
  'fees.remindAllConfirm': {
    fr: 'Envoyer un rappel aux parents de {count} élève(s) en retard ? Les frais déjà rappelés il y a moins de 3 jours sont ignorés.',
    ar: 'إرسال تذكير لأولياء {count} تلميذ متأخر؟ تُتجاهل المصاريف التي ذُكّر بها منذ أقل من 3 أيام.',
    en: 'Send a reminder to the parents of {count} overdue student(s)? Fees reminded less than 3 days ago are skipped.',
  },
  'fees.billed': {
    fr: 'Facturé',
    ar: 'المفوتر',
    en: 'Billed',
  },
  'fees.collected': {
    fr: 'Encaissé',
    ar: 'المحصّل',
    en: 'Collected',
  },
  'fees.collectionRate': {
    fr: '{rate} % recouvré',
    ar: '{rate}٪ محصّل',
    en: '{rate}% collected',
  },
  'fees.thisMonth': {
    fr: '{amount} ce mois-ci',
    ar: '{amount} هذا الشهر',
    en: '{amount} this month',
  },
  'fees.outstanding': {
    fr: 'Reste à encaisser',
    ar: 'الباقي للتحصيل',
    en: 'Outstanding',
  },
  'fees.overdue': {
    fr: 'En retard',
    ar: 'متأخر',
    en: 'Overdue',
  },
  'fees.overdueStudents': {
    fr: '{count} élève(s) concerné(s)',
    ar: '{count} تلميذ معني',
    en: '{count} student(s)',
  },
  'fees.autoReminders': {
    fr: 'Rappels automatiques',
    ar: 'تذكير تلقائي',
    en: 'Automatic reminders',
  },
  'fees.autoRemindersCopy': {
    fr: 'un message aux parents 3 jours avant l\'échéance, puis une fois par semaine en cas de retard (4 au maximum, entre 8 h et 20 h).',
    ar: 'رسالة للأولياء قبل 3 أيام من الأجل، ثم مرة في الأسبوع عند التأخر (4 كحد أقصى، بين 8 و20 سا).',
    en: 'a message to parents 3 days before the due date, then once a week when late (at most 4, between 8 am and 8 pm).',
  },
  'fees.directorOnly': {
    fr: '(réglage réservé au directeur)',
    ar: '(إعداد خاص بالمدير)',
    en: '(director only)',
  },
  'fees.search': {
    fr: 'Rechercher un élève',
    ar: 'بحث عن تلميذ',
    en: 'Search a student',
  },
  'fees.statusFilter': {
    fr: 'Statut',
    ar: 'الحالة',
    en: 'Status',
  },
  'fees.filter.all': {
    fr: 'Tous les statuts',
    ar: 'كل الحالات',
    en: 'All statuses',
  },
  'fees.filter.overdue': {
    fr: 'En retard',
    ar: 'متأخر',
    en: 'Overdue',
  },
  'fees.filter.unpaid': {
    fr: 'Non payés',
    ar: 'غير مدفوع',
    en: 'Unpaid',
  },
  'fees.filter.partial': {
    fr: 'Partiellement payés',
    ar: 'مدفوع جزئيا',
    en: 'Partly paid',
  },
  'fees.filter.paid': {
    fr: 'Payés',
    ar: 'مدفوع',
    en: 'Paid',
  },
  'fees.classFilter': {
    fr: 'Classe',
    ar: 'القسم',
    en: 'Class',
  },
  'fees.labelFilter': {
    fr: 'Frais',
    ar: 'المصاريف',
    en: 'Fee',
  },
  'fees.allFees': {
    fr: 'Tous les frais',
    ar: 'كل المصاريف',
    en: 'All fees',
  },
  'fees.empty': {
    fr: 'Aucun frais pour l\'instant. Commencez par « Nouveaux frais » : par exemple « Frais du 1er trimestre » pour toute l\'école.',
    ar: 'لا توجد مصاريف بعد. ابدأ بـ «مصاريف جديدة»: مثلا «مصاريف الفصل الأول» لكل المدرسة.',
    en: 'No fees yet. Start with “New fees”: for example “Term 1 fees” for the whole school.',
  },
  'fees.noMatch': {
    fr: 'Aucun frais ne correspond à ces filtres.',
    ar: 'لا توجد مصاريف تطابق هذه المرشحات.',
    en: 'No fees match these filters.',
  },
  'fees.student': {
    fr: 'Élève',
    ar: 'التلميذ',
    en: 'Student',
  },
  'fees.fee': {
    fr: 'Frais',
    ar: 'المصاريف',
    en: 'Fee',
  },
  'fees.totalDue': {
    fr: 'Montant',
    ar: 'المبلغ',
    en: 'Amount',
  },
  'fees.paid': {
    fr: 'Payé',
    ar: 'المدفوع',
    en: 'Paid',
  },
  'fees.left': {
    fr: 'Reste',
    ar: 'الباقي',
    en: 'Left',
  },
  'fees.dueDate': {
    fr: 'Échéance',
    ar: 'الأجل',
    en: 'Due date',
  },
  'fees.reminders': {
    fr: 'Rappels',
    ar: 'التذكيرات',
    en: 'Reminders',
  },
  'fees.noParent': {
    fr: 'aucun parent connecté',
    ar: 'لا ولي متصل',
    en: 'no parent connected',
  },
  'fees.remindedOn': {
    fr: '{count} rappel(s), dernier le {date}',
    ar: '{count} تذكير، آخرها {date}',
    en: '{count} reminder(s), last on {date}',
  },
  'fees.collect': {
    fr: 'Encaisser',
    ar: 'تحصيل',
    en: 'Collect',
  },
  'fees.remind': {
    fr: 'Envoyer un rappel aux parents',
    ar: 'إرسال تذكير للأولياء',
    en: 'Remind the parents',
  },
  'fees.receipts': {
    fr: 'Paiements et reçus',
    ar: 'المدفوعات والوصولات',
    en: 'Payments and receipts',
  },
  'fees.deleteConfirm': {
    fr: 'Supprimer « {label} » pour {name} ?',
    ar: 'حذف «{label}» لـ {name}؟',
    en: 'Delete “{label}” for {name}?',
  },
  'fees.deleted': {
    fr: 'Frais supprimés.',
    ar: 'تم حذف المصاريف.',
    en: 'Fee deleted.',
  },
  'fees.byClass': {
    fr: 'Par classe',
    ar: 'حسب القسم',
    en: 'By class',
  },
  'fees.noClass': {
    fr: 'Sans classe',
    ar: 'بدون قسم',
    en: 'No class',
  },
  'fees.status.paid': {
    fr: 'Payé',
    ar: 'مدفوع',
    en: 'Paid',
  },
  'fees.status.unpaid': {
    fr: 'Non payé',
    ar: 'غير مدفوع',
    en: 'Unpaid',
  },
  'fees.status.partial': {
    fr: 'Partiel',
    ar: 'جزئي',
    en: 'Partly paid',
  },
  'fees.overdueBy': {
    fr: 'En retard de {days} j',
    ar: 'متأخر بـ {days} يوم',
    en: '{days} days late',
  },
  'fees.remindersResult': {
    fr: 'Rappels envoyés : {sent}. Déjà rappelés récemment : {recent}. Sans parent connecté : {noParent}.',
    ar: 'تذكيرات مرسلة: {sent}. ذُكّر بها مؤخرا: {recent}. بدون ولي متصل: {noParent}.',
    en: 'Reminders sent: {sent}. Reminded recently: {recent}. No parent connected: {noParent}.',
  },
  'fees.loadError': {
    fr: 'Impossible de charger les frais.',
    ar: 'تعذر تحميل المصاريف.',
    en: 'Could not load the fees.',
  },
  'fees.label': {
    fr: 'Intitulé',
    ar: 'العنوان',
    en: 'Label',
  },
  'fees.labelHint': {
    fr: 'Ex. Frais du 1er trimestre, Cantine octobre, Transport',
    ar: 'مثلا: مصاريف الفصل الأول، المطعم، النقل',
    en: 'e.g. Term 1 fees, October canteen, Transport',
  },
  'fees.amount': {
    fr: 'Montant (DA)',
    ar: 'المبلغ (دج)',
    en: 'Amount (DZD)',
  },
  'fees.who': {
    fr: 'Pour',
    ar: 'لـ',
    en: 'For',
  },
  'fees.wholeSchool': {
    fr: 'Toute l\'école (élèves actifs)',
    ar: 'كل المدرسة (التلاميذ النشطون)',
    en: 'The whole school (active students)',
  },
  'fees.noDuplicates': {
    fr: 'Les élèves qui ont déjà des frais avec cet intitulé ne sont pas facturés une deuxième fois.',
    ar: 'التلاميذ الذين لديهم مصاريف بنفس العنوان لا يُفوترون مرة ثانية.',
    en: 'Students who already have a fee with this label are not billed twice.',
  },
  'fees.create': {
    fr: 'Créer les frais',
    ar: 'إنشاء المصاريف',
    en: 'Create the fees',
  },
  'fees.created': {
    fr: '{created} élève(s) facturé(s), {skipped} déjà facturé(s).',
    ar: 'تمت فوترة {created} تلميذ، {skipped} مفوترون مسبقا.',
    en: '{created} student(s) billed, {skipped} already billed.',
  },
  'fees.amountInvalid': {
    fr: 'Indiquez un montant supérieur à 0.',
    ar: 'أدخل مبلغا أكبر من 0.',
    en: 'Enter an amount above 0.',
  },
  'fees.collectTitle': {
    fr: 'Encaisser — {name}',
    ar: 'تحصيل — {name}',
    en: 'Collect — {name}',
  },
  'fees.leftToPay': {
    fr: 'reste à payer {amount}',
    ar: 'الباقي للدفع {amount}',
    en: '{amount} left to pay',
  },
  'fees.method': {
    fr: 'Mode de paiement',
    ar: 'طريقة الدفع',
    en: 'Payment method',
  },
  'fees.method.cash': {
    fr: 'Espèces',
    ar: 'نقدا',
    en: 'Cash',
  },
  'fees.method.bank_transfer': {
    fr: 'Virement bancaire',
    ar: 'تحويل بنكي',
    en: 'Bank transfer',
  },
  'fees.method.ccp': {
    fr: 'CCP / BaridiMob',
    ar: 'CCP / بريدي موب',
    en: 'CCP / BaridiMob',
  },
  'fees.method.cheque': {
    fr: 'Chèque',
    ar: 'صك',
    en: 'Cheque',
  },
  'fees.note': {
    fr: 'Remarque',
    ar: 'ملاحظة',
    en: 'Note',
  },
  'fees.noteHint': {
    fr: 'Ex. n° de virement, payé par l\'oncle…',
    ar: 'مثلا: رقم التحويل…',
    en: 'e.g. transfer number…',
  },
  'fees.saveAndReceipt': {
    fr: 'Enregistrer et afficher le reçu',
    ar: 'حفظ وعرض الوصل',
    en: 'Save and show the receipt',
  },
  'fees.amountTooHigh': {
    fr: 'Le montant doit être entre 1 et {left}.',
    ar: 'يجب أن يكون المبلغ بين 1 و{left}.',
    en: 'The amount must be between 1 and {left}.',
  },
  'fees.paymentsTitle': {
    fr: 'Paiements — {label} ({name})',
    ar: 'المدفوعات — {label} ({name})',
    en: 'Payments — {label} ({name})',
  },
  'fees.receipt': {
    fr: 'Reçu',
    ar: 'الوصل',
    en: 'Receipt',
  },
  'fees.cancelPayment': {
    fr: 'Annuler',
    ar: 'إلغاء',
    en: 'Cancel',
  },
  'fees.cancelReason': {
    fr: 'Annuler le paiement {number} ? Indiquez la raison (elle est gardée dans le journal) :',
    ar: 'إلغاء الدفعة {number}؟ اذكر السبب (يُحفظ في السجل):',
    en: 'Cancel payment {number}? Give the reason (kept in the activity log):',
  },
  'fees.paymentCancelled': {
    fr: 'Paiement annulé, le reste à payer est mis à jour.',
    ar: 'أُلغيت الدفعة وحُدّث الباقي.',
    en: 'Payment cancelled; the balance is updated.',
  },
  'fees.receiptTitle': {
    fr: 'Reçu de paiement — frais scolaires',
    ar: 'وصل دفع — مصاريف مدرسية',
    en: 'Payment receipt — school fees',
  },
  'fees.receiptNumber': {
    fr: 'Reçu n°',
    ar: 'رقم الوصل',
    en: 'Receipt no.',
  },
  'fees.date': {
    fr: 'Date',
    ar: 'التاريخ',
    en: 'Date',
  },
  'fees.amountReceived': {
    fr: 'Montant reçu',
    ar: 'المبلغ المستلم',
    en: 'Amount received',
  },
  'fees.leftAfter': {
    fr: 'Reste à payer après ce paiement',
    ar: 'الباقي بعد هذه الدفعة',
    en: 'Left to pay after this payment',
  },
  'fees.settled': {
    fr: 'Soldé',
    ar: 'مسدد بالكامل',
    en: 'Fully paid',
  },
  'fees.receiptFooter': {
    fr: 'Reçu généré par WaselEdu. Conservez-le comme justificatif.',
    ar: 'وصل صادر عن WaselEdu. احتفظ به كإثبات.',
    en: 'Receipt generated by WaselEdu. Keep it as proof of payment.',
  },
  'fees.printReceipt': {
    fr: 'Imprimer / PDF',
    ar: 'طباعة / PDF',
    en: 'Print / PDF',
  },
  'fees.parentLeft': {
    fr: 'Reste à payer pour cet enfant : {amount}',
    ar: 'الباقي للدفع لهذا الطفل: {amount}',
    en: 'Left to pay for this child: {amount}',
  },
  'fees.parentNothingDue': {
    fr: 'Rien à payer pour cet enfant. Merci !',
    ar: 'لا شيء للدفع لهذا الطفل. شكرا!',
    en: 'Nothing to pay for this child. Thank you!',
  },
  'fees.parentEmpty': {
    fr: 'L\'école n\'a pas encore enregistré de frais.',
    ar: 'لم تسجل المدرسة أي مصاريف بعد.',
    en: 'The school has not recorded any fees yet.',
  },
  'fees.parentHow': {
    fr: 'Les paiements se font auprès du secrétariat de l\'école ; chaque paiement enregistré apparaît ici avec son reçu.',
    ar: 'يتم الدفع لدى أمانة المدرسة؛ كل دفعة مسجلة تظهر هنا مع وصلها.',
    en: 'Payments are made at the school office; every recorded payment appears here with its receipt.',
  },
  'infirmary.title': {
    fr: 'Infirmerie',
    ar: 'التمريض',
    en: 'Infirmary',
  },
  'infirmary.copy': {
    fr: '{count} élève(s) sur {total} ont une fiche santé. Votre compte n\'a accès qu\'aux fiches santé.',
    ar: '{count} من {total} تلميذ لهم بطاقة صحية. حسابك يطلع فقط على البطاقات الصحية.',
    en: '{count} of {total} students have a health sheet. Your account only reaches health sheets.',
  },
  'infirmary.onlyAlerts': {
    fr: 'Seulement les élèves avec une alerte',
    ar: 'فقط التلاميذ الذين لديهم تنبيه',
    en: 'Only students with an alert',
  },
  'infirmary.alert': {
    fr: 'Alerte',
    ar: 'تنبيه',
    en: 'Alert',
  },
  'infirmary.recordNoAlert': {
    fr: 'Fiche sans alerte',
    ar: 'بطاقة بدون تنبيه',
    en: 'Sheet, no alert',
  },
  'infirmary.noRecord': {
    fr: 'Pas de fiche',
    ar: 'لا توجد بطاقة',
    en: 'No sheet',
  },
  'infirmary.open': {
    fr: 'Ouvrir la fiche',
    ar: 'فتح البطاقة',
    en: 'Open sheet',
  },
  'infirmary.create': {
    fr: 'Créer la fiche',
    ar: 'إنشاء البطاقة',
    en: 'Create sheet',
  },
  'infirmary.audit': {
    fr: 'Chaque fiche ouverte est enregistrée dans le journal d\'activité de l\'école. Une nouvelle fiche ne se crée qu\'avec le consentement écrit du parent (formulaire papier signé).',
    ar: 'كل بطاقة تُفتح تُسجَّل في سجل نشاط المدرسة. لا تُنشأ بطاقة جديدة إلا بموافقة الولي الكتابية (استمارة ورقية موقعة).',
    en: 'Every sheet opened is recorded in the school\'s activity log. A new sheet needs the parent\'s written consent (signed paper form).',
  },
  'parent.nav.services': {
    fr: 'Services',
    ar: 'الخدمات',
    en: 'Services',
  },
};
