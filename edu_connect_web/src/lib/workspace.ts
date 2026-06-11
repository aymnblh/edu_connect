export type WorkspaceRole = 'system_admin' | 'principal' | 'secretary' | 'teacher' | 'parent';

export const workspaceRoutes: Record<WorkspaceRole, string> = {
  system_admin: '/superadmin',
  principal: '/director',
  secretary: '/director',
  teacher: '/teacher/dashboard',
  parent: '/parent/dashboard',
};

const rolePriority: WorkspaceRole[] = ['system_admin', 'principal', 'secretary', 'teacher', 'parent'];
const validRoles = new Set<WorkspaceRole>(rolePriority);
export const workspaceSessionChangeEvent = 'educonnect_workspace_session_change';
export const rememberDevicePreferenceKey = 'educonnect_remember_device';

type WorkspaceSessionKey = 'access_token' | 'refresh_token' | 'user' | 'active_workspace_role';
const workspaceSessionKeys: WorkspaceSessionKey[] = ['access_token', 'refresh_token', 'user', 'active_workspace_role'];

function preferredRememberDevice(): boolean {
  return localStorage.getItem(rememberDevicePreferenceKey) !== 'false';
}

export function getCurrentSessionPersistence(): boolean {
  if (localStorage.getItem('access_token') || localStorage.getItem('refresh_token')) {
    return true;
  }
  if (sessionStorage.getItem('access_token') || sessionStorage.getItem('refresh_token')) {
    return false;
  }
  return preferredRememberDevice();
}

export function setRememberDevicePreference(rememberDevice: boolean): void {
  localStorage.setItem(rememberDevicePreferenceKey, rememberDevice ? 'true' : 'false');
}

export function readRememberDevicePreference(): boolean {
  return preferredRememberDevice();
}

export function readWorkspaceSessionItem(key: WorkspaceSessionKey): string | null {
  return localStorage.getItem(key) ?? sessionStorage.getItem(key);
}

export function storeWorkspaceSessionItem(
  key: WorkspaceSessionKey,
  value: string,
  rememberDevice = getCurrentSessionPersistence(),
): void {
  const targetStorage = rememberDevice ? localStorage : sessionStorage;
  const otherStorage = rememberDevice ? sessionStorage : localStorage;
  otherStorage.removeItem(key);
  targetStorage.setItem(key, value);
}

export function removeWorkspaceSessionItem(key: WorkspaceSessionKey): void {
  localStorage.removeItem(key);
  sessionStorage.removeItem(key);
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
  notifyWorkspaceSessionChanged();
}
