class RuntimeConfigValidator {
  RuntimeConfigValidator._();

  static void validateProduction({
    required String appEnv,
    required String apiBaseUrl,
    required String wsBaseUrl,
    required String ntfyBaseUrl,
    required String ntfyWsBaseUrl,
  }) {
    if (appEnv.trim().toLowerCase() != 'production') {
      throw StateError('APP_ENV must be production for a store build.');
    }

    _validateEndpoint(
      name: 'API_BASE_URL',
      value: apiBaseUrl,
      allowedSchemes: const {'https'},
    );
    _validateEndpoint(
      name: 'WS_BASE_URL',
      value: wsBaseUrl,
      allowedSchemes: const {'wss'},
    );

    final hasNtfyBase = ntfyBaseUrl.trim().isNotEmpty;
    final hasNtfyWs = ntfyWsBaseUrl.trim().isNotEmpty;
    if (hasNtfyBase != hasNtfyWs) {
      throw StateError(
        'NTFY_BASE_URL and NTFY_WS_BASE_URL must both be configured or both be empty.',
      );
    }
    if (!hasNtfyBase) return;

    _validateEndpoint(
      name: 'NTFY_BASE_URL',
      value: ntfyBaseUrl,
      allowedSchemes: const {'https'},
    );
    _validateEndpoint(
      name: 'NTFY_WS_BASE_URL',
      value: ntfyWsBaseUrl,
      allowedSchemes: const {'wss'},
    );
  }

  static void _validateEndpoint({
    required String name,
    required String value,
    required Set<String> allowedSchemes,
  }) {
    final uri = Uri.tryParse(value.trim());
    if (uri == null ||
        uri.host.isEmpty ||
        !allowedSchemes.contains(uri.scheme)) {
      throw StateError(
        '$name must be a valid ${allowedSchemes.join('/')} URL for production builds.',
      );
    }

    final host = uri.host.toLowerCase();
    const forbiddenHosts = <String>{
      'localhost',
      '127.0.0.1',
      '10.0.2.2',
      '0.0.0.0',
    };
    const forbiddenSuffixes = <String>{
      '.local',
      '.localhost',
      '.example',
      '.test',
      '.invalid',
      '.trycloudflare.com',
    };

    final isForbiddenHost =
        forbiddenHosts.contains(host) || forbiddenSuffixes.any(host.endsWith);
    if (isForbiddenHost) {
      throw StateError(
        '$name points to a local, placeholder, or temporary tunnel host. '
        'Use a stable production domain.',
      );
    }
  }
}
