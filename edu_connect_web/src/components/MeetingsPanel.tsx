import { useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { CalendarClock, Loader2, Trash2, UserX } from 'lucide-react';
import { api } from '../lib/api';
import { type Locale, useLocale } from '../lib/i18n';

export interface MeetingSlot {
  id: string;
  teacher_id: string;
  teacher_name?: string | null;
  class_id?: string | null;
  class_name?: string | null;
  starts_at: string;
  ends_at: string;
  location?: string | null;
  is_booked: boolean;
  booked_by_me: boolean;
  parent_name?: string | null;
  student_id?: string | null;
  student_name?: string | null;
  note?: string | null;
}

const SCHOOL_TIME_ZONE = 'Africa/Algiers';

function intlLocale(locale: Locale) {
  if (locale === 'ar') return 'ar-DZ';
  if (locale === 'en') return 'en-US';
  return 'fr-DZ';
}

function dayKey(iso: string) {
  // Group by the school's calendar day, not the viewer's.
  return new Intl.DateTimeFormat('en-CA', { timeZone: SCHOOL_TIME_ZONE }).format(new Date(iso));
}

function formatDay(iso: string, locale: Locale) {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    timeZone: SCHOOL_TIME_ZONE,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(iso));
}

function formatTime(iso: string, locale: Locale) {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    timeZone: SCHOOL_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

function errorMessage(error: unknown, fallback: string) {
  if (isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail) && typeof detail[0]?.msg === 'string') return detail[0].msg.replace(/^Value error, /, '');
  }
  return fallback;
}

function groupByDay(slots: MeetingSlot[]) {
  const groups = new Map<string, MeetingSlot[]>();
  for (const slot of slots) {
    const key = dayKey(slot.starts_at);
    groups.set(key, [...(groups.get(key) ?? []), slot]);
  }
  return [...groups.entries()];
}

function useSlots(scopeKey: string) {
  return useQuery<MeetingSlot[]>({
    queryKey: ['meetings', scopeKey],
    queryFn: async () => (await api.get('/meetings/slots')).data,
  });
}

/* ── Teacher ─────────────────────────────────────────────────────────── */

const defaultDate = () => {
  const tomorrow = new Date(Date.now() + 86_400_000);
  return dayKey(tomorrow.toISOString());
};

export function TeacherMeetingsPanel({ classes }: { classes: Array<{ id: string; name: string }> }) {
  const { t, locale } = useLocale();
  const queryClient = useQueryClient();
  const slotsQuery = useSlots('teacher');
  const [form, setForm] = useState({
    date: defaultDate(),
    start: '16:00',
    end: '18:00',
    minutes: '15',
    location: '',
    classId: '',
  });
  const [message, setMessage] = useState('');
  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ['meetings', 'teacher'] });

  const createMutation = useMutation({
    mutationFn: async () =>
      (
        await api.post<MeetingSlot[]>('/meetings/slots', {
          date: form.date,
          start_time: form.start,
          end_time: form.end,
          slot_minutes: Number(form.minutes),
          location: form.location.trim() || null,
          class_id: form.classId || null,
        })
      ).data,
    onSuccess: (created) => {
      setMessage(t('meetings.created', { count: created.length }));
      invalidate();
    },
    onError: (error) => setMessage(errorMessage(error, t('common.errorGeneric'))),
  });
  const cancelMutation = useMutation({
    mutationFn: async (id: string) => api.post(`/meetings/slots/${id}/cancel`),
    onSuccess: invalidate,
    onError: (error) => setMessage(errorMessage(error, t('common.errorGeneric'))),
  });
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/meetings/slots/${id}`),
    onSuccess: invalidate,
    onError: (error) => setMessage(errorMessage(error, t('common.errorGeneric'))),
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');
    createMutation.mutate();
  };

  const days = useMemo(() => groupByDay(slotsQuery.data ?? []), [slotsQuery.data]);

  return (
    <div className="announcements-panel">
      <section className="glass-card dashboard-card-pad">
        <h2 className="dashboard-section-title dashboard-section-title--plain">
          <CalendarClock size={18} /> {t('meetings.openTitle')}
        </h2>
        <p className="dashboard-section-copy">{t('meetings.openCopy')}</p>
        <form onSubmit={submit}>
          <div className="announcement-date-row">
            <div className="form-group">
              <label className="form-label" htmlFor="meet-date">{t('meetings.date')}</label>
              <input id="meet-date" className="form-input" type="date" value={form.date} min={defaultDate()}
                onChange={(e) => setForm({ ...form, date: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="meet-start">{t('meetings.from')}</label>
              <input id="meet-start" className="form-input" type="time" value={form.start}
                onChange={(e) => setForm({ ...form, start: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="meet-end">{t('meetings.to')}</label>
              <input id="meet-end" className="form-input" type="time" value={form.end}
                onChange={(e) => setForm({ ...form, end: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="meet-minutes">{t('meetings.duration')}</label>
              <select id="meet-minutes" className="form-input" value={form.minutes}
                onChange={(e) => setForm({ ...form, minutes: e.target.value })}>
                {['10', '15', '20', '30'].map((value) => (
                  <option key={value} value={value}>{t('meetings.minutes', { count: value })}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="announcement-date-row">
            <div className="form-group">
              <label className="form-label" htmlFor="meet-location">{t('meetings.location')}</label>
              <input id="meet-location" className="form-input" maxLength={120} value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="meet-class">{t('meetings.forClass')}</label>
              <select id="meet-class" className="form-input" value={form.classId}
                onChange={(e) => setForm({ ...form, classId: e.target.value })}>
                <option value="">{t('meetings.allMyClasses')}</option>
                {classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </div>
          </div>
          <button type="submit" className="btn btn-primary btn-full" disabled={createMutation.isPending}>
            {createMutation.isPending ? <Loader2 size={16} className="spin-icon" /> : <CalendarClock size={16} />}
            {t('meetings.open')}
          </button>
        </form>
        {message && <p className="dashboard-section-copy" role="status">{message}</p>}
      </section>

      <section className="glass-card dashboard-card-pad">
        <h2 className="dashboard-section-title dashboard-section-title--plain">{t('meetings.mySlots')}</h2>
        {slotsQuery.isLoading && <p className="dashboard-section-copy">{t('common.loading')}</p>}
        {!slotsQuery.isLoading && days.length === 0 && <p className="dashboard-section-copy">{t('meetings.noSlots')}</p>}
        {days.map(([key, slots]) => (
          <div key={key} className="meeting-day">
            <h3>{formatDay(slots[0].starts_at, locale)}</h3>
            {slots.map((slot) => (
              <div key={slot.id} className={`meeting-slot ${slot.is_booked ? 'meeting-slot--booked' : ''}`}>
                <div>
                  <strong>{formatTime(slot.starts_at, locale)} – {formatTime(slot.ends_at, locale)}</strong>
                  {slot.location && <span className="report-card-muted"> · {slot.location}</span>}
                  {slot.class_name && <span className="report-card-muted"> · {slot.class_name}</span>}
                  <div className="report-card-muted">
                    {slot.is_booked
                      ? t('meetings.bookedBy', { parent: slot.parent_name ?? '', student: slot.student_name ?? '' })
                      : t('meetings.free')}
                  </div>
                  {slot.note && <div className="announcement-body">“{slot.note}”</div>}
                </div>
                <div className="table-actions">
                  {slot.is_booked && (
                    <button type="button" className="btn btn-secondary btn-compact" disabled={cancelMutation.isPending}
                      onClick={() => window.confirm(t('meetings.freeConfirm')) && cancelMutation.mutate(slot.id)}>
                      <UserX size={14} /> {t('meetings.freeSlot')}
                    </button>
                  )}
                  <button type="button" className="btn btn-danger btn-compact" disabled={deleteMutation.isPending}
                    aria-label={t('common.delete')} title={t('common.delete')}
                    onClick={() => window.confirm(t('meetings.deleteConfirm')) && deleteMutation.mutate(slot.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </section>
    </div>
  );
}

/* ── Parent ──────────────────────────────────────────────────────────── */

export function ParentMeetingsPanel({ studentId }: { studentId: string }) {
  const { t, locale } = useLocale();
  const queryClient = useQueryClient();
  const slotsQuery = useSlots('parent');
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [message, setMessage] = useState('');
  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ['meetings', 'parent'] });

  const bookMutation = useMutation({
    mutationFn: async (id: string) =>
      api.post(`/meetings/slots/${id}/book`, { student_id: studentId, note: note.trim() || null }),
    onSuccess: () => {
      setBookingId(null);
      setNote('');
      setMessage(t('meetings.bookedNotice'));
      invalidate();
    },
    onError: (error) => {
      setMessage(errorMessage(error, t('common.errorGeneric')));
      invalidate();
    },
  });
  const cancelMutation = useMutation({
    mutationFn: async (id: string) => api.post(`/meetings/slots/${id}/cancel`),
    onSuccess: invalidate,
    onError: (error) => setMessage(errorMessage(error, t('common.errorGeneric'))),
  });

  const slots = slotsQuery.data ?? [];
  const mine = slots.filter((slot) => slot.booked_by_me && slot.student_id === studentId);
  const free = slots.filter((slot) => !slot.is_booked);
  const byTeacher = useMemo(() => {
    const groups = new Map<string, MeetingSlot[]>();
    for (const slot of free) {
      const key = slot.teacher_name ?? slot.teacher_id;
      groups.set(key, [...(groups.get(key) ?? []), slot]);
    }
    return [...groups.entries()];
  }, [free]);

  return (
    <div className="animate-fade-in" role="tabpanel">
      {message && <p className="dashboard-section-copy" role="status">{message}</p>}
      <h3 className="dashboard-section-title dashboard-section-title--plain">{t('meetings.myMeetings')}</h3>
      {mine.length === 0 && <p className="empty-list-copy">{t('meetings.noBooking')}</p>}
      {mine.map((slot) => (
        <div key={slot.id} className="meeting-slot meeting-slot--booked">
          <div>
            <strong>{slot.teacher_name}</strong>
            <div>{formatDay(slot.starts_at, locale)} · {formatTime(slot.starts_at, locale)}</div>
            {slot.location && <div className="report-card-muted">{slot.location}</div>}
          </div>
          <button type="button" className="btn btn-secondary btn-compact" disabled={cancelMutation.isPending}
            onClick={() => window.confirm(t('meetings.cancelConfirm')) && cancelMutation.mutate(slot.id)}>
            <UserX size={14} /> {t('meetings.cancel')}
          </button>
        </div>
      ))}

      <h3 className="dashboard-section-title dashboard-section-title--plain">{t('meetings.available')}</h3>
      {slotsQuery.isLoading && <p className="empty-list-copy">{t('common.loading')}</p>}
      {!slotsQuery.isLoading && byTeacher.length === 0 && <p className="empty-list-copy">{t('meetings.noneAvailable')}</p>}
      {byTeacher.map(([teacher, teacherSlots]) => (
        <div key={teacher} className="meeting-day">
          <h4>{teacher}</h4>
          {groupByDay(teacherSlots).map(([key, daySlots]) => (
            <div key={key}>
              <div className="report-card-muted">{formatDay(daySlots[0].starts_at, locale)}</div>
              <div className="meeting-chips">
                {daySlots.map((slot) => (
                  <button key={slot.id} type="button"
                    className={`btn btn-compact ${bookingId === slot.id ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setBookingId(bookingId === slot.id ? null : slot.id)}>
                    {formatTime(slot.starts_at, locale)}
                  </button>
                ))}
              </div>
              {daySlots.some((slot) => slot.id === bookingId) && (
                <form className="inline-edit-form" onSubmit={(event) => {
                  event.preventDefault();
                  if (bookingId) bookMutation.mutate(bookingId);
                }}>
                  <textarea className="form-input" maxLength={500} placeholder={t('meetings.notePlaceholder')}
                    aria-label={t('meetings.notePlaceholder')} value={note} onChange={(e) => setNote(e.target.value)} />
                  <button type="submit" className="btn btn-primary btn-compact" disabled={bookMutation.isPending}>
                    {t('meetings.book')}
                  </button>
                </form>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
