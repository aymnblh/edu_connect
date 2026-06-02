import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BookOpen,
  Calendar,
  MessageSquare,
  RefreshCw,
  Send,
  UserCheck,
  Users,
} from 'lucide-react';
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

interface ScheduleSlot {
  id: string;
  class_id: string;
  course_name: string;
  teacher_name?: string | null;
  day_of_week: number;
  day_name: string;
  start_time: string;
  end_time: string;
  room?: string | null;
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

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'warning';
  exiting?: boolean;
}

let toastId = 0;

function localeToIntl(locale: Locale) {
  if (locale === 'ar') return 'ar-DZ';
  if (locale === 'en') return 'en-US';
  return 'fr-DZ';
}

function formatTime(value: string, locale: Locale): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return new Intl.DateTimeFormat(localeToIntl(locale), { hour: '2-digit', minute: '2-digit' }).format(parsed);
}

function formatClock(value: string, locale: Locale): string {
  const [hours, minutes] = value.split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return value;
  const parsed = new Date();
  parsed.setHours(hours, minutes, 0, 0);
  return new Intl.DateTimeFormat(localeToIntl(locale), { hour: '2-digit', minute: '2-digit' }).format(parsed);
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

export default function TeacherDashboard() {
  const [activeTab, setActiveTab] = useState<'classes' | 'schedule' | 'chat'>('classes');
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [attendanceState, setAttendanceState] = useState<Record<string, 'present' | 'absent'>>({});
  const [typedMessage, setTypedMessage] = useState('');
  const [liveMessages, setLiveMessages] = useState<ClassMessage[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const queryClient = useQueryClient();
  const { t, locale } = useLocale();

  const classesQuery = useQuery<SchoolClass[]>({
    queryKey: ['teacher', 'classes'],
    queryFn: async () => {
      const response = await api.get('/classes/');
      return response.data;
    },
  });

  const classes = classesQuery.data ?? [];
  const selectedClass = classes.find((schoolClass) => schoolClass.id === selectedClassId) ?? classes[0];

  const studentsQuery = useQuery<Student[]>({
    queryKey: ['teacher', 'students', selectedClass?.id],
    enabled: Boolean(selectedClass?.id),
    queryFn: async () => {
      const response = await api.get(`/classes/${selectedClass?.id}/students`);
      return response.data;
    },
  });

  const scheduleQuery = useQuery<ScheduleSlot[]>({
    queryKey: ['teacher', 'schedule', classes.map((schoolClass) => schoolClass.id).join('|')],
    enabled: classes.length > 0,
    queryFn: async () => {
      const responses = await Promise.all(
        classes.map(async (schoolClass) => {
          const response = await api.get(`/schedule/class/${schoolClass.id}`);
          return response.data as ScheduleSlot[];
        }),
      );
      return responses.flat();
    },
  });

  const messagesQuery = useQuery<ClassMessage[]>({
    queryKey: ['teacher', 'messages', selectedClass?.id],
    enabled: Boolean(selectedClass?.id),
    queryFn: async () => {
      const response = await api.get(`/classes/${selectedClass?.id}/messages`);
      return response.data;
    },
  });

  const students = studentsQuery.data ?? selectedClass?.members ?? [];
  const schedule = scheduleQuery.data ?? [];
  const messages = useMemo(
    () => dedupeMessages([...(messagesQuery.data ?? []), ...liveMessages.filter((message) => message.class_id === selectedClass?.id)]),
    [liveMessages, messagesQuery.data, selectedClass?.id],
  );

  const addToast = useCallback((message: string, type: Toast['type']) => {
    const id = ++toastId;
    setToasts((current) => [...current, { id, message, type }]);
    window.setTimeout(() => {
      setToasts((current) => current.map((toast) => (toast.id === id ? { ...toast, exiting: true } : toast)));
      window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 300);
    }, 3500);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.map((toast) => (toast.id === id ? { ...toast, exiting: true } : toast)));
    window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 300);
  }, []);

  const saveAttendanceMutation = useMutation({
    mutationFn: async () => {
      if (!selectedClass) throw new Error(t('teacher.classNotFound'));
      const missing = students.filter((student) => !attendanceState[student.id]);
      if (missing.length > 0) {
        throw new Error(t('teacher.toastIncomplete'));
      }
      await Promise.all(
        students.map((student) =>
          api.post(`/classes/${selectedClass.id}/attendance/`, {
            student_id: student.id,
            student_name: student.full_name,
            status: attendanceState[student.id],
          }),
        ),
      );
    },
    onSuccess: () => {
      addToast(t('teacher.toastSaved'), 'success');
      void queryClient.invalidateQueries({ queryKey: ['teacher', 'students', selectedClass?.id] });
    },
    onError: (error) => {
      addToast(error instanceof Error ? error.message : t('auth.connectionError'), 'error');
    },
  });

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!selectedClass?.id || activeTab !== 'chat') {
      socketRef.current?.close();
      socketRef.current = null;
      return undefined;
    }

    const socket = new WebSocket(buildClassWebSocketUrl(selectedClass.id));
    socketRef.current = socket;
    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(String(event.data)) as ClassMessage | { error?: string };
        if ('error' in message && message.error) {
          addToast(message.error, 'error');
          return;
        }
        if ('id' in message) {
          setLiveMessages((current) => dedupeMessages([...current, message]));
        }
      } catch {
        addToast(t('auth.connectionError'), 'error');
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
  }, [activeTab, addToast, selectedClass?.id, t]);

  const selectClass = (schoolClass: SchoolClass) => {
    setSelectedClassId(schoolClass.id);
    setAttendanceState({});
  };

  const toggleAttendance = (student: Student, status: 'present' | 'absent') => {
    setAttendanceState((current) => ({
      ...current,
      [student.id]: status,
    }));
  };

  const handleSendMessage = (event: React.FormEvent) => {
    event.preventDefault();
    const content = typedMessage.trim();
    if (!content) return;

    if (socketRef.current?.readyState !== WebSocket.OPEN) {
      addToast(t('teacher.socketConnecting'), 'warning');
      return;
    }

    socketRef.current.send(JSON.stringify({ content }));
    setTypedMessage('');
  };

  const isLoading = classesQuery.isLoading || studentsQuery.isLoading;
  const loadError = classesQuery.error || studentsQuery.error || scheduleQuery.error || messagesQuery.error;

  return (
    <div className="container animate-fade-in">
      {toasts.length > 0 && (
        <div className="toast-container" aria-live="polite">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`toast toast-${toast.type} ${toast.exiting ? 'toast-exit' : ''}`}
              onClick={() => dismissToast(toast.id)}
              role="alert"
            >
              {toast.message}
            </div>
          ))}
        </div>
      )}

      <header className="dashboard-header">
        <div className="badge dashboard-eyebrow">
          <BookOpen size={14} /> {t('teacher.eyebrow')}
        </div>
        <h1>{t('teacher.title')}</h1>
        <p>{t('teacher.subtitle')}</p>
      </header>

      <div className="tab-bar dashboard-tabs" role="tablist" aria-label={t('teacher.tabsAria')}>
        <button
          onClick={() => setActiveTab('classes')}
          className={`tab-button ${activeTab === 'classes' ? 'tab-button--active' : ''}`}
          role="tab"
          aria-selected={activeTab === 'classes'}
        >
          <Users size={16} /> {t('teacher.tabClasses')}
        </button>
        <button
          onClick={() => setActiveTab('schedule')}
          className={`tab-button ${activeTab === 'schedule' ? 'tab-button--active' : ''}`}
          role="tab"
          aria-selected={activeTab === 'schedule'}
        >
          <Calendar size={16} /> {t('teacher.tabSchedule')}
        </button>
        <button
          onClick={() => setActiveTab('chat')}
          className={`tab-button ${activeTab === 'chat' ? 'tab-button--active' : ''}`}
          role="tab"
          aria-selected={activeTab === 'chat'}
        >
          <MessageSquare size={16} /> {t('teacher.tabChat')}
        </button>
      </div>

      <div className="glass-card dashboard-card-pad">
        {loadError && (
          <div className="login-error" role="alert">
            {t('auth.connectionError')}
            <button className="btn btn-secondary btn-compact" type="button" onClick={() => void queryClient.invalidateQueries()}>
              <RefreshCw size={14} /> {t('common.reload')}
            </button>
          </div>
        )}

        {isLoading && <p className="empty-list-copy">{t('common.loading')}</p>}

        {!isLoading && classes.length === 0 && (
          <p className="empty-list-copy">{t('teacher.emptyClasses')}</p>
        )}

        {!isLoading && selectedClass && activeTab === 'classes' && (
          <div className="animate-fade-in dashboard-split" role="tabpanel">
            <div className="dashboard-side">
              <h3 className="dashboard-section-title">{t('teacher.assignedClasses')}</h3>
              <div className="dashboard-list">
                {classes.map((schoolClass) => (
                  <button
                    type="button"
                    key={schoolClass.id}
                    onClick={() => selectClass(schoolClass)}
                    className={`class-card class-card-button ${selectedClass.id === schoolClass.id ? 'class-card--active' : ''}`}
                    aria-label={t('teacher.selectClassAria', {
                      name: schoolClass.name,
                      subject: schoolClass.subject || t('teacher.class'),
                    })}
                  >
                    <h4 className="class-card-title">{schoolClass.name}</h4>
                    <p className="class-card-subtitle">{schoolClass.subject || t('teacher.class')}</p>
                    <div className="class-card-meta">
                      <span>{t('teacher.studentsCount', { count: schoolClass.members?.length ?? 0 })}</span>
                      <span className="class-card-metric">{schoolClass.subject || '-'}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="dashboard-toolbar">
                <div>
                  <h3 className="dashboard-section-title dashboard-section-title--plain">{t('teacher.attendanceTitle')}</h3>
                  <p className="dashboard-section-copy">{t('teacher.attendanceCopy', { className: selectedClass.name })}</p>
                </div>
                <button
                  className="btn btn-primary btn-compact"
                  aria-label={t('teacher.saveAttendance')}
                  disabled={saveAttendanceMutation.isPending || students.length === 0}
                  onClick={() => saveAttendanceMutation.mutate()}
                >
                  <UserCheck size={16} /> {t('teacher.saveAttendance')}
                </button>
              </div>

              {students.length === 0 ? (
                <p className="empty-list-copy">{t('teacher.emptyStudents')}</p>
              ) : (
                <div className="premium-table-wrapper">
                  <table className="premium-table">
                    <thead>
                      <tr>
                        <th>{t('teacher.studentName')}</th>
                        <th className="table-heading-center">{t('teacher.presence')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student) => {
                        const status = attendanceState[student.id];
                        return (
                          <tr key={student.id}>
                            <td className="table-cell-strong">{student.full_name}</td>
                            <td className="attendance-choice-cell">
                              <button
                                type="button"
                                onClick={() => toggleAttendance(student, 'present')}
                                className={`attendance-btn ${status === 'present' ? 'attendance-btn--present' : ''}`}
                                aria-label={t('teacher.markPresent', { student: student.full_name })}
                                aria-pressed={status === 'present'}
                              >
                                {t('teacher.present')}
                              </button>
                              <button
                                type="button"
                                onClick={() => toggleAttendance(student, 'absent')}
                                className={`attendance-btn ${status === 'absent' ? 'attendance-btn--absent' : ''}`}
                                aria-label={t('teacher.markAbsent', { student: student.full_name })}
                                aria-pressed={status === 'absent'}
                              >
                                {t('teacher.absent')}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {!isLoading && activeTab === 'schedule' && (
          <div className="animate-fade-in" role="tabpanel">
            <h3 className="dashboard-section-title dashboard-section-title--tight">{t('teacher.scheduleTitle')}</h3>
            <p className="dashboard-section-copy dashboard-section-copy--spaced">{t('teacher.scheduleCopy')}</p>

            {schedule.length === 0 ? (
              <p className="empty-list-copy">{t('teacher.emptySchedule')}</p>
            ) : (
              <div className="premium-table-wrapper">
                <table className="premium-table">
                  <thead>
                    <tr>
                      <th>{t('teacher.day')}</th>
                      <th>{t('teacher.timeSlot')}</th>
                      <th>{t('teacher.class')}</th>
                      <th>{t('teacher.room')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedule.map((slot) => {
                      const className = classes.find((schoolClass) => schoolClass.id === slot.class_id)?.name || '-';
                      const dayLabel =
                        slot.day_of_week >= 0 && slot.day_of_week <= 6
                          ? t(`calendar.weekday.${slot.day_of_week}`)
                          : slot.day_name;
                      return (
                        <tr key={slot.id}>
                          <td className="table-cell-primary">{dayLabel}</td>
                          <td>{formatClock(slot.start_time, locale)} - {formatClock(slot.end_time, locale)}</td>
                          <td className="table-cell-strong">{className} - {slot.course_name}</td>
                          <td><span className="badge badge-compact">{slot.room || '-'}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {!isLoading && selectedClass && activeTab === 'chat' && (
          <div className="animate-fade-in dashboard-split dashboard-split--chat" role="tabpanel">
            <div className="dashboard-side">
              <h3 className="dashboard-section-title">{t('teacher.discussions')}</h3>
              <div className="class-card class-card--active contact-card" role="group">
                <div className="contact-avatar">{selectedClass.name.slice(0, 2).toUpperCase()}</div>
                <div>
                  <h4 className="contact-name">{selectedClass.name}</h4>
                  <p className="contact-preview">{messages.at(-1)?.content || t('teacher.noMessagePreview')}</p>
                </div>
              </div>
            </div>

            <div>
              <div className="dashboard-toolbar">
                <div>
                  <h3 className="dashboard-section-title dashboard-section-title--plain">{selectedClass.name}</h3>
                  <p className="dashboard-section-copy">{t('teacher.messagesPolicy')}</p>
                </div>
                <span className="badge badge-success">{t('teacher.validatedLink')}</span>
              </div>

              <div className="chat-sim-container" aria-label={t('teacher.messagesAria')}>
                <div className="chat-sim-messages">
                  {messages.length === 0 && <p className="empty-list-copy">{t('teacher.emptyMessages')}</p>}
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
                    placeholder={t('teacher.messagePlaceholder')}
                    aria-label={t('teacher.writeMessage')}
                  />
                  <button type="submit" className="btn btn-primary btn-icon-square" aria-label={t('teacher.sendMessage')}>
                    <Send size={16} />
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
