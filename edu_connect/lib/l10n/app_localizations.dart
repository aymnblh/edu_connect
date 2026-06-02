import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_ar.dart';
import 'app_localizations_en.dart';
import 'app_localizations_fr.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'l10n/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale)
      : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations? of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations);
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
    delegate,
    GlobalMaterialLocalizations.delegate,
    GlobalCupertinoLocalizations.delegate,
    GlobalWidgetsLocalizations.delegate,
  ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[
    Locale('ar'),
    Locale('en'),
    Locale('fr')
  ];

  /// No description provided for @appTitle.
  ///
  /// In en, this message translates to:
  /// **'Wasel Edu'**
  String get appTitle;

  /// No description provided for @login.
  ///
  /// In en, this message translates to:
  /// **'Login'**
  String get login;

  /// No description provided for @email.
  ///
  /// In en, this message translates to:
  /// **'Email'**
  String get email;

  /// No description provided for @password.
  ///
  /// In en, this message translates to:
  /// **'Password'**
  String get password;

  /// No description provided for @welcome.
  ///
  /// In en, this message translates to:
  /// **'Welcome back'**
  String get welcome;

  /// No description provided for @teacherDashboard.
  ///
  /// In en, this message translates to:
  /// **'Teacher Dashboard'**
  String get teacherDashboard;

  /// No description provided for @parentDashboard.
  ///
  /// In en, this message translates to:
  /// **'Parent Dashboard'**
  String get parentDashboard;

  /// No description provided for @classList.
  ///
  /// In en, this message translates to:
  /// **'Class List'**
  String get classList;

  /// No description provided for @notifications.
  ///
  /// In en, this message translates to:
  /// **'Notifications'**
  String get notifications;

  /// No description provided for @profile.
  ///
  /// In en, this message translates to:
  /// **'Profile'**
  String get profile;

  /// No description provided for @chat.
  ///
  /// In en, this message translates to:
  /// **'Chat'**
  String get chat;

  /// No description provided for @grades.
  ///
  /// In en, this message translates to:
  /// **'Grades'**
  String get grades;

  /// No description provided for @attendance.
  ///
  /// In en, this message translates to:
  /// **'Attendance'**
  String get attendance;

  /// No description provided for @homework.
  ///
  /// In en, this message translates to:
  /// **'Homework'**
  String get homework;

  /// No description provided for @remarks.
  ///
  /// In en, this message translates to:
  /// **'Remarks'**
  String get remarks;

  /// No description provided for @add.
  ///
  /// In en, this message translates to:
  /// **'Add'**
  String get add;

  /// No description provided for @save.
  ///
  /// In en, this message translates to:
  /// **'Save'**
  String get save;

  /// No description provided for @cancel.
  ///
  /// In en, this message translates to:
  /// **'Cancel'**
  String get cancel;

  /// No description provided for @error.
  ///
  /// In en, this message translates to:
  /// **'An error occurred'**
  String get error;

  /// No description provided for @loading.
  ///
  /// In en, this message translates to:
  /// **'Loading...'**
  String get loading;

  /// No description provided for @noData.
  ///
  /// In en, this message translates to:
  /// **'No data found'**
  String get noData;

  /// No description provided for @markAllAsRead.
  ///
  /// In en, this message translates to:
  /// **'Mark all as read'**
  String get markAllAsRead;

  /// No description provided for @history.
  ///
  /// In en, this message translates to:
  /// **'History'**
  String get history;

  /// No description provided for @justified.
  ///
  /// In en, this message translates to:
  /// **'Justified'**
  String get justified;

  /// No description provided for @present.
  ///
  /// In en, this message translates to:
  /// **'Present'**
  String get present;

  /// No description provided for @absent.
  ///
  /// In en, this message translates to:
  /// **'Absent'**
  String get absent;

  /// No description provided for @late.
  ///
  /// In en, this message translates to:
  /// **'Late'**
  String get late;

  /// No description provided for @presentS.
  ///
  /// In en, this message translates to:
  /// **'P'**
  String get presentS;

  /// No description provided for @lateS.
  ///
  /// In en, this message translates to:
  /// **'L'**
  String get lateS;

  /// No description provided for @absentS.
  ///
  /// In en, this message translates to:
  /// **'A'**
  String get absentS;

  /// No description provided for @noStudents.
  ///
  /// In en, this message translates to:
  /// **'No students yet'**
  String get noStudents;

  /// No description provided for @studentsJoinViaCode.
  ///
  /// In en, this message translates to:
  /// **'Students join via the class code.'**
  String get studentsJoinViaCode;

  /// No description provided for @announcements.
  ///
  /// In en, this message translates to:
  /// **'Announcements'**
  String get announcements;

  /// No description provided for @writeMessage.
  ///
  /// In en, this message translates to:
  /// **'Write a message...'**
  String get writeMessage;

  /// No description provided for @writeAnnouncement.
  ///
  /// In en, this message translates to:
  /// **'Write an announcement...'**
  String get writeAnnouncement;

  /// No description provided for @noMessages.
  ///
  /// In en, this message translates to:
  /// **'No messages yet'**
  String get noMessages;

  /// No description provided for @noAnnouncements.
  ///
  /// In en, this message translates to:
  /// **'No announcements yet'**
  String get noAnnouncements;

  /// No description provided for @startConversation.
  ///
  /// In en, this message translates to:
  /// **'Start the conversation!'**
  String get startConversation;

  /// No description provided for @teachersPostAnnouncements.
  ///
  /// In en, this message translates to:
  /// **'Teachers can post announcements here.'**
  String get teachersPostAnnouncements;

  /// No description provided for @deleteMessage.
  ///
  /// In en, this message translates to:
  /// **'Delete message?'**
  String get deleteMessage;

  /// No description provided for @deleteMessageConfirm.
  ///
  /// In en, this message translates to:
  /// **'This will remove the message for everyone.'**
  String get deleteMessageConfirm;

  /// No description provided for @delete.
  ///
  /// In en, this message translates to:
  /// **'Delete'**
  String get delete;

  /// No description provided for @textbook.
  ///
  /// In en, this message translates to:
  /// **'Textbook'**
  String get textbook;

  /// No description provided for @newLabel.
  ///
  /// In en, this message translates to:
  /// **'New'**
  String get newLabel;

  /// No description provided for @createNewClass.
  ///
  /// In en, this message translates to:
  /// **'Create a New Class'**
  String get createNewClass;

  /// No description provided for @upcoming.
  ///
  /// In en, this message translates to:
  /// **'Upcoming'**
  String get upcoming;

  /// No description provided for @completed.
  ///
  /// In en, this message translates to:
  /// **'Completed'**
  String get completed;

  /// No description provided for @createAccount.
  ///
  /// In en, this message translates to:
  /// **'Create Account'**
  String get createAccount;

  /// No description provided for @joinEduConnect.
  ///
  /// In en, this message translates to:
  /// **'Join Wasel Edu today'**
  String get joinEduConnect;

  /// No description provided for @fullName.
  ///
  /// In en, this message translates to:
  /// **'Full Name'**
  String get fullName;

  /// No description provided for @alreadyHaveAccount.
  ///
  /// In en, this message translates to:
  /// **'Already have an account?'**
  String get alreadyHaveAccount;

  /// No description provided for @signIn.
  ///
  /// In en, this message translates to:
  /// **'Sign In'**
  String get signIn;

  /// No description provided for @signOut.
  ///
  /// In en, this message translates to:
  /// **'Sign Out'**
  String get signOut;

  /// No description provided for @createClass.
  ///
  /// In en, this message translates to:
  /// **'Create Class'**
  String get createClass;

  /// No description provided for @joinClass.
  ///
  /// In en, this message translates to:
  /// **'Join Class'**
  String get joinClass;

  /// No description provided for @joinCode.
  ///
  /// In en, this message translates to:
  /// **'Join Code'**
  String get joinCode;

  /// No description provided for @classCreated.
  ///
  /// In en, this message translates to:
  /// **'Class Created! 🎉'**
  String get classCreated;

  /// No description provided for @shareJoinCode.
  ///
  /// In en, this message translates to:
  /// **'Share this join code with parents:'**
  String get shareJoinCode;

  /// No description provided for @goToClasses.
  ///
  /// In en, this message translates to:
  /// **'Go to Classes'**
  String get goToClasses;

  /// No description provided for @enrolled.
  ///
  /// In en, this message translates to:
  /// **'enrolled'**
  String get enrolled;

  /// No description provided for @successfullyJoined.
  ///
  /// In en, this message translates to:
  /// **'Successfully joined the class! 🎉'**
  String get successfullyJoined;

  /// No description provided for @enterJoinCode.
  ///
  /// In en, this message translates to:
  /// **'Enter the 6-character join code provided by your child\'s teacher.'**
  String get enterJoinCode;

  /// No description provided for @teacher.
  ///
  /// In en, this message translates to:
  /// **'Teacher'**
  String get teacher;

  /// No description provided for @parent.
  ///
  /// In en, this message translates to:
  /// **'Parent'**
  String get parent;

  /// No description provided for @myAttendance.
  ///
  /// In en, this message translates to:
  /// **'My Attendance'**
  String get myAttendance;

  /// No description provided for @noHistory.
  ///
  /// In en, this message translates to:
  /// **'No history yet'**
  String get noHistory;

  /// No description provided for @gradeBulletin.
  ///
  /// In en, this message translates to:
  /// **'Grade Bulletin'**
  String get gradeBulletin;

  /// No description provided for @generatePdf.
  ///
  /// In en, this message translates to:
  /// **'Generate & Share PDF'**
  String get generatePdf;

  /// No description provided for @student.
  ///
  /// In en, this message translates to:
  /// **'Student'**
  String get student;

  /// No description provided for @observation.
  ///
  /// In en, this message translates to:
  /// **'Observation'**
  String get observation;

  /// No description provided for @subject.
  ///
  /// In en, this message translates to:
  /// **'Subject'**
  String get subject;

  /// No description provided for @connectingSchoolsFamilies.
  ///
  /// In en, this message translates to:
  /// **'Connecting schools & families'**
  String get connectingSchoolsFamilies;

  /// No description provided for @absenceLateJustified.
  ///
  /// In en, this message translates to:
  /// **'Absence / Late justified'**
  String get absenceLateJustified;

  /// No description provided for @justifyAbsence.
  ///
  /// In en, this message translates to:
  /// **'Justify this absence'**
  String get justifyAbsence;

  /// No description provided for @reason.
  ///
  /// In en, this message translates to:
  /// **'Reason'**
  String get reason;

  /// No description provided for @detailedReason.
  ///
  /// In en, this message translates to:
  /// **'Detailed reason...'**
  String get detailedReason;

  /// No description provided for @sendJustification.
  ///
  /// In en, this message translates to:
  /// **'Send justification'**
  String get sendJustification;

  /// No description provided for @scanQrCode.
  ///
  /// In en, this message translates to:
  /// **'Scan QR Code'**
  String get scanQrCode;

  /// No description provided for @linkStudent.
  ///
  /// In en, this message translates to:
  /// **'Link Student'**
  String get linkStudent;

  /// No description provided for @manualEntry.
  ///
  /// In en, this message translates to:
  /// **'Manual Entry (PIN)'**
  String get manualEntry;

  /// No description provided for @linkingMethodTitle.
  ///
  /// In en, this message translates to:
  /// **'Link your child'**
  String get linkingMethodTitle;

  /// No description provided for @linkingMethodDesc.
  ///
  /// In en, this message translates to:
  /// **'Choose a linking method to start following your child\'s progress.'**
  String get linkingMethodDesc;

  /// No description provided for @qrLinkSuccess.
  ///
  /// In en, this message translates to:
  /// **'Student linked successfully! 🎉'**
  String get qrLinkSuccess;

  /// No description provided for @averageScore.
  ///
  /// In en, this message translates to:
  /// **'Average Score'**
  String get averageScore;

  /// No description provided for @attendanceRate.
  ///
  /// In en, this message translates to:
  /// **'Attendance'**
  String get attendanceRate;

  /// No description provided for @noGradesYet.
  ///
  /// In en, this message translates to:
  /// **'No grades this trimester'**
  String get noGradesYet;

  /// No description provided for @scanInstructions.
  ///
  /// In en, this message translates to:
  /// **'Position the QR code inside the frame to scan'**
  String get scanInstructions;

  /// No description provided for @manageStudents.
  ///
  /// In en, this message translates to:
  /// **'Manage Students'**
  String get manageStudents;

  /// No description provided for @searchPlaceholder.
  ///
  /// In en, this message translates to:
  /// **'Search by name or ID...'**
  String get searchPlaceholder;

  /// No description provided for @noStudentsFound.
  ///
  /// In en, this message translates to:
  /// **'No students found.'**
  String get noStudentsFound;

  /// No description provided for @noMatchingStudents.
  ///
  /// In en, this message translates to:
  /// **'No matching students found.'**
  String get noMatchingStudents;

  /// No description provided for @studentIdLabel.
  ///
  /// In en, this message translates to:
  /// **'ID: {id}'**
  String studentIdLabel(Object id);

  /// No description provided for @linked.
  ///
  /// In en, this message translates to:
  /// **'Linked'**
  String get linked;

  /// No description provided for @notLinked.
  ///
  /// In en, this message translates to:
  /// **'Not Linked'**
  String get notLinked;

  /// No description provided for @regeneratePin.
  ///
  /// In en, this message translates to:
  /// **'Regenerate PIN'**
  String get regeneratePin;

  /// No description provided for @signUp.
  ///
  /// In en, this message translates to:
  /// **'Sign Up'**
  String get signUp;

  /// No description provided for @noAccountQuestion.
  ///
  /// In en, this message translates to:
  /// **'Don\'t have an account?'**
  String get noAccountQuestion;

  /// No description provided for @enrollmentCode.
  ///
  /// In en, this message translates to:
  /// **'Enrollment Code'**
  String get enrollmentCode;

  /// No description provided for @success.
  ///
  /// In en, this message translates to:
  /// **'Success'**
  String get success;

  /// No description provided for @confirmRegeneratePin.
  ///
  /// In en, this message translates to:
  /// **'Are you sure you want to generate a new PIN for {name}? The old PIN will stop working.'**
  String confirmRegeneratePin(Object name);

  /// No description provided for @newPinGenerated.
  ///
  /// In en, this message translates to:
  /// **'New PIN Generated'**
  String get newPinGenerated;

  /// No description provided for @shareNewPin.
  ///
  /// In en, this message translates to:
  /// **'Please share this new PIN with the parent:'**
  String get shareNewPin;

  /// No description provided for @serverUnavailable.
  ///
  /// In en, this message translates to:
  /// **'Unable to reach the server. Check Wi-Fi and make sure the backend is running.'**
  String get serverUnavailable;

  /// No description provided for @invalidCredentials.
  ///
  /// In en, this message translates to:
  /// **'Incorrect email or password.'**
  String get invalidCredentials;

  /// No description provided for @accountForbidden.
  ///
  /// In en, this message translates to:
  /// **'Account not authorized or school not active.'**
  String get accountForbidden;

  /// No description provided for @unknown.
  ///
  /// In en, this message translates to:
  /// **'unknown'**
  String get unknown;

  /// No description provided for @serverErrorWithCode.
  ///
  /// In en, this message translates to:
  /// **'Server error ({code}).'**
  String serverErrorWithCode(Object code);

  /// No description provided for @loginWithCodeQr.
  ///
  /// In en, this message translates to:
  /// **'Sign in with Code / QR'**
  String get loginWithCodeQr;

  /// No description provided for @inviteOnlyInfo.
  ///
  /// In en, this message translates to:
  /// **'Your account is created by your school administrator. On your first login, you will be asked to set your password.'**
  String get inviteOnlyInfo;

  /// No description provided for @registerSchoolCta.
  ///
  /// In en, this message translates to:
  /// **'Register my school'**
  String get registerSchoolCta;

  /// No description provided for @unstableConnection.
  ///
  /// In en, this message translates to:
  /// **'Unstable connection'**
  String get unstableConnection;

  /// No description provided for @retry.
  ///
  /// In en, this message translates to:
  /// **'Retry'**
  String get retry;
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['ar', 'en', 'fr'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'ar':
      return AppLocalizationsAr();
    case 'en':
      return AppLocalizationsEn();
    case 'fr':
      return AppLocalizationsFr();
  }

  throw FlutterError(
      'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
      'an issue with the localizations generation tool. Please file an issue '
      'on GitHub with a reproducible sample app and the gen-l10n configuration '
      'that was used.');
}
