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
    fr: 'Pilotage de l’établissement',
    ar: 'إدارة المؤسسة',
    en: 'School management',
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
  'director.actions.title': {
    fr: 'À traiter maintenant',
    ar: 'ما يحتاج إلى متابعة',
    en: 'What needs attention',
  },
  'director.actions.copy': {
    fr: 'Les prochaines actions de l’établissement, avant les indicateurs globaux.',
    ar: 'الإجراءات التالية للمؤسسة قبل الاطلاع على المؤشرات العامة.',
    en: 'The school’s next actions, before the broader metrics.',
  },
  'director.actions.pending': {
    fr: 'Justifications à vérifier',
    ar: 'التبريرات المطلوب مراجعتها',
    en: 'Justifications to review',
  },
  'director.actions.pendingDetail': {
    fr: '{count} enregistrement(s) de présence à contrôler',
    ar: '{count} من سجلات الحضور للمراجعة',
    en: '{count} attendance records to review',
  },
  'director.actions.support': {
    fr: 'Élèves à accompagner',
    ar: 'تلاميذ يحتاجون إلى دعم',
    en: 'Students needing support',
  },
  'director.actions.supportDetail': {
    fr: 'Repérés à partir des résultats récents',
    ar: 'تم تحديدهم من النتائج الأخيرة',
    en: 'Flagged by recent results',
  },
  'director.actions.classes': {
    fr: 'Classes sous 10/20',
    ar: 'أقسام بمعدل أقل من 10/20',
    en: 'Classes below 10/20',
  },
  'director.actions.classesDetail': {
    fr: 'Comparer les moyennes par classe',
    ar: 'مقارنة معدلات الأقسام',
    en: 'Compare class averages',
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
  'director.pending.search': {
    fr: 'Rechercher un élève ou une classe',
    ar: 'البحث عن تلميذ أو قسم',
    en: 'Search for a student or class',
  },
  'director.pending.statusFilter': {
    fr: 'Filtrer par statut',
    ar: 'التصفية حسب الحالة',
    en: 'Filter by status',
  },
  'director.pending.allStatuses': {
    fr: 'Tous les statuts',
    ar: 'كل الحالات',
    en: 'All statuses',
  },
  'director.pending.noResults': {
    fr: 'Aucun enregistrement ne correspond à cette recherche.',
    ar: 'لا توجد سجلات مطابقة لهذا البحث.',
    en: 'No records match this search.',
  },
  'director.pending.showMore': {
    fr: 'Afficher plus ({count} restants)',
    ar: 'عرض المزيد ({count} متبقية)',
    en: 'Show more ({count} remaining)',
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
  'verify.genuine': {
    fr: 'Bulletin authentique',
    ar: 'كشف أصلي',
    en: 'Genuine report card',
  },
  'verify.copy': {
    fr: 'Voici ce que l\'établissement a publié pour ce bulletin.',
    ar: 'هذا ما نشرته المؤسسة لهذا الكشف.',
    en: 'This is what the school published for this report card.',
  },
  'verify.compare': {
    fr: 'Comparez avec le document papier : toute différence signifie qu\'il a été modifié.',
    ar: 'قارن مع الوثيقة الورقية: أي اختلاف يعني أنها عُدّلت.',
    en: 'Compare with the paper copy: any difference means it was altered.',
  },
  'verify.school': {
    fr: 'Établissement',
    ar: 'المؤسسة',
    en: 'School',
  },
  'verify.term': {
    fr: 'Trimestre',
    ar: 'الفصل',
    en: 'Term',
  },
  'verify.mention': {
    fr: 'Distinction',
    ar: 'التمييز',
    en: 'Distinction',
  },
  'verify.published': {
    fr: 'Publié le',
    ar: 'نُشر في',
    en: 'Published on',
  },
  'verify.notFound': {
    fr: 'Bulletin introuvable',
    ar: 'الكشف غير موجود',
    en: 'Report card not found',
  },
  'verify.notFoundCopy': {
    fr: 'Ce code ne correspond à aucun bulletin publié, ou l\'établissement l\'a retiré. Contactez l\'école.',
    ar: 'هذا الرمز لا يطابق أي كشف منشور، أو سحبته المؤسسة. اتصل بالمدرسة.',
    en: 'This code matches no published report card, or the school withdrew it. Contact the school.',
  },
  'verify.home': {
    fr: 'Aller sur Wasel Edu',
    ar: 'الذهاب إلى Wasel Edu',
    en: 'Go to Wasel Edu',
  },
  'referral.title': {
    fr: 'Parrainez une école : {months} mois offerts',
    ar: 'رشّح مدرسة: {months} أشهر مجانية',
    en: 'Refer a school: {months} months free',
  },
  'referral.copy': {
    fr: 'Partagez votre code avec une autre école. Quand elle est activée, vous recevez chacune {months} mois offerts sur l\'abonnement.',
    ar: 'شارك رمزك مع مدرسة أخرى. عند تفعيلها، تحصل كل مدرسة على {months} أشهر مجانية في الاشتراك.',
    en: 'Share your code with another school. Once it is activated, you each get {months} months free on your subscription.',
  },
  'referral.copyLink': {
    fr: 'Copier le lien d\'inscription',
    ar: 'نسخ رابط التسجيل',
    en: 'Copy the sign-up link',
  },
  'referral.copied': {
    fr: 'Lien copié',
    ar: 'تم نسخ الرابط',
    en: 'Link copied',
  },
  'referral.copyPrompt': {
    fr: 'Copiez ce lien :',
    ar: 'انسخ هذا الرابط:',
    en: 'Copy this link:',
  },
  'referral.pending': {
    fr: 'en attente d\'activation',
    ar: 'في انتظار التفعيل',
    en: 'waiting for activation',
  },
  'referral.active': {
    fr: 'activée',
    ar: 'مفعّلة',
    en: 'activated',
  },
  'referral.rewarded': {
    fr: '{months} mois offerts',
    ar: '{months} أشهر مجانية',
    en: '{months} months given',
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
  'pricing.kicker': {
    fr: 'Pour les écoles privées',
    ar: 'للمدارس الخاصة',
    en: 'For private schools',
  },
  'pricing.title': {
    fr: 'Toute l\'école dans une seule application',
    ar: 'كل المدرسة في تطبيق واحد',
    en: 'Your whole school in one app',
  },
  'pricing.copy': {
    fr: 'Direction, enseignants et parents reliés, sur le web et sur mobile, en arabe, français et anglais.',
    ar: 'الإدارة والأساتذة والأولياء مترابطون، على الويب والهاتف، بالعربية والفرنسية والإنجليزية.',
    en: 'Administration, teachers and parents connected, on the web and on phones, in Arabic, French and English.',
  },
  'pricing.trial': {
    fr: 'Le premier trimestre est offert',
    ar: 'الفصل الأول مجاني',
    en: 'Your first trimester is free',
  },
  'pricing.trialCopy': {
    fr: 'Après l\'activation de votre école, vous utilisez tout gratuitement jusqu\'à la fin du trimestre en cours (ou du suivant s\'il reste moins d\'un mois).',
    ar: 'بعد تفعيل مدرستك، تستعمل كل شيء مجانا حتى نهاية الفصل الجاري (أو الفصل الموالي إذا بقي أقل من شهر).',
    en: 'Once your school is activated, everything is free until the end of the current trimester (or the next one if less than a month is left).',
  },
  'pricing.included': {
    fr: 'Tout est inclus',
    ar: 'كل شيء مشمول',
    en: 'Everything included',
  },
  'pricing.f.grades': {
    fr: 'Notes, moyennes et validation par la direction',
    ar: 'النقاط والمعدلات والمصادقة من الإدارة',
    en: 'Grades, averages and approval by the administration',
  },
  'pricing.f.attendance': {
    fr: 'Appel en classe et alerte immédiate aux parents',
    ar: 'المناداة وتنبيه فوري للأولياء',
    en: 'Attendance with instant alerts to parents',
  },
  'pricing.f.reportCards': {
    fr: 'Bulletins avec distinctions et QR de vérification',
    ar: 'كشوف النقاط مع التمييز ورمز QR للتحقق',
    en: 'Report cards with distinctions and a verification QR',
  },
  'pricing.f.messages': {
    fr: 'Messagerie, annonces et rendez-vous parents',
    ar: 'الرسائل والإعلانات ومواعيد الأولياء',
    en: 'Messages, announcements and parent meetings',
  },
  'pricing.f.fees': {
    fr: 'Frais scolaires, reçus et rappels',
    ar: 'المصاريف المدرسية والوصولات والتذكيرات',
    en: 'School fees, receipts and reminders',
  },
  'pricing.f.health': {
    fr: 'Fiche santé et infirmerie (données chiffrées)',
    ar: 'البطاقة الصحية والتمريض (بيانات مشفرة)',
    en: 'Health sheets and infirmary (encrypted data)',
  },
  'pricing.f.monthly': {
    fr: 'Bilan mensuel et suivi des élèves en difficulté',
    ar: 'الحصيلة الشهرية ومتابعة التلاميذ المتعثرين',
    en: 'Monthly report and early warning on struggling students',
  },
  'pricing.f.apps': {
    fr: 'Application mobile pour les parents et les enseignants',
    ar: 'تطبيق للهاتف للأولياء والأساتذة',
    en: 'Mobile app for parents and teachers',
  },
  'pricing.f.security': {
    fr: 'Données isolées par école, journal d\'activité',
    ar: 'بيانات معزولة لكل مدرسة وسجل نشاط',
    en: 'Data isolated per school, activity log',
  },
  'pricing.price': {
    fr: 'Tarif annuel selon le nombre d\'élèves : demandez votre devis après l\'inscription.',
    ar: 'سعر سنوي حسب عدد التلاميذ: اطلب عرض السعر بعد التسجيل.',
    en: 'Yearly price based on the number of students: ask for your quote after signing up.',
  },
  'pricing.referral': {
    fr: 'Recommandé par une autre école ? Indiquez son code à l\'inscription : deux mois offerts à chacune.',
    ar: 'رشّحتك مدرسة أخرى؟ أدخل رمزها عند التسجيل: شهران مجانيان لكل واحدة.',
    en: 'Recommended by another school? Enter its code when you sign up: two months free for each.',
  },
  'pricing.signUp': {
    fr: 'Inscrire mon école',
    ar: 'تسجيل مدرستي',
    en: 'Sign up my school',
  },
  'pricing.demo': {
    fr: 'Essayer la démo',
    ar: 'تجربة العرض',
    en: 'Try the demo',
  },
  'pricing.contact': {
    fr: 'Nous contacter',
    ar: 'اتصل بنا',
    en: 'Contact us',
  },
  'pricing.f.canteen': {
    fr: 'Cantine scolaire (menus, allergènes, absents déduits automatiquement, facturation)',
    ar: 'المطعم المدرسي (القوائم، مسببات الحساسية، خصم الغائبين تلقائيا والفوترة)',
    en: 'School canteen (menus, allergens, absentees automatically excluded, billing)',
  },
  'pricing.f.transport': {
    fr: 'Transport scolaire (pointage bus hors-ligne, alerte retard, verrou anti-oubli d\'enfant)',
    ar: 'النقل المدرسي (تسجيل الصعود والنزول دون اتصال، تنبيه التأخر، قفل منع نسيان التلميذ)',
    en: 'School transport (offline bus check-in, delay alert, forgotten-child safety lock)',
  },
  'pricing.brochure': {
    fr: 'Brochure imprimable (PDF)',
    ar: 'المطوية التعريفية (PDF)',
    en: 'Printable brochure (PDF)',
  },
  'pricing.pillarsTitle': {
    fr: 'Conçu pour chaque acteur de votre établissement',
    ar: 'مصمم لكل فاعل في مؤسستكم التربوية',
    en: 'Built for every role in your school',
  },
  'pricing.pillarsSubtitle': {
    fr: 'Direction, finances, cantine, transport et familles collaborent dans un cadre sécurisé et cloisonné.',
    ar: 'الإدارة والمالية والمطعم والنقل والأولياء يتعاونون في فضاء آمن ومعزول.',
    en: 'Administration, finance, canteen, transport and families collaborate in a secure, isolated space.',
  },
  'pricing.pillar.directorTitle': {
    fr: 'Direction & Propriétaire',
    ar: 'الإدارة ومالك المدرسة',
    en: 'Director & School Owner',
  },
  'pricing.pillar.directorCopy': {
    fr: 'Validation des notes avant publication, bulletins avec QR code anti-falsification, détection des élèves à risque et bilan mensuel PDF automatique.',
    ar: 'المصادقة على النقاط قبل النشر، كشوف نقاط برمز QR ضد التزوير، رصد التلاميذ المتعثرين وحصيلة شهرية PDF تلقائية.',
    en: 'Grade approval before publishing, QR-verified report cards, early warning on at-risk students and automatic monthly PDF report.',
  },
  'pricing.pillar.financeTitle': {
    fr: 'Écolage & Secrétariat',
    ar: 'المصاريف المدرسية والأمانة',
    en: 'School Fees & Secretariat',
  },
  'pricing.pillar.financeCopy': {
    fr: 'Encaissements au guichet (espèces, CCP/BaridiMob, chèque, virement), reçus PDF instantanés aux parents et rappels automatiques des retards sans commission.',
    ar: 'تحصيل في المكتب (نقدا، بريد/بريدي موب، صك، تحويل)، وصولات PDF فورية للأولياء وتذكيرات تلقائية للتأخر دون عمولة.',
    en: 'Office payments (cash, CCP/BaridiMob, cheque, transfer), instant PDF receipts for parents and automatic overdue reminders with zero fees.',
  },
  'pricing.pillar.servicesTitle': {
    fr: 'Cantine, Bus & Infirmerie',
    ar: 'المطعم والنقل والتمريض',
    en: 'Canteen, Bus & Infirmary',
  },
  'pricing.pillar.servicesCopy': {
    fr: 'Effectif cuisine calculé selon l\'appel du matin, pointage bus hors-ligne avec verrou anti-oubli d\'enfant et fiches santé chiffrées.',
    ar: 'عدد الوجبات محسوب حسب مناداة الصباح، تسجيل الحافلة دون اتصال مع قفل منع نسيان التلميذ وبطاقات صحية مشفرة.',
    en: 'Kitchen headcount synced with morning attendance, offline bus check-in with forgotten-child lock and encrypted health sheets.',
  },
  'pricing.pillar.parentsTitle': {
    fr: 'Parents & Enseignants',
    ar: 'الأولياء والأساتذة',
    en: 'Parents & Teachers',
  },
  'pricing.pillar.parentsCopy': {
    fr: 'Fini les groupes WhatsApp envahissants : alertes d\'absence en direct, devoirs, rendez-vous encadrés et confidentialité totale des numéros personnels.',
    ar: 'وداعا لمجموعات واتساب المزعجة: تنبيهات الغياب الفورية، الواجبات، مواعيد منظمة وسرية تامة للأرقام الشخصية.',
    en: 'Replace chaotic WhatsApp groups: live absence alerts, homework, structured meetings and complete privacy for personal phone numbers.',
  },
  'pricing.sim.title': {
    fr: 'Simulez votre budget annuel en DA',
    ar: 'احسب الميزانية السنوية التقريبية بالدينار الجزائري',
    en: 'Estimate your annual budget in DZD',
  },
  'pricing.sim.subtitle': {
    fr: 'Ajustez le curseur selon l\'effectif de votre école : tous les modules sont inclus et le tarif par élève est dégressif.',
    ar: 'حرّك المؤشر حسب عدد تلاميذ مدرستك: كل الوحدات مشمولة والتسعيرة تنازلية حسب العدد.',
    en: 'Adjust the slider to your school size: every module is included with volume-based per-student pricing.',
  },
  'pricing.sim.studentsLabel': {
    fr: 'Effectif estimé',
    ar: 'العدد التقديري للتلاميذ',
    en: 'Estimated enrollment',
  },
  'pricing.sim.studentsUnit': {
    fr: '{count} élèves',
    ar: '{count} تلميذ',
    en: '{count} students',
  },
  'pricing.sim.tierLabel': {
    fr: 'Palier applicable',
    ar: 'الشريحة المطبقة',
    en: 'Applicable tier',
  },
  'pricing.sim.tier.essential': {
    fr: 'Pack Essentiel (≤ 150 élèves · 1 500 DA / élève / an)',
    ar: 'الباقة الأساسية (≤ 150 تلميذ · 1,500 دج / تلميذ / سنة)',
    en: 'Essential Tier (≤ 150 students · 1,500 DZD / student / year)',
  },
  'pricing.sim.tier.growth': {
    fr: 'Pack Croissance (151–400 élèves · 1 200 DA / élève / an)',
    ar: 'باقة النمو (151–400 تلميذ · 1,200 دج / تلميذ / سنة)',
    en: 'Growth Tier (151–400 students · 1,200 DZD / student / year)',
  },
  'pricing.sim.tier.campus': {
    fr: 'Pack Établissement (400+ élèves · 950 DA / élève / an)',
    ar: 'باقة المؤسسات الكبرى (400+ تلميذ · 950 دج / تلميذ / سنة)',
    en: 'Campus Tier (400+ students · 950 DZD / student / year)',
  },
  'pricing.sim.annualEstimate': {
    fr: 'Estimation annuelle',
    ar: 'التقدير السنوي',
    en: 'Estimated annual fee',
  },
  'pricing.sim.perStudentMonth': {
    fr: 'Soit environ {monthly} DA / élève / mois (sur 12 mois)',
    ar: 'أي حوالي {monthly} دج / تلميذ / شهر (على مدار 12 شهرا)',
    en: 'Around {monthly} DZD / student / month (over 12 months)',
  },
  'pricing.sim.disclaimer': {
    fr: 'Estimation indicative hors remise parrainage (2 mois offerts). Votre 1er trimestre reste 100 % gratuit avant toute facturation.',
    ar: 'تقدير إرشادي قبل خصم الترشيح (شهران مجانيان). فصلكم الأول يبقى مجانيا بالكامل قبل أي دفع.',
    en: 'Indicative estimate before referral rewards (2 free months). Your first trimester remains 100% free before any billing.',
  },
  'pricing.stepsTitle': {
    fr: 'Votre école opérationnelle en 24 heures',
    ar: 'مدرستك جاهزة للعمل في 24 ساعة',
    en: 'Your school up and running in 24 hours',
  },
  'pricing.step1Title': {
    fr: '1. Création & Import Excel',
    ar: '1. التسجيل واستيراد قوائم إكسل',
    en: '1. Sign up & Excel import',
  },
  'pricing.step1Copy': {
    fr: 'Inscrivez l\'école, ajoutez votre logo et importez vos élèves (prenom;nom;classe) et enseignants en quelques clics.',
    ar: 'سجّل المؤسسة، أضف شعار المدرسة واستورد قوائم التلاميذ والأساتذة من ملف CSV/Excel في دقائق.',
    en: 'Register your school, upload your logo and import students (CSV/Excel) and teachers in minutes.',
  },
  'pricing.step2Title': {
    fr: '2. Cartes QR pour les parents',
    ar: '2. طباعة بطاقات QR للأولياء',
    en: '2. Printable QR parent cards',
  },
  'pricing.step2Copy': {
    fr: 'Imprimez une carte à découper par élève avec ID, code PIN et QR code. Chaque parent installe l\'app et active son accès seul.',
    ar: 'اطبع بطاقة لكل تلميذ تحتوي على المعرّف ورمز PIN ورمز QR. يمسحها الولي من هاتفه لربط حسابه فورا.',
    en: 'Print cut-out cards per student with ID, PIN and QR code. Parents install the app and link their child themselves.',
  },
  'pricing.step3Title': {
    fr: '3. Pilotage dès le lendemain',
    ar: '3. تسيير كامل من اليوم الموالي',
    en: '3. Full school operations next day',
  },
  'pricing.step3Copy': {
    fr: 'Appel en classe, devoirs, reçus d\'écolage, cantine et suivi du bus fonctionnent ensemble, suivis par votre bilan mensuel PDF.',
    ar: 'المناداة والواجبات ووصولات الدفع والمطعم والحافلة تعمل بتناغم، مع حصيلة شهرية PDF للإدارة.',
    en: 'Attendance, homework, fee receipts, canteen and bus runs work together with your automated monthly PDF report.',
  },
  'pricing.faqTitle': {
    fr: 'Questions fréquentes des directeurs',
    ar: 'الأسئلة الشائعة لمديري المدارس',
    en: 'Frequently asked questions from school directors',
  },
  'pricing.faq.q1': {
    fr: 'Nos données (élèves, notes, finances, fiches santé) sont-elles vraiment isolées et sécurisées ?',
    ar: 'هل بيانات مؤسستنا (التلاميذ، النقاط، المالية، البطاقات الصحية) معزولة وآمنة فعلا؟',
    en: 'Are our school records (students, grades, fees, health sheets) truly isolated and secure?',
  },
  'pricing.faq.a1': {
    fr: 'Oui. Chaque établissement dispose d\'une isolation stricte au niveau de la base de données (Row-Level Security). Les fiches santé sont chiffrées en base avec consentement parental tracé, les sessions peuvent être révoquées en 1 clic et aucune donnée n\'est jamais vendue ni partagée.',
    ar: 'نعم. كل مؤسسة معزولة كليا على مستوى قاعدة البيانات (Row-Level Security). البطاقات الصحية مشفرة ومرتبطة بموافقة الولي، ويمكن إنهاء أي جلسة عن بعد بنقرة واحدة، ولا يتم بيع أو مشاركة أي بيانات.',
    en: 'Yes. Every school is strictly isolated at the database level (Row-Level Security). Health sheets are encrypted with recorded parent consent, sessions can be revoked in one click and data is never sold or shared.',
  },
  'pricing.faq.q2': {
    fr: 'Comment convaincre les parents de quitter WhatsApp pour installer Wasel Edu ?',
    ar: 'كيف يقتنع الأولياء بالانتقال من واتساب إلى تطبيق Wasel Edu؟',
    en: 'How do parents adopt Wasel Edu instead of WhatsApp groups?',
  },
  'pricing.faq.a2': {
    fr: 'La mise en route est immédiate : la direction imprime les cartes QR/PIN de chaque élève, le parent scanne la carte dans l\'application (en arabe, français ou anglais) et reçoit aussitôt les absences, devoirs, menus de cantine, reçus et bulletins. Les parents ne voient jamais les numéros des profs ni les messages des autres familles.',
    ar: 'الانضمام بسيط للغاية: تطبع الإدارة بطاقات QR/PIN للتلاميذ، يمسح الولي البطاقة داخل التطبيق (بالعربية أو الفرنسية أو الإنجليزية) ليتابع الغيابات والواجبات والمطعم والوصولات وكشوف النقاط فورا، دون كشف أرقام الأساتذة أو إزعاج المجموعات.',
    en: 'Onboarding is effortless: the office prints student QR/PIN cards, parents scan the card in the app (Arabic, French or English) and immediately receive absences, homework, canteen menus, receipts and report cards without exposing personal phone numbers.',
  },
  'pricing.faq.q3': {
    fr: 'Faut-il activer le paiement en ligne pour utiliser le module Frais scolaires ?',
    ar: 'هل يشترط الدفع الإلكتروني لاستعمال وحدة المصاريف المدرسية؟',
    en: 'Do we need online card payments to use the School Fees module?',
  },
  'pricing.faq.a3': {
    fr: 'Non. Le produit est adapté aux habitudes des écoles privées en Algérie : les parents règlent au secrétariat (espèces, CCP / BaridiMob, chèque ou virement bancaire). Vous enregistrez le règlement en 5 secondes, un reçu PDF officiel avec votre logo est généré et les rappels automatiques gèrent les retards.',
    ar: 'لا. النظام مصمم لعادات المدارس الخاصة في الجزائر: يدفع الأولياء في الأمانة (نقدا، CCP/بريدي موب، صك أو تحويل بنكي). تسجل الإدارة الدفع في ثوانٍ ليصل وصل PDF رسمي بشعار المدرسة إلى هاتف الولي مع تذكيرات تلقائية للتأخر.',
    en: 'No. It matches Algerian private school workflows: parents pay at the school office (cash, CCP/BaridiMob, cheque or bank transfer). Staff record the payment in seconds to issue a branded PDF receipt, while automated reminders follow up on overdue fees.',
  },
  'pricing.faq.q4': {
    fr: 'Le suivi du bus fonctionne-t-il si le chauffeur perd le réseau 4G sur la route ?',
    ar: 'هل يعمل تسجيل الحافلة المدرسية إذا انقطعت شبكة الإنترنت أثناء المسار؟',
    en: 'Does school bus check-in still work when the driver loses 4G signal?',
  },
  'pricing.faq.a4': {
    fr: 'Oui. L\'interface chauffeur intègre une file d\'attente hors-ligne : il pointe la montée et la descente normalement sans connexion, et les événements se synchronisent automatiquement dès le retour du réseau. De plus, un verrou empêche de clôturer le trajet si un élève monté n\'a pas été pointé descendu.',
    ar: 'نعم. واجهة السائق تعمل حتى دون اتصال: يسجل الصعود والنزول بشكل عادي وتتم المزامنة تلقائيا عند عودة الشبكة. كما يمنع قفل الأمان إنهاء الرحلة إذا بقي تلميذ مسجلا في الصعود دون تسجيل نزوله.',
    en: 'Yes. The driver view includes an offline queue: check-ins are recorded locally and sync automatically once signal returns. A safety lock also prevents closing a trip while any boarded student lacks a drop-off check-in.',
  },
  'pricing.faq.q5': {
    fr: 'Comment fonctionnent le 1er trimestre offert et le parrainage ?',
    ar: 'كيف يعمل العرض المجاني للفصل الأول وبرنامج الترشيح؟',
    en: 'How do the free first trimester and school referral program work?',
  },
  'pricing.faq.a5': {
    fr: 'Dès l\'activation de votre école, toutes les fonctionnalités sont gratuites jusqu\'à la fin du trimestre en cours — ou jusqu\'à la fin du trimestre suivant s\'il reste moins de 30 jours. Si vous indiquez le code de parrainage d\'une école partenaire, vous recevez chacune 2 mois offerts supplémentaires.',
    ar: 'بمجرد تفعيل مدرستك، تستفيد من جميع المزايا مجانا حتى نهاية الفصل الحالي — أو نهاية الفصل الموالي إذا بقي أقل من 30 يوما. وعند إدخال رمز ترشيح مدرسة شريكة، تحصل كلتا المدرستين على شهرين مجانيين إضافيين.',
    en: 'Once your school is activated, everything is free until the end of the current trimester — or the next one if fewer than 30 days remain. Entering a partner school\'s referral code grants 2 bonus free months to both schools.',
  },
  'login.discoverLanding': {
    fr: 'Découvrir la plateforme',
    ar: 'اكتشاف المنصة',
    en: 'Explore the platform',
  },
  'pricing.discoverLink': {
    fr: 'Visite interactive',
    ar: 'جولة تفاعلية',
    en: 'Interactive tour',
  },
  'pricing.signInLink': {
    fr: 'Se connecter',
    ar: 'تسجيل الدخول',
    en: 'Sign in',
  },
  'landing.nav.preview': {
    fr: 'Aperçu par rôle',
    ar: 'معاينة الواجهات',
    en: 'Role preview',
  },
  'landing.nav.modules': {
    fr: 'Modules',
    ar: 'الوحدات',
    en: 'Modules',
  },
  'landing.nav.compare': {
    fr: 'Comparatif',
    ar: 'المقارنة',
    en: 'Comparison',
  },
  'landing.nav.pricing': {
    fr: 'Tarifs',
    ar: 'الأسعار',
    en: 'Pricing',
  },
  'landing.nav.faq': {
    fr: 'FAQ',
    ar: 'الأسئلة',
    en: 'FAQ',
  },
  'landing.nav.login': {
    fr: 'Se connecter',
    ar: 'تسجيل الدخول',
    en: 'Sign in',
  },
  'landing.nav.cta': {
    fr: 'Inscrire mon école',
    ar: 'تسجيل مدرستي',
    en: 'Sign up school',
  },
  'landing.nav.menuToggle': {
    fr: 'Ouvrir ou fermer le menu',
    ar: 'فتح أو إغلاق القائمة',
    en: 'Toggle menu',
  },
  'landing.hero.eyebrow': {
    fr: 'ÉCOLES PRIVÉES EN ALGÉRIE · PRIMAIRE · CEM · LYCÉE · PRÉSCOLAIRE',
    ar: 'المدارس الخاصة في الجزائر · ابتدائي · متوسط · ثانوي · تحضيري',
    en: 'PRIVATE SCHOOLS IN ALGERIA · PRIMARY · MIDDLE · HIGH SCHOOL',
  },
  'landing.hero.title': {
    fr: 'Pilotez toute votre école privée dans une seule application fiable.',
    ar: 'سيّر مدرستك الخاصة بالكامل من تطبيق واحد موثوق وآمن.',
    en: 'Run your entire private school from one trusted application.',
  },
  'landing.hero.subtitle': {
    fr: 'Reliez direction, secrétariat, enseignants, parents, infirmerie, cantine et transport scolaire sur le web et sur mobile (Android & iOS) — pensé pour le calendrier dimanche–jeudi, les 3 trimestres, le barème /20 et l\'écolage en DA.',
    ar: 'اربط الإدارة والأمانة والأساتذة والأولياء والتمريض والمطعم والنقل المدرسي عبر الويب والهاتف (أندرويد وiOS) — مصمم لنظام الأحد–الخميس، الفصول الثلاثة، التنقيط من 20 والتحصيل بالدينار الجزائري.',
    en: 'Connect administration, teachers, parents, infirmary, canteen and school buses on web and mobile (Android & iOS) — built for Algeria\'s Sunday–Thursday week, 3 trimesters, /20 grading and DZD tuition.',
  },
  'landing.hero.pill1': {
    fr: 'Arabe (RTL) · Français · Anglais',
    ar: 'العربية · الفرنسية · الإنجليزية',
    en: 'Arabic (RTL) · French · English',
  },
  'landing.hero.pill2': {
    fr: 'Bulletins avec QR anti-falsification',
    ar: 'كشوف نقاط برمز QR ضد التزوير',
    en: 'QR-verified report cards',
  },
  'landing.hero.pill3': {
    fr: 'Paiements au guichet (CCP, Espèces, Chèque)',
    ar: 'تحصيل في المكتب (CCP، نقدا، صك)',
    en: 'Office fees (CCP, Cash, Cheque)',
  },
  'landing.hero.pill4': {
    fr: 'Bus hors-ligne & Verrou anti-oubli',
    ar: 'حافلة دون اتصال وقفل أمان',
    en: 'Offline bus & safety lock',
  },
  'landing.hero.ctaPrimary': {
    fr: 'Démarrer le 1er trimestre offert',
    ar: 'ابدأ الفصل الأول مجانا',
    en: 'Start your free first trimester',
  },
  'landing.hero.ctaDemo': {
    fr: 'Tester la démo sans compte',
    ar: 'تجربة العرض دون حساب',
    en: 'Try live demo without an account',
  },
  'landing.hero.demoPrompt': {
    fr: 'Accès instantané en lecture seule (aucun compte requis) :',
    ar: 'دخول فوري للمعاينة دون إنشاء حساب:',
    en: 'Instant read-only demo access (no sign-up needed):',
  },
  'landing.hero.cardKicker': {
    fr: 'APERÇU EN DIRECT · ÉTABLISSEMENT',
    ar: 'نظرة فورية · تسيير المؤسسة',
    en: 'LIVE SNAPSHOT · SCHOOL CONTROL',
  },
  'landing.hero.cardTitle': {
    fr: 'Une maîtrise totale dès le premier jour',
    ar: 'تحكم شامل منذ اليوم الأول',
    en: 'Full visibility from day one',
  },
  'landing.hero.m1Label': {
    fr: 'Assiduité & Cantine synchronisées',
    ar: 'تزامن الحضور والمطعم',
    en: 'Synced attendance & canteen',
  },
  'landing.hero.m1Value': {
    fr: '09:00',
    ar: '09:00',
    en: '09:00',
  },
  'landing.hero.m1Sub': {
    fr: 'Absents déduits automatiquement de la cuisine',
    ar: 'خصم الغائبين تلقائيا من وجبات المطبخ',
    en: 'Absentees automatically deducted from kitchen prep',
  },
  'landing.hero.m2Label': {
    fr: 'Authenticité des bulletins',
    ar: 'مصداقية كشوف النقاط',
    en: 'Report card verification',
  },
  'landing.hero.m2Value': {
    fr: 'QR 100%',
    ar: 'QR 100%',
    en: 'QR 100%',
  },
  'landing.hero.m2Sub': {
    fr: 'Vérification publique instantanée et document figé',
    ar: 'تحقق فوري عبر الإنترنت ووثيقة محفوظة',
    en: 'Instant public verification & immutable snapshot',
  },
  'landing.hero.m3Label': {
    fr: 'Sécurité transport scolaire',
    ar: 'أمان النقل المدرسي',
    en: 'School bus safety',
  },
  'landing.hero.m3Value': {
    fr: '0 oubli',
    ar: '0 نسيان',
    en: '0 left behind',
  },
  'landing.hero.m3Sub': {
    fr: 'Clôture bloquée tant qu\'un élève reste à bord',
    ar: 'يُمنع إغلاق الرحلة ما دام هناك تلميذ على متن الحافلة',
    en: 'Trip closure blocked while any boarded child remains',
  },
  'landing.hero.m4Label': {
    fr: 'Bilan propriétaire automatique',
    ar: 'الحصيلة الشهرية للمالك',
    en: 'Owner monthly PDF report',
  },
  'landing.hero.m4Value': {
    fr: 'Le 1er',
    ar: 'كل 1 شهر',
    en: '1st / mo',
  },
  'landing.hero.m4Sub': {
    fr: 'Assiduité, notes, messages et frais encaissés en PDF',
    ar: 'الحضور والنقاط والرسائل والمبالغ المحصلة في ملف PDF',
    en: 'Attendance, grades, activity & collected fees in PDF',
  },
  'landing.hero.demoChecking': {
    fr: 'Connexion à la démo en ligne…',
    ar: 'جارٍ الاتصال بالعرض التجريبي…',
    en: 'Connecting to live demo…',
  },
  'landing.hero.demoOfflineHint': {
    fr: 'Démo interactive ci-dessous · la démo serveur en ligne est en attente d\'activation.',
    ar: 'العرض التفاعلي متاح أدناه · العرض عبر الخادم غير مفعل حاليا.',
    en: 'Interactive preview below · live server demo is currently offline.',
  },
  'landing.preview.eyebrow': {
    fr: 'VISITE INTERACTIVE',
    ar: 'جولة تفاعلية',
    en: 'INTERACTIVE WALKTHROUGH',
  },
  'landing.preview.title': {
    fr: 'Testez l\'interface de chaque profil en un clic',
    ar: 'اكتشف واجهة كل مستخدم بنقرة واحدة',
    en: 'Explore each role\'s workspace in one click',
  },
  'landing.preview.subtitle': {
    fr: 'Cliquez sur un rôle ci-dessous et manipulez l\'aperçu pour voir comment Wasel Edu simplifie le quotidien de toute votre école.',
    ar: 'اختر الدور أدناه وجرّب المعاينة التفاعلية لترى كيف يبسّط Wasel Edu العمل اليومي لمدرستك.',
    en: 'Select a role below and interact with the preview to see how Wasel Edu streamlines your school\'s daily work.',
  },
  'landing.preview.tab.director': {
    fr: 'Direction',
    ar: 'الإدارة',
    en: 'Director',
  },
  'landing.preview.tab.teacher': {
    fr: 'Enseignant',
    ar: 'الأستاذ',
    en: 'Teacher',
  },
  'landing.preview.tab.parent': {
    fr: 'Parent (Mobile)',
    ar: 'الولي (الهاتف)',
    en: 'Parent (Mobile)',
  },
  'landing.preview.tab.services': {
    fr: 'Bus & Cantine',
    ar: 'الحافلة والمطعم',
    en: 'Bus & Canteen',
  },
  'landing.preview.dir.school': {
    fr: 'Groupe Scolaire El Nour · Alger',
    ar: 'مجمع النور التربوي · الجزائر',
    en: 'El Nour Private School · Algiers',
  },
  'landing.preview.dir.term': {
    fr: 'Trimestre 1 · Semaine Dimanche–Jeudi',
    ar: 'الفصل الأول · الأسبوع الأحد–الخميس',
    en: 'Trimester 1 · Sunday–Thursday Week',
  },
  'landing.preview.dir.kpi1Label': {
    fr: 'Présence du jour',
    ar: 'حضور اليوم',
    en: 'Today\'s attendance',
  },
  'landing.preview.dir.kpi2Label': {
    fr: 'Moyenne générale',
    ar: 'المعدل العام',
    en: 'School average',
  },
  'landing.preview.dir.kpi3Label': {
    fr: 'Écolage encaissé (mois)',
    ar: 'التحصيل الشهري',
    en: 'Fees collected (month)',
  },
  'landing.preview.dir.subVigilance': {
    fr: 'Vigilance élèves à suivre',
    ar: 'رصد التلاميذ المتعثرين',
    en: 'Early warning alerts',
  },
  'landing.preview.dir.subReport': {
    fr: 'Bulletin officiel & QR',
    ar: 'كشف النقاط ورمز QR',
    en: 'Official QR report card',
  },
  'landing.preview.dir.alert1Title': {
    fr: 'Karim Mansouri · 3AM-B',
    ar: 'كريم منصوري · 3 متوسط ب',
    en: 'Karim Mansouri · 3AM-B',
  },
  'landing.preview.dir.alert1Reason': {
    fr: 'Chute de -2,4 pts vs trimestre précédent · 3 absences non justifiées',
    ar: 'تراجع بـ 2.4 نقطة مقارنة بالفصل السابق · 3 غيابات غير مبررة',
    en: 'Dropped -2.4 pts vs last trimester · 3 unjustified absences',
  },
  'landing.preview.dir.alert2Title': {
    fr: 'Sara Haddad · 1AS-A',
    ar: 'سارة حداد · 1 ثانوي أ',
    en: 'Sara Haddad · 1AS-A',
  },
  'landing.preview.dir.alert2Reason': {
    fr: 'Moyenne trimestrielle à 9,45 / 20 · 5 retards sur 30 jours',
    ar: 'المعدل الفصلي 9.45 / 20 · 5 تأخرات خلال 30 يوما',
    en: 'Trimester average 9.45 / 20 · 5 late arrivals in 30 days',
  },
  'landing.preview.dir.alertAction': {
    fr: 'Signalement automatique',
    ar: 'تنبيه تلقائي',
    en: 'Auto-flagged',
  },
  'landing.preview.dir.rcStudent': {
    fr: 'Lina Benali · 4AP-A',
    ar: 'لينة بن علي · 4 ابتدائي أ',
    en: 'Lina Benali · 4AP-A',
  },
  'landing.preview.dir.rcMention': {
    fr: 'تهنئة · Félicitations',
    ar: 'تهنئة · Félicitations',
    en: 'تهنئة · Congratulations',
  },
  'landing.preview.dir.rcAvg': {
    fr: 'Moyenne : 16,42 / 20 · Rang : 2 / 28',
    ar: 'المعدل: 16.42 / 20 · الترتيب: 2 / 28',
    en: 'Average: 16.42 / 20 · Rank: 2 / 28',
  },
  'landing.preview.dir.rcVerify': {
    fr: 'QR vérifiable publiquement (/verify) : les notes détaillées restent confidentielles, le document est infalsifiable.',
    ar: 'رمز QR للتحقق العام: النقاط التفصيلية تبقى سرية والوثيقة محمية من التزوير.',
    en: 'Public QR check (/verify): subject details remain private while the issued card is tamper-proof.',
  },
  'landing.preview.tch.header': {
    fr: 'Classe 2AM-A · Mathématiques (Coeff. 3)',
    ar: 'القسم 2 متوسط أ · الرياضيات (المعامل 3)',
    en: 'Class 2AM-A · Mathematics (Coeff. 3)',
  },
  'landing.preview.tch.scope': {
    fr: 'Accès strict : uniquement vos classes et votre matière',
    ar: 'صلاحية مقيدة: أقسامك ومادتك فقط',
    en: 'Strict scope: only your classes and subject',
  },
  'landing.preview.tch.hint': {
    fr: 'Cliquez sur Présent / Absent / Retard pour tester l\'appel en direct :',
    ar: 'انقر على حاضر / غائب / متأخر لتجربة المناداة الفورية:',
    en: 'Click Present / Absent / Late to test live roll call:',
  },
  'landing.preview.tch.present': {
    fr: 'Présent',
    ar: 'حاضر',
    en: 'Present',
  },
  'landing.preview.tch.absent': {
    fr: 'Absent',
    ar: 'غائب',
    en: 'Absent',
  },
  'landing.preview.tch.late': {
    fr: 'Retard',
    ar: 'متأخر',
    en: 'Late',
  },
  'landing.preview.tch.liveSummary': {
    fr: '{present} présent(s) · {absent} absent(s) notifié(s) aux parents & déduit(s) de la cantine · {late} retard(s)',
    ar: '{present} حاضر · {absent} غائب يتم إشعار أوليائهم وخصمهم من المطعم · {late} متأخر',
    en: '{present} present · {absent} absent (parents alerted & canteen updated) · {late} late',
  },
  'landing.preview.tch.gradeCardTitle': {
    fr: 'Dernière note saisie',
    ar: 'آخر نقطة مسجلة',
    en: 'Latest grade entered',
  },
  'landing.preview.tch.gradePending': {
    fr: 'En attente de validation direction',
    ar: 'بانتظار مصادقة الإدارة',
    en: 'Pending administration approval',
  },
  'landing.preview.tch.hwTitle': {
    fr: 'Cahier de textes & Devoir',
    ar: 'دفتر النصوص والواجبات',
    en: 'Lesson diary & Homework',
  },
  'landing.preview.tch.hwCopy': {
    fr: 'Fractions et simplification : exercices 1 à 4 pour jeudi.',
    ar: 'الكسور والاختزال: التمارين 1 إلى 4 ليوم الخميس.',
    en: 'Fractions & simplification: exercises 1 to 4 due Thursday.',
  },
  'landing.preview.par.child1': {
    fr: 'Lina · 4AP-A',
    ar: 'لينة · 4 ابتدائي أ',
    en: 'Lina · 4AP-A',
  },
  'landing.preview.par.child2': {
    fr: 'Yacine · 2AM-B',
    ar: 'ياسين · 2 متوسط ب',
    en: 'Yacine · 2AM-B',
  },
  'landing.preview.par.avgLabel': {
    fr: 'Moyenne du trimestre',
    ar: 'معدل الفصل',
    en: 'Trimester average',
  },
  'landing.preview.par.push1Title': {
    fr: 'Transport scolaire · 07:42',
    ar: 'النقل المدرسي · 07:42',
    en: 'School bus · 07:42',
  },
  'landing.preview.par.push1BodyChild1': {
    fr: 'Lina est montée dans le bus (Ligne Hydra · Arrêt Parc).',
    ar: 'صعدت لينة إلى الحافلة (خط حيدرة · موقف الحديقة).',
    en: 'Lina boarded the bus (Hydra Line · Park Stop).',
  },
  'landing.preview.par.push1BodyChild2': {
    fr: 'Yacine a été déposé à l\'école à 07:54.',
    ar: 'تم إنزال ياسين بالمدرسة على الساعة 07:54.',
    en: 'Yacine was dropped off at school at 07:54.',
  },
  'landing.preview.par.push2Title': {
    fr: 'Frais scolaires · Reçu PDF',
    ar: 'المصاريف المدرسية · وصل PDF',
    en: 'School fees · PDF Receipt',
  },
  'landing.preview.par.push2Body': {
    fr: 'Paiement BaridiMob 18 000 DA validé · Reçu #REC-2026-418 disponible.',
    ar: 'تم تأكيد دفع بريدي موب 18,000 دج · الوصل متاح للتحميل.',
    en: 'BaridiMob payment 18,000 DZD confirmed · Receipt #REC-2026-418 ready.',
  },
  'landing.preview.par.action1': {
    fr: 'Justifier une absence',
    ar: 'تبرير غياب',
    en: 'Justify absence',
  },
  'landing.preview.par.action2': {
    fr: 'Prévenir : pas de bus',
    ar: 'إبلاغ: لا حافلة اليوم',
    en: 'Notify: no bus today',
  },
  'landing.preview.par.action3': {
    fr: 'Réserver RDV prof',
    ar: 'حجز موعد أستاذ',
    en: 'Book teacher meeting',
  },
  'landing.preview.par.menuTitle': {
    fr: 'Menu cantine · Aujourd\'hui',
    ar: 'قائمة المطعم · اليوم',
    en: 'Canteen menu · Today',
  },
  'landing.preview.par.menuBody': {
    fr: 'Soupe de légumes · Poulet rôti & riz · Fruit · Allergènes signalés',
    ar: 'حساء خضار · دجاج مشوي وأرز · فاكهة · مع تنبيه مسببات الحساسية',
    en: 'Vegetable soup · Roast chicken & rice · Fruit · Allergens tagged',
  },
  'landing.preview.srv.busTitle': {
    fr: 'Chauffeur · Ligne Hydra (Matin)',
    ar: 'السائق · خط حيدرة (صباحا)',
    en: 'Driver · Hydra Route (Morning)',
  },
  'landing.preview.srv.offlineBadge': {
    fr: 'Mode hors-ligne actif · Sync auto',
    ar: 'الوضع دون اتصال مفعل · مزامنة تلقائية',
    en: 'Offline queue ready · Auto sync',
  },
  'landing.preview.srv.busHint': {
    fr: 'Testez le verrou anti-oubli : pointez « Déposé » sur l\'élève encore à bord :',
    ar: 'جرّب قفل منع النسيان: اضغط «نزل» للتلميذ الذي لا يزال على متن الحافلة:',
    en: 'Test the safety lock: check off the student still on board as dropped off:',
  },
  'landing.preview.srv.boarded': {
    fr: 'Monté',
    ar: 'صعد',
    en: 'Boarded',
  },
  'landing.preview.srv.dropped': {
    fr: 'Déposé',
    ar: 'نزل',
    en: 'Dropped off',
  },
  'landing.preview.srv.lockBlocked': {
    fr: 'Clôture bloquée : {count} élève(s) monté(s) sans descente pointée !',
    ar: 'الإغلاق محظور: {count} تلميذ مسجّل في الصعود دون تسجيل النزول!',
    en: 'Closure blocked: {count} student(s) boarded without drop-off!',
  },
  'landing.preview.srv.lockReady': {
    fr: 'Tous les élèves pointés descendus — clôture du trajet autorisée.',
    ar: 'تم تسجيل نزول جميع التلاميذ — يمكن إغلاق الرحلة بأمان.',
    en: 'All students dropped off — trip completion unlocked.',
  },
  'landing.preview.srv.delayBtn': {
    fr: 'Signaler retard +15 min aux parents',
    ar: 'إبلاغ الأولياء بتأخر +15 د',
    en: 'Send +15 min delay alert',
  },
  'landing.preview.srv.canteenTitle': {
    fr: 'Cuisine · Effectif exact du jour',
    ar: 'المطبخ · العدد الفعلي لليوم',
    en: 'Kitchen · Today\'s exact headcount',
  },
  'landing.preview.srv.canteenRegistered': {
    fr: 'Inscrits du jour',
    ar: 'المسجلون اليوم',
    en: 'Registered today',
  },
  'landing.preview.srv.canteenAbsent': {
    fr: 'Absents déduits (appel)',
    ar: 'الغائبون المخصومون',
    en: 'Absent deducted',
  },
  'landing.preview.srv.canteenMeals': {
    fr: 'Repas à préparer',
    ar: 'الوجبات للتحضير',
    en: 'Meals to prepare',
  },
  'landing.preview.srv.canteenDiets': {
    fr: 'Régimes & alertes : 3 Sans gluten · 2 Diabétique · 1 Alerte arachides',
    ar: 'الحميات والتنبيهات: 3 خالٍ من الغلوتين · 2 سكري · 1 حساسية فول سوداني',
    en: 'Diets & alerts: 3 Gluten-free · 2 Diabetic · 1 Peanut allergy alert',
  },
  'landing.compare.eyebrow': {
    fr: 'AVANT / APRÈS',
    ar: 'قبل وبعد',
    en: 'BEFORE / AFTER',
  },
  'landing.compare.title': {
    fr: 'Pourquoi quitter WhatsApp et Excel pour Wasel Edu ?',
    ar: 'لماذا تنتقل من واتساب وإكسل إلى Wasel Edu؟',
    en: 'Why move from WhatsApp & Excel to Wasel Edu?',
  },
  'landing.compare.colTopic': {
    fr: 'Domaine',
    ar: 'المجال',
    en: 'Area',
  },
  'landing.compare.colOld': {
    fr: 'Gestion classique (WhatsApp + Excel)',
    ar: 'التسيير التقليدي (واتساب + إكسل)',
    en: 'Fragmented setup (WhatsApp + Excel)',
  },
  'landing.compare.colNew': {
    fr: 'Avec Wasel Edu',
    ar: 'مع Wasel Edu',
    en: 'With Wasel Edu',
  },
  'landing.compare.r1Topic': {
    fr: 'Vie privée & Messagerie',
    ar: 'الخصوصية والمراسلة',
    en: 'Privacy & Messaging',
  },
  'landing.compare.r1Old': {
    fr: 'Numéros personnels des profs exposés, messages à toute heure, parents qui s\'écrivent entre eux.',
    ar: 'أرقام الأساتذة مكشوفة، رسائل في كل وقت، وتدخلات بين الأولياء في المجموعات.',
    en: 'Teachers\' phone numbers exposed, late-night texts, parents messaging each other.',
  },
  'landing.compare.r1New': {
    fr: 'Messagerie encadrée avec accusés de lecture ; les parents ne peuvent jamais se contacter entre eux.',
    ar: 'مراسلة مؤطرة مع إشعار القراءة؛ ولا يمكن للأولياء مراسلة بعضهم أبدا.',
    en: 'Structured messaging with read receipts; parents can never message other parents.',
  },
  'landing.compare.r2Topic': {
    fr: 'Bulletins & Crédibilité',
    ar: 'كشوف النقاط والمصداقية',
    en: 'Report cards & Trust',
  },
  'landing.compare.r2Old': {
    fr: 'Ressaisie manuelle risquée, formules Excel fragiles et bulletins papier faciles à imiter.',
    ar: 'إعادة إدخال يدوية معرضة للأخطاء وكشوف ورقية يسهل التلاعب بها.',
    en: 'Manual re-entry errors, fragile spreadsheets and paper cards easy to forge.',
  },
  'landing.compare.r2New': {
    fr: 'Validation direction en 1 clic, publication figée avec logo de l\'école et QR code anti-falsification.',
    ar: 'مصادقة الإدارة بنقرة، إصدار مثبت بشعار المدرسة ورمز QR للتحقق من الأصالة.',
    en: '1-click principal approval, immutable snapshot with school logo and verification QR.',
  },
  'landing.compare.r3Topic': {
    fr: 'Écolage & Trésorerie',
    ar: 'المصاريف المدرسية والتحصيل',
    en: 'Tuition & Collections',
  },
  'landing.compare.r3Old': {
    fr: 'Carnets à souches, oublis d\'impayés et relances gênantes au téléphone.',
    ar: 'دفاتر ورقية، نسيان المتأخرات وإحراج الاتصالات الهاتفية للمطالبة بالدفع.',
    en: 'Paper receipt books, missed due dates and awkward reminder phone calls.',
  },
  'landing.compare.r3New': {
    fr: 'Reçus PDF instantanés (espèces, CCP/BaridiMob, chèque, virement) et rappels automatiques polis.',
    ar: 'وصولات PDF فورية (نقدا، CCP/بريدي موب، صك، تحويل) وتذكيرات تلقائية مهذبة.',
    en: 'Instant PDF receipts (cash, CCP/BaridiMob, cheque, transfer) and polite auto-reminders.',
  },
  'landing.compare.r4Topic': {
    fr: 'Cantine & Transport',
    ar: 'المطعم والنقل المدرسي',
    en: 'Canteen & Transport',
  },
  'landing.compare.r4Old': {
    fr: 'Repas gaspillés faute d\'absents à jour ; aucune traçabilité de montée/descente du bus.',
    ar: 'تبذير للوجبات لغياب قائمة الغائبين؛ وانعدام التتبع عند صعود ونزول الحافلة.',
    en: 'Wasted meals from stale lists; zero verification of bus boarding and drop-off.',
  },
  'landing.compare.r4New': {
    fr: 'Effectif cuisine calculé à l\'appel du matin ; pointage bus hors-ligne avec verrou anti-oubli.',
    ar: 'حساب وجبات المطبخ مع المناداة؛ تسجيل الحافلة دون اتصال مع قفل منع نسيان التلاميذ.',
    en: 'Kitchen headcount synced to roll call; offline bus check-in with forgotten-child lock.',
  },
  'landing.security.eyebrow': {
    fr: 'SÉCURITÉ & SOUVERAINETÉ',
    ar: 'الأمان والسيادة الرقمية',
    en: 'SECURITY & SOVEREIGNTY',
  },
  'landing.security.title': {
    fr: 'Vos données restent votre propriété exclusive',
    ar: 'بيانات مدرستكم ملكية حصرية ومحمية بالكامل',
    en: 'Your school data remains strictly yours',
  },
  'landing.security.s1Title': {
    fr: 'Isolation par école (RLS)',
    ar: 'عزل تام لكل مدرسة',
    en: 'Database isolation per school',
  },
  'landing.security.s1Copy': {
    fr: 'Chaque établissement dispose d\'un cloisonnement strict au niveau de PostgreSQL (Row-Level Security).',
    ar: 'كل مؤسسة معزولة برمجيا على مستوى قاعدة البيانات لمنع أي تداخل.',
    en: 'Strict school-level isolation enforced directly at the PostgreSQL layer.',
  },
  'landing.security.s2Title': {
    fr: 'Fiches santé chiffrées',
    ar: 'بطاقات صحية مشفرة',
    en: 'Encrypted health records',
  },
  'landing.security.s2Copy': {
    fr: 'Consentement parental tracé, chiffrement en base et alerte courte uniquement pour profs et chauffeurs.',
    ar: 'موافقة ولي الأمر مسجلة، تشفير في القاعدة وتنبيه مختصر فقط للأساتذة والسائقين.',
    en: 'Recorded parent consent, database encryption and short safety alerts only for staff.',
  },
  'landing.security.s3Title': {
    fr: 'Contrôle total des appareils',
    ar: 'تحكم فوري في الأجهزة',
    en: 'Instant session control',
  },
  'landing.security.s3Copy': {
    fr: 'Déconnectez à distance un enseignant ou un compte en 1 clic ; tout est consigné dans le journal d\'audit.',
    ar: 'تسجيل خروج فوري لأي جهاز عن بعد مع سجل نشاط شامل لكل العمليات.',
    en: 'Sign out any device remotely in 1 click; every action is logged in the audit trail.',
  },
  'landing.security.s4Title': {
    fr: 'Zéro publicité, zéro revente',
    ar: 'دون إعلانات أو بيع بيانات',
    en: 'Zero ads, zero data resale',
  },
  'landing.security.s4Copy': {
    fr: 'Aucune inscription libre : seuls les codes remis par votre administration ouvrent un accès parent ou prof.',
    ar: 'لا يوجد تسجيل عشوائي: الدخول يتم حصريا برموز QR أو PIN تسلمها الإدارة.',
    en: 'No open sign-up: only QR/PIN codes issued by your school grant access.',
  },
  'landing.finalCta.title': {
    fr: 'Prêt à moderniser votre établissement dès cette semaine ?',
    ar: 'هل أنت مستعد لتحديث تسيير مدرستك هذا الأسبوع؟',
    en: 'Ready to modernize your school this week?',
  },
  'landing.finalCta.copy': {
    fr: 'Créez l\'espace de votre école en 2 minutes, importez vos élèves par Excel et profitez de votre 1er trimestre offert — avec 2 mois bonus offerts en cas de parrainage.',
    ar: 'أنشئ فضاء مدرستك في دقيقتين، استورد التلاميذ عبر إكسل واستفد من الفصل الأول مجانا — مع شهرين إضافيين عند الترشيح.',
    en: 'Create your school space in 2 minutes, import students from Excel and enjoy your free first trimester — plus 2 bonus months via referral.',
  },
  'landing.footer.tagline': {
    fr: 'Plateforme web & mobile dédiée aux écoles privées en Algérie.',
    ar: 'منصة ويب وهاتف مخصصة للمدارس الخاصة في الجزائر.',
    en: 'Web & mobile platform built for private schools in Algeria.',
  },
  'landing.footer.linksTitle': {
    fr: 'Accès rapides',
    ar: 'روابط سريعة',
    en: 'Quick links',
  },
  'landing.footer.resourcesTitle': {
    fr: 'Ressources & Légal',
    ar: 'الموارد والقانون',
    en: 'Resources & Legal',
  },
  'landing.footer.activate': {
    fr: 'Activer un code (Parent / Prof)',
    ar: 'تفعيل رمز (ولي / أستاذ)',
    en: 'Activate code (Parent / Teacher)',
  },
  'landing.footer.policies': {
    fr: 'Confidentialité & Conditions',
    ar: 'الخصوصية وشروط الاستخدام',
    en: 'Privacy & Terms',
  },
  'landing.footer.pricingPage': {
    fr: 'Page Offre & Tarifs',
    ar: 'صفحة العرض والأسعار',
    en: 'Plans & Pricing page',
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
  'parent.nav.services': {
    fr: 'Services',
    ar: 'الخدمات',
    en: 'Services',
  },
  'modules.title': {
    fr: 'Modules optionnels',
    ar: 'الوحدات الاختيارية',
    en: 'Optional modules',
  },
  'modules.copy': {
    fr: 'Activez uniquement les services proposés par votre école. Les données sont conservées en cas de désactivation.',
    ar: 'فعّل فقط الخدمات المتوفرة في مدرستك. تبقى البيانات محفوظة عند التعطيل.',
    en: 'Enable only the services your school provides. Data is preserved if switched off.',
  },
  'modules.canteen': {
    fr: 'Cantine scolaire',
    ar: 'المطعم المدرسي',
    en: 'School canteen',
  },
  'modules.transport': {
    fr: 'Transport scolaire',
    ar: 'النقل المدرسي',
    en: 'School transport',
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
  'canteen.title': {
    fr: 'Cantine scolaire',
    ar: 'المطعم المدرسي',
    en: 'School canteen',
  },
  'canteen.copy': {
    fr: 'Menus de la semaine, inscriptions, effectif du jour avec alertes santé et facturation mensuelle.',
    ar: 'قائمة الأسبوع، التسجيلات، عدد الوجبات اليومي مع التنبيهات الصحية والفوترة الشهرية.',
    en: 'Weekly menus, registrations, daily kitchen headcount with health alerts, and monthly billing.',
  },
  'canteen.workerCopy': {
    fr: 'Consultez l\'effectif réel du jour (absents déduits), les régimes et gérez les menus de la semaine.',
    ar: 'اطلع على العدد الفعلي لليوم (بعد خصم الغائبين) والحميات الغذائية وأدر قوائم الأسبوع.',
    en: 'View today\'s real headcount (absentees excluded), diets, and manage weekly menus.',
  },
  'canteen.parentTitle': {
    fr: 'Inscription et menu de la semaine',
    ar: 'التسجيل وقائمة الأسبوع',
    en: 'Registration and weekly menu',
  },
  'canteen.tab.headcount': {
    fr: 'Effectif du jour',
    ar: 'عدد اليوم',
    en: 'Daily headcount',
  },
  'canteen.tab.menus': {
    fr: 'Menus',
    ar: 'قوائم الطعام',
    en: 'Menus',
  },
  'canteen.tab.enrollments': {
    fr: 'Inscriptions',
    ar: 'التسجيلات',
    en: 'Registrations',
  },
  'canteen.tab.billing': {
    fr: 'Facturation & tarifs',
    ar: 'الفوترة والأسعار',
    en: 'Billing & rates',
  },
  'canteen.menuSaved': {
    fr: 'Menu enregistré.',
    ar: 'تم حفظ القائمة.',
    en: 'Menu saved.',
  },
  'canteen.weekPublished': {
    fr: '{published} menu(s) publié(s), {notified} parent(s) notifié(s).',
    ar: 'تم نشر {published} قائمة وإشعار {notified} ولي.',
    en: '{published} menu(s) published, {notified} parent(s) notified.',
  },
  'canteen.enrollmentSaved': {
    fr: 'Inscription à la cantine enregistrée.',
    ar: 'تم حفظ التسجيل في المطعم.',
    en: 'Canteen registration saved.',
  },
  'canteen.enrollmentRemoved': {
    fr: 'Inscription supprimée.',
    ar: 'تم حذف التسجيل.',
    en: 'Registration removed.',
  },
  'canteen.settingsSaved': {
    fr: 'Tarifs de la cantine mis à jour.',
    ar: 'تم تحديث أسعار المطعم.',
    en: 'Canteen rates updated.',
  },
  'canteen.billedSuccess': {
    fr: '{label} : {created} facture(s) créée(s), {skipped} ignorée(s) — total {total}.',
    ar: '{label}: تم إنشاء {created} فاتورة وتجاهل {skipped} — المجموع {total}.',
    en: '{label}: {created} invoice(s) created, {skipped} skipped — total {total}.',
  },
  'canteen.printHeadcount': {
    fr: 'Imprimer pour la cuisine',
    ar: 'طباعة للمطبخ',
    en: 'Print for kitchen',
  },
  'canteen.notSchoolDay': {
    fr: 'Jour sans cantine (week-end ou vacances scolaires).',
    ar: 'يوم عطلة (نهاية الأسبوع أو عطلة مدرسية).',
    en: 'Non-school day (weekend or school holiday).',
  },
  'canteen.mealsExpected': {
    fr: 'Repas prévus',
    ar: 'الوجبات المتوقعة',
    en: 'Meals expected',
  },
  'canteen.absentDeducted': {
    fr: 'Absents déduits',
    ar: 'الغائبون المخصومون',
    en: 'Absentees deducted',
  },
  'canteen.specialDiets': {
    fr: 'Régimes particuliers',
    ar: 'حميات خاصة',
    en: 'Special diets',
  },
  'canteen.attendanceRoll': {
    fr: 'Appel de classe',
    ar: 'مناداة القسم',
    en: 'Class attendance',
  },
  'canteen.rollTaken': {
    fr: 'Appel fait',
    ar: 'تمت المناداة',
    en: 'Roll taken',
  },
  'canteen.rollPending': {
    fr: 'Appel non fait',
    ar: 'لم تتم المناداة بعد',
    en: 'Roll pending',
  },
  'canteen.noMealsToday': {
    fr: 'Aucun élève prévu ce jour.',
    ar: 'لا يوجد تلاميذ متوقعون في هذا اليوم.',
    en: 'No students expected on this day.',
  },
  'canteen.diet': {
    fr: 'Régime',
    ar: 'النظام الغذائي',
    en: 'Diet',
  },
  'canteen.diet.none': {
    fr: 'Standard',
    ar: 'عادي',
    en: 'Standard',
  },
  'canteen.diet.vegetarian': {
    fr: 'Végétarien',
    ar: 'نباتي',
    en: 'Vegetarian',
  },
  'canteen.diet.gluten_free': {
    fr: 'Sans gluten',
    ar: 'خالٍ من الغلوتين',
    en: 'Gluten-free',
  },
  'canteen.diet.diabetic': {
    fr: 'Diabétique',
    ar: 'مرض السكري',
    en: 'Diabetic',
  },
  'canteen.diet.other': {
    fr: 'Autre',
    ar: 'آخر',
    en: 'Other',
  },
  'canteen.dietNote': {
    fr: 'Précision régime',
    ar: 'ملاحظة النظام الغذائي',
    en: 'Diet note',
  },
  'canteen.publishWeek': {
    fr: 'Publier la semaine',
    ar: 'نشر قائمة الأسبوع',
    en: 'Publish week',
  },
  'canteen.starter': {
    fr: 'Entrée',
    ar: 'المقبلات',
    en: 'Starter',
  },
  'canteen.main': {
    fr: 'Plat principal',
    ar: 'الطبق الرئيسي',
    en: 'Main dish',
  },
  'canteen.dessert': {
    fr: 'Dessert',
    ar: 'التحلية',
    en: 'Dessert',
  },
  'canteen.allergens': {
    fr: 'Allergènes',
    ar: 'مسببات الحساسية',
    en: 'Allergens',
  },
  'canteen.note': {
    fr: 'Note',
    ar: 'ملاحظة',
    en: 'Note',
  },
  'canteen.published': {
    fr: 'Publié',
    ar: 'منشور',
    en: 'Published',
  },
  'canteen.draft': {
    fr: 'Brouillon',
    ar: 'مسودة',
    en: 'Draft',
  },
  'canteen.notPublished': {
    fr: 'Menu non publié',
    ar: 'القائمة غير منشورة',
    en: 'Menu not published',
  },
  'canteen.edit': {
    fr: 'Modifier',
    ar: 'تعديل',
    en: 'Edit',
  },
  'canteen.add': {
    fr: 'Ajouter',
    ar: 'إضافة',
    en: 'Add',
  },
  'canteen.enroll': {
    fr: 'Inscrire',
    ar: 'تسجيل',
    en: 'Register',
  },
  'canteen.weekday.0': { fr: 'Dimanche', ar: 'الأحد', en: 'Sunday' },
  'canteen.weekday.1': { fr: 'Lundi', ar: 'الإثنين', en: 'Monday' },
  'canteen.weekday.2': { fr: 'Mardi', ar: 'الثلاثاء', en: 'Tuesday' },
  'canteen.weekday.3': { fr: 'Mercredi', ar: 'الأربعاء', en: 'Wednesday' },
  'canteen.weekday.4': { fr: 'Jeudi', ar: 'الخميس', en: 'Thursday' },
  'canteen.weekdayShort.0': { fr: 'Dim', ar: 'أحد', en: 'Sun' },
  'canteen.weekdayShort.1': { fr: 'Lun', ar: 'إثنين', en: 'Mon' },
  'canteen.weekdayShort.2': { fr: 'Mar', ar: 'ثلاثاء', en: 'Tue' },
  'canteen.weekdayShort.3': { fr: 'Mer', ar: 'أربعاء', en: 'Wed' },
  'canteen.weekdayShort.4': { fr: 'Jeu', ar: 'خميس', en: 'Thu' },
  'canteen.allergen.gluten': { fr: 'Gluten', ar: 'غلوتين', en: 'Gluten' },
  'canteen.allergen.milk': { fr: 'Lait', ar: 'حليب', en: 'Milk' },
  'canteen.allergen.eggs': { fr: 'Œufs', ar: 'بيض', en: 'Eggs' },
  'canteen.allergen.peanuts': { fr: 'Arachides', ar: 'فول سوداني', en: 'Peanuts' },
  'canteen.allergen.nuts': { fr: 'Fruits à coque', ar: 'مكسرات', en: 'Tree nuts' },
  'canteen.allergen.fish': { fr: 'Poisson', ar: 'سمك', en: 'Fish' },
  'canteen.allergen.shellfish': { fr: 'Crustacés', ar: 'قشريات', en: 'Shellfish' },
  'canteen.allergen.soy': { fr: 'Soja', ar: 'صويا', en: 'Soy' },
  'canteen.allergen.sesame': { fr: 'Sésame', ar: 'سمسم', en: 'Sesame' },
  'canteen.allergen.celery': { fr: 'Céleri', ar: 'كرفس', en: 'Celery' },
  'canteen.allergen.mustard': { fr: 'Moutarde', ar: 'خردل', en: 'Mustard' },
  'canteen.allergen.sulphites': { fr: 'Sulfites', ar: 'كبريتيت', en: 'Sulphites' },
  'canteen.plan': {
    fr: 'Formule',
    ar: 'الصيغة',
    en: 'Plan',
  },
  'canteen.plan.monthly': {
    fr: 'Forfait mensuel',
    ar: 'اشتراك شهري',
    en: 'Monthly plan',
  },
  'canteen.plan.days': {
    fr: 'Jours choisis',
    ar: 'أيام محددة',
    en: 'Selected days',
  },
  'canteen.notEnrolled': {
    fr: 'Non inscrit',
    ar: 'غير مسجل',
    en: 'Not registered',
  },
  'canteen.weekdays': {
    fr: 'Jours de cantine',
    ar: 'أيام المطعم',
    en: 'Canteen days',
  },
  'canteen.startDate': {
    fr: 'Date de début',
    ar: 'تاريخ البداية',
    en: 'Start date',
  },
  'canteen.endDate': {
    fr: 'Date de fin (optionnel)',
    ar: 'تاريخ النهاية (اختياري)',
    en: 'End date (optional)',
  },
  'canteen.pricesTitle': {
    fr: 'Tarifs de la cantine',
    ar: 'أسعار المطعم',
    en: 'Canteen rates',
  },
  'canteen.pricesCopy': {
    fr: 'Définissez le forfait mensuel et le tarif par repas (utilisé pour les formules par jours).',
    ar: 'حدد الاشتراك الشهري وسعر الوجبة الواحدة (للأيام المحددة).',
    en: 'Set the monthly flat rate and per-day price (used for selected-days plans).',
  },
  'canteen.monthlyPrice': {
    fr: 'Tarif mensuel (DA)',
    ar: 'السعر الشهري (دج)',
    en: 'Monthly price (DZD)',
  },
  'canteen.dailyPrice': {
    fr: 'Tarif par jour (DA)',
    ar: 'السعر اليومي (دج)',
    en: 'Daily price (DZD)',
  },
  'canteen.billMonthTitle': {
    fr: 'Générer les factures du mois',
    ar: 'إنشاء فواتير الشهر',
    en: 'Generate monthly invoices',
  },
  'canteen.billMonthCopy': {
    fr: 'Crée les frais dans le module Écolage (sans double facturation si déjà lancé pour ce mois).',
    ar: 'ينشئ الفواتير في وحدة الرسوم (دون تكرار لنفس الشهر).',
    en: 'Creates fees in the Fees module (never bills the same student twice for the same month).',
  },
  'canteen.year': { fr: 'Année', ar: 'السنة', en: 'Year' },
  'canteen.month': { fr: 'Mois (1–12)', ar: 'الشهر (1-12)', en: 'Month (1–12)' },
  'canteen.runBilling': {
    fr: 'Facturer le mois',
    ar: 'فوترة الشهر',
    en: 'Bill month',
  },
  'canteen.currentPricesSummary': {
    fr: 'Tarifs actuels : {monthly} / mois · {daily} / jour',
    ar: 'الأسعار الحالية: {monthly} / شهر · {daily} / يوم',
    en: 'Current rates: {monthly} / month · {daily} / day',
  },
  'transport.title': {
    fr: 'Transport scolaire',
    ar: 'النقل المدرسي',
    en: 'School transport',
  },
  'transport.copy': {
    fr: 'Lignes de bus, arrêts, affectation des élèves, suivi des trajets et facturation.',
    ar: 'خطوط الحافلات، المواقف، توزيع التلاميذ، متابعة الرحلات والفوترة.',
    en: 'Bus lines, stops, student assignments, live trip monitoring and billing.',
  },
  'transport.driverTitle': {
    fr: 'Mes trajets du jour',
    ar: 'رحلاتي لليوم',
    en: 'Today\'s bus runs',
  },
  'transport.driverCopy': {
    fr: 'Pointez la montée et la descente des élèves à chaque arrêt. Les signalements des parents sont déjà déduits.',
    ar: 'سجّل صعود ونزول التلاميذ في كل موقف. إشعارات الأولياء بالغياب مخصومة مسبقاً.',
    en: 'Check students in and out at each stop. Parent notices are already deducted.',
  },
  'transport.tab.live': {
    fr: 'Suivi du jour',
    ar: 'المتابعة اليومية',
    en: 'Today\'s live view',
  },
  'transport.tab.routes': {
    fr: 'Lignes & arrêts',
    ar: 'الخطوط والمواقف',
    en: 'Routes & stops',
  },
  'transport.tab.assignments': {
    fr: 'Élèves affectés',
    ar: 'التلاميذ المسجلون',
    en: 'Student riders',
  },
  'transport.routeSaved': {
    fr: 'Ligne de transport enregistrée.',
    ar: 'تم حفظ خط النقل.',
    en: 'Bus route saved.',
  },
  'transport.stopSaved': {
    fr: 'Arrêt ajouté.',
    ar: 'تمت إضافة الموقف.',
    en: 'Stop added.',
  },
  'transport.assignmentSaved': {
    fr: 'Affectation enregistrée.',
    ar: 'تم حفظ التعيين.',
    en: 'Assignment saved.',
  },
  'transport.noRoutes': {
    fr: 'Aucune ligne de transport configurée.',
    ar: 'لم يتم إعداد أي خط نقل بعد.',
    en: 'No transport routes configured yet.',
  },
  'transport.direction.morning': { fr: 'Matin (aller)', ar: 'الصباح (ذهاب)', en: 'Morning' },
  'transport.direction.evening': { fr: 'Soir (retour)', ar: 'المساء (إياب)', en: 'Evening' },
  'transport.direction.both': { fr: 'Matin et soir', ar: 'ذهاب وإياب', en: 'Morning & evening' },
  'transport.directionLabel': { fr: 'Trajet', ar: 'الاتجاه', en: 'Direction' },
  'transport.tripStatus.planned': { fr: 'Non démarré', ar: 'لم تبدأ', en: 'Not started' },
  'transport.tripStatus.in_progress': { fr: 'En cours', ar: 'جارية', en: 'In progress' },
  'transport.tripStatus.completed': { fr: 'Terminé', ar: 'مكتملة', en: 'Completed' },
  'transport.liveCounts': {
    fr: '{expected} attendu(s) · {boarded} à bord · {dropped} déposé(s) · {exceptions} absence(s) prévenue(s)',
    ar: '{expected} منتظر · {boarded} على متن الحافلة · {dropped} تم إنزاله · {exceptions} غياب مُبلّغ',
    en: '{expected} expected · {boarded} on board · {dropped} dropped · {exceptions} excused',
  },
  'transport.delayedMinutes': {
    fr: 'Retard signalé : {minutes} min',
    ar: 'تأخر مُبلّغ: {minutes} دقيقة',
    en: 'Delay reported: {minutes} min',
  },
  'transport.unaccountedAlert': {
    fr: '{count} élève(s) monté(s) sans descente pointée !',
    ar: '{count} تلميذ صعد دون تسجيل نزوله!',
    en: '{count} student(s) boarded without drop-off check-in!',
  },
  'transport.newRoute': { fr: 'Nouvelle ligne', ar: 'خط جديد', en: 'New route' },
  'transport.routeName': { fr: 'Nom de la ligne', ar: 'اسم الخط', en: 'Route name' },
  'transport.vehiclePlate': { fr: 'Immatriculation du bus', ar: 'لوحة ترقيم الحافلة', en: 'Vehicle plate' },
  'transport.capacity': { fr: 'Capacité (places)', ar: 'السعة (مقاعد)', en: 'Capacity (seats)' },
  'transport.routeActive': { fr: 'Ligne active', ar: 'خط نشط', en: 'Active route' },
  'transport.route': { fr: 'Ligne', ar: 'الخط', en: 'Route' },
  'transport.addStop': { fr: 'Ajouter un arrêt', ar: 'إضافة موقف', en: 'Add stop' },
  'transport.stopName': { fr: 'Arrêt', ar: 'الموقف', en: 'Stop' },
  'transport.stopOrder': { fr: 'Ordre sur le trajet', ar: 'الترتيب', en: 'Stop order' },
  'transport.morningTime': { fr: 'Heure matin (HH:MM)', ar: 'توقيت الصباح (HH:MM)', en: 'Morning time (HH:MM)' },
  'transport.eveningTime': { fr: 'Heure soir (HH:MM)', ar: 'توقيت المساء (HH:MM)', en: 'Evening time (HH:MM)' },
  'transport.noStops': { fr: 'Aucun arrêt défini.', ar: 'لا توجد مواقف محددة.', en: 'No stops defined.' },
  'transport.assign': { fr: 'Affecter', ar: 'تعيين', en: 'Assign' },
  'transport.billMonthTitle': {
    fr: 'Facturer le transport du mois',
    ar: 'فوترة النقل للشهر',
    en: 'Bill monthly transport',
  },
  'transport.billMonthCopy': {
    fr: 'Génère une facture par élève affecté selon le tarif mensuel de sa ligne (sans double facturation).',
    ar: 'ينشئ فاتورة لكل تلميذ حسب السعر الشهري لخطه (دون تكرار).',
    en: 'Bills each assigned student based on their route\'s monthly fee (idempotent per month).',
  },
  'transport.offlineQueued': {
    fr: 'Hors connexion : pointage enregistré localement, prêt à être synchronisé.',
    ar: 'دون اتصال: تم حفظ التسجيل محلياً وسيتم إرساله عند عودة الشبكة.',
    en: 'Offline: check-in saved locally and queued for sync.',
  },
  'transport.delaySent': {
    fr: 'Alerte de retard envoyée à {count} parent(s).',
    ar: 'تم إرسال تنبيه التأخر إلى {count} ولي.',
    en: 'Delay notice sent to {count} parent(s).',
  },
  'transport.tripCompleted': {
    fr: 'Trajet clôturé.',
    ar: 'تم إغلاق الرحلة.',
    en: 'Trip completed.',
  },
  'transport.forgottenChildWarning': {
    fr: 'Attention : {count} élève(s) sont pointé(s) monté(s) mais pas descendu(s). Vérifiez le bus avant de clôturer.',
    ar: 'تنبيه: {count} تلميذ مسجّل في الصعود دون تسجيل النزول. تفقد الحافلة قبل الإغلاق.',
    en: 'Warning: {count} student(s) boarded without a drop-off check-in. Inspect the bus before closing.',
  },
  'transport.forceComplete': {
    fr: 'Clôturer et alerter l\'administration',
    ar: 'إغلاق وإرسال تنبيه للإدارة',
    en: 'Close and alert administration',
  },
  'transport.syncQueue': {
    fr: 'Synchroniser ({count})',
    ar: 'مزامنة ({count})',
    en: 'Sync ({count})',
  },
  'transport.noDriverRoutes': {
    fr: 'Aucune ligne active ne vous est attribuée pour le moment.',
    ar: 'لا يوجد أي خط نشط مسند إليك حالياً.',
    en: 'No active routes assigned to you right now.',
  },
  'transport.startTrip': { fr: 'Démarrer le trajet', ar: 'بدء الرحلة', en: 'Start trip' },
  'transport.reportDelay15': { fr: 'Retard +15 min', ar: 'تأخر +15 د', en: 'Delay +15 min' },
  'transport.completeTrip': { fr: 'Clôturer le trajet', ar: 'إنهاء الرحلة', en: 'Complete trip' },
  'transport.noStudentsAtStop': { fr: 'Aucun élève attendu à cet arrêt.', ar: 'لا يوجد تلاميذ منتظرون في هذا الموقف.', en: 'No students expected at this stop.' },
  'transport.exceptionsList': { fr: 'Absences annoncées par les parents', ar: 'غيابات مُبلّغة من الأولياء', en: 'Parent-reported absences' },
  'transport.studentState.pending': { fr: 'Attendu', ar: 'في الانتظار', en: 'Expected' },
  'transport.studentState.boarded': { fr: 'Monté', ar: 'صعد', en: 'Boarded' },
  'transport.studentState.dropped': { fr: 'Déposé', ar: 'نزل', en: 'Dropped off' },
  'transport.studentState.no_show': { fr: 'Absent arrêt', ar: 'غائب عن الموقف', en: 'No-show' },
  'transport.action.boarded': { fr: 'Monté', ar: 'صعد', en: 'Boarded' },
  'transport.action.dropped': { fr: 'Déposé', ar: 'نزل', en: 'Dropped off' },
  'transport.action.no_show': { fr: 'Absent', ar: 'غائب', en: 'Absent' },
  'transport.parentNotAssigned': {
    fr: 'Cet élève n\'est pas inscrit au transport scolaire.',
    ar: 'هذا التلميذ غير مسجل في النقل المدرسي.',
    en: 'This student is not assigned to school transport.',
  },
  'transport.declareAbsenceTitle': {
    fr: 'Prévenir : pas de bus aujourd\'hui / prochainement',
    ar: 'إبلاغ: لن يستقل الحافلة',
    en: 'Notify: no bus on this day',
  },
  'transport.absenceReasonPlaceholder': {
    fr: 'Motif (optionnel, ex. je viens le chercher)',
    ar: 'السبب (اختياري، مثلاً سأصطحبه بنفسي)',
    en: 'Reason (optional, e.g. picking up directly)',
  },
  'transport.declareAbsenceBtn': {
    fr: 'Prévenir le chauffeur',
    ar: 'إبلاغ السائق',
    en: 'Notify driver',
  },
  'transport.exceptionSaved': {
    fr: 'Le chauffeur a été prévenu.',
    ar: 'تم إبلاغ السائق.',
    en: 'The driver has been notified.',
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
