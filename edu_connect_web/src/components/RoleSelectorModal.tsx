import { useEffect, useRef } from 'react';
import { BriefcaseBusiness, GraduationCap, ShieldCheck, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useWorkspace } from '../contexts/useWorkspace';
import { useLocale } from '../lib/i18n';
import type { WorkspaceRole } from '../lib/workspace';

const roleIcons: Record<WorkspaceRole, typeof GraduationCap> = {
  system_admin: ShieldCheck,
  principal: BriefcaseBusiness,
  secretary: BriefcaseBusiness,
  teacher: GraduationCap,
  parent: Users,
};

export default function RoleSelectorModal() {
  const navigate = useNavigate();
  const { roles, selectRole } = useWorkspace();
  const { t } = useLocale();
  const modalRef = useRef<HTMLDivElement>(null);
  const roleLabel = (role: WorkspaceRole) => t(`role.${role}`);

  useEffect(() => {
    modalRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
  }, []);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab' || !modalRef.current) {
      return;
    }

    const focusable = Array.from(
      modalRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
      )
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (!first || !last) {
      return;
    }

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const handleSelect = (role: WorkspaceRole) => {
    navigate(selectRole(role), { replace: true });
  };

  return (
    <div className="workspace-modal-backdrop">
      <div
        ref={modalRef}
        className="workspace-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="workspace-title"
        aria-describedby="workspace-description"
        onKeyDown={handleKeyDown}
      >
        <div className="workspace-modal-header">
          <h2 id="workspace-title">{t('workspace.chooseTitle')}</h2>
          <p id="workspace-description">{t('workspace.chooseCopy')}</p>
        </div>
        <div className="workspace-role-grid">
          {roles.map((role) => {
            const Icon = roleIcons[role];
            return (
              <button
                key={role}
                type="button"
                className="workspace-role-button"
                onClick={() => handleSelect(role)}
                aria-label={t('workspace.continueAs', { role: roleLabel(role) })}
              >
                <Icon size={24} />
                <span>{t('workspace.continueAs', { role: roleLabel(role) })}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
