import { api, storeSessionTokens } from './api';
import {
  clearWorkspaceStorage,
  getInitialActiveRole,
  removeWorkspaceSessionItem,
  routeForRole,
  storeWorkspaceSessionItem,
  workspaceRolesFromSession,
} from './workspace';

export type AuthTokens = {
  access_token: string;
  refresh_token: string;
};

/** Persists session tokens and current user profile, returning the target workspace route or null if unauthorized. */
export async function establishUserSession(
  tokens: AuthTokens,
  remember: boolean,
  refreshWorkspace: () => void,
): Promise<string | null> {
  clearWorkspaceStorage();
  storeSessionTokens(tokens.access_token, tokens.refresh_token, remember);

  const profileRes = await api.get('/users/me');
  const user = profileRes.data;
  storeWorkspaceSessionItem('user', JSON.stringify(user), remember);

  const roles = workspaceRolesFromSession(user, tokens.access_token);
  const activeRole = getInitialActiveRole(roles, null);
  if (activeRole) {
    storeWorkspaceSessionItem('active_workspace_role', activeRole, remember);
  } else {
    removeWorkspaceSessionItem('active_workspace_role');
  }
  refreshWorkspace();

  if (roles.length > 1) {
    return '/workspace/select';
  }
  if (roles.length === 1) {
    return routeForRole(roles[0]);
  }
  return null;
}
