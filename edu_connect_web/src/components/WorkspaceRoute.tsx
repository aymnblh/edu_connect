import { Navigate } from 'react-router-dom';
import RoleSelectorModal from './RoleSelectorModal';
import { useWorkspace } from '../contexts/useWorkspace';
import { routeForRole, type WorkspaceRole } from '../lib/workspace';

export default function WorkspaceRoute({
  role,
  children,
}: {
  role: WorkspaceRole | WorkspaceRole[];
  children: React.ReactNode;
}) {
  const { activeRole, hasMultipleRoles, isAuthenticated, roles, routeForActiveRole } = useWorkspace();
  const allowedRoles = Array.isArray(role) ? role : [role];

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.some((allowedRole) => roles.includes(allowedRole))) {
    return <Navigate to={routeForActiveRole()} replace />;
  }

  if (hasMultipleRoles && !activeRole) {
    return <RoleSelectorModal />;
  }

  if (!activeRole) {
    return <Navigate to="/workspace/select" replace />;
  }

  if (!allowedRoles.includes(activeRole)) {
    return <Navigate to={routeForRole(activeRole)} replace />;
  }

  return <>{children}</>;
}
