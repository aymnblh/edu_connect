import { useState, type FormEvent } from 'react';
import { isAxiosError } from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, KeyRound, Loader2, ShieldAlert, Sparkles } from 'lucide-react';
import LocaleSwitcher from '../components/LocaleSwitcher';
import { useWorkspace } from '../contexts/useWorkspace';
import { api, storeSessionTokens } from '../lib/api';
import { useLocale } from '../lib/i18n';
import { clearWorkspaceStorage, getInitialActiveRole, routeForRole, workspaceRolesFromSession } from '../lib/workspace';

interface VerifiedInvite {
  type: string;
  email?: string | null;
  name?: string | null;
  role?: string | null;
}

function inviteErrorMessage(error: unknown, fallback: string) {
  const detail = isAxiosError(error) ? error.response?.data?.detail : null;
  if (typeof detail === 'string') return detail;
  if (detail && typeof detail === 'object' && 'message' in detail) {
    return String((detail as { message?: unknown }).message);
  }
  return fallback;
}

export default function ActivateAccount() {
  const [inviteCode, setInviteCode] = useState('');
  const [password, setPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [verifiedInvite, setVerifiedInvite] = useState<VerifiedInvite | null>(null);
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { refreshWorkspace } = useWorkspace();
  const { t } = useLocale();

  const normalizedCode = inviteCode.trim().toUpperCase();
  const canSubmit = Boolean(verifiedInvite && password.length >= 8 && termsAccepted);

  const handleVerify = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setVerifiedInvite(null);
    setVerifying(true);

    try {
      const res = await api.post<VerifiedInvite>('/auth/verify-code', { code: normalizedCode });
      const data = res.data;
      if (!['teacher_invite', 'staff_invite'].includes(data.type)) {
        setError(t('activate.unsupportedCode'));
        return;
      }
      setVerifiedInvite(data);
    } catch (err: unknown) {
      setError(inviteErrorMessage(err, t('activate.invalidCode')));
    } finally {
      setVerifying(false);
    }
  };

  const handleActivate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;

    setError('');
    setSubmitting(true);

    try {
      const res = await api.post('/auth/complete-staff-code', {
        invite_code: normalizedCode,
        password,
        terms_accepted: termsAccepted,
      });

      clearWorkspaceStorage();
      storeSessionTokens(res.data.access_token, res.data.refresh_token);

      const profileRes = await api.get('/users/me');
      const user = profileRes.data;
      localStorage.setItem('user', JSON.stringify(user));

      const roles = workspaceRolesFromSession(user, res.data.access_token);
      const activeRole = getInitialActiveRole(roles, null);
      if (activeRole) {
        localStorage.setItem('active_workspace_role', activeRole);
      } else {
        localStorage.removeItem('active_workspace_role');
      }
      refreshWorkspace();

      if (roles.length > 1) {
        navigate('/workspace/select');
      } else {
        navigate(routeForRole(activeRole));
      }
    } catch (err: unknown) {
      setError(inviteErrorMessage(err, t('auth.connectionError')));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-splitscreen">
      <div className="login-brand-side">
        <div className="login-brand-content">
          <div className="login-kicker animate-fade-in">
            <Sparkles size={14} /> {t('login.kicker')}
          </div>
          <h1 className="login-hero-title animate-fade-in delay-1">
            {t('activate.heroTitle')} <br />
            <span className="login-hero-gradient">{t('activate.heroHighlight')}</span>
          </h1>
          <p className="login-hero-copy animate-fade-in delay-2">
            {t('activate.heroCopy')}
          </p>
        </div>
      </div>

      <div className="login-form-side">
        <div className="glass-card animate-fade-in login-card">
          <div className="login-card-header">
            <div className="login-logo-wrap">
              <div className="login-logo">
                <KeyRound size={34} />
              </div>
            </div>
            <h2 className="login-title">{t('activate.title')}</h2>
            <p className="login-subtitle">{t('activate.subtitle')}</p>
          </div>

          {error && (
            <div className="login-error animate-fade-in" role="alert">
              <ShieldAlert size={18} className="login-error-icon" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleVerify} className="login-form">
            <div className="form-group">
              <label htmlFor="activate-code" className="form-label">{t('activate.codeLabel')}</label>
              <input
                id="activate-code"
                className="input-field"
                value={inviteCode}
                onChange={(event) => {
                  setInviteCode(event.target.value);
                  setVerifiedInvite(null);
                }}
                placeholder={t('activate.codePlaceholder')}
                required
                autoComplete="one-time-code"
              />
            </div>
            <button type="submit" className="btn btn-secondary login-submit" disabled={verifying || !normalizedCode}>
              {verifying ? <Loader2 size={16} className="spin-icon" /> : <KeyRound size={16} />}
              {verifying ? t('activate.verifying') : t('activate.verify')}
            </button>
          </form>

          {verifiedInvite && (
            <form onSubmit={handleActivate} className="login-form activate-confirm-form">
              <div className="notice-box">
                <strong>{t('activate.verifiedFor', { name: verifiedInvite.name || verifiedInvite.email || '' })}</strong>
                <span>{t('activate.role', { role: t(`role.${verifiedInvite.role || 'teacher'}`) })}</span>
              </div>

              <div className="form-group">
                <label htmlFor="activate-password" className="form-label">{t('activate.passwordLabel')}</label>
                <input
                  id="activate-password"
                  type="password"
                  className="input-field"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={t('activate.passwordPlaceholder')}
                  minLength={8}
                  required
                  autoComplete="new-password"
                />
              </div>

              <label className="checkbox-row activate-terms">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(event) => setTermsAccepted(event.target.checked)}
                  required
                />
                <span>{t('activate.termsLabel')}</span>
                <CheckCircle2 size={16} />
              </label>

              <button type="submit" className="btn btn-primary login-submit" disabled={submitting || !canSubmit}>
                {submitting ? <Loader2 size={16} className="spin-icon" /> : <CheckCircle2 size={16} />}
                {submitting ? t('activate.submitting') : t('activate.submit')}
              </button>
            </form>
          )}

          <div className="login-footer">
            <LocaleSwitcher />
            <Link to="/policies" className="link-hover-primary">
              {t('login.policiesLink')}
            </Link>
            <Link to="/login" className="link-hover-primary">
              {t('activate.backToLogin')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
