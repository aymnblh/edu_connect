import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ClipboardCheck, UserX } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../lib/api';
import { type Locale, useLocale } from '../lib/i18n';

type Reason = 'low_average' | 'dropping' | 'absences' | 'lateness';

interface AttendanceWeek {
  week_start: string;
  records: number;
  absences: number;
  lates: number;
  absence_rate: number;
  late_rate: number;
}

interface Insights {
  semester: { id: string; name: string } | null;
  previous_semester: { id: string; name: string } | null;
  semesters: Array<{ id: string; name: string }>;
  attendance_weeks: AttendanceWeek[];
  class_attendance: Array<{
    class_id: string;
    class_name: string;
    records: number;
    absence_rate: number;
    late_rate: number;
  }>;
  at_risk: Array<{
    student_id: string;
    student_name: string;
    class_name: string;
    average: number | null;
    previous_average: number | null;
    unjustified_absences_30d: number;
    lates_30d: number;
    reasons: Reason[];
  }>;
  pending_grade_approvals: number;
  unjustified_absences_30d: number;
}

// Categorical slots 1-2 of the reference palette (light steps), validated on the
// card surface #FFFFFF: CVD ΔE 24.7, normal-vision ΔE 33.6, contrast ≥ 3:1.
const SERIES = {
  absence: '#2a78d6',
  late: '#eb6834',
};

function shortDay(iso: string, locale: Locale) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-DZ' : locale === 'en' ? 'en-US' : 'fr-DZ', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(y, m - 1, d));
}

type TrendTooltipProps = {
  active?: boolean;
  payload?: Array<{ payload: AttendanceWeek }>;
  label?: string;
  t: (key: string, params?: Record<string, string | number>) => string;
};

function TrendTooltip({ active, payload, label, t }: TrendTooltipProps) {
  if (!active || !payload?.length) return null;
  const week = payload[0].payload;
  if (!week.records) {
    return (
      <div className="chart-tooltip">
        <strong>{t('insights.weekOf', { date: label ?? '' })}</strong>
        <div className="report-card-muted">{t('insights.noRecords')}</div>
      </div>
    );
  }
  return (
    <div className="chart-tooltip">
      <strong>{t('insights.weekOf', { date: label ?? '' })}</strong>
      <div><span className="legend-swatch" style={{ background: SERIES.absence }} /> {t('insights.absenceRate')}: {week.absence_rate}% ({week.absences})</div>
      <div><span className="legend-swatch" style={{ background: SERIES.late }} /> {t('insights.lateRate')}: {week.late_rate}% ({week.lates})</div>
      <div className="report-card-muted">{t('insights.records', { count: week.records })}</div>
    </div>
  );
}

export default function DirectorInsightsPanel() {
  const { t, locale } = useLocale();
  const [semesterId, setSemesterId] = useState('');
  const [showTable, setShowTable] = useState(false);

  const insightsQuery = useQuery<Insights>({
    queryKey: ['director-insights', semesterId],
    queryFn: async () =>
      (await api.get('/admin/analytics/insights', { params: semesterId ? { semester_id: semesterId } : {} })).data,
  });
  const data = insightsQuery.data;

  if (insightsQuery.isLoading) return <p className="dashboard-section-copy">{t('common.loading')}</p>;
  if (!data) return null;

  // A week without any attendance record has no rate (a gap), not 0%.
  const weeks = data.attendance_weeks.map((week) => ({
    ...week,
    label: shortDay(week.week_start, locale),
    absence_plot: week.records ? week.absence_rate : null,
    late_plot: week.records ? week.late_rate : null,
  }));
  const lastIndex = weeks.length - 1;
  const endLabel = (name: string) =>
    function EndLabel(props: { x?: number | string; y?: number | string; index?: number }) {
      if (props.index !== lastIndex || props.x === undefined || props.y === undefined) return null;
      return (
        <text x={Number(props.x) + 8} y={Number(props.y)} dy={4} fill="var(--text-secondary)" fontSize={12}>
          {name}
        </text>
      );
    };

  return (
    <section className="glass-card dashboard-card-pad insights-panel">
      <div className="dashboard-toolbar">
        <div>
          <h2 className="dashboard-section-title dashboard-section-title--plain">{t('insights.title')}</h2>
          <p className="dashboard-section-copy">
            {data.previous_semester
              ? t('insights.copyCompare', { previous: data.previous_semester.name })
              : t('insights.copy')}
          </p>
        </div>
        <select
          className="form-input insights-term"
          aria-label={t('reportCards.term')}
          value={semesterId || data.semester?.id || ''}
          onChange={(event) => setSemesterId(event.target.value)}
        >
          {data.semesters.map((item) => (
            <option key={item.id} value={item.id}>{item.name}</option>
          ))}
        </select>
      </div>

      <div className="insights-kpis">
        <div className="insights-kpi">
          <AlertTriangle size={18} aria-hidden />
          <strong>{data.at_risk.length}</strong>
          <span>{t('insights.atRiskCount')}</span>
        </div>
        <div className="insights-kpi">
          <ClipboardCheck size={18} aria-hidden />
          <strong>{data.pending_grade_approvals}</strong>
          <span>{t('insights.pendingApprovals')}</span>
        </div>
        <div className="insights-kpi">
          <UserX size={18} aria-hidden />
          <strong>{data.unjustified_absences_30d}</strong>
          <span>{t('insights.unjustified30d')}</span>
        </div>
      </div>

      <h3>{t('insights.trendTitle')}</h3>
      <div className="chart-legend" aria-hidden>
        <span><span className="legend-swatch" style={{ background: SERIES.absence }} /> {t('insights.absenceRate')}</span>
        <span><span className="legend-swatch" style={{ background: SERIES.late }} /> {t('insights.lateRate')}</span>
      </div>
      <div className="insights-chart" role="img" aria-label={t('insights.trendAria')}>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={weeks} margin={{ top: 12, right: 72, bottom: 4, left: 0 }}>
            <CartesianGrid stroke="var(--border-color)" vertical={false} />
            <XAxis dataKey="label" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis
              stroke="var(--text-muted)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              tickFormatter={(value: number) => `${value}%`}
              width={44}
            />
            <Tooltip content={<TrendTooltip t={t} />} cursor={{ stroke: 'var(--text-muted)', strokeWidth: 1 }} />
            <Line type="linear" dataKey="absence_plot" stroke={SERIES.absence} strokeWidth={2}
              dot={{ r: 4, strokeWidth: 2, stroke: 'var(--surface-color)', fill: SERIES.absence }}
              activeDot={{ r: 6, strokeWidth: 2, stroke: 'var(--surface-color)' }}
              label={endLabel(t('insights.absencesShort'))} isAnimationActive={false} />
            <Line type="linear" dataKey="late_plot" stroke={SERIES.late} strokeWidth={2}
              dot={{ r: 4, strokeWidth: 2, stroke: 'var(--surface-color)', fill: SERIES.late }}
              activeDot={{ r: 6, strokeWidth: 2, stroke: 'var(--surface-color)' }}
              label={endLabel(t('insights.latesShort'))} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <button type="button" className="btn btn-secondary btn-compact insights-table-toggle" onClick={() => setShowTable(!showTable)}>
        {showTable ? t('insights.hideTable') : t('insights.showTable')}
      </button>
      {showTable && (
        <div className="premium-table-wrapper">
          <table className="premium-table">
            <thead>
              <tr>
                <th>{t('insights.week')}</th>
                <th>{t('insights.absenceRate')}</th>
                <th>{t('insights.lateRate')}</th>
                <th>{t('insights.recordsShort')}</th>
              </tr>
            </thead>
            <tbody>
              {weeks.map((week) => (
                <tr key={week.week_start}>
                  <td>{week.label}</td>
                  <td>{week.absence_rate}% ({week.absences})</td>
                  <td>{week.late_rate}% ({week.lates})</td>
                  <td>{week.records}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h3>{t('insights.atRiskTitle')}</h3>
      <p className="dashboard-section-copy">{t('insights.rulesHelp')}</p>
      {data.at_risk.length === 0 ? (
        <p className="dashboard-section-copy">{t('insights.atRiskEmpty')}</p>
      ) : (
        <div className="premium-table-wrapper">
          <table className="premium-table">
            <thead>
              <tr>
                <th>{t('reportCards.student')}</th>
                <th>{t('reportCards.class')}</th>
                <th>{t('insights.average')}</th>
                <th>{t('insights.last30d')}</th>
                <th>{t('insights.reasons')}</th>
              </tr>
            </thead>
            <tbody>
              {data.at_risk.map((row) => (
                <tr key={`${row.student_id}-${row.class_name}`}>
                  <td>{row.student_name}</td>
                  <td>{row.class_name}</td>
                  <td>
                    {row.average === null ? '—' : row.average.toFixed(2)}
                    {row.previous_average !== null && (
                      <span className="report-card-muted"> ({t('insights.before', { value: row.previous_average.toFixed(2) })})</span>
                    )}
                  </td>
                  <td>{t('insights.recentCounts', { absences: row.unjustified_absences_30d, lates: row.lates_30d })}</td>
                  <td>
                    <div className="table-actions">
                      {row.reasons.map((reason) => (
                        <span key={reason} className="badge badge-compact badge-warning">
                          <AlertTriangle size={12} aria-hidden /> {t(`insights.reason.${reason}`)}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h3>{t('insights.classTitle')}</h3>
      {data.class_attendance.length === 0 ? (
        <p className="dashboard-section-copy">{t('insights.classEmpty')}</p>
      ) : (
        <div className="premium-table-wrapper">
          <table className="premium-table">
            <thead>
              <tr>
                <th>{t('reportCards.class')}</th>
                <th>{t('insights.absenceRate')}</th>
                <th>{t('insights.lateRate')}</th>
                <th>{t('insights.recordsShort')}</th>
              </tr>
            </thead>
            <tbody>
              {data.class_attendance.map((row) => (
                <tr key={row.class_id}>
                  <td>{row.class_name}</td>
                  <td>{row.absence_rate}%</td>
                  <td>{row.late_rate}%</td>
                  <td>{row.records}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
