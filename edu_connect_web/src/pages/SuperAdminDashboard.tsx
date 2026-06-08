import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { isAxiosError } from 'axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useLocale, type Locale } from '../lib/i18n';
import {
  Activity,
  AlertTriangle,
  Building,
  Calendar,
  CheckCircle2,
  Clock,
  Database,
  DollarSign,
  MessageSquare,
  PlusCircle,
  Server,
  ShieldAlert,
  Users,
} from 'lucide-react';

interface School {
  id: string;
  name: string;
  is_active: boolean;
  subscription_expires_at: string | null;
  created_at?: string | null;
  user_count: number;
  teacher_count: number;
  parent_count: number;
  principal_count: number;
  secretary_count: number;
  student_count: number;
  class_count: number;
  course_count: number;
  active_session_count: number;
  pending_parent_link_count: number;
  used_parent_link_count: number;
  grade_count: number;
  approved_grade_count: number;
  pending_grade_count: number;
  attendance_count: number;
  absence_count: number;
  homework_count: number;
  class_message_count: number;
  direct_message_count: number;
  audit_event_count_24h: number;
  failed_auth_count_24h: number;
  server_error_count_24h: number;
  payment_count: number;
  total_revenue: number;
  last_payment_amount?: number | null;
  last_payment_at?: string | null;
  last_login_at?: string | null;
  last_audit_at?: string | null;
  last_message_at?: string | null;
  last_grade_at?: string | null;
  last_attendance_at?: string | null;
  days_until_expiry?: number | null;
  health_status: 'healthy' | 'watch' | 'risk' | 'suspended' | 'subscription_expired' | string;
  health_score: number;
  role_counts?: Record<string, number>;
}

interface AppReadiness {
  status: 'ready' | 'degraded' | string;
  checks?: Record<string, string>;
  db_pool?: Record<string, number | null>;
}

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'warning';
  exiting?: boolean;
}

let toastId = 0;

function localeToIntl(locale: Locale) {
  if (locale === 'ar') return 'ar-DZ';
  if (locale === 'en') return 'en-US';
  return 'fr-DZ';
}

function formatDate(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(localeToIntl(locale), {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function formatDateTime(value: string | null | undefined, locale: Locale) {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return new Intl.DateTimeFormat(localeToIntl(locale), {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed);
}

function formatNumber(value: number | null | undefined, locale: Locale) {
  return new Intl.NumberFormat(localeToIntl(locale)).format(value ?? 0);
}

function formatCurrency(value: number | null | undefined, locale: Locale) {
  return new Intl.NumberFormat(localeToIntl(locale), {
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}

function healthBadgeClass(status: string) {
  if (status === 'healthy') return 'status-badge--active';
  if (status === 'watch') return 'status-badge--warning';
  return 'status-badge--danger';
}

function readinessBadgeClass(status?: string) {
  return status === 'ready' ? 'status-badge--active' : 'status-badge--warning';
}

function buildSchoolSignals(school: School, t: (key: string, values?: Record<string, string | number>) => string) {
  const signals: Array<{ key: string; label: string; tone: 'danger' | 'warning' | 'success' }> = [];
  if (!school.is_active) {
    signals.push({ key: 'suspended', label: t('superadmin.signalSuspended'), tone: 'danger' });
  }
  if (school.days_until_expiry !== null && school.days_until_expiry !== undefined && school.days_until_expiry <= 7) {
    signals.push({
      key: 'expiry',
      label: t('superadmin.signalExpiry', { days: school.days_until_expiry }),
      tone: school.days_until_expiry < 0 ? 'danger' : 'warning',
    });
  }
  if (school.server_error_count_24h > 0) {
    signals.push({
      key: 'server-errors',
      label: t('superadmin.signalServerErrors', { count: school.server_error_count_24h }),
      tone: 'danger',
    });
  }
  if (school.failed_auth_count_24h >= 3) {
    signals.push({
      key: 'failed-auth',
      label: t('superadmin.signalFailedAuth', { count: school.failed_auth_count_24h }),
      tone: 'warning',
    });
  }
  if (school.pending_grade_count > 0) {
    signals.push({
      key: 'pending-grades',
      label: t('superadmin.signalPendingGrades', { count: school.pending_grade_count }),
      tone: 'warning',
    });
  }
  if (signals.length === 0) {
    signals.push({ key: 'ok', label: t('superadmin.signalHealthy'), tone: 'success' });
  }
  return signals;
}

export default function SuperAdminDashboard() {
  const queryClient = useQueryClient();
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [amount, setAmount] = useState('');
  const [months, setMonths] = useState('12');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const paymentModalRef = useRef<HTMLDivElement>(null);
  const { locale, t } = useLocale();

  const addToast = useCallback((message: string, type: Toast['type']) => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 300);
    }, 3500);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 300);
  }, []);

  useEffect(() => {
    if (!selectedSchool) return;
    const firstFocusable = paymentModalRef.current?.querySelector<HTMLElement>(
      'button, input, select, textarea, [href], [tabindex]:not([tabindex="-1"])'
    );
    firstFocusable?.focus();
  }, [selectedSchool]);

  const handlePaymentModalKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      setSelectedSchool(null);
      return;
    }

    if (event.key !== 'Tab' || !paymentModalRef.current) {
      return;
    }

    const focusable = Array.from(
      paymentModalRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
      )
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) return;

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const { data: schools, isLoading, error } = useQuery<School[]>({
    queryKey: ['schools'],
    queryFn: async () => {
      const res = await api.get('/system/schools');
      return res.data;
    }
  });

  const readinessQuery = useQuery<AppReadiness>({
    queryKey: ['platform-readiness'],
    refetchInterval: 30000,
    queryFn: async () => {
      const res = await api.get('/health/ready', { validateStatus: () => true });
      return res.data;
    },
  });

  const schoolList = useMemo(() => schools ?? [], [schools]);
  const platformTotals = useMemo(() => {
    return schoolList.reduce(
      (totals, school) => ({
        activeSchools: totals.activeSchools + (school.is_active ? 1 : 0),
        expiredSchools: totals.expiredSchools + (
          !school.subscription_expires_at || new Date(school.subscription_expires_at) < new Date() ? 1 : 0
        ),
        users: totals.users + school.user_count,
        students: totals.students + school.student_count,
        activeSessions: totals.activeSessions + school.active_session_count,
        audits24h: totals.audits24h + school.audit_event_count_24h,
        serverErrors24h: totals.serverErrors24h + school.server_error_count_24h,
        revenue: totals.revenue + school.total_revenue,
      }),
      {
        activeSchools: 0,
        expiredSchools: 0,
        users: 0,
        students: 0,
        activeSessions: 0,
        audits24h: 0,
        serverErrors24h: 0,
        revenue: 0,
      },
    );
  }, [schoolList]);

  const paymentMutation = useMutation({
    mutationFn: async (data: { school_id: string; amount: number; months_added: number }) => {
      return api.post(`/system/schools/${data.school_id}/subscription`, {
        amount: data.amount,
        months_added: data.months_added,
        payment_method: 'cash'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schools'] });
      setSelectedSchool(null);
      setAmount('');
      setMonths('12');
      addToast(t('superadmin.toastPaymentSuccess'), 'success');
    },
    onError: (err: unknown) => {
      const message = isAxiosError(err)
        ? err.response?.data?.detail || err.message
        : t('auth.connectionError');
      addToast(t('superadmin.toastPaymentError', { message }), 'error');
    }
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

  return (
    <div className="container animate-fade-in">
      {/* Toast container */}
      {toasts.length > 0 && (
        <div className="toast-container" aria-live="polite">
          {toasts.map(toast => (
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

      <header className="dashboard-header">
        <div className="badge dashboard-eyebrow">
          <Activity size={14} /> {t('superadmin.eyebrow')}
        </div>
        <h1>{t('superadmin.title')}</h1>
        <p>{t('superadmin.subtitle')}</p>
      </header>

      <section className="glass-card dashboard-card-pad superadmin-platform-panel">
        <div className="dashboard-toolbar">
          <div>
            <h2 className="dashboard-section-title dashboard-section-title--plain">{t('superadmin.platformTitle')}</h2>
            <p className="dashboard-section-copy">{t('superadmin.platformCopy')}</p>
          </div>
          <span className={`status-badge ${readinessBadgeClass(readinessQuery.data?.status)}`}>
            {readinessQuery.isLoading ? t('common.loading') : t(`superadmin.readiness.${readinessQuery.data?.status || 'unknown'}`)}
          </span>
        </div>

        <div className="superadmin-kpi-grid">
          <div className="superadmin-kpi">
            <Building size={18} />
            <span>{t('superadmin.kpiSchools')}</span>
            <strong>{formatNumber(schoolList.length, locale)}</strong>
          </div>
          <div className="superadmin-kpi">
            <CheckCircle2 size={18} />
            <span>{t('superadmin.kpiActiveSchools')}</span>
            <strong>{formatNumber(platformTotals.activeSchools, locale)}</strong>
          </div>
          <div className="superadmin-kpi">
            <Users size={18} />
            <span>{t('superadmin.kpiUsers')}</span>
            <strong>{formatNumber(platformTotals.users, locale)}</strong>
          </div>
          <div className="superadmin-kpi">
            <Activity size={18} />
            <span>{t('superadmin.kpiSessions')}</span>
            <strong>{formatNumber(platformTotals.activeSessions, locale)}</strong>
          </div>
          <div className="superadmin-kpi">
            <ShieldAlert size={18} />
            <span>{t('superadmin.kpiAudits')}</span>
            <strong>{formatNumber(platformTotals.audits24h, locale)}</strong>
          </div>
          <div className="superadmin-kpi">
            <DollarSign size={18} />
            <span>{t('superadmin.kpiRevenue')}</span>
            <strong>{formatCurrency(platformTotals.revenue, locale)} DA</strong>
          </div>
        </div>

        <div className="platform-health-grid">
          <div className="platform-health-item">
            <Database size={16} />
            <span>{t('superadmin.checkDatabase')}</span>
            <strong>{readinessQuery.data?.checks?.database || '-'}</strong>
          </div>
          <div className="platform-health-item">
            <Server size={16} />
            <span>{t('superadmin.checkRedis')}</span>
            <strong>{readinessQuery.data?.checks?.redis || '-'}</strong>
          </div>
          <div className="platform-health-item">
            <Activity size={16} />
            <span>{t('superadmin.dbPool')}</span>
            <strong>
              {formatNumber(readinessQuery.data?.db_pool?.checkedout ?? 0, locale)}
              /
              {formatNumber(readinessQuery.data?.db_pool?.size ?? 0, locale)}
            </strong>
          </div>
          <div className="platform-health-item">
            <AlertTriangle size={16} />
            <span>{t('superadmin.kpiErrors')}</span>
            <strong>{formatNumber(platformTotals.serverErrors24h, locale)}</strong>
          </div>
        </div>
      </section>

      <div className="grid-2 superadmin-school-grid">
        {schoolList.map(school => {
          const isExpired = !school.subscription_expires_at || new Date(school.subscription_expires_at) < new Date();
          const signals = buildSchoolSignals(school, t);
          
          return (
            <div key={school.id} className="school-card school-card--ops">
              <div className="school-card-header">
                <div>
                  <h3 className="school-card-title">
                    <Building size={20} color="var(--primary)" /> {school.name}
                  </h3>
                  <span className="school-card-id">{t('superadmin.schoolId', { id: school.id })}</span>
                </div>
                <div className="school-status-stack">
                  <span className={`badge ${isExpired ? 'badge-danger' : 'badge-success'}`}>
                    {isExpired ? t('superadmin.statusExpired') : t('superadmin.statusActive')}
                  </span>
                  <span className={`status-badge ${healthBadgeClass(school.health_status)}`}>
                    {t(`superadmin.health.${school.health_status}`)}
                  </span>
                </div>
              </div>

              <div className="school-expiration">
                <Calendar size={16} />
                <span>
                  {t('superadmin.expiration', {
                    date: school.subscription_expires_at
                      ? formatDate(school.subscription_expires_at, locale)
                      : t('superadmin.never'),
                  })}
                </span>
              </div>

              <div className="school-ops-summary">
                <div>
                  <span>{t('superadmin.healthScore')}</span>
                  <strong>{school.health_score}/100</strong>
                </div>
                <div>
                  <span>{t('superadmin.createdAt')}</span>
                  <strong>{formatDateTime(school.created_at, locale)}</strong>
                </div>
                <div>
                  <span>{t('superadmin.lastLogin')}</span>
                  <strong>{formatDateTime(school.last_login_at, locale)}</strong>
                </div>
              </div>

              <div className="school-detail-section">
                <h4>{t('superadmin.sectionPopulation')}</h4>
                <div className="school-mini-grid">
                  <span>{t('superadmin.metricUsers')} <strong>{formatNumber(school.user_count, locale)}</strong></span>
                  <span>{t('superadmin.metricStudents')} <strong>{formatNumber(school.student_count, locale)}</strong></span>
                  <span>{t('superadmin.metricClasses')} <strong>{formatNumber(school.class_count, locale)}</strong></span>
                  <span>{t('superadmin.metricCourses')} <strong>{formatNumber(school.course_count, locale)}</strong></span>
                </div>
                <div className="role-chip-row">
                  <span>{t('role.principal')}: {formatNumber(school.principal_count, locale)}</span>
                  <span>{t('role.secretary')}: {formatNumber(school.secretary_count, locale)}</span>
                  <span>{t('role.teacher')}: {formatNumber(school.teacher_count, locale)}</span>
                  <span>{t('role.parent')}: {formatNumber(school.parent_count, locale)}</span>
                </div>
              </div>

              <div className="school-detail-section">
                <h4>{t('superadmin.sectionUsage')}</h4>
                <div className="school-mini-grid">
                  <span><Activity size={13} /> {t('superadmin.metricSessions')} <strong>{formatNumber(school.active_session_count, locale)}</strong></span>
                  <span><MessageSquare size={13} /> {t('superadmin.metricMessages')} <strong>{formatNumber(school.class_message_count + school.direct_message_count, locale)}</strong></span>
                  <span>{t('superadmin.metricGrades')} <strong>{formatNumber(school.grade_count, locale)}</strong></span>
                  <span>{t('superadmin.metricAbsences')} <strong>{formatNumber(school.absence_count, locale)}</strong></span>
                  <span>{t('superadmin.metricHomework')} <strong>{formatNumber(school.homework_count, locale)}</strong></span>
                  <span>{t('superadmin.metricLinks')} <strong>{formatNumber(school.used_parent_link_count, locale)}</strong></span>
                </div>
              </div>

              <div className="school-detail-section">
                <h4>{t('superadmin.sectionObservability')}</h4>
                <div className="school-mini-grid">
                  <span><ShieldAlert size={13} /> {t('superadmin.metricAudit24h')} <strong>{formatNumber(school.audit_event_count_24h, locale)}</strong></span>
                  <span>{t('superadmin.metricFailedAuth')} <strong>{formatNumber(school.failed_auth_count_24h, locale)}</strong></span>
                  <span>{t('superadmin.metricServerErrors')} <strong>{formatNumber(school.server_error_count_24h, locale)}</strong></span>
                  <span>{t('superadmin.metricPendingLinks')} <strong>{formatNumber(school.pending_parent_link_count, locale)}</strong></span>
                </div>
                <div className="school-timeline">
                  <span><Clock size={13} /> {t('superadmin.lastAudit')}: {formatDateTime(school.last_audit_at, locale)}</span>
                  <span>{t('superadmin.lastMessage')}: {formatDateTime(school.last_message_at, locale)}</span>
                  <span>{t('superadmin.lastGrade')}: {formatDateTime(school.last_grade_at, locale)}</span>
                  <span>{t('superadmin.lastAttendance')}: {formatDateTime(school.last_attendance_at, locale)}</span>
                </div>
              </div>

              <div className="school-signal-list">
                {signals.map((signal) => (
                  <span key={signal.key} className={`school-signal school-signal--${signal.tone}`}>
                    {signal.label}
                  </span>
                ))}
              </div>

              <div className="school-billing-row">
                <span>
                  {t('superadmin.paymentsCount', { count: school.payment_count })}
                  {school.last_payment_at && ` - ${formatDateTime(school.last_payment_at, locale)}`}
                </span>
                <strong>
                  {school.last_payment_amount !== null && school.last_payment_amount !== undefined
                    ? `${formatCurrency(school.last_payment_amount, locale)} DA`
                    : t('superadmin.noPayment')}
                </strong>
              </div>

              <button 
                className="btn btn-primary btn-full" 
                onClick={() => setSelectedSchool(school)}
                aria-label={t('superadmin.addPaymentFor', { school: school.name })}
              >
                <DollarSign size={18} /> {t('superadmin.addPayment')}
              </button>
            </div>
          );
        })}
      </div>

      {/* Payment Modal */}
      {selectedSchool && (
        <div
          className="workspace-modal-backdrop"
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedSchool(null); }}
        >
          <div
            ref={paymentModalRef}
            className="workspace-modal payment-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-modal-title"
            onKeyDown={handlePaymentModalKeyDown}
          >
            <h2 id="payment-modal-title" className="payment-modal-title">{t('superadmin.paymentTitle')}</h2>
            <p className="payment-school-copy">
              {t('superadmin.schoolLabel')} <strong className="payment-school-name">{selectedSchool.name}</strong>
            </p>

            <form onSubmit={(e) => {
              e.preventDefault();
              if (!amount) return;
              paymentMutation.mutate({ 
                school_id: selectedSchool.id, 
                amount: parseFloat(amount), 
                months_added: parseInt(months) 
              });
            }}>
              <div className="form-group">
                <label className="form-label" htmlFor="payment-amount">{t('superadmin.amountLabel')}</label>
                <input 
                  id="payment-amount"
                  type="number" 
                  className="input-field" 
                  value={amount} 
                  onChange={e => setAmount(e.target.value)} 
                  placeholder={t('superadmin.amountPlaceholder')}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="payment-months">{t('superadmin.monthsLabel')}</label>
                <input 
                  id="payment-months"
                  type="number" 
                  className="input-field" 
                  value={months} 
                  onChange={e => setMonths(e.target.value)} 
                  required
                />
              </div>

              <div className="payment-actions">
                <button type="button" className="btn btn-outline" onClick={() => setSelectedSchool(null)} aria-label={t('superadmin.cancelPaymentAria')}>{t('superadmin.cancelPayment')}</button>
                <button 
                  type="submit"
                  className="btn btn-primary"
                  disabled={paymentMutation.isPending || !amount}
                  aria-label={t('superadmin.validatePaymentAria')}
                  aria-busy={paymentMutation.isPending}
                >
                  <PlusCircle size={18} /> {t('superadmin.validatePayment')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
