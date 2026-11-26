import { Navigate } from 'react-router-dom';
import RoleSelectorModal from '../components/RoleSelectorModal';
import { useWorkspace } from '../contexts/useWorkspace';
import { useLocale } from '../lib/i18n';

export default function WorkspaceSelect() {
  const { activeRole, hasMultipleRoles, isAuthenticated, isRestoring, routeForActiveRole } = useWorkspace();
  const { t } = useLocale();

  if (isRestoring) {
    return (
      <div className="flex-center app-loader">
        {t('common.loading')}
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!hasMultipleRoles && activeRole) {
    return <Navigate to={routeForActiveRole()} replace />;
  }

  return <RoleSelectorModal />;
}
