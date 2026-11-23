import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, Loader2 } from 'lucide-react';
import { api } from '../../lib/api';
import { formatClock, formatShortDate } from '../../lib/formatters';
import { useLocale } from '../../lib/i18n';
import { TeacherSaveFeedback } from './TeacherShared';
import {
  defaultDueDate,
  type ClassCourse,
  type ScheduleExam,
  type ScheduleSlot,
  type SchoolClass,
} from './types';

interface TeacherScheduleTabProps {
  classes: SchoolClass[];
  selectedClass?: SchoolClass;
  classCourses: ClassCourse[];
  schedule: ScheduleSlot[];
  exams: ScheduleExam[];
  isLoadingExams: boolean;
  upcomingExamsCount: number;
  onSelectClass: (schoolClass: SchoolClass) => void;
}

export default function TeacherScheduleTab({
  classes,
  selectedClass,
  classCourses,
  schedule,
  exams,
  isLoadingExams,
  upcomingExamsCount,
  onSelectClass,
}: TeacherScheduleTabProps) {
  const { t, locale } = useLocale();
  const queryClient = useQueryClient();
  const [examForm, setExamForm] = useState({
    courseId: '',
    subject: '',
    examDate: defaultDueDate(),
    startTime: '08:00',
    endTime: '10:00',
    room: '',
    description: '',
  });

  const selectedExamCourse = classCourses.find((course) => course.course_id === examForm.courseId);

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
  });

  const handleExamSubmit = (event: FormEvent) => {
    event.preventDefault();
    publishExamMutation.mutate();
  };

  return (
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
            <form
              className="stacked-form teacher-homework-form teacher-exam-form"
              onSubmit={handleExamSubmit}
              onChange={() => {
                if (publishExamMutation.isSuccess || publishExamMutation.isError) publishExamMutation.reset();
              }}
              aria-busy={publishExamMutation.isPending}
            >
              <div className="teacher-homework-form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="exam-class">{t('teacher.examClass')}</label>
                  <select
                    id="exam-class"
                    className="form-input"
                    value={selectedClass.id}
                    onChange={(event) => {
                      const nextClass = classes.find((schoolClass) => schoolClass.id === event.target.value);
                      if (nextClass) onSelectClass(nextClass);
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

              <TeacherSaveFeedback
                mutation={publishExamMutation}
                pendingMessage={t('teacher.examPublishing')}
                successMessage={t('teacher.examToastSaved')}
              />

              <div className="teacher-form-actions">
                <button
                  type="submit"
                  className="btn btn-primary btn-full"
                  disabled={publishExamMutation.isPending}
                >
                  {publishExamMutation.isPending ? <Loader2 size={16} className="spin-icon" /> : <Calendar size={16} />}
                  {publishExamMutation.isPending ? t('teacher.examPublishing') : t('teacher.examPublish')}
                </button>
                <p className="dashboard-section-copy teacher-homework-note">{t('teacher.examNotificationHint')}</p>
              </div>
            </form>

            <div>
              <h3 className="dashboard-section-title">{t('teacher.examPlannedTitle')}</h3>
              <div className="dashboard-list teacher-homework-list teacher-exam-list">
                {isLoadingExams && <p className="empty-list-copy">{t('common.loading')}</p>}
                {!isLoadingExams && exams.length === 0 && (
                  <p className="empty-list-copy">{t('teacher.emptyExams')}</p>
                )}
                {exams.map((exam) => (
                  <div key={exam.id} className="homework-announcement-card exam-schedule-card">
                    <div className="homework-announcement-header">
                      <span className="badge badge-compact badge-success">{formatShortDate(exam.exam_date, locale)}</span>
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
  );
}
