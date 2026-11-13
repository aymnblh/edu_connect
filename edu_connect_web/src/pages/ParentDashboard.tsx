import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Award,
  Calendar,
  CalendarCheck,
  CalendarClock,
  ClipboardList,
  FileText,
  FolderOpen,
  HeartHandshake,
  HeartPulse,
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  NotebookText,
  RefreshCw,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import AnnouncementsPanel from '../components/AnnouncementsPanel';
import DashboardActionGrid from '../components/DashboardActionGrid';
import ParentReportCardsPanel from '../components/ParentReportCardsPanel';
import { ParentMeetingsPanel } from '../components/MeetingsPanel';
import HealthRecordForm from '../components/HealthRecordForm';
import ParentFeesPanel from '../components/ParentFeesPanel';
import DirectMessagingPanel from '../components/DirectMessagingPanel';
import { api } from '../lib/api';
import { useLocale, type Locale } from '../lib/i18n';

interface Student {
  id: string;
  full_name: string;
  student_id?: string | null;
}

interface SchoolClass {
  id: string;
  name: string;
  subject?: string | null;
  members?: Student[];
}

interface Grade {
  id: string;
  class_id: string;
  student_id: string;
  student_name: string;
  course_id?: string | null;
  subject: string;
  score: number;
  max_score: number;
  coefficient?: number;
  normalized_score?: number;
  date: string;
  comment?: string | null;
}

interface Attendance {
  id: string;
  class_id: string;
  student_id: string;
  student_name: string;
  status: 'present' | 'absent' | 'late';
  date: string;
  note?: string | null;
  is_justified: boolean;
  justification_text?: string | null;
}

type HomeworkKind = 'homework' | 'assignment' | 'exam';

interface Homework {
  id: string;
  class_id: string;
  kind?: HomeworkKind | string;
  subject: string;
  lesson_content?: string | null;
  homework_content: string;
  due_date: string;
  created_at: string;
}

interface ScheduleSlot {
  id: string;
  class_id: string;
  course_name: string;
  teacher_id?: string | null;
  teacher_name?: string | null;
  day_of_week: number;
  day_name: string;
  start_time: string;
  end_time: string;
  room?: string | null;
  cancellations?: Array<{
    id: string;
    slot_id: string;
    cancelled_date: string;
    reason?: string | null;
  }>;
}

interface ScheduleExam {
  id: string;
  class_id: string;
  course_id?: string | null;
  course_name: string;
  exam_date: string;
  start_time: string;
  end_time: string;
  room?: string | null;
  description?: string | null;
  created_at: string;
}

interface ChildContext {
  student: Student;
  classId: string | null;
  className: string;
}

type ParentTab = 'overview' | 'grades' | 'homework' | 'schedule' | 'attendance' | 'reports' | 'meetings' | 'health' | 'fees' | 'announcements' | 'message';
type ParentSection = 'overview' | 'schoolwork' | 'attendance' | 'finance' | 'communication';

const parentSectionOrder: ParentSection[] = ['overview', 'schoolwork', 'attendance', 'finance', 'communication'];
const parentTabsBySection: Record<ParentSection, ParentTab[]> = {
  overview: ['overview'],
  schoolwork: ['grades', 'homework'],
  attendance: ['attendance', 'schedule', 'health'],
  finance: ['reports', 'fees'],
  communication: ['message', 'announcements', 'meetings'],
};
const parentTabSections = Object.fromEntries(
  Object.entries(parentTabsBySection).flatMap(([section, tabs]) =>
    tabs.map((tab) => [tab, section as ParentSection]),
  ),
) as Record<ParentTab, ParentSection>;

function localeToIntl(locale: Locale) {
  if (locale === 'ar') return 'ar-DZ';
  if (locale === 'en') return 'en-US';
  return 'fr-DZ';
}

function formatDayOfWeek(dayIndex: number, locale: Locale): string {
  const days: Record<Locale, string[]> = {
    fr: ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'],
    ar: ['الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت', 'الأحد'],
    en: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
  };
  return days[locale]?.[dayIndex] ?? days.fr[dayIndex] ?? `Jour ${dayIndex}`;
}

function formatDate(value: string, locale: Locale): string {
  const plainDateMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const parsed = plainDateMatch
    ? new Date(Number(plainDateMatch[1]), Number(plainDateMatch[2]) - 1, Number(plainDateMatch[3]))
    : new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat(localeToIntl(locale), { day: '2-digit', month: 'short' }).format(parsed);
}

function formatClock(value: string, locale: Locale): string {
  const [hours, minutes] = value.split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return value;
  const parsed = new Date();
  parsed.setHours(hours, minutes, 0, 0);
  return new Intl.DateTimeFormat(localeToIntl(locale), { hour: '2-digit', minute: '2-digit' }).format(parsed);
}

function gradeOnTwenty(grade: Grade): number {
  if (typeof grade.normalized_score === 'number') return grade.normalized_score;
  if (!grade.max_score) return grade.score;
  return (grade.score / grade.max_score) * 20;
}

function gradeCoefficient(grade: Grade): number {
  return grade.coefficient && grade.coefficient > 0 ? grade.coefficient : 1;
}

function weightedAverage(grades: Grade[]): number | null {
  if (grades.length === 0) return null;
  const modules = new Map<string, { coefficient: number; scores: number[] }>();
  for (const grade of grades) {
    const key = grade.course_id || grade.subject.trim().toLowerCase() || grade.id;
    const current = modules.get(key) ?? { coefficient: gradeCoefficient(grade), scores: [] };
    current.coefficient = gradeCoefficient(grade);
    current.scores.push(gradeOnTwenty(grade));
    modules.set(key, current);
  }

  let weightedTotal = 0;
  let coefficientTotal = 0;
  for (const module of modules.values()) {
    if (module.scores.length === 0) continue;
    const moduleAverage = module.scores.reduce((total, score) => total + score, 0) / module.scores.length;
    weightedTotal += moduleAverage * module.coefficient;
    coefficientTotal += module.coefficient;
  }

  return coefficientTotal > 0 ? weightedTotal / coefficientTotal : null;
}

function normalizeHomeworkKind(value: string | undefined | null): HomeworkKind {
  return value === 'assignment' || value === 'exam' ? value : 'homework';
}

export default function ParentDashboard() {
  const { t, locale } = useLocale();
  const [activeChildId, setActiveChildId] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<ParentTab>('overview');
  const [scheduleSubView, setScheduleSubView] = useState<'weekly' | 'exams'>('weekly');

  const childrenQuery = useQuery<Student[]>({
    queryKey: ['parent', 'children'],
    queryFn: async () => {
      const response = await api.get('/users/students/me');
      return response.data;
    },
  });

  const classesQuery = useQuery<SchoolClass[]>({
    queryKey: ['parent', 'classes'],
    queryFn: async () => {
      const response = await api.get('/classes/');
      return response.data;
    },
  });

  const childContexts = useMemo<ChildContext[]>(() => {
    const classes = classesQuery.data ?? [];
    return (childrenQuery.data ?? []).map((student) => {
      const schoolClass = classes.find((candidate) =>
        candidate.members?.some((member) => member.id === student.id),
      );
      return {
        student,
        classId: schoolClass?.id ?? null,
        className: schoolClass?.name ?? t('parent.unassignedClass'),
      };
    });
  }, [childrenQuery.data, classesQuery.data, t]);

  const activeChild = childContexts.find((child) => child.student.id === activeChildId) ?? childContexts[0];

  const gradesQuery = useQuery<Grade[]>({
    queryKey: ['parent', 'grades', activeChild?.classId, activeChild?.student.id],
    enabled: Boolean(activeChild?.classId && activeChild?.student.id),
    queryFn: async () => {
      const response = await api.get(`/classes/${activeChild?.classId}/grades/student/${activeChild?.student.id}`);
      return response.data;
    },
  });

  const attendanceQuery = useQuery<Attendance[]>({
    queryKey: ['parent', 'attendance', activeChild?.classId, activeChild?.student.id],
    enabled: Boolean(activeChild?.classId && activeChild?.student.id),
    queryFn: async () => {
      const response = await api.get(`/classes/${activeChild?.classId}/attendance/student/${activeChild?.student.id}`);
      return response.data;
    },
  });

  const homeworkQuery = useQuery<Homework[]>({
    queryKey: ['parent', 'homework', activeChild?.classId],
    enabled: Boolean(activeChild?.classId),
    queryFn: async () => {
      const response = await api.get(`/classes/${activeChild?.classId}/homework/`);
      return response.data;
    },
  });

  const examsQuery = useQuery<ScheduleExam[]>({
    queryKey: ['parent', 'schedule-exams', activeChild?.classId],
    enabled: Boolean(activeChild?.classId),
    queryFn: async () => {
      const response = await api.get(`/schedule/class/${activeChild?.classId}/exams`);
      return response.data;
    },
  });

  const scheduleSlotsQuery = useQuery<ScheduleSlot[]>({
    queryKey: ['parent', 'schedule-slots', activeChild?.classId],
    enabled: Boolean(activeChild?.classId),
    queryFn: async () => {
      const response = await api.get(`/schedule/class/${activeChild?.classId}`);
      return response.data;
    },
  });

  const grades = gradesQuery.data ?? [];
  const attendance = attendanceQuery.data ?? [];
  const homework = homeworkQuery.data ?? [];
  const exams = examsQuery.data ?? [];
  const average = weightedAverage(grades);
  const todayIso = new Date().toISOString().slice(0, 10);
  const upcomingExamsCount = exams.filter((item) => item.exam_date >= todayIso).length;
  const upcomingHomework = homework
    .filter((item) => item.due_date.slice(0, 10) >= todayIso)
    .slice()
    .sort((a, b) => a.due_date.localeCompare(b.due_date));
  const attendanceIssueCount = attendance.filter((item) => item.status !== 'present').length;
  const recentGrades = grades.slice(0, 3);
  const activeSection = parentTabSections[activeSubTab];
  const sectionLabels: Record<ParentSection, string> = {
    overview: t('parent.nav.overview'),
    schoolwork: t('parent.nav.schoolwork'),
    attendance: t('parent.nav.attendance'),
    finance: t('parent.nav.finance'),
    communication: t('parent.nav.communication'),
  };
  const tabLabels: Record<ParentTab, string> = {
    overview: t('parent.nav.overview'),
    grades: t('parent.tabGrades'),
    homework: t('parent.tabHomework'),
    schedule: t('parent.tabSchedule'),
    attendance: t('parent.tabAttendance'),
    reports: t('reportCards.tab'),
    meetings: t('meetings.tab'),
    health: t('health.tab'),
    fees: t('fees.tab'),
    announcements: t('announcements.tab'),
    message: t('parent.tabMessage'),
  };
  const tabIcons: Record<ParentTab, LucideIcon> = {
    overview: LayoutDashboard,
    grades: NotebookText,
    homework: ClipboardList,
    schedule: Calendar,
    attendance: CalendarCheck,
    reports: FileText,
    meetings: CalendarClock,
    health: HeartPulse,
    fees: Wallet,
    announcements: Megaphone,
    message: MessageSquare,
  };
  const sectionIcons: Record<ParentSection, LucideIcon> = {
    overview: LayoutDashboard,
    schoolwork: NotebookText,
    attendance: CalendarCheck,
    finance: FolderOpen,
    communication: MessageSquare,
  };

  const sortedSlots = useMemo(() => {
    return [...(scheduleSlotsQuery.data ?? [])].sort((a, b) => {
      if (a.day_of_week !== b.day_of_week) return a.day_of_week - b.day_of_week;
      return a.start_time.localeCompare(b.start_time);
    });
  }, [scheduleSlotsQuery.data]);

  const chartData = grades
    .slice()
    .reverse()
    .map((grade) => ({
      subject: grade.subject,
      score: Number(gradeOnTwenty(grade).toFixed(1)),
    }));

  const selectChild = (child: ChildContext) => {
    setActiveChildId(child.student.id);
  };

  const getStatusBadge = (status: Attendance['status']) => {
    switch (status) {
      case 'present':
        return <span className="badge badge-success">{t('parent.present')}</span>;
      case 'absent':
        return <span className="badge badge-danger">{t('parent.absent')}</span>;
      case 'late':
        return <span className="badge badge-warning">{t('parent.late')}</span>;
    }
  };

  const isLoading = childrenQuery.isLoading || classesQuery.isLoading;
  const loadError =
    childrenQuery.error ||
    classesQuery.error ||
    (activeSubTab === 'overview'
      ? gradesQuery.error || homeworkQuery.error || examsQuery.error || attendanceQuery.error
      : null) ||
    (activeSubTab === 'grades' ? gradesQuery.error : null) ||
    (activeSubTab === 'homework' ? homeworkQuery.error : null) ||
    (activeSubTab === 'schedule' ? examsQuery.error : null) ||
    (activeSubTab === 'attendance' ? attendanceQuery.error : null);

  return (
    <div className="container dashboard-page parent-page animate-fade-in">
      <header className="dashboard-header">
        <div className="badge dashboard-eyebrow">
          <HeartHandshake size={14} /> {t('parent.eyebrow')}
        </div>
        <h1>{t('parent.title')}</h1>
        <p>{t('parent.subtitle')}</p>
      </header>

      {loadError && (
        <div className="login-error" role="alert">
          {t('auth.connectionError')}
          <button
            className="btn btn-secondary btn-compact"
            type="button"
            onClick={() => {
              void childrenQuery.refetch();
              void classesQuery.refetch();
              void gradesQuery.refetch();
              void homeworkQuery.refetch();
              void examsQuery.refetch();
              void attendanceQuery.refetch();
            }}
          >
            <RefreshCw size={14} /> {t('common.reload')}
          </button>
        </div>
      )}

      {isLoading && <p className="empty-list-copy">{t('common.loading')}</p>}

      {!isLoading && childContexts.length === 0 && (
        <div className="glass-card dashboard-card-pad">
          <p className="empty-list-copy">{t('parent.emptyChildren')}</p>
        </div>
      )}

      {!isLoading && activeChild && (
        <>
          <div className="child-selector">
            {childContexts.map((child) => {
              const childAverage = child.student.id === activeChild.student.id ? average : null;
              return (
                <button
                  type="button"
                  key={child.student.id}
                  onClick={() => selectChild(child)}
                  className={`child-card child-card--row child-card-button ${activeChild.student.id === child.student.id ? 'child-card--active' : ''}`}
                  aria-label={t('parent.selectChildAria', {
                    name: child.student.full_name,
                    className: child.className,
                    average: childAverage?.toFixed(1) ?? '-',
                  })}
                  aria-pressed={activeChild.student.id === child.student.id}
                >
                  <div className="child-avatar">{child.student.full_name.charAt(0)}</div>
                  <div>
                    <div className="child-name">{child.student.full_name}</div>
                    <div className="child-class">{child.className}</div>
                  </div>
                  <div className="child-average">
                    <span className="child-average-label">{t('parent.average')}</span>
                    <h4 className="child-average-value">
                      {childAverage === null ? '-' : `${childAverage.toFixed(1)}/20`}
                    </h4>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="glass-card dashboard-card-pad">
            <div className="parent-primary-nav" role="tablist" aria-label={t('parent.tabsAria')}>
              {parentSectionOrder.map((section) => {
                const Icon = sectionIcons[section];
                const isActive = activeSection === section;
                return (
                  <button
                    key={section}
                    type="button"
                    className={`parent-section-button ${isActive ? 'parent-section-button--active' : ''}`}
                    onClick={() => setActiveSubTab(parentTabsBySection[section][0])}
                    role="tab"
                    aria-selected={isActive}
                  >
                    <Icon size={17} aria-hidden="true" />
                    <span>{sectionLabels[section]}</span>
                  </button>
                );
              })}
            </div>

            {activeSection !== 'overview' && (
              <div className="tab-bar parent-secondary-tabs" role="tablist" aria-label={t('parent.subtabsAria')}>
                {parentTabsBySection[activeSection].map((tab) => {
                  const Icon = tabIcons[tab];
                  const isActive = activeSubTab === tab;
                  return (
                    <button
                      key={tab}
                      type="button"
                      className={`tab-button ${isActive ? 'tab-button--active' : ''}`}
                      onClick={() => setActiveSubTab(tab)}
                      role="tab"
                      aria-selected={isActive}
                    >
                      <Icon size={14} aria-hidden="true" /> {tabLabels[tab]}
                    </button>
                  );
                })}
              </div>
            )}

            {!activeChild.classId && !['message', 'announcements', 'reports', 'meetings', 'health', 'fees'].includes(activeSubTab) && (
              <p className="empty-list-copy">{t('parent.unassignedChildClass')}</p>
            )}

            {activeChild.classId && activeSubTab === 'overview' && (
              <div className="animate-fade-in parent-overview" role="tabpanel">
                <DashboardActionGrid
                  title={t('parent.overview.title', { student: activeChild.student.full_name.split(' ')[0] })}
                  copy={t('parent.overview.copy')}
                  items={[
                    {
                      id: 'grades',
                      label: t('parent.overview.average'),
                      value: average === null ? '—' : `${average.toFixed(1)}/20`,
                      detail: t('parent.overview.gradesDetail'),
                      icon: NotebookText,
                      onClick: () => setActiveSubTab('grades'),
                    },
                    {
                      id: 'homework',
                      label: t('parent.overview.homework'),
                      value: upcomingHomework.length,
                      detail: upcomingHomework[0]
                        ? t('parent.overview.nextDue', { date: formatDate(upcomingHomework[0].due_date, locale) })
                        : t('parent.overview.noUpcomingHomework'),
                      icon: ClipboardList,
                      onClick: () => setActiveSubTab('homework'),
                      tone: upcomingHomework.length > 0 ? 'warning' : 'success',
                    },
                    {
                      id: 'attendance',
                      label: t('parent.overview.attendance'),
                      value: attendanceIssueCount,
                      detail: attendanceIssueCount > 0
                        ? t('parent.overview.attendanceDetail', { count: attendanceIssueCount })
                        : t('parent.overview.attendanceClear'),
                      icon: CalendarCheck,
                      onClick: () => setActiveSubTab('attendance'),
                      tone: attendanceIssueCount > 0 ? 'danger' : 'success',
                    },
                    {
                      id: 'exams',
                      label: t('parent.overview.exams'),
                      value: upcomingExamsCount,
                      detail: t('parent.overview.examsDetail'),
                      icon: Calendar,
                      onClick: () => {
                        setScheduleSubView('exams');
                        setActiveSubTab('schedule');
                      },
                    },
                  ]}
                />

                <div className="parent-overview-columns">
                  <section className="parent-overview-section" aria-labelledby="parent-next-homework">
                    <div className="parent-overview-section-heading">
                      <h3 id="parent-next-homework">{t('parent.overview.nextTitle')}</h3>
                      <button type="button" className="btn btn-secondary btn-compact" onClick={() => setActiveSubTab('homework')}>
                        {t('parent.overview.viewAll')}
                      </button>
                    </div>
                    {homeworkQuery.isLoading && <p className="empty-list-copy">{t('common.loading')}</p>}
                    {!homeworkQuery.isLoading && upcomingHomework.length === 0 && (
                      <p className="empty-list-copy">{t('parent.overview.emptyHomework')}</p>
                    )}
                    <div className="parent-overview-list">
                      {upcomingHomework.slice(0, 3).map((item) => (
                        <article key={item.id} className="parent-overview-record">
                          <div className="parent-overview-record-meta">
                            <span>{item.subject}</span>
                            <time dateTime={item.due_date}>{formatDate(item.due_date, locale)}</time>
                          </div>
                          <p>{item.homework_content}</p>
                        </article>
                      ))}
                    </div>
                  </section>

                  <section className="parent-overview-section" aria-labelledby="parent-latest-grades">
                    <div className="parent-overview-section-heading">
                      <h3 id="parent-latest-grades">{t('parent.overview.latestTitle')}</h3>
                      <button type="button" className="btn btn-secondary btn-compact" onClick={() => setActiveSubTab('grades')}>
                        {t('parent.overview.viewAll')}
                      </button>
                    </div>
                    {gradesQuery.isLoading && <p className="empty-list-copy">{t('common.loading')}</p>}
                    {!gradesQuery.isLoading && recentGrades.length === 0 && (
                      <p className="empty-list-copy">{t('parent.overview.emptyGrades')}</p>
                    )}
                    <div className="parent-overview-list">
                      {recentGrades.map((grade) => (
                        <div key={grade.id} className="parent-overview-record parent-overview-grade">
                          <div>
                            <strong>{grade.subject}</strong>
                            <span>{formatDate(grade.date, locale)}</span>
                          </div>
                          <strong className="parent-overview-grade-value">{gradeOnTwenty(grade).toFixed(1)}/20</strong>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              </div>
            )}

            {activeChild.classId && activeSubTab === 'grades' && (
              <div className="animate-fade-in dashboard-split dashboard-split--grades" role="tabpanel">
                <div>
                  <div className="dashboard-toolbar">
                    <h3 className="dashboard-section-title dashboard-section-title--plain">{t('parent.chartTitle')}</h3>
                    <span className="dashboard-section-copy">
                      {t('parent.latestEvaluations', { student: activeChild.student.full_name.split(' ')[0] })}
                    </span>
                  </div>
                  <div className="chart-panel" aria-label={t('parent.progressChartAria', { student: activeChild.student.full_name })}>
                    {chartData.length === 0 ? (
                      <p className="empty-list-copy">{t('parent.emptyApprovedGrades')}</p>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
                          <XAxis dataKey="subject" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                          <YAxis domain={[0, 20]} stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                          <Tooltip contentStyle={{ background: 'var(--surface-color)', borderColor: 'var(--surface-border)', color: 'var(--text-primary)' }} />
                          <Line type="monotone" dataKey="score" stroke="var(--primary)" strokeWidth={3} dot={{ r: 5, fill: 'var(--surface-color)', strokeWidth: 2 }} activeDot={{ r: 7 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="dashboard-section-title">{t('parent.detailedGrades')}</h3>
                  <div className="dashboard-list">
                    {grades.length === 0 && <p className="empty-list-copy">{t('parent.emptyGrades')}</p>}
                    {grades.map((grade) => {
                      const score = gradeOnTwenty(grade);
                      return (
                        <div key={grade.id} className="student-list-item">
                          <div>
                            <span className="grade-subject">{grade.subject}</span>
                            <div className="grade-date">{t('parent.publishedOn', { date: formatDate(grade.date, locale) })}</div>
                          </div>
                          <div className="grade-score-row">
                            <span className="grade-score">{score.toFixed(1)}/20</span>
                            {score >= 14 && <Award size={16} color="var(--success)" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {activeChild.classId && activeSubTab === 'homework' && (
              <div className="animate-fade-in" role="tabpanel">
                <div className="dashboard-toolbar">
                  <div>
                    <h3 className="dashboard-section-title dashboard-section-title--plain">{t('parent.homeworkTitle')}</h3>
                    <p className="dashboard-section-copy">
                      {t('parent.homeworkCopy', { className: activeChild.className })}
                    </p>
                  </div>
                  <span className="badge badge-success">
                    {t('parent.homeworkCount', { count: homework.length })}
                  </span>
                </div>

                <div className="dashboard-list homework-parent-list">
                  {homeworkQuery.isLoading && <p className="empty-list-copy">{t('common.loading')}</p>}
                  {!homeworkQuery.isLoading && homework.length === 0 && (
                    <p className="empty-list-copy">{t('parent.emptyHomework')}</p>
                  )}
                  {homework.map((item) => {
                    const kind = normalizeHomeworkKind(item.kind);
                    return (
                      <div key={item.id} className="homework-announcement-card homework-announcement-card--parent">
                        <div className="homework-announcement-header">
                          <span className="badge badge-compact badge-success">{t(`parent.homeworkKind.${kind}`)}</span>
                          <span className="homework-due-date">
                            {t('parent.homeworkDueOn', { date: formatDate(item.due_date, locale) })}
                          </span>
                        </div>
                        <h4>{item.subject}</h4>
                        <p>{item.homework_content}</p>
                        {item.lesson_content && (
                          <div className="homework-preparation-note">
                            {t('parent.homeworkPreparation')}: {item.lesson_content}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeChild.classId && activeSubTab === 'schedule' && (
              <div className="animate-fade-in" role="tabpanel">
                <div className="dashboard-toolbar">
                  <div>
                    <h3 className="dashboard-section-title dashboard-section-title--plain">{t('parent.scheduleTitle')}</h3>
                    <p className="dashboard-section-copy">
                      {t('parent.scheduleCopy', { className: activeChild.className })}
                    </p>
                  </div>
                  <div className="schedule-summary-badges">
                    <span className="badge badge-primary">
                      {t('parent.scheduleSlotsCount', { count: sortedSlots.length })}
                    </span>
                    <span className="badge badge-success">
                      {t('parent.scheduleExamCount', { count: upcomingExamsCount })}
                    </span>
                  </div>
                </div>

                <div className="tab-bar parent-schedule-tabs">
                  <button
                    type="button"
                    onClick={() => setScheduleSubView('weekly')}
                    className={`tab-button ${scheduleSubView === 'weekly' ? 'tab-button--active' : ''}`}
                  >
                    <Calendar size={14} /> {t('parent.scheduleWeeklyTab')} ({sortedSlots.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setScheduleSubView('exams')}
                    className={`tab-button ${scheduleSubView === 'exams' ? 'tab-button--active' : ''}`}
                  >
                    <NotebookText size={14} /> {t('parent.scheduleExamsTab')} ({exams.length})
                  </button>
                </div>

                {scheduleSubView === 'weekly' && (
                  <div>
                    {scheduleSlotsQuery.isLoading && <p className="empty-list-copy">{t('common.loading')}</p>}
                    {!scheduleSlotsQuery.isLoading && sortedSlots.length === 0 && (
                      <p className="empty-list-copy">{t('parent.emptyScheduleWeekly')}</p>
                    )}
                    {!scheduleSlotsQuery.isLoading && sortedSlots.length > 0 && (
                      <div className="premium-table-wrapper">
                        <table className="premium-table">
                          <thead>
                            <tr>
                              <th>{t('parent.scheduleDay')}</th>
                              <th>{t('parent.scheduleTime')}</th>
                              <th>{t('parent.scheduleCourse')}</th>
                              <th>{t('parent.scheduleTeacher')}</th>
                              <th>{t('parent.scheduleRoomCol')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sortedSlots.map((slot) => {
                              const dayLabel = formatDayOfWeek(slot.day_of_week, locale);
                              const isCancelledToday = slot.cancellations?.some(
                                (c) => c.cancelled_date === todayIso,
                              );
                              return (
                                <tr key={slot.id}>
                                  <td className="table-cell-primary">
                                    <span className="badge badge-compact badge-primary schedule-day-badge">
                                      {dayLabel}
                                    </span>
                                  </td>
                                  <td className="schedule-time-cell">
                                    {formatClock(slot.start_time, locale)} - {formatClock(slot.end_time, locale)}
                                  </td>
                                  <td className="table-cell-strong">
                                    {slot.course_name}
                                    {isCancelledToday && (
                                      <span className="badge badge-danger schedule-cancelled-badge">
                                        {t('parent.scheduleCancelled')}
                                      </span>
                                    )}
                                  </td>
                                  <td className="schedule-teacher-cell">
                                    {slot.teacher_name || '-'}
                                  </td>
                                  <td>
                                    <span className="badge badge-compact">{slot.room || '-'}</span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {scheduleSubView === 'exams' && (
                  <div className="dashboard-list homework-parent-list">
                    {examsQuery.isLoading && <p className="empty-list-copy">{t('common.loading')}</p>}
                    {!examsQuery.isLoading && exams.length === 0 && (
                      <p className="empty-list-copy">{t('parent.emptyScheduleExams')}</p>
                    )}
                    {exams.map((exam) => (
                      <div key={exam.id} className="homework-announcement-card homework-announcement-card--parent exam-schedule-card">
                        <div className="homework-announcement-header">
                          <span className="badge badge-compact badge-success">{formatDate(exam.exam_date, locale)}</span>
                          <span className="homework-due-date">
                            {formatClock(exam.start_time, locale)} - {formatClock(exam.end_time, locale)}
                          </span>
                        </div>
                        <h4>{exam.course_name}</h4>
                        <p>{t('parent.scheduleExamFor', { className: activeChild.className })}</p>
                        {exam.room && (
                          <div className="homework-preparation-note">
                            {t('parent.scheduleRoom')}: {exam.room}
                          </div>
                        )}
                        {exam.description && (
                          <div className="homework-preparation-note">
                            {t('parent.scheduleInstructions')}: {exam.description}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeChild.classId && activeSubTab === 'attendance' && (
              <div className="animate-fade-in" role="tabpanel">
                <div className="metric-grid metric-grid--three">
                  <div className="metric-item metric-item--success">
                    <div className="metric-label metric-label-strong">{t('parent.daysPresence')}</div>
                    <div className="metric-value metric-value--success">
                      {attendance.filter((item) => item.status === 'present').length}
                    </div>
                  </div>
                  <div className="metric-item metric-item--danger">
                    <div className="metric-label metric-label-strong">{t('parent.absences')}</div>
                    <div className="metric-value metric-value--danger">
                      {attendance.filter((item) => item.status === 'absent').length}
                    </div>
                  </div>
                  <div className="metric-item metric-item--warning">
                    <div className="metric-label metric-label-strong">{t('parent.lateness')}</div>
                    <div className="metric-value metric-value--warning">
                      {attendance.filter((item) => item.status === 'late').length}
                    </div>
                  </div>
                </div>

                <h3 className="dashboard-section-title">{t('parent.eventsHistory')}</h3>
                <div className="premium-table-wrapper">
                  <table className="premium-table">
                    <thead>
                      <tr>
                        <th>{t('parent.date')}</th>
                        <th>{t('parent.statusPresence')}</th>
                        <th>{t('parent.detailsJustification')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendance.length === 0 && (
                        <tr>
                          <td colSpan={3} className="table-cell-muted-italic">{t('parent.noEvent')}</td>
                        </tr>
                      )}
                      {attendance.map((item) => (
                        <tr key={item.id}>
                          <td className="table-cell-strong">{formatDate(item.date, locale)}</td>
                          <td>{getStatusBadge(item.status)}</td>
                          <td className={item.justification_text || item.note ? undefined : 'table-cell-muted-italic'}>
                            {item.justification_text || item.note || t('parent.noEvent')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeSubTab === 'message' && <DirectMessagingPanel scopeKey="parent" />}
            {activeSubTab === 'reports' && <ParentReportCardsPanel studentId={activeChild.student.id} />}
            {activeSubTab === 'meetings' && <ParentMeetingsPanel studentId={activeChild.student.id} />}
            {activeSubTab === 'health' && (
              <div className="animate-fade-in" role="tabpanel">
                <HealthRecordForm key={activeChild.student.id} studentId={activeChild.student.id} mode="parent" />
              </div>
            )}
            {activeSubTab === 'fees' && <ParentFeesPanel key={activeChild.student.id} studentId={activeChild.student.id} />}
            {activeSubTab === 'announcements' && (
              <AnnouncementsPanel
                scopeKey="parent"
                canCreate={false}
                allowWholeSchool={false}
                classes={childContexts
                  .filter((child) => child.classId)
                  .map((child) => ({ id: child.classId as string, name: child.className }))}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
