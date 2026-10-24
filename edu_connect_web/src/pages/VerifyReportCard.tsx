import { useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { Award, CheckCircle2, ShieldAlert } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import LocaleSwitcher from '../components/LocaleSwitcher';
import { api } from '../lib/api';
import { useLocale } from '../lib/i18n';

interface VerifiedCard {
  school_name: string | null;
  student_name: string | null;
  class_name: string | null;
  semester_name: string | null;
  overall_average: number | null;
  rank: number | null;
  class_size: number;
  mention: string | null;
  published_at: string;
}

/** Public page behind the QR code printed on a report card. */
export default function VerifyReportCard() {
  const { code = '' } = useParams();
  const { t } = useLocale();
  const cardQuery = useQuery<VerifiedCard>({
    queryKey: ['verify-report-card', code],
    queryFn: async () => (await api.get(`/public/report-cards/${encodeURIComponent(code)}`, { _skipAuthRefresh: true } as never)).data,
    retry: false,
  });
  const card = cardQuery.data;
  const notFound = cardQuery.isError && isAxiosError(cardQuery.error) && cardQuery.error.response?.status === 404;

  return (
    <main className="verify-page">
      <div className="glass-card verify-card">
        <div className="login-card-actions"><LocaleSwitcher /></div>
        <img className="verify-brand" src="/wasel-edu-logo.svg" alt="Wasel Edu" />
        {cardQuery.isLoading && <p>{t('common.loading')}</p>}
        {card && (
          <>
            <h1 className="verify-title verify-title--ok"><CheckCircle2 size={22} /> {t('verify.genuine')}</h1>
            <p className="dashboard-section-copy">{t('verify.copy')}</p>
            <dl className="verify-facts">
              <div><dt>{t('verify.school')}</dt><dd>{card.school_name}</dd></div>
              <div><dt>{t('fees.student')}</dt><dd>{card.student_name}</dd></div>
              <div><dt>{t('codes.class')}</dt><dd>{card.class_name}</dd></div>
              <div><dt>{t('verify.term')}</dt><dd>{card.semester_name}</dd></div>
              <div><dt>{t('reportCards.overall')}</dt><dd>{card.overall_average === null ? '—' : `${card.overall_average.toFixed(2)} / 20`}</dd></div>
              <div><dt>{t('reportCards.rank')}</dt><dd>{card.rank ? t('reportCards.rankOf', { rank: card.rank, size: card.class_size }) : '—'}</dd></div>
              {card.mention && (
                <div><dt>{t('verify.mention')}</dt><dd><Award size={14} /> {t(`reportCards.mention.${card.mention}`)}</dd></div>
              )}
              <div><dt>{t('verify.published')}</dt><dd>{new Date(card.published_at).toLocaleDateString()}</dd></div>
            </dl>
            <p className="report-card-muted">{t('verify.compare')}</p>
          </>
        )}
        {cardQuery.isError && (
          <>
            <h1 className="verify-title verify-title--bad"><ShieldAlert size={22} /> {notFound ? t('verify.notFound') : t('common.errorGeneric')}</h1>
            {notFound && <p className="dashboard-section-copy">{t('verify.notFoundCopy')}</p>}
          </>
        )}
        <Link to="/login" className="link-hover-primary">{t('verify.home')}</Link>
      </div>
    </main>
  );
}
