import { useCallback, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  Building,
  Megaphone,
  PlusCircle,
  ScrollText,
  Users,
} from 'lucide-react';
import { api } from '../lib/api';
import { useLocale } from '../lib/i18n';
import SuperAdminAuditTab from '../components/superadmin/SuperAdminAuditTab';
import SuperAdminBroadcastsTab from '../components/superadmin/SuperAdminBroadcastsTab';
import SuperAdminSchoolsTab from '../components/superadmin/SuperAdminSchoolsTab';
import SuperAdminUsersTab from '../components/superadmin/SuperAdminUsersTab';
import type { AppReadiness, School, SuperAdminTab, Toast } from '../components/superadmin/types';

let toastId = 0;

const TABS: Array<{
  id: SuperAdminTab;
  route: string;
  labelKey: string;
  icon: typeof Building;
}> = [
  { id: 'schools', route: '/superadmin', labelKey: 'nav.schoolManagement', icon: Building },
  { id: 'users', route: '/superadmin/users', labelKey: 'nav.superAdminUsers', icon: Users },
  { id: 'broadcasts', route: '/superadmin/broadcasts', labelKey: 'nav.superAdminBroadcasts', icon: Megaphone },
  { id: 'audit', route: '/superadmin/audit', labelKey: 'nav.auditLog', icon: ScrollText },
];

function tabFromPath(pathname: string): SuperAdminTab {
  if (pathname.startsWith('/superadmin/users')) return 'users';
  if (pathname.startsWith('/superadmin/broadcasts')) return 'broadcasts';
  if (pathname.startsWith('/superadmin/audit')) return 'audit';
  return 'schools';
}

export default function SuperAdminDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLocale();
  const activeTab = tabFromPath(location.pathname);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: Toast['type']) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.map((item) => (item.id === id ? { ...item, exiting: true } : item)));
      setTimeout(() => setToasts((prev) => prev.filter((item) => item.id !== id)), 300);
    }, 3800);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.map((item) => (item.id === id ? { ...item, exiting: true } : item)));
    setTimeout(() => setToasts((prev) => prev.filter((item) => item.id !== id)), 300);
  }, []);

  const { data: schools, isLoading, error } = useQuery<School[]>({
    queryKey: ['schools'],
    queryFn: async () => (await api.get('/system/schools')).data,
  });

  const readinessQuery = useQuery<AppReadiness>({
    queryKey: ['platform-readiness'],
    refetchInterval: 30000,
    queryFn: async () => (await api.get('/health/ready', { validateStatus: () => true })).data,
  });

  if (isLoading) {
    return (
      <div className="loading-spinner screen-min-height">
        <div className="spinner" />
        <p>{t('superadmin.loading')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-state screen-min-height">
        <h3>{t('superadmin.loadError')}</h3>
      </div>
    );
  }

  const schoolList = schools ?? [];

  return (
    <div className="container animate-fade-in">
      {toasts.length > 0 && (
        <div className="toast-container" aria-live="polite">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`toast toast-${toast.type} ${toast.exiting ? 'toast-exit' : ''}`}
              onClick={() => dismissToast(toast.id)}
              role="alert"
            >
              {toast.message}
            </div>
          ))}
        </div>
      )}

      <header className="dashboard-header superadmin-header">
        <div>
          <div className="badge dashboard-eyebrow">
            <Activity size={14} /> {t('superadmin.eyebrow')}
          </div>
          <h1>{t('superadmin.title')}</h1>
          <p>{t('superadmin.subtitle')}</p>
        </div>
        {activeTab === 'schools' && (
          <button type="button" className="btn btn-primary" onClick={() => setIsCreateModalOpen(true)}>
            <PlusCircle size={18} /> {t('superadmin.createSchool')}
          </button>
        )}
      </header>

      <nav className="superadmin-tab-bar" aria-label={t('nav.main')}>
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isCurrent = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              className={`superadmin-tab-btn ${isCurrent ? 'superadmin-tab-btn--active' : ''}`}
              onClick={() => navigate(tab.route)}
              aria-current={isCurrent ? 'page' : undefined}
            >
              <Icon size={16} />
              <span>{t(tab.labelKey)}</span>
            </button>
          );
        })}
      </nav>

      {activeTab === 'schools' && (
        <SuperAdminSchoolsTab
          schools={schoolList}
          readiness={readinessQuery.data}
          readinessLoading={readinessQuery.isLoading}
          isCreateModalOpen={isCreateModalOpen}
          setIsCreateModalOpen={setIsCreateModalOpen}
          addToast={addToast}
        />
      )}

      {activeTab === 'users' && <SuperAdminUsersTab schools={schoolList} addToast={addToast} />}

      {activeTab === 'broadcasts' && <SuperAdminBroadcastsTab schools={schoolList} addToast={addToast} />}

      {activeTab === 'audit' && <SuperAdminAuditTab schools={schoolList} addToast={addToast} />}
    </div>
  );
}
