import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, LogOut, School } from 'lucide-react';
import { logoutSession } from '../lib/api';
import { DEMO_READ_ONLY_EVENT, isDemoSession } from '../lib/demo';
import { useLocale } from '../lib/i18n';
import { useWorkspace } from '../contexts/useWorkspace';

/** Shown on every screen of the public demo: what it is, and the way out. */
export default function DemoBanner() {
  const { t } = useLocale();
  const navigate = useNavigate();
  const { refreshWorkspace } = useWorkspace();
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    let timer = 0;
    const onBlocked = () => {
      setBlocked(true);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setBlocked(false), 4000);
    };
    window.addEventListener(DEMO_READ_ONLY_EVENT, onBlocked);
    return () => {
      window.removeEventListener(DEMO_READ_ONLY_EVENT, onBlocked);
      window.clearTimeout(timer);
    };
  }, []);

  if (!isDemoSession()) return null;

  const leave = async (to: string) => {
    await logoutSession();
    refreshWorkspace();
    navigate(to, { replace: true });
  };

  return (
    <div className={`demo-banner ${blocked ? 'demo-banner--alert' : ''}`} role="status" aria-live="polite">
      <Eye size={16} aria-hidden="true" />
      <span className="demo-banner-text">{blocked ? t('demo.blocked') : t('demo.banner')}</span>
      <div className="demo-banner-actions">
        <button type="button" className="btn btn-primary btn-compact" onClick={() => void leave('/register-school')}>
          <School size={14} /> {t('demo.createSchool')}
        </button>
        <button type="button" className="btn btn-secondary btn-compact" onClick={() => void leave('/login')}>
          <LogOut size={14} /> {t('demo.leave')}
        </button>
      </div>
    </div>
  );
}
