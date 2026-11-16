import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Database,
  Eye,
  FileText,
  GraduationCap,
  Lock,
  Menu,
  Presentation,
  ShieldAlert,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import LocaleSwitcher from '../components/LocaleSwitcher';
import {
  DirectorFaqSection,
  OnboardingStepsSection,
  PricingPillarsGrid,
  PricingPlanCard,
  PricingSimulatorCard,
} from '../components/landing/PricingSections';
import RolePreviewShowcase from '../components/landing/RolePreviewShowcase';
import { useWorkspace } from '../contexts/useWorkspace';
import { api } from '../lib/api';
import { establishUserSession } from '../lib/authSession';
import type { DemoRole } from '../lib/demo';
import { useLocale } from '../lib/i18n';
import { SALES_EMAIL } from '../lib/salesConfig';

const COMPARE_ROWS = [
  { key: 'r1', topic: 'landing.compare.r1Topic', oldKey: 'landing.compare.r1Old', newKey: 'landing.compare.r1New' },
  { key: 'r2', topic: 'landing.compare.r2Topic', oldKey: 'landing.compare.r2Old', newKey: 'landing.compare.r2New' },
  { key: 'r3', topic: 'landing.compare.r3Topic', oldKey: 'landing.compare.r3Old', newKey: 'landing.compare.r3New' },
  { key: 'r4', topic: 'landing.compare.r4Topic', oldKey: 'landing.compare.r4Old', newKey: 'landing.compare.r4New' },
] as const;

const SECURITY_ITEMS = [
  { key: 's1', icon: Database, titleKey: 'landing.security.s1Title', copyKey: 'landing.security.s1Copy' },
  { key: 's2', icon: Lock, titleKey: 'landing.security.s2Title', copyKey: 'landing.security.s2Copy' },
  { key: 's3', icon: ShieldCheck, titleKey: 'landing.security.s3Title', copyKey: 'landing.security.s3Copy' },
  { key: 's4', icon: Eye, titleKey: 'landing.security.s4Title', copyKey: 'landing.security.s4Copy' },
] as const;

const DEMO_ROLES: Array<{ role: DemoRole; icon: typeof Building2; labelKey: string }> = [
  { role: 'principal', icon: Building2, labelKey: 'demo.asDirector' },
  { role: 'teacher', icon: Presentation, labelKey: 'demo.asTeacher' },
  { role: 'parent', icon: Users, labelKey: 'demo.asParent' },
];

/** Dedicated commercial landing page (/accueil) with interactive role walkthroughs and live demo launcher. */
export default function Landing() {
  const { t } = useLocale();
  const navigate = useNavigate();
  const { refreshWorkspace } = useWorkspace();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [demoLoading, setDemoLoading] = useState<DemoRole | null>(null);
  const [demoError, setDemoError] = useState('');

  const demoQuery = useQuery<{ enabled: boolean }>({
    queryKey: ['public-demo'],
    queryFn: async () => (await api.get('/auth/demo')).data,
    staleTime: 5 * 60 * 1000,
    retry: 1,
    retryDelay: 2500,
  });

  const openDemo = async (role: DemoRole) => {
    setDemoError('');
    setDemoLoading(role);
    try {
      const res = await api.post('/auth/demo-login', { role });
      const targetRoute = await establishUserSession(res.data, false, refreshWorkspace);
      if (targetRoute) {
        navigate(targetRoute);
      } else {
        setDemoError(t('auth.unauthorized'));
      }
    } catch (err: unknown) {
      const detail = isAxiosError(err) ? err.response?.data?.detail : null;
      setDemoError(typeof detail === 'string' ? detail : detail?.message || t('auth.connectionError'));
    } finally {
      setDemoLoading(null);
    }
  };

  return (
    <div className="landing-page">
      <header className="landing-nav">
        <div className="landing-nav-inner">
          <Link to="/accueil" className="landing-brand">
            <img src="/wasel-edu-logo.svg" alt="" />
            <span>Wasel Edu</span>
          </Link>

          <nav className={`landing-nav-links ${mobileMenuOpen ? 'is-open' : ''}`} aria-label="Navigation">
            <a href="#apercu" onClick={() => setMobileMenuOpen(false)}>{t('landing.nav.preview')}</a>
            <a href="#modules" onClick={() => setMobileMenuOpen(false)}>{t('landing.nav.modules')}</a>
            <a href="#comparatif" onClick={() => setMobileMenuOpen(false)}>{t('landing.nav.compare')}</a>
            <a href="#tarifs" onClick={() => setMobileMenuOpen(false)}>{t('landing.nav.pricing')}</a>
            <a href="#faq" onClick={() => setMobileMenuOpen(false)}>{t('landing.nav.faq')}</a>
            <div className="landing-nav-mobile-actions">
              <Link to="/login" className="btn btn-secondary" onClick={() => setMobileMenuOpen(false)}>
                {t('landing.nav.login')}
              </Link>
              <Link to="/register-school" className="btn btn-primary" onClick={() => setMobileMenuOpen(false)}>
                {t('landing.nav.cta')}
              </Link>
            </div>
          </nav>

          <div className="landing-nav-actions">
            <LocaleSwitcher />
            <Link to="/login" className="btn btn-secondary btn-compact landing-desktop-only">
              {t('landing.nav.login')}
            </Link>
            <Link to="/register-school" className="btn btn-primary btn-compact landing-desktop-only">
              {t('landing.nav.cta')}
            </Link>
            <button
              type="button"
              className="landing-menu-toggle"
              aria-label={t('landing.nav.menuToggle')}
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen((prev) => !prev)}
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      <main>
        <section className="landing-hero">
          <div className="landing-hero-inner">
            <div className="landing-hero-copy-col">
              <span className="landing-hero-eyebrow">
                <GraduationCap size={14} aria-hidden="true" />
                {t('landing.hero.eyebrow')}
              </span>
              <h1>{t('landing.hero.title')}</h1>
              <p className="landing-hero-subtitle">{t('landing.hero.subtitle')}</p>

              <div className="landing-hero-pills">
                <span>{t('landing.hero.pill1')}</span>
                <span>{t('landing.hero.pill2')}</span>
                <span>{t('landing.hero.pill3')}</span>
                <span>{t('landing.hero.pill4')}</span>
              </div>

              <div className="landing-hero-ctas">
                <Link to="/register-school" className="btn btn-primary landing-cta-gold">
                  <span>{t('landing.hero.ctaPrimary')}</span>
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
                {!demoQuery.data?.enabled && (
                  <a href="#apercu" className="btn btn-secondary landing-cta-ghost">
                    {t('landing.hero.ctaDemo')}
                  </a>
                )}
                <a
                  href="/brochure-wasel-edu.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary landing-cta-ghost"
                >
                  <FileText size={16} aria-hidden="true" />
                  {t('pricing.brochure')}
                </a>
              </div>

              {demoQuery.isPending && (
                <div className="landing-hero-demo">
                  <span className="landing-hero-demo-label">
                    <Eye size={15} aria-hidden="true" />
                    {t('landing.hero.demoChecking')}
                  </span>
                </div>
              )}

              {!demoQuery.isPending && !demoQuery.data?.enabled && (
                <div className="landing-hero-demo">
                  <span className="landing-hero-demo-label">
                    <Eye size={15} aria-hidden="true" />
                    {t('landing.hero.demoOfflineHint')}
                  </span>
                </div>
              )}

              {demoQuery.data?.enabled && (
                <div className="landing-hero-demo">
                  <span className="landing-hero-demo-label">
                    <Eye size={15} aria-hidden="true" />
                    {t('landing.hero.demoPrompt')}
                  </span>
                  <div className="landing-hero-demo-buttons">
                    {DEMO_ROLES.map(({ role, icon: Icon, labelKey }) => (
                      <button
                        key={role}
                        type="button"
                        className="btn btn-secondary btn-compact landing-cta-ghost"
                        disabled={demoLoading !== null}
                        aria-busy={demoLoading === role}
                        onClick={() => void openDemo(role)}
                      >
                        <Icon size={15} aria-hidden="true" />
                        {t(labelKey)}
                      </button>
                    ))}
                  </div>
                  {demoError && (
                    <div className="login-error" role="alert" style={{ marginTop: '0.75rem' }}>
                      <ShieldAlert size={16} />
                      <span>{demoError}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <aside className="landing-hero-snapshot" aria-label={t('landing.hero.cardTitle')}>
              <span className="landing-snapshot-kicker">{t('landing.hero.cardKicker')}</span>
              <h2>{t('landing.hero.cardTitle')}</h2>
              <div className="landing-snapshot-grid">
                <div className="landing-snapshot-tile">
                  <strong>{t('landing.hero.m1Value')}</strong>
                  <span>{t('landing.hero.m1Label')}</span>
                  <small>{t('landing.hero.m1Sub')}</small>
                </div>
                <div className="landing-snapshot-tile">
                  <strong>{t('landing.hero.m2Value')}</strong>
                  <span>{t('landing.hero.m2Label')}</span>
                  <small>{t('landing.hero.m2Sub')}</small>
                </div>
                <div className="landing-snapshot-tile">
                  <strong>{t('landing.hero.m3Value')}</strong>
                  <span>{t('landing.hero.m3Label')}</span>
                  <small>{t('landing.hero.m3Sub')}</small>
                </div>
                <div className="landing-snapshot-tile">
                  <strong>{t('landing.hero.m4Value')}</strong>
                  <span>{t('landing.hero.m4Label')}</span>
                  <small>{t('landing.hero.m4Sub')}</small>
                </div>
              </div>
            </aside>
          </div>
        </section>

        <RolePreviewShowcase />

        <div className="landing-band-alt">
          <PricingPillarsGrid id="modules" />
        </div>

        <section id="comparatif" className="landing-section" aria-labelledby="landing-compare-heading">
          <header className="landing-section-header">
            <span className="dashboard-eyebrow">{t('landing.compare.eyebrow')}</span>
            <h2 id="landing-compare-heading">{t('landing.compare.title')}</h2>
          </header>

          <div className="glass-card landing-compare-wrap">
            <table className="landing-compare-table">
              <thead>
                <tr>
                  <th>{t('landing.compare.colTopic')}</th>
                  <th className="col-old">{t('landing.compare.colOld')}</th>
                  <th className="col-new">{t('landing.compare.colNew')}</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE_ROWS.map((row) => (
                  <tr key={row.key}>
                    <th scope="row">{t(row.topic)}</th>
                    <td className="cell-old">{t(row.oldKey)}</td>
                    <td className="cell-new">
                      <div className="landing-compare-new-inner">
                        <CheckCircle2 size={16} aria-hidden="true" />
                        <span>{t(row.newKey)}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="landing-security-block">
            <header className="landing-section-header" style={{ marginBottom: '1.5rem' }}>
              <span className="dashboard-eyebrow">{t('landing.security.eyebrow')}</span>
              <h3>{t('landing.security.title')}</h3>
            </header>
            <div className="landing-security-grid">
              {SECURITY_ITEMS.map(({ key, icon: Icon, titleKey, copyKey }) => (
                <article key={key} className="glass-card landing-security-card">
                  <div className="landing-security-icon" aria-hidden="true">
                    <Icon size={18} />
                  </div>
                  <h4>{t(titleKey)}</h4>
                  <p>{t(copyKey)}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <div id="tarifs" className="landing-band-alt landing-pricing-band">
          <PricingPlanCard />
          <PricingSimulatorCard />
        </div>

        <div className="landing-steps-band">
          <OnboardingStepsSection />
        </div>

        <div className="landing-band-alt landing-faq-band">
          <DirectorFaqSection id="faq" />
        </div>

        <section className="landing-final-cta">
          <div className="landing-final-cta-card">
            <div>
              <h2>{t('landing.finalCta.title')}</h2>
              <p>{t('landing.finalCta.copy')}</p>
            </div>
            <div className="landing-final-cta-actions">
              <Link to="/register-school" className="btn btn-primary landing-cta-gold">
                {t('pricing.signUp')}
              </Link>
              <Link to="/login" className="btn btn-secondary landing-cta-ghost">
                {t('landing.nav.login')}
              </Link>
              {SALES_EMAIL && (
                <a className="btn btn-secondary landing-cta-ghost" href={`mailto:${SALES_EMAIL}`}>
                  {t('pricing.contact')}
                </a>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="landing-footer-brand">
            <div className="landing-brand" style={{ color: '#f7f4eb' }}>
              <img src="/wasel-edu-logo.svg" alt="" />
              <span>Wasel Edu</span>
            </div>
            <p>{t('landing.footer.tagline')}</p>
            <LocaleSwitcher />
          </div>

          <div className="landing-footer-col">
            <h4>{t('landing.footer.linksTitle')}</h4>
            <ul>
              <li><Link to="/login">{t('landing.nav.login')}</Link></li>
              <li><Link to="/register-school">{t('pricing.signUp')}</Link></li>
              <li><Link to="/activate">{t('landing.footer.activate')}</Link></li>
              <li><Link to="/pricing">{t('landing.footer.pricingPage')}</Link></li>
            </ul>
          </div>

          <div className="landing-footer-col">
            <h4>{t('landing.footer.resourcesTitle')}</h4>
            <ul>
              <li>
                <a href="/brochure-wasel-edu.html" target="_blank" rel="noopener noreferrer">
                  {t('pricing.brochure')}
                </a>
              </li>
              <li><Link to="/policies">{t('landing.footer.policies')}</Link></li>
              {SALES_EMAIL && (
                <li><a href={`mailto:${SALES_EMAIL}`}>{SALES_EMAIL}</a></li>
              )}
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}
