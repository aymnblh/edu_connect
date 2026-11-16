import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { Bus, Trash2, Utensils } from 'lucide-react';
import { api } from '../lib/api';
import { useLocale } from '../lib/i18n';
import { formatDA } from '../lib/money';

interface ParentCanteenData {
  week_start: string;
  prices: { monthly_price: number; daily_price: number };
  children: Array<{
    student_id: string;
    student_name: string;
    enrollment: {
      plan: 'monthly' | 'days';
      weekdays: number[];
      diet: string;
      diet_note: string | null;
      active: boolean;
    } | null;
  }>;
  days: Array<{
    day: string;
    weekday: number | null;
    menu: {
      starter: string | null;
      main: string;
      dessert: string | null;
      allergens: string[];
      note: string | null;
    } | null;
  }>;
}

interface ParentTransportData {
  date: string;
  children: Array<{
    student_id: string;
    student_name: string;
    assignment: {
      route_name: string | null;
      vehicle_plate: string | null;
      driver_name: string | null;
      driver_phone: string | null;
      stop_name: string | null;
      morning_time: string | null;
      evening_time: string | null;
      direction: string;
      monthly_price: number;
    } | null;
    today: Record<
      'morning' | 'evening',
      {
        trip_status: string;
        delay_minutes: number;
        student_state: string;
        last_event_at: string | null;
      } | null
    >;
    exceptions: Array<{
      id: string;
      day: string;
      direction: string;
      reason: string | null;
    }>;
  }>;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

/** Parent view of the child's canteen registration & published weekly menu. */
export function ParentCanteenPanel({ studentId }: { studentId: string }) {
  const { t, locale } = useLocale();
  const query = useQuery<ParentCanteenData>({
    queryKey: ['parent-canteen'],
    queryFn: async () => (await api.get('/canteen/my')).data,
  });

  if (query.isLoading) return <p className="empty-list-copy">{t('common.loading')}</p>;
  if (!query.data) return <p className="empty-list-copy">{t('common.errorGeneric')}</p>;

  const child = query.data.children.find((c) => c.student_id === studentId);
  const enrollment = child?.enrollment;

  return (
    <div className="animate-fade-in" role="tabpanel">
      <div className="dashboard-toolbar" style={{ marginBottom: '1rem' }}>
        <div>
          <h3 className="dashboard-section-title dashboard-section-title--plain">
            <Utensils size={16} /> {t('canteen.parentTitle')}
          </h3>
          <p className="dashboard-section-copy">
            {enrollment
              ? enrollment.plan === 'monthly'
                ? `${t('canteen.plan.monthly')} — ${formatDA(query.data.prices.monthly_price, locale)}`
                : `${t('canteen.plan.days')} (${enrollment.weekdays
                    .map((d) => t(`canteen.weekdayShort.${d}`))
                    .join(', ')})`
              : t('canteen.notEnrolled')}
          </p>
        </div>
        {enrollment && (
          <span className="badge badge-success">{t(`canteen.diet.${enrollment.diet}`)}</span>
        )}
      </div>

      <div className="premium-table-wrapper">
        <table className="premium-table">
          <thead>
            <tr>
              <th>{t('parent.date')}</th>
              <th>{t('canteen.starter')}</th>
              <th>{t('canteen.main')}</th>
              <th>{t('canteen.dessert')}</th>
              <th>{t('canteen.allergens')}</th>
            </tr>
          </thead>
          <tbody>
            {query.data.days.map((item) => (
              <tr key={item.day}>
                <td>
                  <strong>{t(`canteen.weekday.${item.weekday ?? 0}`)}</strong>
                  <div className="table-cell-muted">{item.day}</div>
                </td>
                <td>{item.menu?.starter || '—'}</td>
                <td><strong>{item.menu?.main || t('canteen.notPublished')}</strong></td>
                <td>{item.menu?.dessert || '—'}</td>
                <td>
                  {item.menu?.allergens.length
                    ? item.menu.allergens.map((a) => t(`canteen.allergen.${a}`)).join(', ')
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Parent view of the child's bus line, today's boarding status and "No bus today" notices. */
export function ParentTransportPanel({ studentId }: { studentId: string }) {
  const { t, locale } = useLocale();
  const queryClient = useQueryClient();
  const [day, setDay] = useState(todayIso);
  const [direction, setDirection] = useState<'evening' | 'morning' | 'both'>('evening');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const query = useQuery<ParentTransportData>({
    queryKey: ['parent-transport'],
    queryFn: async () => (await api.get('/transport/my')).data,
  });

  const declareMutation = useMutation({
    mutationFn: async () =>
      (
        await api.post('/transport/exceptions', {
          student_id: studentId,
          day,
          direction,
          reason: reason || null,
        })
      ).data,
    onSuccess: () => {
      setError('');
      setReason('');
      setNotice(t('transport.exceptionSaved'));
      void queryClient.invalidateQueries({ queryKey: ['parent-transport'] });
    },
    onError: (err) => {
      setError(
        isAxiosError(err)
          ? String(err.response?.data?.detail ?? t('common.errorGeneric'))
          : t('common.errorGeneric'),
      );
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (exceptionId: string) => api.delete(`/transport/exceptions/${exceptionId}`),
    onSuccess: () => {
      setError('');
      void queryClient.invalidateQueries({ queryKey: ['parent-transport'] });
    },
    onError: (err) => {
      setError(
        isAxiosError(err)
          ? String(err.response?.data?.detail ?? t('common.errorGeneric'))
          : t('common.errorGeneric'),
      );
    },
  });

  if (query.isLoading) return <p className="empty-list-copy">{t('common.loading')}</p>;
  if (!query.data) return <p className="empty-list-copy">{t('common.errorGeneric')}</p>;

  const child = query.data.children.find((c) => c.student_id === studentId);
  if (!child?.assignment) {
    return <p className="empty-list-copy">{t('transport.parentNotAssigned')}</p>;
  }
  const { assignment, today, exceptions } = child;

  return (
    <div className="animate-fade-in" role="tabpanel">
      <div className="dashboard-toolbar" style={{ marginBottom: '1rem' }}>
        <div>
          <h3 className="dashboard-section-title dashboard-section-title--plain">
            <Bus size={16} /> {assignment.route_name}
          </h3>
          <p className="dashboard-section-copy">
            {assignment.stop_name} · {t('transport.direction.morning')}: {assignment.morning_time || '—'} ·{' '}
            {t('transport.direction.evening')}: {assignment.evening_time || '—'}
            {assignment.driver_name ? ` · ${assignment.driver_name}` : ''}
            {assignment.driver_phone ? ` (${assignment.driver_phone})` : ''}
          </p>
        </div>
        <span className="badge badge-primary">{formatDA(assignment.monthly_price, locale)}</span>
      </div>

      <div className="metric-grid metric-grid--three" style={{ marginBottom: '1rem' }}>
        {(['morning', 'evening'] as const).map((dir) => {
          const st = today[dir];
          return (
            <div key={dir} className="metric-item">
              <div className="metric-label metric-label-strong">{t(`transport.direction.${dir}`)}</div>
              <div style={{ marginTop: '0.35rem' }}>
                {st ? (
                  <>
                    <span className="badge badge-success">{t(`transport.studentState.${st.student_state}`)}</span>
                    {st.delay_minutes > 0 && (
                      <div className="table-cell-muted" style={{ marginTop: '0.25rem' }}>
                        {t('transport.delayedMinutes', { minutes: st.delay_minutes })}
                      </div>
                    )}
                  </>
                ) : (
                  <span className="table-cell-muted">{t('transport.tripStatus.planned')}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {notice && <div className="notice-box" style={{ marginBottom: '1rem' }}>{notice}</div>}
      {error && <div className="login-error" role="alert" style={{ marginBottom: '1rem' }}>{error}</div>}

      <section className="glass-card management-card" style={{ marginBottom: '1rem' }}>
        <h4 style={{ marginBottom: '0.5rem' }}>{t('transport.declareAbsenceTitle')}</h4>
        <form
          className="fees-filters"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            declareMutation.mutate();
          }}
        >
          <input type="date" className="form-input" value={day} onChange={(e) => setDay(e.target.value)} required />
          <select
            className="form-input"
            value={direction}
            onChange={(e) => setDirection(e.target.value as 'evening' | 'morning' | 'both')}
          >
            <option value="evening">{t('transport.direction.evening')}</option>
            <option value="morning">{t('transport.direction.morning')}</option>
            <option value="both">{t('transport.direction.both')}</option>
          </select>
          <input
            className="form-input"
            placeholder={t('transport.absenceReasonPlaceholder')}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <button type="submit" className="btn btn-primary btn-compact" disabled={declareMutation.isPending}>
            {t('transport.declareAbsenceBtn')}
          </button>
        </form>
      </section>

      {exceptions.length > 0 && (
        <div className="premium-table-wrapper">
          <table className="premium-table">
            <thead>
              <tr>
                <th>{t('parent.date')}</th>
                <th>{t('transport.directionLabel')}</th>
                <th>{t('canteen.note')}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {exceptions.map((exc) => (
                <tr key={exc.id}>
                  <td><strong>{exc.day}</strong></td>
                  <td>{t(`transport.direction.${exc.direction}`)}</td>
                  <td>{exc.reason || '—'}</td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-danger btn-compact"
                      onClick={() => cancelMutation.mutate(exc.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
