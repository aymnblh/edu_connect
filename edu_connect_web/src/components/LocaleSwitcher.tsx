import { Languages } from 'lucide-react';
import { useLocale, type Locale } from '../lib/i18n';

const locales: Locale[] = ['fr', 'ar', 'en'];

export default function LocaleSwitcher() {
  const { locale, setLocale, t } = useLocale();

  return (
    <label className="locale-switcher">
      <Languages size={16} />
      <span className="sr-only">{t('language.label')}</span>
      <select
        value={locale}
        aria-label={t('language.label')}
        onChange={(event) => setLocale(event.target.value as Locale)}
      >
        {locales.map((localeOption) => (
          <option key={localeOption} value={localeOption}>
            {t(`language.${localeOption}`)}
          </option>
        ))}
      </select>
    </label>
  );
}
