import { Link } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';
import LocaleSwitcher from '../components/LocaleSwitcher';
import {
  DirectorFaqSection,
  OnboardingStepsSection,
  PricingPillarsGrid,
  PricingPlanCard,
  PricingSimulatorCard,
} from '../components/landing/PricingSections';
import { useLocale } from '../lib/i18n';

/** Public plans page: everything included, first trimester free, DA estimator and FAQ. */
export default function Pricing() {
  const { t } = useLocale();

  return (
    <main className="pricing-page">
      <div className="pricing-top">
        <Link to="/accueil" className="pricing-brand">
          <img src="/wasel-edu-logo.svg" alt="" /> WaselEdu
        </Link>
        <div className="pricing-top-actions">
          <Link to="/accueil" className="link-hover-primary">{t('pricing.discoverLink')}</Link>
          <Link to="/login" className="link-hover-primary">{t('pricing.signInLink')}</Link>
          <LocaleSwitcher />
        </div>
      </div>

      <section className="pricing-hero">
        <span className="login-kicker"><GraduationCap size={14} /> {t('pricing.kicker')}</span>
        <h1>{t('pricing.title')}</h1>
        <p>{t('pricing.copy')}</p>
      </section>

      <PricingPlanCard />
      <PricingPillarsGrid />
      <PricingSimulatorCard />
      <OnboardingStepsSection />
      <DirectorFaqSection />
    </main>
  );
}
