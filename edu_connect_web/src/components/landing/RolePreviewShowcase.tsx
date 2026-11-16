import { useState } from 'react';
import {
  AlertTriangle,
  Award,
  Bell,
  BookOpen,
  Building2,
  Bus,
  CheckCircle2,
  Clock,
  Presentation,
  QrCode,
  Receipt,
  ShieldCheck,
  Smartphone,
  Users,
  Utensils,
  WifiOff,
} from 'lucide-react';
import { useLocale } from '../../lib/i18n';

type PreviewRole = 'director' | 'teacher' | 'parent' | 'services';
type AttendanceChoice = 'present' | 'absent' | 'late';
type BusStudentStatus = 'boarded' | 'dropped';

const ROLE_TABS: Array<{ id: PreviewRole; icon: typeof Building2; labelKey: string }> = [
  { id: 'director', icon: Building2, labelKey: 'landing.preview.tab.director' },
  { id: 'teacher', icon: Presentation, labelKey: 'landing.preview.tab.teacher' },
  { id: 'parent', icon: Users, labelKey: 'landing.preview.tab.parent' },
  { id: 'services', icon: Bus, labelKey: 'landing.preview.tab.services' },
];

/** Interactive 4-role workspace preview allowing visitors to click live Wasel Edu scenarios. */
export default function RolePreviewShowcase() {
  const { locale, t } = useLocale();
  const [activeTab, setActiveTab] = useState<PreviewRole>('director');
  const [directorSubView, setDirectorSubView] = useState<'vigilance' | 'report'>('vigilance');
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceChoice>>({
    s1: 'present',
    s2: 'absent',
    s3: 'present',
  });
  const [selectedChild, setSelectedChild] = useState<'c1' | 'c2'>('c1');
  const [busStatuses, setBusStatuses] = useState<Record<string, BusStudentStatus>>({
    b1: 'dropped',
    b2: 'boarded',
    b3: 'dropped',
  });
  const [delayAlertSent, setDelayAlertSent] = useState(false);

  const teacherStudents = [
    { id: 's1', name: locale === 'ar' ? 'ياسين خالدي' : 'Yacine Khaldi' },
    { id: 's2', name: locale === 'ar' ? 'أمينة بن علي' : 'Amina Benali' },
    { id: 's3', name: locale === 'ar' ? 'سامي مرابط' : 'Sami Merabet' },
  ];

  const busRiders = [
    {
      id: 'b1',
      name: locale === 'ar' ? 'لينة بن علي' : 'Lina Benali',
      stop: locale === 'ar' ? 'موقف حيدرة (07:35)' : 'Arrêt Hydra (07:35)',
    },
    {
      id: 'b2',
      name: locale === 'ar' ? 'ريان طالب' : 'Rayan Taleb',
      stop: locale === 'ar' ? 'موقف الأبيار (07:42)' : 'Arrêt El Biar (07:42)',
    },
    {
      id: 'b3',
      name: locale === 'ar' ? 'كنزة بوزيد' : 'Kenza Bouzid',
      stop: locale === 'ar' ? 'موقف بن عكنون (07:48)' : 'Arrêt Ben Aknoun (07:48)',
    },
  ];

  const attendanceCounts = Object.values(attendanceMap).reduce(
    (acc, status) => {
      acc[status] += 1;
      return acc;
    },
    { present: 0, absent: 0, late: 0 },
  );

  const boardedCount = Object.values(busStatuses).filter((status) => status === 'boarded').length;
  const currencyLabel = locale === 'ar' ? 'دج' : locale === 'en' ? 'DZD' : 'DA';

  return (
    <section id="apercu" className="landing-section" aria-labelledby="landing-preview-heading">
      <header className="landing-section-header">
        <span className="dashboard-eyebrow">{t('landing.preview.eyebrow')}</span>
        <h2 id="landing-preview-heading">{t('landing.preview.title')}</h2>
        <p>{t('landing.preview.subtitle')}</p>
      </header>

      <div className="landing-preview-shell glass-card">
        <div className="landing-preview-tabs" role="tablist" aria-label={t('landing.preview.title')}>
          {ROLE_TABS.map(({ id, icon: Icon, labelKey }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={active}
                className={`landing-preview-tab ${active ? 'landing-preview-tab--active' : ''}`}
                onClick={() => setActiveTab(id)}
              >
                <Icon size={17} aria-hidden="true" />
                <span>{t(labelKey)}</span>
              </button>
            );
          })}
        </div>

        <div className="landing-preview-stage" role="tabpanel">
          {activeTab === 'director' && (
            <div className="preview-director">
              <div className="preview-topbar">
                <div>
                  <strong>{t('landing.preview.dir.school')}</strong>
                  <span>{t('landing.preview.dir.term')}</span>
                </div>
                <div className="preview-subtabs">
                  <button
                    type="button"
                    className={`preview-pill-btn ${directorSubView === 'vigilance' ? 'preview-pill-btn--active' : ''}`}
                    onClick={() => setDirectorSubView('vigilance')}
                  >
                    {t('landing.preview.dir.subVigilance')}
                  </button>
                  <button
                    type="button"
                    className={`preview-pill-btn ${directorSubView === 'report' ? 'preview-pill-btn--active' : ''}`}
                    onClick={() => setDirectorSubView('report')}
                  >
                    {t('landing.preview.dir.subReport')}
                  </button>
                </div>
              </div>

              <div className="preview-kpis">
                <div className="preview-kpi">
                  <span>{t('landing.preview.dir.kpi1Label')}</span>
                  <strong>96,4 %</strong>
                </div>
                <div className="preview-kpi">
                  <span>{t('landing.preview.dir.kpi2Label')}</span>
                  <strong>13,8 / 20</strong>
                </div>
                <div className="preview-kpi preview-kpi--gold">
                  <span>{t('landing.preview.dir.kpi3Label')}</span>
                  <strong>1 840 000 {currencyLabel}</strong>
                </div>
              </div>

              {directorSubView === 'vigilance' ? (
                <div className="preview-alerts-list">
                  <div className="preview-alert-row">
                    <AlertTriangle size={18} className="preview-alert-icon" aria-hidden="true" />
                    <div className="preview-alert-body">
                      <strong>{t('landing.preview.dir.alert1Title')}</strong>
                      <span>{t('landing.preview.dir.alert1Reason')}</span>
                    </div>
                    <span className="status-badge status-badge--warning">{t('landing.preview.dir.alertAction')}</span>
                  </div>
                  <div className="preview-alert-row">
                    <AlertTriangle size={18} className="preview-alert-icon" aria-hidden="true" />
                    <div className="preview-alert-body">
                      <strong>{t('landing.preview.dir.alert2Title')}</strong>
                      <span>{t('landing.preview.dir.alert2Reason')}</span>
                    </div>
                    <span className="status-badge status-badge--warning">{t('landing.preview.dir.alertAction')}</span>
                  </div>
                </div>
              ) : (
                <div className="preview-report-card">
                  <div className="preview-rc-main">
                    <div className="preview-rc-school">
                      <img src="/wasel-edu-logo.svg" alt="" />
                      <div>
                        <strong>{t('landing.preview.dir.school')}</strong>
                        <span>{t('landing.preview.dir.rcStudent')}</span>
                      </div>
                    </div>
                    <p className="preview-rc-avg">{t('landing.preview.dir.rcAvg')}</p>
                    <div className="preview-rc-mention">
                      <Award size={16} aria-hidden="true" />
                      <strong>{t('landing.preview.dir.rcMention')}</strong>
                    </div>
                  </div>
                  <div className="preview-rc-qr">
                    <div className="preview-qr-box" aria-hidden="true">
                      <QrCode size={52} />
                    </div>
                    <small>{t('landing.preview.dir.rcVerify')}</small>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'teacher' && (
            <div className="preview-teacher">
              <div className="preview-topbar">
                <div>
                  <strong>{t('landing.preview.tch.header')}</strong>
                  <span>{t('landing.preview.tch.scope')}</span>
                </div>
                <span className="status-badge status-badge--active">{t('landing.preview.tch.hint')}</span>
              </div>

              <div className="preview-teacher-grid">
                <div className="preview-attendance-box">
                  {teacherStudents.map((student) => {
                    const current = attendanceMap[student.id];
                    return (
                      <div key={student.id} className="preview-student-row">
                        <strong>{student.name}</strong>
                        <div className="preview-choice-group">
                          {(['present', 'absent', 'late'] as const).map((choice) => (
                            <button
                              key={choice}
                              type="button"
                              aria-pressed={current === choice}
                              className={`preview-choice-btn preview-choice-btn--${choice} ${current === choice ? 'is-selected' : ''}`}
                              onClick={() =>
                                setAttendanceMap((prev) => ({
                                  ...prev,
                                  [student.id]: choice,
                                }))
                              }
                            >
                              {t(`landing.preview.tch.${choice}`)}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  <div className="preview-live-banner">
                    <CheckCircle2 size={16} aria-hidden="true" />
                    <span>
                      {t('landing.preview.tch.liveSummary', {
                        present: attendanceCounts.present,
                        absent: attendanceCounts.absent,
                        late: attendanceCounts.late,
                      })}
                    </span>
                  </div>
                </div>

                <div className="preview-teacher-side">
                  <div className="preview-side-card">
                    <div className="preview-side-head">
                      <span>{t('landing.preview.tch.gradeCardTitle')}</span>
                      <strong>16,5 / 20</strong>
                    </div>
                    <p>{teacherStudents[0].name}</p>
                    <span className="status-badge status-badge--warning">{t('landing.preview.tch.gradePending')}</span>
                  </div>
                  <div className="preview-side-card">
                    <div className="preview-side-head">
                      <span>{t('landing.preview.tch.hwTitle')}</span>
                      <BookOpen size={16} aria-hidden="true" />
                    </div>
                    <p>{t('landing.preview.tch.hwCopy')}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'parent' && (
            <div className="preview-parent">
              <div className="preview-phone-frame">
                <div className="preview-phone-notch">
                  <Smartphone size={14} aria-hidden="true" />
                  <span>Wasel Edu · Mobile</span>
                </div>

                <div className="preview-child-switch">
                  <button
                    type="button"
                    className={`preview-pill-btn ${selectedChild === 'c1' ? 'preview-pill-btn--active' : ''}`}
                    onClick={() => setSelectedChild('c1')}
                  >
                    {t('landing.preview.par.child1')}
                  </button>
                  <button
                    type="button"
                    className={`preview-pill-btn ${selectedChild === 'c2' ? 'preview-pill-btn--active' : ''}`}
                    onClick={() => setSelectedChild('c2')}
                  >
                    {t('landing.preview.par.child2')}
                  </button>
                </div>

                <div className="preview-phone-avg">
                  <span>{t('landing.preview.par.avgLabel')}</span>
                  <strong>{selectedChild === 'c1' ? '16,42 / 20' : '14,15 / 20'}</strong>
                </div>

                <div className="preview-phone-feed">
                  <div className="preview-feed-item">
                    <Bus size={16} aria-hidden="true" />
                    <div>
                      <strong>{t('landing.preview.par.push1Title')}</strong>
                      <p>
                        {selectedChild === 'c1'
                          ? t('landing.preview.par.push1BodyChild1')
                          : t('landing.preview.par.push1BodyChild2')}
                      </p>
                    </div>
                  </div>
                  <div className="preview-feed-item">
                    <Receipt size={16} aria-hidden="true" />
                    <div>
                      <strong>{t('landing.preview.par.push2Title')}</strong>
                      <p>{t('landing.preview.par.push2Body')}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="preview-parent-side">
                <div className="preview-side-card">
                  <div className="preview-side-head">
                    <span>{t('landing.preview.par.menuTitle')}</span>
                    <Utensils size={16} aria-hidden="true" />
                  </div>
                  <p>{t('landing.preview.par.menuBody')}</p>
                </div>

                <div className="preview-parent-actions">
                  <div className="preview-action-chip">
                    <Bell size={15} aria-hidden="true" />
                    <span>{t('landing.preview.par.action1')}</span>
                  </div>
                  <div className="preview-action-chip">
                    <Bus size={15} aria-hidden="true" />
                    <span>{t('landing.preview.par.action2')}</span>
                  </div>
                  <div className="preview-action-chip">
                    <Clock size={15} aria-hidden="true" />
                    <span>{t('landing.preview.par.action3')}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'services' && (
            <div className="preview-services">
              <div className="preview-service-card">
                <div className="preview-topbar">
                  <div>
                    <strong>{t('landing.preview.srv.busTitle')}</strong>
                    <span>{t('landing.preview.srv.busHint')}</span>
                  </div>
                  <span className="status-badge status-badge--active">
                    <WifiOff size={13} aria-hidden="true" /> {t('landing.preview.srv.offlineBadge')}
                  </span>
                </div>

                <div className="preview-bus-list">
                  {busRiders.map((rider) => {
                    const status = busStatuses[rider.id];
                    return (
                      <div key={rider.id} className="preview-student-row">
                        <div>
                          <strong>{rider.name}</strong>
                          <small className="preview-stop-label">{rider.stop}</small>
                        </div>
                        <div className="preview-choice-group">
                          <button
                            type="button"
                            aria-pressed={status === 'boarded'}
                            className={`preview-choice-btn preview-choice-btn--late ${status === 'boarded' ? 'is-selected' : ''}`}
                            onClick={() => setBusStatuses((prev) => ({ ...prev, [rider.id]: 'boarded' }))}
                          >
                            {t('landing.preview.srv.boarded')}
                          </button>
                          <button
                            type="button"
                            aria-pressed={status === 'dropped'}
                            className={`preview-choice-btn preview-choice-btn--present ${status === 'dropped' ? 'is-selected' : ''}`}
                            onClick={() => setBusStatuses((prev) => ({ ...prev, [rider.id]: 'dropped' }))}
                          >
                            {t('landing.preview.srv.dropped')}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div
                  className={`preview-lock-banner ${boardedCount > 0 ? 'preview-lock-banner--blocked' : 'preview-lock-banner--ok'}`}
                >
                  {boardedCount > 0 ? (
                    <>
                      <AlertTriangle size={16} aria-hidden="true" />
                      <span>{t('landing.preview.srv.lockBlocked', { count: boardedCount })}</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={16} aria-hidden="true" />
                      <span>{t('landing.preview.srv.lockReady')}</span>
                    </>
                  )}
                </div>

                <div className="preview-bus-footer">
                  <button
                    type="button"
                    className="btn btn-secondary btn-compact"
                    onClick={() => setDelayAlertSent((prev) => !prev)}
                  >
                    <Clock size={14} aria-hidden="true" />
                    {t('landing.preview.srv.delayBtn')}
                  </button>
                  {delayAlertSent && (
                    <span className="status-badge status-badge--warning">
                      {t('transport.delaySent', { count: 14 })}
                    </span>
                  )}
                </div>
              </div>

              <div className="preview-service-card">
                <div className="preview-topbar">
                  <div>
                    <strong>{t('landing.preview.srv.canteenTitle')}</strong>
                  </div>
                  <Utensils size={18} aria-hidden="true" />
                </div>

                <div className="preview-canteen-metrics">
                  <div>
                    <span>{t('landing.preview.srv.canteenRegistered')}</span>
                    <strong>145</strong>
                  </div>
                  <div>
                    <span>{t('landing.preview.srv.canteenAbsent')}</span>
                    <strong className="preview-canteen-deduct">- 7</strong>
                  </div>
                  <div className="preview-canteen-final">
                    <span>{t('landing.preview.srv.canteenMeals')}</span>
                    <strong>138</strong>
                  </div>
                </div>

                <div className="preview-live-banner">
                  <AlertTriangle size={16} aria-hidden="true" />
                  <span>{t('landing.preview.srv.canteenDiets')}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
