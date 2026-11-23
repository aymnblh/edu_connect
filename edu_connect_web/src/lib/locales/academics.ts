import type { TranslationMap } from './types';

export const academicsTranslations: TranslationMap = {
  'teacher.confirmDelete': {
    fr: 'Supprimer définitivement cet élément ?',
    ar: 'حذف هذا العنصر نهائيا؟',
    en: 'Delete this entry permanently?',
  },
  'teacher.entryDeleted': {
    fr: 'Élément supprimé.',
    ar: 'تم الحذف.',
    en: 'Entry deleted.',
  },
  'teacher.gradeScoreOutOf': {
    fr: 'Note sur {max}',
    ar: 'النقطة من {max}',
    en: 'Score out of {max}',
  },
  'teacher.homeworkContentLabel': {
    fr: 'Contenu du devoir',
    ar: 'محتوى الواجب',
    en: 'Homework content',
  },
  'teacher.homeworkDueLabel': {
    fr: 'Date limite',
    ar: 'آخر أجل',
    en: 'Due date',
  },
  'announcements.tab': {
    fr: 'Annonces',
    ar: 'الإعلانات',
    en: 'Announcements',
  },
  'announcements.newTitle': {
    fr: 'Nouvelle annonce',
    ar: 'إعلان جديد',
    en: 'New announcement',
  },
  'announcements.title': {
    fr: 'Titre',
    ar: 'العنوان',
    en: 'Title',
  },
  'announcements.body': {
    fr: 'Message',
    ar: 'الرسالة',
    en: 'Message',
  },
  'announcements.category': {
    fr: 'Type',
    ar: 'النوع',
    en: 'Type',
  },
  'announcements.category.announcement': {
    fr: 'Annonce',
    ar: 'إعلان',
    en: 'Announcement',
  },
  'announcements.category.holiday': {
    fr: 'Vacances',
    ar: 'عطلة',
    en: 'Holiday',
  },
  'announcements.category.exam_period': {
    fr: 'Examens',
    ar: 'امتحانات',
    en: 'Exams',
  },
  'announcements.category.meeting': {
    fr: 'Réunion',
    ar: 'اجتماع',
    en: 'Meeting',
  },
  'announcements.category.event': {
    fr: 'Événement',
    ar: 'حدث',
    en: 'Event',
  },
  'announcements.startsOn': {
    fr: 'Date',
    ar: 'التاريخ',
    en: 'Date',
  },
  'announcements.startsOnOptional': {
    fr: 'Date (optionnelle)',
    ar: 'التاريخ (اختياري)',
    en: 'Date (optional)',
  },
  'announcements.endsOn': {
    fr: 'Jusqu\'au (optionnel)',
    ar: 'إلى غاية (اختياري)',
    en: 'Until (optional)',
  },
  'announcements.audience': {
    fr: 'Destinataires',
    ar: 'المستلمون',
    en: 'Recipients',
  },
  'announcements.wholeSchool': {
    fr: 'Toute l\'école',
    ar: 'كل المؤسسة',
    en: 'Whole school',
  },
  'announcements.otherClass': {
    fr: 'Classe',
    ar: 'قسم',
    en: 'Class',
  },
  'announcements.noClasses': {
    fr: 'Aucune classe disponible.',
    ar: 'لا يوجد قسم متاح.',
    en: 'No class available.',
  },
  'announcements.publish': {
    fr: 'Publier et notifier',
    ar: 'نشر وإشعار',
    en: 'Publish and notify',
  },
  'announcements.publishFailed': {
    fr: 'Impossible de publier l\'annonce.',
    ar: 'تعذر نشر الإعلان.',
    en: 'Could not publish the announcement.',
  },
  'announcements.dateRequired': {
    fr: 'Choisissez une date pour un événement du calendrier.',
    ar: 'اختر تاريخا لحدث التقويم.',
    en: 'Choose a date for a calendar event.',
  },
  'announcements.audienceRequired': {
    fr: 'Choisissez au moins une classe ou toute l\'école.',
    ar: 'اختر قسما واحدا على الأقل أو كل المؤسسة.',
    en: 'Choose at least one class or the whole school.',
  },
  'announcements.calendarTitle': {
    fr: 'À venir',
    ar: 'القادم',
    en: 'Coming up',
  },
  'announcements.calendarEmpty': {
    fr: 'Aucun événement à venir.',
    ar: 'لا توجد أحداث قادمة.',
    en: 'No upcoming events.',
  },
  'announcements.listTitle': {
    fr: 'Annonces',
    ar: 'الإعلانات',
    en: 'Announcements',
  },
  'announcements.empty': {
    fr: 'Aucune annonce pour le moment.',
    ar: 'لا توجد إعلانات حاليا.',
    en: 'No announcements yet.',
  },
  'announcements.new': {
    fr: 'Nouveau',
    ar: 'جديد',
    en: 'New',
  },
  'announcements.by': {
    fr: 'Par {name}',
    ar: 'بواسطة {name}',
    en: 'By {name}',
  },
  'announcements.readBy': {
    fr: 'Lu par {read}/{total}',
    ar: 'قرأه {read}/{total}',
    en: 'Read by {read}/{total}',
  },
  'announcements.dateRange': {
    fr: 'Du {start} au {end}',
    ar: 'من {start} إلى {end}',
    en: 'From {start} to {end}',
  },
  'announcements.deleteConfirm': {
    fr: 'Supprimer cette annonce pour tous les destinataires ?',
    ar: 'حذف هذا الإعلان لجميع المستلمين؟',
    en: 'Delete this announcement for all recipients?',
  },
  'reportCards.tab': {
    fr: 'Bulletins',
    ar: 'كشوف النقاط',
    en: 'Report cards',
  },
  'reportCards.adminTitle': {
    fr: 'Bulletins trimestriels',
    ar: 'كشوف النقاط الفصلية',
    en: 'Term report cards',
  },
  'reportCards.adminCopy': {
    fr: 'Vérifiez les moyennes et les rangs, puis publiez : les parents sont notifiés. Seules les notes validées du trimestre comptent.',
    ar: 'راجعوا المعدلات والرتب ثم انشروا: يتم إشعار الأولياء. تحتسب النقاط المصادق عليها خلال الفصل فقط.',
    en: 'Check averages and ranks, then publish: parents are notified. Only approved grades of the term count.',
  },
  'reportCards.class': {
    fr: 'Classe',
    ar: 'القسم',
    en: 'Class',
  },
  'reportCards.term': {
    fr: 'Trimestre',
    ar: 'الفصل',
    en: 'Term',
  },
  'reportCards.statusDraft': {
    fr: 'Non publié',
    ar: 'غير منشور',
    en: 'Not published',
  },
  'reportCards.statusPublished': {
    fr: 'Publié le {date}',
    ar: 'نشر في {date}',
    en: 'Published on {date}',
  },
  'reportCards.publish': {
    fr: 'Publier les bulletins',
    ar: 'نشر الكشوف',
    en: 'Publish report cards',
  },
  'reportCards.republish': {
    fr: 'Republier (mise à jour)',
    ar: 'إعادة النشر (تحديث)',
    en: 'Re-publish (update)',
  },
  'reportCards.unpublish': {
    fr: 'Retirer la publication',
    ar: 'سحب النشر',
    en: 'Unpublish',
  },
  'reportCards.publishConfirm': {
    fr: 'Publier {count} bulletins et notifier les parents ?',
    ar: 'نشر {count} كشفا وإشعار الأولياء؟',
    en: 'Publish {count} report cards and notify parents?',
  },
  'reportCards.republishConfirm': {
    fr: 'Remplacer les bulletins publiés par la version actuelle ({count}) et prévenir les parents ?',
    ar: 'استبدال الكشوف المنشورة بالنسخة الحالية ({count}) وإشعار الأولياء؟',
    en: 'Replace the published report cards with the current version ({count}) and notify parents?',
  },
  'reportCards.unpublishConfirm': {
    fr: 'Retirer ces bulletins ? Les parents ne pourront plus les consulter.',
    ar: 'سحب هذه الكشوف؟ لن يتمكن الأولياء من الاطلاع عليها.',
    en: 'Unpublish these report cards? Parents will no longer see them.',
  },
  'reportCards.publishedNotice': {
    fr: '{count} bulletins publiés, {parents} notifications envoyées.',
    ar: 'تم نشر {count} كشفا وإرسال {parents} إشعارا.',
    en: '{count} report cards published, {parents} notifications sent.',
  },
  'reportCards.unpublishedNotice': {
    fr: 'Publication retirée.',
    ar: 'تم سحب النشر.',
    en: 'Report cards unpublished.',
  },
  'reportCards.noStudents': {
    fr: 'Aucun élève dans cette classe.',
    ar: 'لا يوجد تلاميذ في هذا القسم.',
    en: 'No students in this class.',
  },
  'reportCards.student': {
    fr: 'Élève',
    ar: 'التلميذ',
    en: 'Student',
  },
  'reportCards.absencesShort': {
    fr: 'Absences',
    ar: 'الغيابات',
    en: 'Absences',
  },
  'reportCards.draft': {
    fr: 'Aperçu (non publié)',
    ar: 'معاينة (غير منشورة)',
    en: 'Preview (not published)',
  },
  'reportCards.print': {
    fr: 'Imprimer / PDF',
    ar: 'طباعة / PDF',
    en: 'Print / PDF',
  },
  'reportCards.sheetTitle': {
    fr: 'Bulletin de notes — {term}',
    ar: 'كشف النقاط — {term}',
    en: 'Report card — {term}',
  },
  'reportCards.period': {
    fr: 'Période du {start} au {end}',
    ar: 'الفترة من {start} إلى {end}',
    en: 'Period {start} to {end}',
  },
  'reportCards.studentNumber': {
    fr: 'Matricule : {number}',
    ar: 'رقم التسجيل: {number}',
    en: 'Student no. {number}',
  },
  'reportCards.className': {
    fr: 'Classe : {name}',
    ar: 'القسم: {name}',
    en: 'Class: {name}',
  },
  'reportCards.subject': {
    fr: 'Matière',
    ar: 'المادة',
    en: 'Subject',
  },
  'reportCards.coefficient': {
    fr: 'Coef.',
    ar: 'المعامل',
    en: 'Coef.',
  },
  'reportCards.average': {
    fr: 'Moyenne',
    ar: 'المعدل',
    en: 'Average',
  },
  'reportCards.classAverage': {
    fr: 'Moy. classe',
    ar: 'معدل القسم',
    en: 'Class avg.',
  },
  'reportCards.overall': {
    fr: 'Moyenne générale',
    ar: 'المعدل العام',
    en: 'Overall average',
  },
  'reportCards.rank': {
    fr: 'Rang',
    ar: 'الرتبة',
    en: 'Rank',
  },
  'reportCards.rankOf': {
    fr: '{rank} / {size}',
    ar: '{rank} / {size}',
    en: '{rank} / {size}',
  },
  'reportCards.classOverall': {
    fr: 'Moyenne de la classe',
    ar: 'معدل القسم العام',
    en: 'Class average',
  },
  'reportCards.attendance': {
    fr: 'Assiduité',
    ar: 'المواظبة',
    en: 'Attendance',
  },
  'reportCards.attendanceCounts': {
    fr: '{absences} absence(s) dont {justified} justifiée(s), {lates} retard(s)',
    ar: '{absences} غياب منها {justified} مبرر، {lates} تأخر',
    en: '{absences} absence(s), {justified} justified, {lates} late',
  },
  'reportCards.publishedOn': {
    fr: 'Publié le {date}',
    ar: 'نشر في {date}',
    en: 'Published on {date}',
  },
  'reportCards.parentEmpty': {
    fr: 'Aucun bulletin publié pour le moment.',
    ar: 'لا يوجد كشف نقاط منشور حاليا.',
    en: 'No report card published yet.',
  },
  'meetings.tab': {
    fr: 'Rendez-vous',
    ar: 'المواعيد',
    en: 'Meetings',
  },
  'meetings.openTitle': {
    fr: 'Proposer des rendez-vous',
    ar: 'اقتراح مواعيد',
    en: 'Offer meetings',
  },
  'meetings.openCopy': {
    fr: 'La plage est découpée en créneaux que les parents de vos élèves peuvent réserver.',
    ar: 'تقسم الفترة إلى مواعيد يمكن لأولياء تلاميذك حجزها.',
    en: 'The time range is split into slots your students\' parents can book.',
  },
  'meetings.date': {
    fr: 'Jour',
    ar: 'اليوم',
    en: 'Day',
  },
  'meetings.from': {
    fr: 'De',
    ar: 'من',
    en: 'From',
  },
  'meetings.to': {
    fr: 'À',
    ar: 'إلى',
    en: 'To',
  },
  'meetings.duration': {
    fr: 'Durée d\'un rendez-vous',
    ar: 'مدة الموعد',
    en: 'Meeting length',
  },
  'meetings.minutes': {
    fr: '{count} min',
    ar: '{count} د',
    en: '{count} min',
  },
  'meetings.location': {
    fr: 'Lieu (optionnel)',
    ar: 'المكان (اختياري)',
    en: 'Place (optional)',
  },
  'meetings.forClass': {
    fr: 'Parents concernés',
    ar: 'الأولياء المعنيون',
    en: 'Which parents',
  },
  'meetings.allMyClasses': {
    fr: 'Toutes mes classes',
    ar: 'كل أقسامي',
    en: 'All my classes',
  },
  'meetings.open': {
    fr: 'Ouvrir les créneaux',
    ar: 'فتح المواعيد',
    en: 'Open slots',
  },
  'meetings.created': {
    fr: '{count} créneaux ouverts.',
    ar: 'تم فتح {count} موعدا.',
    en: '{count} slots opened.',
  },
  'meetings.mySlots': {
    fr: 'Mes créneaux',
    ar: 'مواعيدي',
    en: 'My slots',
  },
  'meetings.noSlots': {
    fr: 'Aucun créneau à venir.',
    ar: 'لا توجد مواعيد قادمة.',
    en: 'No upcoming slots.',
  },
  'meetings.free': {
    fr: 'Libre',
    ar: 'متاح',
    en: 'Free',
  },
  'meetings.bookedBy': {
    fr: 'Réservé par {parent} ({student})',
    ar: 'محجوز من طرف {parent} ({student})',
    en: 'Booked by {parent} ({student})',
  },
  'meetings.freeSlot': {
    fr: 'Libérer',
    ar: 'تحرير',
    en: 'Free up',
  },
  'meetings.freeConfirm': {
    fr: 'Annuler cette réservation ? Le parent sera prévenu et le créneau redeviendra libre.',
    ar: 'إلغاء هذا الحجز؟ سيتم إعلام الولي وسيصبح الموعد متاحا.',
    en: 'Cancel this booking? The parent is told and the slot becomes free again.',
  },
  'meetings.deleteConfirm': {
    fr: 'Supprimer ce créneau ? Si un parent l\'a réservé, il sera prévenu.',
    ar: 'حذف هذا الموعد؟ إذا كان محجوزا سيتم إعلام الولي.',
    en: 'Delete this slot? If a parent booked it, they are told.',
  },
  'meetings.myMeetings': {
    fr: 'Mes rendez-vous',
    ar: 'مواعيدي',
    en: 'My meetings',
  },
  'meetings.noBooking': {
    fr: 'Aucun rendez-vous réservé pour cet enfant.',
    ar: 'لا يوجد موعد محجوز لهذا الطفل.',
    en: 'No meeting booked for this child.',
  },
  'meetings.cancel': {
    fr: 'Annuler',
    ar: 'إلغاء',
    en: 'Cancel',
  },
  'meetings.cancelConfirm': {
    fr: 'Annuler ce rendez-vous ? L\'enseignant sera prévenu.',
    ar: 'إلغاء هذا الموعد؟ سيتم إعلام الأستاذ.',
    en: 'Cancel this meeting? The teacher is told.',
  },
  'meetings.available': {
    fr: 'Créneaux disponibles',
    ar: 'المواعيد المتاحة',
    en: 'Available slots',
  },
  'meetings.noneAvailable': {
    fr: 'Aucun créneau proposé par les enseignants pour le moment.',
    ar: 'لم يقترح الأساتذة أي موعد حاليا.',
    en: 'No slots offered by teachers yet.',
  },
  'meetings.notePlaceholder': {
    fr: 'Sujet (optionnel)',
    ar: 'الموضوع (اختياري)',
    en: 'Topic (optional)',
  },
  'meetings.book': {
    fr: 'Réserver ce créneau',
    ar: 'حجز هذا الموعد',
    en: 'Book this slot',
  },
  'meetings.bookedNotice': {
    fr: 'Rendez-vous réservé. L\'enseignant a été prévenu.',
    ar: 'تم حجز الموعد وإعلام الأستاذ.',
    en: 'Meeting booked. The teacher has been told.',
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
  'messages.contactsTitle': {
    fr: 'Destinataires autorisés',
    ar: 'المستلمون المسموحون',
    en: 'Authorized recipients',
  },
  'messages.filterByClass': {
    fr: 'Filtrer par classe',
    ar: 'تصفية حسب القسم',
    en: 'Filter by class',
  },
  'messages.allClasses': {
    fr: 'Toutes les classes',
    ar: 'جميع الأقسام',
    en: 'All classes',
  },
  'messages.administrationGroup': {
    fr: 'Administration',
    ar: 'الإدارة',
    en: 'Administration',
  },
  'messages.emptyFilteredContacts': {
    fr: 'Aucun destinataire dans cette classe.',
    ar: 'لا يوجد مستلمون في هذا القسم.',
    en: 'No recipients in this class.',
  },
  'messages.emptyContacts': {
    fr: 'Aucun destinataire autorisé pour ce compte.',
    ar: 'لا يوجد مستلمون مسموحون لهذا الحساب.',
    en: 'No authorized recipients for this account.',
  },
  'messages.emptyConversation': {
    fr: 'Aucun message avec ce destinataire.',
    ar: 'لا توجد رسائل مع هذا المستلم.',
    en: 'No messages with this recipient.',
  },
  'messages.chooseRecipient': {
    fr: 'Choisissez un destinataire',
    ar: 'اختاروا مستلما',
    en: 'Choose a recipient',
  },
  'messages.recipientBadge': {
    fr: 'Destinataire validé',
    ar: 'مستلم موثق',
    en: 'Recipient verified',
  },
  'messages.placeholder': {
    fr: 'Écrire au destinataire choisi...',
    ar: 'اكتبوا للمستلم المختار...',
    en: 'Write to the selected recipient...',
  },
  'messages.recipientRequired': {
    fr: 'Choisissez au moins un destinataire.',
    ar: 'اختاروا مستلما واحدا على الأقل.',
    en: 'Choose at least one recipient.',
  },
  'messages.policy': {
    fr: 'Chaque conversation est visible uniquement par les destinataires explicitement autorisés.',
    ar: 'كل محادثة تظهر فقط للمستلمين المسموحين صراحة.',
    en: 'Each conversation is visible only to explicitly authorized recipients.',
  },
  'messages.contactAria': {
    fr: 'Contacter {name} - {role}',
    ar: 'مراسلة {name} - {role}',
    en: 'Contact {name} - {role}',
  },
  'messages.messagesAria': {
    fr: 'Messages de la conversation',
    ar: 'رسائل المحادثة',
    en: 'Conversation messages',
  },
  'messages.writeMessage': {
    fr: 'Écrire un message',
    ar: 'كتابة رسالة',
    en: 'Write a message',
  },
  'messages.sendMessage': {
    fr: 'Envoyer le message',
    ar: 'إرسال الرسالة',
    en: 'Send message',
  },
  'messages.senderYou': {
    fr: 'Vous',
    ar: 'أنت',
    en: 'You',
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
  'teacher.actions.title': {
    fr: 'Votre journée de classe',
    ar: 'يومكم الدراسي',
    en: 'Your teaching day',
  },
  'teacher.actions.copy': {
    fr: 'Les tâches utiles pour {className}, réunies avant les formulaires.',
    ar: 'المهام المهمة لقسم {className} قبل الانتقال إلى الاستمارات.',
    en: 'Useful tasks for {className}, gathered before the forms.',
  },
  'teacher.actions.sessions': {
    fr: 'Séances aujourd’hui',
    ar: 'حصص اليوم',
    en: 'Sessions today',
  },
  'teacher.actions.noSessions': {
    fr: 'Aucune séance prévue aujourd’hui',
    ar: 'لا توجد حصص مبرمجة اليوم',
    en: 'No sessions scheduled today',
  },
  'teacher.actions.nextSession': {
    fr: 'Prochaine : {subject} à {time}',
    ar: 'التالية: {subject} على {time}',
    en: 'Next: {subject} at {time}',
  },
  'teacher.actions.attendance': {
    fr: 'Appel à préparer',
    ar: 'تسجيل الحضور',
    en: 'Attendance to prepare',
  },
  'teacher.actions.attendanceDetail': {
    fr: '{count} élèves dans {className}',
    ar: '{count} تلاميذ في قسم {className}',
    en: '{count} students in {className}',
  },
  'teacher.actions.grades': {
    fr: 'Notes en attente',
    ar: 'درجات في الانتظار',
    en: 'Pending grades',
  },
  'teacher.actions.gradesDetail': {
    fr: 'Saisie et suivi pour {className}',
    ar: 'إدخال ومتابعة درجات قسم {className}',
    en: 'Entry and follow-up for {className}',
  },
  'teacher.actions.homework': {
    fr: 'Travail à venir',
    ar: 'العمل القادم',
    en: 'Upcoming schoolwork',
  },
  'teacher.actions.homeworkDetail': {
    fr: 'Échéances publiées pour {className}',
    ar: 'آجال منشورة لقسم {className}',
    en: 'Published deadlines for {className}',
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
  'teacher.tabHomework': {
    fr: 'Devoirs et examens',
    ar: 'الواجبات والاختبارات',
    en: 'Homework and exams',
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
  'teacher.attendanceSaving': {
    fr: "Enregistrement de l'appel...",
    ar: 'جار حفظ الحضور...',
    en: 'Saving attendance...',
  },
  'teacher.markAllPresent': {
    fr: 'Tous présents',
    ar: 'الكل حاضر',
    en: 'Mark all present',
  },
  'teacher.attendanceProgress': {
    fr: '{marked} sur {total} marqués',
    ar: 'تم تسجيل {marked} من {total}',
    en: '{marked} of {total} marked',
  },
  'teacher.attendanceRemaining': {
    fr: '{count} restant(s)',
    ar: 'المتبقي {count}',
    en: '{count} remaining',
  },
  'teacher.attendanceProgressAria': {
    fr: "Progression de l'appel",
    ar: 'تقدم تسجيل الحضور',
    en: 'Attendance completion',
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
  'teacher.gradeSaving': {
    fr: 'Ajout de la note...',
    ar: 'جار إضافة الدرجة...',
    en: 'Adding grade...',
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
  'teacher.homeworkTitle': {
    fr: 'Annonces de devoirs et examens',
    ar: 'إعلانات الواجبات والاختبارات',
    en: 'Homework and exam announcements',
  },
  'teacher.homeworkCopy': {
    fr: '{className} - Publiez les devoirs à préparer, les dates de remise et les examens.',
    ar: '{className} - انشروا الواجبات للتحضير ومواعيد التسليم والاختبارات.',
    en: '{className} - Publish preparation work, due dates, and exams.',
  },
  'teacher.homeworkUpcomingCount': {
    fr: '{count} à venir',
    ar: '{count} قادمة',
    en: '{count} upcoming',
  },
  'teacher.homeworkKind': {
    fr: "Type d'annonce",
    ar: 'نوع الإعلان',
    en: 'Announcement type',
  },
  'teacher.homeworkKind.homework': {
    fr: 'Devoir maison',
    ar: 'واجب منزلي',
    en: 'Homework',
  },
  'teacher.homeworkKind.assignment': {
    fr: 'Devoir',
    ar: 'واجب',
    en: 'Assignment',
  },
  'teacher.homeworkKind.exam': {
    fr: 'Examen',
    ar: 'اختبار',
    en: 'Exam',
  },
  'teacher.homeworkDueDate': {
    fr: 'Date de remise / examen',
    ar: 'تاريخ التسليم / الاختبار',
    en: 'Due / exam date',
  },
  'teacher.homeworkCourse': {
    fr: 'Module',
    ar: 'المادة',
    en: 'Course',
  },
  'teacher.homeworkManualSubject': {
    fr: 'Saisie manuelle du module',
    ar: 'إدخال المادة يدويا',
    en: 'Manual course entry',
  },
  'teacher.homeworkSubject': {
    fr: 'Nom du module',
    ar: 'اسم المادة',
    en: 'Course name',
  },
  'teacher.homeworkPreparation': {
    fr: 'Préparation',
    ar: 'التحضير',
    en: 'Preparation',
  },
  'teacher.homeworkPreparationPlaceholder': {
    fr: 'Ex. relire la leçon, préparer les exercices, réviser le chapitre...',
    ar: 'مثال: مراجعة الدرس، تحضير التمارين، مراجعة الفصل...',
    en: 'Example: review the lesson, prepare exercises, revise the chapter...',
  },
  'teacher.homeworkContent': {
    fr: 'Consignes à envoyer aux parents',
    ar: 'التعليمات المرسلة للأولياء',
    en: 'Instructions to send to parents',
  },
  'teacher.homeworkContentPlaceholder': {
    fr: 'Décrivez le devoir, les exercices, les pages, ou le programme de révision.',
    ar: 'اكتبوا الواجب أو التمارين أو الصفحات أو برنامج المراجعة.',
    en: 'Describe the task, exercises, pages, or revision plan.',
  },
  'teacher.homeworkPublish': {
    fr: "Publier l'annonce",
    ar: 'نشر الإعلان',
    en: 'Publish announcement',
  },
  'teacher.homeworkPublishing': {
    fr: "Publication de l'annonce...",
    ar: 'جار نشر الإعلان...',
    en: 'Publishing announcement...',
  },
  'teacher.homeworkNotificationHint': {
    fr: 'Les parents liés aux élèves de cette classe recevront une notification.',
    ar: 'سيتلقى أولياء التلاميذ المرتبطون بهذا القسم إشعارا.',
    en: 'Parents linked to this class will receive a notification.',
  },
  'teacher.latestHomework': {
    fr: 'Annonces publiées',
    ar: 'الإعلانات المنشورة',
    en: 'Published announcements',
  },
  'teacher.emptyHomework': {
    fr: 'Aucun devoir ou examen publié pour cette classe.',
    ar: 'لا توجد واجبات أو اختبارات منشورة لهذا القسم.',
    en: 'No homework or exam has been published for this class.',
  },
  'teacher.homeworkDueOn': {
    fr: 'Pour le {date}',
    ar: 'ليوم {date}',
    en: 'For {date}',
  },
  'teacher.homeworkToastSaved': {
    fr: 'Annonce publiée et envoyée aux parents.',
    ar: 'تم نشر الإعلان وإرساله إلى الأولياء.',
    en: 'Announcement published and sent to parents.',
  },
  'teacher.homeworkSubjectRequired': {
    fr: 'Indiquez le module concerné.',
    ar: 'أدخلوا المادة المعنية.',
    en: 'Enter the related course.',
  },
  'teacher.homeworkContentRequired': {
    fr: 'Ajoutez les consignes du devoir ou de l’examen.',
    ar: 'أضيفوا تعليمات الواجب أو الاختبار.',
    en: 'Add the homework or exam instructions.',
  },
  'teacher.homeworkDueDateRequired': {
    fr: 'Indiquez la date de remise ou d’examen.',
    ar: 'أدخلوا تاريخ التسليم أو الاختبار.',
    en: 'Enter the due or exam date.',
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
  'teacher.examPlannerTitle': {
    fr: 'Planifier un examen',
    ar: 'برمجة اختبار',
    en: 'Schedule an exam',
  },
  'teacher.examPlannerCopy': {
    fr: '{className} - Ajoutez la matière, la date et le créneau horaire.',
    ar: '{className} - أضيفوا المادة والتاريخ والفترة الزمنية.',
    en: '{className} - Add the course, date, and time range.',
  },
  'teacher.examUpcomingCount': {
    fr: '{count} examens à venir',
    ar: '{count} اختبارات قادمة',
    en: '{count} upcoming exams',
  },
  'teacher.examClass': {
    fr: 'Classe',
    ar: 'القسم',
    en: 'Class',
  },
  'teacher.examCourse': {
    fr: 'Module',
    ar: 'المادة',
    en: 'Course',
  },
  'teacher.examManualSubject': {
    fr: 'Saisie manuelle du module',
    ar: 'إدخال المادة يدويا',
    en: 'Manual course entry',
  },
  'teacher.examSubject': {
    fr: 'Nom du module',
    ar: 'اسم المادة',
    en: 'Course name',
  },
  'teacher.examDate': {
    fr: "Date de l'examen",
    ar: 'تاريخ الاختبار',
    en: 'Exam date',
  },
  'teacher.examStartTime': {
    fr: 'Heure de début',
    ar: 'وقت البداية',
    en: 'Start time',
  },
  'teacher.examEndTime': {
    fr: 'Heure de fin',
    ar: 'وقت النهاية',
    en: 'End time',
  },
  'teacher.examRoom': {
    fr: 'Salle',
    ar: 'القاعة',
    en: 'Room',
  },
  'teacher.examRoomPlaceholder': {
    fr: 'Ex. Salle 204',
    ar: 'مثال: القاعة 204',
    en: 'e.g. Room 204',
  },
  'teacher.examDescription': {
    fr: 'Consignes',
    ar: 'تعليمات',
    en: 'Instructions',
  },
  'teacher.examDescriptionPlaceholder': {
    fr: 'Ex. calculatrice autorisée, réviser les chapitres 1 et 2...',
    ar: 'مثال: يسمح بالآلة الحاسبة، مراجعة الفصلين 1 و2...',
    en: 'Example: calculator allowed, revise chapters 1 and 2...',
  },
  'teacher.examPublish': {
    fr: "Ajouter l'examen au planning",
    ar: 'إضافة الاختبار إلى الجدول',
    en: 'Add exam to schedule',
  },
  'teacher.examPublishing': {
    fr: "Ajout de l'examen au planning...",
    ar: 'جار إضافة الاختبار إلى الجدول...',
    en: 'Adding exam to schedule...',
  },
  'teacher.examNotificationHint': {
    fr: 'Les parents liés à cette classe recevront une notification.',
    ar: 'سيتلقى أولياء هذا القسم إشعارا.',
    en: 'Parents linked to this class will receive a notification.',
  },
  'teacher.examPlannedTitle': {
    fr: 'Examens planifiés',
    ar: 'الاختبارات المبرمجة',
    en: 'Scheduled exams',
  },
  'teacher.emptyExams': {
    fr: 'Aucun examen planifié pour cette classe.',
    ar: 'لا يوجد اختبار مبرمج لهذا القسم.',
    en: 'No exam is scheduled for this class.',
  },
  'teacher.examScheduledFor': {
    fr: 'Planning de {className}',
    ar: 'جدول {className}',
    en: '{className} schedule',
  },
  'teacher.examToastSaved': {
    fr: 'Examen ajouté au planning et envoyé aux parents.',
    ar: 'تمت إضافة الاختبار إلى الجدول وإرساله إلى الأولياء.',
    en: 'Exam added to the schedule and sent to parents.',
  },
  'teacher.examSubjectRequired': {
    fr: 'Indiquez le module concerné.',
    ar: 'أدخلوا المادة المعنية.',
    en: 'Enter the related course.',
  },
  'teacher.examDateRequired': {
    fr: "Indiquez la date de l'examen.",
    ar: 'أدخلوا تاريخ الاختبار.',
    en: 'Enter the exam date.',
  },
  'teacher.examTimeRequired': {
    fr: 'Indiquez les heures de début et de fin.',
    ar: 'أدخلوا وقت البداية والنهاية.',
    en: 'Enter the start and end times.',
  },
  'teacher.examTimeRange': {
    fr: "L'heure de fin doit être après l'heure de début.",
    ar: 'يجب أن يكون وقت النهاية بعد وقت البداية.',
    en: 'End time must be after start time.',
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
  'reportCards.republic': {
    fr: 'République algérienne démocratique et populaire',
    ar: 'الجمهورية الجزائرية الديمقراطية الشعبية',
    en: 'People\'s Democratic Republic of Algeria',
  },
  'reportCards.mention.felicitations': {
    fr: 'Félicitations',
    ar: 'تهنئة',
    en: 'Congratulations',
  },
  'reportCards.mention.encouragements': {
    fr: 'Encouragements',
    ar: 'تشجيع',
    en: 'Encouragement',
  },
  'reportCards.mention.tableau_honneur': {
    fr: 'Tableau d\'honneur',
    ar: 'لوحة الشرف',
    en: 'Honour roll',
  },
  'reportCards.verifyHint': {
    fr: 'Scannez pour vérifier l\'authenticité de ce bulletin.',
    ar: 'امسح للتحقق من صحة هذا الكشف.',
    en: 'Scan to check this report card is genuine.',
  },
};
