import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  Bus,
  Calculator,
  CheckCircle2,
  ChevronDown,
  FileText,
  Gift,
  HeartHandshake,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { useLocale } from '../../lib/i18n';
import { SALES_EMAIL } from '../../lib/salesConfig';

const FEATURE_KEYS = [
  'pricing.f.grades',
  'pricing.f.attendance',
  'pricing.f.reportCards',
  'pricing.f.messages',
  'pricing.f.fees',
  'pricing.f.health',
  'pricing.f.monthly',
  'pricing.f.canteen',
  'pricing.f.transport',
  'pricing.f.apps',
  'pricing.f.security',
];

const PILLARS = [
  {
    key: 'director',
    icon: ShieldCheck,
    titleKey: 'pricing.pillar.directorTitle',
    copyKey: 'pricing.pillar.directorCopy',
  },
  {
    key: 'finance',
    icon: Wallet,
    titleKey: 'pricing.pillar.financeTitle',
    copyKey: 'pricing.pillar.financeCopy',
  },
  {
    key: 'services',
    icon: Bus,
    titleKey: 'pricing.pillar.servicesTitle',
    copyKey: 'pricing.pillar.servicesCopy',
  },
  {
    key: 'parents',
    icon: HeartHandshake,
    titleKey: 'pricing.pillar.parentsTitle',
    copyKey: 'pricing.pillar.parentsCopy',
  },
] as const;

const ONBOARDING_STEPS = [
  { key: 'step1', titleKey: 'pricing.step1Title', copyKey: 'pricing.step1Copy' },
  { key: 'step2', titleKey: 'pricing.step2Title', copyKey: 'pricing.step2Copy' },
  { key: 'step3', titleKey: 'pricing.step3Title', copyKey: 'pricing.step3Copy' },
] as const;

const FAQ_ITEMS = [
  { key: 'faq1', qKey: 'pricing.faq.q1', aKey: 'pricing.faq.a1' },
  { key: 'faq2', qKey: 'pricing.faq.q2', aKey: 'pricing.faq.a2' },
  { key: 'faq3', qKey: 'pricing.faq.q3', aKey: 'pricing.faq.a3' },
  { key: 'faq4', qKey: 'pricing.faq.q4', aKey: 'pricing.faq.a4' },
  { key: 'faq5', qKey: 'pricing.faq.q5', aKey: 'pricing.faq.a5' },
] as const;

function computePricingEstimate(studentCount: number) {
  if (studentCount <= 150) {
    return {
      unitPrice: 1500,
      tierKey: 'pricing.sim.tier.essential',
    };
  }
  if (studentCount <= 400) {
    return {
      unitPrice: 1200,
      tierKey: 'pricing.sim.tier.growth',
    };
  }
  return {
    unitPrice: 950,
    tierKey: 'pricing.sim.tier.campus',
  };
}

/** Core all-inclusive plan card with free first trimester, features list and primary CTAs. */
export function PricingPlanCard({ id }: { id?: string }) {
  const { t } = useLocale();
  return (
    <section id={id} className="glass-card pricing-plan">
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
        <a
          href="/brochure-wasel-edu.html"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-secondary"
        >
          <FileText size={16} aria-hidden="true" />
          {t('pricing.brochure')}
        </a>
        {SALES_EMAIL && (
          <a className="btn btn-secondary" href={`mailto:${SALES_EMAIL}`}>{t('pricing.contact')}</a>
        )}
      </div>
    </section>
  );
}

/** Four role-based value pillars for school decision makers. */
export function PricingPillarsGrid({ id }: { id?: string }) {
  const { t } = useLocale();
  return (
    <section id={id} className="pricing-section pricing-pillars-section" aria-labelledby="pricing-pillars-heading">
      <header className="pricing-section-header">
        <h2 id="pricing-pillars-heading">{t('pricing.pillarsTitle')}</h2>
        <p>{t('pricing.pillarsSubtitle')}</p>
      </header>
      <div className="pricing-pillars-grid">
        {PILLARS.map((pillar) => {
          const Icon = pillar.icon;
          return (
            <article key={pillar.key} className="glass-card pricing-pillar-card">
              <div className="pricing-pillar-icon" aria-hidden="true">
                <Icon size={20} />
              </div>
              <h3>{t(pillar.titleKey)}</h3>
              <p>{t(pillar.copyKey)}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

/** Interactive DZD annual budget estimator by student count. */
export function PricingSimulatorCard({ id }: { id?: string }) {
  const { locale, t } = useLocale();
  const [studentCount, setStudentCount] = useState(200);

  const estimate = useMemo(() => {
    const { unitPrice, tierKey } = computePricingEstimate(studentCount);
    const annualTotal = studentCount * unitPrice;
    const perStudentMonth = Math.round(unitPrice / 12);
    const numberLocale = locale === 'ar' ? 'ar-DZ' : locale === 'en' ? 'en-US' : 'fr-FR';
    const currencyLabel = locale === 'ar' ? 'دج' : locale === 'en' ? 'DZD' : 'DA';
    return {
      tierKey,
      annualFormatted: `${new Intl.NumberFormat(numberLocale).format(annualTotal)} ${currencyLabel}`,
      monthlyPerStudent: new Intl.NumberFormat(numberLocale).format(perStudentMonth),
    };
  }, [locale, studentCount]);

  return (
    <section id={id} className="pricing-section" aria-labelledby="pricing-sim-heading">
      <div className="glass-card pricing-simulator">
        <header className="pricing-sim-header">
          <div className="pricing-sim-badge" aria-hidden="true">
            <Calculator size={20} />
          </div>
          <div>
            <h2 id="pricing-sim-heading">{t('pricing.sim.title')}</h2>
            <p>{t('pricing.sim.subtitle')}</p>
          </div>
        </header>

        <div className="pricing-sim-controls">
          <div className="pricing-sim-label-row">
            <label htmlFor="pricing-student-slider" className="form-label">
              {t('pricing.sim.studentsLabel')}
            </label>
            <strong className="pricing-sim-count">
              {t('pricing.sim.studentsUnit', { count: studentCount })}
            </strong>
          </div>
          <input
            id="pricing-student-slider"
            type="range"
            className="pricing-sim-slider"
            min={50}
            max={1000}
            step={10}
            value={studentCount}
            onChange={(event) => setStudentCount(Number(event.target.value))}
          />
          <div className="pricing-sim-scale" aria-hidden="true">
            <span>50</span>
            <span>250</span>
            <span>500</span>
            <span>750</span>
            <span>1 000</span>
          </div>
        </div>

        <div className="pricing-sim-Result">
          <div className="pricing-sim-tier">
            <span>{t('pricing.sim.tierLabel')}</span>
            <strong>{t(estimate.tierKey)}</strong>
          </div>
          <div className="pricing-sim-amount">
            <span>{t('pricing.sim.annualEstimate')}</span>
            <strong>{estimate.annualFormatted}</strong>
            <small>{t('pricing.sim.perStudentMonth', { monthly: estimate.monthlyPerStudent })}</small>
          </div>
        </div>

        <p className="pricing-sim-disclaimer">{t('pricing.sim.disclaimer')}</p>
      </div>
    </section>
  );
}

/** 24-hour onboarding walkthrough in three steps. */
export function OnboardingStepsSection({ id }: { id?: string }) {
  const { t } = useLocale();
  return (
    <section id={id} className="pricing-section" aria-labelledby="pricing-steps-heading">
      <header className="pricing-section-header">
        <h2 id="pricing-steps-heading">{t('pricing.stepsTitle')}</h2>
      </header>
      <div className="pricing-steps-grid">
        {ONBOARDING_STEPS.map((step) => (
          <article key={step.key} className="glass-card pricing-step-card">
            <Building2 size={18} className="pricing-step-icon" aria-hidden="true" />
            <h3>{t(step.titleKey)}</h3>
            <p>{t(step.copyKey)}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

/** Expandable FAQ list addressing common school director concerns. */
export function DirectorFaqSection({ id }: { id?: string }) {
  const { t } = useLocale();
  return (
    <section id={id} className="pricing-section pricing-faq-section" aria-labelledby="pricing-faq-heading">
      <header className="pricing-section-header">
        <h2 id="pricing-faq-heading">{t('pricing.faqTitle')}</h2>
      </header>
      <div className="pricing-faq-list">
        {FAQ_ITEMS.map((item) => (
          <details key={item.key} className="glass-card pricing-faq-item">
            <summary>
              <span>{t(item.qKey)}</span>
              <ChevronDown size={18} aria-hidden="true" />
            </summary>
            <p>{t(item.aKey)}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
