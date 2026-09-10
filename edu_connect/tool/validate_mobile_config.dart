import 'dart:convert';
import 'dart:io';

import 'package:edu_connect/core/config/runtime_config_validator.dart';

Never _fail(String message) {
  stderr.writeln('Mobile production configuration invalid: $message');
  exit(1);
}

void main(List<String> arguments) {
  if (arguments.length != 1) {
    _fail('usage: dart run tool/validate_mobile_config.dart <config.json>');
  }

  final file = File(arguments.single);
  if (!file.existsSync()) {
    _fail('${file.path} does not exist.');
  }

  final Object? decoded;
  try {
    decoded = jsonDecode(file.readAsStringSync());
  } on FormatException catch (error) {
    _fail('${file.path} is not valid JSON: ${error.message}');
  }
  if (decoded is! Map<String, dynamic>) {
    _fail('${file.path} must contain a JSON object.');
  }
  final config = Map<String, dynamic>.from(decoded);

  String value(String key, {bool required = true}) {
    final raw = config[key];
    if (raw is! String || (required && raw.trim().isEmpty)) {
      _fail('$key must be ${required ? 'a non-empty string' : 'a string'}.');
    }
    return raw;
  }

  try {
    RuntimeConfigValidator.validateProduction(
      appEnv: value('APP_ENV'),
      apiBaseUrl: value('API_BASE_URL'),
      wsBaseUrl: value('WS_BASE_URL'),
      ntfyBaseUrl: value('NTFY_BASE_URL', required: false),
      ntfyWsBaseUrl: value('NTFY_WS_BASE_URL', required: false),
    );
  } on StateError catch (error) {
    _fail(error.message);
  }

  stdout.writeln('Mobile production configuration passed: ${file.path}');
}
