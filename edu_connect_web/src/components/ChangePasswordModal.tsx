import { useEffect, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { isAxiosError } from 'axios';
import { KeyRound, Loader2 } from 'lucide-react';
import { api, storeSessionTokens } from '../lib/api';
import { useLocale } from '../lib/i18n';
import { getCurrentSessionPersistence } from '../lib/workspace';

type ChangePasswordModalProps = {
  onClose: () => void;
};

export default function ChangePasswordModal({ onClose }: ChangePasswordModalProps) {
  const { t } = useLocale();
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    firstFieldRef.current?.focus();
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    if (newPassword.length < 8) {
      setError(t('password.tooShort'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t('password.mismatch'));
      return;
    }

    setSubmitting(true);
    try {
      const rememberDevice = getCurrentSessionPersistence();
      const res = await api.post('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
        remember_device: rememberDevice,
      });
      // Every other session was signed out; keep this one on the new tokens.
      storeSessionTokens(res.data.access_token, res.data.refresh_token, rememberDevice);
      setDone(true);
    } catch (err: unknown) {
      const detail = isAxiosError(err) ? err.response?.data?.detail : null;
      setError(typeof detail === 'string' ? detail : t('password.changeFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  // Portal to <body> so the sidebar's styles cannot reposition the fixed overlay.
  return createPortal(
    <div className="workspace-modal-backdrop" onKeyDown={(event) => event.key === 'Escape' && onClose()}>
      <div className="workspace-modal" role="dialog" aria-modal="true" aria-labelledby="change-password-title">
        <h2 id="change-password-title">{t('password.changeTitle')}</h2>
        {done ? (
          <>
            <p className="dashboard-section-copy">{t('password.changed')}</p>
            <button type="button" className="btn btn-primary btn-full" onClick={onClose}>
              {t('common.close')}
            </button>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="current-password">{t('password.current')}</label>
              <input
                ref={firstFieldRef}
                id="current-password"
                className="form-input"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="new-password">{t('password.new')}</label>
              <input
                id="new-password"
                className="form-input"
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="confirm-password">{t('password.confirm')}</label>
              <input
                id="confirm-password"
                className="form-input"
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
              />
            </div>
            <p className="dashboard-section-copy">{t('password.otherSessionsNote')}</p>
            {error && (
              <div className="login-error animate-fade-in" role="alert">
                <span>{error}</span>
              </div>
            )}
            <button type="submit" className="btn btn-primary btn-full" disabled={submitting}>
              {submitting ? <Loader2 size={16} className="spin-icon" /> : <KeyRound size={16} />}
              {t('password.submit')}
            </button>
            <button type="button" className="btn btn-secondary btn-full" onClick={onClose} disabled={submitting}>
              {t('common.cancel')}
            </button>
          </form>
        )}
      </div>
    </div>,
    document.body,
  );
}
