import { useMemo, useState } from 'react';
import { isAxiosError } from 'axios';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Download, Loader2, Trash2 } from 'lucide-react';
import { api } from '../../lib/api';
import { type Locale, useLocale } from '../../lib/i18n';
import type { AddToastFn, School } from './types';

interface AuditEvent {
  id: string;
  school_id?: string | null;
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
  'system', 'auth', 'user', 'staff', 'parent', 'account', 'grade', 'attendance', 'homework', 'lesson',
  'student', 'class', 'report_cards', 'fees', 'health', 'canteen', 'transport', 'announcement', 'dm',
  'school', 'data_export', 'audit', 'security',
];

function formatWhen(iso: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-DZ' : locale === 'en' ? 'en-GB' : 'fr-DZ', {
    timeZone: 'Africa/Algiers',
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(new Date(iso));
}

export default function SuperAdminAuditTab({
  schools,
  addToast,
}: {
  schools: School[];
  addToast: AddToastFn;
}) {
  const { t, locale } = useLocale();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({
    schoolId: '',
    category: '',
    from: '',
    to: '',
    technical: false,
  });
  const [exporting, setExporting] = useState(false);

  const schoolNames = useMemo(() => {
    const map = new Map<string, string>();
    schools.forEach((s) => map.set(s.id, s.name));
    return map;
  }, [schools]);

  const params = {
    school_id: filters.schoolId || undefined,
    category: filters.category || undefined,
    date_from: filters.from ? `${filters.from}T00:00:00+01:00` : undefined,
    date_to: filters.to ? `${filters.to}T23:59:59+01:00` : undefined,
    include_http: filters.technical,
  };

  const logQuery = useInfiniteQuery({
    queryKey: ['superadmin-audit-log', params],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) =>
      (
        await api.get<AuditEvent[]>('/security/audit-events', {
          params: { ...params, limit: PAGE_SIZE, offset: pageParam },
        })
      ).data,
    getNextPageParam: (lastPage, pages) => (lastPage.length === PAGE_SIZE ? pages.length * PAGE_SIZE : undefined),
  });

  const purgeMutation = useMutation({
    mutationFn: async () =>
      (await api.post<{ deleted_count: number; cutoff: string }>('/security/audit-events/retention/purge')).data,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['superadmin-audit-log'] });
      addToast(
        t('superadmin.audit.purgeSuccess', {
          count: res.deleted_count,
          cutoff: res.cutoff.slice(0, 10),
        }),
        'success',
      );
    },
    onError: (err: unknown) => {
      const message = isAxiosError(err) ? err.response?.data?.detail || err.message : t('auth.connectionError');
      addToast(`${t('common.errorGeneric')}: ${message}`, 'error');
    },
  });

  const events = logQuery.data?.pages.flat() ?? [];

  const actionLabel = (action: string) => {
    const key = `audit.action.${action}`;
    const label = t(key);
    return label !== key ? label : action.replaceAll('.', ' — ').replaceAll('_', ' ');
  };

  const formatDetails = (event: AuditEvent) => {
    const meta = Object.entries(event.event_metadata ?? {})
      .filter(([key, value]) => {
        if (value === null || value === undefined || typeof value === 'object') return false;
        if (key.endsWith('_id') && /^[0-9a-f-]{16,}$/i.test(String(value))) return false;
        return true;
      })
      .map(([key, value]) => `${key.replaceAll('_', ' ')}: ${String(value)}`);
    return [event.resource_type, ...meta].filter(Boolean).join(' · ');
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const response = await api.get('/security/audit-events/export', { params, responseType: 'blob' });
      const disposition = String(response.headers['content-disposition'] ?? '');
      const rawName = /filename=([^;]+)/.exec(disposition)?.[1]?.trim().replace(/^["']|["']$/g, '') ?? '';
      const safeName = rawName.replace(/[^A-Za-z0-9._-]/g, '_') || 'journal_audit_global.csv';
      const url = URL.createObjectURL(response.data as Blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = safeName;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      addToast(t('audit.exportFailed'), 'error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <section className="glass-card dashboard-card-pad">
      <div className="dashboard-toolbar">
        <div>
          <h2 className="dashboard-section-title dashboard-section-title--plain">{t('superadmin.audit.title')}</h2>
          <p className="dashboard-section-copy">{t('superadmin.audit.copy')}</p>
        </div>
        <div className="superadmin-toolbar-actions">
          <button type="button" className="btn btn-secondary btn-compact" onClick={() => void exportCsv()} disabled={exporting}>
            {exporting ? <Loader2 size={14} className="spin-icon" /> : <Download size={14} />} {t('audit.export')}
          </button>
          <button
            type="button"
            className="btn btn-danger btn-compact"
            onClick={() => {
              if (window.confirm(t('superadmin.audit.confirmPurge'))) {
                purgeMutation.mutate();
              }
            }}
            disabled={purgeMutation.isPending}
          >
            <Trash2 size={14} /> {t('superadmin.audit.purge')}
          </button>
        </div>
      </div>

      <div className="announcement-date-row">
        <div className="form-group">
          <label className="form-label" htmlFor="sa-audit-school">{t('superadmin.audit.schoolFilter')}</label>
          <select
            id="sa-audit-school"
            className="form-input"
            value={filters.schoolId}
            onChange={(e) => setFilters({ ...filters, schoolId: e.target.value })}
          >
            <option value="">{t('superadmin.audit.allSchools')}</option>
            <option value="__platform__">{t('superadmin.audit.platformOnly')}</option>
            {schools.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="sa-audit-category">{t('audit.category')}</label>
          <select
            id="sa-audit-category"
            className="form-input"
            value={filters.category}
            onChange={(e) => setFilters({ ...filters, category: e.target.value })}
          >
            <option value="">{t('audit.allCategories')}</option>
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {t(`audit.category.${category}`) !== `audit.category.${category}`
                  ? t(`audit.category.${category}`)
                  : category}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="sa-audit-from">{t('audit.from')}</label>
          <input
            id="sa-audit-from"
            className="form-input"
            type="date"
            value={filters.from}
            onChange={(e) => setFilters({ ...filters, from: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="sa-audit-to">{t('audit.to')}</label>
          <input
            id="sa-audit-to"
            className="form-input"
            type="date"
            value={filters.to}
            min={filters.from || undefined}
            onChange={(e) => setFilters({ ...filters, to: e.target.value })}
          />
        </div>
      </div>

      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={filters.technical}
          onChange={(e) => setFilters({ ...filters, technical: e.target.checked })}
        />
        {t('audit.technical')}
      </label>

      {logQuery.isLoading && <p className="dashboard-section-copy">{t('common.loading')}</p>}
      {!logQuery.isLoading && events.length === 0 && <p className="dashboard-section-copy">{t('audit.empty')}</p>}

      {events.length > 0 && (
        <div className="premium-table-wrapper">
          <table className="premium-table">
            <thead>
              <tr>
                <th>{t('audit.when')}</th>
                <th>{t('superadmin.audit.schoolColumn')}</th>
                <th>{t('audit.person')}</th>
                <th>{t('audit.action')}</th>
                <th>{t('audit.details')}</th>
                <th>{t('audit.origin')}</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr
                  key={event.id}
                  className={event.action.includes('failed') || (event.status_code ?? 0) >= 400 ? 'audit-row--warning' : ''}
                >
                  <td className="audit-nowrap">{formatWhen(event.created_at, locale)}</td>
                  <td>
                    {event.school_id
                      ? schoolNames.get(event.school_id) ?? event.school_id.slice(0, 8)
                      : t('superadmin.audit.platformBadge')}
                  </td>
                  <td>
                    {event.actor_name ?? t('audit.unknownPerson')}
                    {event.actor_role && <div className="report-card-muted">{t(`role.${event.actor_role}`)}</div>}
                  </td>
                  <td>{actionLabel(event.action)}</td>
                  <td className="audit-details">{formatDetails(event)}</td>
                  <td className="report-card-muted">
                    {[event.ip_address, event.device_platform].filter(Boolean).join(' · ') || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {logQuery.hasNextPage && (
        <button
          type="button"
          className="btn btn-secondary btn-compact insights-table-toggle"
          onClick={() => void logQuery.fetchNextPage()}
          disabled={logQuery.isFetchingNextPage}
        >
          {logQuery.isFetchingNextPage ? <Loader2 size={14} className="spin-icon" /> : null} {t('audit.more')}
        </button>
      )}
    </section>
  );
}
