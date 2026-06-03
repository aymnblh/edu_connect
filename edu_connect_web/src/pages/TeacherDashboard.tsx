import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BookOpen,
  Calendar,
  ClipboardList,
  MessageSquare,
  NotebookText,
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

interface ClassCourse {
  class_id: string;
  course_id: string;
  teacher_id: string;
  coefficient: number;
  course_name?: string | null;
  teacher_name?: string | null;
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
  is_approved: boolean;
  approved_at?: string | null;
  date: string;
  comment?: string | null;
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

function formatDate(value: string, locale: Locale): string {
  const parsed = new Date(value);
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

function defaultDueDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date.toISOString().slice(0, 10);
}

function dueDateToIso(value: string): string {
  return `${value}T12:00:00.000Z`;
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

export default function TeacherDashboard() {
  const [activeTab, setActiveTab] = useState<'classes' | 'grades' | 'homework' | 'schedule' | 'chat'>('classes');
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [attendanceState, setAttendanceState] = useState<Record<string, 'present' | 'absent'>>({});
  const [gradeForm, setGradeForm] = useState({
    studentId: '',
    courseId: '',
    subject: '',
    score: '',
    maxScore: '20',
    comment: '',
  });
  const [homeworkForm, setHomeworkForm] = useState({
    kind: 'homework' as HomeworkKind,
    courseId: '',
    subject: '',
    lessonContent: '',
    homeworkContent: '',
    dueDate: defaultDueDate(),
  });
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

  const classCoursesQuery = useQuery<ClassCourse[]>({
    queryKey: ['teacher', 'courses', selectedClass?.id],
    enabled: Boolean(selectedClass?.id),
    queryFn: async () => {
      const response = await api.get(`/classes/${selectedClass?.id}/courses`);
      return response.data;
    },
  });

  const gradesQuery = useQuery<Grade[]>({
    queryKey: ['teacher', 'grades', selectedClass?.id],
    enabled: Boolean(selectedClass?.id),
    queryFn: async () => {
      const response = await api.get(`/classes/${selectedClass?.id}/grades/`);
      return response.data;
    },
  });

  const homeworkQuery = useQuery<Homework[]>({
    queryKey: ['teacher', 'homework', selectedClass?.id],
    enabled: Boolean(selectedClass?.id),
    queryFn: async () => {
      const response = await api.get(`/classes/${selectedClass?.id}/homework/`);
      return response.data;
    },
  });

  const students = useMemo(
    () => studentsQuery.data ?? selectedClass?.members ?? [],
    [selectedClass?.members, studentsQuery.data],
  );
  const classCourses = useMemo(() => classCoursesQuery.data ?? [], [classCoursesQuery.data]);
  const grades = useMemo(() => gradesQuery.data ?? [], [gradesQuery.data]);
  const homework = useMemo(() => homeworkQuery.data ?? [], [homeworkQuery.data]);
  const schedule = scheduleQuery.data ?? [];
  const messages = useMemo(
    () => dedupeMessages([...(messagesQuery.data ?? []), ...liveMessages.filter((message) => message.class_id === selectedClass?.id)]),
    [liveMessages, messagesQuery.data, selectedClass?.id],
  );
  const selectedCourse = classCourses.find((course) => course.course_id === gradeForm.courseId);
  const selectedHomeworkCourse = classCourses.find((course) => course.course_id === homeworkForm.courseId);
  const pendingGradesCount = grades.filter((grade) => !grade.is_approved).length;
  const upcomingHomeworkCount = homework.filter((item) => {
    const dueDate = new Date(item.due_date);
    return Number.isNaN(dueDate.getTime()) || dueDate >= new Date(new Date().toDateString());
  }).length;

  useEffect(() => {
    const studentSignature = students.map((student) => student.id).join('|');
    const courseSignature = classCourses.map((course) => course.course_id).join('|');
    if (!studentSignature && !courseSignature && !selectedClass?.subject) return;

    setGradeForm((current) => {
      const hasStudent = Boolean(current.studentId) && students.some((student) => student.id === current.studentId);
      const currentCourse = classCourses.find((course) => course.course_id === current.courseId);
      const fallbackCourse = classCourses[0];
      const nextStudentId = hasStudent ? current.studentId : students[0]?.id ?? '';
      const nextCourseId = currentCourse?.course_id ?? fallbackCourse?.course_id ?? '';
      const defaultSubject = currentCourse?.course_name ?? fallbackCourse?.course_name ?? current.subject.trim();
      const nextSubject = defaultSubject || selectedClass?.subject || '';

      if (
        current.studentId === nextStudentId &&
        current.courseId === nextCourseId &&
        current.subject === nextSubject
      ) {
        return current;
      }

      return {
        ...current,
        studentId: nextStudentId,
        courseId: nextCourseId,
        subject: nextSubject,
      };
    });
  }, [classCourses, selectedClass?.subject, students]);

  useEffect(() => {
    const courseSignature = classCourses.map((course) => course.course_id).join('|');
    if (!courseSignature && !selectedClass?.subject) return;

    setHomeworkForm((current) => {
      const currentCourse = classCourses.find((course) => course.course_id === current.courseId);
      const fallbackCourse = classCourses[0];
      const nextCourseId = currentCourse?.course_id ?? fallbackCourse?.course_id ?? '';
      const defaultSubject = currentCourse?.course_name ?? fallbackCourse?.course_name ?? current.subject.trim();
      const nextSubject = defaultSubject || selectedClass?.subject || '';

      if (current.courseId === nextCourseId && current.subject === nextSubject) {
        return current;
      }

      return {
        ...current,
        courseId: nextCourseId,
        subject: nextSubject,
      };
    });
  }, [classCourses, selectedClass?.subject]);

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

  const addGradeMutation = useMutation({
    mutationFn: async () => {
      if (!selectedClass) throw new Error(t('teacher.classNotFound'));
      const student = students.find((candidate) => candidate.id === gradeForm.studentId);
      if (!student) throw new Error(t('teacher.gradeStudentRequired'));

      const score = Number(gradeForm.score.replace(',', '.'));
      const maxScore = Number(gradeForm.maxScore.replace(',', '.'));
      if (!Number.isFinite(score) || !Number.isFinite(maxScore) || maxScore <= 0) {
        throw new Error(t('teacher.gradeScoreInvalid'));
      }
      if (score < 0 || score > maxScore) {
        throw new Error(t('teacher.gradeScoreRange'));
      }

      const subject = (selectedCourse?.course_name || gradeForm.subject).trim();
      if (!subject) throw new Error(t('teacher.gradeSubjectRequired'));

      await api.post(`/classes/${selectedClass.id}/grades/`, {
        student_id: student.id,
        student_name: student.full_name,
        course_id: selectedCourse?.course_id,
        subject,
        score,
        max_score: maxScore,
        comment: gradeForm.comment.trim() || null,
      });
    },
    onSuccess: () => {
      addToast(t('teacher.gradeToastSaved'), 'success');
      setGradeForm((current) => ({ ...current, score: '', comment: '' }));
      void queryClient.invalidateQueries({ queryKey: ['teacher', 'grades', selectedClass?.id] });
    },
    onError: (error) => {
      addToast(error instanceof Error ? error.message : t('auth.connectionError'), 'error');
    },
  });

  const publishHomeworkMutation = useMutation({
    mutationFn: async () => {
      if (!selectedClass) throw new Error(t('teacher.classNotFound'));
      const subject = (selectedHomeworkCourse?.course_name || homeworkForm.subject).trim();
      const content = homeworkForm.homeworkContent.trim();
      if (!subject) throw new Error(t('teacher.homeworkSubjectRequired'));
      if (!content) throw new Error(t('teacher.homeworkContentRequired'));
      if (!homeworkForm.dueDate) throw new Error(t('teacher.homeworkDueDateRequired'));

      await api.post(`/classes/${selectedClass.id}/homework/`, {
        kind: homeworkForm.kind,
        subject,
        lesson_content: homeworkForm.lessonContent.trim() || null,
        homework_content: content,
        due_date: dueDateToIso(homeworkForm.dueDate),
      });
    },
    onSuccess: () => {
      addToast(t('teacher.homeworkToastSaved'), 'success');
      setHomeworkForm((current) => ({
        ...current,
        lessonContent: '',
        homeworkContent: '',
        dueDate: defaultDueDate(),
      }));
      void queryClient.invalidateQueries({ queryKey: ['teacher', 'homework', selectedClass?.id] });
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
    setGradeForm({
      studentId: '',
      courseId: '',
      subject: '',
      score: '',
      maxScore: '20',
      comment: '',
    });
    setHomeworkForm({
      kind: 'homework',
      courseId: '',
      subject: '',
      lessonContent: '',
      homeworkContent: '',
      dueDate: defaultDueDate(),
    });
  };

  const toggleAttendance = (student: Student, status: 'present' | 'absent') => {
    setAttendanceState((current) => ({
      ...current,
      [student.id]: status,
    }));
  };

  const handleGradeSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    addGradeMutation.mutate();
  };

  const handleHomeworkSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    publishHomeworkMutation.mutate();
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
  const loadError =
    classesQuery.error ||
    studentsQuery.error ||
    (activeTab === 'schedule' ? scheduleQuery.error : null) ||
    (activeTab === 'chat' ? messagesQuery.error : null) ||
    (activeTab === 'grades' ? classCoursesQuery.error || gradesQuery.error : null) ||
    (activeTab === 'homework' ? classCoursesQuery.error || homeworkQuery.error : null);

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
          onClick={() => setActiveTab('grades')}
          className={`tab-button ${activeTab === 'grades' ? 'tab-button--active' : ''}`}
          role="tab"
          aria-selected={activeTab === 'grades'}
        >
          <NotebookText size={16} /> {t('teacher.tabGrades')}
        </button>
        <button
          onClick={() => setActiveTab('homework')}
          className={`tab-button ${activeTab === 'homework' ? 'tab-button--active' : ''}`}
          role="tab"
          aria-selected={activeTab === 'homework'}
        >
          <ClipboardList size={16} /> {t('teacher.tabHomework')}
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

        {!isLoading && selectedClass && activeTab === 'grades' && (
          <div className="animate-fade-in dashboard-split dashboard-split--teacher-grades" role="tabpanel">
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
                  <h3 className="dashboard-section-title dashboard-section-title--plain">{t('teacher.gradesTitle')}</h3>
                  <p className="dashboard-section-copy">{t('teacher.gradesCopy', { className: selectedClass.name })}</p>
                </div>
                <span className={`badge ${pendingGradesCount > 0 ? 'badge-warning' : 'badge-success'}`}>
                  {t('teacher.gradePendingCount', { count: pendingGradesCount })}
                </span>
              </div>

              <div className="teacher-grade-entry-grid">
                <form className="stacked-form teacher-grade-form" onSubmit={handleGradeSubmit}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="grade-student">{t('teacher.gradeStudent')}</label>
                    <select
                      id="grade-student"
                      className="form-input"
                      value={gradeForm.studentId}
                      onChange={(event) => setGradeForm((current) => ({ ...current, studentId: event.target.value }))}
                      required
                    >
                      <option value="">{t('teacher.gradeChooseStudent')}</option>
                      {students.map((student) => (
                        <option key={student.id} value={student.id}>{student.full_name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="grade-course">{t('teacher.gradeCourse')}</label>
                    <select
                      id="grade-course"
                      className="form-input"
                      value={gradeForm.courseId}
                      onChange={(event) => {
                        const course = classCourses.find((candidate) => candidate.course_id === event.target.value);
                        setGradeForm((current) => ({
                          ...current,
                          courseId: event.target.value,
                          subject: course?.course_name || current.subject,
                        }));
                      }}
                    >
                      <option value="">{t('teacher.gradeManualSubject')}</option>
                      {classCourses.map((course) => (
                        <option key={course.course_id} value={course.course_id}>
                          {course.course_name || t('teacher.gradeCourse')} - {t('teacher.gradeCoefficientShort', { coefficient: course.coefficient ?? 1 })}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="grade-subject">{t('teacher.gradeSubject')}</label>
                    <input
                      id="grade-subject"
                      className="form-input"
                      type="text"
                      value={selectedCourse?.course_name || gradeForm.subject}
                      onChange={(event) => setGradeForm((current) => ({ ...current, subject: event.target.value }))}
                      readOnly={Boolean(selectedCourse)}
                      required
                    />
                  </div>

                  <div className="teacher-grade-score-row">
                    <div className="form-group">
                      <label className="form-label" htmlFor="grade-score">{t('teacher.gradeScore')}</label>
                      <input
                        id="grade-score"
                        className="form-input"
                        type="number"
                        min="0"
                        max={gradeForm.maxScore || undefined}
                        step="0.25"
                        value={gradeForm.score}
                        onChange={(event) => setGradeForm((current) => ({ ...current, score: event.target.value }))}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="grade-max-score">{t('teacher.gradeMaxScore')}</label>
                      <input
                        id="grade-max-score"
                        className="form-input"
                        type="number"
                        min="1"
                        step="0.5"
                        value={gradeForm.maxScore}
                        onChange={(event) => setGradeForm((current) => ({ ...current, maxScore: event.target.value }))}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="grade-comment">{t('teacher.gradeComment')}</label>
                    <textarea
                      id="grade-comment"
                      className="form-input teacher-grade-comment"
                      value={gradeForm.comment}
                      onChange={(event) => setGradeForm((current) => ({ ...current, comment: event.target.value }))}
                      placeholder={t('teacher.gradeCommentPlaceholder')}
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary btn-full"
                    disabled={addGradeMutation.isPending || students.length === 0}
                  >
                    <NotebookText size={16} /> {t('teacher.gradeSave')}
                  </button>
                  <p className="dashboard-section-copy teacher-grade-note">{t('teacher.gradeValidationHint')}</p>
                </form>

                <div>
                  <h3 className="dashboard-section-title">{t('teacher.latestGrades')}</h3>
                  <div className="dashboard-list teacher-grade-list">
                    {gradesQuery.isLoading && <p className="empty-list-copy">{t('common.loading')}</p>}
                    {!gradesQuery.isLoading && grades.length === 0 && (
                      <p className="empty-list-copy">{t('teacher.emptyGrades')}</p>
                    )}
                    {grades.map((grade) => {
                      const score = gradeOnTwenty(grade);
                      return (
                        <div key={grade.id} className="student-list-item teacher-grade-item">
                          <div className="teacher-grade-main">
                            <span className="grade-subject">{grade.subject}</span>
                            <div className="grade-date">
                              {grade.student_name} - {formatDate(grade.date, locale)}
                            </div>
                            {grade.comment && <div className="teacher-grade-comment-text">{grade.comment}</div>}
                          </div>
                          <div className="teacher-grade-status">
                            <span className="grade-score">{score.toFixed(1)}/20</span>
                            <span className={`badge badge-compact ${grade.is_approved ? 'badge-success' : 'badge-warning'}`}>
                              {grade.is_approved ? t('teacher.gradeApproved') : t('teacher.gradePending')}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {!isLoading && selectedClass && activeTab === 'homework' && (
          <div className="animate-fade-in dashboard-split dashboard-split--teacher-homework" role="tabpanel">
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
                  <h3 className="dashboard-section-title dashboard-section-title--plain">{t('teacher.homeworkTitle')}</h3>
                  <p className="dashboard-section-copy">{t('teacher.homeworkCopy', { className: selectedClass.name })}</p>
                </div>
                <span className="badge badge-success">
                  {t('teacher.homeworkUpcomingCount', { count: upcomingHomeworkCount })}
                </span>
              </div>

              <div className="teacher-homework-entry-grid">
                <form className="stacked-form teacher-homework-form" onSubmit={handleHomeworkSubmit}>
                  <div className="teacher-homework-form-row">
                    <div className="form-group">
                      <label className="form-label" htmlFor="homework-kind">{t('teacher.homeworkKind')}</label>
                      <select
                        id="homework-kind"
                        className="form-input"
                        value={homeworkForm.kind}
                        onChange={(event) =>
                          setHomeworkForm((current) => ({ ...current, kind: event.target.value as HomeworkKind }))
                        }
                      >
                        <option value="homework">{t('teacher.homeworkKind.homework')}</option>
                        <option value="assignment">{t('teacher.homeworkKind.assignment')}</option>
                        <option value="exam">{t('teacher.homeworkKind.exam')}</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="homework-due-date">{t('teacher.homeworkDueDate')}</label>
                      <input
                        id="homework-due-date"
                        className="form-input"
                        type="date"
                        value={homeworkForm.dueDate}
                        onChange={(event) => setHomeworkForm((current) => ({ ...current, dueDate: event.target.value }))}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="homework-course">{t('teacher.homeworkCourse')}</label>
                    <select
                      id="homework-course"
                      className="form-input"
                      value={homeworkForm.courseId}
                      onChange={(event) => {
                        const course = classCourses.find((candidate) => candidate.course_id === event.target.value);
                        setHomeworkForm((current) => ({
                          ...current,
                          courseId: event.target.value,
                          subject: course?.course_name || current.subject,
                        }));
                      }}
                    >
                      <option value="">{t('teacher.homeworkManualSubject')}</option>
                      {classCourses.map((course) => (
                        <option key={course.course_id} value={course.course_id}>
                          {course.course_name || t('teacher.homeworkCourse')}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="homework-subject">{t('teacher.homeworkSubject')}</label>
                    <input
                      id="homework-subject"
                      className="form-input"
                      type="text"
                      value={selectedHomeworkCourse?.course_name || homeworkForm.subject}
                      onChange={(event) => setHomeworkForm((current) => ({ ...current, subject: event.target.value }))}
                      readOnly={Boolean(selectedHomeworkCourse)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="homework-preparation">{t('teacher.homeworkPreparation')}</label>
                    <textarea
                      id="homework-preparation"
                      className="form-input teacher-homework-textarea"
                      value={homeworkForm.lessonContent}
                      onChange={(event) => setHomeworkForm((current) => ({ ...current, lessonContent: event.target.value }))}
                      placeholder={t('teacher.homeworkPreparationPlaceholder')}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="homework-content">{t('teacher.homeworkContent')}</label>
                    <textarea
                      id="homework-content"
                      className="form-input teacher-homework-textarea teacher-homework-textarea--large"
                      value={homeworkForm.homeworkContent}
                      onChange={(event) => setHomeworkForm((current) => ({ ...current, homeworkContent: event.target.value }))}
                      placeholder={t('teacher.homeworkContentPlaceholder')}
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary btn-full"
                    disabled={publishHomeworkMutation.isPending}
                  >
                    <ClipboardList size={16} /> {t('teacher.homeworkPublish')}
                  </button>
                  <p className="dashboard-section-copy teacher-homework-note">{t('teacher.homeworkNotificationHint')}</p>
                </form>

                <div>
                  <h3 className="dashboard-section-title">{t('teacher.latestHomework')}</h3>
                  <div className="dashboard-list teacher-homework-list">
                    {homeworkQuery.isLoading && <p className="empty-list-copy">{t('common.loading')}</p>}
                    {!homeworkQuery.isLoading && homework.length === 0 && (
                      <p className="empty-list-copy">{t('teacher.emptyHomework')}</p>
                    )}
                    {homework.map((item) => {
                      const kind = normalizeHomeworkKind(item.kind);
                      return (
                        <div key={item.id} className="homework-announcement-card">
                          <div className="homework-announcement-header">
                            <span className="badge badge-compact badge-success">{t(`teacher.homeworkKind.${kind}`)}</span>
                            <span className="homework-due-date">
                              {t('teacher.homeworkDueOn', { date: formatDate(item.due_date, locale) })}
                            </span>
                          </div>
                          <h4>{item.subject}</h4>
                          <p>{item.homework_content}</p>
                          {item.lesson_content && (
                            <div className="homework-preparation-note">
                              {t('teacher.homeworkPreparation')}: {item.lesson_content}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
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
