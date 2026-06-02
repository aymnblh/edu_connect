import { useState, useCallback, useEffect, useRef } from 'react';
import { isAxiosError } from 'axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useLocale, type Locale } from '../lib/i18n';
import { Building, Calendar, DollarSign, PlusCircle } from 'lucide-react';

interface School {
  id: string;
  name: string;
  is_active: boolean;
  subscription_expires_at: string | null;
}

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'warning';
  exiting?: boolean;
}

let toastId = 0;

function localeToIntl(locale: Locale) {
  if (locale === 'ar') return 'ar-DZ';
  if (locale === 'en') return 'en-US';
  return 'fr-DZ';
}

function formatDate(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(localeToIntl(locale), {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

export default function SuperAdminDashboard() {
  const queryClient = useQueryClient();
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [amount, setAmount] = useState('');
  const [months, setMonths] = useState('12');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const paymentModalRef = useRef<HTMLDivElement>(null);
  const { locale, t } = useLocale();

  const addToast = useCallback((message: string, type: Toast['type']) => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 300);
    }, 3500);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 300);
  }, []);

  useEffect(() => {
    if (!selectedSchool) return;
    const firstFocusable = paymentModalRef.current?.querySelector<HTMLElement>(
      'button, input, select, textarea, [href], [tabindex]:not([tabindex="-1"])'
    );
    firstFocusable?.focus();
  }, [selectedSchool]);

  const handlePaymentModalKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      setSelectedSchool(null);
      return;
    }

    if (event.key !== 'Tab' || !paymentModalRef.current) {
      return;
    }

    const focusable = Array.from(
      paymentModalRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
      )
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) return;

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const { data: schools, isLoading, error } = useQuery<School[]>({
    queryKey: ['schools'],
    queryFn: async () => {
      const res = await api.get('/system/schools');
      return res.data;
    }
  });

  const paymentMutation = useMutation({
    mutationFn: async (data: { school_id: string; amount: number; months_added: number }) => {
      return api.post(`/system/schools/${data.school_id}/subscription`, {
        amount: data.amount,
        months_added: data.months_added,
        payment_method: 'cash'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schools'] });
      setSelectedSchool(null);
      setAmount('');
      setMonths('12');
      addToast(t('superadmin.toastPaymentSuccess'), 'success');
    },
    onError: (err: unknown) => {
      const message = isAxiosError(err)
        ? err.response?.data?.detail || err.message
        : t('auth.connectionError');
      addToast(t('superadmin.toastPaymentError', { message }), 'error');
    }
  });

  if (isLoading) {
    return (
      <div className="loading-spinner screen-min-height">
        <div className="spinner" />
        <p>{t('superadmin.loading')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-state screen-min-height">
        <h3>{t('superadmin.loadError')}</h3>
      </div>
    );
  }

  return (
    <div className="container animate-fade-in">
      {/* Toast container */}
      {toasts.length > 0 && (
        <div className="toast-container" aria-live="polite">
          {toasts.map(toast => (
            <div
              key={toast.id}
              className={`toast toast-${toast.type} ${toast.exiting ? 'toast-exit' : ''}`}
              onClick={() => dismissToast(toast.id)}
              role="alert"
            >
              {toast.message}
            </div>
          ))}
        </div>
      )}

      <header className="dashboard-header">
        <h1>{t('superadmin.title')}</h1>
        <p>{t('superadmin.subtitle')}</p>
      </header>

      <div className="grid-2">
        {schools?.map(school => {
          const isExpired = !school.subscription_expires_at || new Date(school.subscription_expires_at) < new Date();
          
          return (
            <div key={school.id} className="school-card">
              <div className="school-card-header">
                <div>
                  <h3 className="school-card-title">
                    <Building size={20} color="var(--primary)" /> {school.name}
                  </h3>
                  <span className="school-card-id">{t('superadmin.schoolId', { id: school.id })}</span>
                </div>
                <span className={`badge ${isExpired ? 'badge-danger' : 'badge-success'}`}>
                  {isExpired ? t('superadmin.statusExpired') : t('superadmin.statusActive')}
                </span>
              </div>

              <div className="school-expiration">
                <Calendar size={16} />
                <span>
                  {t('superadmin.expiration', {
                    date: school.subscription_expires_at
                      ? formatDate(school.subscription_expires_at, locale)
                      : t('superadmin.never'),
                  })}
                </span>
              </div>

              <button 
                className="btn btn-primary btn-full" 
                onClick={() => setSelectedSchool(school)}
                aria-label={t('superadmin.addPaymentFor', { school: school.name })}
              >
                <DollarSign size={18} /> {t('superadmin.addPayment')}
              </button>
            </div>
          );
        })}
      </div>

      {/* Payment Modal */}
      {selectedSchool && (
        <div
          className="workspace-modal-backdrop"
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedSchool(null); }}
        >
          <div
            ref={paymentModalRef}
            className="workspace-modal payment-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-modal-title"
            onKeyDown={handlePaymentModalKeyDown}
          >
            <h2 id="payment-modal-title" className="payment-modal-title">{t('superadmin.paymentTitle')}</h2>
            <p className="payment-school-copy">
              {t('superadmin.schoolLabel')} <strong className="payment-school-name">{selectedSchool.name}</strong>
            </p>

            <form onSubmit={(e) => {
              e.preventDefault();
              if (!amount) return;
              paymentMutation.mutate({ 
                school_id: selectedSchool.id, 
                amount: parseFloat(amount), 
                months_added: parseInt(months) 
              });
            }}>
              <div className="form-group">
                <label className="form-label" htmlFor="payment-amount">{t('superadmin.amountLabel')}</label>
                <input 
                  id="payment-amount"
                  type="number" 
                  className="input-field" 
                  value={amount} 
                  onChange={e => setAmount(e.target.value)} 
                  placeholder={t('superadmin.amountPlaceholder')}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="payment-months">{t('superadmin.monthsLabel')}</label>
                <input 
                  id="payment-months"
                  type="number" 
                  className="input-field" 
                  value={months} 
                  onChange={e => setMonths(e.target.value)} 
                  required
                />
              </div>

              <div className="payment-actions">
                <button type="button" className="btn btn-outline" onClick={() => setSelectedSchool(null)} aria-label={t('superadmin.cancelPaymentAria')}>{t('superadmin.cancelPayment')}</button>
                <button 
                  type="submit"
                  className="btn btn-primary"
                  disabled={paymentMutation.isPending || !amount}
                  aria-label={t('superadmin.validatePaymentAria')}
                  aria-busy={paymentMutation.isPending}
                >
                  <PlusCircle size={18} /> {t('superadmin.validatePayment')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
