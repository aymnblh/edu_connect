import { t, type Locale } from './i18n';

function intlLocale(locale: Locale) {
  return locale === 'ar' ? 'ar-DZ' : locale === 'en' ? 'en-US' : 'fr-DZ';
}

/** 8500 -> "8 500 DA" (or "8 500 دج"), keeping cents only when there are some. */
export function formatDA(value: number, locale: Locale): string {
  const amount = new Intl.NumberFormat(intlLocale(locale), {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
  return `${amount} ${t('fees.currency', undefined, locale)}`;
}

export function formatDay(iso: string | null | undefined, locale: Locale): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat(intlLocale(locale), { timeZone: 'Africa/Algiers', day: '2-digit', month: '2-digit', year: 'numeric' })
    .format(new Date(iso));
}

export const PAYMENT_METHODS = ['cash', 'bank_transfer', 'ccp', 'cheque'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export interface FeePayment {
  id: string;
  amount: number;
  payment_method: string;
  receipt_number: string;
  notes?: string | null;
  paid_at: string;
}

export interface FeeInvoice {
  id: string;
  student_id: string;
  label: string;
  amount_due: number;
  amount_paid: number;
  remaining: number;
  status: 'unpaid' | 'partial' | 'paid';
  due_date: string | null;
  days_overdue: number;
  last_reminded_at: string | null;
  reminder_count: number;
  created_at: string;
  payments: FeePayment[];
}
