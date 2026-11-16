import { useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import {
  Activity,
  AlertTriangle,
  Bus,
  MapPin,
  Plus,
  Search,
  Trash2,
  Users,
  Wallet,
} from 'lucide-react';
import { api } from '../lib/api';
import { useLocale } from '../lib/i18n';
import { formatDA } from '../lib/money';
import { Modal } from './DirectorRecordsPanels';

interface TransportStop {
  id: string;
  route_id: string;
  name: string;
  position: number;
  morning_time: string | null;
  evening_time: string | null;
}

interface TransportRoute {
  id: string;
  name: string;
  vehicle_plate: string | null;
  capacity: number;
  driver_id: string | null;
  driver_name: string | null;
  assistant_id: string | null;
  assistant_name: string | null;
  monthly_price: number;
  active: boolean;
  stops: TransportStop[];
}

interface TransportStudentRow {
  student_id: string;
  student_name: string;
  student_code: string | null;
  class_name: string;
  assignment: {
    id: string;
    route_id: string;
    route_name: string | null;
    stop_id: string;
    stop_name: string | null;
    direction: 'both' | 'morning' | 'evening';
    start_date: string;
    end_date: string | null;
    active: boolean;
  } | null;
}

interface LiveDirection {
  trip: {
    id: string;
    status: string;
    delay_minutes: number;
  } | null;
  expected: number;
  boarded: number;
  dropped: number;
  no_show: number;
  unaccounted: number;
  exceptions: number;
}

interface LiveResponse {
  date: string;
  is_school_day: boolean;
  routes: Array<{
    route_id: string;
    route_name: string;
    vehicle_plate: string | null;
    active: boolean;
    directions: Record<'morning' | 'evening', LiveDirection>;
  }>;
}

interface StaffOption {
  id: string;
  full_name: string;
  role: string;
  deactivated_at?: string | null;
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

/** Director/secretary management of bus lines, stops, student riders, live overview and billing. */
export default function TransportAdminPanel() {
  const { t, locale } = useLocale();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'live' | 'routes' | 'assignments' | 'billing'>('live');
  const [liveDate, setLiveDate] = useState(todayIso);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [routeModalOpen, setRouteModalOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<TransportRoute | null>(null);
  const [routeForm, setRouteForm] = useState({
    name: '',
    vehicle_plate: '',
    capacity: 30,
    driver_id: '',
    monthly_price: '0',
    active: true,
  });
  const [stopRoute, setStopRoute] = useState<TransportRoute | null>(null);
  const [stopForm, setStopForm] = useState({
    name: '',
    position: 1,
    morning_time: '07:15',
    evening_time: '16:30',
  });
  const [search, setSearch] = useState('');
  const [assignStudent, setAssignStudent] = useState<TransportStudentRow | null>(null);
  const [assignForm, setAssignForm] = useState({
    route_id: '',
    stop_id: '',
    direction: 'both' as 'both' | 'morning' | 'evening',
    start_date: todayIso(),
    end_date: '',
  });
  const now = new Date();
  const [billForm, setBillForm] = useState({
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    due_date: '',
  });

  const liveQuery = useQuery<LiveResponse>({
    queryKey: ['transport-live', liveDate],
    queryFn: async () => (await api.get('/transport/live', { params: { date: liveDate } })).data,
    enabled: tab === 'live',
  });

  const routesQuery = useQuery<TransportRoute[]>({
    queryKey: ['transport-routes'],
    queryFn: async () => (await api.get('/transport/routes')).data,
  });

  const staffQuery = useQuery<StaffOption[]>({
    queryKey: ['director-staff'],
    queryFn: async () => (await api.get('/admin/staff')).data,
  });

  const assignmentsQuery = useQuery<TransportStudentRow[]>({
    queryKey: ['transport-assignments'],
    queryFn: async () => (await api.get('/transport/assignments')).data,
    enabled: tab === 'assignments',
  });

  const drivers = useMemo(
    () => (staffQuery.data ?? []).filter((m) => !m.deactivated_at && m.role === 'driver'),
    [staffQuery.data],
  );

  const routes = routesQuery.data ?? [];

  const saveRouteMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: routeForm.name,
        vehicle_plate: routeForm.vehicle_plate || null,
        capacity: Number(routeForm.capacity),
        driver_id: routeForm.driver_id || null,
        monthly_price: Number(routeForm.monthly_price || 0),
        active: routeForm.active,
      };
      if (editingRoute) {
        return api.patch(`/transport/routes/${editingRoute.id}`, payload);
      }
      return api.post('/transport/routes', payload);
    },
    onSuccess: () => {
      setError('');
      setNotice(t('transport.routeSaved'));
      setRouteModalOpen(false);
      setEditingRoute(null);
      void queryClient.invalidateQueries({ queryKey: ['transport-routes'] });
      void queryClient.invalidateQueries({ queryKey: ['transport-live'] });
    },
    onError: (err) => setError(errorDetail(err, t('common.errorGeneric'))),
  });

  const deleteRouteMutation = useMutation({
    mutationFn: async (routeId: string) => api.delete(`/transport/routes/${routeId}`),
    onSuccess: () => {
      setError('');
      void queryClient.invalidateQueries({ queryKey: ['transport-routes'] });
      void queryClient.invalidateQueries({ queryKey: ['transport-live'] });
    },
    onError: (err) => setError(errorDetail(err, t('common.errorGeneric'))),
  });

  const addStopMutation = useMutation({
    mutationFn: async () => {
      if (!stopRoute) return;
      return api.post(`/transport/routes/${stopRoute.id}/stops`, {
        name: stopForm.name,
        position: Number(stopForm.position),
        morning_time: stopForm.morning_time || null,
        evening_time: stopForm.evening_time || null,
      });
    },
    onSuccess: () => {
      setError('');
      setNotice(t('transport.stopSaved'));
      setStopRoute(null);
      void queryClient.invalidateQueries({ queryKey: ['transport-routes'] });
    },
    onError: (err) => setError(errorDetail(err, t('common.errorGeneric'))),
  });

  const deleteStopMutation = useMutation({
    mutationFn: async (stopId: string) => api.delete(`/transport/stops/${stopId}`),
    onSuccess: () => {
      setError('');
      void queryClient.invalidateQueries({ queryKey: ['transport-routes'] });
    },
    onError: (err) => setError(errorDetail(err, t('common.errorGeneric'))),
  });

  const saveAssignmentMutation = useMutation({
    mutationFn: async () => {
      if (!assignStudent) return;
      return api.put(`/transport/assignments/${assignStudent.student_id}`, {
        route_id: assignForm.route_id,
        stop_id: assignForm.stop_id,
        direction: assignForm.direction,
        start_date: assignForm.start_date,
        end_date: assignForm.end_date || null,
      });
    },
    onSuccess: () => {
      setError('');
      setNotice(t('transport.assignmentSaved'));
      setAssignStudent(null);
      void queryClient.invalidateQueries({ queryKey: ['transport-assignments'] });
      void queryClient.invalidateQueries({ queryKey: ['transport-live'] });
    },
    onError: (err) => setError(errorDetail(err, t('common.errorGeneric'))),
  });

  const removeAssignmentMutation = useMutation({
    mutationFn: async (studentId: string) => api.delete(`/transport/assignments/${studentId}`),
    onSuccess: () => {
      setError('');
      void queryClient.invalidateQueries({ queryKey: ['transport-assignments'] });
      void queryClient.invalidateQueries({ queryKey: ['transport-live'] });
    },
    onError: (err) => setError(errorDetail(err, t('common.errorGeneric'))),
  });

  const billMonthMutation = useMutation({
    mutationFn: async () =>
      (
        await api.post('/transport/billing', {
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

  const filteredAssignments = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (assignmentsQuery.data ?? []).filter(
      (row) =>
        !q ||
        row.student_name.toLowerCase().includes(q) ||
        row.class_name.toLowerCase().includes(q) ||
        (row.assignment?.route_name ?? '').toLowerCase().includes(q),
    );
  }, [assignmentsQuery.data, search]);

  const selectedRouteForAssign = routes.find((r) => r.id === assignForm.route_id) ?? null;

  const openRouteModal = (route: TransportRoute | null) => {
    setEditingRoute(route);
    setRouteForm({
      name: route?.name ?? '',
      vehicle_plate: route?.vehicle_plate ?? '',
      capacity: route?.capacity ?? 30,
      driver_id: route?.driver_id ?? '',
      monthly_price: String(route?.monthly_price ?? 0),
      active: route?.active ?? true,
    });
    setRouteModalOpen(true);
  };

  const openAssignModal = (row: TransportStudentRow) => {
    const defaultRoute = routes.find((r) => r.id === row.assignment?.route_id) ?? routes[0];
    const defaultStop = defaultRoute?.stops.find((s) => s.id === row.assignment?.stop_id) ?? defaultRoute?.stops[0];
    setAssignStudent(row);
    setAssignForm({
      route_id: defaultRoute?.id ?? '',
      stop_id: defaultStop?.id ?? '',
      direction: row.assignment?.direction ?? 'both',
      start_date: row.assignment?.start_date ?? todayIso(),
      end_date: row.assignment?.end_date ?? '',
    });
  };

  return (
    <section className="glass-card dashboard-card-pad animate-fade-in">
      <div className="dashboard-toolbar">
        <div>
          <h2 className="dashboard-section-title dashboard-section-title--plain">
            <Bus size={18} /> {t('transport.title')}
          </h2>
          <p className="dashboard-section-copy">{t('transport.copy')}</p>
        </div>
      </div>

      <div className="tab-bar" role="tablist" style={{ marginBottom: '1rem' }}>
        <button
          type="button"
          className={`tab-button ${tab === 'live' ? 'tab-button--active' : ''}`}
          onClick={() => setTab('live')}
        >
          <Activity size={15} /> {t('transport.tab.live')}
        </button>
        <button
          type="button"
          className={`tab-button ${tab === 'routes' ? 'tab-button--active' : ''}`}
          onClick={() => setTab('routes')}
        >
          <MapPin size={15} /> {t('transport.tab.routes')}
        </button>
        <button
          type="button"
          className={`tab-button ${tab === 'assignments' ? 'tab-button--active' : ''}`}
          onClick={() => setTab('assignments')}
        >
          <Users size={15} /> {t('transport.tab.assignments')}
        </button>
        <button
          type="button"
          className={`tab-button ${tab === 'billing' ? 'tab-button--active' : ''}`}
          onClick={() => setTab('billing')}
        >
          <Wallet size={15} /> {t('canteen.tab.billing')}
        </button>
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

      {tab === 'live' && (
        <div>
          <div className="fees-filters" style={{ marginBottom: '1rem' }}>
            <input
              type="date"
              className="form-input"
              value={liveDate}
              onChange={(e) => setLiveDate(e.target.value)}
            />
          </div>
          {liveQuery.isLoading && <p className="dashboard-section-copy">{t('common.loading')}</p>}
          {liveQuery.data && liveQuery.data.routes.length === 0 && (
            <p className="dashboard-section-copy">{t('transport.noRoutes')}</p>
          )}
          <div className="director-management-grid">
            {(liveQuery.data?.routes ?? []).map((route) => (
              <article key={route.route_id} className="glass-card management-card">
                <div className="dashboard-toolbar">
                  <div>
                    <h3 className="dashboard-section-title dashboard-section-title--plain">{route.route_name}</h3>
                    <p className="table-cell-muted">{route.vehicle_plate || '—'}</p>
                  </div>
                </div>
                {(['morning', 'evening'] as const).map((dir) => {
                  const info = route.directions[dir];
                  return (
                    <div
                      key={dir}
                      style={{
                        marginTop: '0.75rem',
                        padding: '0.75rem',
                        borderRadius: '10px',
                        background: 'rgba(148, 163, 184, 0.08)',
                      }}
                    >
                      <div className="dashboard-toolbar" style={{ marginBottom: '0.35rem' }}>
                        <strong>{t(`transport.direction.${dir}`)}</strong>
                        <span className={`badge ${info.trip?.status === 'completed' ? 'badge-success' : info.trip ? 'badge-primary' : ''}`}>
                          {info.trip ? t(`transport.tripStatus.${info.trip.status}`) : t('transport.tripStatus.planned')}
                        </span>
                      </div>
                      <p className="table-cell-muted">
                        {t('transport.liveCounts', {
                          expected: info.expected,
                          boarded: info.boarded,
                          dropped: info.dropped,
                          exceptions: info.exceptions,
                        })}
                      </p>
                      {info.trip && info.trip.delay_minutes > 0 && (
                        <span className="badge badge-warning" style={{ marginTop: '0.35rem' }}>
                          {t('transport.delayedMinutes', { minutes: info.trip.delay_minutes })}
                        </span>
                      )}
                      {info.unaccounted > 0 && (
                        <div className="infirmary-alert" style={{ marginTop: '0.35rem' }}>
                          <AlertTriangle size={14} /> {t('transport.unaccountedAlert', { count: info.unaccounted })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </article>
            ))}
          </div>
        </div>
      )}

      {tab === 'routes' && (
        <div>
          <div className="fees-filters" style={{ marginBottom: '1rem' }}>
            <button type="button" className="btn btn-primary btn-compact" onClick={() => openRouteModal(null)}>
              <Plus size={14} /> {t('transport.newRoute')}
            </button>
          </div>
          <div className="director-management-grid">
            {routes.map((route) => (
              <article key={route.id} className="glass-card management-card">
                <div className="dashboard-toolbar">
                  <div>
                    <h3 className="dashboard-section-title dashboard-section-title--plain">{route.name}</h3>
                    <p className="table-cell-muted">
                      {route.vehicle_plate || '—'} · {route.capacity} pl. · {formatDA(route.monthly_price, locale)}
                      {route.driver_name ? ` · ${route.driver_name}` : ''}
                    </p>
                  </div>
                  <div className="table-actions">
                    <button type="button" className="btn btn-secondary btn-compact" onClick={() => openRouteModal(route)}>
                      {t('canteen.edit')}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-compact"
                      onClick={() => {
                        setStopRoute(route);
                        setStopForm({
                          name: '',
                          position: route.stops.length + 1,
                          morning_time: '07:15',
                          evening_time: '16:30',
                        });
                      }}
                    >
                      <Plus size={14} /> {t('transport.addStop')}
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger btn-compact"
                      onClick={() => deleteRouteMutation.mutate(route.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="premium-table-wrapper" style={{ marginTop: '0.75rem' }}>
                  <table className="premium-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>{t('transport.stopName')}</th>
                        <th>{t('transport.direction.morning')}</th>
                        <th>{t('transport.direction.evening')}</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {route.stops.length === 0 && (
                        <tr><td colSpan={5}>{t('transport.noStops')}</td></tr>
                      )}
                      {route.stops.map((stop) => (
                        <tr key={stop.id}>
                          <td>{stop.position}</td>
                          <td><strong>{stop.name}</strong></td>
                          <td>{stop.morning_time || '—'}</td>
                          <td>{stop.evening_time || '—'}</td>
                          <td>
                            <button
                              type="button"
                              className="btn btn-danger btn-compact"
                              onClick={() => deleteStopMutation.mutate(stop.id)}
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {tab === 'assignments' && (
        <div>
          <div className="fees-filters" style={{ marginBottom: '1rem' }}>
            <div className="student-filter-bar">
              <Search size={17} />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('fees.search')} />
            </div>
          </div>
          <div className="premium-table-wrapper">
            <table className="premium-table">
              <thead>
                <tr>
                  <th>{t('fees.student')}</th>
                  <th>{t('codes.class')}</th>
                  <th>{t('transport.route')}</th>
                  <th>{t('transport.stopName')}</th>
                  <th>{t('transport.directionLabel')}</th>
                  <th>{t('director.students.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredAssignments.map((row) => (
                  <tr key={row.student_id}>
                    <td><strong>{row.student_name}</strong></td>
                    <td>{row.class_name}</td>
                    <td>{row.assignment?.route_name ?? '—'}</td>
                    <td>{row.assignment?.stop_name ?? '—'}</td>
                    <td>{row.assignment ? t(`transport.direction.${row.assignment.direction}`) : '—'}</td>
                    <td>
                      <div className="table-actions">
                        <button
                          type="button"
                          className="btn btn-secondary btn-compact"
                          disabled={routes.length === 0}
                          onClick={() => openAssignModal(row)}
                        >
                          {row.assignment ? t('canteen.edit') : t('transport.assign')}
                        </button>
                        {row.assignment && (
                          <button
                            type="button"
                            className="btn btn-danger btn-compact"
                            onClick={() => removeAssignmentMutation.mutate(row.student_id)}
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

      {tab === 'billing' && (
        <section className="glass-card management-card" style={{ maxWidth: '460px' }}>
          <h3 className="dashboard-section-title dashboard-section-title--plain">{t('transport.billMonthTitle')}</h3>
          <p className="dashboard-section-copy">{t('transport.billMonthCopy')}</p>
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
          </form>
        </section>
      )}

      {routeModalOpen && (
        <Modal
          title={editingRoute ? editingRoute.name : t('transport.newRoute')}
          onClose={() => {
            setRouteModalOpen(false);
            setEditingRoute(null);
          }}
        >
          <form
            className="stacked-form"
            onSubmit={(e) => {
              e.preventDefault();
              saveRouteMutation.mutate();
            }}
          >
            <div className="form-group">
              <label className="form-label">{t('transport.routeName')}</label>
              <input
                className="form-input"
                required
                value={routeForm.name}
                onChange={(e) => setRouteForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t('transport.vehiclePlate')}</label>
              <input
                className="form-input"
                value={routeForm.vehicle_plate}
                onChange={(e) => setRouteForm((f) => ({ ...f, vehicle_plate: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t('transport.capacity')}</label>
              <input
                type="number"
                min={1}
                className="form-input"
                value={routeForm.capacity}
                onChange={(e) => setRouteForm((f) => ({ ...f, capacity: Number(e.target.value) }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t('role.driver')}</label>
              <select
                className="form-input"
                value={routeForm.driver_id}
                onChange={(e) => setRouteForm((f) => ({ ...f, driver_id: e.target.value }))}
              >
                <option value="">—</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>{d.full_name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">{t('canteen.monthlyPrice')}</label>
              <input
                type="number"
                min={0}
                step="100"
                className="form-input"
                value={routeForm.monthly_price}
                onChange={(e) => setRouteForm((f) => ({ ...f, monthly_price: e.target.value }))}
              />
            </div>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={routeForm.active}
                onChange={(e) => setRouteForm((f) => ({ ...f, active: e.target.checked }))}
              />
              <span>{t('transport.routeActive')}</span>
            </label>
            <button type="submit" className="btn btn-primary" disabled={saveRouteMutation.isPending}>
              {t('common.save')}
            </button>
          </form>
        </Modal>
      )}

      {stopRoute && (
        <Modal title={`${stopRoute.name} — ${t('transport.addStop')}`} onClose={() => setStopRoute(null)}>
          <form
            className="stacked-form"
            onSubmit={(e) => {
              e.preventDefault();
              addStopMutation.mutate();
            }}
          >
            <div className="form-group">
              <label className="form-label">{t('transport.stopName')}</label>
              <input
                className="form-input"
                required
                value={stopForm.name}
                onChange={(e) => setStopForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t('transport.stopOrder')}</label>
              <input
                type="number"
                min={1}
                className="form-input"
                value={stopForm.position}
                onChange={(e) => setStopForm((f) => ({ ...f, position: Number(e.target.value) }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t('transport.morningTime')}</label>
              <input
                className="form-input"
                placeholder="07:15"
                value={stopForm.morning_time}
                onChange={(e) => setStopForm((f) => ({ ...f, morning_time: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t('transport.eveningTime')}</label>
              <input
                className="form-input"
                placeholder="16:30"
                value={stopForm.evening_time}
                onChange={(e) => setStopForm((f) => ({ ...f, evening_time: e.target.value }))}
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={addStopMutation.isPending}>
              {t('common.save')}
            </button>
          </form>
        </Modal>
      )}

      {assignStudent && (
        <Modal title={assignStudent.student_name} onClose={() => setAssignStudent(null)}>
          <form
            className="stacked-form"
            onSubmit={(e) => {
              e.preventDefault();
              saveAssignmentMutation.mutate();
            }}
          >
            <div className="form-group">
              <label className="form-label">{t('transport.route')}</label>
              <select
                className="form-input"
                required
                value={assignForm.route_id}
                onChange={(e) => {
                  const nextRoute = routes.find((r) => r.id === e.target.value);
                  setAssignForm((f) => ({
                    ...f,
                    route_id: e.target.value,
                    stop_id: nextRoute?.stops[0]?.id ?? '',
                  }));
                }}
              >
                {routes.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">{t('transport.stopName')}</label>
              <select
                className="form-input"
                required
                value={assignForm.stop_id}
                onChange={(e) => setAssignForm((f) => ({ ...f, stop_id: e.target.value }))}
              >
                {(selectedRouteForAssign?.stops ?? []).map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">{t('transport.directionLabel')}</label>
              <select
                className="form-input"
                value={assignForm.direction}
                onChange={(e) =>
                  setAssignForm((f) => ({ ...f, direction: e.target.value as 'both' | 'morning' | 'evening' }))
                }
              >
                <option value="both">{t('transport.direction.both')}</option>
                <option value="morning">{t('transport.direction.morning')}</option>
                <option value="evening">{t('transport.direction.evening')}</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">{t('canteen.startDate')}</label>
              <input
                type="date"
                className="form-input"
                required
                value={assignForm.start_date}
                onChange={(e) => setAssignForm((f) => ({ ...f, start_date: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t('canteen.endDate')}</label>
              <input
                type="date"
                className="form-input"
                value={assignForm.end_date}
                onChange={(e) => setAssignForm((f) => ({ ...f, end_date: e.target.value }))}
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saveAssignmentMutation.isPending || !assignForm.stop_id}
            >
              {t('common.save')}
            </button>
          </form>
        </Modal>
      )}
    </section>
  );
}
