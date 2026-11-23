import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, NotebookText, Pencil, Trash2 } from 'lucide-react';
import { api } from '../../lib/api';
import { formatShortDate, getApiErrorMessage } from '../../lib/formatters';
import { useLocale } from '../../lib/i18n';
import { TeacherClassSelector, TeacherSaveFeedback } from './TeacherShared';
import { gradeOnTwenty, type AddTeacherToastFn, type ClassCourse, type Grade, type SchoolClass, type Student } from './types';

interface TeacherGradesTabProps {
  classes: SchoolClass[];
  selectedClass: SchoolClass;
  students: Student[];
  classCourses: ClassCourse[];
  grades: Grade[];
  isLoadingGrades: boolean;
  pendingGradesCount: number;
  onSelectClass: (schoolClass: SchoolClass) => void;
  addToast: AddTeacherToastFn;
}

export default function TeacherGradesTab({
  classes,
  selectedClass,
  students,
  classCourses,
  grades,
  isLoadingGrades,
  pendingGradesCount,
  onSelectClass,
  addToast,
}: TeacherGradesTabProps) {
  const { t, locale } = useLocale();
  const queryClient = useQueryClient();
  const [gradeForm, setGradeForm] = useState({
    studentId: '',
    courseId: '',
    subject: '',
    score: '',
    maxScore: '20',
    comment: '',
  });
  const [editingGrade, setEditingGrade] = useState<{ id: string; score: string; comment: string } | null>(null);

  const selectedCourse = classCourses.find((course) => course.course_id === gradeForm.courseId);

  useEffect(() => {
    const studentSignature = students.map((student) => student.id).join('|');
    const courseSignature = classCourses.map((course) => course.course_id).join('|');
    if (!studentSignature && !courseSignature && !selectedClass.subject) return;

    const syncTimer = window.setTimeout(() => setGradeForm((current) => {
      const hasStudent = Boolean(current.studentId) && students.some((student) => student.id === current.studentId);
      const currentCourse = classCourses.find((course) => course.course_id === current.courseId);
      const fallbackCourse = classCourses[0];
      const nextStudentId = hasStudent ? current.studentId : students[0]?.id ?? '';
      const nextCourseId = currentCourse?.course_id ?? fallbackCourse?.course_id ?? '';
      const defaultSubject = currentCourse?.course_name ?? fallbackCourse?.course_name ?? current.subject.trim();
      const nextSubject = defaultSubject || selectedClass.subject || '';

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
  }, [classCourses, selectedClass.subject, students]);

  const addGradeMutation = useMutation({
    mutationFn: async () => {
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
      void queryClient.invalidateQueries({ queryKey: ['teacher', 'grades', selectedClass.id] });
    },
  });

  const updateGradeMutation = useMutation({
    mutationFn: async (draft: { id: string; score: string; comment: string }) => {
      await api.patch(`/classes/${selectedClass.id}/grades/${draft.id}`, {
        score: Number(draft.score.replace(',', '.')),
        comment: draft.comment.trim() || null,
      });
    },
    onSuccess: () => {
      setEditingGrade(null);
      queryClient.invalidateQueries({ queryKey: ['teacher', 'grades', selectedClass.id] });
      addToast(t('teacher.toastSaved'), 'success');
    },
    onError: (error) => addToast(getApiErrorMessage(error, t('auth.connectionError')), 'error'),
  });

  const deleteGradeMutation = useMutation({
    mutationFn: async (gradeId: string) => {
      await api.delete(`/classes/${selectedClass.id}/grades/${gradeId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher', 'grades', selectedClass.id] });
      addToast(t('teacher.entryDeleted'), 'success');
    },
    onError: (error) => addToast(getApiErrorMessage(error, t('auth.connectionError')), 'error'),
  });

  const handleGradeSubmit = (event: FormEvent) => {
    event.preventDefault();
    addGradeMutation.mutate();
  };

  return (
    <div className="animate-fade-in dashboard-split dashboard-split--teacher-grades" role="tabpanel">
      <TeacherClassSelector classes={classes} selectedClass={selectedClass} onSelect={onSelectClass} />

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

            <TeacherSaveFeedback
              mutation={addGradeMutation}
              pendingMessage={t('teacher.gradeSaving')}
              successMessage={t('teacher.gradeToastSaved')}
            />

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
              {isLoadingGrades && <p className="empty-list-copy">{t('common.loading')}</p>}
              {!isLoadingGrades && grades.length === 0 && (
                <p className="empty-list-copy">{t('teacher.emptyGrades')}</p>
              )}
              {grades.map((grade) => {
                const score = gradeOnTwenty(grade);
                return (
                  <div key={grade.id} className="student-list-item teacher-grade-item">
                    <div className="teacher-grade-main">
                      <span className="grade-subject">{grade.subject}</span>
                      <div className="grade-date">
                        {grade.student_name} - {formatShortDate(grade.date, locale)}
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
                            onClick={() => {
                              if (window.confirm(t('teacher.confirmDelete'))) {
                                deleteGradeMutation.mutate(grade.id);
                              }
                            }}
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
  );
}
