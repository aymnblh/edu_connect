// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get appTitle => 'Wasel Edu';

  @override
  String get login => 'Login';

  @override
  String get email => 'Email';

  @override
  String get password => 'Password';

  @override
  String get welcome => 'Welcome back';

  @override
  String get teacherDashboard => 'Teacher Dashboard';

  @override
  String get parentDashboard => 'Parent Dashboard';

  @override
  String get classList => 'Class List';

  @override
  String get notifications => 'Notifications';

  @override
  String get profile => 'Profile';

  @override
  String get chat => 'Chat';

  @override
  String get grades => 'Grades';

  @override
  String get attendance => 'Attendance';

  @override
  String get homework => 'Homework';

  @override
  String get remarks => 'Remarks';

  @override
  String get add => 'Add';

  @override
  String get save => 'Save';

  @override
  String get cancel => 'Cancel';

  @override
  String get error => 'An error occurred';

  @override
  String get loading => 'Loading...';

  @override
  String get noData => 'No data found';

  @override
  String get markAllAsRead => 'Mark all as read';

  @override
  String get history => 'History';

  @override
  String get justified => 'Justified';

  @override
  String get present => 'Present';

  @override
  String get absent => 'Absent';

  @override
  String get late => 'Late';

  @override
  String get presentS => 'P';

  @override
  String get lateS => 'L';

  @override
  String get absentS => 'A';

  @override
  String get noStudents => 'No students yet';

  @override
  String get studentsJoinViaCode => 'Students join via the class code.';

  @override
  String get announcements => 'Announcements';

  @override
  String get writeMessage => 'Write a message...';

  @override
  String get writeAnnouncement => 'Write an announcement...';

  @override
  String get noMessages => 'No messages yet';

  @override
  String get noAnnouncements => 'No announcements yet';

  @override
  String get startConversation => 'Start the conversation!';

  @override
  String get teachersPostAnnouncements =>
      'Teachers can post announcements here.';

  @override
  String get deleteMessage => 'Delete message?';

  @override
  String get deleteMessageConfirm =>
      'This will remove the message for everyone.';

  @override
  String get delete => 'Delete';

  @override
  String get textbook => 'Textbook';

  @override
  String get newLabel => 'New';

  @override
  String get createNewClass => 'Create a New Class';

  @override
  String get upcoming => 'Upcoming';

  @override
  String get completed => 'Completed';

  @override
  String get createAccount => 'Create Account';

  @override
  String get joinEduConnect => 'Join Wasel Edu today';

  @override
  String get fullName => 'Full Name';

  @override
  String get alreadyHaveAccount => 'Already have an account?';

  @override
  String get signIn => 'Sign In';

  @override
  String get signOut => 'Sign Out';

  @override
  String get createClass => 'Create Class';

  @override
  String get joinClass => 'Join Class';

  @override
  String get joinCode => 'Join Code';

  @override
  String get classCreated => 'Class Created! 🎉';

  @override
  String get shareJoinCode => 'Share this join code with parents:';

  @override
  String get goToClasses => 'Go to Classes';

  @override
  String get enrolled => 'enrolled';

  @override
  String get successfullyJoined => 'Successfully joined the class! 🎉';

  @override
  String get enterJoinCode =>
      'Enter the 6-character join code provided by your child\'s teacher.';

  @override
  String get teacher => 'Teacher';

  @override
  String get parent => 'Parent';

  @override
  String get myAttendance => 'My Attendance';

  @override
  String get noHistory => 'No history yet';

  @override
  String get gradeBulletin => 'Grade Bulletin';

  @override
  String get generatePdf => 'Generate & Share PDF';

  @override
  String get student => 'Student';

  @override
  String get observation => 'Observation';

  @override
  String get subject => 'Subject';

  @override
  String get connectingSchoolsFamilies => 'Connecting schools & families';

  @override
  String get absenceLateJustified => 'Absence / Late justified';

  @override
  String get justifyAbsence => 'Justify this absence';

  @override
  String get reason => 'Reason';

  @override
  String get detailedReason => 'Detailed reason...';

  @override
  String get sendJustification => 'Send justification';

  @override
  String get scanQrCode => 'Scan QR Code';

  @override
  String get linkStudent => 'Link Student';

  @override
  String get manualEntry => 'Manual Entry (PIN)';

  @override
  String get linkingMethodTitle => 'Link your child';

  @override
  String get linkingMethodDesc =>
      'Choose a linking method to start following your child\'s progress.';

  @override
  String get qrLinkSuccess => 'Student linked successfully! 🎉';

  @override
  String get averageScore => 'Average Score';

  @override
  String get attendanceRate => 'Attendance';

  @override
  String get noGradesYet => 'No grades this trimester';

  @override
  String get scanInstructions =>
      'Position the QR code inside the frame to scan';

  @override
  String get manageStudents => 'Manage Students';

  @override
  String get searchPlaceholder => 'Search by name or ID...';

  @override
  String get noStudentsFound => 'No students found.';

  @override
  String get noMatchingStudents => 'No matching students found.';

  @override
  String studentIdLabel(Object id) {
    return 'ID: $id';
  }

  @override
  String get linked => 'Linked';

  @override
  String get notLinked => 'Not Linked';

  @override
  String get regeneratePin => 'Regenerate PIN';

  @override
  String get signUp => 'Sign Up';

  @override
  String get noAccountQuestion => 'Don\'t have an account?';

  @override
  String get enrollmentCode => 'Enrollment Code';

  @override
  String get success => 'Success';

  @override
  String confirmRegeneratePin(Object name) {
    return 'Are you sure you want to generate a new PIN for $name? The old PIN will stop working.';
  }

  @override
  String get newPinGenerated => 'New PIN Generated';

  @override
  String get shareNewPin => 'Please share this new PIN with the parent:';

  @override
  String get serverUnavailable =>
      'Unable to reach the server. Check Wi-Fi and make sure the backend is running.';

  @override
  String get invalidCredentials => 'Incorrect email or password.';

  @override
  String get accountForbidden => 'Account not authorized or school not active.';

  @override
  String get unknown => 'unknown';

  @override
  String serverErrorWithCode(Object code) {
    return 'Server error ($code).';
  }

  @override
  String get loginWithCodeQr => 'Sign in with Code / QR';

  @override
  String get inviteOnlyInfo =>
      'Your account is created by your school administrator. On your first login, you will be asked to set your password.';

  @override
  String get registerSchoolCta => 'Register my school';

  @override
  String get unstableConnection => 'Unstable connection';

  @override
  String get retry => 'Retry';
}
