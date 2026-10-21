import { useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Download, Loader2 } from 'lucide-react';
import { api } from '../lib/api';
import { type Locale, useLocale } from '../lib/i18n';

interface AuditEvent {
  id: string;
  actor_id?: string | null;
  actor_name?: string | null;
  actor_role?: string | null;
  action: string;
  resource_type?: string | null;
  resource_id?: string | null;
  status_code?: number | null;
  ip_address?: string | null;
  device_platform?: string | null;
  event_metadata?: Record<string, unknown> | null;
  created_at: string;
}

const PAGE_SIZE = 50;
const CATEGORIES = [
  'auth', 'user', 'staff', 'parent', 'account', 'grade', 'attendance', 'homework', 'lesson',
  'student', 'report_cards', 'announcement', 'dm', 'data_export', 'audit', 'security',
];

function formatWhen(iso: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-DZ' : locale === 'en' ? 'en-GB' : 'fr-DZ', {
    timeZone: 'Africa/Algiers',
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(new Date(iso));
}

function details(event: AuditEvent) {
  const meta = Object.entries(event.event_metadata ?? {})
    .filter(([, value]) => value !== null && value !== undefined && typeof value !== 'object')
    .map(([key, value]) => `${key}: ${String(value)}`);
  return [event.resource_type, ...meta].filter(Boolean).join(' · ');
}

type AuditLogPanelProps = {
  people: Array<{ id: string; full_name: string }>;
};

export default function AuditLogPanel({ people }: AuditLogPanelProps) {
  const { t, locale } = useLocale();
  const [filters, setFilters] = useState({ category: '', actorId: '', from: '', to: '', technical: false });
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  const params = {
    category: filters.category || undefined,
    actor_id: filters.actorId || undefined,
    // Dates are school days (Algeria, UTC+1).
    date_from: filters.from ? `${filters.from}T00:00:00+01:00` : undefined,
    date_to: filters.to ? `${filters.to}T23:59:59+01:00` : undefined,
    include_http: filters.technical,
  };

  const logQuery = useInfiniteQuery({
    queryKey: ['audit-log', params],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) =>
      (await api.get<AuditEvent[]>('/security/audit-events', { params: { ...params, limit: PAGE_SIZE, offset: pageParam } })).data,
    getNextPageParam: (lastPage, pages) => (lastPage.length === PAGE_SIZE ? pages.length * PAGE_SIZE : undefined),
  });
  const events = logQuery.data?.pages.flat() ?? [];

  const actionLabel = (action: string) => {
    const label = t(`audit.action.${action}`);
    return label === `audit.action.${action}` ? action : label;
  };
  const roleLabel = (role?: string | null) => (role ? t(`role.${role}`) : '');

  const exportCsv = async () => {
    setExporting(true);
    setError('');
    try {
      const response = await api.get('/security/audit-events/export', { params, responseType: 'blob' });
      const disposition = String(response.headers['content-disposition'] ?? '');
      const name = /filename=([^;]+)/.exec(disposition)?.[1] ?? 'journal_audit.csv';
      const url = URL.createObjectURL(response.data as Blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = name;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setError(t('audit.exportFailed'));
    } finally {
      setExporting(false);
    }
  };

  return (
    <section className="glass-card dashboard-card-pad">
      <div className="dashboard-toolbar">
        <div>
          <h2 className="dashboard-section-title dashboard-section-title--plain">{t('audit.title')}</h2>
          <p className="dashboard-section-copy">{t('audit.copy')}</p>
        </div>
        <button type="button" className="btn btn-secondary btn-compact" onClick={exportCsv} disabled={exporting}>
          {exporting ? <Loader2 size={14} className="spin-icon" /> : <Download size={14} />} {t('audit.export')}
        </button>
      </div>

      <div className="announcement-date-row">
        <div className="form-group">
          <label className="form-label" htmlFor="audit-category">{t('audit.category')}</label>
          <select id="audit-category" className="form-input" value={filters.category}
            onChange={(e) => setFilters({ ...filters, category: e.target.value })}>
            <option value="">{t('audit.allCategories')}</option>
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>{t(`audit.category.${category}`)}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="audit-person">{t('audit.person')}</label>
          <select id="audit-person" className="form-input" value={filters.actorId}
            onChange={(e) => setFilters({ ...filters, actorId: e.target.value })}>
            <option value="">{t('audit.everyone')}</option>
            {people.map((person) => <option key={person.id} value={person.id}>{person.full_name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="audit-from">{t('audit.from')}</label>
          <input id="audit-from" className="form-input" type="date" value={filters.from}
            onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="audit-to">{t('audit.to')}</label>
          <input id="audit-to" className="form-input" type="date" value={filters.to} min={filters.from || undefined}
            onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
        </div>
      </div>
      <label className="checkbox-row">
        <input type="checkbox" checked={filters.technical}
          onChange={(e) => setFilters({ ...filters, technical: e.target.checked })} />
        {t('audit.technical')}
      </label>
      {error && <p className="dashboard-section-copy" role="alert">{error}</p>}

      {logQuery.isLoading && <p className="dashboard-section-copy">{t('common.loading')}</p>}
      {!logQuery.isLoading && events.length === 0 && <p className="dashboard-section-copy">{t('audit.empty')}</p>}
      {events.length > 0 && (
        <div className="premium-table-wrapper">
          <table className="premium-table">
            <thead>
              <tr>
                <th>{t('audit.when')}</th>
                <th>{t('audit.person')}</th>
                <th>{t('audit.action')}</th>
                <th>{t('audit.details')}</th>
                <th>{t('audit.origin')}</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id} className={event.action.includes('failed') || (event.status_code ?? 0) >= 400 ? 'audit-row--warning' : ''}>
                  <td className="audit-nowrap">{formatWhen(event.created_at, locale)}</td>
                  <td>
                    {event.actor_name ?? t('audit.unknownPerson')}
                    {event.actor_role && <div className="report-card-muted">{roleLabel(event.actor_role)}</div>}
                  </td>
                  <td>{actionLabel(event.action)}</td>
                  <td className="audit-details">{details(event)}</td>
                  <td className="report-card-muted">{[event.ip_address, event.device_platform].filter(Boolean).join(' · ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {logQuery.hasNextPage && (
        <button type="button" className="btn btn-secondary btn-compact insights-table-toggle"
          onClick={() => void logQuery.fetchNextPage()} disabled={logQuery.isFetchingNextPage}>
          {logQuery.isFetchingNextPage ? <Loader2 size={14} className="spin-icon" /> : null} {t('audit.more')}
        </button>
      )}
    </section>
  );
}
