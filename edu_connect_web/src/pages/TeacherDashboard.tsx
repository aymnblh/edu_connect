import { useCallback, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BookOpen,
  Calendar,
  CalendarClock,
  ClipboardList,
  Megaphone,
  MessageSquare,
  NotebookText,
  RefreshCw,
  UserCheck,
  Users,
} from 'lucide-react';
import AnnouncementsPanel from '../components/AnnouncementsPanel';
import DashboardActionGrid from '../components/DashboardActionGrid';
import DirectMessagingPanel from '../components/DirectMessagingPanel';
import { ClassHealthAlerts } from '../components/DirectorRecordsPanels';
import { TeacherMeetingsPanel } from '../components/MeetingsPanel';
import TeacherAttendanceTab from '../components/teacher/TeacherAttendanceTab';
import TeacherGradesTab from '../components/teacher/TeacherGradesTab';
import TeacherHomeworkTab from '../components/teacher/TeacherHomeworkTab';
import TeacherScheduleTab from '../components/teacher/TeacherScheduleTab';
import type {
  ClassCourse,
  Grade,
  Homework,
  ScheduleExam,
  ScheduleSlot,
  SchoolClass,
  Student,
  TeacherTab,
  Toast,
} from '../components/teacher/types';
import { api } from '../lib/api';
import { formatClock } from '../lib/formatters';
import { useLocale } from '../lib/i18n';

let toastId = 0;

export default function TeacherDashboard() {
  const [activeTab, setActiveTab] = useState<TeacherTab>('classes');
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
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

  const pendingGradesCount = grades.filter((grade) => !grade.is_approved).length;
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

  const selectClass = (schoolClass: SchoolClass) => {
    setSelectedClassId(schoolClass.id);
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
          <TeacherAttendanceTab
            key={selectedClass.id}
            classes={classes}
            selectedClass={selectedClass}
            students={students}
            attendanceSectionRef={attendanceSectionRef}
            onSelectClass={selectClass}
          />
        )}

        {!isLoading && selectedClass && activeTab === 'grades' && (
          <TeacherGradesTab
            key={selectedClass.id}
            classes={classes}
            selectedClass={selectedClass}
            students={students}
            classCourses={classCourses}
            grades={grades}
            isLoadingGrades={gradesQuery.isLoading}
            pendingGradesCount={pendingGradesCount}
            onSelectClass={selectClass}
            addToast={addToast}
          />
        )}

        {!isLoading && selectedClass && activeTab === 'homework' && (
          <TeacherHomeworkTab
            key={selectedClass.id}
            classes={classes}
            selectedClass={selectedClass}
            classCourses={classCourses}
            homework={homework}
            isLoadingHomework={homeworkQuery.isLoading}
            upcomingHomeworkCount={upcomingHomeworkCount}
            myId={myId}
            onSelectClass={selectClass}
            addToast={addToast}
          />
        )}

        {!isLoading && activeTab === 'schedule' && (
          <TeacherScheduleTab
            key={selectedClass?.id ?? 'no-class'}
            classes={classes}
            selectedClass={selectedClass}
            classCourses={classCourses}
            schedule={schedule}
            exams={exams}
            isLoadingExams={examsQuery.isLoading}
            upcomingExamsCount={upcomingExamsCount}
            onSelectClass={selectClass}
          />
        )}

        {!isLoading && activeTab === 'chat' && (
          <DirectMessagingPanel
            scopeKey="teacher"
            classes={classes.map((schoolClass) => ({ id: schoolClass.id, name: schoolClass.name }))}
          />
        )}
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
