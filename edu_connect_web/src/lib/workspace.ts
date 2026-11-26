export type WorkspaceRole = 'system_admin' | 'principal' | 'secretary' | 'teacher' | 'nurse' | 'canteen' | 'driver' | 'parent';

export const workspaceRoutes: Record<WorkspaceRole, string> = {
  system_admin: '/superadmin',
  principal: '/director',
  secretary: '/director',
  teacher: '/teacher/dashboard',
  nurse: '/infirmary',
  canteen: '/canteen',
  driver: '/transport/driver',
  parent: '/parent/dashboard',
};

const rolePriority: WorkspaceRole[] = ['system_admin', 'principal', 'secretary', 'teacher', 'nurse', 'canteen', 'driver', 'parent'];
const validRoles = new Set<WorkspaceRole>(rolePriority);
export const workspaceSessionChangeEvent = 'educonnect_workspace_session_change';
export const rememberDevicePreferenceKey = 'educonnect_remember_device';
const rememberedSessionHintKey = 'educonnect_session_hint';
const driverOfflineQueueKey = 'wasel_driver_offline_events';

type WorkspaceSessionKey = 'access_token' | 'refresh_token' | 'user' | 'active_workspace_role';
const workspaceSessionKeys: WorkspaceSessionKey[] = ['access_token', 'refresh_token', 'user', 'active_workspace_role'];

// Keep access tokens in JavaScript memory instead of persistent localStorage to
// reduce exposure to disk-reading infostealers.
let memoryAccessToken: string | null = null;

function safeLocalStorage(): Storage | null {
  return typeof localStorage !== 'undefined' ? localStorage : null;
}

function safeSessionStorage(): Storage | null {
  return typeof sessionStorage !== 'undefined' ? sessionStorage : null;
}

function preferredRememberDevice(): boolean {
  return safeLocalStorage()?.getItem?.(rememberDevicePreferenceKey) !== 'false';
}

export function hasRememberedSessionHint(): boolean {
  return safeLocalStorage()?.getItem?.(rememberedSessionHintKey) === '1';
}

export function getCurrentSessionPersistence(): boolean {
  if (hasRememberedSessionHint()) {
    return true;
  }
  const ss = safeSessionStorage();
  if (ss?.getItem?.('access_token') || ss?.getItem?.('refresh_token')) {
    return false;
  }
  return preferredRememberDevice();
}

export function setRememberDevicePreference(rememberDevice: boolean, persistPreference = true): void {
  if (persistPreference) {
    safeLocalStorage()?.setItem?.(rememberDevicePreferenceKey, rememberDevice ? 'true' : 'false');
  }
  if (rememberDevice) {
    safeLocalStorage()?.setItem?.(rememberedSessionHintKey, '1');
  } else {
    safeLocalStorage()?.removeItem?.(rememberedSessionHintKey);
  }
}

export function readRememberDevicePreference(): boolean {
  return preferredRememberDevice();
}

export function readWorkspaceSessionItem(key: WorkspaceSessionKey): string | null {
  const ss = safeSessionStorage();
  const ls = safeLocalStorage();
  if (key === 'access_token') {
    return memoryAccessToken ?? ss?.getItem?.(key) ?? ls?.getItem?.(key) ?? null;
  }
  if (key === 'refresh_token') {
    // Persistent refresh tokens live in the HttpOnly backend cookie.
    return ss?.getItem?.(key) ?? null;
  }
  return ss?.getItem?.(key) ?? ls?.getItem?.(key) ?? null;
}

export function storeWorkspaceSessionItem(
  key: WorkspaceSessionKey,
  value: string,
  rememberDevice = getCurrentSessionPersistence(),
): void {
  const ss = safeSessionStorage();
  const ls = safeLocalStorage();
  if (key === 'access_token') {
    memoryAccessToken = value;
    // Never write access tokens to persistent localStorage.
    ls?.removeItem?.(key);
    if (rememberDevice) {
      // Remembered sessions re-hydrate from the HttpOnly refresh cookie on reload.
      ss?.removeItem?.(key);
      ls?.setItem?.(rememberedSessionHintKey, '1');
    } else {
      ss?.setItem?.(key, value);
    }
    return;
  }
  if (key === 'refresh_token' || key === 'user') {
    // Never persist refresh tokens or user PII in localStorage.
    ls?.removeItem?.(key);
    ss?.setItem?.(key, value);
    return;
  }
  const targetStorage = rememberDevice ? ls : ss;
  const otherStorage = rememberDevice ? ss : ls;
  otherStorage?.removeItem?.(key);
  targetStorage?.setItem?.(key, value);
}

export function removeWorkspaceSessionItem(key: WorkspaceSessionKey): void {
  if (key === 'access_token') {
    memoryAccessToken = null;
  }
  safeLocalStorage()?.removeItem?.(key);
  safeSessionStorage()?.removeItem?.(key);
}

export function normalizeWorkspaceRoles(rawRoles: unknown): WorkspaceRole[] {
  const values = Array.isArray(rawRoles) ? rawRoles : rawRoles ? [rawRoles] : [];
  const normalized = values
    .map((role) => String(role).trim().toLowerCase())
    .filter((role): role is WorkspaceRole => validRoles.has(role as WorkspaceRole));

  return rolePriority.filter((role) => normalized.includes(role));
}

function base64UrlDecode(value: string): string {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  if (typeof atob === 'function') {
    return atob(base64);
  }
  throw new Error('Base64 decoder unavailable.');
}

export function decodeJwtPayload(token: string | null): Record<string, unknown> | null {
  if (!token) {
    return null;
  }
  const [, payload] = token.split('.');
  if (!payload) {
    return null;
  }
  try {
    return JSON.parse(base64UrlDecode(payload)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function workspaceRolesFromSession(user: unknown, accessToken: string | null): WorkspaceRole[] {
  const profile = user && typeof user === 'object' ? (user as Record<string, unknown>) : {};
  const claims = decodeJwtPayload(accessToken) || {};
  const rawRoles = [
    claims.user_roles,
    claims.roles,
    claims.role,
    profile.user_roles,
    profile.roles,
    profile.role,
  ].flatMap((value) => (Array.isArray(value) ? value : value ? [value] : []));

  return normalizeWorkspaceRoles(rawRoles);
}

export function getInitialActiveRole(roles: WorkspaceRole[], savedRole: string | null): WorkspaceRole | null {
  if (savedRole && roles.includes(savedRole as WorkspaceRole)) {
    return savedRole as WorkspaceRole;
  }
  return roles.length === 1 ? roles[0] : null;
}

export function routeForRole(role: WorkspaceRole | null): string {
  return role ? workspaceRoutes[role] : '/workspace/select';
}

export function notifyWorkspaceSessionChanged(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(workspaceSessionChangeEvent));
  }
}

export function clearWorkspaceStorage(): void {
  workspaceSessionKeys.forEach(removeWorkspaceSessionItem);
  safeLocalStorage()?.removeItem?.(rememberedSessionHintKey);
  safeLocalStorage()?.removeItem?.(driverOfflineQueueKey);
  safeSessionStorage()?.removeItem?.('superadmin_impersonation_meta');
  safeSessionStorage()?.removeItem?.('superadmin_return_user');
  notifyWorkspaceSessionChanged();
}
