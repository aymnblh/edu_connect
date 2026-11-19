import 'dart:convert';

import 'package:crypto/crypto.dart';
import 'package:edu_connect/core/services/tls_pinning_io.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('TLS certificate pinning helpers', () {
    test('normalizes comma-separated hex and base64 pins', () {
      final pins = parseCertificatePins('AA:BB:CC,  ddeeff , ');
      expect(pins, equals({'aabbcc', 'ddeeff'}));
    });

    test('matches certificate DER against hex or base64 SHA-256 pin', () {
      final der = utf8.encode('sample-der-certificate-bytes');
      final digest = sha256.convert(der);
      final hexPin = digest.toString().toUpperCase();
      final base64Pin = base64Encode(digest.bytes);

      expect(certificateMatchesPins(der, parseCertificatePins(hexPin)), isTrue);
      expect(certificateMatchesPins(der, parseCertificatePins(base64Pin)), isTrue);
      expect(
        certificateMatchesPins(
          utf8.encode('different-certificate'),
          parseCertificatePins(hexPin),
        ),
        isFalse,
      );
    });
  });
}
