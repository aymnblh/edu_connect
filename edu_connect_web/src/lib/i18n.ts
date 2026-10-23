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
  'nav.announcements': {
    fr: 'Annonces et calendrier',
    ar: 'الإعلانات والتقويم',
    en: 'Announcements & calendar',
  },
  'director.tab.announcements': {
    fr: 'Annonces',
    ar: 'الإعلانات',
    en: 'Announcements',
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
  'nav.reportCards': {
    fr: 'Bulletins',
    ar: 'كشوف النقاط',
    en: 'Report cards',
  },
  'director.tab.reports': {
    fr: 'Bulletins',
    ar: 'كشوف النقاط',
    en: 'Report cards',
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
  'nav.auditLog': {
    fr: 'Journal d\'activité',
    ar: 'سجل النشاط',
    en: 'Activity log',
  },
  'director.tab.journal': {
    fr: 'Journal',
    ar: 'السجل',
    en: 'Log',
  },
  'director.signOut': {
    fr: 'Déconnecter',
    ar: 'تسجيل الخروج',
    en: 'Sign out',
  },
  'director.signOutConfirm': {
    fr: 'Déconnecter {name} de tous ses appareils ? Son mot de passe reste valable.',
    ar: 'تسجيل خروج {name} من كل أجهزته؟ تبقى كلمة المرور صالحة.',
    en: 'Sign {name} out of every device? Their password still works.',
  },
  'director.toast.signedOut': {
    fr: 'Déconnecté de tous les appareils.',
    ar: 'تم تسجيل الخروج من كل الأجهزة.',
    en: 'Signed out of every device.',
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
    fr: "Utilisez le code remis par l'administration pour définir votre mot de passe et rejoindre votre espace Wasel Edu.",
    ar: 'استعملوا رمز الدعوة الذي قدمته الإدارة لتحديد كلمة المرور والدخول إلى فضاء Wasel Edu.',
    en: 'Use the invite code from school administration to set your password and enter Wasel Edu.',
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
    fr: 'Créez votre espace scolaire sur EduConnect',
    ar: 'أنشئ فضاءك المدرسي على EduConnect',
    en: 'Create your school workspace on EduConnect',
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
  'messages.contactsTitle': {
    fr: 'Destinataires autorisés',
    ar: 'المستلمون المسموحون',
    en: 'Authorized recipients',
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
  'director.tab.messages': {
    fr: 'Messagerie',
    ar: 'الرسائل',
    en: 'Messaging',
  },
  'superadmin.loading': {
    fr: 'Chargement des écoles...',
    ar: 'جار تحميل المدارس...',
    en: 'Loading schools...',
  },
  'superadmin.createSchool': {
    fr: 'Créer un établissement',
    ar: 'إنشاء مؤسسة',
    en: 'Create school',
  },
  'superadmin.schoolNameLabel': {
    fr: 'Nom de l\'établissement',
    ar: 'اسم المؤسسة',
    en: 'School name',
  },
  'superadmin.createSchoolSubmit': {
    fr: 'Créer',
    ar: 'إنشاء',
    en: 'Create',
  },
  'superadmin.creating': {
    fr: 'Création...',
    ar: 'جارٍ الإنشاء...',
    en: 'Creating...',
  },
  'superadmin.toastSchoolCreated': {
    fr: 'Établissement créé avec succès',
    ar: 'تم إنشاء المؤسسة بنجاح',
    en: 'School created successfully',
  },
  'superadmin.toastSchoolCreateError': {
    fr: 'Erreur lors de la création',
    ar: 'خطأ أثناء الإنشاء',
    en: 'Error creating school',
  },
  'superadmin.activateSchool': {
    fr: 'Activer',
    ar: 'تفعيل',
    en: 'Activate',
  },
  'superadmin.suspendSchool': {
    fr: 'Suspendre',
    ar: 'تعليق',
    en: 'Suspend',
  },
  'superadmin.toastActivated': {
    fr: 'Établissement activé',
    ar: 'تم تفعيل المؤسسة',
    en: 'School activated',
  },
  'superadmin.toastSuspended': {
    fr: 'Établissement suspendu',
    ar: 'تم تعليق المؤسسة',
    en: 'School suspended',
  },
  'superadmin.confirmSuspend': {
    fr: 'Voulez-vous vraiment suspendre cet établissement ?',
    ar: 'هل تريد حقاً تعليق هذه المؤسسة؟',
    en: 'Are you sure you want to suspend this school?',
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
    fr: "Pilotez les écoles clientes, l'usage de l'application, la facturation et les signaux d'observabilité.",
    ar: 'تابعوا اشتراكات ومدفوعات المدارس المشتركة.',
    en: 'Manage customer schools, application usage, billing, and observability signals.',
  },
  'superadmin.eyebrow': {
    fr: 'Observabilité SaaS',
    ar: 'مراقبة SaaS',
    en: 'SaaS observability',
  },
  'superadmin.platformTitle': {
    fr: 'État de la plateforme',
    ar: 'حالة المنصة',
    en: 'Platform status',
  },
  'superadmin.platformCopy': {
    fr: 'Vue opérationnelle temps réel : API, base de données, Redis, sessions et événements audités.',
    ar: 'نظرة تشغيلية مباشرة: الواجهة البرمجية وقاعدة البيانات وRedis والجلسات وأحداث التدقيق.',
    en: 'Operational view: API readiness, database, Redis, sessions, and audited events.',
  },
  'superadmin.readiness.ready': {
    fr: 'Prêt',
    ar: 'جاهز',
    en: 'Ready',
  },
  'superadmin.readiness.degraded': {
    fr: 'Dégradé',
    ar: 'متدهور',
    en: 'Degraded',
  },
  'superadmin.readiness.unknown': {
    fr: 'Inconnu',
    ar: 'غير معروف',
    en: 'Unknown',
  },
  'superadmin.kpiSchools': {
    fr: 'Écoles',
    ar: 'مدارس',
    en: 'Schools',
  },
  'superadmin.kpiActiveSchools': {
    fr: 'Écoles actives',
    ar: 'مدارس نشطة',
    en: 'Active schools',
  },
  'superadmin.kpiUsers': {
    fr: 'Comptes',
    ar: 'حسابات',
    en: 'Accounts',
  },
  'superadmin.kpiSessions': {
    fr: 'Sessions actives',
    ar: 'جلسات نشطة',
    en: 'Active sessions',
  },
  'superadmin.kpiAudits': {
    fr: 'Audits 24h',
    ar: 'تدقيق 24 ساعة',
    en: '24h audits',
  },
  'superadmin.kpiRevenue': {
    fr: 'Revenus enregistrés',
    ar: 'الإيرادات المسجلة',
    en: 'Recorded revenue',
  },
  'superadmin.kpiErrors': {
    fr: 'Erreurs 24h',
    ar: 'أخطاء 24 ساعة',
    en: '24h errors',
  },
  'superadmin.checkDatabase': {
    fr: 'Base de données',
    ar: 'قاعدة البيانات',
    en: 'Database',
  },
  'superadmin.checkRedis': {
    fr: 'Redis temps réel',
    ar: 'Redis مباشر',
    en: 'Realtime Redis',
  },
  'superadmin.dbPool': {
    fr: 'Pool DB utilisé',
    ar: 'استعمال مجمع قاعدة البيانات',
    en: 'DB pool used',
  },
  'superadmin.health.healthy': {
    fr: 'Sain',
    ar: 'سليم',
    en: 'Healthy',
  },
  'superadmin.health.watch': {
    fr: 'À surveiller',
    ar: 'تحت المراقبة',
    en: 'Watch',
  },
  'superadmin.health.risk': {
    fr: 'Risque',
    ar: 'خطر',
    en: 'Risk',
  },
  'superadmin.health.suspended': {
    fr: 'Suspendu',
    ar: 'معلق',
    en: 'Suspended',
  },
  'superadmin.health.subscription_expired': {
    fr: 'Abonnement expiré',
    ar: 'الاشتراك منته',
    en: 'Subscription expired',
  },
  'superadmin.healthScore': {
    fr: 'Score santé',
    ar: 'مؤشر الصحة',
    en: 'Health score',
  },
  'superadmin.createdAt': {
    fr: 'Créée',
    ar: 'تم الإنشاء',
    en: 'Created',
  },
  'superadmin.lastLogin': {
    fr: 'Dernière connexion',
    ar: 'آخر تسجيل دخول',
    en: 'Last login',
  },
  'superadmin.sectionPopulation': {
    fr: 'Population',
    ar: 'المستخدمون',
    en: 'Population',
  },
  'superadmin.sectionUsage': {
    fr: 'Usage application',
    ar: 'استخدام التطبيق',
    en: 'App usage',
  },
  'superadmin.sectionObservability': {
    fr: 'Observabilité tenant',
    ar: 'مراقبة المؤسسة',
    en: 'Tenant observability',
  },
  'superadmin.metricUsers': {
    fr: 'Comptes',
    ar: 'حسابات',
    en: 'Accounts',
  },
  'superadmin.metricStudents': {
    fr: 'Élèves',
    ar: 'تلاميذ',
    en: 'Students',
  },
  'superadmin.metricClasses': {
    fr: 'Classes',
    ar: 'أقسام',
    en: 'Classes',
  },
  'superadmin.metricCourses': {
    fr: 'Modules',
    ar: 'مواد',
    en: 'Courses',
  },
  'superadmin.metricSessions': {
    fr: 'Sessions',
    ar: 'جلسات',
    en: 'Sessions',
  },
  'superadmin.metricMessages': {
    fr: 'Messages',
    ar: 'رسائل',
    en: 'Messages',
  },
  'superadmin.metricGrades': {
    fr: 'Notes',
    ar: 'درجات',
    en: 'Grades',
  },
  'superadmin.metricAbsences': {
    fr: 'Absences',
    ar: 'غيابات',
    en: 'Absences',
  },
  'superadmin.metricHomework': {
    fr: 'Devoirs',
    ar: 'واجبات',
    en: 'Homework',
  },
  'superadmin.metricLinks': {
    fr: 'Liens parent utilisés',
    ar: 'روابط الأولياء المستعملة',
    en: 'Used parent links',
  },
  'superadmin.metricAudit24h': {
    fr: 'Audit 24h',
    ar: 'تدقيق 24 ساعة',
    en: '24h audit',
  },
  'superadmin.metricFailedAuth': {
    fr: 'Auth échouées',
    ar: 'مصادقات فاشلة',
    en: 'Failed auth',
  },
  'superadmin.metricServerErrors': {
    fr: 'Erreurs serveur',
    ar: 'أخطاء الخادم',
    en: 'Server errors',
  },
  'superadmin.metricPendingLinks': {
    fr: 'Invitations parent',
    ar: 'دعوات الأولياء',
    en: 'Parent invites',
  },
  'superadmin.lastAudit': {
    fr: 'Dernier audit',
    ar: 'آخر تدقيق',
    en: 'Last audit',
  },
  'superadmin.lastMessage': {
    fr: 'Dernier message',
    ar: 'آخر رسالة',
    en: 'Last message',
  },
  'superadmin.lastGrade': {
    fr: 'Dernière note',
    ar: 'آخر درجة',
    en: 'Last grade',
  },
  'superadmin.lastAttendance': {
    fr: 'Dernier appel',
    ar: 'آخر حضور',
    en: 'Last attendance',
  },
  'superadmin.signalSuspended': {
    fr: 'Établissement suspendu',
    ar: 'المؤسسة معلقة',
    en: 'School suspended',
  },
  'superadmin.signalExpiry': {
    fr: 'Abonnement : {days} jours',
    ar: 'الاشتراك: {days} يوم',
    en: 'Subscription: {days} days',
  },
  'superadmin.signalServerErrors': {
    fr: '{count} erreurs serveur sur 24h',
    ar: '{count} أخطاء خادم خلال 24 ساعة',
    en: '{count} server errors in 24h',
  },
  'superadmin.signalFailedAuth': {
    fr: '{count} échecs auth sur 24h',
    ar: '{count} فشل مصادقة خلال 24 ساعة',
    en: '{count} auth failures in 24h',
  },
  'superadmin.signalPendingGrades': {
    fr: '{count} notes en attente',
    ar: '{count} درجات في الانتظار',
    en: '{count} pending grades',
  },
  'superadmin.signalHealthy': {
    fr: 'Aucun signal critique',
    ar: 'لا توجد إشارات حرجة',
    en: 'No critical signals',
  },
  'superadmin.paymentsCount': {
    fr: '{count} paiements',
    ar: '{count} دفعات',
    en: '{count} payments',
  },
  'superadmin.noPayment': {
    fr: 'Aucun paiement',
    ar: 'لا يوجد دفع',
    en: 'No payment',
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
    fr: "Inviter un membre de l'équipe",
    ar: 'دعوة عضو من الفريق',
    en: 'Invite a team member',
  },
  'director.team.inviteCopy': {
    fr: "Créez les comptes enseignants et secrétariat sans mot de passe. Le code invitation permet l'activation initiale.",
    ar: 'أنشئوا حسابات المعلمين والسكرتارية بدون كلمة مرور. يسمح رمز الدعوة بالتفعيل الأول.',
    en: 'Create teacher and secretariat accounts without a password. The invite code enables first activation.',
  },
  'director.team.role': {
    fr: 'Rôle',
    ar: 'الدور',
    en: 'Role',
  },
  'director.team.roleTeacher': {
    fr: 'Enseignant',
    ar: 'معلم',
    en: 'Teacher',
  },
  'director.team.roleSecretary': {
    fr: 'Secrétariat',
    ar: 'السكرتارية',
    en: 'Secretariat',
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
    fr: "Équipe de l'établissement",
    ar: 'فريق المؤسسة',
    en: 'School team',
  },
  'director.team.copy': {
    fr: "Direction, secrétariat et enseignants rattachés à l'établissement.",
    ar: 'الإدارة والسكرتارية والمعلمون المرتبطون بالمؤسسة.',
    en: 'Directors, secretariat, and teachers attached to the school.',
  },
  'director.team.count': {
    fr: '{count} membre(s)',
    ar: '{count} عضو',
    en: '{count} member(s)',
  },
  'director.team.loading': {
    fr: "Chargement de l'équipe...",
    ar: 'جار تحميل الفريق...',
    en: 'Loading team...',
  },
  'director.team.empty': {
    fr: "Aucun membre d'équipe créé.",
    ar: 'لم يتم إنشاء أي عضو في الفريق.',
    en: 'No team member created.',
  },
  'director.team.status': {
    fr: 'Statut',
    ar: 'الحالة',
    en: 'Status',
  },
  'director.team.actions': {
    fr: 'Actions',
    ar: 'إجراءات',
    en: 'Actions',
  },
  'director.team.resetAccess': {
    fr: "Réinitialiser l'accès",
    ar: 'إعادة تعيين الدخول',
    en: 'Reset access',
  },
  'director.team.resetAccessConfirm': {
    fr: "Générer un nouveau code pour {name} ? Son mot de passe actuel cessera de fonctionner et toutes ses sessions seront fermées.",
    ar: 'إنشاء رمز جديد لـ {name}؟ ستتوقف كلمة المرور الحالية وسيتم إغلاق جميع الجلسات.',
    en: 'Generate a new code for {name}? Their current password will stop working and all their sessions will be signed out.',
  },
  'director.toast.staffAccessReset': {
    fr: "Nouveau code d'activation généré.",
    ar: 'تم إنشاء رمز تفعيل جديد.',
    en: 'New activation code generated.',
  },
  'director.team.deactivate': {
    fr: 'Désactiver',
    ar: 'تعطيل',
    en: 'Deactivate',
  },
  'director.team.deactivateConfirm': {
    fr: "Désactiver le compte de {name} ? La connexion sera bloquée immédiatement et toutes ses sessions fermées. Vous pourrez le réactiver avec un nouveau code.",
    ar: 'تعطيل حساب {name}؟ سيتم منع الدخول فورا وإغلاق جميع الجلسات. يمكنكم إعادة تفعيله برمز جديد.',
    en: 'Deactivate {name}? Login is blocked immediately and all sessions are signed out. You can reactivate them later with a new code.',
  },
  'director.team.deactivated': {
    fr: 'Désactivé',
    ar: 'معطل',
    en: 'Deactivated',
  },
  'director.team.reactivate': {
    fr: 'Réactiver',
    ar: 'إعادة التفعيل',
    en: 'Reactivate',
  },
  'director.toast.staffDeactivated': {
    fr: 'Compte désactivé.',
    ar: 'تم تعطيل الحساب.',
    en: 'Account deactivated.',
  },
  'director.toast.parentAccessReset': {
    fr: "Nouveau code d'accès généré pour le parent.",
    ar: 'تم إنشاء رمز دخول جديد لولي الأمر.',
    en: 'New access code generated for the parent.',
  },
  'director.parents.title': {
    fr: 'Parents liés',
    ar: 'أولياء الأمور المرتبطون',
    en: 'Linked parents',
  },
  'director.parents.empty': {
    fr: "Aucun parent n'est encore lié à cet élève.",
    ar: 'لا يوجد ولي أمر مرتبط بهذا التلميذ بعد.',
    en: 'No parent is linked to this student yet.',
  },
  'director.parents.resetConfirm': {
    fr: "Générer un nouveau code d'accès pour {name} ? Son mot de passe actuel cessera de fonctionner et toutes ses sessions seront fermées.",
    ar: 'إنشاء رمز دخول جديد لـ {name}؟ ستتوقف كلمة المرور الحالية وسيتم إغلاق جميع الجلسات.',
    en: 'Generate a new access code for {name}? Their current password will stop working and all their sessions will be signed out.',
  },
  'director.parents.shareCode': {
    fr: "Remettez ce code à {name}. Il le saisit sur la page d'activation pour choisir un nouveau mot de passe (valable 72 h).",
    ar: 'سلّموا هذا الرمز إلى {name}. يدخله في صفحة التفعيل لاختيار كلمة مرور جديدة (صالح 72 ساعة).',
    en: 'Give this code to {name}. They enter it on the activation page to choose a new password (valid 72 h).',
  },
  'director.team.activeAccount': {
    fr: 'Actif',
    ar: 'نشط',
    en: 'Active',
  },
  'director.team.pendingActivation': {
    fr: 'Activation en attente',
    ar: 'في انتظار التفعيل',
    en: 'Pending activation',
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
    fr: 'Compte créé avec code invitation.',
    ar: 'تم إنشاء الحساب مع رمز دعوة.',
    en: 'Account created with invite code.',
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
  'parent.scheduleTitle': {
    fr: 'Emploi du temps & Examens',
    ar: 'التوقيت الأسبوعي والاختبارات',
    en: 'Weekly Timetable & Exams',
  },
  'parent.scheduleCopy': {
    fr: 'Emploi du temps hebdomadaire et examens pour {className}.',
    ar: 'التوقيت الأسبوعي والاختبارات المبرمجة لقسم {className}.',
    en: 'Weekly timetable and scheduled exams for {className}.',
  },
  'parent.scheduleWeeklyTab': {
    fr: 'Emploi du temps',
    ar: 'التوقيت الأسبوعي',
    en: 'Weekly Timetable',
  },
  'parent.scheduleExamsTab': {
    fr: 'Examens programmés',
    ar: 'الاختبارات المبرمجة',
    en: 'Scheduled Exams',
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
  'parent.scheduleExamCount': {
    fr: '{count} examens à venir',
    ar: '{count} اختبارات قادمة',
    en: '{count} upcoming exams',
  },
  'parent.emptyScheduleExams': {
    fr: 'Aucun examen planifié pour le moment.',
    ar: 'لا يوجد اختبار مبرمج حاليا.',
    en: 'No exam is scheduled yet.',
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
  'setup.title': {
    fr: 'Démarrer votre école',
    ar: 'انطلاق مدرستك',
    en: 'Get your school started',
  },
  'setup.copy': {
    fr: 'Votre école est prête à {percent} %. Chaque étape débloque une partie de l\'application.',
    ar: 'مدرستك جاهزة بنسبة {percent}٪. كل خطوة تفتح جزءًا من التطبيق.',
    en: 'Your school is {percent}% ready. Each step unlocks part of the app.',
  },
  'setup.progressLabel': {
    fr: '{done} étapes sur {total}',
    ar: '{done} من {total} خطوات',
    en: '{done} of {total} steps',
  },
  'setup.dismiss': {
    fr: 'Masquer',
    ar: 'إخفاء',
    en: 'Hide',
  },
  'setup.go': {
    fr: 'Y aller',
    ar: 'انتقال',
    en: 'Go',
  },
  'setup.template': {
    fr: 'Modèle Excel',
    ar: 'نموذج Excel',
    en: 'Excel template',
  },
  'setup.trimesters.title': {
    fr: 'Trimestres de l\'année',
    ar: 'فصول السنة',
    en: 'School-year trimesters',
  },
  'setup.trimesters.hint': {
    fr: 'Vérifiez les dates des trois trimestres.',
    ar: 'تحقق من تواريخ الفصول الثلاثة.',
    en: 'Check the dates of the three trimesters.',
  },
  'setup.trimesters.count': {
    fr: '{count} trimestres configurés',
    ar: '{count} فصول مهيأة',
    en: '{count} trimesters set up',
  },
  'setup.classes.title': {
    fr: 'Classes',
    ar: 'الأقسام',
    en: 'Classes',
  },
  'setup.classes.hint': {
    fr: 'Créez vos classes (ex. 1AM-A, 3AP-B).',
    ar: 'أنشئ أقسامك (مثلا 1AM-A).',
    en: 'Create your classes (e.g. 1AM-A, 3AP-B).',
  },
  'setup.classes.count': {
    fr: '{count} classes',
    ar: '{count} أقسام',
    en: '{count} classes',
  },
  'setup.subjects.title': {
    fr: 'Matières',
    ar: 'المواد',
    en: 'Subjects',
  },
  'setup.subjects.hint': {
    fr: 'Ajoutez les matières enseignées et leurs coefficients.',
    ar: 'أضف المواد المدرّسة ومعاملاتها.',
    en: 'Add the subjects you teach and their coefficients.',
  },
  'setup.subjects.count': {
    fr: '{count} matières',
    ar: '{count} مواد',
    en: '{count} subjects',
  },
  'setup.students.title': {
    fr: 'Élèves',
    ar: 'التلاميذ',
    en: 'Students',
  },
  'setup.students.hint': {
    fr: 'Importez la liste depuis Excel avec le modèle (prénom, nom, classe).',
    ar: 'استورد القائمة من Excel باستعمال النموذج (الاسم، اللقب، القسم).',
    en: 'Import the list from Excel with the template (first name, last name, class).',
  },
  'setup.students.count': {
    fr: '{count} élèves, tous dans une classe',
    ar: '{count} تلميذ، كلهم في قسم',
    en: '{count} students, all in a class',
  },
  'setup.students.unplaced': {
    fr: '{count} élève(s) sans classe',
    ar: '{count} تلميذ بدون قسم',
    en: '{count} student(s) without a class',
  },
  'setup.teachers.title': {
    fr: 'Enseignants',
    ar: 'الأساتذة',
    en: 'Teachers',
  },
  'setup.teachers.hint': {
    fr: 'Invitez vos enseignants : chacun reçoit un code d\'activation.',
    ar: 'ادعُ أساتذتك: يتلقى كل واحد رمز تفعيل.',
    en: 'Invite your teachers: each one gets an activation code.',
  },
  'setup.teachers.count': {
    fr: '{count} enseignants',
    ar: '{count} أساتذة',
    en: '{count} teachers',
  },
  'setup.teachers.pending': {
    fr: '{count} invités, {pending} n\'ont pas encore activé leur compte',
    ar: '{count} مدعوون، {pending} لم يفعّلوا حسابهم بعد',
    en: '{count} invited, {pending} have not activated their account yet',
  },
  'setup.assignments.title': {
    fr: 'Matières attribuées',
    ar: 'إسناد المواد',
    en: 'Subjects assigned',
  },
  'setup.assignments.hint': {
    fr: 'Attribuez à chaque classe ses matières et leur enseignant.',
    ar: 'أسند لكل قسم مواده وأستاذها.',
    en: 'Give each class its subjects and their teacher.',
  },
  'setup.assignments.progress': {
    fr: '{count} classes sur {total} ont leurs enseignants',
    ar: '{count} من {total} أقسام لها أساتذة',
    en: '{count} of {total} classes have their teachers',
  },
  'setup.parents.title': {
    fr: 'Parents connectés',
    ar: 'الأولياء المتصلون',
    en: 'Parents connected',
  },
  'setup.parents.hint': {
    fr: 'Imprimez les codes parents et distribuez-les dans les cartables.',
    ar: 'اطبع رموز الأولياء ووزعها في المحافظ.',
    en: 'Print the parent codes and hand them out in school bags.',
  },
  'setup.parents.progress': {
    fr: '{count} élèves sur {total} ont un parent connecté',
    ar: '{count} من {total} تلميذ لهم ولي متصل',
    en: '{count} of {total} students have a parent connected',
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
    fr: 'Installez l\'application Wasel Edu, choisissez « Code ou QR », saisissez l\'identifiant et le PIN, puis créez votre mot de passe.',
    ar: 'ثبّت تطبيق Wasel Edu، اختر «رمز أو QR»، أدخل المعرّف والرمز السري، ثم أنشئ كلمة مرورك.',
    en: 'Install the Wasel Edu app, choose “Code or QR”, enter the ID and PIN, then create your password.',
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
  'director.tab.monthly': {
    fr: 'Bilan mensuel',
    ar: 'الحصيلة الشهرية',
    en: 'Monthly report',
  },
  'nav.monthlyReport': {
    fr: 'Bilan mensuel',
    ar: 'الحصيلة الشهرية',
    en: 'Monthly report',
  },
  'director.toast.importedAssigned': {
    fr: '{count} élève(s) placé(s) dans leur classe.',
    ar: 'تم وضع {count} تلميذ في أقسامهم.',
    en: '{count} student(s) placed in their class.',
  },
  'director.toast.importedUnknownClasses': {
    fr: 'Classes introuvables, à créer puis réimporter ou placer à la main : {classes}',
    ar: 'أقسام غير موجودة، أنشئها ثم أعد الاستيراد أو ضعهم يدويًا: {classes}',
    en: 'Classes not found — create them and re-import, or place students by hand: {classes}',
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
  'director.tab.fees': {
    fr: 'Frais scolaires',
    ar: 'المصاريف المدرسية',
    en: 'School fees',
  },
  'nav.fees': {
    fr: 'Frais scolaires',
    ar: 'المصاريف المدرسية',
    en: 'School fees',
  },
  'monthly.feesCollected': {
    fr: 'Frais encaissés',
    ar: 'مصاريف محصّلة',
    en: 'Fees collected',
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
    fr: 'Reçu généré par Wasel Edu. Conservez-le comme justificatif.',
    ar: 'وصل صادر عن Wasel Edu. احتفظ به كإثبات.',
    en: 'Receipt generated by Wasel Edu. Keep it as proof of payment.',
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
  'teacherImport.copy': {
    fr: 'Plusieurs enseignants ? Importez un fichier CSV (prénom, nom, email) : chacun reçoit un code d\'activation valable 72 h.',
    ar: 'عدة أساتذة؟ استورد ملف CSV (الاسم، اللقب، البريد): يتلقى كل واحد رمز تفعيل صالح 72 ساعة.',
    en: 'Several teachers? Import a CSV file (first name, last name, email): each one gets an activation code valid for 72 hours.',
  },
  'teacherImport.button': {
    fr: 'Importer des enseignants (CSV)',
    ar: 'استيراد أساتذة (CSV)',
    en: 'Import teachers (CSV)',
  },
  'teacherImport.resultTitle': {
    fr: '{count} enseignant(s) invité(s)',
    ar: 'تمت دعوة {count} أستاذ',
    en: '{count} teacher(s) invited',
  },
  'teacherImport.codesOnce': {
    fr: 'Les codes ne s\'affichent qu\'une fois : imprimez cette page ou remettez chaque code à son enseignant maintenant. Un code perdu se renouvelle avec « Réinitialiser l\'accès ».',
    ar: 'تظهر الرموز مرة واحدة فقط: اطبع هذه الصفحة أو سلّم كل رمز لصاحبه الآن. الرمز الضائع يُجدَّد بـ «إعادة تعيين الوصول».',
    en: 'The codes are shown only once: print this page or hand each code to its teacher now. A lost code is renewed with “Reset access”.',
  },
  'teacherImport.instructions': {
    fr: 'Ouvrez Wasel Edu, choisissez « Activer un compte », saisissez votre email et ce code, puis choisissez votre mot de passe.',
    ar: 'افتح Wasel Edu، اختر «تفعيل حساب»، أدخل بريدك وهذا الرمز، ثم اختر كلمة مرورك.',
    en: 'Open Wasel Edu, choose “Activate an account”, enter your email and this code, then choose your password.',
  },
  'teacherImport.skipped': {
    fr: '{count} ligne(s) non importée(s)',
    ar: '{count} سطر لم يُستورد',
    en: '{count} row(s) not imported',
  },
  'teacherImport.line': {
    fr: 'Ligne {line}',
    ar: 'السطر {line}',
    en: 'Row {line}',
  },
  'teacherImport.reason.missing': {
    fr: 'nom ou email manquant',
    ar: 'الاسم أو البريد ناقص',
    en: 'name or email missing',
  },
  'teacherImport.reason.invalid_email': {
    fr: 'email invalide',
    ar: 'بريد غير صالح',
    en: 'invalid email',
  },
  'teacherImport.reason.duplicate': {
    fr: 'email déjà présent plus haut dans le fichier',
    ar: 'البريد مكرر في الملف',
    en: 'email repeated in the file',
  },
  'teacherImport.reason.exists': {
    fr: 'un compte existe déjà avec cet email',
    ar: 'يوجد حساب بهذا البريد',
    en: 'an account already uses this email',
  },
  'branding.title': {
    fr: 'Établissement',
    ar: 'المؤسسة',
    en: 'School',
  },
  'branding.copy': {
    fr: 'Le logo apparaît sur les reçus, les bulletins, le bilan mensuel et les codes parents imprimés.',
    ar: 'يظهر الشعار على الوصولات وكشوف النقاط والحصيلة الشهرية ورموز الأولياء المطبوعة.',
    en: 'The logo appears on receipts, report cards, the monthly report and printed parent codes.',
  },
  'branding.logoAlt': {
    fr: 'Logo de {name}',
    ar: 'شعار {name}',
    en: '{name} logo',
  },
  'branding.upload': {
    fr: 'Ajouter le logo',
    ar: 'إضافة الشعار',
    en: 'Add the logo',
  },
  'branding.replace': {
    fr: 'Changer le logo',
    ar: 'تغيير الشعار',
    en: 'Change the logo',
  },
  'branding.remove': {
    fr: 'Retirer',
    ar: 'إزالة',
    en: 'Remove',
  },
  'branding.directorOnly': {
    fr: 'Seul le directeur peut changer le logo.',
    ar: 'المدير وحده يمكنه تغيير الشعار.',
    en: 'Only the director can change the logo.',
  },
  'setup.logo.title': {
    fr: 'Logo de l\'école',
    ar: 'شعار المدرسة',
    en: 'School logo',
  },
  'setup.logo.hint': {
    fr: 'Ajoutez votre logo (PNG ou JPEG, 200 Ko max) : il sera imprimé sur les reçus et bulletins.',
    ar: 'أضف شعارك (PNG أو JPEG، 200 كيلوبايت كحد أقصى): سيُطبع على الوصولات والكشوف.',
    en: 'Add your logo (PNG or JPEG, 200 KB max): it is printed on receipts and report cards.',
  },
  'setup.logo.count': {
    fr: 'Logo ajouté',
    ar: 'تمت إضافة الشعار',
    en: 'Logo added',
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
