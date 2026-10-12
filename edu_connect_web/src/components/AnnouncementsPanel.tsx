import { useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { CalendarDays, Loader2, Megaphone, Trash2 } from 'lucide-react';
import { api } from '../lib/api';
import { type Locale, useLocale } from '../lib/i18n';

type Category = 'announcement' | 'holiday' | 'exam_period' | 'meeting' | 'event';

const categories: Category[] = ['announcement', 'holiday', 'exam_period', 'meeting', 'event'];

export interface Announcement {
  id: string;
  title: string;
  body: string;
  category: Category;
  starts_on?: string | null;
  ends_on?: string | null;
  whole_school: boolean;
  class_ids: string[];
  author_id?: string | null;
  author_name?: string | null;
  created_at: string;
  is_read: boolean;
  read_count?: number | null;
  recipient_count?: number | null;
}

type AnnouncementsPanelProps = {
  /** Separates query caches between dashboards. */
  scopeKey: string;
  canCreate: boolean;
  allowWholeSchool: boolean;
  /** Classes the user may target (and whose names label the list). */
  classes: Array<{ id: string; name: string }>;
};

const emptyForm = {
  title: '',
  body: '',
  category: 'announcement' as Category,
  startsOn: '',
  endsOn: '',
  wholeSchool: false,
  classIds: [] as string[],
};

function intlLocale(locale: Locale) {
  if (locale === 'ar') return 'ar-DZ';
  if (locale === 'en') return 'en-US';
  return 'fr-DZ';
}

function formatDay(value: string, locale: Locale) {
  // Dates are plain calendar days ("2026-11-05"); avoid timezone shifts.
  const [year, month, day] = value.split('-').map(Number);
  return new Intl.DateTimeFormat(intlLocale(locale), { day: 'numeric', month: 'long', year: 'numeric' }).format(
    new Date(year, month - 1, day),
  );
}

function errorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail) && typeof detail[0]?.msg === 'string') return detail[0].msg.replace(/^Value error, /, '');
  }
  return fallback;
}

export default function AnnouncementsPanel({ scopeKey, canCreate, allowWholeSchool, classes }: AnnouncementsPanelProps) {
  const { t, locale } = useLocale();
  const queryClient = useQueryClient();
  const queryKey = ['announcements', scopeKey];
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  const announcementsQuery = useQuery<Announcement[]>({
    queryKey,
    queryFn: async () => (await api.get('/announcements/')).data,
  });
  const announcements = useMemo(() => announcementsQuery.data ?? [], [announcementsQuery.data]);
  const classNames = useMemo(() => new Map(classes.map((item) => [item.id, item.name])), [classes]);

  const upcoming = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return announcements
      .filter((item) => item.starts_on && (item.ends_on ?? item.starts_on) >= today)
      .sort((a, b) => (a.starts_on ?? '').localeCompare(b.starts_on ?? ''))
      .slice(0, 8);
  }, [announcements]);

  const createMutation = useMutation({
    mutationFn: async () => {
      await api.post('/announcements/', {
        title: form.title.trim(),
        body: form.body.trim(),
        category: form.category,
        starts_on: form.startsOn || null,
        ends_on: form.endsOn || null,
        whole_school: form.wholeSchool,
        class_ids: form.wholeSchool ? [] : form.classIds,
      });
    },
    onSuccess: () => {
      setForm(emptyForm);
      setFormError('');
      void queryClient.invalidateQueries({ queryKey });
    },
    onError: (error) => setFormError(errorMessage(error, t('announcements.publishFailed'))),
  });

  const readMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/announcements/${id}/read`);
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/announcements/${id}`);
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey }),
  });

  const toggle = (item: Announcement) => {
    const next = openId === item.id ? null : item.id;
    setOpenId(next);
    if (next && !item.is_read) readMutation.mutate(item.id);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError('');
    if (form.category !== 'announcement' && !form.startsOn) {
      setFormError(t('announcements.dateRequired'));
      return;
    }
    if (!form.wholeSchool && form.classIds.length === 0) {
      setFormError(t('announcements.audienceRequired'));
      return;
    }
    createMutation.mutate();
  };

  const audienceLabel = (item: Announcement) =>
    item.whole_school
      ? t('announcements.wholeSchool')
      : item.class_ids.map((id) => classNames.get(id) ?? t('announcements.otherClass')).join(', ');

  const dateLabel = (item: Announcement) => {
    if (!item.starts_on) return '';
    if (item.ends_on && item.ends_on !== item.starts_on) {
      return t('announcements.dateRange', {
        start: formatDay(item.starts_on, locale),
        end: formatDay(item.ends_on, locale),
      });
    }
    return formatDay(item.starts_on, locale);
  };

  return (
    <div className="announcements-panel">
      {canCreate && (
        <section className="glass-card dashboard-card-pad">
          <h2 className="dashboard-section-title dashboard-section-title--plain">
            <Megaphone size={18} /> {t('announcements.newTitle')}
          </h2>
          <form onSubmit={submit}>
            <div className="form-group">
              <label className="form-label" htmlFor={`${scopeKey}-ann-title`}>{t('announcements.title')}</label>
              <input
                id={`${scopeKey}-ann-title`}
                className="form-input"
                maxLength={200}
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor={`${scopeKey}-ann-body`}>{t('announcements.body')}</label>
              <textarea
                id={`${scopeKey}-ann-body`}
                className="form-input"
                rows={4}
                maxLength={5000}
                value={form.body}
                onChange={(event) => setForm({ ...form, body: event.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor={`${scopeKey}-ann-category`}>{t('announcements.category')}</label>
              <select
                id={`${scopeKey}-ann-category`}
                className="form-input"
                value={form.category}
                onChange={(event) => setForm({ ...form, category: event.target.value as Category })}
              >
                {categories.map((category) => (
                  <option key={category} value={category}>{t(`announcements.category.${category}`)}</option>
                ))}
              </select>
            </div>
            <div className="announcement-date-row">
              <div className="form-group">
                <label className="form-label" htmlFor={`${scopeKey}-ann-start`}>
                  {form.category === 'announcement' ? t('announcements.startsOnOptional') : t('announcements.startsOn')}
                </label>
                <input
                  id={`${scopeKey}-ann-start`}
                  className="form-input"
                  type="date"
                  value={form.startsOn}
                  onChange={(event) => setForm({ ...form, startsOn: event.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor={`${scopeKey}-ann-end`}>{t('announcements.endsOn')}</label>
                <input
                  id={`${scopeKey}-ann-end`}
                  className="form-input"
                  type="date"
                  min={form.startsOn || undefined}
                  value={form.endsOn}
                  disabled={!form.startsOn}
                  onChange={(event) => setForm({ ...form, endsOn: event.target.value })}
                />
              </div>
            </div>
            <fieldset className="form-group announcement-audience">
              <legend className="form-label">{t('announcements.audience')}</legend>
              {allowWholeSchool && (
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={form.wholeSchool}
                    onChange={(event) => setForm({ ...form, wholeSchool: event.target.checked })}
                  />
                  {t('announcements.wholeSchool')}
                </label>
              )}
              {!form.wholeSchool &&
                classes.map((item) => (
                  <label key={item.id} className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={form.classIds.includes(item.id)}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          classIds: event.target.checked
                            ? [...form.classIds, item.id]
                            : form.classIds.filter((id) => id !== item.id),
                        })
                      }
                    />
                    {item.name}
                  </label>
                ))}
              {!form.wholeSchool && classes.length === 0 && (
                <p className="dashboard-section-copy">{t('announcements.noClasses')}</p>
              )}
            </fieldset>
            {formError && (
              <div className="login-error animate-fade-in" role="alert">
                <span>{formError}</span>
              </div>
            )}
            <button type="submit" className="btn btn-primary btn-full" disabled={createMutation.isPending}>
              {createMutation.isPending ? <Loader2 size={16} className="spin-icon" /> : <Megaphone size={16} />}
              {t('announcements.publish')}
            </button>
          </form>
        </section>
      )}

      <section className="glass-card dashboard-card-pad">
        <h2 className="dashboard-section-title dashboard-section-title--plain">
          <CalendarDays size={18} /> {t('announcements.calendarTitle')}
        </h2>
        {upcoming.length === 0 ? (
          <p className="dashboard-section-copy">{t('announcements.calendarEmpty')}</p>
        ) : (
          <ul className="announcement-calendar">
            {upcoming.map((item) => (
              <li key={item.id}>
                <span className={`badge badge-compact announcement-badge--${item.category}`}>
                  {t(`announcements.category.${item.category}`)}
                </span>
                <strong>{item.title}</strong>
                <span className="dashboard-section-copy">{dateLabel(item)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="glass-card dashboard-card-pad">
        <h2 className="dashboard-section-title dashboard-section-title--plain">
          <Megaphone size={18} /> {t('announcements.listTitle')}
        </h2>
        {announcementsQuery.isLoading && <p className="dashboard-section-copy">{t('common.loading')}</p>}
        {announcementsQuery.isError && (
          <p className="dashboard-section-copy">{errorMessage(announcementsQuery.error, t('common.errorGeneric'))}</p>
        )}
        {!announcementsQuery.isLoading && announcements.length === 0 && (
          <p className="dashboard-section-copy">{t('announcements.empty')}</p>
        )}
        <div className="announcement-list">
          {announcements.map((item) => {
            const open = openId === item.id;
            const canManage = item.read_count !== null && item.read_count !== undefined;
            return (
              <article key={item.id} className={`announcement-item ${item.is_read ? '' : 'announcement-item--unread'}`}>
                <button
                  type="button"
                  className="announcement-item-header"
                  aria-expanded={open}
                  onClick={() => toggle(item)}
                >
                  <span className={`badge badge-compact announcement-badge--${item.category}`}>
                    {t(`announcements.category.${item.category}`)}
                  </span>
                  <strong>{item.title}</strong>
                  {!item.is_read && <span className="badge badge-compact badge-warning">{t('announcements.new')}</span>}
                </button>
                <div className="announcement-meta">
                  {dateLabel(item) && <span>{dateLabel(item)}</span>}
                  <span>{audienceLabel(item)}</span>
                  {item.author_name && <span>{t('announcements.by', { name: item.author_name })}</span>}
                  {canManage && (
                    <span>
                      {t('announcements.readBy', { read: item.read_count ?? 0, total: item.recipient_count ?? 0 })}
                    </span>
                  )}
                </div>
                {open && <p className="announcement-body">{item.body}</p>}
                {open && canManage && (
                  <button
                    type="button"
                    className="btn btn-danger btn-compact"
                    disabled={deleteMutation.isPending}
                    onClick={() => {
                      if (window.confirm(t('announcements.deleteConfirm'))) deleteMutation.mutate(item.id);
                    }}
                  >
                    <Trash2 size={14} /> {t('common.delete')}
                  </button>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
