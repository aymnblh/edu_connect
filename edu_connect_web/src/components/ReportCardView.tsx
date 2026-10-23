import { Award, Printer } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useSchoolBranding } from '../lib/branding';
import { useLocale } from '../lib/i18n';

export interface ReportCardSubject {
  key: string;
  subject: string;
  coefficient: number;
  average: number | null;
  grades_count: number;
  class_average: number | null;
}

export interface ReportCardData {
  school_name?: string | null;
  class_name?: string | null;
  semester_name?: string | null;
  period_start?: string | null;
  period_end?: string | null;
  student_id: string;
  student_name: string;
  student_number?: string | null;
  subjects: ReportCardSubject[];
  overall_average: number | null;
  rank: number | null;
  class_size: number;
  class_average: number | null;
  attendance: { absences: number; justified_absences: number; lates: number };
  mention?: 'felicitations' | 'encouragements' | 'tableau_honneur' | null;
  verify_code?: string | null;
}

function verifyUrl(code: string) {
  return `${window.location.origin}/verify/${code}`;
}

function score(value: number | null | undefined) {
  return value === null || value === undefined ? '—' : value.toFixed(2);
}

type ReportCardViewProps = {
  data: ReportCardData;
  publishedAt?: string | null;
  draft?: boolean;
};

export default function ReportCardView({ data, publishedAt, draft = false }: ReportCardViewProps) {
  const { t } = useLocale();
  const logo = useSchoolBranding().data?.logo;

  return (
    <div className="report-card-print">
      <div className="report-card-toolbar">
        {draft && <span className="badge badge-compact badge-warning">{t('reportCards.draft')}</span>}
        <button type="button" className="btn btn-secondary btn-compact" onClick={() => window.print()}>
          <Printer size={14} /> {t('reportCards.print')}
        </button>
      </div>
      <article className="report-card-sheet">
        <header className="report-card-header">
          {logo && <img className="printed-logo" src={logo} alt="" />}
          <div>
            <div className="report-card-republic">{t('reportCards.republic')}</div>
            <strong>{data.school_name}</strong>
            <div>{t('reportCards.sheetTitle', { term: data.semester_name ?? '' })}</div>
            {data.period_start && data.period_end && (
              <div className="report-card-muted">{t('reportCards.period', { start: data.period_start, end: data.period_end })}</div>
            )}
          </div>
          <div className="report-card-student">
            <strong>{data.student_name}</strong>
            {data.student_number && <div>{t('reportCards.studentNumber', { number: data.student_number })}</div>}
            <div>{t('reportCards.className', { name: data.class_name ?? '' })}</div>
          </div>
        </header>

        <table className="report-card-table">
          <thead>
            <tr>
              <th>{t('reportCards.subject')}</th>
              <th>{t('reportCards.coefficient')}</th>
              <th>{t('reportCards.average')}</th>
              <th>{t('reportCards.classAverage')}</th>
            </tr>
          </thead>
          <tbody>
            {data.subjects.map((line) => (
              <tr key={line.key}>
                <td>{line.subject}</td>
                <td>{line.coefficient}</td>
                <td>{score(line.average)}</td>
                <td>{score(line.class_average)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="report-card-summary">
          <div>
            <span>{t('reportCards.overall')}</span>
            <strong>{score(data.overall_average)} / 20</strong>
          </div>
          <div>
            <span>{t('reportCards.rank')}</span>
            <strong>{data.rank ? t('reportCards.rankOf', { rank: data.rank, size: data.class_size }) : '—'}</strong>
          </div>
          <div>
            <span>{t('reportCards.classOverall')}</span>
            <strong>{score(data.class_average)}</strong>
          </div>
          <div>
            <span>{t('reportCards.attendance')}</span>
            <strong>
              {t('reportCards.attendanceCounts', {
                absences: data.attendance.absences,
                justified: data.attendance.justified_absences,
                lates: data.attendance.lates,
              })}
            </strong>
          </div>
        </div>
        {data.mention && (
          <div className="report-card-mention">
            <Award size={18} aria-hidden="true" />
            <strong>{t(`reportCards.mention.${data.mention}`)}</strong>
          </div>
        )}
        <footer className="report-card-footer">
          {publishedAt && (
            <span className="report-card-muted">
              {t('reportCards.publishedOn', { date: new Date(publishedAt).toLocaleDateString() })}
            </span>
          )}
          {data.verify_code && !draft && (
            <div className="report-card-verify">
              <QRCodeSVG value={verifyUrl(data.verify_code)} size={72} level="M" />
              <span>{t('reportCards.verifyHint')}</span>
            </div>
          )}
        </footer>
      </article>
    </div>
  );
}
