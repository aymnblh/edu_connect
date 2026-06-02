import { Navigate } from 'react-router-dom';
import RoleSelectorModal from '../components/RoleSelectorModal';
import { useWorkspace } from '../contexts/useWorkspace';

export default function WorkspaceSelect() {
  const { activeRole, hasMultipleRoles, isAuthenticated, routeForActiveRole } = useWorkspace();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!hasMultipleRoles && activeRole) {
    return <Navigate to={routeForActiveRole()} replace />;
  }

  return <RoleSelectorModal />;
}
