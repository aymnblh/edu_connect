import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { FileCheck2, FileX2, Loader2 } from 'lucide-react';
import { api } from '../lib/api';
import { useLocale } from '../lib/i18n';
import ReportCardView, { type ReportCardData } from './ReportCardView';

interface Semester {
  id: string;
  name: string;
  is_active: boolean;
}

interface PublishedSummary {
  id: string;
  student_id: string;
  published_at: string;
}

type ReportCardsAdminPanelProps = {
  classes: Array<{ id: string; name: string }>;
};

function errorMessage(error: unknown, fallback: string) {
  if (isAxiosError(error) && typeof error.response?.data?.detail === 'string') return error.response.data.detail;
  return fallback;
}

export default function ReportCardsAdminPanel({ classes }: ReportCardsAdminPanelProps) {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const [classId, setClassId] = useState('');
  const [semesterId, setSemesterId] = useState('');
  const [openStudentId, setOpenStudentId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');

  const semestersQuery = useQuery<Semester[]>({
    queryKey: ['report-card-semesters'],
    queryFn: async () => (await api.get('/admin/semesters')).data,
  });
  const semesters = useMemo(() => semestersQuery.data ?? [], [semestersQuery.data]);
  const selectedClassId = classId || classes[0]?.id || '';
  const selectedSemesterId = semesterId || semesters.find((s) => s.is_active)?.id || semesters[0]?.id || '';
  const ready = Boolean(selectedClassId && selectedSemesterId);
  const params = { class_id: selectedClassId, semester_id: selectedSemesterId };

  const previewQuery = useQuery<ReportCardData[]>({
    queryKey: ['report-card-preview', selectedClassId, selectedSemesterId],
    enabled: ready,
    queryFn: async () => (await api.get('/report-cards/preview', { params })).data,
  });
  const publishedQuery = useQuery<PublishedSummary[]>({
    queryKey: ['report-card-published', selectedClassId, selectedSemesterId],
    enabled: ready,
    queryFn: async () => (await api.get('/report-cards/', { params })).data,
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['report-card-published', selectedClassId, selectedSemesterId] });
  };

  const publishMutation = useMutation({
    mutationFn: async () =>
      (await api.post<{ published: number; parents_notified: number }>('/report-cards/publish', params)).data,
    onSuccess: (result) => {
      setNotice(t('reportCards.publishedNotice', { count: result.published, parents: result.parents_notified }));
      refresh();
    },
    onError: (error) => setNotice(errorMessage(error, t('common.errorGeneric'))),
  });
  const unpublishMutation = useMutation({
    mutationFn: async () => (await api.post('/report-cards/unpublish', params)).data,
    onSuccess: () => {
      setNotice(t('reportCards.unpublishedNotice'));
      refresh();
    },
    onError: (error) => setNotice(errorMessage(error, t('common.errorGeneric'))),
  });

  const cards = previewQuery.data ?? [];
  const published = publishedQuery.data ?? [];
  const publishedAt = published[0]?.published_at;
  const openCard = cards.find((card) => card.student_id === openStudentId);

  return (
    <section className="glass-card dashboard-card-pad">
      <h2 className="dashboard-section-title dashboard-section-title--plain">{t('reportCards.adminTitle')}</h2>
      <p className="dashboard-section-copy">{t('reportCards.adminCopy')}</p>

      <div className="announcement-date-row">
        <div className="form-group">
          <label className="form-label" htmlFor="report-class">{t('reportCards.class')}</label>
          <select
            id="report-class"
            className="form-input"
            value={selectedClassId}
            onChange={(event) => {
              setClassId(event.target.value);
              setOpenStudentId(null);
              setNotice('');
            }}
          >
            {classes.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="report-term">{t('reportCards.term')}</label>
          <select
            id="report-term"
            className="form-input"
            value={selectedSemesterId}
            onChange={(event) => {
              setSemesterId(event.target.value);
              setOpenStudentId(null);
              setNotice('');
            }}
          >
            {semesters.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
        </div>
      </div>

      {ready && (
        <div className="table-actions">
          <span className={`badge badge-compact ${published.length ? 'badge-success' : 'badge-warning'}`}>
            {published.length
              ? t('reportCards.statusPublished', { date: new Date(publishedAt).toLocaleDateString() })
              : t('reportCards.statusDraft')}
          </span>
          <button
            type="button"
            className="btn btn-primary btn-compact"
            disabled={publishMutation.isPending || cards.length === 0}
            onClick={() => {
              const key = published.length ? 'reportCards.republishConfirm' : 'reportCards.publishConfirm';
              if (window.confirm(t(key, { count: cards.length }))) publishMutation.mutate();
            }}
          >
            {publishMutation.isPending ? <Loader2 size={14} className="spin-icon" /> : <FileCheck2 size={14} />}
            {published.length ? t('reportCards.republish') : t('reportCards.publish')}
          </button>
          {published.length > 0 && (
            <button
              type="button"
              className="btn btn-danger btn-compact"
              disabled={unpublishMutation.isPending}
              onClick={() => {
                if (window.confirm(t('reportCards.unpublishConfirm'))) unpublishMutation.mutate();
              }}
            >
              <FileX2 size={14} /> {t('reportCards.unpublish')}
            </button>
          )}
        </div>
      )}
      {notice && <p className="dashboard-section-copy" role="status">{notice}</p>}

      {previewQuery.isLoading && <p className="dashboard-section-copy">{t('common.loading')}</p>}
      {ready && !previewQuery.isLoading && cards.length === 0 && (
        <p className="dashboard-section-copy">{t('reportCards.noStudents')}</p>
      )}
      {cards.length > 0 && (
        <div className="premium-table-wrapper">
          <table className="premium-table">
            <thead>
              <tr>
                <th>{t('reportCards.student')}</th>
                <th>{t('reportCards.overall')}</th>
                <th>{t('reportCards.rank')}</th>
                <th>{t('reportCards.absencesShort')}</th>
              </tr>
            </thead>
            <tbody>
              {cards.map((card) => (
                <tr
                  key={card.student_id}
                  className="clickable-row"
                  onClick={() => setOpenStudentId(openStudentId === card.student_id ? null : card.student_id)}
                >
                  <td>{card.student_name}</td>
                  <td>{card.overall_average === null ? '—' : card.overall_average.toFixed(2)}</td>
                  <td>{card.rank ? t('reportCards.rankOf', { rank: card.rank, size: card.class_size }) : '—'}</td>
                  <td>{card.attendance.absences}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {openCard && <ReportCardView data={openCard} draft />}
    </section>
  );
}
