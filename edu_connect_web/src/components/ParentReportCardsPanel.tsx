import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText } from 'lucide-react';
import { api } from '../lib/api';
import { useLocale } from '../lib/i18n';
import ReportCardView, { type ReportCardData } from './ReportCardView';

interface ReportCardSummary {
  id: string;
  semester_name: string | null;
  class_name: string | null;
  overall_average: number | null;
  rank: number | null;
  class_size: number;
  published_at: string;
}

interface ReportCardDetail extends ReportCardSummary {
  data: ReportCardData;
}

export default function ParentReportCardsPanel({ studentId }: { studentId: string }) {
  const { t } = useLocale();
  const [openId, setOpenId] = useState<string | null>(null);

  const listQuery = useQuery<ReportCardSummary[]>({
    queryKey: ['parent', 'report-cards', studentId],
    queryFn: async () => (await api.get('/report-cards/', { params: { student_id: studentId } })).data,
  });
  const detailQuery = useQuery<ReportCardDetail>({
    queryKey: ['parent', 'report-card', openId],
    enabled: Boolean(openId),
    queryFn: async () => (await api.get(`/report-cards/${openId}`)).data,
  });
  const cards = listQuery.data ?? [];

  return (
    <div className="animate-fade-in" role="tabpanel">
      {listQuery.isLoading && <p className="empty-list-copy">{t('common.loading')}</p>}
      {!listQuery.isLoading && cards.length === 0 && <p className="empty-list-copy">{t('reportCards.parentEmpty')}</p>}
      <div className="announcement-list">
        {cards.map((card) => (
          <button
            key={card.id}
            type="button"
            className={`announcement-item announcement-item-header ${openId === card.id ? 'announcement-item--unread' : ''}`}
            aria-expanded={openId === card.id}
            onClick={() => setOpenId(openId === card.id ? null : card.id)}
          >
            <FileText size={16} />
            <strong>{card.semester_name}</strong>
            <span className="dashboard-section-copy">
              {card.overall_average === null ? '—' : `${card.overall_average.toFixed(2)} / 20`}
              {card.rank ? ` · ${t('reportCards.rankOf', { rank: card.rank, size: card.class_size })}` : ''}
            </span>
          </button>
        ))}
      </div>
      {openId && detailQuery.isLoading && <p className="empty-list-copy">{t('common.loading')}</p>}
      {openId && detailQuery.data && (
        <ReportCardView data={detailQuery.data.data} publishedAt={detailQuery.data.published_at} />
      )}
    </div>
  );
}
