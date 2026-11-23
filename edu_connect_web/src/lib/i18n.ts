import { useCallback, useEffect, useState } from 'react';
import { academicsTranslations } from './locales/academics';
import { commonTranslations } from './locales/common';
import { directorTranslations } from './locales/director';
import { directorReportsTranslations } from './locales/directorReports';
import { landingTranslations } from './locales/landing';
import { parentTranslations } from './locales/parent';
import { servicesTranslations } from './locales/services';
import type { Locale, TranslationMap, TranslationParams } from './locales/types';

export type { Locale } from './locales/types';

const localeStorageKey = 'educonnect_locale';
const localeChangeEvent = 'educonnect_locale_change';
const supportedLocales: Locale[] = ['fr', 'ar', 'en'];

export const translations: TranslationMap = {
  ...commonTranslations,
  ...landingTranslations,
  ...directorTranslations,
  ...directorReportsTranslations,
  ...academicsTranslations,
  ...parentTranslations,
  ...servicesTranslations,
};

function normalizeLocale(value: string | null | undefined): Locale {
  const normalized = value?.toLowerCase().split('-')[0];
  return supportedLocales.includes(normalized as Locale) ? (normalized as Locale) : 'fr';
}

function detectLocale(): Locale {
  if (typeof window === 'undefined') {
    return 'fr';
  }

  return normalizeLocale(
    localStorage.getItem(localeStorageKey) ||
      document.documentElement.lang ||
      navigator.language
  );
}

function applyDocumentLocale(locale: Locale) {
  if (typeof document === 'undefined') {
    return;
  }

  document.documentElement.lang = locale;
  document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
}

function interpolate(value: string, params?: TranslationParams) {
  if (!params) {
    return value;
  }

  return Object.entries(params).reduce(
    (current, [key, replacement]) => current.replaceAll(`{${key}}`, String(replacement)),
    value
  );
}

export function t(key: string, params?: TranslationParams, locale: Locale = detectLocale()): string {
  const entry = translations[key];
  if (!entry) {
    return key;
  }

  return interpolate(entry[locale] || entry.fr || key, params);
}

export function useLocale() {
  const [locale, setLocaleState] = useState<Locale>(() => detectLocale());

  useEffect(() => {
    applyDocumentLocale(locale);
  }, [locale]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === localeStorageKey) {
        setLocaleState(normalizeLocale(event.newValue));
      }
    };

    const handleLocaleChange = (event: Event) => {
      const nextLocale = (event as CustomEvent<Locale>).detail;
      setLocaleState(normalizeLocale(nextLocale));
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener(localeChangeEvent, handleLocaleChange);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(localeChangeEvent, handleLocaleChange);
    };
  }, []);

  const setLocale = useCallback((nextLocale: Locale) => {
    const normalizedLocale = normalizeLocale(nextLocale);
    localStorage.setItem(localeStorageKey, normalizedLocale);
    setLocaleState(normalizedLocale);
    window.dispatchEvent(new CustomEvent(localeChangeEvent, { detail: normalizedLocale }));
  }, []);

  const translate = useCallback(
    (key: string, params?: TranslationParams) => t(key, params, locale),
    [locale]
  );

  return {
    locale,
    dir: locale === 'ar' ? 'rtl' : 'ltr',
    setLocale,
    t: translate,
  };
}
