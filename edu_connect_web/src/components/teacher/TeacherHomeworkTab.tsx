import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ClipboardList, Loader2, Pencil, Trash2 } from 'lucide-react';
import { api } from '../../lib/api';
import { formatShortDate, getApiErrorMessage } from '../../lib/formatters';
import { useLocale } from '../../lib/i18n';
import { TeacherClassSelector, TeacherSaveFeedback } from './TeacherShared';
import {
  defaultDueDate,
  dueDateToIso,
  normalizeHomeworkKind,
  type AddTeacherToastFn,
  type ClassCourse,
  type Homework,
  type HomeworkKind,
  type SchoolClass,
} from './types';

interface TeacherHomeworkTabProps {
  classes: SchoolClass[];
  selectedClass: SchoolClass;
  classCourses: ClassCourse[];
  homework: Homework[];
  isLoadingHomework: boolean;
  upcomingHomeworkCount: number;
  myId?: string;
  onSelectClass: (schoolClass: SchoolClass) => void;
  addToast: AddTeacherToastFn;
}

export default function TeacherHomeworkTab({
  classes,
  selectedClass,
  classCourses,
  homework,
  isLoadingHomework,
  upcomingHomeworkCount,
  myId,
  onSelectClass,
  addToast,
}: TeacherHomeworkTabProps) {
  const { t, locale } = useLocale();
  const queryClient = useQueryClient();
  const [homeworkForm, setHomeworkForm] = useState({
    kind: 'homework' as HomeworkKind,
    courseId: '',
    subject: '',
    lessonContent: '',
    homeworkContent: '',
    dueDate: defaultDueDate(),
  });
  const [editingHomework, setEditingHomework] = useState<{ id: string; content: string; dueDate: string } | null>(null);

  const selectedHomeworkCourse = classCourses.find((course) => course.course_id === homeworkForm.courseId);

  useEffect(() => {
    const courseSignature = classCourses.map((course) => course.course_id).join('|');
    if (!courseSignature && !selectedClass.subject) return;

    const syncTimer = window.setTimeout(() => setHomeworkForm((current) => {
      const currentCourse = classCourses.find((course) => course.course_id === current.courseId);
      const fallbackCourse = classCourses[0];
      const nextCourseId = currentCourse?.course_id ?? fallbackCourse?.course_id ?? '';
      const defaultSubject = currentCourse?.course_name ?? fallbackCourse?.course_name ?? current.subject.trim();
      const nextSubject = defaultSubject || selectedClass.subject || '';

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
  }, [classCourses, selectedClass.subject]);

  const publishHomeworkMutation = useMutation({
    mutationFn: async () => {
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
      setHomeworkForm((current) => ({
        ...current,
        lessonContent: '',
        homeworkContent: '',
        dueDate: defaultDueDate(),
      }));
      void queryClient.invalidateQueries({ queryKey: ['teacher', 'homework', selectedClass.id] });
    },
  });

  const updateHomeworkMutation = useMutation({
    mutationFn: async (draft: { id: string; content: string; dueDate: string }) => {
      await api.patch(`/classes/${selectedClass.id}/homework/${draft.id}`, {
        homework_content: draft.content.trim(),
        due_date: new Date(`${draft.dueDate}T12:00:00`).toISOString(),
      });
    },
    onSuccess: () => {
      setEditingHomework(null);
      queryClient.invalidateQueries({ queryKey: ['teacher', 'homework', selectedClass.id] });
      addToast(t('teacher.toastSaved'), 'success');
    },
    onError: (error) => addToast(getApiErrorMessage(error, t('auth.connectionError')), 'error'),
  });

  const deleteHomeworkMutation = useMutation({
    mutationFn: async (homeworkId: string) => {
      await api.delete(`/classes/${selectedClass.id}/homework/${homeworkId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher', 'homework', selectedClass.id] });
      addToast(t('teacher.entryDeleted'), 'success');
    },
    onError: (error) => addToast(getApiErrorMessage(error, t('auth.connectionError')), 'error'),
  });

  const handleHomeworkSubmit = (event: FormEvent) => {
    event.preventDefault();
    publishHomeworkMutation.mutate();
  };

  return (
    <div className="animate-fade-in dashboard-split dashboard-split--teacher-homework" role="tabpanel">
      <TeacherClassSelector classes={classes} selectedClass={selectedClass} onSelect={onSelectClass} />

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
          <form
            className="stacked-form teacher-homework-form"
            onSubmit={handleHomeworkSubmit}
            onChange={() => {
              if (publishHomeworkMutation.isSuccess || publishHomeworkMutation.isError) publishHomeworkMutation.reset();
            }}
            aria-busy={publishHomeworkMutation.isPending}
          >
            <div className="form-group">
              <span id="homework-kind-label" className="form-label">{t('teacher.homeworkKind')}</span>
              <div className="teacher-homework-kind" role="group" aria-labelledby="homework-kind-label">
                {(['homework', 'assignment', 'exam'] as HomeworkKind[]).map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    className={`teacher-homework-kind-option ${homeworkForm.kind === kind ? 'teacher-homework-kind-option--active' : ''}`}
                    aria-pressed={homeworkForm.kind === kind}
                    disabled={publishHomeworkMutation.isPending}
                    onClick={() => {
                      publishHomeworkMutation.reset();
                      setHomeworkForm((current) => ({ ...current, kind }));
                    }}
                  >
                    {t(`teacher.homeworkKind.${kind}`)}
                  </button>
                ))}
              </div>
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

            <TeacherSaveFeedback
              mutation={publishHomeworkMutation}
              pendingMessage={t('teacher.homeworkPublishing')}
              successMessage={t('teacher.homeworkToastSaved')}
            />

            <div className="teacher-form-actions">
              <button
                type="submit"
                className="btn btn-primary btn-full"
                disabled={publishHomeworkMutation.isPending}
              >
                {publishHomeworkMutation.isPending ? <Loader2 size={16} className="spin-icon" /> : <ClipboardList size={16} />}
                {publishHomeworkMutation.isPending ? t('teacher.homeworkPublishing') : t('teacher.homeworkPublish')}
              </button>
              <p className="dashboard-section-copy teacher-homework-note">{t('teacher.homeworkNotificationHint')}</p>
            </div>
          </form>

          <div>
            <h3 className="dashboard-section-title">{t('teacher.latestHomework')}</h3>
            <div className="dashboard-list teacher-homework-list">
              {isLoadingHomework && <p className="empty-list-copy">{t('common.loading')}</p>}
              {!isLoadingHomework && homework.length === 0 && (
                <p className="empty-list-copy">{t('teacher.emptyHomework')}</p>
              )}
              {homework.map((item) => {
                const kind = normalizeHomeworkKind(item.kind);
                return (
                  <div key={item.id} className="homework-announcement-card">
                    <div className="homework-announcement-header">
                      <span className="badge badge-compact badge-success">{t(`teacher.homeworkKind.${kind}`)}</span>
                      <span className="homework-due-date">
                        {t('teacher.homeworkDueOn', { date: formatShortDate(item.due_date, locale) })}
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
                          onClick={() => {
                            if (window.confirm(t('teacher.confirmDelete'))) {
                              deleteHomeworkMutation.mutate(item.id);
                            }
                          }}
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
  );
}
