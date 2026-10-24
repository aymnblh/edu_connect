import { Printer } from 'lucide-react';
import { useSchoolBranding } from '../lib/branding';
import { useLocale } from '../lib/i18n';
import { formatDA, formatDay, type FeeInvoice, type FeePayment } from '../lib/money';
import { Modal } from './DirectorRecordsPanels';

type ReceiptModalProps = {
  schoolName: string;
  studentName: string;
  invoice: FeeInvoice;
  payment: FeePayment;
  onClose: () => void;
};

/** A payment receipt the school or the parent can print or save as PDF. */
export default function ReceiptModal({ schoolName, studentName, invoice, payment, onClose }: ReceiptModalProps) {
  const { t, locale } = useLocale();
  const logo = useSchoolBranding().data?.logo;
  // What was left right after this payment, from the payments made up to it.
  const paidUpTo = invoice.payments
    .filter((item) => item.paid_at <= payment.paid_at)
    .reduce((sum, item) => sum + item.amount, 0);
  const leftAfter = Math.max(invoice.amount_due - paidUpTo, 0);

  return (
    <Modal title={t('fees.receipt')} onClose={onClose}>
      <article className="fee-receipt-sheet">
        <header>
          {logo && <img className="printed-logo" src={logo} alt="" />}
          <div className="fee-receipt-heading">
            <strong className="fee-receipt-school">{schoolName}</strong>
            <span>{t('fees.receiptTitle')}</span>
          </div>
          <div className="fee-receipt-number">
            <span>{t('fees.receiptNumber')}</span>
            <strong>{payment.receipt_number}</strong>
          </div>
        </header>
        <dl>
          <div><dt>{t('fees.date')}</dt><dd>{formatDay(payment.paid_at, locale)}</dd></div>
          <div><dt>{t('fees.student')}</dt><dd>{studentName}</dd></div>
          <div><dt>{t('fees.fee')}</dt><dd>{invoice.label}</dd></div>
          <div><dt>{t('fees.method')}</dt><dd>{t(`fees.method.${payment.payment_method}`)}</dd></div>
          <div className="fee-receipt-amount"><dt>{t('fees.amountReceived')}</dt><dd>{formatDA(payment.amount, locale)}</dd></div>
          <div><dt>{t('fees.totalDue')}</dt><dd>{formatDA(invoice.amount_due, locale)}</dd></div>
          <div><dt>{t('fees.leftAfter')}</dt><dd>{leftAfter ? formatDA(leftAfter, locale) : t('fees.settled')}</dd></div>
          {payment.notes && <div><dt>{t('fees.note')}</dt><dd>{payment.notes}</dd></div>}
        </dl>
        <footer>{t('fees.receiptFooter')}</footer>
      </article>
      <div className="table-actions fee-receipt-actions">
        <button type="button" className="btn btn-primary btn-compact" onClick={() => window.print()}>
          <Printer size={14} /> {t('fees.printReceipt')}
        </button>
      </div>
    </Modal>
  );
}
