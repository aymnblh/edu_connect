import { createContext } from 'react';
import type { WorkspaceRole } from '../lib/workspace';

export interface WorkspaceContextValue {
  roles: WorkspaceRole[];
  activeRole: WorkspaceRole | null;
  hasMultipleRoles: boolean;
  isAuthenticated: boolean;
  refreshWorkspace: () => void;
  selectRole: (role: WorkspaceRole) => string;
  routeForActiveRole: () => string;
}

export const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);
