# Production Dart Defines

Copy `config/production.example.json` to `config/production.json` and update every URL before building a store release.

`config/production.json` is ignored by git because production domains can differ between deployments.

Required keys:

- `APP_ENV`: use `production`
- `API_BASE_URL`: stable HTTPS API domain
- `WS_BASE_URL`: stable WSS API WebSocket domain
- `NTFY_BASE_URL`: stable HTTPS ntfy domain
- `NTFY_WS_BASE_URL`: stable WSS ntfy WebSocket domain

Production builds reject localhost, `.local`, placeholder domains, and temporary Cloudflare tunnel domains at startup.
