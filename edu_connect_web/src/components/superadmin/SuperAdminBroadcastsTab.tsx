import { useState } from 'react';
import { isAxiosError } from 'axios';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Megaphone, Send, Users } from 'lucide-react';
import { api } from '../../lib/api';
import { type Locale, useLocale } from '../../lib/i18n';
import type { AddToastFn, PlatformBroadcast, School } from './types';

function formatDateTime(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-DZ' : locale === 'en' ? 'en-US' : 'fr-DZ', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export default function SuperAdminBroadcastsTab({
  schools,
  addToast,
}: {
  schools: School[];
  addToast: AddToastFn;
}) {
  const { t, locale } = useLocale();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState<'announcement' | 'event' | 'holiday' | 'exam_period' | 'meeting'>('announcement');
  const [audience, setAudience] = useState<'principals' | 'admins' | 'staff' | 'all_users'>('principals');
  const [targetSchools, setTargetSchools] = useState<'active' | 'all' | 'selected'>('active');
  const [selectedSchoolIds, setSelectedSchoolIds] = useState<string[]>([]);
  const [publishAnnouncement, setPublishAnnouncement] = useState(false);

  const historyQuery = useQuery<PlatformBroadcast[]>({
    queryKey: ['system-broadcasts'],
    queryFn: async () => (await api.get('/system/broadcasts')).data,
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post<PlatformBroadcast>('/system/broadcasts', {
        title: title.trim(),
        body: body.trim(),
        category,
        audience,
        target_schools: targetSchools,
        school_ids: targetSchools === 'selected' ? selectedSchoolIds : [],
        publish_announcement: audience === 'all_users' && publishAnnouncement,
      });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['system-broadcasts'] });
      setTitle('');
      setBody('');
      setPublishAnnouncement(false);
      addToast(
        t('superadmin.broadcasts.sentSuccess', {
          schools: data.school_count,
          recipients: data.recipient_count,
        }),
        'success',
      );
    },
    onError: (err: unknown) => {
      const message = isAxiosError(err) ? err.response?.data?.detail || err.message : t('auth.connectionError');
      addToast(`${t('common.errorGeneric')}: ${message}`, 'error');
    },
  });

  const toggleSchoolSelection = (schoolId: string) => {
    setSelectedSchoolIds((prev) =>
      prev.includes(schoolId) ? prev.filter((id) => id !== schoolId) : [...prev, schoolId],
    );
  };

  const targetCount =
    targetSchools === 'all'
      ? schools.length
      : targetSchools === 'active'
        ? schools.filter((s) => s.is_active).length
        : selectedSchoolIds.length;

  return (
    <div className="superadmin-two-col">
      <section className="glass-card dashboard-card-pad">
        <div className="dashboard-toolbar">
          <div>
            <h2 className="dashboard-section-title dashboard-section-title--plain">
              <Megaphone size={18} /> {t('superadmin.broadcasts.composeTitle')}
            </h2>
            <p className="dashboard-section-copy">{t('superadmin.broadcasts.composeCopy')}</p>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!title.trim() || !body.trim()) return;
            if (targetSchools === 'selected' && selectedSchoolIds.length === 0) {
              addToast(t('superadmin.broadcasts.selectSchoolError'), 'warning');
              return;
            }
            sendMutation.mutate();
          }}
        >
          <div className="form-group">
            <label className="form-label" htmlFor="broadcast-title">{t('superadmin.broadcasts.titleLabel')}</label>
            <input
              id="broadcast-title"
              type="text"
              className="input-field"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('superadmin.broadcasts.titlePlaceholder')}
              maxLength={200}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="broadcast-body">{t('superadmin.broadcasts.bodyLabel')}</label>
            <textarea
              id="broadcast-body"
              className="input-field"
              rows={5}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={t('superadmin.broadcasts.bodyPlaceholder')}
              maxLength={5000}
              required
            />
          </div>

          <div className="superadmin-form-grid">
            <div className="form-group">
              <label className="form-label" htmlFor="broadcast-audience">{t('superadmin.broadcasts.audienceLabel')}</label>
              <select
                id="broadcast-audience"
                className="form-input"
                value={audience}
                onChange={(e) => setAudience(e.target.value as typeof audience)}
              >
                <option value="principals">{t('superadmin.broadcasts.audience.principals')}</option>
                <option value="admins">{t('superadmin.broadcasts.audience.admins')}</option>
                <option value="staff">{t('superadmin.broadcasts.audience.staff')}</option>
                <option value="all_users">{t('superadmin.broadcasts.audience.all_users')}</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="broadcast-targets">{t('superadmin.broadcasts.targetsLabel')}</label>
              <select
                id="broadcast-targets"
                className="form-input"
                value={targetSchools}
                onChange={(e) => setTargetSchools(e.target.value as typeof targetSchools)}
              >
                <option value="active">{t('superadmin.broadcasts.targets.active')}</option>
                <option value="all">{t('superadmin.broadcasts.targets.all')}</option>
                <option value="selected">{t('superadmin.broadcasts.targets.selected')}</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="broadcast-category">{t('superadmin.broadcasts.categoryLabel')}</label>
              <select
                id="broadcast-category"
                className="form-input"
                value={category}
                onChange={(e) => setCategory(e.target.value as typeof category)}
              >
                <option value="announcement">{t('announcements.category.announcement')}</option>
                <option value="event">{t('announcements.category.event')}</option>
                <option value="meeting">{t('announcements.category.meeting')}</option>
                <option value="holiday">{t('announcements.category.holiday')}</option>
                <option value="exam_period">{t('announcements.category.exam_period')}</option>
              </select>
            </div>
          </div>

          {targetSchools === 'selected' && (
            <div className="form-group">
              <span className="form-label">{t('superadmin.broadcasts.pickSchools')}</span>
              <div className="superadmin-school-picker">
                {schools.map((school) => (
                  <label key={school.id} className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={selectedSchoolIds.includes(school.id)}
                      onChange={() => toggleSchoolSelection(school.id)}
                    />
                    <span>
                      {school.name}{' '}
                      <small className="report-card-muted">
                        ({school.is_active ? t('superadmin.statusActive') : t('superadmin.signalSuspended')})
                      </small>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {audience === 'all_users' && (
            <label className="checkbox-row" style={{ marginBottom: '1rem' }}>
              <input
                type="checkbox"
                checked={publishAnnouncement}
                onChange={(e) => setPublishAnnouncement(e.target.checked)}
              />
              <span>{t('superadmin.broadcasts.publishBoardOption')}</span>
            </label>
          )}

          <div className="superadmin-broadcast-footer">
            <span className="report-card-muted">
              <Users size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
              {t('superadmin.broadcasts.targetSummary', { count: targetCount })}
            </span>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={sendMutation.isPending || !title.trim() || !body.trim() || targetCount === 0}
            >
              <Send size={16} />{' '}
              {sendMutation.isPending ? t('superadmin.broadcasts.sending') : t('superadmin.broadcasts.send')}
            </button>
          </div>
        </form>
      </section>

      <section className="glass-card dashboard-card-pad">
        <div className="dashboard-toolbar">
          <div>
            <h2 className="dashboard-section-title dashboard-section-title--plain">
              {t('superadmin.broadcasts.historyTitle')}
            </h2>
            <p className="dashboard-section-copy">{t('superadmin.broadcasts.historyCopy')}</p>
          </div>
        </div>

        {historyQuery.isLoading && <p className="dashboard-section-copy">{t('common.loading')}</p>}
        {!historyQuery.isLoading && (historyQuery.data?.length ?? 0) === 0 && (
          <p className="dashboard-section-copy">{t('superadmin.broadcasts.empty')}</p>
        )}

        <div className="superadmin-broadcast-list">
          {(historyQuery.data ?? []).map((item) => (
            <article key={item.id} className="superadmin-broadcast-item">
              <div className="superadmin-broadcast-item-header">
                <strong>{item.title}</strong>
                <span className="badge badge-info">
                  {t(`superadmin.broadcasts.audience.${item.audience}`)}
                </span>
              </div>
              <p className="superadmin-broadcast-body">{item.body}</p>
              <div className="superadmin-broadcast-meta">
                <span>{formatDateTime(item.created_at, locale)}</span>
                <span>
                  {t('superadmin.broadcasts.stats', {
                    schools: item.school_count,
                    recipients: item.recipient_count,
                  })}
                </span>
                {item.author_name && <span>{item.author_name}</span>}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
