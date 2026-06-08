import { useState } from 'react';
import { isAxiosError } from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldAlert, Sparkles, BookOpen, HeartHandshake, ShieldCheck } from 'lucide-react';
import LocaleSwitcher from '../components/LocaleSwitcher';
import { useWorkspace } from '../contexts/useWorkspace';
import { api, storeSessionTokens } from '../lib/api';
import { useLocale } from '../lib/i18n';
import { clearWorkspaceStorage, getInitialActiveRole, routeForRole, workspaceRolesFromSession } from '../lib/workspace';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { refreshWorkspace } = useWorkspace();
  const { t } = useLocale();

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/auth/login', { email, password });
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
      } else if (roles.length === 1) {
        navigate(routeForRole(roles[0]));
      } else {
        setError(t('auth.unauthorized'));
      }
    } catch (err: unknown) {
      const detail = isAxiosError(err) ? err.response?.data?.detail : null;
      setError(typeof detail === 'string' ? detail : detail?.message || t('auth.connectionError'));
    } finally {
      setLoading(false);
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
            {t('login.heroTitleLine')} <br />
            <span className="login-hero-gradient">{t('login.heroTitleHighlight')}</span>
          </h1>
          <p className="login-hero-copy animate-fade-in delay-2">
            {t('login.heroCopy')}
          </p>

          <div className="login-feature-list animate-fade-in delay-3">
            <div className="login-feature">
              <div className="login-feature-icon">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h4 className="login-feature-title">{t('login.feature.securityTitle')}</h4>
                <p className="login-feature-copy">{t('login.feature.securityCopy')}</p>
              </div>
            </div>

            <div className="login-feature">
              <div className="login-feature-icon">
                <BookOpen size={20} />
              </div>
              <div>
                <h4 className="login-feature-title">{t('login.feature.gradesTitle')}</h4>
                <p className="login-feature-copy">{t('login.feature.gradesCopy')}</p>
              </div>
            </div>

            <div className="login-feature">
              <div className="login-feature-icon">
                <HeartHandshake size={20} />
              </div>
              <div>
                <h4 className="login-feature-title">{t('login.feature.messagingTitle')}</h4>
                <p className="login-feature-copy">{t('login.feature.messagingCopy')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="login-form-side">
        <div className="glass-card animate-fade-in login-card">
          <div className="login-card-header">
            <div className="login-logo-wrap">
              <div className="login-logo">
                <img src="/wasel-edu-logo.svg" alt={t('common.appName')} />
              </div>
            </div>
            <h2 className="login-title">{t('login.title')}</h2>
            <p className="login-subtitle">{t('login.subtitle')}</p>
          </div>

          {error && (
            <div className="login-error animate-fade-in" role="alert">
              <ShieldAlert size={18} className="login-error-icon" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="login-form">
            <div className="form-group">
              <label htmlFor="login-email" className="form-label">{t('login.emailLabel')}</label>
              <input
                id="login-email"
                type="email"
                className="input-field"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={t('login.emailPlaceholder')}
                required
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label htmlFor="login-password" className="form-label">{t('login.passwordLabel')}</label>
              <input
                id="login-password"
                type="password"
                className="input-field"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            <button type="submit" className="btn btn-primary login-submit" disabled={loading} aria-busy={loading}>
              {loading ? t('login.submitLoading') : t('login.submit')}
            </button>
          </form>

          <div className="login-footer">
            <LocaleSwitcher />
            <Link to="/activate" className="link-hover-primary">
              {t('login.activateLink')}
            </Link>
            <Link to="/policies" className="link-hover-primary">
              {t('login.policiesLink')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
