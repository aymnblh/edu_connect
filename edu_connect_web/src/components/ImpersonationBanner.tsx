import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import { refreshAccessToken } from '../lib/api';
import { exitSchoolImpersonation, getImpersonationState } from '../lib/impersonation';
import { useLocale } from '../lib/i18n';
import { useWorkspace } from '../contexts/useWorkspace';

/** Banner shown at the top of AuthenticatedLayout whenever a SuperAdmin inspects a school. */
export default function ImpersonationBanner() {
  const { t } = useLocale();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { refreshWorkspace } = useWorkspace();
  const [exiting, setExiting] = useState(false);

  const state = getImpersonationState();
  if (!state) return null;

  const handleExit = async () => {
    setExiting(true);
    try {
      const ok = await exitSchoolImpersonation(refreshAccessToken);
      queryClient.clear();
      refreshWorkspace();
      navigate(ok ? '/superadmin' : '/login', { replace: true });
    } finally {
      setExiting(false);
    }
  };

  return (
    <div className="impersonation-banner" role="status" aria-live="polite">
      <div className="impersonation-banner-copy">
        <ShieldAlert size={16} aria-hidden="true" />
        <span>
          {t('superadmin.impersonationBanner', { school: state.schoolName })}
        </span>
      </div>
      <button
        type="button"
        className="btn btn-primary btn-compact"
        onClick={() => void handleExit()}
        disabled={exiting}
      >
        <ArrowLeft size={14} /> {t('superadmin.exitInspection')}
      </button>
    </div>
  );
}
