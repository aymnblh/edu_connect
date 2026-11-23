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
  'student', 'report_cards', 'fees', 'health', 'canteen', 'transport', 'announcement', 'dm',
  'school', 'data_export', 'audit', 'security',
];

function formatWhen(iso: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-DZ' : locale === 'en' ? 'en-GB' : 'fr-DZ', {
    timeZone: 'Africa/Algiers',
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(new Date(iso));
}

function formatDayValue(value: string, locale: Locale) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-DZ' : locale === 'en' ? 'en-GB' : 'fr-DZ', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
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
    const key = `audit.action.${action}`;
    const label = t(key);
    if (label !== key) return label;
    return action.replaceAll('.', ' — ').replaceAll('_', ' ');
  };
  const roleLabel = (role?: string | null) => (role ? t(`role.${role}`) : '');

  const formatMetaValue = (rawValue: unknown): string => {
    if (typeof rawValue === 'boolean') return rawValue ? t('audit.value.yes') : t('audit.value.no');
    const text = String(rawValue);
    const knownValueKeys: Record<string, string> = {
      morning: 'audit.value.morning',
      evening: 'audit.value.evening',
      both: 'audit.value.both',
      'school presentation': 'audit.value.schoolPresentation',
      cash: 'audit.value.cash',
      bank_transfer: 'audit.value.bank_transfer',
      ccp: 'audit.value.ccp',
      cheque: 'audit.value.cheque',
      monthly: 'audit.value.monthly',
      selected_days: 'audit.value.selected_days',
      app: 'audit.value.app',
      paper: 'audit.value.paper',
      principal: 'role.principal',
      secretary: 'role.secretary',
      teacher: 'role.teacher',
      parent: 'role.parent',
      nurse: 'role.nurse',
      canteen: 'role.canteen',
      driver: 'role.driver',
    };
    const mappedKey = knownValueKeys[text];
    if (mappedKey) return t(mappedKey);
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return formatDayValue(text, locale);
    return text;
  };

  const hiddenMetaKeys = new Set(['format_version', 'triggered_at']);

  const formatDetails = (event: AuditEvent) => {
    const resourceKey = event.resource_type ? `audit.resource.${event.resource_type}` : '';
    const resourceTranslated = resourceKey ? t(resourceKey) : '';
    const resourceLabel = resourceKey && resourceTranslated !== resourceKey ? resourceTranslated : event.resource_type;

    const meta = Object.entries(event.event_metadata ?? {})
      .filter(([key, value]) => {
        if (value === null || value === undefined || typeof value === 'object') return false;
        if (hiddenMetaKeys.has(key)) return false;
        if (key.endsWith('_id') && /^[0-9a-f-]{16,}$/i.test(String(value))) return false;
        return true;
      })
      .map(([key, value]) => {
        const metaKey = `audit.meta.${key}`;
        const translatedKey = t(metaKey);
        const label = translatedKey !== metaKey ? translatedKey : key.replaceAll('_', ' ');
        return `${label} : ${formatMetaValue(value)}`;
      });

    return [resourceLabel, ...meta].filter(Boolean).join(' · ');
  };

  const formatOrigin = (event: AuditEvent) => {
    const platformMap: Record<string, string> = {
      'local-script': t('audit.origin.system'),
      web: 'Web',
      android: 'Android',
      ios: 'iOS',
    };
    const rawPlatform = event.device_platform?.trim();
    const platform = rawPlatform ? (platformMap[rawPlatform.toLowerCase()] ?? rawPlatform) : null;
    return [event.ip_address, platform].filter(Boolean).join(' · ');
  };

  const exportCsv = async () => {
    setExporting(true);
    setError('');
    try {
      const response = await api.get('/security/audit-events/export', { params, responseType: 'blob' });
      const disposition = String(response.headers['content-disposition'] ?? '');
      const rawName = /filename=([^;]+)/.exec(disposition)?.[1]?.trim().replace(/^["']|["']$/g, '') ?? '';
      const safeName = rawName.replace(/[^A-Za-z0-9._-]/g, '_') || 'journal_audit.csv';
      const url = URL.createObjectURL(response.data as Blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = safeName;
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
                  <td className="audit-details">{formatDetails(event)}</td>
                  <td className="report-card-muted">{formatOrigin(event)}</td>
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
