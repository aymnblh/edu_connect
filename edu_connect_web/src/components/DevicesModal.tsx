import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, LogOut, MonitorSmartphone } from 'lucide-react';
import { api, storeSessionTokens } from '../lib/api';
import { type Locale, useLocale } from '../lib/i18n';
import { getCurrentSessionPersistence } from '../lib/workspace';

interface Session {
  family_id: string;
  device_platform?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at: string;
  last_used_at?: string | null;
}

function when(iso: string | null | undefined, locale: Locale) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-DZ' : locale === 'en' ? 'en-GB' : 'fr-DZ', {
    timeZone: 'Africa/Algiers',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso));
}

function deviceName(session: Session) {
  const agent = session.user_agent ?? '';
  const browser = /Edg\//.test(agent) ? 'Edge' : /Chrome\//.test(agent) ? 'Chrome' : /Firefox\//.test(agent) ? 'Firefox'
    : /Safari\//.test(agent) ? 'Safari' : /Dart|okhttp|CFNetwork/.test(agent) ? 'App' : '';
  const system = /Android/.test(agent) ? 'Android' : /iPhone|iPad|iOS/.test(agent) ? 'iOS' : /Windows/.test(agent) ? 'Windows'
    : /Mac OS/.test(agent) ? 'macOS' : /Linux/.test(agent) ? 'Linux' : session.device_platform ?? '';
  return [browser, system].filter(Boolean).join(' · ') || session.device_platform || '—';
}

export default function DevicesModal({ onClose }: { onClose: () => void }) {
  const { t, locale } = useLocale();
  const queryClient = useQueryClient();
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => closeRef.current?.focus(), []);

  const sessionsQuery = useQuery<Session[]>({
    queryKey: ['my-sessions'],
    queryFn: async () => (await api.get('/auth/sessions')).data,
  });
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['my-sessions'] });

  const revokeOne = useMutation({
    mutationFn: async (familyId: string) => api.delete(`/auth/sessions/${familyId}`),
    onSuccess: refresh,
  });
  const revokeOthers = useMutation({
    mutationFn: async () => {
      const remember = getCurrentSessionPersistence();
      const res = await api.post('/auth/sessions/revoke-others', { remember_device: remember });
      storeSessionTokens(res.data.access_token, res.data.refresh_token, remember);
    },
    onSuccess: refresh,
  });

  const sessions = sessionsQuery.data ?? [];

  return createPortal(
    <div className="workspace-modal-backdrop" onKeyDown={(event) => event.key === 'Escape' && onClose()}>
      <div className="workspace-modal devices-modal" role="dialog" aria-modal="true" aria-labelledby="devices-title">
        <h2 id="devices-title"><MonitorSmartphone size={18} /> {t('devices.title')}</h2>
        <p className="dashboard-section-copy">{t('devices.copy')}</p>
        {sessionsQuery.isLoading && <p className="dashboard-section-copy">{t('common.loading')}</p>}
        <div className="announcement-list">
          {sessions.map((session) => (
            <div key={session.family_id} className="meeting-slot">
              <div>
                <strong>{deviceName(session)}</strong>
                <div className="report-card-muted">
                  {t('devices.lastUsed', { date: when(session.last_used_at ?? session.created_at, locale) })}
                  {session.ip_address ? ` · ${session.ip_address}` : ''}
                </div>
                <div className="report-card-muted">{t('devices.since', { date: when(session.created_at, locale) })}</div>
              </div>
              <button type="button" className="btn btn-secondary btn-compact" disabled={revokeOne.isPending}
                onClick={() => window.confirm(t('devices.revokeConfirm')) && revokeOne.mutate(session.family_id)}>
                <LogOut size={14} /> {t('devices.revoke')}
              </button>
            </div>
          ))}
        </div>
        <p className="report-card-muted">{t('devices.note')}</p>
        <button type="button" className="btn btn-primary btn-full" disabled={revokeOthers.isPending || sessions.length < 2}
          onClick={() => window.confirm(t('devices.revokeOthersConfirm')) && revokeOthers.mutate()}>
          {revokeOthers.isPending ? <Loader2 size={16} className="spin-icon" /> : <LogOut size={16} />} {t('devices.revokeOthers')}
        </button>
        {revokeOthers.isSuccess && <p className="dashboard-section-copy" role="status">{t('devices.revokedOthers')}</p>}
        <button ref={closeRef} type="button" className="btn btn-secondary btn-full" onClick={onClose}>
          {t('common.close')}
        </button>
      </div>
    </div>,
    document.body,
  );
}
