import { useMemo, useState } from 'react';
import { isAxiosError } from 'axios';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  Building,
  Bus,
  Calendar,
  CheckCircle2,
  Clock,
  Database,
  DollarSign,
  Eye,
  LogOut,
  MessageSquare,
  PlusCircle,
  Search,
  Server,
  Settings,
  ShieldAlert,
  Trash2,
  Users,
  Utensils,
} from 'lucide-react';
import { api } from '../../lib/api';
import { startSchoolImpersonation } from '../../lib/impersonation';
import { type Locale, useLocale } from '../../lib/i18n';
import { useWorkspace } from '../../contexts/useWorkspace';
import type { AddToastFn, AppReadiness, School, SubscriptionPayment } from './types';

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

export default function SuperAdminSchoolsTab({
  schools,
  readiness,
  readinessLoading,
  isCreateModalOpen,
  setIsCreateModalOpen,
  addToast,
}: {
  schools: School[];
  readiness?: AppReadiness;
  readinessLoading: boolean;
  isCreateModalOpen: boolean;
  setIsCreateModalOpen: (open: boolean) => void;
  addToast: AddToastFn;
}) {
  const { t, locale } = useLocale();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { refreshWorkspace } = useWorkspace();

  // Search / Filter / Sort
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended' | 'expired' | 'risk'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'name' | 'health' | 'expiry' | 'revenue'>('newest');

  // Payment & History Modal
  const [paymentSchool, setPaymentSchool] = useState<School | null>(null);
  const [amount, setAmount] = useState('');
  const [months, setMonths] = useState('12');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentNotes, setPaymentNotes] = useState('');

  // Create School Modal
  const [newSchoolName, setNewSchoolName] = useState('');
  const [newPrefix, setNewPrefix] = useState('');
  const [newPlan, setNewPlan] = useState('pro');
  const [newMaxParents, setNewMaxParents] = useState('2');
  const [newSubMonths, setNewSubMonths] = useState('3');
  const [newIsActive, setNewIsActive] = useState(true);
  const [newCanteen, setNewCanteen] = useState(false);
  const [newTransport, setNewTransport] = useState(false);
  const [includePrincipal, setIncludePrincipal] = useState(true);
  const [principalName, setPrincipalName] = useState('');
  const [principalEmail, setPrincipalEmail] = useState('');
  const [principalPassword, setPrincipalPassword] = useState('');

  // Edit / Manage School Modal
  const [editSchool, setEditSchool] = useState<School | null>(null);
  const [editName, setEditName] = useState('');
  const [editPrefix, setEditPrefix] = useState('');
  const [editPlan, setEditPlan] = useState('pro');
  const [editMaxParents, setEditMaxParents] = useState('2');
  const [editExpiryDate, setEditExpiryDate] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [editCanteen, setEditCanteen] = useState(false);
  const [editTransport, setEditTransport] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const paymentsHistoryQuery = useQuery<SubscriptionPayment[]>({
    queryKey: ['school-payments', paymentSchool?.id],
    enabled: Boolean(paymentSchool),
    queryFn: async () => (await api.get(`/system/schools/${paymentSchool!.id}/payments`)).data,
  });

  const handleApiError = (err: unknown, prefix?: string) => {
    const message = isAxiosError(err) ? err.response?.data?.detail || err.message : t('auth.connectionError');
    addToast(prefix ? `${prefix}: ${message}` : `${t('common.errorGeneric')}: ${message}`, 'error');
  };

  const platformTotals = useMemo(
    () =>
      schools.reduce(
        (totals, school) => ({
          activeSchools: totals.activeSchools + (school.is_active ? 1 : 0),
          users: totals.users + school.user_count,
          activeSessions: totals.activeSessions + school.active_session_count,
          audits24h: totals.audits24h + school.audit_event_count_24h,
          serverErrors24h: totals.serverErrors24h + school.server_error_count_24h,
          revenue: totals.revenue + school.total_revenue,
        }),
        { activeSchools: 0, users: 0, activeSessions: 0, audits24h: 0, serverErrors24h: 0, revenue: 0 },
      ),
    [schools],
  );

  const filteredSchools = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = schools.filter((school) => {
      if (q) {
        const hay = `${school.name} ${school.id} ${school.student_id_prefix || ''} ${school.referral_code || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      const isExpired =
        !school.subscription_expires_at ||
        school.health_status === 'subscription_expired' ||
        (school.days_until_expiry !== null && school.days_until_expiry !== undefined && school.days_until_expiry < 0);
      if (statusFilter === 'active') return school.is_active && !isExpired;
      if (statusFilter === 'suspended') return !school.is_active;
      if (statusFilter === 'expired') return isExpired;
      if (statusFilter === 'risk') return school.health_status === 'risk' || school.health_status === 'watch';
      return true;
    });

    const sorted = [...list];
    if (sortBy === 'name') sorted.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === 'health') sorted.sort((a, b) => a.health_score - b.health_score);
    else if (sortBy === 'revenue') sorted.sort((a, b) => b.total_revenue - a.total_revenue);
    else if (sortBy === 'expiry') {
      sorted.sort((a, b) => (a.days_until_expiry ?? -9999) - (b.days_until_expiry ?? -9999));
    }
    return sorted;
  }, [schools, search, statusFilter, sortBy]);

  const paymentMutation = useMutation({
    mutationFn: async (data: {
      school_id: string;
      amount: number;
      months_added: number;
      payment_method: string;
      notes?: string;
    }) =>
      api.post(`/system/schools/${data.school_id}/subscription`, {
        amount: data.amount,
        months_added: data.months_added,
        payment_method: data.payment_method,
        notes: data.notes || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schools'] });
      queryClient.invalidateQueries({ queryKey: ['school-payments', paymentSchool?.id] });
      setAmount('');
      setMonths('12');
      setPaymentNotes('');
      addToast(t('superadmin.toastPaymentSuccess'), 'success');
    },
    onError: (err) => handleApiError(err),
  });

  const deletePaymentMutation = useMutation({
    mutationFn: async (params: { schoolId: string; paymentId: string }) =>
      api.delete(`/system/schools/${params.schoolId}/payments/${params.paymentId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schools'] });
      queryClient.invalidateQueries({ queryKey: ['school-payments', paymentSchool?.id] });
      addToast(t('superadmin.toastPaymentDeleted'), 'success');
    },
    onError: (err) => handleApiError(err),
  });

  const createSchoolMutation = useMutation({
    mutationFn: async () =>
      api.post('/system/schools', {
        name: newSchoolName.trim(),
        student_id_prefix: newPrefix.trim() || null,
        is_active: newIsActive,
        plan: newPlan,
        max_parents_per_student: Number(newMaxParents) || 2,
        subscription_months: Number(newSubMonths) || 0,
        modules: { canteen: newCanteen, transport: newTransport },
        ...(includePrincipal && principalEmail.trim()
          ? {
              principal_full_name: principalName.trim(),
              principal_email: principalEmail.trim(),
              principal_password: principalPassword,
            }
          : {}),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schools'] });
      queryClient.invalidateQueries({ queryKey: ['system-users'] });
      setIsCreateModalOpen(false);
      setNewSchoolName('');
      setNewPrefix('');
      setPrincipalName('');
      setPrincipalEmail('');
      setPrincipalPassword('');
      addToast(t('superadmin.toastSchoolCreated'), 'success');
    },
    onError: (err) => handleApiError(err, t('superadmin.toastSchoolCreateError')),
  });

  const updateSchoolMutation = useMutation({
    mutationFn: async () => {
      if (!editSchool) return;
      return api.patch(`/system/schools/${editSchool.id}`, {
        name: editName.trim(),
        student_id_prefix: editPrefix.trim() || undefined,
        is_active: editIsActive,
        plan: editPlan,
        max_parents_per_student: Number(editMaxParents) || 2,
        subscription_expires_at: editExpiryDate ? `${editExpiryDate}T23:59:59+00:00` : null,
        modules: { canteen: editCanteen, transport: editTransport },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schools'] });
      setEditSchool(null);
      addToast(t('superadmin.toastSchoolUpdated'), 'success');
    },
    onError: (err) => handleApiError(err),
  });

  const deleteSchoolMutation = useMutation({
    mutationFn: async (params: { schoolId: string; confirmName: string }) =>
      api.delete(`/system/schools/${params.schoolId}`, {
        params: { confirm_name: params.confirmName },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schools'] });
      queryClient.invalidateQueries({ queryKey: ['system-users'] });
      setEditSchool(null);
      setDeleteConfirmText('');
      addToast(t('superadmin.toastSchoolDeleted'), 'success');
    },
    onError: (err) => handleApiError(err),
  });

  const revokeSchoolSessionsMutation = useMutation({
    mutationFn: async (schoolId: string) => api.post(`/system/schools/${schoolId}/revoke-sessions`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schools'] });
      addToast(t('superadmin.toastSchoolSessionsRevoked'), 'success');
    },
    onError: (err) => handleApiError(err),
  });

  const activateSchoolMutation = useMutation({
    mutationFn: async (id: string) => api.post(`/system/schools/${id}/activate`),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['schools'] });
      const detail = typeof res.data?.message === 'string' ? res.data.message : '';
      addToast(detail || t('superadmin.toastActivated'), 'success');
    },
    onError: (err) => handleApiError(err),
  });

  const suspendSchoolMutation = useMutation({
    mutationFn: async (id: string) => api.post(`/system/schools/${id}/deactivate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schools'] });
      addToast(t('superadmin.toastSuspended'), 'success');
    },
    onError: (err) => handleApiError(err),
  });

  const inspectMutation = useMutation({
    mutationFn: async (schoolId: string) =>
      (
        await api.post<{ access_token: string; school_id: string; school_name: string }>(
          `/system/schools/${schoolId}/impersonate`,
        )
      ).data,
    onSuccess: (data) => {
      startSchoolImpersonation({
        accessToken: data.access_token,
        schoolId: data.school_id,
        schoolName: data.school_name,
      });
      queryClient.clear();
      refreshWorkspace();
      navigate('/director');
    },
    onError: (err) => handleApiError(err),
  });

  const openEditSchool = (school: School) => {
    setEditSchool(school);
    setEditName(school.name);
    setEditPrefix(school.student_id_prefix || 'EDU');
    setEditPlan(school.plan || 'pro');
    setEditMaxParents(String(school.max_parents_per_student ?? 2));
    setEditExpiryDate(school.subscription_expires_at ? school.subscription_expires_at.slice(0, 10) : '');
    setEditIsActive(school.is_active);
    setEditCanteen(Boolean(school.modules?.canteen));
    setEditTransport(Boolean(school.modules?.transport));
    setDeleteConfirmText('');
  };

  return (
    <>
      <section className="glass-card dashboard-card-pad superadmin-platform-panel">
        <div className="dashboard-toolbar">
          <div>
            <h2 className="dashboard-section-title dashboard-section-title--plain">{t('superadmin.platformTitle')}</h2>
            <p className="dashboard-section-copy">{t('superadmin.platformCopy')}</p>
          </div>
          <span className={`status-badge ${readinessBadgeClass(readiness?.status)}`}>
            {readinessLoading
              ? t('common.loading')
              : t(`superadmin.readiness.${readiness?.status || 'unknown'}`)}
          </span>
        </div>

        <div className="superadmin-kpi-grid">
          <div className="superadmin-kpi">
            <Building size={18} />
            <span>{t('superadmin.kpiSchools')}</span>
            <strong>{formatNumber(schools.length, locale)}</strong>
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
            <strong>{readiness?.checks?.database || '-'}</strong>
          </div>
          <div className="platform-health-item">
            <Server size={16} />
            <span>{t('superadmin.checkRedis')}</span>
            <strong>{readiness?.checks?.redis || '-'}</strong>
          </div>
          <div className="platform-health-item">
            <Activity size={16} />
            <span>{t('superadmin.dbPool')}</span>
            <strong>
              {formatNumber(readiness?.db_pool?.checkedout ?? 0, locale)}/{formatNumber(readiness?.db_pool?.size ?? 0, locale)}
            </strong>
          </div>
          <div className="platform-health-item">
            <AlertTriangle size={16} />
            <span>{t('superadmin.kpiErrors')}</span>
            <strong>{formatNumber(platformTotals.serverErrors24h, locale)}</strong>
          </div>
        </div>
      </section>

      {/* Search, Filter & Sort Toolbar */}
      <section className="glass-card dashboard-card-pad" style={{ marginBottom: '1.25rem' }}>
        <div className="superadmin-filter-row">
          <div className="superadmin-search-box">
            <Search size={16} />
            <input
              type="search"
              className="input-field"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('superadmin.searchSchoolsPlaceholder')}
            />
          </div>

          <div className="superadmin-filter-chips">
            {(['all', 'active', 'suspended', 'expired', 'risk'] as const).map((status) => (
              <button
                key={status}
                type="button"
                className={`btn btn-compact ${statusFilter === status ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setStatusFilter(status)}
              >
                {t(`superadmin.filter.${status}`)}
              </button>
            ))}
          </div>

          <select
            className="form-input"
            aria-label={t('superadmin.sortLabel')}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          >
            <option value="newest">{t('superadmin.sort.newest')}</option>
            <option value="name">{t('superadmin.sort.name')}</option>
            <option value="health">{t('superadmin.sort.health')}</option>
            <option value="expiry">{t('superadmin.sort.expiry')}</option>
            <option value="revenue">{t('superadmin.sort.revenue')}</option>
          </select>
        </div>
      </section>

      {filteredSchools.length === 0 ? (
        <div className="glass-card dashboard-card-pad">
          <p className="dashboard-section-copy">{t('superadmin.noMatchingSchools')}</p>
        </div>
      ) : (
        <div className="grid-2 superadmin-school-grid">
          {filteredSchools.map((school) => {
            const isExpired = !school.subscription_expires_at || new Date(school.subscription_expires_at) < new Date();
            const signals = buildSchoolSignals(school, t);

            return (
              <div key={school.id} className="school-card school-card--ops">
                <div className="school-card-header">
                  <div>
                    <h3 className="school-card-title">
                      <Building size={20} color="var(--primary)" /> {school.name}
                    </h3>
                    <span className="school-card-id">
                      {school.student_id_prefix || 'EDU'} · {t('superadmin.schoolId', { id: school.id.slice(0, 8) })}
                      {school.plan ? ` · ${school.plan.toUpperCase()}` : ''}
                    </span>
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

                {/* Module & Referral Badges */}
                <div className="role-chip-row" style={{ marginBottom: '0.6rem' }}>
                  {school.modules?.canteen && (
                    <span><Utensils size={12} style={{ verticalAlign: 'middle' }} /> {t('nav.canteen')}</span>
                  )}
                  {school.modules?.transport && (
                    <span><Bus size={12} style={{ verticalAlign: 'middle' }} /> {t('nav.transport')}</span>
                  )}
                  {school.referral_code && (
                    <span>{t('superadmin.referralCode')}: {school.referral_code}</span>
                  )}
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
                    {(school.nurse_count ?? 0) > 0 && <span>{t('role.nurse')}: {school.nurse_count}</span>}
                    {(school.canteen_count ?? 0) > 0 && <span>{t('role.canteen')}: {school.canteen_count}</span>}
                    {(school.driver_count ?? 0) > 0 && <span>{t('role.driver')}: {school.driver_count}</span>}
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

                <div className="superadmin-card-actions">
                  <button
                    type="button"
                    className="btn btn-secondary btn-compact"
                    onClick={() => inspectMutation.mutate(school.id)}
                    disabled={inspectMutation.isPending}
                  >
                    <Eye size={15} /> {t('superadmin.inspectSchool')}
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-compact"
                    onClick={() => setPaymentSchool(school)}
                    aria-label={t('superadmin.addPaymentFor', { school: school.name })}
                  >
                    <DollarSign size={15} /> {t('superadmin.addPayment')}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-compact"
                    onClick={() => openEditSchool(school)}
                  >
                    <Settings size={15} /> {t('superadmin.manageSchool')}
                  </button>
                  <button
                    type="button"
                    className={`btn btn-compact ${school.is_active ? 'btn-danger' : 'btn-success'}`}
                    onClick={() => {
                      if (school.is_active) {
                        if (window.confirm(t('superadmin.confirmSuspend'))) {
                          suspendSchoolMutation.mutate(school.id);
                        }
                      } else {
                        activateSchoolMutation.mutate(school.id);
                      }
                    }}
                    disabled={suspendSchoolMutation.isPending || activateSchoolMutation.isPending}
                  >
                    {school.is_active ? t('superadmin.suspendSchool') : t('superadmin.activateSchool')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Payment + History Modal */}
      {paymentSchool && (
        <div
          className="workspace-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPaymentSchool(null);
          }}
        >
          <div
            className="workspace-modal payment-modal superadmin-modal-wide"
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-modal-title"
          >
            <h2 id="payment-modal-title" className="payment-modal-title">{t('superadmin.paymentTitle')}</h2>
            <p className="payment-school-copy">
              {t('superadmin.schoolLabel')} <strong className="payment-school-name">{paymentSchool.name}</strong>
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!amount) return;
                paymentMutation.mutate({
                  school_id: paymentSchool.id,
                  amount: parseFloat(amount),
                  months_added: parseInt(months, 10),
                  payment_method: paymentMethod,
                  notes: paymentNotes.trim() || undefined,
                });
              }}
            >
              <div className="superadmin-form-grid">
                <div className="form-group">
                  <label className="form-label" htmlFor="payment-amount">{t('superadmin.amountLabel')}</label>
                  <input
                    id="payment-amount"
                    type="number"
                    min="0"
                    className="input-field"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder={t('superadmin.amountPlaceholder')}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="payment-months">{t('superadmin.monthsLabel')}</label>
                  <input
                    id="payment-months"
                    type="number"
                    min="1"
                    max="120"
                    className="input-field"
                    value={months}
                    onChange={(e) => setMonths(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="payment-method">{t('superadmin.paymentMethodLabel')}</label>
                  <select
                    id="payment-method"
                    className="form-input"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                    <option value="cash">{t('audit.value.cash')}</option>
                    <option value="bank_transfer">{t('audit.value.bank_transfer')}</option>
                    <option value="ccp">{t('audit.value.ccp')}</option>
                    <option value="cheque">{t('audit.value.cheque')}</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="payment-notes">{t('superadmin.paymentNotesLabel')}</label>
                <input
                  id="payment-notes"
                  type="text"
                  className="input-field"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                />
              </div>

              <div className="payment-actions">
                <button type="button" className="btn btn-outline" onClick={() => setPaymentSchool(null)}>
                  {t('superadmin.cancelPayment')}
                </button>
                <button type="submit" className="btn btn-primary" disabled={paymentMutation.isPending || !amount}>
                  <PlusCircle size={16} /> {t('superadmin.validatePayment')}
                </button>
              </div>
            </form>

            <div className="superadmin-payment-history">
              <h4>{t('superadmin.paymentHistoryTitle')}</h4>
              {paymentsHistoryQuery.isLoading && <p className="report-card-muted">{t('common.loading')}</p>}
              {!paymentsHistoryQuery.isLoading && (paymentsHistoryQuery.data?.length ?? 0) === 0 && (
                <p className="report-card-muted">{t('superadmin.noPayment')}</p>
              )}
              {(paymentsHistoryQuery.data ?? []).map((p) => (
                <div key={p.id} className="superadmin-payment-item">
                  <div>
                    <strong>{formatCurrency(p.amount, locale)} DA</strong> · +{p.months_added}{' '}
                    {t('superadmin.monthsUnit')} ({p.payment_method})
                    <div className="report-card-muted">
                      {formatDateTime(p.created_at, locale)}
                      {p.notes ? ` — ${p.notes}` : ''}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-danger btn-compact"
                    title={t('superadmin.deletePayment')}
                    onClick={() => {
                      if (window.confirm(t('superadmin.confirmDeletePayment'))) {
                        deletePaymentMutation.mutate({ schoolId: paymentSchool.id, paymentId: p.id });
                      }
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Create School Modal (Full with optional Principal & Modules) */}
      {isCreateModalOpen && (
        <div
          className="workspace-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsCreateModalOpen(false);
          }}
        >
          <div
            className="workspace-modal superadmin-modal-wide"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-modal-title"
          >
            <h2 id="create-modal-title" className="payment-modal-title">{t('superadmin.createSchool')}</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newSchoolName.trim()) return;
                createSchoolMutation.mutate();
              }}
            >
              <div className="superadmin-form-grid">
                <div className="form-group">
                  <label className="form-label" htmlFor="new-school-name">{t('superadmin.schoolNameLabel')}</label>
                  <input
                    id="new-school-name"
                    type="text"
                    className="input-field"
                    value={newSchoolName}
                    onChange={(e) => setNewSchoolName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="new-school-prefix">{t('superadmin.prefixLabel')}</label>
                  <input
                    id="new-school-prefix"
                    type="text"
                    maxLength={10}
                    className="input-field"
                    value={newPrefix}
                    onChange={(e) => setNewPrefix(e.target.value)}
                    placeholder="EX: AML"
                  />
                </div>
              </div>

              <div className="superadmin-form-grid">
                <div className="form-group">
                  <label className="form-label" htmlFor="new-school-plan">{t('superadmin.planLabel')}</label>
                  <select id="new-school-plan" className="form-input" value={newPlan} onChange={(e) => setNewPlan(e.target.value)}>
                    <option value="starter">Starter</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="new-school-sub-months">{t('superadmin.initialMonthsLabel')}</label>
                  <input
                    id="new-school-sub-months"
                    type="number"
                    min="0"
                    max="120"
                    className="input-field"
                    value={newSubMonths}
                    onChange={(e) => setNewSubMonths(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="new-school-max-parents">{t('superadmin.maxParentsLabel')}</label>
                  <input
                    id="new-school-max-parents"
                    type="number"
                    min="1"
                    max="10"
                    className="input-field"
                    value={newMaxParents}
                    onChange={(e) => setNewMaxParents(e.target.value)}
                  />
                </div>
              </div>

              <div className="superadmin-toggle-row">
                <label className="checkbox-row">
                  <input type="checkbox" checked={newIsActive} onChange={(e) => setNewIsActive(e.target.checked)} />
                  <span>{t('superadmin.activateImmediately')}</span>
                </label>
                <label className="checkbox-row">
                  <input type="checkbox" checked={newCanteen} onChange={(e) => setNewCanteen(e.target.checked)} />
                  <span>{t('nav.canteen')}</span>
                </label>
                <label className="checkbox-row">
                  <input type="checkbox" checked={newTransport} onChange={(e) => setNewTransport(e.target.checked)} />
                  <span>{t('nav.transport')}</span>
                </label>
              </div>

              <div className="superadmin-subsection">
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={includePrincipal}
                    onChange={(e) => setIncludePrincipal(e.target.checked)}
                  />
                  <strong>{t('superadmin.createInitialPrincipal')}</strong>
                </label>
                {includePrincipal && (
                  <div className="superadmin-form-grid" style={{ marginTop: '0.75rem' }}>
                    <div className="form-group">
                      <label className="form-label" htmlFor="new-princ-name">{t('superadmin.users.fullNameLabel')}</label>
                      <input
                        id="new-princ-name"
                        type="text"
                        className="input-field"
                        value={principalName}
                        onChange={(e) => setPrincipalName(e.target.value)}
                        required={includePrincipal}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="new-princ-email">{t('superadmin.users.emailLabel')}</label>
                      <input
                        id="new-princ-email"
                        type="email"
                        className="input-field"
                        value={principalEmail}
                        onChange={(e) => setPrincipalEmail(e.target.value)}
                        required={includePrincipal}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="new-princ-pw">{t('superadmin.users.passwordLabel')}</label>
                      <input
                        id="new-princ-pw"
                        type="password"
                        minLength={8}
                        className="input-field"
                        value={principalPassword}
                        onChange={(e) => setPrincipalPassword(e.target.value)}
                        required={includePrincipal}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="payment-actions">
                <button type="button" className="btn btn-outline" onClick={() => setIsCreateModalOpen(false)}>
                  {t('superadmin.cancelPayment')}
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={createSchoolMutation.isPending || !newSchoolName.trim()}
                >
                  <PlusCircle size={16} />{' '}
                  {createSchoolMutation.isPending ? t('superadmin.creating') : t('superadmin.createSchoolSubmit')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage / Edit / Delete School Modal */}
      {editSchool && (
        <div
          className="workspace-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditSchool(null);
          }}
        >
          <div
            className="workspace-modal superadmin-modal-wide"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-school-title"
          >
            <h2 id="edit-school-title" className="payment-modal-title">
              {t('superadmin.manageSchoolTitle', { school: editSchool.name })}
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateSchoolMutation.mutate();
              }}
            >
              <div className="superadmin-form-grid">
                <div className="form-group">
                  <label className="form-label" htmlFor="edit-school-name">{t('superadmin.schoolNameLabel')}</label>
                  <input
                    id="edit-school-name"
                    type="text"
                    className="input-field"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="edit-school-prefix">{t('superadmin.prefixLabel')}</label>
                  <input
                    id="edit-school-prefix"
                    type="text"
                    maxLength={10}
                    className="input-field"
                    value={editPrefix}
                    onChange={(e) => setEditPrefix(e.target.value)}
                  />
                </div>
              </div>

              <div className="superadmin-form-grid">
                <div className="form-group">
                  <label className="form-label" htmlFor="edit-school-plan">{t('superadmin.planLabel')}</label>
                  <select id="edit-school-plan" className="form-input" value={editPlan} onChange={(e) => setEditPlan(e.target.value)}>
                    <option value="starter">Starter</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="edit-school-expiry">{t('superadmin.expiryDateLabel')}</label>
                  <input
                    id="edit-school-expiry"
                    type="date"
                    className="input-field"
                    value={editExpiryDate}
                    onChange={(e) => setEditExpiryDate(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="edit-school-max-parents">{t('superadmin.maxParentsLabel')}</label>
                  <input
                    id="edit-school-max-parents"
                    type="number"
                    min="1"
                    max="10"
                    className="input-field"
                    value={editMaxParents}
                    onChange={(e) => setEditMaxParents(e.target.value)}
                  />
                </div>
              </div>

              <div className="superadmin-toggle-row">
                <label className="checkbox-row">
                  <input type="checkbox" checked={editIsActive} onChange={(e) => setEditIsActive(e.target.checked)} />
                  <span>{t('superadmin.statusActive')}</span>
                </label>
                <label className="checkbox-row">
                  <input type="checkbox" checked={editCanteen} onChange={(e) => setEditCanteen(e.target.checked)} />
                  <span>{t('nav.canteen')}</span>
                </label>
                <label className="checkbox-row">
                  <input type="checkbox" checked={editTransport} onChange={(e) => setEditTransport(e.target.checked)} />
                  <span>{t('nav.transport')}</span>
                </label>
              </div>

              <div className="payment-actions">
                <button type="button" className="btn btn-outline" onClick={() => setEditSchool(null)}>
                  {t('superadmin.cancelPayment')}
                </button>
                <button type="submit" className="btn btn-primary" disabled={updateSchoolMutation.isPending}>
                  {t('superadmin.saveChanges')}
                </button>
              </div>
            </form>

            {/* Security & Danger Zone */}
            <div className="superadmin-danger-zone">
              <h4>{t('superadmin.dangerZoneTitle')}</h4>
              <div className="superadmin-danger-row">
                <span>{t('superadmin.revokeSchoolSessionsDesc')}</span>
                <button
                  type="button"
                  className="btn btn-outline btn-compact"
                  onClick={() => {
                    if (window.confirm(t('superadmin.confirmRevokeSchoolSessions', { school: editSchool.name }))) {
                      revokeSchoolSessionsMutation.mutate(editSchool.id);
                    }
                  }}
                  disabled={revokeSchoolSessionsMutation.isPending}
                >
                  <LogOut size={14} /> {t('superadmin.revokeSchoolSessions')}
                </button>
              </div>

              <div className="superadmin-delete-box">
                <p>{t('superadmin.deleteSchoolWarning', { school: editSchool.name })}</p>
                <div className="superadmin-delete-controls">
                  <input
                    type="text"
                    className="input-field"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder={editSchool.name}
                  />
                  <button
                    type="button"
                    className="btn btn-danger btn-compact"
                    disabled={
                      deleteSchoolMutation.isPending ||
                      deleteConfirmText.trim().toLowerCase() !== editSchool.name.trim().toLowerCase()
                    }
                    onClick={() =>
                      deleteSchoolMutation.mutate({
                        schoolId: editSchool.id,
                        confirmName: deleteConfirmText.trim(),
                      })
                    }
                  >
                    <Trash2 size={14} /> {t('superadmin.deleteSchool')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
