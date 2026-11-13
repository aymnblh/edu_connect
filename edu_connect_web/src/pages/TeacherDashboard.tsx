import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import {
  AlertTriangle,
  BookOpen,
  Calendar,
  CalendarClock,
  Check,
  CheckCheck,
  CheckCircle2,
  ClipboardList,
  Loader2,
  Megaphone,
  MessageSquare,
  NotebookText,
  Pencil,
  RefreshCw,
  Trash2,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import AnnouncementsPanel from '../components/AnnouncementsPanel';
import DashboardActionGrid from '../components/DashboardActionGrid';
import { TeacherMeetingsPanel } from '../components/MeetingsPanel';
import { ClassHealthAlerts } from '../components/DirectorRecordsPanels';
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
  created_by?: string | null;
  created_at: string;
}

function apiErrorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === 'string') return detail;
    if (detail && typeof detail.message === 'string') return detail.message;
  }
  return fallback;
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

function TeacherClassSelector({
  classes,
  selectedClass,
  onSelect,
}: {
  classes: SchoolClass[];
  selectedClass: SchoolClass;
  onSelect: (schoolClass: SchoolClass) => void;
}) {
  const selectId = useId();
  const { t } = useLocale();

  return (
    <>
      <div className="form-group teacher-mobile-class-selector">
        <label className="form-label" htmlFor={selectId}>{t('teacher.assignedClasses')}</label>
        <select
          id={selectId}
          className="form-input"
          value={selectedClass.id}
          onChange={(event) => {
            const nextClass = classes.find((schoolClass) => schoolClass.id === event.target.value);
            if (nextClass) onSelect(nextClass);
          }}
        >
          {classes.map((schoolClass) => (
            <option key={schoolClass.id} value={schoolClass.id}>
              {schoolClass.name} - {schoolClass.subject || t('teacher.class')}
            </option>
          ))}
        </select>
      </div>

      <div className="dashboard-side teacher-desktop-class-selector">
        <h3 className="dashboard-section-title">{t('teacher.assignedClasses')}</h3>
        <div className="dashboard-list">
          {classes.map((schoolClass) => (
            <button
              type="button"
              key={schoolClass.id}
              onClick={() => onSelect(schoolClass)}
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
    </>
  );
}

export default function TeacherDashboard() {
  const [activeTab, setActiveTab] = useState<'classes' | 'grades' | 'homework' | 'schedule' | 'meetings' | 'announcements' | 'chat'>('classes');
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
  const [examForm, setExamForm] = useState({
    courseId: '',
    subject: '',
    examDate: defaultDueDate(),
    startTime: '08:00',
    endTime: '10:00',
    room: '',
    description: '',
  });
  const [toasts, setToasts] = useState<Toast[]>([]);
  const attendanceSectionRef = useRef<HTMLDivElement | null>(null);
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

  const meQuery = useQuery<{ id: string }>({
    queryKey: ['me'],
    queryFn: async () => {
      const response = await api.get('/users/me');
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

  const examsQuery = useQuery<ScheduleExam[]>({
    queryKey: ['teacher', 'schedule-exams', selectedClass?.id],
    enabled: Boolean(selectedClass?.id),
    queryFn: async () => {
      const response = await api.get(`/schedule/class/${selectedClass?.id}/exams`);
      return response.data;
    },
  });

  const students = useMemo(
    () => studentsQuery.data ?? selectedClass?.members ?? [],
    [selectedClass?.members, studentsQuery.data],
  );
  const myId = meQuery.data?.id;
  // Teachers only work on the subjects assigned to them; substitutes with no
  // assigned subject keep the full list (the API enforces the same rule).
  const classCourses = useMemo(() => {
    const all = classCoursesQuery.data ?? [];
    const mine = myId ? all.filter((course) => course.teacher_id === myId) : [];
    return mine.length > 0 ? mine : all;
  }, [classCoursesQuery.data, myId]);
  const grades = useMemo(() => gradesQuery.data ?? [], [gradesQuery.data]);
  const homework = useMemo(() => homeworkQuery.data ?? [], [homeworkQuery.data]);
  const exams = useMemo(() => examsQuery.data ?? [], [examsQuery.data]);
  const schedule = scheduleQuery.data ?? [];
  const selectedCourse = classCourses.find((course) => course.course_id === gradeForm.courseId);
  const selectedHomeworkCourse = classCourses.find((course) => course.course_id === homeworkForm.courseId);
  const selectedExamCourse = classCourses.find((course) => course.course_id === examForm.courseId);
  const pendingGradesCount = grades.filter((grade) => !grade.is_approved).length;
  const markedAttendanceCount = students.filter((student) => Boolean(attendanceState[student.id])).length;
  const attendanceProgress = students.length > 0 ? (markedAttendanceCount / students.length) * 100 : 0;
  const upcomingHomeworkCount = homework.filter((item) => {
    const dueDate = new Date(item.due_date);
    return Number.isNaN(dueDate.getTime()) || dueDate >= new Date(new Date().toDateString());
  }).length;
  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);
  const todayDayIndex = (today.getDay() + 6) % 7;
  const todaySchedule = schedule
    .filter((slot) => slot.day_of_week === todayDayIndex)
    .slice()
    .sort((a, b) => a.start_time.localeCompare(b.start_time));
  const upcomingExamsCount = exams.filter((item) => item.exam_date >= todayIso).length;

  useEffect(() => {
    const studentSignature = students.map((student) => student.id).join('|');
    const courseSignature = classCourses.map((course) => course.course_id).join('|');
    if (!studentSignature && !courseSignature && !selectedClass?.subject) return;

    const syncTimer = window.setTimeout(() => setGradeForm((current) => {
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
    }), 0);

    return () => window.clearTimeout(syncTimer);
  }, [classCourses, selectedClass?.subject, students]);

  useEffect(() => {
    const courseSignature = classCourses.map((course) => course.course_id).join('|');
    if (!courseSignature && !selectedClass?.subject) return;

    const syncTimer = window.setTimeout(() => setHomeworkForm((current) => {
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
    }), 0);

    return () => window.clearTimeout(syncTimer);
  }, [classCourses, selectedClass?.subject]);

  useEffect(() => {
    const courseSignature = classCourses.map((course) => course.course_id).join('|');
    if (!courseSignature && !selectedClass?.subject) return;

    const syncTimer = window.setTimeout(() => setExamForm((current) => {
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
    }), 0);

    return () => window.clearTimeout(syncTimer);
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
      void queryClient.invalidateQueries({ queryKey: ['teacher', 'students', selectedClass?.id] });
    },
  });

  const [editingGrade, setEditingGrade] = useState<{ id: string; score: string; comment: string } | null>(null);
  const [editingHomework, setEditingHomework] = useState<{ id: string; content: string; dueDate: string } | null>(null);

  const updateGradeMutation = useMutation({
    mutationFn: async (draft: { id: string; score: string; comment: string }) => {
      await api.patch(`/classes/${selectedClass?.id}/grades/${draft.id}`, {
        score: Number(draft.score.replace(',', '.')),
        comment: draft.comment.trim() || null,
      });
    },
    onSuccess: () => {
      setEditingGrade(null);
      queryClient.invalidateQueries({ queryKey: ['teacher', 'grades', selectedClass?.id] });
      addToast(t('teacher.toastSaved'), 'success');
    },
    onError: (error) => addToast(apiErrorMessage(error, t('auth.connectionError')), 'error'),
  });

  const deleteGradeMutation = useMutation({
    mutationFn: async (gradeId: string) => {
      await api.delete(`/classes/${selectedClass?.id}/grades/${gradeId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher', 'grades', selectedClass?.id] });
      addToast(t('teacher.entryDeleted'), 'success');
    },
    onError: (error) => addToast(apiErrorMessage(error, t('auth.connectionError')), 'error'),
  });

  const updateHomeworkMutation = useMutation({
    mutationFn: async (draft: { id: string; content: string; dueDate: string }) => {
      await api.patch(`/classes/${selectedClass?.id}/homework/${draft.id}`, {
        homework_content: draft.content.trim(),
        due_date: new Date(`${draft.dueDate}T12:00:00`).toISOString(),
      });
    },
    onSuccess: () => {
      setEditingHomework(null);
      queryClient.invalidateQueries({ queryKey: ['teacher', 'homework', selectedClass?.id] });
      addToast(t('teacher.toastSaved'), 'success');
    },
    onError: (error) => addToast(apiErrorMessage(error, t('auth.connectionError')), 'error'),
  });

  const deleteHomeworkMutation = useMutation({
    mutationFn: async (homeworkId: string) => {
      await api.delete(`/classes/${selectedClass?.id}/homework/${homeworkId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher', 'homework', selectedClass?.id] });
      addToast(t('teacher.entryDeleted'), 'success');
    },
    onError: (error) => addToast(apiErrorMessage(error, t('auth.connectionError')), 'error'),
  });

  const confirmDelete = (onConfirm: () => void) => {
    if (window.confirm(t('teacher.confirmDelete'))) onConfirm();
  };

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
      setGradeForm((current) => ({ ...current, score: '', comment: '' }));
      void queryClient.invalidateQueries({ queryKey: ['teacher', 'grades', selectedClass?.id] });
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
        course_id: selectedHomeworkCourse?.course_id ?? null,
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

  const publishExamMutation = useMutation({
    mutationFn: async () => {
      if (!selectedClass) throw new Error(t('teacher.classNotFound'));
      const subject = (selectedExamCourse?.course_name || examForm.subject).trim();
      if (!subject) throw new Error(t('teacher.examSubjectRequired'));
      if (!examForm.examDate) throw new Error(t('teacher.examDateRequired'));
      if (!examForm.startTime || !examForm.endTime) throw new Error(t('teacher.examTimeRequired'));
      if (examForm.startTime >= examForm.endTime) throw new Error(t('teacher.examTimeRange'));

      await api.post('/schedule/exams', {
        class_id: selectedClass.id,
        course_id: selectedExamCourse?.course_id ?? null,
        course_name: subject,
        exam_date: examForm.examDate,
        start_time: examForm.startTime,
        end_time: examForm.endTime,
        room: examForm.room.trim() || null,
        description: examForm.description.trim() || null,
      });
    },
    onSuccess: () => {
      addToast(t('teacher.examToastSaved'), 'success');
      setExamForm((current) => ({
        ...current,
        examDate: defaultDueDate(),
        startTime: '08:00',
        endTime: '10:00',
        room: '',
        description: '',
      }));
      void queryClient.invalidateQueries({ queryKey: ['teacher', 'schedule-exams', selectedClass?.id] });
    },
    onError: (error) => {
      addToast(error instanceof Error ? error.message : t('auth.connectionError'), 'error');
    },
  });

  const selectClass = (schoolClass: SchoolClass) => {
    setSelectedClassId(schoolClass.id);
    setAttendanceState({});
    saveAttendanceMutation.reset();
    addGradeMutation.reset();
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
    setExamForm({
      courseId: '',
      subject: '',
      examDate: defaultDueDate(),
      startTime: '08:00',
      endTime: '10:00',
      room: '',
      description: '',
    });
  };

  const toggleAttendance = (student: Student, status: 'present' | 'absent') => {
    saveAttendanceMutation.reset();
    setAttendanceState((current) => ({
      ...current,
      [student.id]: status,
    }));
  };

  const markAllPresent = () => {
    saveAttendanceMutation.reset();
    setAttendanceState(Object.fromEntries(students.map((student) => [student.id, 'present' as const] as const)));
  };

  const handleGradeSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    addGradeMutation.mutate();
  };

  const handleHomeworkSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    publishHomeworkMutation.mutate();
  };

  const handleExamSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    publishExamMutation.mutate();
  };

  const isLoading = classesQuery.isLoading || studentsQuery.isLoading;
  const loadError =
    classesQuery.error ||
    studentsQuery.error ||
    (activeTab === 'schedule' ? scheduleQuery.error || classCoursesQuery.error || examsQuery.error : null) ||
    (activeTab === 'grades' ? classCoursesQuery.error || gradesQuery.error : null) ||
    (activeTab === 'homework' ? classCoursesQuery.error || homeworkQuery.error : null);

  return (
    <div className="container dashboard-page teacher-page animate-fade-in">
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

      {activeTab === 'classes' && selectedClass && (
        <DashboardActionGrid
          title={t('teacher.actions.title')}
          copy={t('teacher.actions.copy', { className: selectedClass.name })}
          items={[
            {
              id: 'sessions',
              label: t('teacher.actions.sessions'),
              value: scheduleQuery.isLoading ? '…' : todaySchedule.length,
              detail: todaySchedule[0]
                ? t('teacher.actions.nextSession', {
                    subject: todaySchedule[0].course_name,
                    time: formatClock(todaySchedule[0].start_time, locale),
                  })
                : t('teacher.actions.noSessions'),
              icon: Calendar,
              onClick: () => setActiveTab('schedule'),
            },
            {
              id: 'attendance',
              label: t('teacher.actions.attendance'),
              value: students.length,
              detail: t('teacher.actions.attendanceDetail', {
                count: students.length,
                className: selectedClass.name,
              }),
              icon: UserCheck,
              onClick: () => {
                attendanceSectionRef.current?.scrollIntoView({ block: 'start' });
                attendanceSectionRef.current?.focus({ preventScroll: true });
              },
            },
            {
              id: 'grades',
              label: t('teacher.actions.grades'),
              value: gradesQuery.isLoading ? '…' : pendingGradesCount,
              detail: t('teacher.actions.gradesDetail', { className: selectedClass.name }),
              icon: NotebookText,
              onClick: () => setActiveTab('grades'),
              tone: pendingGradesCount > 0 ? 'warning' : 'success',
            },
            {
              id: 'homework',
              label: t('teacher.actions.homework'),
              value: homeworkQuery.isLoading ? '…' : upcomingHomeworkCount,
              detail: t('teacher.actions.homeworkDetail', { className: selectedClass.name }),
              icon: ClipboardList,
              onClick: () => setActiveTab('homework'),
            },
          ]}
        />
      )}

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
        <button
          type="button"
          onClick={() => setActiveTab('meetings')}
          className={`tab-button ${activeTab === 'meetings' ? 'tab-button--active' : ''}`}
          role="tab"
          aria-selected={activeTab === 'meetings'}
        >
          <CalendarClock size={16} /> {t('meetings.tab')}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('announcements')}
          className={`tab-button ${activeTab === 'announcements' ? 'tab-button--active' : ''}`}
          role="tab"
          aria-selected={activeTab === 'announcements'}
        >
          <Megaphone size={16} /> {t('announcements.tab')}
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

        {!isLoading && selectedClass && activeTab === 'classes' && <ClassHealthAlerts classId={selectedClass.id} />}
        {!isLoading && selectedClass && activeTab === 'classes' && (
          <div className="animate-fade-in dashboard-split" role="tabpanel">
            <TeacherClassSelector classes={classes} selectedClass={selectedClass} onSelect={selectClass} />

            <div ref={attendanceSectionRef} className="teacher-attendance-section" tabIndex={-1}>
              <div className="dashboard-toolbar">
                <div>
                  <h3 className="dashboard-section-title dashboard-section-title--plain">{t('teacher.attendanceTitle')}</h3>
                  <p className="dashboard-section-copy">{t('teacher.attendanceCopy', { className: selectedClass.name })}</p>
                </div>
              </div>

              {students.length === 0 ? (
                <p className="empty-list-copy">{t('teacher.emptyStudents')}</p>
              ) : (
                <>
                  <div className="teacher-attendance-actionbar" aria-busy={saveAttendanceMutation.isPending}>
                    <div className="teacher-attendance-progress">
                      <div className="teacher-attendance-progress-copy">
                        <strong>{t('teacher.attendanceProgress', { marked: markedAttendanceCount, total: students.length })}</strong>
                        <span>{t('teacher.attendanceRemaining', { count: students.length - markedAttendanceCount })}</span>
                      </div>
                      <div
                        className="teacher-attendance-progress-track"
                        role="progressbar"
                        aria-label={t('teacher.attendanceProgressAria')}
                        aria-valuemin={0}
                        aria-valuemax={students.length}
                        aria-valuenow={markedAttendanceCount}
                      >
                        <span style={{ width: `${attendanceProgress}%` }} />
                      </div>
                    </div>
                    <div className="teacher-attendance-actions">
                      <button
                        type="button"
                        className="btn btn-secondary btn-compact"
                        disabled={saveAttendanceMutation.isPending}
                        onClick={markAllPresent}
                      >
                        <CheckCheck size={16} /> {t('teacher.markAllPresent')}
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary btn-compact"
                        disabled={saveAttendanceMutation.isPending}
                        onClick={() => saveAttendanceMutation.mutate()}
                      >
                        {saveAttendanceMutation.isPending ? <Loader2 size={16} className="spin-icon" /> : <UserCheck size={16} />}
                        {saveAttendanceMutation.isPending ? t('teacher.attendanceSaving') : t('teacher.saveAttendance')}
                      </button>
                    </div>
                  </div>

                  {(saveAttendanceMutation.isPending || saveAttendanceMutation.isSuccess || saveAttendanceMutation.isError) && (
                    <div
                      className={`teacher-save-feedback teacher-save-feedback--${saveAttendanceMutation.isPending ? 'pending' : saveAttendanceMutation.isSuccess ? 'success' : 'error'}`}
                      role={saveAttendanceMutation.isError ? 'alert' : 'status'}
                    >
                      {saveAttendanceMutation.isPending ? <Loader2 size={17} className="spin-icon" /> : saveAttendanceMutation.isSuccess ? <CheckCircle2 size={17} /> : <AlertTriangle size={17} />}
                      <span>
                        {saveAttendanceMutation.isPending
                          ? t('teacher.attendanceSaving')
                          : saveAttendanceMutation.isSuccess
                            ? t('teacher.toastSaved')
                            : apiErrorMessage(
                                saveAttendanceMutation.error,
                                saveAttendanceMutation.error instanceof Error ? saveAttendanceMutation.error.message : t('auth.connectionError'),
                              )}
                      </span>
                    </div>
                  )}

                  <div className="premium-table-wrapper teacher-attendance-table-wrap">
                    <table className="premium-table teacher-attendance-table">
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
                            <tr key={student.id} className={status ? 'teacher-attendance-row--marked' : ''}>
                              <td className="table-cell-strong">{student.full_name}</td>
                              <td className="attendance-choice-cell">
                                <button
                                  type="button"
                                  onClick={() => toggleAttendance(student, 'present')}
                                  className={`attendance-btn ${status === 'present' ? 'attendance-btn--present' : ''}`}
                                  aria-label={t('teacher.markPresent', { student: student.full_name })}
                                  aria-pressed={status === 'present'}
                                  disabled={saveAttendanceMutation.isPending}
                                >
                                  <Check size={15} /> {t('teacher.present')}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => toggleAttendance(student, 'absent')}
                                  className={`attendance-btn ${status === 'absent' ? 'attendance-btn--absent' : ''}`}
                                  aria-label={t('teacher.markAbsent', { student: student.full_name })}
                                  aria-pressed={status === 'absent'}
                                  disabled={saveAttendanceMutation.isPending}
                                >
                                  <X size={15} /> {t('teacher.absent')}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {!isLoading && selectedClass && activeTab === 'grades' && (
          <div className="animate-fade-in dashboard-split dashboard-split--teacher-grades" role="tabpanel">
            <TeacherClassSelector classes={classes} selectedClass={selectedClass} onSelect={selectClass} />

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
                <form
                  className="stacked-form teacher-grade-form"
                  onSubmit={handleGradeSubmit}
                  onChange={() => {
                    if (addGradeMutation.isSuccess || addGradeMutation.isError) addGradeMutation.reset();
                  }}
                  aria-busy={addGradeMutation.isPending}
                >
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
                        className="form-input teacher-grade-score-input"
                        type="number"
                        inputMode="decimal"
                        autoComplete="off"
                        enterKeyHint="next"
                        placeholder="0.00"
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
                        className="form-input teacher-grade-score-input"
                        type="number"
                        inputMode="decimal"
                        autoComplete="off"
                        enterKeyHint="next"
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
                      aria-describedby="grade-validation-hint"
                    />
                  </div>

                  {(addGradeMutation.isPending || addGradeMutation.isSuccess || addGradeMutation.isError) && (
                    <div
                      className={`teacher-save-feedback teacher-save-feedback--${addGradeMutation.isPending ? 'pending' : addGradeMutation.isSuccess ? 'success' : 'error'}`}
                      role={addGradeMutation.isError ? 'alert' : 'status'}
                    >
                      {addGradeMutation.isPending ? <Loader2 size={17} className="spin-icon" /> : addGradeMutation.isSuccess ? <CheckCircle2 size={17} /> : <AlertTriangle size={17} />}
                      <span>
                        {addGradeMutation.isPending
                          ? t('teacher.gradeSaving')
                          : addGradeMutation.isSuccess
                            ? t('teacher.gradeToastSaved')
                            : apiErrorMessage(
                                addGradeMutation.error,
                                addGradeMutation.error instanceof Error ? addGradeMutation.error.message : t('auth.connectionError'),
                              )}
                      </span>
                    </div>
                  )}

                  <div className="teacher-form-actions">
                    <button
                      type="submit"
                      className="btn btn-primary btn-full"
                      disabled={addGradeMutation.isPending || students.length === 0}
                    >
                      {addGradeMutation.isPending ? <Loader2 size={16} className="spin-icon" /> : <NotebookText size={16} />}
                      {addGradeMutation.isPending ? t('teacher.gradeSaving') : t('teacher.gradeSave')}
                    </button>
                    <p id="grade-validation-hint" className="dashboard-section-copy teacher-grade-note">{t('teacher.gradeValidationHint')}</p>
                  </div>
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
                            {editingGrade?.id === grade.id ? (
                              <form
                                className="inline-edit-form"
                                onSubmit={(event) => {
                                  event.preventDefault();
                                  updateGradeMutation.mutate(editingGrade);
                                }}
                              >
                                <label className="form-label" htmlFor={`grade-score-${grade.id}`}>
                                  {t('teacher.gradeScoreOutOf', { max: grade.max_score })}
                                </label>
                                <input
                                  id={`grade-score-${grade.id}`}
                                  className="form-input"
                                  inputMode="decimal"
                                  value={editingGrade.score}
                                  onChange={(event) => setEditingGrade({ ...editingGrade, score: event.target.value })}
                                  required
                                />
                                <input
                                  className="form-input"
                                  aria-label={t('teacher.gradeComment')}
                                  placeholder={t('teacher.gradeComment')}
                                  value={editingGrade.comment}
                                  onChange={(event) => setEditingGrade({ ...editingGrade, comment: event.target.value })}
                                />
                                <div className="table-actions">
                                  <button type="submit" className="btn btn-primary btn-compact" disabled={updateGradeMutation.isPending}>
                                    {t('common.save')}
                                  </button>
                                  <button type="button" className="btn btn-secondary btn-compact" onClick={() => setEditingGrade(null)}>
                                    {t('common.cancel')}
                                  </button>
                                </div>
                              </form>
                            ) : (
                              grade.comment && <div className="teacher-grade-comment-text">{grade.comment}</div>
                            )}
                          </div>
                          <div className="teacher-grade-status">
                            <span className="grade-score">{score.toFixed(1)}/20</span>
                            <span className={`badge badge-compact ${grade.is_approved ? 'badge-success' : 'badge-warning'}`}>
                              {grade.is_approved ? t('teacher.gradeApproved') : t('teacher.gradePending')}
                            </span>
                            {!grade.is_approved && editingGrade?.id !== grade.id && (
                              <div className="table-actions">
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-compact"
                                  aria-label={t('common.edit')}
                                  title={t('common.edit')}
                                  onClick={() =>
                                    setEditingGrade({ id: grade.id, score: String(grade.score), comment: grade.comment ?? '' })
                                  }
                                >
                                  <Pencil size={14} />
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-danger btn-compact"
                                  aria-label={t('common.delete')}
                                  title={t('common.delete')}
                                  disabled={deleteGradeMutation.isPending}
                                  onClick={() => confirmDelete(() => deleteGradeMutation.mutate(grade.id))}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            )}
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
            <TeacherClassSelector classes={classes} selectedClass={selectedClass} onSelect={selectClass} />

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
                          {editingHomework?.id === item.id ? (
                            <form
                              className="inline-edit-form"
                              onSubmit={(event) => {
                                event.preventDefault();
                                updateHomeworkMutation.mutate(editingHomework);
                              }}
                            >
                              <textarea
                                className="form-input"
                                aria-label={t('teacher.homeworkContentLabel')}
                                value={editingHomework.content}
                                onChange={(event) => setEditingHomework({ ...editingHomework, content: event.target.value })}
                                required
                              />
                              <input
                                className="form-input"
                                type="date"
                                aria-label={t('teacher.homeworkDueLabel')}
                                value={editingHomework.dueDate}
                                onChange={(event) => setEditingHomework({ ...editingHomework, dueDate: event.target.value })}
                                required
                              />
                              <div className="table-actions">
                                <button type="submit" className="btn btn-primary btn-compact" disabled={updateHomeworkMutation.isPending}>
                                  {t('common.save')}
                                </button>
                                <button type="button" className="btn btn-secondary btn-compact" onClick={() => setEditingHomework(null)}>
                                  {t('common.cancel')}
                                </button>
                              </div>
                            </form>
                          ) : (
                            <p>{item.homework_content}</p>
                          )}
                          {item.lesson_content && (
                            <div className="homework-preparation-note">
                              {t('teacher.homeworkPreparation')}: {item.lesson_content}
                            </div>
                          )}
                          {item.created_by && item.created_by === myId && editingHomework?.id !== item.id && (
                            <div className="table-actions">
                              <button
                                type="button"
                                className="btn btn-secondary btn-compact"
                                onClick={() =>
                                  setEditingHomework({
                                    id: item.id,
                                    content: item.homework_content,
                                    dueDate: item.due_date.slice(0, 10),
                                  })
                                }
                              >
                                <Pencil size={14} /> {t('common.edit')}
                              </button>
                              <button
                                type="button"
                                className="btn btn-danger btn-compact"
                                disabled={deleteHomeworkMutation.isPending}
                                onClick={() => confirmDelete(() => deleteHomeworkMutation.mutate(item.id))}
                              >
                                <Trash2 size={14} /> {t('common.delete')}
                              </button>
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

            {selectedClass && (
              <div className="teacher-exam-planner">
                <div className="dashboard-toolbar">
                  <div>
                    <h3 className="dashboard-section-title dashboard-section-title--plain">{t('teacher.examPlannerTitle')}</h3>
                    <p className="dashboard-section-copy">
                      {t('teacher.examPlannerCopy', { className: selectedClass.name })}
                    </p>
                  </div>
                  <span className="badge badge-success">
                    {t('teacher.examUpcomingCount', { count: upcomingExamsCount })}
                  </span>
                </div>

                <div className="teacher-homework-entry-grid teacher-exam-entry-grid">
                  <form className="stacked-form teacher-homework-form teacher-exam-form" onSubmit={handleExamSubmit}>
                    <div className="teacher-homework-form-row">
                      <div className="form-group">
                        <label className="form-label" htmlFor="exam-class">{t('teacher.examClass')}</label>
                        <select
                          id="exam-class"
                          className="form-input"
                          value={selectedClass.id}
                          onChange={(event) => {
                            const nextClass = classes.find((schoolClass) => schoolClass.id === event.target.value);
                            if (nextClass) selectClass(nextClass);
                          }}
                        >
                          {classes.map((schoolClass) => (
                            <option key={schoolClass.id} value={schoolClass.id}>{schoolClass.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label" htmlFor="exam-course">{t('teacher.examCourse')}</label>
                        <select
                          id="exam-course"
                          className="form-input"
                          value={examForm.courseId}
                          onChange={(event) => {
                            const course = classCourses.find((candidate) => candidate.course_id === event.target.value);
                            setExamForm((current) => ({
                              ...current,
                              courseId: event.target.value,
                              subject: course?.course_name || current.subject,
                            }));
                          }}
                        >
                          <option value="">{t('teacher.examManualSubject')}</option>
                          {classCourses.map((course) => (
                            <option key={course.course_id} value={course.course_id}>
                              {course.course_name || t('teacher.examCourse')}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="exam-subject">{t('teacher.examSubject')}</label>
                      <input
                        id="exam-subject"
                        className="form-input"
                        type="text"
                        value={selectedExamCourse?.course_name || examForm.subject}
                        onChange={(event) => setExamForm((current) => ({ ...current, subject: event.target.value }))}
                        readOnly={Boolean(selectedExamCourse)}
                        required
                      />
                    </div>

                    <div className="teacher-homework-form-row">
                      <div className="form-group">
                        <label className="form-label" htmlFor="exam-date">{t('teacher.examDate')}</label>
                        <input
                          id="exam-date"
                          className="form-input"
                          type="date"
                          value={examForm.examDate}
                          onChange={(event) => setExamForm((current) => ({ ...current, examDate: event.target.value }))}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label" htmlFor="exam-room">{t('teacher.examRoom')}</label>
                        <input
                          id="exam-room"
                          className="form-input"
                          type="text"
                          value={examForm.room}
                          onChange={(event) => setExamForm((current) => ({ ...current, room: event.target.value }))}
                          placeholder={t('teacher.examRoomPlaceholder')}
                        />
                      </div>
                    </div>

                    <div className="teacher-homework-form-row">
                      <div className="form-group">
                        <label className="form-label" htmlFor="exam-start-time">{t('teacher.examStartTime')}</label>
                        <input
                          id="exam-start-time"
                          className="form-input"
                          type="time"
                          value={examForm.startTime}
                          onChange={(event) => setExamForm((current) => ({ ...current, startTime: event.target.value }))}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label" htmlFor="exam-end-time">{t('teacher.examEndTime')}</label>
                        <input
                          id="exam-end-time"
                          className="form-input"
                          type="time"
                          value={examForm.endTime}
                          onChange={(event) => setExamForm((current) => ({ ...current, endTime: event.target.value }))}
                          required
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="exam-description">{t('teacher.examDescription')}</label>
                      <textarea
                        id="exam-description"
                        className="form-input teacher-homework-textarea"
                        value={examForm.description}
                        onChange={(event) => setExamForm((current) => ({ ...current, description: event.target.value }))}
                        placeholder={t('teacher.examDescriptionPlaceholder')}
                      />
                    </div>

                    <button
                      type="submit"
                      className="btn btn-primary btn-full"
                      disabled={publishExamMutation.isPending}
                    >
                      <Calendar size={16} /> {t('teacher.examPublish')}
                    </button>
                    <p className="dashboard-section-copy teacher-homework-note">{t('teacher.examNotificationHint')}</p>
                  </form>

                  <div>
                    <h3 className="dashboard-section-title">{t('teacher.examPlannedTitle')}</h3>
                    <div className="dashboard-list teacher-homework-list teacher-exam-list">
                      {examsQuery.isLoading && <p className="empty-list-copy">{t('common.loading')}</p>}
                      {!examsQuery.isLoading && exams.length === 0 && (
                        <p className="empty-list-copy">{t('teacher.emptyExams')}</p>
                      )}
                      {exams.map((exam) => (
                        <div key={exam.id} className="homework-announcement-card exam-schedule-card">
                          <div className="homework-announcement-header">
                            <span className="badge badge-compact badge-success">{formatDate(exam.exam_date, locale)}</span>
                            <span className="homework-due-date">
                              {formatClock(exam.start_time, locale)} - {formatClock(exam.end_time, locale)}
                            </span>
                          </div>
                          <h4>{exam.course_name}</h4>
                          <p>{t('teacher.examScheduledFor', { className: selectedClass.name })}</p>
                          {exam.room && (
                            <div className="homework-preparation-note">
                              {t('teacher.examRoom')}: {exam.room}
                            </div>
                          )}
                          {exam.description && (
                            <div className="homework-preparation-note">
                              {t('teacher.examDescription')}: {exam.description}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {!isLoading && activeTab === 'chat' && <DirectMessagingPanel scopeKey="teacher" />}
        {!isLoading && activeTab === 'meetings' && (
          <TeacherMeetingsPanel
            classes={classes.map((schoolClass) => ({ id: schoolClass.id, name: schoolClass.name }))}
          />
        )}
        {!isLoading && activeTab === 'announcements' && (
          <AnnouncementsPanel
            scopeKey="teacher"
            canCreate={classes.length > 0}
            allowWholeSchool={false}
            classes={classes.map((schoolClass) => ({ id: schoolClass.id, name: schoolClass.name }))}
          />
        )}
      </div>
    </div>
  );
}
