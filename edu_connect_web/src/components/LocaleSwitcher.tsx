import { Languages } from 'lucide-react';
import { useLocale, type Locale } from '../lib/i18n';

const locales: Locale[] = ['fr', 'ar', 'en'];
const localeShortLabels: Record<Locale, string> = {
  fr: 'FR',
  ar: 'AR',
  en: 'EN',
};

export default function LocaleSwitcher() {
  const { locale, setLocale, t } = useLocale();

  return (
    <div className="locale-switcher" role="group" aria-label={t('language.label')}>
      <Languages size={16} />
      <div className="locale-options">
        {locales.map((localeOption) => (
          <button
            key={localeOption}
            type="button"
            className={`locale-option ${locale === localeOption ? 'locale-option--active' : ''}`}
            aria-label={t(`language.${localeOption}`)}
            aria-pressed={locale === localeOption}
            onClick={() => setLocale(localeOption)}
          >
            {localeShortLabels[localeOption]}
          </button>
        ))}
      </div>
    </div>
  );
}
