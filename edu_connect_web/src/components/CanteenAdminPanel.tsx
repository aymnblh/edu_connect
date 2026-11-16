import { useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Loader2,
  Printer,
  Search,
  Send,
  Trash2,
  Users,
  Utensils,
  Wallet,
} from 'lucide-react';
import { api } from '../lib/api';
import { useLocale } from '../lib/i18n';
import { formatDA } from '../lib/money';
import { Modal } from './DirectorRecordsPanels';

const ALLERGENS = [
  'gluten',
  'milk',
  'eggs',
  'peanuts',
  'nuts',
  'fish',
  'shellfish',
  'soy',
  'sesame',
  'celery',
  'mustard',
  'sulphites',
] as const;

const DIETS = ['none', 'vegetarian', 'gluten_free', 'diabetic', 'other'] as const;
const SCHOOL_DAYS = [0, 1, 2, 3, 4] as const;

interface CanteenDayMenu {
  day: string;
  weekday: number | null;
  menu: {
    id: string;
    starter: string | null;
    main: string;
    dessert: string | null;
    allergens: string[];
    note: string | null;
    published: boolean;
  } | null;
}

interface CanteenEnrollment {
  id: string;
  student_id: string;
  plan: 'monthly' | 'days';
  weekdays: number[];
  diet: string;
  diet_note: string | null;
  start_date: string | null;
  end_date: string | null;
  active: boolean;
}

interface CanteenStudentRow {
  student_id: string;
  student_name: string;
  student_code: string | null;
  class_name: string;
  enrollment: CanteenEnrollment | null;
}

interface HeadcountData {
  date: string;
  is_school_day: boolean;
  total: number;
  absent: number;
  by_class: Array<{
    class_id: string | null;
    class_name: string;
    expected: number;
    absent: number;
    attendance_taken: boolean;
  }>;
  by_diet: Record<string, number>;
  students: Array<{
    student_id: string;
    student_name: string;
    class_name: string;
    diet: string;
    diet_note: string | null;
    alert: string | null;
  }>;
}

function errorDetail(err: unknown, fallback: string) {
  if (isAxiosError(err)) {
    const detail = err.response?.data?.detail;
    if (typeof detail === 'string') return detail;
  }
  return fallback;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

/** Shared between director/secretary management and the dedicated canteen worker workspace. */
export default function CanteenAdminPanel({
  canManageAdmin = true,
  canEditSettings = false,
}: {
  canManageAdmin?: boolean;
  canEditSettings?: boolean;
}) {
  const { t, locale } = useLocale();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'headcount' | 'menus' | 'enrollments' | 'billing'>('headcount');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [headcountDate, setHeadcountDate] = useState(todayIso);
  const [weekDate, setWeekDate] = useState(todayIso);
  const [editingDay, setEditingDay] = useState<CanteenDayMenu | null>(null);
  const [menuForm, setMenuForm] = useState({
    starter: '',
    main: '',
    dessert: '',
    allergens: [] as string[],
    note: '',
  });
  const [search, setSearch] = useState('');
  const [editingStudent, setEditingStudent] = useState<CanteenStudentRow | null>(null);
  const [enrollForm, setEnrollForm] = useState({
    plan: 'monthly' as 'monthly' | 'days',
    weekdays: [0, 1, 2, 3, 4] as number[],
    diet: 'none',
    diet_note: '',
    start_date: todayIso(),
    end_date: '',
  });
  const now = new Date();
  const [billForm, setBillForm] = useState({
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    due_date: '',
  });
  const [priceForm, setPriceForm] = useState<{ monthly_price: string; daily_price: string } | null>(null);

  const headcountQuery = useQuery<HeadcountData>({
    queryKey: ['canteen-headcount', headcountDate],
    queryFn: async () => (await api.get('/canteen/headcount', { params: { date: headcountDate } })).data,
    enabled: tab === 'headcount',
  });

  const menusQuery = useQuery<{ week_start: string; days: CanteenDayMenu[] }>({
    queryKey: ['canteen-menus', weekDate],
    queryFn: async () => (await api.get('/canteen/menus', { params: { week: weekDate } })).data,
    enabled: tab === 'menus',
  });

  const enrollmentsQuery = useQuery<CanteenStudentRow[]>({
    queryKey: ['canteen-enrollments'],
    queryFn: async () => (await api.get('/canteen/enrollments')).data,
    enabled: canManageAdmin && tab === 'enrollments',
  });

  const settingsQuery = useQuery<{ monthly_price: number; daily_price: number }>({
    queryKey: ['canteen-settings'],
    queryFn: async () => (await api.get('/canteen/settings')).data,
    enabled: canManageAdmin && tab === 'billing',
  });

  const saveMenuMutation = useMutation({
    mutationFn: async () => {
      if (!editingDay) return;
      return api.put(`/canteen/menus/${editingDay.day}`, {
        starter: menuForm.starter || null,
        main: menuForm.main,
        dessert: menuForm.dessert || null,
        allergens: menuForm.allergens,
        note: menuForm.note || null,
      });
    },
    onSuccess: () => {
      setError('');
      setNotice(t('canteen.menuSaved'));
      setEditingDay(null);
      void queryClient.invalidateQueries({ queryKey: ['canteen-menus'] });
    },
    onError: (err) => setError(errorDetail(err, t('common.errorGeneric'))),
  });

  const deleteMenuMutation = useMutation({
    mutationFn: async (day: string) => api.delete(`/canteen/menus/${day}`),
    onSuccess: () => {
      setError('');
      void queryClient.invalidateQueries({ queryKey: ['canteen-menus'] });
    },
    onError: (err) => setError(errorDetail(err, t('common.errorGeneric'))),
  });

  const publishWeekMutation = useMutation({
    mutationFn: async () => (await api.post('/canteen/menus/publish', null, { params: { week: weekDate } })).data,
    onSuccess: (data: { published: number; notified: number }) => {
      setError('');
      setNotice(t('canteen.weekPublished', { published: data.published, notified: data.notified }));
      void queryClient.invalidateQueries({ queryKey: ['canteen-menus'] });
    },
    onError: (err) => setError(errorDetail(err, t('common.errorGeneric'))),
  });

  const saveEnrollmentMutation = useMutation({
    mutationFn: async () => {
      if (!editingStudent) return;
      return api.put(`/canteen/enrollments/${editingStudent.student_id}`, {
        plan: enrollForm.plan,
        weekdays: enrollForm.plan === 'monthly' ? [0, 1, 2, 3, 4] : enrollForm.weekdays,
        diet: enrollForm.diet,
        diet_note: enrollForm.diet_note || null,
        start_date: enrollForm.start_date,
        end_date: enrollForm.end_date || null,
      });
    },
    onSuccess: () => {
      setError('');
      setNotice(t('canteen.enrollmentSaved'));
      setEditingStudent(null);
      void queryClient.invalidateQueries({ queryKey: ['canteen-enrollments'] });
      void queryClient.invalidateQueries({ queryKey: ['canteen-headcount'] });
    },
    onError: (err) => setError(errorDetail(err, t('common.errorGeneric'))),
  });

  const removeEnrollmentMutation = useMutation({
    mutationFn: async (studentId: string) => api.delete(`/canteen/enrollments/${studentId}`),
    onSuccess: () => {
      setError('');
      setNotice(t('canteen.enrollmentRemoved'));
      void queryClient.invalidateQueries({ queryKey: ['canteen-enrollments'] });
      void queryClient.invalidateQueries({ queryKey: ['canteen-headcount'] });
    },
    onError: (err) => setError(errorDetail(err, t('common.errorGeneric'))),
  });

  const saveSettingsMutation = useMutation({
    mutationFn: async (values: { monthly_price: number; daily_price: number }) =>
      (await api.put('/canteen/settings', values)).data,
    onSuccess: () => {
      setError('');
      setNotice(t('canteen.settingsSaved'));
      setPriceForm(null);
      void queryClient.invalidateQueries({ queryKey: ['canteen-settings'] });
    },
    onError: (err) => setError(errorDetail(err, t('common.errorGeneric'))),
  });

  const billMonthMutation = useMutation({
    mutationFn: async () =>
      (
        await api.post('/canteen/billing', {
          year: billForm.year,
          month: billForm.month,
          due_date: billForm.due_date || null,
        })
      ).data,
    onSuccess: (data: { label: string; created: number; skipped: number; total_text: string }) => {
      setError('');
      setNotice(
        t('canteen.billedSuccess', {
          label: data.label,
          created: data.created,
          skipped: data.skipped,
          total: data.total_text,
        }),
      );
      void queryClient.invalidateQueries({ queryKey: ['fees-ledger'] });
    },
    onError: (err) => setError(errorDetail(err, t('common.errorGeneric'))),
  });

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (enrollmentsQuery.data ?? []).filter(
      (row) =>
        !q ||
        row.student_name.toLowerCase().includes(q) ||
        row.class_name.toLowerCase().includes(q) ||
        (row.student_code ?? '').toLowerCase().includes(q),
    );
  }, [enrollmentsQuery.data, search]);

  const openMenuEditor = (dayMenu: CanteenDayMenu) => {
    setEditingDay(dayMenu);
    setMenuForm({
      starter: dayMenu.menu?.starter ?? '',
      main: dayMenu.menu?.main ?? '',
      dessert: dayMenu.menu?.dessert ?? '',
      allergens: dayMenu.menu?.allergens ?? [],
      note: dayMenu.menu?.note ?? '',
    });
  };

  const openEnrollmentEditor = (row: CanteenStudentRow) => {
    setEditingStudent(row);
    setEnrollForm({
      plan: row.enrollment?.plan ?? 'monthly',
      weekdays: row.enrollment?.weekdays ?? [0, 1, 2, 3, 4],
      diet: row.enrollment?.diet ?? 'none',
      diet_note: row.enrollment?.diet_note ?? '',
      start_date: row.enrollment?.start_date ?? todayIso(),
      end_date: row.enrollment?.end_date ?? '',
    });
  };

  const effectivePrices = priceForm ?? {
    monthly_price: String(settingsQuery.data?.monthly_price ?? 0),
    daily_price: String(settingsQuery.data?.daily_price ?? 0),
  };

  return (
    <section className="glass-card dashboard-card-pad animate-fade-in">
      <div className="dashboard-toolbar">
        <div>
          <h2 className="dashboard-section-title dashboard-section-title--plain">
            <Utensils size={18} /> {t('canteen.title')}
          </h2>
          <p className="dashboard-section-copy">{t('canteen.copy')}</p>
        </div>
      </div>

      <div className="tab-bar" role="tablist" style={{ marginBottom: '1rem' }}>
        <button
          type="button"
          className={`tab-button ${tab === 'headcount' ? 'tab-button--active' : ''}`}
          onClick={() => setTab('headcount')}
        >
          <Users size={15} /> {t('canteen.tab.headcount')}
        </button>
        <button
          type="button"
          className={`tab-button ${tab === 'menus' ? 'tab-button--active' : ''}`}
          onClick={() => setTab('menus')}
        >
          <CalendarDays size={15} /> {t('canteen.tab.menus')}
        </button>
        {canManageAdmin && (
          <>
            <button
              type="button"
              className={`tab-button ${tab === 'enrollments' ? 'tab-button--active' : ''}`}
              onClick={() => setTab('enrollments')}
            >
              <CheckCircle2 size={15} /> {t('canteen.tab.enrollments')}
            </button>
            <button
              type="button"
              className={`tab-button ${tab === 'billing' ? 'tab-button--active' : ''}`}
              onClick={() => setTab('billing')}
            >
              <Wallet size={15} /> {t('canteen.tab.billing')}
            </button>
          </>
        )}
      </div>

      {notice && (
        <div className="notice-box" style={{ marginBottom: '1rem' }}>
          <span>{notice}</span>
        </div>
      )}
      {error && (
        <div className="login-error" role="alert" style={{ marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {tab === 'headcount' && (
        <div>
          <div className="fees-filters" style={{ marginBottom: '1rem' }}>
            <input
              type="date"
              className="form-input"
              value={headcountDate}
              onChange={(e) => setHeadcountDate(e.target.value)}
            />
            <button type="button" className="btn btn-secondary btn-compact" onClick={() => window.print()}>
              <Printer size={14} /> {t('canteen.printHeadcount')}
            </button>
          </div>

          {headcountQuery.isLoading && <p className="dashboard-section-copy">{t('common.loading')}</p>}
          {headcountQuery.data && (
            <>
              {!headcountQuery.data.is_school_day && (
                <p className="report-card-muted" style={{ marginBottom: '1rem' }}>
                  {t('canteen.notSchoolDay')}
                </p>
              )}
              <div className="metric-grid metric-grid--three" style={{ marginBottom: '1rem' }}>
                <div className="metric-item metric-item--success">
                  <div className="metric-label metric-label-strong">{t('canteen.mealsExpected')}</div>
                  <div className="metric-value metric-value--success">{headcountQuery.data.total}</div>
                </div>
                <div className="metric-item metric-item--warning">
                  <div className="metric-label metric-label-strong">{t('canteen.absentDeducted')}</div>
                  <div className="metric-value metric-value--warning">{headcountQuery.data.absent}</div>
                </div>
                <div className="metric-item">
                  <div className="metric-label metric-label-strong">{t('canteen.specialDiets')}</div>
                  <div className="metric-value">
                    {Object.entries(headcountQuery.data.by_diet)
                      .filter(([k]) => k !== 'none')
                      .reduce((sum, [, n]) => sum + n, 0)}
                  </div>
                </div>
              </div>

              {headcountQuery.data.by_class.length > 0 && (
                <div className="premium-table-wrapper" style={{ marginBottom: '1rem' }}>
                  <table className="premium-table">
                    <thead>
                      <tr>
                        <th>{t('codes.class')}</th>
                        <th>{t('canteen.mealsExpected')}</th>
                        <th>{t('canteen.absentDeducted')}</th>
                        <th>{t('canteen.attendanceRoll')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {headcountQuery.data.by_class.map((cls) => (
                        <tr key={cls.class_name}>
                          <td><strong>{cls.class_name}</strong></td>
                          <td>{cls.expected}</td>
                          <td>{cls.absent}</td>
                          <td>
                            <span className={`badge ${cls.attendance_taken ? 'badge-success' : 'badge-warning'}`}>
                              {cls.attendance_taken ? t('canteen.rollTaken') : t('canteen.rollPending')}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="premium-table-wrapper">
                <table className="premium-table">
                  <thead>
                    <tr>
                      <th>{t('fees.student')}</th>
                      <th>{t('codes.class')}</th>
                      <th>{t('canteen.diet')}</th>
                      <th>{t('infirmary.alert')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {headcountQuery.data.students.length === 0 && (
                      <tr><td colSpan={4}>{t('canteen.noMealsToday')}</td></tr>
                    )}
                    {headcountQuery.data.students.map((student) => (
                      <tr key={student.student_id}>
                        <td><strong>{student.student_name}</strong></td>
                        <td>{student.class_name}</td>
                        <td>
                          {t(`canteen.diet.${student.diet}`)}
                          {student.diet_note ? ` (${student.diet_note})` : ''}
                        </td>
                        <td>
                          {student.alert ? (
                            <span className="infirmary-alert">
                              <AlertTriangle size={14} aria-hidden="true" /> {student.alert}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'menus' && (
        <div>
          <div className="fees-filters" style={{ marginBottom: '1rem' }}>
            <input
              type="date"
              className="form-input"
              value={weekDate}
              onChange={(e) => setWeekDate(e.target.value)}
            />
            <button
              type="button"
              className="btn btn-primary btn-compact"
              disabled={publishWeekMutation.isPending}
              onClick={() => publishWeekMutation.mutate()}
            >
              {publishWeekMutation.isPending ? <Loader2 size={14} className="spin-icon" /> : <Send size={14} />}
              {t('canteen.publishWeek')}
            </button>
          </div>

          {menusQuery.isLoading && <p className="dashboard-section-copy">{t('common.loading')}</p>}
          <div className="premium-table-wrapper">
            <table className="premium-table">
              <thead>
                <tr>
                  <th>{t('parent.date')}</th>
                  <th>{t('canteen.starter')}</th>
                  <th>{t('canteen.main')}</th>
                  <th>{t('canteen.dessert')}</th>
                  <th>{t('canteen.allergens')}</th>
                  <th>{t('director.team.status')}</th>
                  <th>{t('director.students.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {(menusQuery.data?.days ?? []).map((item) => (
                  <tr key={item.day}>
                    <td>
                      <strong>{t(`canteen.weekday.${item.weekday ?? 0}`)}</strong>
                      <div className="table-cell-muted">{item.day}</div>
                    </td>
                    <td>{item.menu?.starter || '—'}</td>
                    <td><strong>{item.menu?.main || '—'}</strong></td>
                    <td>{item.menu?.dessert || '—'}</td>
                    <td>
                      {item.menu?.allergens.length
                        ? item.menu.allergens.map((a) => t(`canteen.allergen.${a}`)).join(', ')
                        : '—'}
                    </td>
                    <td>
                      {item.menu ? (
                        <span className={`badge ${item.menu.published ? 'badge-success' : 'badge-warning'}`}>
                          {item.menu.published ? t('canteen.published') : t('canteen.draft')}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      <div className="table-actions">
                        <button
                          type="button"
                          className="btn btn-secondary btn-compact"
                          onClick={() => openMenuEditor(item)}
                        >
                          {item.menu ? t('canteen.edit') : t('canteen.add')}
                        </button>
                        {item.menu && (
                          <button
                            type="button"
                            className="btn btn-danger btn-compact"
                            onClick={() => deleteMenuMutation.mutate(item.day)}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {canManageAdmin && tab === 'enrollments' && (
        <div>
          <div className="fees-filters" style={{ marginBottom: '1rem' }}>
            <div className="student-filter-bar">
              <Search size={17} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('fees.search')}
              />
            </div>
          </div>
          {enrollmentsQuery.isLoading && <p className="dashboard-section-copy">{t('common.loading')}</p>}
          <div className="premium-table-wrapper">
            <table className="premium-table">
              <thead>
                <tr>
                  <th>{t('fees.student')}</th>
                  <th>{t('codes.class')}</th>
                  <th>{t('canteen.plan')}</th>
                  <th>{t('canteen.diet')}</th>
                  <th>{t('director.students.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((row) => (
                  <tr key={row.student_id}>
                    <td>
                      <strong>{row.student_name}</strong>
                      <div className="table-cell-muted">{row.student_code ?? ''}</div>
                    </td>
                    <td>{row.class_name}</td>
                    <td>
                      {row.enrollment ? (
                        <span className="badge badge-success">
                          {row.enrollment.plan === 'monthly'
                            ? t('canteen.plan.monthly')
                            : `${t('canteen.plan.days')} (${row.enrollment.weekdays
                                .map((d) => t(`canteen.weekdayShort.${d}`))
                                .join(', ')})`}
                        </span>
                      ) : (
                        <span className="table-cell-muted">{t('canteen.notEnrolled')}</span>
                      )}
                    </td>
                    <td>{row.enrollment ? t(`canteen.diet.${row.enrollment.diet}`) : '—'}</td>
                    <td>
                      <div className="table-actions">
                        <button
                          type="button"
                          className="btn btn-secondary btn-compact"
                          onClick={() => openEnrollmentEditor(row)}
                        >
                          {row.enrollment ? t('canteen.edit') : t('canteen.enroll')}
                        </button>
                        {row.enrollment && (
                          <button
                            type="button"
                            className="btn btn-danger btn-compact"
                            onClick={() => removeEnrollmentMutation.mutate(row.student_id)}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {canManageAdmin && tab === 'billing' && (
        <div className="director-management-grid">
          <section className="glass-card management-card">
            <h3 className="dashboard-section-title dashboard-section-title--plain">{t('canteen.pricesTitle')}</h3>
            <p className="dashboard-section-copy">{t('canteen.pricesCopy')}</p>
            <form
              className="stacked-form"
              onSubmit={(e: FormEvent) => {
                e.preventDefault();
                saveSettingsMutation.mutate({
                  monthly_price: Number(effectivePrices.monthly_price || 0),
                  daily_price: Number(effectivePrices.daily_price || 0),
                });
              }}
            >
              <div className="form-group">
                <label className="form-label">{t('canteen.monthlyPrice')}</label>
                <input
                  type="number"
                  min={0}
                  step="50"
                  className="form-input"
                  value={effectivePrices.monthly_price}
                  disabled={!canEditSettings}
                  onChange={(e) => setPriceForm({ ...effectivePrices, monthly_price: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">{t('canteen.dailyPrice')}</label>
                <input
                  type="number"
                  min={0}
                  step="10"
                  className="form-input"
                  value={effectivePrices.daily_price}
                  disabled={!canEditSettings}
                  onChange={(e) => setPriceForm({ ...effectivePrices, daily_price: e.target.value })}
                />
              </div>
              {canEditSettings ? (
                <button type="submit" className="btn btn-primary" disabled={saveSettingsMutation.isPending}>
                  {t('common.save')}
                </button>
              ) : (
                <p className="report-card-muted">{t('branding.directorOnly')}</p>
              )}
            </form>
          </section>

          <section className="glass-card management-card">
            <h3 className="dashboard-section-title dashboard-section-title--plain">{t('canteen.billMonthTitle')}</h3>
            <p className="dashboard-section-copy">{t('canteen.billMonthCopy')}</p>
            <form
              className="stacked-form"
              onSubmit={(e: FormEvent) => {
                e.preventDefault();
                billMonthMutation.mutate();
              }}
            >
              <div className="form-group">
                <label className="form-label">{t('canteen.year')}</label>
                <input
                  type="number"
                  min={2020}
                  max={2100}
                  className="form-input"
                  value={billForm.year}
                  onChange={(e) => setBillForm((f) => ({ ...f, year: Number(e.target.value) }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">{t('canteen.month')}</label>
                <input
                  type="number"
                  min={1}
                  max={12}
                  className="form-input"
                  value={billForm.month}
                  onChange={(e) => setBillForm((f) => ({ ...f, month: Number(e.target.value) }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">{t('fees.dueDate')}</label>
                <input
                  type="date"
                  className="form-input"
                  value={billForm.due_date}
                  onChange={(e) => setBillForm((f) => ({ ...f, due_date: e.target.value }))}
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={billMonthMutation.isPending}>
                <Wallet size={15} /> {t('canteen.runBilling')}
              </button>
              {settingsQuery.data && (
                <p className="report-card-muted">
                  {t('canteen.currentPricesSummary', {
                    monthly: formatDA(settingsQuery.data.monthly_price, locale),
                    daily: formatDA(settingsQuery.data.daily_price, locale),
                  })}
                </p>
              )}
            </form>
          </section>
        </div>
      )}

      {editingDay && (
        <Modal title={`${t(`canteen.weekday.${editingDay.weekday ?? 0}`)} — ${editingDay.day}`} onClose={() => setEditingDay(null)}>
          <form
            className="stacked-form"
            onSubmit={(e) => {
              e.preventDefault();
              saveMenuMutation.mutate();
            }}
          >
            <div className="form-group">
              <label className="form-label">{t('canteen.starter')}</label>
              <input
                className="form-input"
                value={menuForm.starter}
                onChange={(e) => setMenuForm((m) => ({ ...m, starter: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t('canteen.main')}</label>
              <input
                className="form-input"
                required
                value={menuForm.main}
                onChange={(e) => setMenuForm((m) => ({ ...m, main: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t('canteen.dessert')}</label>
              <input
                className="form-input"
                value={menuForm.dessert}
                onChange={(e) => setMenuForm((m) => ({ ...m, dessert: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t('canteen.allergens')}</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {ALLERGENS.map((allergen) => {
                  const checked = menuForm.allergens.includes(allergen);
                  return (
                    <label key={allergen} className="checkbox-row">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setMenuForm((m) => ({
                            ...m,
                            allergens: checked
                              ? m.allergens.filter((x) => x !== allergen)
                              : [...m.allergens, allergen],
                          }))
                        }
                      />
                      <span>{t(`canteen.allergen.${allergen}`)}</span>
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">{t('canteen.note')}</label>
              <input
                className="form-input"
                value={menuForm.note}
                onChange={(e) => setMenuForm((m) => ({ ...m, note: e.target.value }))}
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={saveMenuMutation.isPending}>
              {t('common.save')}
            </button>
          </form>
        </Modal>
      )}

      {editingStudent && (
        <Modal title={editingStudent.student_name} onClose={() => setEditingStudent(null)}>
          <form
            className="stacked-form"
            onSubmit={(e) => {
              e.preventDefault();
              saveEnrollmentMutation.mutate();
            }}
          >
            <div className="form-group">
              <label className="form-label">{t('canteen.plan')}</label>
              <select
                className="form-input"
                value={enrollForm.plan}
                onChange={(e) => setEnrollForm((f) => ({ ...f, plan: e.target.value as 'monthly' | 'days' }))}
              >
                <option value="monthly">{t('canteen.plan.monthly')}</option>
                <option value="days">{t('canteen.plan.days')}</option>
              </select>
            </div>
            {enrollForm.plan === 'days' && (
              <div className="form-group">
                <label className="form-label">{t('canteen.weekdays')}</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {SCHOOL_DAYS.map((day) => {
                    const checked = enrollForm.weekdays.includes(day);
                    return (
                      <label key={day} className="checkbox-row">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setEnrollForm((f) => ({
                              ...f,
                              weekdays: checked ? f.weekdays.filter((d) => d !== day) : [...f.weekdays, day].sort(),
                            }))
                          }
                        />
                        <span>{t(`canteen.weekday.${day}`)}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="form-group">
              <label className="form-label">{t('canteen.diet')}</label>
              <select
                className="form-input"
                value={enrollForm.diet}
                onChange={(e) => setEnrollForm((f) => ({ ...f, diet: e.target.value }))}
              >
                {DIETS.map((d) => (
                  <option key={d} value={d}>{t(`canteen.diet.${d}`)}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">{t('canteen.dietNote')}</label>
              <input
                className="form-input"
                value={enrollForm.diet_note}
                onChange={(e) => setEnrollForm((f) => ({ ...f, diet_note: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t('canteen.startDate')}</label>
              <input
                type="date"
                className="form-input"
                required
                value={enrollForm.start_date}
                onChange={(e) => setEnrollForm((f) => ({ ...f, start_date: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t('canteen.endDate')}</label>
              <input
                type="date"
                className="form-input"
                value={enrollForm.end_date}
                onChange={(e) => setEnrollForm((f) => ({ ...f, end_date: e.target.value }))}
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={saveEnrollmentMutation.isPending}>
              {t('common.save')}
            </button>
          </form>
        </Modal>
      )}
    </section>
  );
}
