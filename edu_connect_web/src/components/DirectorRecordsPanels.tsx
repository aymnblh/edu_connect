import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, History, UserRound, X } from 'lucide-react';
import { api } from '../lib/api';
import { useLocale } from '../lib/i18n';
import HealthRecordForm, { type HealthRecord } from './HealthRecordForm';

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const { t } = useLocale();
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => closeRef.current?.focus(), []);
  return createPortal(
    <div className="workspace-modal-backdrop" onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <div className="workspace-modal record-modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="dashboard-toolbar">
          <h2 className="dashboard-section-title dashboard-section-title--plain">{title}</h2>
          <button ref={closeRef} type="button" className="btn btn-secondary btn-compact" onClick={onClose} aria-label={t('common.close')}>
            <X size={14} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

const dateTime = (iso?: string | null) => (iso ? new Date(iso).toLocaleString() : '—');
const date = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString() : '—');

/* ── Student file ─────────────────────────────────────────────────────── */

interface StudentFile {
  student: { id: string; full_name: string; student_number?: string | null; archived_at?: string | null; created_at: string };
  classes: Array<{ id: string; name: string }>;
  parents: Array<{ id: string; full_name: string; email: string; phone?: string | null }>;
  term: { id: string; name: string } | null;
  averages: { by_class: Array<{ class_name: string; average: number }>; by_subject: Array<{ subject: string; average: number }> };
  attendance: { absences: number; justified_absences: number; lates: number; records: number };
  remarks: Array<{ date: string; title: string; content: string; type: string }>;
  report_cards: Array<{ id: string; semester_name?: string | null; overall_average?: number | null; rank?: number | null; class_size: number; published_at: string }>;
  health: HealthRecord;
}

export function StudentFileModal({ studentId, onClose }: { studentId: string; onClose: () => void }) {
  const { t } = useLocale();
  const fileQuery = useQuery<StudentFile>({
    queryKey: ['student-file', studentId],
    queryFn: async () => (await api.get(`/admin/students/${studentId}/file`)).data,
  });
  const file = fileQuery.data;

  return (
    <Modal title={file ? file.student.full_name : t('records.studentFile')} onClose={onClose}>
      {fileQuery.isLoading && <p className="dashboard-section-copy">{t('common.loading')}</p>}
      {file && (
        <div className="record-sections">
          <section>
            <h3><UserRound size={16} /> {t('records.identity')}</h3>
            <p>{t('records.studentNumber')}: <strong>{file.student.student_number ?? '—'}</strong>
              {' · '}{t('records.classes')}: <strong>{file.classes.map((c) => c.name).join(', ') || '—'}</strong>
              {file.student.archived_at && <span className="badge badge-compact badge-warning"> {t('records.archived')}</span>}
            </p>
            <h4>{t('records.parents')}</h4>
            {file.parents.length === 0 && <p className="report-card-muted">{t('director.parents.empty')}</p>}
            <ul className="record-list">
              {file.parents.map((p) => (
                <li key={p.id}>{p.full_name} · {p.email}{p.phone ? ` · ${p.phone}` : ''}</li>
              ))}
            </ul>
          </section>

          <section>
            <h3>{t('records.results', { term: file.term?.name ?? t('records.allTime') })}</h3>
            <div className="insights-kpis">
              {file.averages.by_class.map((row) => (
                <div key={row.class_name} className="insights-kpi">
                  <strong>{row.average.toFixed(2)}</strong>
                  <span>{t('records.averageIn', { name: row.class_name })}</span>
                </div>
              ))}
              <div className="insights-kpi">
                <strong>{file.attendance.absences}</strong>
                <span>{t('records.absences', { justified: file.attendance.justified_absences, lates: file.attendance.lates })}</span>
              </div>
            </div>
            {file.averages.by_subject.length > 0 && (
              <table className="report-card-table">
                <thead><tr><th>{t('reportCards.subject')}</th><th>{t('reportCards.average')}</th></tr></thead>
                <tbody>
                  {file.averages.by_subject.map((row) => (
                    <tr key={row.subject}><td>{row.subject}</td><td>{row.average.toFixed(2)}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section>
            <h3>{t('records.remarks')}</h3>
            {file.remarks.length === 0 && <p className="report-card-muted">{t('records.none')}</p>}
            <ul className="record-list">
              {file.remarks.map((r, i) => (
                <li key={i}><strong>{r.title}</strong> · {date(r.date)} — {r.content}</li>
              ))}
            </ul>
            <h3>{t('reportCards.tab')}</h3>
            {file.report_cards.length === 0 && <p className="report-card-muted">{t('records.none')}</p>}
            <ul className="record-list">
              {file.report_cards.map((card) => (
                <li key={card.id}>
                  {card.semester_name} · {card.overall_average?.toFixed(2) ?? '—'} / 20
                  {card.rank ? ` · ${t('reportCards.rankOf', { rank: card.rank, size: card.class_size })}` : ''}
                </li>
              ))}
            </ul>
          </section>

          <section className="record-health">
            <HealthRecordForm studentId={studentId} mode="school" initial={file.health} />
          </section>
        </div>
      )}
    </Modal>
  );
}

/* ── Teacher history ──────────────────────────────────────────────────── */

interface TeacherHistory {
  teacher: { id: string; full_name: string; email: string; deactivated_at?: string | null; last_sign_in?: string | null };
  days: number;
  assignments: Array<{ class_name: string; subject: string }>;
  stats: Record<string, number>;
  recent_activity: Array<{ action: string; created_at: string; resource_type?: string | null }>;
}

const STAT_KEYS = ['grades_entered', 'grades_pending_approval', 'attendance_records', 'homework_posted',
  'lessons_logged', 'corrections', 'failed_sign_ins'];

export function TeacherHistoryModal({ teacherId, onClose }: { teacherId: string; onClose: () => void }) {
  const { t } = useLocale();
  const historyQuery = useQuery<TeacherHistory>({
    queryKey: ['teacher-history', teacherId],
    queryFn: async () => (await api.get(`/admin/teachers/${teacherId}/history`, { params: { days: 30 } })).data,
  });
  const data = historyQuery.data;
  const actionLabel = (action: string) => {
    const label = t(`audit.action.${action}`);
    return label === `audit.action.${action}` ? action : label;
  };

  return (
    <Modal title={data ? data.teacher.full_name : t('records.teacherHistory')} onClose={onClose}>
      {historyQuery.isLoading && <p className="dashboard-section-copy">{t('common.loading')}</p>}
      {data && (
        <div className="record-sections">
          <p className="dashboard-section-copy">
            {data.teacher.email} · {t('records.lastSignIn', { date: dateTime(data.teacher.last_sign_in) })}
            {data.teacher.deactivated_at && <span className="badge badge-compact badge-danger"> {t('director.team.deactivated')}</span>}
          </p>
          <section>
            <h3>{t('records.assignments')}</h3>
            {data.assignments.length === 0 && <p className="report-card-muted">{t('records.none')}</p>}
            <ul className="record-list">
              {data.assignments.map((a, i) => <li key={i}>{a.class_name} — {a.subject}</li>)}
            </ul>
          </section>
          <section>
            <h3><History size={16} /> {t('records.lastDays', { days: data.days })}</h3>
            <div className="insights-kpis">
              {STAT_KEYS.map((key) => (
                <div key={key} className="insights-kpi">
                  {key === 'failed_sign_ins' && data.stats[key] > 0 && <AlertTriangle size={16} aria-hidden />}
                  <strong>{data.stats[key] ?? 0}</strong>
                  <span>{t(`records.stat.${key}`)}</span>
                </div>
              ))}
            </div>
            <p className="report-card-muted">{t('records.historyNote')}</p>
          </section>
          <section>
            <h3>{t('records.recentActivity')}</h3>
            {data.recent_activity.length === 0 && <p className="report-card-muted">{t('records.none')}</p>}
            <ul className="record-list">
              {data.recent_activity.map((event, i) => (
                <li key={i}>{dateTime(event.created_at)} — {actionLabel(event.action)}</li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </Modal>
  );
}

/* ── Teacher: health alerts for a class ───────────────────────────────── */

export function ClassHealthAlerts({ classId }: { classId: string }) {
  const { t } = useLocale();
  const alertsQuery = useQuery<Array<{ student_id: string; student_name: string; alert: string }>>({
    queryKey: ['health-alerts', classId],
    queryFn: async () => (await api.get(`/classes/${classId}/health-alerts`)).data,
  });
  const alerts = alertsQuery.data ?? [];
  if (alerts.length === 0) return null;
  return (
    <div className="health-alerts" role="note">
      <strong><AlertTriangle size={16} aria-hidden /> {t('health.classAlerts')}</strong>
      <ul className="record-list">
        {alerts.map((a) => <li key={a.student_id}><strong>{a.student_name}</strong> — {a.alert}</li>)}
      </ul>
    </div>
  );
}
