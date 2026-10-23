import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowDownRight, ArrowRight, ArrowUpRight, CalendarRange, Printer } from 'lucide-react';
import { api } from '../lib/api';
import { useLocale, type Locale } from '../lib/i18n';

interface Activity {
  attendance_records: number;
  attendance_rate: number | null;
  absences: number;
  unjustified_absences: number;
  lates: number;
  parent_notifications: number;
  active_parents: number;
  active_teachers: number;
  grades_entered: number;
  homework_posted: number;
  lessons_logged: number;
  messages: number;
  announcements: number;
  report_cards: number;
  meetings_booked: number;
}

interface MonthlyReport {
  month: string;
  previous_month: string;
  is_partial: boolean;
  school_name: string;
  current: Activity;
  previous: Activity;
  snapshot: { students: number; students_with_parent: number; linked_parents: number; teachers: number };
  parent_coverage: number | null;
  active_parent_rate: number | null;
  class_attendance: Array<{ class_id: string; class_name: string; attendance_rate: number | null }>;
  available_months: string[];
}

// Single series: categorical slot 1 of the reference palette, validated on the
// card surface #FFFFFF (the same blue as the attendance trend).
const BAR_COLOR = '#2a78d6';

function intlLocale(locale: Locale) {
  return locale === 'ar' ? 'ar-DZ' : locale === 'en' ? 'en-US' : 'fr-DZ';
}

function monthLabel(month: string, locale: Locale) {
  const [year, value] = month.split('-').map(Number);
  return new Intl.DateTimeFormat(intlLocale(locale), { month: 'long', year: 'numeric' }).format(new Date(year, value - 1, 1));
}

function Delta({ current, previous, unit = '', previousLabel }: {
  current: number | null; previous: number | null; unit?: string; previousLabel: string;
}) {
  const { t } = useLocale();
  if (current === null || previous === null) return <span className="monthly-delta">{t('monthly.noComparison')}</span>;
  const diff = Math.round((current - previous) * 10) / 10;
  const Icon = diff > 0 ? ArrowUpRight : diff < 0 ? ArrowDownRight : ArrowRight;
  const sign = diff > 0 ? '+' : '';
  return (
    <span className="monthly-delta">
      <Icon size={14} aria-hidden="true" />
      {t('monthly.vsPrevious', { diff: `${sign}${diff.toLocaleString()}${unit}`, month: previousLabel })}
    </span>
  );
}

export default function MonthlyReportPanel() {
  const { t, locale } = useLocale();
  const [month, setMonth] = useState<string | null>(null);
  const reportQuery = useQuery<MonthlyReport>({
    queryKey: ['monthly-report', month],
    queryFn: async () => (await api.get('/admin/reports/monthly', { params: month ? { month } : {} })).data,
  });
  const report = reportQuery.data;

  if (reportQuery.isLoading) return <div className="glass-card dashboard-card-pad">{t('common.loading')}</div>;
  if (!report) return <div className="glass-card dashboard-card-pad">{t('monthly.error')}</div>;

  const { current, previous } = report;
  const previousLabel = monthLabel(report.previous_month, locale);
  const number = (value: number) => value.toLocaleString(intlLocale(locale));
  const percent = (value: number | null) => (value === null ? '—' : `${value.toLocaleString(intlLocale(locale))} %`);

  const headline = [
    { key: 'attendance', label: t('monthly.attendanceRate'), value: percent(current.attendance_rate),
      delta: <Delta current={current.attendance_rate} previous={previous.attendance_rate} unit={` ${t('monthly.points')}`} previousLabel={previousLabel} /> },
    { key: 'notifications', label: t('monthly.parentNotifications'), value: number(current.parent_notifications),
      delta: <Delta current={current.parent_notifications} previous={previous.parent_notifications} previousLabel={previousLabel} /> },
    { key: 'parents', label: t('monthly.activeParents'), value: number(current.active_parents),
      note: report.active_parent_rate === null ? null : t('monthly.ofLinkedParents', { rate: percent(report.active_parent_rate), total: number(report.snapshot.linked_parents) }),
      delta: <Delta current={current.active_parents} previous={previous.active_parents} previousLabel={previousLabel} /> },
    { key: 'grades', label: t('monthly.gradesEntered'), value: number(current.grades_entered),
      delta: <Delta current={current.grades_entered} previous={previous.grades_entered} previousLabel={previousLabel} /> },
  ];

  const rows: Array<{ key: keyof Activity; label: string }> = [
    { key: 'absences', label: t('monthly.absences') },
    { key: 'unjustified_absences', label: t('monthly.unjustified') },
    { key: 'lates', label: t('monthly.lates') },
    { key: 'homework_posted', label: t('monthly.homework') },
    { key: 'lessons_logged', label: t('monthly.lessons') },
    { key: 'messages', label: t('monthly.messages') },
    { key: 'announcements', label: t('monthly.announcements') },
    { key: 'report_cards', label: t('monthly.reportCards') },
    { key: 'meetings_booked', label: t('monthly.meetings') },
    { key: 'active_teachers', label: t('monthly.activeTeachers') },
  ];

  return (
    <section className="glass-card monthly-report monthly-print-sheet animate-fade-in" aria-labelledby="monthly-title">
      <div className="dashboard-toolbar">
        <div>
          <p className="monthly-school">{report.school_name}</p>
          <h2 id="monthly-title" className="dashboard-section-title dashboard-section-title--plain">
            <CalendarRange size={18} /> {t('monthly.title', { month: monthLabel(report.month, locale) })}
          </h2>
          <p className="dashboard-section-copy">
            {report.is_partial ? t('monthly.partial', { date: new Date().toLocaleDateString(intlLocale(locale)) }) : t('monthly.copy')}
          </p>
        </div>
        <div className="management-actions monthly-no-print">
          <select
            className="form-input"
            value={report.month}
            onChange={(e) => setMonth(e.target.value)}
            aria-label={t('monthly.pickMonth')}
          >
            {report.available_months.map((item) => <option key={item} value={item}>{monthLabel(item, locale)}</option>)}
          </select>
          <button type="button" className="btn btn-primary btn-compact" onClick={() => window.print()}>
            <Printer size={14} /> {t('monthly.print')}
          </button>
        </div>
      </div>

      <div className="monthly-headline">
        {headline.map((tile) => (
          <div key={tile.key} className="monthly-tile">
            <span className="monthly-tile-label">{tile.label}</span>
            <strong className="monthly-tile-value">{tile.value}</strong>
            {tile.note && <span className="monthly-tile-note">{tile.note}</span>}
            {tile.delta}
          </div>
        ))}
      </div>

      <div className="monthly-columns">
        <div>
          <h3 className="monthly-subtitle">{t('monthly.schoolLife')}</h3>
          <div className="monthly-table-scroll">
            <table className="premium-table monthly-table">
              <thead>
                <tr>
                  <th scope="col">{t('monthly.indicator')}</th>
                  <th scope="col">{monthLabel(report.month, locale)}</th>
                  <th scope="col">{previousLabel}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.key}>
                    <th scope="row">{row.label}</th>
                    <td>{number(current[row.key] as number)}</td>
                    <td>{number(previous[row.key] as number)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h3 className="monthly-subtitle">{t('monthly.coverage')}</h3>
          <ul className="monthly-coverage">
            <li>
              <strong>{percent(report.parent_coverage)}</strong>
              <span>{t('monthly.parentCoverage', { linked: number(report.snapshot.students_with_parent), total: number(report.snapshot.students) })}</span>
            </li>
            <li>
              <strong>{number(current.active_teachers)} / {number(report.snapshot.teachers)}</strong>
              <span>{t('monthly.teachersUsing')}</span>
            </li>
          </ul>

          <h3 className="monthly-subtitle">{t('monthly.classAttendance')}</h3>
          {report.class_attendance.length === 0 && <p className="dashboard-section-copy">{t('monthly.noAttendance')}</p>}
          <ul className="monthly-bars" aria-label={t('monthly.classAttendance')}>
            {report.class_attendance.map((item) => (
              <li key={item.class_id} title={`${item.class_name} : ${percent(item.attendance_rate)}`}>
                <span className="monthly-bar-label">{item.class_name}</span>
                <span className="monthly-bar-track" aria-hidden="true">
                  <span style={{ width: `${item.attendance_rate ?? 0}%`, background: BAR_COLOR }} />
                </span>
                <span className="monthly-bar-value">{percent(item.attendance_rate)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="report-card-muted">{t('monthly.method')}</p>
    </section>
  );
}
