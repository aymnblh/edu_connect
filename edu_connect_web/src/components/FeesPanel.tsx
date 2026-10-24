import { useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { BellRing, Loader2, Plus, Receipt, Search, Trash2, Wallet } from 'lucide-react';
import { api } from '../lib/api';
import { useLocale } from '../lib/i18n';
import { PAYMENT_METHODS, formatDA, formatDay, type FeeInvoice, type FeePayment, type PaymentMethod } from '../lib/money';
import { Modal } from './DirectorRecordsPanels';
import ReceiptModal from './FeeReceipt';

interface LedgerRow extends FeeInvoice {
  student_name: string;
  student_code: string | null;
  student_archived: boolean;
  classes: Array<{ id: string; name: string }>;
  parents_linked: number;
}

interface Ledger {
  school_name: string;
  auto_reminders: boolean;
  summary: {
    billed: number;
    collected: number;
    outstanding: number;
    overdue: number;
    collected_this_month: number;
    collection_rate: number | null;
    overdue_students: number;
    overdue_invoices: number;
  };
  by_class: Array<{ class_id: string | null; class_name: string | null; billed: number; collected: number; outstanding: number }>;
  invoices: LedgerRow[];
}

type StatusFilter = 'all' | 'overdue' | 'unpaid' | 'partial' | 'paid';

function errorMessage(error: unknown, fallback: string) {
  if (isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail) && typeof detail[0]?.msg === 'string') return detail[0].msg;
  }
  return fallback;
}

/** The director's view of school fees: who owes what, payments, receipts and reminders. */
export default function FeesPanel({ canChangeSettings }: { canChangeSettings: boolean }) {
  const { t, locale } = useLocale();
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [classFilter, setClassFilter] = useState('');
  const [labelFilter, setLabelFilter] = useState('');
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [paying, setPaying] = useState<LedgerRow | null>(null);
  const [history, setHistory] = useState<LedgerRow | null>(null);
  const [receipt, setReceipt] = useState<{ row: LedgerRow; payment: FeePayment } | null>(null);

  const ledgerQuery = useQuery<Ledger>({
    queryKey: ['fees-ledger'],
    queryFn: async () => (await api.get('/finance/ledger')).data,
  });
  const ledger = ledgerQuery.data;
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['fees-ledger'] });

  const remindMutation = useMutation({
    mutationFn: async (body: { invoice_ids?: string[]; all_overdue?: boolean }) =>
      (await api.post('/finance/reminders', body)).data as { sent: number; skipped_recent: number; no_parent: number },
    onSuccess: (result) => {
      setNotice(t('fees.remindersResult', { sent: result.sent, recent: result.skipped_recent, noParent: result.no_parent }));
      void refresh();
    },
    onError: (error) => setNotice(errorMessage(error, t('common.errorGeneric'))),
  });
  const settingsMutation = useMutation({
    mutationFn: async (autoReminders: boolean) => api.put('/finance/settings', { auto_reminders: autoReminders }),
    onSuccess: () => void refresh(),
    onError: (error) => setNotice(errorMessage(error, t('common.errorGeneric'))),
  });
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/finance/invoices/${id}`),
    onSuccess: () => {
      setNotice(t('fees.deleted'));
      void refresh();
    },
    onError: (error) => setNotice(errorMessage(error, t('common.errorGeneric'))),
  });

  const rows = useMemo(() => ledger?.invoices ?? [], [ledger]);
  const classes = useMemo(() => {
    const seen = new Map<string, string>();
    rows.forEach((row) => row.classes.forEach((cls) => seen.set(cls.id, cls.name)));
    return [...seen].sort((a, b) => a[1].localeCompare(b[1]));
  }, [rows]);
  const labels = useMemo(() => [...new Set(rows.map((row) => row.label))].sort(), [rows]);
  const filtered = rows.filter((row) => {
    if (statusFilter === 'overdue' && row.days_overdue <= 0) return false;
    if (statusFilter !== 'all' && statusFilter !== 'overdue' && row.status !== statusFilter) return false;
    if (classFilter && !row.classes.some((cls) => cls.id === classFilter)) return false;
    if (labelFilter && row.label !== labelFilter) return false;
    const needle = search.trim().toLowerCase();
    return !needle || row.student_name.toLowerCase().includes(needle) || (row.student_code ?? '').toLowerCase().includes(needle);
  });

  if (ledgerQuery.isLoading) return <div className="glass-card dashboard-card-pad">{t('common.loading')}</div>;
  if (!ledger) return <div className="glass-card dashboard-card-pad">{t('fees.loadError')}</div>;
  const { summary } = ledger;
  const money = (value: number) => formatDA(value, locale);

  const statusBadge = (row: LedgerRow) => {
    if (row.status === 'paid') return <span className="status-badge status-badge--active">{t('fees.status.paid')}</span>;
    if (row.days_overdue > 0) {
      return <span className="status-badge status-badge--danger">{t('fees.overdueBy', { days: row.days_overdue })}</span>;
    }
    return <span className="status-badge status-badge--warning">{t(`fees.status.${row.status}`)}</span>;
  };

  return (
    <section className="fees-panel animate-fade-in" aria-labelledby="fees-title">
      <div className="glass-card dashboard-card-pad">
        <div className="dashboard-toolbar">
          <div>
            <h2 id="fees-title" className="dashboard-section-title dashboard-section-title--plain">
              <Wallet size={18} /> {t('fees.title')}
            </h2>
            <p className="dashboard-section-copy">{t('fees.copy')}</p>
          </div>
          <div className="management-actions">
            <button type="button" className="btn btn-primary btn-compact" onClick={() => setCreating(true)}>
              <Plus size={14} /> {t('fees.new')}
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-compact"
              disabled={summary.overdue_invoices === 0 || remindMutation.isPending}
              onClick={() => window.confirm(t('fees.remindAllConfirm', { count: summary.overdue_students })) && remindMutation.mutate({ all_overdue: true })}
            >
              <BellRing size={14} /> {t('fees.remindAll', { count: summary.overdue_invoices })}
            </button>
          </div>
        </div>

        <div className="monthly-headline fees-summary">
          <div className="monthly-tile">
            <span className="monthly-tile-label">{t('fees.billed')}</span>
            <strong className="monthly-tile-value">{money(summary.billed)}</strong>
          </div>
          <div className="monthly-tile">
            <span className="monthly-tile-label">{t('fees.collected')}</span>
            <strong className="monthly-tile-value">{money(summary.collected)}</strong>
            <span className="monthly-tile-note">
              {summary.collection_rate === null ? '—' : t('fees.collectionRate', { rate: summary.collection_rate.toLocaleString(locale === 'ar' ? 'ar-DZ' : locale === 'en' ? 'en-US' : 'fr-DZ') })}
              {' · '}
              {t('fees.thisMonth', { amount: money(summary.collected_this_month) })}
            </span>
          </div>
          <div className="monthly-tile">
            <span className="monthly-tile-label">{t('fees.outstanding')}</span>
            <strong className="monthly-tile-value">{money(summary.outstanding)}</strong>
          </div>
          <div className="monthly-tile">
            <span className="monthly-tile-label">{t('fees.overdue')}</span>
            <strong className="monthly-tile-value">{money(summary.overdue)}</strong>
            <span className="monthly-tile-note">{t('fees.overdueStudents', { count: summary.overdue_students })}</span>
          </div>
        </div>

        <label className="checkbox-row fees-auto">
          <input
            type="checkbox"
            checked={ledger.auto_reminders}
            disabled={!canChangeSettings || settingsMutation.isPending}
            onChange={(e) => settingsMutation.mutate(e.target.checked)}
          />
          <span>
            <strong>{t('fees.autoReminders')}</strong> — {t('fees.autoRemindersCopy')}
            {!canChangeSettings && ` ${t('fees.directorOnly')}`}
          </span>
        </label>
        {notice && <p className="dashboard-section-copy" role="status">{notice}</p>}
      </div>

      <div className="glass-card dashboard-card-pad">
        <div className="fees-filters">
          <div className="student-filter-bar">
            <Search size={17} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('fees.search')} aria-label={t('fees.search')} />
          </div>
          <select className="form-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)} aria-label={t('fees.statusFilter')}>
            {(['all', 'overdue', 'unpaid', 'partial', 'paid'] as StatusFilter[]).map((value) => (
              <option key={value} value={value}>{t(`fees.filter.${value}`)}</option>
            ))}
          </select>
          <select className="form-input" value={classFilter} onChange={(e) => setClassFilter(e.target.value)} aria-label={t('fees.classFilter')}>
            <option value="">{t('codes.allClasses')}</option>
            {classes.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
          <select className="form-input" value={labelFilter} onChange={(e) => setLabelFilter(e.target.value)} aria-label={t('fees.labelFilter')}>
            <option value="">{t('fees.allFees')}</option>
            {labels.map((label) => <option key={label} value={label}>{label}</option>)}
          </select>
        </div>

        {rows.length === 0 && <p className="dashboard-section-copy">{t('fees.empty')}</p>}
        {rows.length > 0 && (
          <div className="premium-table-wrapper">
            <table className="premium-table fees-table">
              <thead>
                <tr>
                  <th scope="col">{t('fees.student')}</th>
                  <th scope="col">{t('fees.fee')}</th>
                  <th scope="col">{t('fees.totalDue')}</th>
                  <th scope="col">{t('fees.paid')}</th>
                  <th scope="col">{t('fees.left')}</th>
                  <th scope="col">{t('fees.dueDate')}</th>
                  <th scope="col">{t('fees.reminders')}</th>
                  <th scope="col">{t('director.students.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <strong>{row.student_name}</strong>
                      <div className="table-cell-muted">
                        {row.classes.map((cls) => cls.name).join(', ') || '—'}
                        {row.parents_linked === 0 && ` · ${t('fees.noParent')}`}
                      </div>
                    </td>
                    <td>{row.label}</td>
                    <td className="fees-amount">{money(row.amount_due)}</td>
                    <td className="fees-amount">{money(row.amount_paid)}</td>
                    <td className="fees-amount"><strong>{money(row.remaining)}</strong></td>
                    <td>
                      <div>{formatDay(row.due_date, locale)}</div>
                      {statusBadge(row)}
                    </td>
                    <td className="table-cell-muted">
                      {row.reminder_count > 0
                        ? t('fees.remindedOn', { count: row.reminder_count, date: formatDay(row.last_reminded_at, locale) })
                        : '—'}
                    </td>
                    <td>
                      <div className="table-actions">
                        {row.remaining > 0 && (
                          <button type="button" className="btn btn-primary btn-compact" onClick={() => setPaying(row)}>
                            {t('fees.collect')}
                          </button>
                        )}
                        {row.remaining > 0 && row.parents_linked > 0 && (
                          <button
                            type="button"
                            className="btn btn-secondary btn-compact"
                            aria-label={t('fees.remind')}
                            title={t('fees.remind')}
                            disabled={remindMutation.isPending}
                            onClick={() => remindMutation.mutate({ invoice_ids: [row.id] })}
                          >
                            <BellRing size={14} />
                          </button>
                        )}
                        {row.payments.length > 0 && (
                          <button type="button" className="btn btn-secondary btn-compact" aria-label={t('fees.receipts')} title={t('fees.receipts')} onClick={() => setHistory(row)}>
                            <Receipt size={14} />
                          </button>
                        )}
                        {row.payments.length === 0 && (
                          <button
                            type="button"
                            className="btn btn-danger btn-compact"
                            aria-label={t('common.delete')}
                            title={t('common.delete')}
                            disabled={deleteMutation.isPending}
                            onClick={() => window.confirm(t('fees.deleteConfirm', { label: row.label, name: row.student_name })) && deleteMutation.mutate(row.id)}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {rows.length > 0 && filtered.length === 0 && <p className="dashboard-section-copy">{t('fees.noMatch')}</p>}
      </div>

      {ledger.by_class.length > 1 && (
        <div className="glass-card dashboard-card-pad">
          <h3 className="monthly-subtitle">{t('fees.byClass')}</h3>
          <div className="premium-table-wrapper">
            <table className="premium-table">
              <thead>
                <tr>
                  <th scope="col">{t('codes.class')}</th>
                  <th scope="col">{t('fees.billed')}</th>
                  <th scope="col">{t('fees.collected')}</th>
                  <th scope="col">{t('fees.outstanding')}</th>
                </tr>
              </thead>
              <tbody>
                {ledger.by_class.map((entry) => (
                  <tr key={entry.class_id ?? 'none'}>
                    <td>{entry.class_name ?? t('fees.noClass')}</td>
                    <td>{money(entry.billed)}</td>
                    <td>{money(entry.collected)}</td>
                    <td>{money(entry.outstanding)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {creating && (
        <NewFeesModal
          onClose={() => setCreating(false)}
          onDone={(message) => {
            setCreating(false);
            setNotice(message);
            void refresh();
          }}
        />
      )}
      {paying && (
        <PaymentModal
          row={paying}
          onClose={() => setPaying(null)}
          onPaid={(payment) => {
            const row = paying;
            setPaying(null);
            void refresh();
            setReceipt({
              row: { ...row, amount_paid: row.amount_paid + payment.amount, payments: [...row.payments, payment] },
              payment,
            });
          }}
        />
      )}
      {history && (
        <PaymentsModal
          row={history}
          onClose={() => setHistory(null)}
          onShowReceipt={(payment) => setReceipt({ row: history, payment })}
          onCancelled={(message) => {
            setHistory(null);
            setNotice(message);
            void refresh();
          }}
        />
      )}
      {receipt && (
        <ReceiptModal
          schoolName={ledger.school_name}
          studentName={receipt.row.student_name}
          invoice={receipt.row}
          payment={receipt.payment}
          onClose={() => setReceipt(null)}
        />
      )}
    </section>
  );
}

function NewFeesModal({ onClose, onDone }: { onClose: () => void; onDone: (message: string) => void }) {
  const { t } = useLocale();
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [classId, setClassId] = useState('');
  const [error, setError] = useState('');
  const classesQuery = useQuery<Array<{ id: string; name: string }>>({
    queryKey: ['director-classes'],
    queryFn: async () => (await api.get('/classes/')).data,
  });
  const createMutation = useMutation({
    mutationFn: async () =>
      (await api.post('/finance/invoices/bulk', {
        label,
        amount_due: Number(amount),
        due_date: dueDate || null,
        class_id: classId || null,
      })).data as { created: number; skipped: number },
    onSuccess: (result) => onDone(t('fees.created', { created: result.created, skipped: result.skipped })),
    onError: (err) => setError(errorMessage(err, t('common.errorGeneric'))),
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (!(Number(amount) > 0)) {
      setError(t('fees.amountInvalid'));
      return;
    }
    createMutation.mutate();
  };

  return (
    <Modal title={t('fees.new')} onClose={onClose}>
      <form className="fees-form" onSubmit={submit}>
        <div className="form-group">
          <label className="form-label" htmlFor="fee-label">{t('fees.label')}</label>
          <input id="fee-label" className="form-input" required minLength={2} maxLength={255} value={label}
            placeholder={t('fees.labelHint')} onChange={(e) => setLabel(e.target.value)} />
        </div>
        <div className="announcement-date-row">
          <div className="form-group">
            <label className="form-label" htmlFor="fee-amount">{t('fees.amount')}</label>
            <input id="fee-amount" className="form-input" type="number" min="1" step="0.01" inputMode="decimal" required
              value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="fee-due">{t('fees.dueDate')}</label>
            <input id="fee-due" className="form-input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="fee-class">{t('fees.who')}</label>
          <select id="fee-class" className="form-input" value={classId} onChange={(e) => setClassId(e.target.value)}>
            <option value="">{t('fees.wholeSchool')}</option>
            {(classesQuery.data ?? []).map((cls) => <option key={cls.id} value={cls.id}>{cls.name}</option>)}
          </select>
          <p className="report-card-muted">{t('fees.noDuplicates')}</p>
        </div>
        {error && <p className="dashboard-section-copy" role="alert">{error}</p>}
        <div className="table-actions">
          <button type="submit" className="btn btn-primary btn-compact" disabled={createMutation.isPending}>
            {createMutation.isPending ? <Loader2 size={14} className="spin-icon" /> : <Plus size={14} />} {t('fees.create')}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function PaymentModal({ row, onClose, onPaid }: { row: LedgerRow; onClose: () => void; onPaid: (payment: FeePayment) => void }) {
  const { t, locale } = useLocale();
  const [amount, setAmount] = useState(String(row.remaining));
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const payMutation = useMutation({
    mutationFn: async () =>
      (await api.post(`/finance/invoices/${row.id}/payments`, {
        amount: Number(amount),
        payment_method: method,
        notes: notes.trim() || null,
      })).data as FeePayment,
    onSuccess: onPaid,
    onError: (err) => setError(errorMessage(err, t('common.errorGeneric'))),
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError('');
    const value = Number(amount);
    if (!(value > 0) || value > row.remaining) {
      setError(t('fees.amountTooHigh', { left: formatDA(row.remaining, locale) }));
      return;
    }
    payMutation.mutate();
  };

  return (
    <Modal title={t('fees.collectTitle', { name: row.student_name })} onClose={onClose}>
      <form className="fees-form" onSubmit={submit}>
        <p className="dashboard-section-copy">
          {row.label} — {t('fees.leftToPay', { amount: formatDA(row.remaining, locale) })}
        </p>
        <div className="announcement-date-row">
          <div className="form-group">
            <label className="form-label" htmlFor="pay-amount">{t('fees.amount')}</label>
            <input id="pay-amount" className="form-input" type="number" min="1" step="0.01" max={row.remaining} inputMode="decimal"
              required value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="pay-method">{t('fees.method')}</label>
            <select id="pay-method" className="form-input" value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
              {PAYMENT_METHODS.map((value) => <option key={value} value={value}>{t(`fees.method.${value}`)}</option>)}
            </select>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="pay-notes">{t('fees.note')}</label>
          <input id="pay-notes" className="form-input" maxLength={500} placeholder={t('fees.noteHint')} value={notes}
            onChange={(e) => setNotes(e.target.value)} />
        </div>
        {error && <p className="dashboard-section-copy" role="alert">{error}</p>}
        <div className="table-actions">
          <button type="submit" className="btn btn-primary btn-compact" disabled={payMutation.isPending}>
            {payMutation.isPending ? <Loader2 size={14} className="spin-icon" /> : <Receipt size={14} />} {t('fees.saveAndReceipt')}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function PaymentsModal({ row, onClose, onShowReceipt, onCancelled }: {
  row: LedgerRow;
  onClose: () => void;
  onShowReceipt: (payment: FeePayment) => void;
  onCancelled: (message: string) => void;
}) {
  const { t, locale } = useLocale();
  const [error, setError] = useState('');
  const cancelMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => api.post(`/finance/payments/${id}/cancel`, { reason }),
    onSuccess: () => onCancelled(t('fees.paymentCancelled')),
    onError: (err) => setError(errorMessage(err, t('common.errorGeneric'))),
  });
  const cancel = (payment: FeePayment) => {
    const reason = window.prompt(t('fees.cancelReason', { number: payment.receipt_number }));
    if (reason && reason.trim().length >= 3) cancelMutation.mutate({ id: payment.id, reason: reason.trim() });
  };

  return (
    <Modal title={t('fees.paymentsTitle', { label: row.label, name: row.student_name })} onClose={onClose}>
      <ul className="fees-payments">
        {row.payments.map((payment) => (
          <li key={payment.id}>
            <div>
              <strong>{formatDA(payment.amount, locale)}</strong>
              <span className="table-cell-muted">
                {formatDay(payment.paid_at, locale)} · {t(`fees.method.${payment.payment_method}`)} · {payment.receipt_number}
              </span>
            </div>
            <div className="table-actions">
              <button type="button" className="btn btn-secondary btn-compact" onClick={() => onShowReceipt(payment)}>
                <Receipt size={14} /> {t('fees.receipt')}
              </button>
              <button type="button" className="btn btn-danger btn-compact" disabled={cancelMutation.isPending} onClick={() => cancel(payment)}>
                {t('fees.cancelPayment')}
              </button>
            </div>
          </li>
        ))}
      </ul>
      {error && <p className="dashboard-section-copy" role="alert">{error}</p>}
    </Modal>
  );
}
