import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, Copy, Gift } from 'lucide-react';
import { api } from '../lib/api';
import { useLocale } from '../lib/i18n';

interface Referral {
  code: string;
  reward_months: number;
  schools: Array<{ name: string; active: boolean; rewarded: boolean }>;
}

/** "Recommend Wasel Edu to another school": the code, a link to share, and who joined. */
export default function ReferralCard() {
  const { t } = useLocale();
  const [copied, setCopied] = useState(false);
  const referral = useQuery<Referral>({
    queryKey: ['referral'],
    queryFn: async () => (await api.get('/admin/referral')).data,
  }).data;
  if (!referral) return null;
  const link = `${window.location.origin}/register-school?ref=${referral.code}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt(t('referral.copyPrompt'), link);
    }
  };

  return (
    <section className="glass-card dashboard-card-pad referral-card" aria-labelledby="referral-title">
      <h3 id="referral-title" className="dashboard-section-title dashboard-section-title--plain">
        <Gift size={18} /> {t('referral.title', { months: referral.reward_months })}
      </h3>
      <p className="dashboard-section-copy">{t('referral.copy', { months: referral.reward_months })}</p>
      <div className="referral-code-row">
        <span className="token-inline referral-code">{referral.code}</span>
        <button type="button" className="btn btn-secondary btn-compact" onClick={() => void copy()}>
          {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? t('referral.copied') : t('referral.copyLink')}
        </button>
      </div>
      {referral.schools.length > 0 && (
        <ul className="referral-schools">
          {referral.schools.map((school) => (
            <li key={school.name}>
              <strong>{school.name}</strong>{' '}
              <span className="table-cell-muted">
                {school.rewarded
                  ? t('referral.rewarded', { months: referral.reward_months })
                  : school.active
                    ? t('referral.active')
                    : t('referral.pending')}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
