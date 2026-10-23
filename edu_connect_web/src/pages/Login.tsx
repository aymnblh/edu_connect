import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldAlert, GraduationCap, BookOpen, HeartHandshake, ShieldCheck, Eye, Building2, Presentation, Users } from 'lucide-react';
import LocaleSwitcher from '../components/LocaleSwitcher';
import { useWorkspace } from '../contexts/useWorkspace';
import { api, storeSessionTokens } from '../lib/api';
import type { DemoRole } from '../lib/demo';
import { useLocale } from '../lib/i18n';
import {
  clearWorkspaceStorage,
  getInitialActiveRole,
  readRememberDevicePreference,
  removeWorkspaceSessionItem,
  routeForRole,
  storeWorkspaceSessionItem,
  workspaceRolesFromSession,
} from '../lib/workspace';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberDevice, setRememberDevice] = useState(readRememberDevicePreference);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState<DemoRole | null>(null);
  const navigate = useNavigate();
  const { activeRole, hasMultipleRoles, isAuthenticated, refreshWorkspace, routeForActiveRole } = useWorkspace();
  const { t } = useLocale();

  useEffect(() => {
    if (!isAuthenticated) return;
    navigate(hasMultipleRoles && !activeRole ? '/workspace/select' : routeForActiveRole(), { replace: true });
  }, [activeRole, hasMultipleRoles, isAuthenticated, navigate, routeForActiveRole]);

  const demoQuery = useQuery<{ enabled: boolean }>({
    queryKey: ['public-demo'],
    queryFn: async () => (await api.get('/auth/demo')).data,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const showError = (err: unknown) => {
    const detail = isAxiosError(err) ? err.response?.data?.detail : null;
    setError(typeof detail === 'string' ? detail : detail?.message || t('auth.connectionError'));
  };

  const completeSignIn = async (tokens: { access_token: string; refresh_token: string }, remember: boolean) => {
    clearWorkspaceStorage();
    storeSessionTokens(tokens.access_token, tokens.refresh_token, remember);

    const profileRes = await api.get('/users/me');
    const user = profileRes.data;
    storeWorkspaceSessionItem('user', JSON.stringify(user), remember);

    const roles = workspaceRolesFromSession(user, tokens.access_token);
    const activeRole = getInitialActiveRole(roles, null);
    if (activeRole) {
      storeWorkspaceSessionItem('active_workspace_role', activeRole, remember);
    } else {
      removeWorkspaceSessionItem('active_workspace_role');
    }
    refreshWorkspace();

    if (roles.length > 1) {
      navigate('/workspace/select');
    } else if (roles.length === 1) {
      navigate(routeForRole(roles[0]));
    } else {
      setError(t('auth.unauthorized'));
    }
  };

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/auth/login', {
        email,
        password,
        remember_device: rememberDevice,
      });
      await completeSignIn(res.data, rememberDevice);
    } catch (err: unknown) {
      showError(err);
    } finally {
      setLoading(false);
    }
  };

  const openDemo = async (role: DemoRole) => {
    setError('');
    setDemoLoading(role);
    try {
      const res = await api.post('/auth/demo-login', { role });
      // A demo visit never outlives the browser tab.
      await completeSignIn(res.data, false);
    } catch (err: unknown) {
      showError(err);
    } finally {
      setDemoLoading(null);
    }
  };

  const demoRoles: Array<{ role: DemoRole; icon: typeof Eye; labelKey: string }> = [
    { role: 'principal', icon: Building2, labelKey: 'demo.asDirector' },
    { role: 'teacher', icon: Presentation, labelKey: 'demo.asTeacher' },
    { role: 'parent', icon: Users, labelKey: 'demo.asParent' },
  ];

  return (
    <div className="login-splitscreen">
      <div className="login-brand-side">
        <div className="login-brand-content">
          <div className="login-kicker animate-fade-in">
            <GraduationCap size={14} /> {t('login.kicker')}
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
          <div className="login-card-actions">
            <LocaleSwitcher />
          </div>

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

            <label className="login-remember-device">
              <input
                type="checkbox"
                checked={rememberDevice}
                onChange={(event) => setRememberDevice(event.target.checked)}
              />
              <span>{t('login.rememberDevice')}</span>
            </label>

            <button type="submit" className="btn btn-primary login-submit" disabled={loading} aria-busy={loading}>
              {loading ? t('login.submitLoading') : t('login.submit')}
            </button>
          </form>

          <div className="login-footer">
            <Link to="/activate" className="link-hover-primary">
              {t('login.activateLink')}
            </Link>
            <Link to="/policies" className="link-hover-primary">
              {t('login.policiesLink')}
            </Link>
          </div>
          <div className="login-footer" style={{ marginTop: '1rem', justifyContent: 'center' }}>
            <Link to="/register-school" className="link-hover-primary">
              {t('login.registerSchool')}
            </Link>
          </div>

          {demoQuery.data?.enabled && (
            <section className="login-demo" aria-labelledby="login-demo-title">
              <h3 id="login-demo-title" className="login-demo-title">
                <Eye size={16} /> {t('demo.title')}
              </h3>
              <p className="login-demo-copy">{t('demo.copy')}</p>
              <div className="login-demo-roles">
                {demoRoles.map(({ role, icon: Icon, labelKey }) => (
                  <button
                    key={role}
                    type="button"
                    className="btn btn-secondary login-demo-role"
                    disabled={demoLoading !== null || loading}
                    aria-busy={demoLoading === role}
                    onClick={() => void openDemo(role)}
                  >
                    <Icon size={16} /> {t(labelKey)}
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
