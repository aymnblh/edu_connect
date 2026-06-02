import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getInitialActiveRole,
  routeForRole,
  workspaceSessionChangeEvent,
  workspaceRolesFromSession,
} from '../lib/workspace';
import { WorkspaceContext, type WorkspaceContextValue } from './workspaceContextValue';
import type { WorkspaceRole } from '../lib/workspace';

function readStoredUser(): unknown {
  const raw = localStorage.getItem('user');
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function readWorkspaceSnapshot() {
  const token = localStorage.getItem('access_token');
  const user = readStoredUser();
  const roles = workspaceRolesFromSession(user, token);
  const savedRole = localStorage.getItem('active_workspace_role');
  const activeRole = getInitialActiveRole(roles, savedRole);
  if (activeRole && savedRole !== activeRole) {
    localStorage.setItem('active_workspace_role', activeRole);
  }
  return {
    token,
    roles,
    activeRole,
  };
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [snapshot, setSnapshot] = useState(readWorkspaceSnapshot);

  const refreshWorkspace = useCallback(() => {
    setSnapshot(readWorkspaceSnapshot());
  }, []);

  useEffect(() => {
    const refresh = () => setSnapshot(readWorkspaceSnapshot());
    window.addEventListener('storage', refresh);
    window.addEventListener(workspaceSessionChangeEvent, refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener(workspaceSessionChangeEvent, refresh);
    };
  }, []);

  const selectRole = useCallback(
    (role: WorkspaceRole) => {
      if (!snapshot.roles.includes(role)) {
        throw new Error('Workspace role is not available for this user.');
      }
      localStorage.setItem('active_workspace_role', role);
      setSnapshot((current) => ({ ...current, activeRole: role }));
      return routeForRole(role);
    },
    [snapshot.roles],
  );

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      roles: snapshot.roles,
      activeRole: snapshot.activeRole,
      hasMultipleRoles: snapshot.roles.length > 1,
      isAuthenticated: Boolean(snapshot.token),
      refreshWorkspace,
      selectRole,
      routeForActiveRole: () => routeForRole(snapshot.activeRole),
    }),
    [refreshWorkspace, selectRole, snapshot.activeRole, snapshot.roles, snapshot.token],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}
