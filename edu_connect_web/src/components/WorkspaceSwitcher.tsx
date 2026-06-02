import { BriefcaseBusiness } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useWorkspace } from '../contexts/useWorkspace';
import { useLocale } from '../lib/i18n';
import type { WorkspaceRole } from '../lib/workspace';

export default function WorkspaceSwitcher() {
  const navigate = useNavigate();
  const { activeRole, roles, hasMultipleRoles, selectRole } = useWorkspace();
  const { t } = useLocale();
  const roleLabel = (role: WorkspaceRole) => t(`role.${role}`);

  if (!activeRole) {
    return null;
  }

  if (!hasMultipleRoles) {
    return (
      <div className="workspace-pill">
        <BriefcaseBusiness size={16} />
        <span>{roleLabel(activeRole)}</span>
      </div>
    );
  }

  return (
    <label className="workspace-switcher">
      <BriefcaseBusiness size={16} />
      <select
        value={activeRole}
        aria-label={t('workspace.activeAria')}
        onChange={(event) => navigate(selectRole(event.target.value as WorkspaceRole), { replace: true })}
      >
        {roles.map((role) => (
          <option key={role} value={role}>
            {roleLabel(role)}
          </option>
        ))}
      </select>
    </label>
  );
}
