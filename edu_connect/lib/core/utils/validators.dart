class Validators {
  Validators._();

  static String? email(String? value) {
    if (value == null || value.isEmpty) return 'Email is required';
    final emailRegex = RegExp(r'^[^@]+@[^@]+\.[^@]+');
    if (!emailRegex.hasMatch(value)) return 'Enter a valid email address';
    return null;
  }

  static String? password(String? value) {
    if (value == null || value.isEmpty) return 'Password is required';
    if (value.length < 6) return 'Password must be at least 6 characters';
    return null;
  }

  static String? required(String? value, [String fieldName = 'This field']) {
    if (value == null || value.trim().isEmpty) return '$fieldName is required';
    return null;
  }

  static String? joinCode(String? value) {
    if (value == null || value.isEmpty) return 'Join code is required';
    if (value.length != 6) return 'Join code must be 6 characters';
    return null;
  }

  static String? gradeValue(String? value) {
    if (value == null || value.isEmpty) return 'Grade is required';
    final number = double.tryParse(value);
    if (number == null) return 'Enter a valid number';
    if (number < 0 || number > 20) return 'Grade must be between 0 and 20';
    return null;
  }

  static String? amount(String? value) {
    if (value == null || value.isEmpty) return 'Amount is required';
    final number = double.tryParse(value);
    if (number == null) return 'Enter a valid amount';
    if (number <= 0) return 'Amount must be greater than 0';
    return null;
  }
}
