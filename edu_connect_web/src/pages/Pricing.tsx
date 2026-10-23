import { Link } from 'react-router-dom';
import { CheckCircle2, Gift, GraduationCap } from 'lucide-react';
import LocaleSwitcher from '../components/LocaleSwitcher';
import { useLocale } from '../lib/i18n';

const FEATURE_KEYS = [
  'pricing.f.grades',
  'pricing.f.attendance',
  'pricing.f.reportCards',
  'pricing.f.messages',
  'pricing.f.fees',
  'pricing.f.health',
  'pricing.f.monthly',
  'pricing.f.apps',
  'pricing.f.security',
];

// Optional sales contact, set at build time (e.g. VITE_SALES_EMAIL=contact@ecole.dz).
const SALES_EMAIL = import.meta.env.VITE_SALES_EMAIL?.trim();

/** Public plans page: everything included, first trimester free, price on request. */
export default function Pricing() {
  const { t } = useLocale();
  return (
    <main className="pricing-page">
      <div className="pricing-top">
        <Link to="/login" className="pricing-brand">
          <img src="/wasel-edu-logo.svg" alt="" /> Wasel Edu
        </Link>
        <LocaleSwitcher />
      </div>
      <section className="pricing-hero">
        <span className="login-kicker"><GraduationCap size={14} /> {t('pricing.kicker')}</span>
        <h1>{t('pricing.title')}</h1>
        <p>{t('pricing.copy')}</p>
      </section>
      <section className="glass-card pricing-plan">
        <div className="pricing-offer">
          <Gift size={22} aria-hidden="true" />
          <div>
            <strong>{t('pricing.trial')}</strong>
            <span>{t('pricing.trialCopy')}</span>
          </div>
        </div>
        <h2>{t('pricing.included')}</h2>
        <ul className="pricing-features">
          {FEATURE_KEYS.map((key) => (
            <li key={key}><CheckCircle2 size={16} aria-hidden="true" /> {t(key)}</li>
          ))}
        </ul>
        <p className="pricing-price">{t('pricing.price')}</p>
        <p className="report-card-muted">{t('pricing.referral')}</p>
        <div className="pricing-actions">
          <Link to="/register-school" className="btn btn-primary">{t('pricing.signUp')}</Link>
          <Link to="/login" className="btn btn-secondary">{t('pricing.demo')}</Link>
          {SALES_EMAIL && (
            <a className="btn btn-secondary" href={`mailto:${SALES_EMAIL}`}>{t('pricing.contact')}</a>
          )}
        </div>
      </section>
    </main>
  );
}
