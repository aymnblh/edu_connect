import { Utensils } from 'lucide-react';
import CanteenAdminPanel from '../components/CanteenAdminPanel';
import { useLocale } from '../lib/i18n';

/** Dedicated workspace for the school canteen account (`canteen` role). */
export default function CanteenDashboard() {
  const { t } = useLocale();
  return (
    <div className="container dashboard-page animate-fade-in">
      <header className="dashboard-header">
        <div className="badge dashboard-eyebrow">
          <Utensils size={14} /> {t('role.canteen')}
        </div>
        <h1>{t('canteen.title')}</h1>
        <p>{t('canteen.workerCopy')}</p>
      </header>
      <CanteenAdminPanel canManageAdmin={false} canEditSettings={false} />
    </div>
  );
}
