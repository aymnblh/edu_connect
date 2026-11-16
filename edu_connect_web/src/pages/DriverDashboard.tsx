import { useCallback, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import {
  AlertTriangle,
  Bus,
  CheckCircle2,
  Clock,
  Phone,
  Play,
  RefreshCw,
} from 'lucide-react';
import { api } from '../lib/api';
import { useLocale } from '../lib/i18n';

interface DriverStudent {
  student_id: string;
  student_name: string;
  class_name: string;
  state: 'pending' | 'boarded' | 'dropped' | 'no_show';
  health_alert: string | null;
  emergency_contact: { name: string; relationship: string; phone: string } | null;
}

interface DriverDirection {
  trip: {
    id: string;
    status: 'in_progress' | 'completed';
    delay_minutes: number;
  } | null;
  stops: Array<{
    id: string;
    name: string;
    position: number;
    time: string | null;
    students: DriverStudent[];
  }>;
  exceptions: Array<{
    student_id: string;
    student_name: string;
    stop_name: string;
    reason: string | null;
  }>;
}

interface DriverToday {
  date: string;
  is_school_day: boolean;
  routes: Array<{
    id: string;
    name: string;
    vehicle_plate: string | null;
    capacity: number;
    directions: Record<'morning' | 'evening', DriverDirection>;
  }>;
}

interface QueuedEvent {
  trip_id: string;
  student_id: string;
  kind: 'boarded' | 'dropped' | 'no_show';
  client_event_id: string;
  recorded_at: string;
}

const QUEUE_KEY = 'wasel_driver_offline_events';

function readQueue(): QueuedEvent[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as QueuedEvent[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(items: QueuedEvent[]) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(items));
  } catch {
    // Ignore storage quota issues.
  }
}

function newEventId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `ev-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Dedicated bus driver / escort screen: morning & evening runs, 1-tap boarding/drop-off, offline queue and safety lock. */
export default function DriverDashboard() {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const [direction, setDirection] = useState<'morning' | 'evening'>('morning');
  const [queue, setQueue] = useState<QueuedEvent[]>(readQueue);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [unaccountedConfirm, setUnaccountedConfirm] = useState<{ tripId: string; studentIds: string[] } | null>(null);

  const todayQuery = useQuery<DriverToday>({
    queryKey: ['driver-today'],
    queryFn: async () => (await api.get('/transport/driver/today')).data,
  });

  const syncQueue = useCallback(async () => {
    const pending = readQueue();
    if (pending.length === 0) return;
    const byTrip = new Map<string, QueuedEvent[]>();
    pending.forEach((ev) => {
      const list = byTrip.get(ev.trip_id) ?? [];
      list.push(ev);
      byTrip.set(ev.trip_id, list);
    });
    const remaining: QueuedEvent[] = [];
    for (const [tripId, events] of byTrip.entries()) {
      try {
        await api.post(`/transport/driver/trips/${tripId}/events`, {
          events: events.map(({ student_id, kind, client_event_id, recorded_at }) => ({
            student_id,
            kind,
            client_event_id,
            recorded_at,
          })),
        });
      } catch {
        remaining.push(...events);
      }
    }
    writeQueue(remaining);
    setQueue(remaining);
    if (remaining.length < pending.length) {
      void queryClient.invalidateQueries({ queryKey: ['driver-today'] });
    }
  }, [queryClient]);

  useEffect(() => {
    const onOnline = () => {
      void syncQueue();
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [syncQueue]);

  const startTripMutation = useMutation({
    mutationFn: async (routeId: string) =>
      (await api.post(`/transport/driver/trips/${routeId}/${direction}/start`)).data,
    onSuccess: () => {
      setError('');
      void queryClient.invalidateQueries({ queryKey: ['driver-today'] });
    },
    onError: (err) => setError(isAxiosError(err) ? String(err.response?.data?.detail ?? t('common.errorGeneric')) : t('common.errorGeneric')),
  });

  const recordEvent = async (tripId: string, studentId: string, kind: 'boarded' | 'dropped' | 'no_show') => {
    const event: QueuedEvent = {
      trip_id: tripId,
      student_id: studentId,
      kind,
      client_event_id: newEventId(),
      recorded_at: new Date().toISOString(),
    };
    try {
      await api.post(`/transport/driver/trips/${tripId}/events`, {
        events: [{
          student_id: event.student_id,
          kind: event.kind,
          client_event_id: event.client_event_id,
          recorded_at: event.recorded_at,
        }],
      });
      setError('');
      void queryClient.invalidateQueries({ queryKey: ['driver-today'] });
    } catch {
      const next = [...readQueue(), event];
      writeQueue(next);
      setQueue(next);
      setNotice(t('transport.offlineQueued'));
    }
  };

  const delayMutation = useMutation({
    mutationFn: async ({ tripId, minutes }: { tripId: string; minutes: number }) =>
      (await api.post(`/transport/driver/trips/${tripId}/delay`, { minutes })).data,
    onSuccess: (data: { notified: number }) => {
      setError('');
      setNotice(t('transport.delaySent', { count: data.notified }));
      void queryClient.invalidateQueries({ queryKey: ['driver-today'] });
    },
    onError: (err) => setError(isAxiosError(err) ? String(err.response?.data?.detail ?? t('common.errorGeneric')) : t('common.errorGeneric')),
  });

  const completeMutation = useMutation({
    mutationFn: async ({ tripId, force }: { tripId: string; force: boolean }) =>
      (await api.post(`/transport/driver/trips/${tripId}/complete`, { force })).data,
    onSuccess: () => {
      setError('');
      setUnaccountedConfirm(null);
      setNotice(t('transport.tripCompleted'));
      void queryClient.invalidateQueries({ queryKey: ['driver-today'] });
    },
    onError: (err, vars) => {
      if (isAxiosError(err) && err.response?.status === 409) {
        const ids = (err.response.data?.detail?.unaccounted_student_ids as string[] | undefined) ?? [];
        setUnaccountedConfirm({ tripId: vars.tripId, studentIds: ids });
        return;
      }
      setError(isAxiosError(err) ? String(err.response?.data?.detail ?? t('common.errorGeneric')) : t('common.errorGeneric'));
    },
  });

  const pendingStateFor = (tripId: string | undefined, studentId: string) => {
    if (!tripId) return null;
    const queued = queue.filter((e) => e.trip_id === tripId && e.student_id === studentId);
    return queued.length ? queued[queued.length - 1].kind : null;
  };

  return (
    <div className="container dashboard-page animate-fade-in">
      <header className="dashboard-header">
        <div className="badge dashboard-eyebrow">
          <Bus size={14} /> {t('role.driver')}
        </div>
        <h1>{t('transport.driverTitle')}</h1>
        <p>{t('transport.driverCopy')}</p>
      </header>

      <div className="glass-card dashboard-card-pad" style={{ marginBottom: '1rem' }}>
        <div className="dashboard-toolbar">
          <div className="tab-bar" role="tablist">
            {(['morning', 'evening'] as const).map((dir) => (
              <button
                key={dir}
                type="button"
                className={`tab-button ${direction === dir ? 'tab-button--active' : ''}`}
                onClick={() => setDirection(dir)}
              >
                {t(`transport.direction.${dir}`)}
              </button>
            ))}
          </div>
          {queue.length > 0 && (
            <button type="button" className="btn btn-secondary btn-compact" onClick={() => void syncQueue()}>
              <RefreshCw size={14} /> {t('transport.syncQueue', { count: queue.length })}
            </button>
          )}
        </div>
      </div>

      {notice && <div className="notice-box" style={{ marginBottom: '1rem' }}>{notice}</div>}
      {error && <div className="login-error" role="alert" style={{ marginBottom: '1rem' }}>{error}</div>}
      {unaccountedConfirm && (
        <div className="login-error" role="alert" style={{ marginBottom: '1rem' }}>
          <p><strong>{t('transport.forgottenChildWarning', { count: unaccountedConfirm.studentIds.length })}</strong></p>
          <div className="table-actions" style={{ marginTop: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-danger btn-compact"
              onClick={() => completeMutation.mutate({ tripId: unaccountedConfirm.tripId, force: true })}
            >
              {t('transport.forceComplete')}
            </button>
            <button type="button" className="btn btn-secondary btn-compact" onClick={() => setUnaccountedConfirm(null)}>
              {t('common.close')}
            </button>
          </div>
        </div>
      )}

      {todayQuery.isLoading && <p className="dashboard-section-copy">{t('common.loading')}</p>}
      {todayQuery.data && todayQuery.data.routes.length === 0 && (
        <div className="glass-card dashboard-card-pad">
          <p className="dashboard-section-copy">{t('transport.noDriverRoutes')}</p>
        </div>
      )}

      {(todayQuery.data?.routes ?? []).map((route) => {
        const run = route.directions[direction];
        const trip = run.trip;
        return (
          <section key={route.id} className="glass-card dashboard-card-pad" style={{ marginBottom: '1rem' }}>
            <div className="dashboard-toolbar" style={{ marginBottom: '1rem' }}>
              <div>
                <h2 className="dashboard-section-title dashboard-section-title--plain">{route.name}</h2>
                <p className="table-cell-muted">{route.vehicle_plate || '—'}</p>
              </div>
              <div className="table-actions">
                {!trip && (
                  <button
                    type="button"
                    className="btn btn-primary btn-compact"
                    disabled={startTripMutation.isPending}
                    onClick={() => startTripMutation.mutate(route.id)}
                  >
                    <Play size={14} /> {t('transport.startTrip')}
                  </button>
                )}
                {trip && trip.status === 'in_progress' && (
                  <>
                    <button
                      type="button"
                      className="btn btn-secondary btn-compact"
                      disabled={delayMutation.isPending}
                      onClick={() => delayMutation.mutate({ tripId: trip.id, minutes: 15 })}
                    >
                      <Clock size={14} /> {t('transport.reportDelay15')}
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary btn-compact"
                      disabled={completeMutation.isPending}
                      onClick={() => completeMutation.mutate({ tripId: trip.id, force: false })}
                    >
                      <CheckCircle2 size={14} /> {t('transport.completeTrip')}
                    </button>
                  </>
                )}
                {trip?.status === 'completed' && (
                  <span className="badge badge-success">{t('transport.tripStatus.completed')}</span>
                )}
              </div>
            </div>

            {run.stops.map((stop) => (
              <div key={stop.id} style={{ marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '0.95rem', marginBottom: '0.5rem' }}>
                  {stop.position}. {stop.name} {stop.time ? `(${stop.time})` : ''}
                </h3>
                {stop.students.length === 0 ? (
                  <p className="table-cell-muted">{t('transport.noStudentsAtStop')}</p>
                ) : (
                  <div className="premium-table-wrapper">
                    <table className="premium-table">
                      <tbody>
                        {stop.students.map((student) => {
                          const effectiveState = pendingStateFor(trip?.id, student.student_id) ?? student.state;
                          return (
                            <tr key={student.student_id}>
                              <td>
                                <strong>{student.student_name}</strong>
                                <div className="table-cell-muted">{student.class_name}</div>
                                {student.health_alert && (
                                  <span className="infirmary-alert" style={{ marginTop: '0.25rem' }}>
                                    <AlertTriangle size={13} /> {student.health_alert}
                                  </span>
                                )}
                                {student.emergency_contact && (
                                  <div className="table-cell-muted" style={{ marginTop: '0.25rem' }}>
                                    <Phone size={12} /> {student.emergency_contact.name}: {student.emergency_contact.phone}
                                  </div>
                                )}
                              </td>
                              <td>
                                <span className={`badge ${effectiveState === 'dropped' ? 'badge-success' : effectiveState === 'boarded' ? 'badge-primary' : effectiveState === 'no_show' ? 'badge-danger' : ''}`}>
                                  {t(`transport.studentState.${effectiveState}`)}
                                </span>
                              </td>
                              <td>
                                {trip && trip.status === 'in_progress' && (
                                  <div className="table-actions">
                                    <button
                                      type="button"
                                      className="btn btn-secondary btn-compact"
                                      onClick={() => void recordEvent(trip.id, student.student_id, 'boarded')}
                                    >
                                      {t('transport.action.boarded')}
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-primary btn-compact"
                                      onClick={() => void recordEvent(trip.id, student.student_id, 'dropped')}
                                    >
                                      {t('transport.action.dropped')}
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-danger btn-compact"
                                      onClick={() => void recordEvent(trip.id, student.student_id, 'no_show')}
                                    >
                                      {t('transport.action.no_show')}
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}

            {run.exceptions.length > 0 && (
              <div className="notice-box">
                <strong>{t('transport.exceptionsList')}:</strong>{' '}
                {run.exceptions.map((e) => `${e.student_name} (${e.stop_name})`).join(', ')}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
