import {
  notifyWorkspaceSessionChanged,
  readWorkspaceSessionItem,
  storeWorkspaceSessionItem,
} from './workspace';

const IMPERSONATION_META_KEY = 'superadmin_impersonation_meta';
const SAVED_SUPERADMIN_USER_KEY = 'superadmin_return_user';

export interface ImpersonationMeta {
  schoolId: string;
  schoolName: string;
  startedAt: string;
}

// Kept only in JS memory so the original SuperAdmin access token is never persisted to disk.
let savedSuperAdminAccessToken: string | null = null;

function safeSessionStorage(): Storage | null {
  return typeof sessionStorage !== 'undefined' ? sessionStorage : null;
}

export function getImpersonationState(): ImpersonationMeta | null {
  const raw = safeSessionStorage()?.getItem?.(IMPERSONATION_META_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ImpersonationMeta>;
    if (typeof parsed.schoolId === 'string' && typeof parsed.schoolName === 'string') {
      return {
        schoolId: parsed.schoolId,
        schoolName: parsed.schoolName,
        startedAt: typeof parsed.startedAt === 'string' ? parsed.startedAt : new Date().toISOString(),
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function clearImpersonationState(): void {
  savedSuperAdminAccessToken = null;
  safeSessionStorage()?.removeItem?.(IMPERSONATION_META_KEY);
  safeSessionStorage()?.removeItem?.(SAVED_SUPERADMIN_USER_KEY);
}

export function startSchoolImpersonation(params: {
  accessToken: string;
  schoolId: string;
  schoolName: string;
}): void {
  const ss = safeSessionStorage();
  const currentAccessToken = readWorkspaceSessionItem('access_token');
  const currentUserRaw = readWorkspaceSessionItem('user');

  if (currentAccessToken && !getImpersonationState()) {
    savedSuperAdminAccessToken = currentAccessToken;
  }
  if (currentUserRaw && !ss?.getItem?.(SAVED_SUPERADMIN_USER_KEY)) {
    ss?.setItem?.(SAVED_SUPERADMIN_USER_KEY, currentUserRaw);
  }

  let baseUser: Record<string, unknown> = {};
  if (currentUserRaw) {
    try {
      const parsed = JSON.parse(currentUserRaw);
      if (parsed && typeof parsed === 'object') {
        baseUser = parsed as Record<string, unknown>;
      }
    } catch {
      baseUser = {};
    }
  }

  const impersonatedUser = {
    ...baseUser,
    role: 'principal',
    roles: ['principal'],
    school_id: params.schoolId,
    school_name: params.schoolName,
  };

  const meta: ImpersonationMeta = {
    schoolId: params.schoolId,
    schoolName: params.schoolName,
    startedAt: new Date().toISOString(),
  };
  ss?.setItem?.(IMPERSONATION_META_KEY, JSON.stringify(meta));

  // Keep impersonation token strictly in session memory/sessionStorage (never rememberDevice=true).
  storeWorkspaceSessionItem('access_token', params.accessToken, false);
  storeWorkspaceSessionItem('user', JSON.stringify(impersonatedUser), false);
  storeWorkspaceSessionItem('active_workspace_role', 'principal', false);
  notifyWorkspaceSessionChanged();
}

export async function exitSchoolImpersonation(refreshFn: () => Promise<string | null>): Promise<boolean> {
  const ss = safeSessionStorage();
  const savedUserRaw = ss?.getItem?.(SAVED_SUPERADMIN_USER_KEY);
  const restoredToken = savedSuperAdminAccessToken;

  clearImpersonationState();

  if (savedUserRaw) {
    storeWorkspaceSessionItem('user', savedUserRaw, false);
  }

  if (restoredToken) {
    storeWorkspaceSessionItem('access_token', restoredToken);
    storeWorkspaceSessionItem('active_workspace_role', 'system_admin');
    notifyWorkspaceSessionChanged();
    return true;
  }

  // If the page was reloaded during inspection, refresh the real SuperAdmin session via HttpOnly cookie.
  const freshToken = await refreshFn();
  if (!freshToken) {
    return false;
  }
  storeWorkspaceSessionItem('active_workspace_role', 'system_admin');
  notifyWorkspaceSessionChanged();
  return true;
}
