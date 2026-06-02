import 'package:intl/intl.dart';

class DateFormatter {
  DateFormatter._();

  static String messageTime(DateTime dateTime) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final msgDay = DateTime(dateTime.year, dateTime.month, dateTime.day);

    if (msgDay == today) {
      return DateFormat('HH:mm').format(dateTime);
    } else if (today.difference(msgDay).inDays == 1) {
      return 'Yesterday';
    } else if (today.difference(msgDay).inDays < 7) {
      return DateFormat('EEEE').format(dateTime);
    } else {
      return DateFormat('dd/MM/yyyy').format(dateTime);
    }
  }

  static String chatTimestamp(DateTime dateTime) {
    return DateFormat('HH:mm').format(dateTime);
  }

  static String dateHeader(DateTime dateTime) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final msgDay = DateTime(dateTime.year, dateTime.month, dateTime.day);

    if (msgDay == today) return 'Today';
    if (today.difference(msgDay).inDays == 1) return 'Yesterday';
    return DateFormat('MMMM d, yyyy').format(dateTime);
  }

  static String attendanceDate(DateTime dateTime) {
    return DateFormat('EEE, MMM d, yyyy').format(dateTime);
  }

  static String gradeDate(DateTime dateTime) {
    return DateFormat('dd MMM yyyy').format(dateTime);
  }
}
