import 'dart:convert';
import 'dart:io';

import 'package:crypto/crypto.dart';
import 'package:dio/dio.dart';
import 'package:dio/io.dart';

import '../constants/app_constants.dart';

Set<String> parseCertificatePins(String rawPins) {
  return rawPins
      .split(',')
      .map((entry) => entry.trim().replaceAll(':', '').toLowerCase())
      .where((entry) => entry.isNotEmpty)
      .toSet();
}

bool certificateMatchesPins(List<int> derBytes, Set<String> normalizedPins) {
  if (normalizedPins.isEmpty) {
    return true;
  }
  final digest = sha256.convert(derBytes);
  final hexPin = digest.toString().toLowerCase();
  final base64Pin = base64Encode(digest.bytes).toLowerCase();
  return normalizedPins.contains(hexPin) || normalizedPins.contains(base64Pin);
}

/// Enforces SHA-256 certificate pinning on native HTTP connections when
/// `API_CERT_SHA256_PINS` is provided via `--dart-define`.
void configureTlsPinning(Dio dio) {
  final pins = parseCertificatePins(AppConstants.apiCertSha256Pins);
  if (pins.isEmpty) {
    return;
  }

  final apiHost = Uri.tryParse(AppConstants.apiBaseUrl)?.host.toLowerCase();
  dio.httpClientAdapter = IOHttpClientAdapter(
    createHttpClient: () {
      final client = HttpClient(context: SecurityContext(withTrustedRoots: true));
      // Never bypass system CA trust; validateCertificate adds pinning on top.
      client.badCertificateCallback = (X509Certificate cert, String host, int port) => false;
      return client;
    },
    validateCertificate: (X509Certificate? cert, String host, int port) {
      if (cert == null) {
        return false;
      }
      if (apiHost != null && apiHost.isNotEmpty && host.toLowerCase() != apiHost) {
        return true;
      }
      return certificateMatchesPins(cert.der, pins);
    },
  );
}
