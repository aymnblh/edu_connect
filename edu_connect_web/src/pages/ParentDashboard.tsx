import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Award,
  CalendarCheck,
  ClipboardList,
  HeartHandshake,
  MessageSquare,
  NotebookText,
  RefreshCw,
  Send,
  Sparkles,
} from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../lib/api';
import { useLocale, type Locale } from '../lib/i18n';
import { buildClassWebSocketUrl } from '../lib/realtime';

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

interface ClassMessage {
  id: string;
  class_id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  is_announcement: boolean;
  created_at: string;
}

interface ChildContext {
  student: Student;
  classId: string | null;
  className: string;
}

function localeToIntl(locale: Locale) {
  if (locale === 'ar') return 'ar-DZ';
  if (locale === 'en') return 'en-US';
  return 'fr-DZ';
}

function formatDate(value: string, locale: Locale): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat(localeToIntl(locale), { day: '2-digit', month: 'short' }).format(parsed);
}

function formatTime(value: string, locale: Locale): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
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

function dedupeMessages(messages: ClassMessage[]): ClassMessage[] {
  const byId = new Map<string, ClassMessage>();
  for (const message of messages) {
    byId.set(message.id, message);
  }
  return [...byId.values()].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
}

export default function ParentDashboard() {
  const { t, locale } = useLocale();
  const [activeChildId, setActiveChildId] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'grades' | 'homework' | 'attendance' | 'message'>('grades');
  const [typedMessage, setTypedMessage] = useState('');
  const [liveMessages, setLiveMessages] = useState<ClassMessage[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<WebSocket | null>(null);

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

  const messagesQuery = useQuery<ClassMessage[]>({
    queryKey: ['parent', 'messages', activeChild?.classId],
    enabled: Boolean(activeChild?.classId),
    queryFn: async () => {
      const response = await api.get(`/classes/${activeChild?.classId}/messages`);
      return response.data;
    },
  });

  const grades = gradesQuery.data ?? [];
  const attendance = attendanceQuery.data ?? [];
  const homework = homeworkQuery.data ?? [];
  const messages = useMemo(
    () => dedupeMessages([...(messagesQuery.data ?? []), ...liveMessages.filter((message) => message.class_id === activeChild?.classId)]),
    [activeChild?.classId, liveMessages, messagesQuery.data],
  );
  const average = weightedAverage(grades);

  const chartData = grades
    .slice()
    .reverse()
    .map((grade) => ({
      subject: grade.subject,
      score: Number(gradeOnTwenty(grade).toFixed(1)),
    }));

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!activeChild?.classId || activeSubTab !== 'message') {
      socketRef.current?.close();
      socketRef.current = null;
      return undefined;
    }

    const socket = new WebSocket(buildClassWebSocketUrl(activeChild.classId));
    socketRef.current = socket;
    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(String(event.data)) as ClassMessage | { error?: string };
        if ('error' in message) return;
        if ('id' in message) {
          setLiveMessages((current) => dedupeMessages([...current, message]));
        }
      } catch {
        // The next REST refresh will recover malformed transient messages.
      }
    };
    socket.onclose = () => {
      if (socketRef.current === socket) {
        socketRef.current = null;
      }
    };

    return () => {
      socket.close();
      if (socketRef.current === socket) {
        socketRef.current = null;
      }
    };
  }, [activeChild?.classId, activeSubTab]);

  const selectChild = (child: ChildContext) => {
    setActiveChildId(child.student.id);
  };

  const handleSendMessage = (event: React.FormEvent) => {
    event.preventDefault();
    const content = typedMessage.trim();
    if (!content || socketRef.current?.readyState !== WebSocket.OPEN) return;
    socketRef.current.send(JSON.stringify({ content }));
    setTypedMessage('');
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
    (activeSubTab === 'grades' ? gradesQuery.error : null) ||
    (activeSubTab === 'homework' ? homeworkQuery.error : null) ||
    (activeSubTab === 'attendance' ? attendanceQuery.error : null) ||
    (activeSubTab === 'message' ? messagesQuery.error : null);

  return (
    <div className="container animate-fade-in">
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
              void attendanceQuery.refetch();
              void messagesQuery.refetch();
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
            <div className="tab-bar dashboard-tabs" role="tablist" aria-label={t('parent.tabsAria')}>
              <button
                onClick={() => setActiveSubTab('grades')}
                className={`tab-button ${activeSubTab === 'grades' ? 'tab-button--active' : ''}`}
                role="tab"
                aria-selected={activeSubTab === 'grades'}
              >
                <NotebookText size={14} /> {t('parent.tabGrades')}
              </button>
              <button
                onClick={() => setActiveSubTab('homework')}
                className={`tab-button ${activeSubTab === 'homework' ? 'tab-button--active' : ''}`}
                role="tab"
                aria-selected={activeSubTab === 'homework'}
              >
                <ClipboardList size={14} /> {t('parent.tabHomework')}
              </button>
              <button
                onClick={() => setActiveSubTab('attendance')}
                className={`tab-button ${activeSubTab === 'attendance' ? 'tab-button--active' : ''}`}
                role="tab"
                aria-selected={activeSubTab === 'attendance'}
              >
                <CalendarCheck size={14} /> {t('parent.tabAttendance')}
              </button>
              <button
                onClick={() => setActiveSubTab('message')}
                className={`tab-button ${activeSubTab === 'message' ? 'tab-button--active' : ''}`}
                role="tab"
                aria-selected={activeSubTab === 'message'}
              >
                <MessageSquare size={14} /> {t('parent.tabMessage')}
              </button>
            </div>

            {!activeChild.classId && (
              <p className="empty-list-copy">{t('parent.unassignedChildClass')}</p>
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
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,118,110,0.12)" vertical={false} />
                          <XAxis dataKey="subject" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                          <YAxis domain={[0, 20]} stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                          <Tooltip contentStyle={{ background: '#FFFFFF', borderColor: 'var(--surface-border)', color: 'var(--text-primary)' }} />
                          <Line type="monotone" dataKey="score" stroke="var(--primary)" strokeWidth={3} dot={{ r: 5, fill: '#FFFFFF', strokeWidth: 2 }} activeDot={{ r: 7 }} />
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

            {activeChild.classId && activeSubTab === 'message' && (
              <div className="animate-fade-in dashboard-split dashboard-split--chat" role="tabpanel">
                <div className="dashboard-side">
                  <h3 className="dashboard-section-title">{t('parent.messaging')}</h3>
                  <div className="class-card class-card--active contact-card" role="group">
                    <div className="contact-avatar">{activeChild.className.slice(0, 2).toUpperCase()}</div>
                    <div>
                      <h4 className="contact-name">{activeChild.className}</h4>
                      <p className="contact-preview">{messages.at(-1)?.content || t('parent.noMessagePreview')}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="dashboard-toolbar">
                    <div>
                      <h3 className="dashboard-section-title dashboard-section-title--plain">{activeChild.className}</h3>
                      <p className="dashboard-section-copy">{t('parent.onlineTeacher', { student: activeChild.student.full_name.split(' ')[0] })}</p>
                    </div>
                    <span className="badge badge-success badge-inline">
                      <Sparkles size={10} /> {t('parent.responseIn')}
                    </span>
                  </div>

                  <div className="chat-sim-container" aria-label={t('parent.messagesAria')}>
                    <div className="chat-sim-messages">
                      {messages.length === 0 && <p className="empty-list-copy">{t('parent.emptyMessages')}</p>}
                      {messages.map((message) => (
                        <div key={message.id} className="chat-sim-bubble chat-sim-bubble-incoming">
                          <div className="chat-message-header chat-message-header--incoming">{message.sender_name}</div>
                          <div>{message.content}</div>
                          <div className="chat-message-time">{formatTime(message.created_at, locale)}</div>
                        </div>
                      ))}
                      <div ref={chatEndRef} />
                    </div>

                    <form onSubmit={handleSendMessage} className="chat-sim-input-bar">
                      <input
                        type="text"
                        className="input-field chat-input-field"
                        value={typedMessage}
                        onChange={(event) => setTypedMessage(event.target.value)}
                        placeholder={t('parent.messagePlaceholder')}
                        aria-label={t('parent.writeMessage')}
                      />
                      <button
                        type="submit"
                        className="btn btn-primary btn-icon-square"
                        aria-label={t('parent.sendMessage')}
                        disabled={!typedMessage.trim()}
                      >
                        <Send size={16} />
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
