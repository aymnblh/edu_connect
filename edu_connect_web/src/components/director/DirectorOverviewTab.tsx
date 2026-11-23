import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  Activity,
  Award,
  CheckCircle2,
  Loader2,
  Search,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react';
import DashboardActionGrid from '../DashboardActionGrid';
import { api } from '../../lib/api';
import { formatAttendanceDate, getApiErrorMessage } from '../../lib/formatters';
import { t as translate, useLocale, type Locale } from '../../lib/i18n';
import type { AddToastFn, ClassPerformance, DirectorAnalytics, PendingAttendance } from './types';

interface ClassPerformanceTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    payload: ClassPerformance;
  }>;
}

const emptyPendingAttendances: PendingAttendance[] = [];

function attendanceStatusLabel(status: PendingAttendance['status'], locale: Locale) {
  return translate(
    status === 'late' ? 'director.attendance.late' : 'director.attendance.absent',
    undefined,
    locale,
  );
}

const CustomTooltip = ({ active, payload }: ClassPerformanceTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="tooltip-card">
        <p className="tooltip-title">{payload[0].payload.class_name}</p>
        <p className="tooltip-value">
          {translate('director.tooltipAverage', { score: payload[0].value.toFixed(2) })}
        </p>
      </div>
    );
  }
  return null;
};

export default function DirectorOverviewTab({ addToast }: { addToast: AddToastFn }) {
  const { t, locale } = useLocale();
  const queryClient = useQueryClient();
  const [pendingSearch, setPendingSearch] = useState('');
  const [pendingStatus, setPendingStatus] = useState<'all' | PendingAttendance['status']>('all');
  const [pendingLimit, setPendingLimit] = useState(8);
  const [approvalDrafts, setApprovalDrafts] = useState<Record<string, string>>({});

  const focusSection = (id: string) => {
    const section = document.getElementById(id);
    section?.scrollIntoView({ block: 'start' });
    section?.focus({ preventScroll: true });
  };

  const analyticsQuery = useQuery<DirectorAnalytics>({
    queryKey: ['director-analytics'],
    queryFn: async () => {
      const res = await api.get('/admin/analytics/overview');
      return res.data;
    },
  });

  const pendingAttendanceQuery = useQuery<PendingAttendance[]>({
    queryKey: ['director-pending-attendance'],
    queryFn: async () => {
      const res = await api.get('/admin/attendance/pending');
      return res.data;
    },
  });

  const pendingAttendances = pendingAttendanceQuery.data ?? emptyPendingAttendances;

  const filteredPendingAttendances = useMemo(() => {
    const search = pendingSearch.trim().toLowerCase();
    return pendingAttendances.filter((item) => {
      if (pendingStatus !== 'all' && item.status !== pendingStatus) return false;
      if (!search) return true;
      return `${item.student_name} ${item.class_name}`.toLowerCase().includes(search);
    });
  }, [pendingAttendances, pendingSearch, pendingStatus]);

  const visiblePendingAttendances = filteredPendingAttendances.slice(0, pendingLimit);

  const acceptAttendanceMutation = useMutation({
    mutationFn: async ({ item, justification }: { item: PendingAttendance; justification: string }) => {
      const res = await api.patch(`/classes/${item.class_id}/attendance/${item.id}/justify`, {
        justification,
        ...(item.justification_attachment_url ? { attachment_url: item.justification_attachment_url } : {}),
      });
      return { item, attendance: res.data as { is_justified?: boolean } };
    },
    onSuccess: ({ item, attendance }) => {
      setApprovalDrafts((current) => {
        const next = { ...current };
        delete next[item.id];
        return next;
      });
      if (attendance.is_justified) {
        queryClient.setQueryData<PendingAttendance[]>(
          ['director-pending-attendance'],
          (current) => current?.filter((pending) => pending.id !== item.id) ?? [],
        );
      }
      queryClient.invalidateQueries({ queryKey: ['director-pending-attendance'] });
      queryClient.invalidateQueries({ queryKey: ['director-analytics'] });
      addToast(t('director.toast.justificationApproved'), 'success');
    },
    onError: (error) => addToast(getApiErrorMessage(error), 'error'),
  });

  const acceptAttendance = (item: PendingAttendance) => {
    const justification = (approvalDrafts[item.id] ?? item.justification_text ?? '').trim();
    if (!justification) {
      addToast(t('director.toast.justificationRequired'), 'warning');
      return;
    }
    acceptAttendanceMutation.mutate({ item, justification });
  };

  if (analyticsQuery.isLoading) {
    return (
      <div className="loading-spinner screen-min-height">
        <div className="spinner" />
        <p>{t('director.loading')}</p>
      </div>
    );
  }

  if (analyticsQuery.error) {
    return (
      <div className="error-state screen-min-height">
        <TrendingDown size={48} className="dashboard-icon-spaced" />
        <h3>{t('director.loadError')}</h3>
      </div>
    );
  }

  const data = analyticsQuery.data;
  const lowPerformingClassCount = (data?.class_performance ?? []).filter((item) => item.average_score < 10).length;
  const strugglingStudentCount = data?.struggling_students?.length ?? 0;

  return (
    <>
      <DashboardActionGrid
        title={t('director.actions.title')}
        copy={t('director.actions.copy')}
        items={[
          {
            id: 'pending-attendance',
            label: t('director.actions.pending'),
            value: pendingAttendanceQuery.isLoading ? '…' : pendingAttendances.length,
            detail: t('director.actions.pendingDetail', { count: pendingAttendances.length }),
            icon: CheckCircle2,
            onClick: () => focusSection('director-pending-attendance'),
            tone: pendingAttendances.length > 0 ? 'warning' : 'success',
          },
          {
            id: 'struggling-students',
            label: t('director.actions.support'),
            value: strugglingStudentCount,
            detail: t('director.actions.supportDetail'),
            icon: TrendingDown,
            onClick: () => focusSection('director-struggling-students'),
            tone: strugglingStudentCount > 0 ? 'danger' : 'success',
          },
          {
            id: 'class-performance',
            label: t('director.actions.classes'),
            value: lowPerformingClassCount,
            detail: t('director.actions.classesDetail'),
            icon: Activity,
            onClick: () => focusSection('director-class-performance'),
            tone: lowPerformingClassCount > 0 ? 'warning' : 'success',
          },
        ]}
      />

      <div className="grid-2 director-grid-section">
        <div className="glass-card animate-fade-in delay-1 director-kpi-card">
          <div className="director-icon-box director-icon-box--primary">
            <TrendingUp size={36} />
          </div>
          <div>
            <p className="director-kpi-label">{t('director.schoolAverage')}</p>
            <h2 className="director-kpi-value">
              {data?.school_avg?.toFixed(2) || '0.00'}
              <span className="director-kpi-suffix">/20</span>
            </h2>
          </div>
        </div>

        <div className="glass-card animate-fade-in delay-1 director-kpi-card">
          <div className="director-icon-box director-icon-box--danger">
            <Users size={36} />
          </div>
          <div>
            <p className="director-kpi-label">{t('director.absenceRate')}</p>
            <h2 className="director-kpi-value">{data?.absence_rate?.toFixed(1) || '0.0'}%</h2>
          </div>
        </div>
      </div>

      <section id="director-pending-attendance" className="glass-card animate-fade-in delay-2 pending-attendance-panel" tabIndex={-1}>
        <div className="dashboard-toolbar dashboard-toolbar--spacious">
          <div>
            <h3 className="dashboard-section-title dashboard-section-title--plain">{t('director.pending.title')}</h3>
            <p className="dashboard-section-copy">{t('director.pending.copy')}</p>
          </div>
          <span className={`status-badge ${pendingAttendances.length > 0 ? 'status-badge--danger' : 'status-badge--active'}`}>
            {t('director.pending.count', { count: pendingAttendances.length })}
          </span>
        </div>

        {!pendingAttendanceQuery.isLoading && !pendingAttendanceQuery.error && pendingAttendances.length > 0 && (
          <div className="pending-attendance-filters">
            <label className="student-filter-bar pending-attendance-search">
              <Search size={17} />
              <span className="sr-only">{t('director.pending.search')}</span>
              <input
                value={pendingSearch}
                onChange={(event) => {
                  setPendingSearch(event.target.value);
                  setPendingLimit(8);
                }}
                placeholder={t('director.pending.search')}
              />
            </label>
            <label className="pending-attendance-status">
              <span className="sr-only">{t('director.pending.statusFilter')}</span>
              <select
                className="form-input"
                value={pendingStatus}
                onChange={(event) => {
                  setPendingStatus(event.target.value as 'all' | PendingAttendance['status']);
                  setPendingLimit(8);
                }}
              >
                <option value="all">{t('director.pending.allStatuses')}</option>
                <option value="absent">{attendanceStatusLabel('absent', locale)}</option>
                <option value="late">{attendanceStatusLabel('late', locale)}</option>
              </select>
            </label>
          </div>
        )}

        {pendingAttendanceQuery.isLoading && (
          <div className="pending-attendance-empty">
            <Loader2 size={18} className="spin-icon" />
            {t('director.pending.loading')}
          </div>
        )}

        {!pendingAttendanceQuery.isLoading && pendingAttendanceQuery.error && (
          <div className="pending-attendance-empty pending-attendance-empty--error">
            {t('director.pending.error')}
          </div>
        )}

        {!pendingAttendanceQuery.isLoading && !pendingAttendanceQuery.error && pendingAttendances.length === 0 && (
          <div className="pending-attendance-empty">
            <CheckCircle2 size={18} />
            {t('director.pending.empty')}
          </div>
        )}

        {!pendingAttendanceQuery.isLoading && !pendingAttendanceQuery.error && pendingAttendances.length > 0 && filteredPendingAttendances.length === 0 && (
          <div className="pending-attendance-empty">
            <Search size={18} />
            {t('director.pending.noResults')}
          </div>
        )}

        {!pendingAttendanceQuery.isLoading && !pendingAttendanceQuery.error && filteredPendingAttendances.length > 0 && (
          <>
            <div className="pending-attendance-list">
              {visiblePendingAttendances.map((item) => {
                const draft = approvalDrafts[item.id] ?? item.justification_text ?? '';
                const canApprove = draft.trim().length > 0;
                const isSaving = acceptAttendanceMutation.isPending;
                return (
                  <article className="pending-attendance-row" key={item.id}>
                    <div className="pending-attendance-main">
                      <div className="pending-attendance-title">
                        <strong>{item.student_name}</strong>
                        <span className={`status-badge ${item.status === 'absent' ? 'status-badge--danger' : 'status-badge--warning'}`}>
                          {attendanceStatusLabel(item.status, locale)}
                        </span>
                      </div>
                      <div className="pending-attendance-meta">
                        <span>{item.class_name}</span>
                        <span>{formatAttendanceDate(item.date, locale)}</span>
                      </div>
                      {item.note && <p className="pending-attendance-note">{item.note}</p>}
                    </div>

                    <label className="pending-attendance-approval">
                      <span>
                        {item.justification_text ? t('director.pending.justificationReceived') : t('director.pending.adminJustification')}
                      </span>
                      <textarea
                        value={draft}
                        onChange={(event) =>
                          setApprovalDrafts((current) => ({ ...current, [item.id]: event.target.value }))
                        }
                        placeholder={t('director.pending.placeholder')}
                        rows={2}
                      />
                    </label>

                    <button
                      type="button"
                      className="btn btn-primary btn-compact pending-attendance-action"
                      disabled={!canApprove || isSaving}
                      onClick={() => acceptAttendance(item)}
                    >
                      {isSaving ? <Loader2 size={15} className="spin-icon" /> : <CheckCircle2 size={15} />}
                      {t('director.pending.validate')}
                    </button>
                  </article>
                );
              })}
            </div>
            {visiblePendingAttendances.length < filteredPendingAttendances.length && (
              <div className="pending-attendance-more">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setPendingLimit((current) => current + 8)}
                >
                  {t('director.pending.showMore', { count: filteredPendingAttendances.length - visiblePendingAttendances.length })}
                </button>
              </div>
            )}
          </>
        )}
      </section>

      <div id="director-class-performance" className="glass-card animate-fade-in delay-2 analytics-card" tabIndex={-1}>
        <div className="dashboard-toolbar dashboard-toolbar--spacious">
          <div>
            <h3 className="dashboard-section-title dashboard-section-title--plain">{t('director.performanceTitle')}</h3>
            <p className="dashboard-section-copy">{t('director.performanceCopy')}</p>
          </div>
          <div className="realtime-pill">
            <Sparkles size={12} color="var(--primary)" /> {t('director.realtime')}
          </div>
        </div>

        <div className="chart-panel chart-panel--large" role="img" aria-label={t('director.chartAria')}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data?.class_performance}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
              <XAxis dataKey="class_name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} dy={10} />
              <YAxis domain={[0, 20]} stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} dx={-10} />
              <Tooltip cursor={{ fill: 'rgba(13,101,93,0.04)' }} content={<CustomTooltip />} />
              <Bar dataKey="average_score" fill="var(--primary)" radius={[3, 3, 0, 0]} barSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid-2">
        <div className="glass-card animate-fade-in delay-3 dashboard-card-pad">
          <div className="student-list-header">
            <div className="director-icon-box--success-sm">
              <Award size={20} />
            </div>
            <h3 className="dashboard-section-title dashboard-section-title--plain">{t('director.topStudents')}</h3>
          </div>
          <div className="dashboard-list">
            {data?.top_students?.map((student, idx) => (
              <div key={student.student_id} className="student-list-item hover-success">
                <div className="student-row-main">
                  <div className="student-rank student-rank--success">{idx + 1}</div>
                  <div>
                    <div className="student-name">{student.student_name}</div>
                    <div className="student-class">{student.class_name}</div>
                  </div>
                </div>
                <div className="student-score student-score--success">{student.average_score.toFixed(2)}</div>
              </div>
            ))}
            {(!data?.top_students || data.top_students.length === 0) && (
              <p className="empty-list-copy">{t('director.emptyGrades')}</p>
            )}
          </div>
        </div>

        <div id="director-struggling-students" className="glass-card animate-fade-in delay-3 dashboard-card-pad" tabIndex={-1}>
          <div className="student-list-header">
            <div className="director-icon-box--danger-sm">
              <TrendingDown size={20} />
            </div>
            <h3 className="dashboard-section-title dashboard-section-title--plain">{t('director.strugglingStudents')}</h3>
          </div>
          <div className="dashboard-list">
            {data?.struggling_students?.map((student, idx) => (
              <div key={student.student_id} className="student-list-item hover-danger">
                <div className="student-row-main">
                  <div className="student-rank student-rank--danger">{idx + 1}</div>
                  <div>
                    <div className="student-name">{student.student_name}</div>
                    <div className="student-class">{student.class_name}</div>
                  </div>
                </div>
                <div className="student-score student-score--danger">{student.average_score.toFixed(2)}</div>
              </div>
            ))}
            {(!data?.struggling_students || data.struggling_students.length === 0) && (
              <p className="empty-list-copy">{t('director.emptyStruggling')}</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
