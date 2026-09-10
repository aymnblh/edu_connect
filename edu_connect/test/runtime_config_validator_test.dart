import 'package:edu_connect/core/config/runtime_config_validator.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  const apiUrl = 'https://api.educonnect.dz';
  const wsUrl = 'wss://api.educonnect.dz';

  test('accepts production API endpoints without ntfy', () {
    expect(
      () => RuntimeConfigValidator.validateProduction(
        appEnv: 'production',
        apiBaseUrl: apiUrl,
        wsBaseUrl: wsUrl,
        ntfyBaseUrl: '',
        ntfyWsBaseUrl: '',
      ),
      returnsNormally,
    );
  });

  test('accepts a complete ntfy transport pair', () {
    expect(
      () => RuntimeConfigValidator.validateProduction(
        appEnv: 'production',
        apiBaseUrl: apiUrl,
        wsBaseUrl: wsUrl,
        ntfyBaseUrl: 'https://ntfy.educonnect.dz',
        ntfyWsBaseUrl: 'wss://ntfy.educonnect.dz',
      ),
      returnsNormally,
    );
  });

  test('rejects a partial ntfy configuration', () {
    expect(
      () => RuntimeConfigValidator.validateProduction(
        appEnv: 'production',
        apiBaseUrl: apiUrl,
        wsBaseUrl: wsUrl,
        ntfyBaseUrl: 'https://ntfy.educonnect.dz',
        ntfyWsBaseUrl: '',
      ),
      throwsStateError,
    );
  });

  test('rejects non-production and placeholder endpoints', () {
    expect(
      () => RuntimeConfigValidator.validateProduction(
        appEnv: 'development',
        apiBaseUrl: apiUrl,
        wsBaseUrl: wsUrl,
        ntfyBaseUrl: '',
        ntfyWsBaseUrl: '',
      ),
      throwsStateError,
    );
    expect(
      () => RuntimeConfigValidator.validateProduction(
        appEnv: 'production',
        apiBaseUrl: 'https://api.educonnect.local',
        wsBaseUrl: wsUrl,
        ntfyBaseUrl: '',
        ntfyWsBaseUrl: '',
      ),
      throwsStateError,
    );
  });
}
