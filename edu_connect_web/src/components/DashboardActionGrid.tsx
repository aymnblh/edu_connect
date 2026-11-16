import { useId } from 'react';
import { ArrowRight, type LucideIcon } from 'lucide-react';

export interface DashboardAction {
  id: string;
  label: string;
  value: string | number;
  detail: string;
  icon: LucideIcon;
  onClick: () => void;
  tone?: 'primary' | 'warning' | 'danger' | 'success';
}

interface DashboardActionGridProps {
  title: string;
  copy: string;
  items: DashboardAction[];
}

export default function DashboardActionGrid({ title, copy, items }: DashboardActionGridProps) {
  const titleId = useId();

  return (
    <section className="dashboard-action-center" aria-labelledby={titleId}>
      <div className="dashboard-action-heading">
        <h2 id={titleId}>{title}</h2>
        <p>{copy}</p>
      </div>
      <div className="dashboard-action-grid">
        {items.map(({ id, label, value, detail, icon: Icon, onClick, tone = 'primary' }) => (
          <button
            key={id}
            type="button"
            className={`dashboard-action-card dashboard-action-card--${tone}`}
            onClick={onClick}
            aria-label={`${label}: ${value}. ${detail}`}
          >
            <span className="dashboard-action-icon" aria-hidden="true">
              <Icon size={18} />
            </span>
            <span className="dashboard-action-body">
              <span className="dashboard-action-label">{label}</span>
              <strong className="dashboard-action-value">{value}</strong>
              <span className="dashboard-action-detail">{detail}</span>
            </span>
            <ArrowRight className="dashboard-action-arrow" size={16} aria-hidden="true" />
          </button>
        ))}
      </div>
    </section>
  );
}
