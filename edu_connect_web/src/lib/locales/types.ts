export type Locale = 'fr' | 'ar' | 'en';

export type TranslationEntry = Record<Locale, string>;
export type TranslationMap = Record<string, TranslationEntry>;
export type TranslationParams = Record<string, string | number>;
