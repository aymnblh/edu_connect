import { t as translate, type Locale } from './i18n';

export function localeToIntl(locale: Locale): string {
  if (locale === 'ar') return 'ar-DZ';
  if (locale === 'en') return 'en-US';
  return 'fr-DZ';
}

export function formatDate(value?: string | null, locale: Locale = 'fr'): string {
  if (!value) return '-';
  return new Intl.DateTimeFormat(localeToIntl(locale), {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

export function formatShortDate(value: string, locale: Locale): string {
  const plainDateMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const parsed = plainDateMatch
    ? new Date(Number(plainDateMatch[1]), Number(plainDateMatch[2]) - 1, Number(plainDateMatch[3]))
    : new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat(localeToIntl(locale), { day: '2-digit', month: 'short' }).format(parsed);
}

export function formatDateTime(value?: string | null, locale: Locale = 'fr'): string {
  if (!value) return '-';
  return new Intl.DateTimeFormat(localeToIntl(locale), {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function formatAttendanceDate(value?: string | null, locale: Locale = 'fr'): string {
  if (!value) return '-';
  return new Intl.DateTimeFormat(localeToIntl(locale), {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  }).format(new Date(value));
}

export function formatClock(value: string, locale: Locale): string {
  const [hours, minutes] = value.split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return value;
  const parsed = new Date();
  parsed.setHours(hours, minutes, 0, 0);
  return new Intl.DateTimeFormat(localeToIntl(locale), { hour: '2-digit', minute: '2-digit' }).format(parsed);
}

export function getApiErrorMessage(error: unknown, fallback?: string): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { data?: { detail?: unknown } } }).response;
    const detail = response?.data?.detail;
    if (typeof detail === 'string') return detail;
    if (detail && typeof detail === 'object' && 'message' in detail && typeof (detail as { message?: unknown }).message === 'string') {
      return (detail as { message: string }).message;
    }
    if (detail) return JSON.stringify(detail);
  }
  if (error instanceof Error) return error.message;
  return fallback ?? translate('common.errorGeneric');
}

function copyTextFallback(value: string): boolean {
  const textArea = document.createElement('textarea');
  textArea.value = value;
  textArea.setAttribute('readonly', '');
  textArea.style.position = 'fixed';
  textArea.style.insetInlineStart = '-9999px';
  textArea.style.top = '0';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  textArea.setSelectionRange(0, value.length);

  try {
    return document.execCommand('copy');
  } finally {
    document.body.removeChild(textArea);
  }
}

export async function copyTextToClipboard(value: string): Promise<boolean> {
  try {
    if (window.isSecureContext && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
    return copyTextFallback(value);
  } catch {
    try {
      return copyTextFallback(value);
    } catch {
      return false;
    }
  }
}
