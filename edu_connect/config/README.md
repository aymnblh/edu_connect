# Production Dart Defines

Copy `config/production.example.json` to `config/production.json` and update every URL before building a store release.

`config/production.json` is ignored by git because production domains can differ between deployments.

Required keys:

- `APP_ENV`: use `production`
- `API_BASE_URL`: stable HTTPS API domain
- `WS_BASE_URL`: stable WSS API WebSocket domain
- `NTFY_BASE_URL`: optional stable HTTPS ntfy domain
- `NTFY_WS_BASE_URL`: optional stable WSS ntfy WebSocket domain

The two ntfy values must either both be configured or both be empty. When they are empty, the app keeps in-app notifications and foreground polling without opening an ntfy WebSocket.

Production builds reject localhost, `.local`, placeholder domains, temporary Cloudflare tunnel domains, and non-production `APP_ENV` values. Validate a file before release with:

```text
dart run tool/validate_mobile_config.dart config/production.json
```
