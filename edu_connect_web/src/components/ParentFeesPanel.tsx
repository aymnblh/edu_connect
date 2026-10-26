import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Receipt, Wallet } from 'lucide-react';
import { api } from '../lib/api';
import { useLocale } from '../lib/i18n';
import { formatDA, formatDay, type FeeInvoice, type FeePayment } from '../lib/money';
import ReceiptModal from './FeeReceipt';

interface MyFees {
  school_name: string;
  student_name: string;
  total_remaining: number;
  invoices: FeeInvoice[];
}

/** A parent's view of one child's school fees, with every receipt. */
export default function ParentFeesPanel({ studentId }: { studentId: string }) {
  const { t, locale } = useLocale();
  const [receipt, setReceipt] = useState<{ invoice: FeeInvoice; payment: FeePayment } | null>(null);
  const feesQuery = useQuery<MyFees>({
    queryKey: ['my-fees', studentId],
    queryFn: async () => (await api.get('/finance/my-fees', { params: { student_id: studentId } })).data,
  });
  const fees = feesQuery.data;

  if (feesQuery.isLoading) return <p className="dashboard-section-copy">{t('common.loading')}</p>;
  if (!fees) return <p className="dashboard-section-copy">{t('fees.loadError')}</p>;

  return (
    <div className="animate-fade-in parent-fees" role="tabpanel">
      <div className="parent-fees-total">
        <Wallet size={18} aria-hidden="true" />
        <span>
          {fees.total_remaining > 0
            ? t('fees.parentLeft', { amount: formatDA(fees.total_remaining, locale) })
            : t('fees.parentNothingDue')}
        </span>
      </div>
      {fees.invoices.length === 0 && <p className="empty-list-copy">{t('fees.parentEmpty')}</p>}
      {fees.invoices.map((invoice) => (
        <article key={invoice.id} className="parent-fee-card">
          <header>
            <strong>{invoice.label}</strong>
            {invoice.status === 'paid' ? (
              <span className="status-badge status-badge--active">{t('fees.status.paid')}</span>
            ) : invoice.days_overdue > 0 ? (
              <span className="status-badge status-badge--danger">{t('fees.overdueBy', { days: invoice.days_overdue })}</span>
            ) : (
              <span className="status-badge status-badge--warning">{t(`fees.status.${invoice.status}`)}</span>
            )}
          </header>
          <dl>
            <div><dt>{t('fees.totalDue')}</dt><dd>{formatDA(invoice.amount_due, locale)}</dd></div>
            <div><dt>{t('fees.paid')}</dt><dd>{formatDA(invoice.amount_paid, locale)}</dd></div>
            <div><dt>{t('fees.left')}</dt><dd><strong>{formatDA(invoice.remaining, locale)}</strong></dd></div>
            <div><dt>{t('fees.dueDate')}</dt><dd>{formatDay(invoice.due_date, locale)}</dd></div>
          </dl>
          {invoice.payments.length > 0 && (
            <ul className="fees-payments">
              {invoice.payments.map((payment) => (
                <li key={payment.id}>
                  <div>
                    <strong>{formatDA(payment.amount, locale)}</strong>
                    <span className="table-cell-muted">
                      {formatDay(payment.paid_at, locale)} · {t(`fees.method.${payment.payment_method}`)}
                    </span>
                  </div>
                  <button type="button" className="btn btn-secondary btn-compact" onClick={() => setReceipt({ invoice, payment })}>
                    <Receipt size={14} /> {t('fees.receipt')}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </article>
      ))}
      <p className="report-card-muted">{t('fees.parentHow')}</p>
      {receipt && (
        <ReceiptModal
          schoolName={fees.school_name}
          studentName={fees.student_name}
          invoice={receipt.invoice}
          payment={receipt.payment}
          onClose={() => setReceipt(null)}
        />
      )}
    </div>
  );
}
