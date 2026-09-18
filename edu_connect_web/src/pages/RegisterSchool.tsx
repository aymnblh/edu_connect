import { useState } from 'react';
import { isAxiosError } from 'axios';
import { Link } from 'react-router-dom';
import { ShieldAlert, Sparkles, BookOpen, HeartHandshake, ShieldCheck } from 'lucide-react';
import LocaleSwitcher from '../components/LocaleSwitcher';
import { api } from '../lib/api';
import { useLocale } from '../lib/i18n';

export default function RegisterSchool() {
  const [schoolName, setSchoolName] = useState('');
  const [directorName, setDirectorName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const { t } = useLocale();

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError(t('register.passwordMismatch'));
      return;
    }

    if (!termsAccepted) {
      setError(t('register.termsRequired'));
      return;
    }

    setLoading(true);

    try {
      await api.post('/onboarding/register-school', {
        school_name: schoolName,
        admin_email: email,
        admin_full_name: directorName,
        admin_password: password,
        terms_accepted: termsAccepted,
      });
      setSuccess(true);
    } catch (err: unknown) {
      const detail = isAxiosError(err) ? err.response?.data?.detail : null;
      setError(typeof detail === 'string' ? detail : detail?.message || t('common.errorGeneric'));
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
        <div className="glass-card animate-fade-in login-card" style={{ maxWidth: '450px', width: '100%' }}>
          <div className="login-card-actions">
            <LocaleSwitcher />
          </div>

          <div className="login-card-header">
            <div className="login-logo-wrap">
              <div className="login-logo">
                <img src="/wasel-edu-logo.svg" alt={t('common.appName')} />
              </div>
            </div>
            <h2 className="login-title">{t('register.title')}</h2>
            <p className="login-subtitle">{t('register.subtitle')}</p>
          </div>

          {error && (
            <div className="login-error animate-fade-in" role="alert">
              <ShieldAlert size={18} className="login-error-icon" />
              <span>{error}</span>
            </div>
          )}

          {success ? (
            <div className="login-success animate-fade-in" style={{ textAlign: 'center', margin: '2rem 0' }}>
              <ShieldCheck size={48} style={{ color: 'var(--success)', margin: '0 auto 1rem' }} />
              <p style={{ marginBottom: '1.5rem', fontWeight: 500 }}>{t('register.success')}</p>
              <Link to="/login" className="btn btn-primary btn-full">
                {t('register.backToLogin')}
              </Link>
            </div>
          ) : (
            <form onSubmit={handleRegister} className="login-form">
              <div className="form-group">
                <label htmlFor="schoolName" className="form-label">{t('register.schoolName')}</label>
                <input
                  id="schoolName"
                  type="text"
                  className="input-field"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  placeholder={t('register.schoolNamePlaceholder')}
                  required
                  minLength={2}
                />
              </div>

              <div className="form-group">
                <label htmlFor="directorName" className="form-label">{t('register.directorName')}</label>
                <input
                  id="directorName"
                  type="text"
                  className="input-field"
                  value={directorName}
                  onChange={(e) => setDirectorName(e.target.value)}
                  required
                  minLength={2}
                />
              </div>

              <div className="form-group">
                <label htmlFor="email" className="form-label">{t('register.email')}</label>
                <input
                  id="email"
                  type="email"
                  className="input-field"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="password" className="form-label">{t('register.password')}</label>
                <input
                  id="password"
                  type="password"
                  className="input-field"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword" className="form-label">{t('register.confirmPassword')}</label>
                <input
                  id="confirmPassword"
                  type="password"
                  className="input-field"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>

              <label className="login-remember-device" style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginTop: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  required
                  style={{ marginTop: '0.25rem' }}
                />
                <span style={{ fontSize: '0.9rem' }}>
                  {t('register.termsLabel')} <Link to="/policies" className="link-hover-primary" target="_blank" rel="noopener noreferrer">(Policies)</Link>
                </span>
              </label>

              <button type="submit" className="btn btn-primary login-submit" disabled={loading} aria-busy={loading}>
                {loading ? t('register.submitting') : t('register.submit')}
              </button>

              <div className="login-footer" style={{ justifyContent: 'center', marginTop: '1rem' }}>
                <span>{t('register.alreadyHaveAccount')}</span>
                <Link to="/login" className="link-hover-primary" style={{ marginLeft: '0.5rem' }}>
                  {t('register.backToLogin')}
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
