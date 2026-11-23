import { useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, CalendarDays, GraduationCap, Loader2, Plus, RotateCcw, Sparkles, Users } from 'lucide-react';
import { api } from '../../lib/api';
import { formatDate, getApiErrorMessage } from '../../lib/formatters';
import { useLocale } from '../../lib/i18n';
import type {
  AddToastFn,
  ClassCourseAssignment,
  Course,
  SchoolClass,
  Semester,
  Student,
  Teacher,
} from './types';

interface DirectorClassesTabProps {
  schoolId: string;
  classes: SchoolClass[];
  isLoadingClasses: boolean;
  activeStudents: Student[];
  canManageAcademicYears?: boolean;
  addToast: AddToastFn;
}

const emptyTeachers: Teacher[] = [];
const emptyCourses: Course[] = [];
const emptySemesters: Semester[] = [];

export default function DirectorClassesTab({
  schoolId,
  classes,
  isLoadingClasses,
  activeStudents,
  canManageAcademicYears = false,
  addToast,
}: DirectorClassesTabProps) {
  const { t, locale } = useLocale();
  const queryClient = useQueryClient();
  const [classForm, setClassForm] = useState({ name: '', subject: '' });
  const [courseName, setCourseName] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedCourseClassId, setSelectedCourseClassId] = useState('');
  const [assignmentForm, setAssignmentForm] = useState({ course_id: '', teacher_id: '', coefficient: '1' });
  const [enrollmentDraft, setEnrollmentDraft] = useState<{ classId: string; ids: string[] } | null>(null);
  const [showArchivedClasses, setShowArchivedClasses] = useState(false);

  const archivedClassesQuery = useQuery<SchoolClass[]>({
    queryKey: ['director-classes-all'],
    enabled: showArchivedClasses,
    queryFn: async () => {
      const res = await api.get('/classes/', { params: { include_archived: true } });
      return res.data;
    },
  });

  const displayedClasses = showArchivedClasses ? (archivedClassesQuery.data ?? classes) : classes;

  const teachersQuery = useQuery<Teacher[]>({
    queryKey: ['director-teachers'],
    queryFn: async () => {
      const res = await api.get('/classes/teachers/all');
      return res.data;
    },
  });

  const coursesQuery = useQuery<Course[]>({
    queryKey: ['director-courses'],
    queryFn: async () => {
      const res = await api.get('/admin/courses');
      return res.data;
    },
  });

  const semestersQuery = useQuery<Semester[]>({
    queryKey: ['director-semesters'],
    queryFn: async () => {
      const res = await api.get('/admin/semesters');
      return res.data;
    },
  });

  const teachers = teachersQuery.data ?? emptyTeachers;
  const courses = coursesQuery.data ?? emptyCourses;
  const semesters = semestersQuery.data ?? emptySemesters;

  const resolvedSelectedClassId = selectedClassId || classes[0]?.id || '';
  const resolvedSelectedCourseClassId = selectedCourseClassId || classes[0]?.id || '';
  const selectedClass = classes.find((schoolClass) => schoolClass.id === resolvedSelectedClassId) ?? null;

  const selectedClassMemberIds = useMemo(
    () => selectedClass?.members?.map((student) => student.id) ?? [],
    [selectedClass],
  );
  const enrollmentIds =
    enrollmentDraft?.classId === resolvedSelectedClassId ? enrollmentDraft.ids : selectedClassMemberIds;

  const classCoursesQuery = useQuery<ClassCourseAssignment[]>({
    queryKey: ['class-courses', resolvedSelectedCourseClassId],
    enabled: Boolean(resolvedSelectedCourseClassId),
    queryFn: async () => {
      const res = await api.get(`/classes/${resolvedSelectedCourseClassId}/courses`);
      return res.data;
    },
  });

  const createClassMutation = useMutation({
    mutationFn: async () => {
      if (!schoolId) throw new Error(t('director.error.missingSchoolId'));
      const res = await api.post('/classes/', {
        name: classForm.name,
        subject: classForm.subject || null,
        school_id: schoolId,
      });
      return res.data as SchoolClass;
    },
    onSuccess: (schoolClass) => {
      queryClient.invalidateQueries({ queryKey: ['director-classes'] });
      setEnrollmentDraft(null);
      setSelectedClassId(schoolClass.id);
      setSelectedCourseClassId(schoolClass.id);
      setClassForm({ name: '', subject: '' });
      addToast(t('director.toast.classCreated', { name: schoolClass.name }), 'success');
    },
    onError: (error) => addToast(getApiErrorMessage(error), 'error'),
  });

  const createCourseMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/admin/courses', { name: courseName });
      return res.data as Course;
    },
    onSuccess: (course) => {
      queryClient.invalidateQueries({ queryKey: ['director-courses'] });
      setCourseName('');
      setAssignmentForm((current) => ({
        ...current,
        course_id: course.id,
        coefficient: String(course.coefficient ?? 1),
      }));
      addToast(t('director.toast.courseAdded', { name: course.name }), 'success');
    },
    onError: (error) => addToast(getApiErrorMessage(error), 'error'),
  });

  const assignCourseMutation = useMutation({
    mutationFn: async () => {
      if (!resolvedSelectedCourseClassId) throw new Error(t('director.error.chooseClass'));
      const coefficient = Number.parseFloat(assignmentForm.coefficient);
      const res = await api.post(`/classes/${resolvedSelectedCourseClassId}/courses`, {
        course_id: assignmentForm.course_id,
        teacher_id: assignmentForm.teacher_id,
        coefficient: Number.isFinite(coefficient) && coefficient > 0 ? coefficient : 1,
      });
      return res.data as ClassCourseAssignment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-courses', resolvedSelectedCourseClassId] });
      queryClient.invalidateQueries({ queryKey: ['director-classes'] });
      addToast(t('director.toast.courseAssigned'), 'success');
    },
    onError: (error) => addToast(getApiErrorMessage(error), 'error'),
  });

  const enrollStudentsMutation = useMutation({
    mutationFn: async () => {
      if (!resolvedSelectedClassId) throw new Error(t('director.error.chooseClass'));
      await api.put(`/classes/${resolvedSelectedClassId}/students`, { student_ids: enrollmentIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['director-classes'] });
      addToast(t('director.toast.classListSaved'), 'success');
    },
    onError: (error) => addToast(getApiErrorMessage(error), 'error'),
  });

  const activateSemesterMutation = useMutation({
    mutationFn: async (semester: Semester) => {
      const res = await api.put(`/admin/semesters/${semester.id}`, { is_active: true });
      return res.data as Semester;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['director-semesters'] });
      addToast(t('director.toast.semesterActivated'), 'success');
    },
    onError: (error) => addToast(getApiErrorMessage(error), 'error'),
  });

  const archiveClassMutation = useMutation({
    mutationFn: async (schoolClass: SchoolClass) => {
      await api.post(`/classes/${schoolClass.id}/archive`);
      return schoolClass;
    },
    onSuccess: (schoolClass) => {
      queryClient.invalidateQueries({ queryKey: ['director-classes'] });
      queryClient.invalidateQueries({ queryKey: ['director-classes-all'] });
      addToast(t('director.toast.classArchived', { name: schoolClass.name }), 'success');
    },
    onError: (error) => addToast(getApiErrorMessage(error), 'error'),
  });

  const restoreClassMutation = useMutation({
    mutationFn: async (schoolClass: SchoolClass) => {
      await api.post(`/classes/${schoolClass.id}/restore`);
      return schoolClass;
    },
    onSuccess: (schoolClass) => {
      queryClient.invalidateQueries({ queryKey: ['director-classes'] });
      queryClient.invalidateQueries({ queryKey: ['director-classes-all'] });
      addToast(t('director.toast.classRestored', { name: schoolClass.name }), 'success');
    },
    onError: (error) => addToast(getApiErrorMessage(error), 'error'),
  });

  const nextAcademicStartYear = useMemo(() => {
    const years = semesters
      .map((sem) => {
        const match = /^(\d{4})-\d{4}$/.exec(sem.academic_year ?? '');
        if (match) return Number(match[1]);
        const dt = new Date(sem.start_date);
        if (Number.isNaN(dt.getTime())) return null;
        return dt.getUTCMonth() + 1 >= 9 ? dt.getUTCFullYear() : dt.getUTCFullYear() - 1;
      })
      .filter((year): year is number => typeof year === 'number');
    const now = new Date();
    const currentStart = now.getMonth() + 1 >= 9 ? now.getFullYear() : now.getFullYear() - 1;
    return years.length > 0 ? Math.max(...years) + 1 : currentStart + 1;
  }, [semesters]);

  const startAcademicYearMutation = useMutation({
    mutationFn: async (startYear: number) => {
      const res = await api.post('/admin/academic-years/start', {
        start_year: startYear,
        archive_previous_classes: true,
      });
      return res.data as { academic_year: string; semesters_created: number; archived_classes: number };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['director-semesters'] });
      queryClient.invalidateQueries({ queryKey: ['director-classes'] });
      queryClient.invalidateQueries({ queryKey: ['director-classes-all'] });
      addToast(
        t('director.toast.academicYearStarted', {
          year: result.academic_year,
          archived: result.archived_classes,
        }),
        'success',
      );
    },
    onError: (error) => addToast(getApiErrorMessage(error), 'error'),
  });

  const handleStartNextAcademicYear = () => {
    const nextLabel = `${nextAcademicStartYear}-${nextAcademicStartYear + 1}`;
    if (!window.confirm(t('director.semesters.startNextConfirm', { year: nextLabel }))) return;
    startAcademicYearMutation.mutate(nextAcademicStartYear);
  };

  const handleClassSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    createClassMutation.mutate();
  };

  const handleCourseSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    createCourseMutation.mutate();
  };

  const handleAssignmentSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    assignCourseMutation.mutate();
  };

  return (
    <div className="director-management-grid director-management-grid--balanced">
      <section className="glass-card management-card">
        <h2 className="dashboard-section-title dashboard-section-title--plain">{t('director.classes.createTitle')}</h2>
        <p className="dashboard-section-copy dashboard-section-copy--spaced">{t('director.classes.createCopy')}</p>
        <form className="stacked-form" onSubmit={handleClassSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="class-name">{t('director.classes.className')}</label>
            <input
              id="class-name"
              className="form-input"
              value={classForm.name}
              onChange={(event) => setClassForm((current) => ({ ...current, name: event.target.value }))}
              placeholder={t('director.classes.classNamePlaceholder')}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="class-subject">{t('director.classes.specialty')}</label>
            <input
              id="class-subject"
              className="form-input"
              value={classForm.subject}
              onChange={(event) => setClassForm((current) => ({ ...current, subject: event.target.value }))}
              placeholder={t('director.classes.specialtyPlaceholder')}
            />
          </div>
          <button type="submit" className="btn btn-primary btn-full" disabled={createClassMutation.isPending}>
            {createClassMutation.isPending ? <Loader2 size={16} className="spin-icon" /> : <Plus size={16} />}
            {t('director.classes.createButton')}
          </button>
        </form>
      </section>

      <section className="glass-card management-card">
        <h2 className="dashboard-section-title dashboard-section-title--plain">{t('director.classes.addCourseTitle')}</h2>
        <p className="dashboard-section-copy dashboard-section-copy--spaced">{t('director.classes.addCourseCopy')}</p>
        <form className="stacked-form" onSubmit={handleCourseSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="course-name">{t('director.classes.courseName')}</label>
            <input
              id="course-name"
              className="form-input"
              value={courseName}
              onChange={(event) => setCourseName(event.target.value)}
              placeholder={t('director.classes.courseNamePlaceholder')}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary btn-full" disabled={createCourseMutation.isPending}>
            {createCourseMutation.isPending ? <Loader2 size={16} className="spin-icon" /> : <Plus size={16} />}
            {t('director.classes.add')}
          </button>
        </form>
      </section>

      <section className="glass-card management-card management-card--wide">
        <div className="dashboard-toolbar">
          <div>
            <h2 className="dashboard-section-title dashboard-section-title--plain">{t('director.classes.title')}</h2>
            <p className="dashboard-section-copy">{t('director.classes.copy')}</p>
          </div>
          <div className="management-actions">
            <label className="checkbox-row" style={{ marginBottom: 0 }}>
              <input
                type="checkbox"
                checked={showArchivedClasses}
                onChange={(event) => setShowArchivedClasses(event.target.checked)}
              />
              <span>{t('director.classes.showArchived')}</span>
            </label>
            <span className="status-badge status-badge--active">{t('director.classes.count', { count: displayedClasses.length })}</span>
          </div>
        </div>
        <div className="premium-table-wrapper">
          <table className="premium-table">
            <thead>
              <tr>
                <th>{t('director.classes.title')}</th>
                <th>{t('director.classes.code')}</th>
                <th>{t('director.classes.teachers')}</th>
                <th>{t('director.classes.students')}</th>
                <th>{t('director.students.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {(isLoadingClasses || (showArchivedClasses && archivedClassesQuery.isLoading)) && (
                <tr><td colSpan={5}>{t('director.classes.loading')}</td></tr>
              )}
              {!isLoadingClasses && displayedClasses.map((schoolClass) => (
                <tr key={schoolClass.id}>
                  <td>
                    <strong>{schoolClass.name}</strong>
                    {schoolClass.academic_year && (
                      <span className="badge badge-compact" style={{ marginInlineStart: '0.5rem' }}>
                        {schoolClass.academic_year}
                      </span>
                    )}
                    {schoolClass.archived_at && (
                      <span className="status-badge status-badge--expired" style={{ marginInlineStart: '0.5rem' }}>
                        {t('records.archived')}
                      </span>
                    )}
                    <div className="table-cell-muted">{schoolClass.subject || t('director.classes.noSpecialty')}</div>
                  </td>
                  <td><span className="token-inline">{schoolClass.join_code}</span></td>
                  <td>{schoolClass.teachers?.map((teacher) => teacher.full_name).join(', ') || '-'}</td>
                  <td>{schoolClass.members?.length ?? 0}</td>
                  <td>
                    <div className="table-actions">
                      {!schoolClass.archived_at && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-compact"
                          onClick={() => {
                            setSelectedClassId(schoolClass.id);
                            setSelectedCourseClassId(schoolClass.id);
                          }}
                        >
                          {t('director.classes.manage')}
                        </button>
                      )}
                      {schoolClass.archived_at ? (
                        <button
                          type="button"
                          className="btn btn-secondary btn-compact"
                          disabled={restoreClassMutation.isPending}
                          onClick={() => restoreClassMutation.mutate(schoolClass)}
                        >
                          <RotateCcw size={14} /> {t('director.classes.restore')}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-secondary btn-compact"
                          disabled={archiveClassMutation.isPending}
                          onClick={() => {
                            if (window.confirm(t('director.classes.archiveConfirm', { name: schoolClass.name }))) {
                              archiveClassMutation.mutate(schoolClass);
                            }
                          }}
                        >
                          <Archive size={14} /> {t('director.classes.archive')}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!isLoadingClasses && displayedClasses.length === 0 && (
                <tr><td colSpan={5}>{t('director.classes.empty')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="glass-card management-card">
        <h2 className="dashboard-section-title dashboard-section-title--plain">{t('director.classes.assignTitle')}</h2>
        <p className="dashboard-section-copy dashboard-section-copy--spaced">{t('director.classes.assignCopy')}</p>
        <form className="stacked-form" onSubmit={handleAssignmentSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="assignment-class">{t('director.classes.title')}</label>
            <select
              id="assignment-class"
              className="form-input"
              value={resolvedSelectedCourseClassId}
              onChange={(event) => setSelectedCourseClassId(event.target.value)}
              required
            >
              <option value="">{t('director.classes.chooseClass')}</option>
              {classes.map((schoolClass) => (
                <option key={schoolClass.id} value={schoolClass.id}>{schoolClass.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="assignment-course">{t('director.classes.course')}</label>
            <select
              id="assignment-course"
              className="form-input"
              value={assignmentForm.course_id}
              onChange={(event) => {
                const course = courses.find((candidate) => candidate.id === event.target.value);
                setAssignmentForm((current) => ({
                  ...current,
                  course_id: event.target.value,
                  coefficient: String(course?.coefficient ?? current.coefficient),
                }));
              }}
              required
            >
              <option value="">{t('director.classes.chooseCourse')}</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>{course.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="assignment-coefficient">{t('director.classes.coefficient')}</label>
            <input
              id="assignment-coefficient"
              className="form-input"
              type="number"
              min="0.1"
              step="0.1"
              value={assignmentForm.coefficient}
              onChange={(event) => setAssignmentForm((current) => ({ ...current, coefficient: event.target.value }))}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="assignment-teacher">{t('director.classes.teacher')}</label>
            <select
              id="assignment-teacher"
              className="form-input"
              value={assignmentForm.teacher_id}
              onChange={(event) => setAssignmentForm((current) => ({ ...current, teacher_id: event.target.value }))}
              required
            >
              <option value="">{t('director.classes.chooseTeacher')}</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>{teacher.full_name}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn btn-primary btn-full" disabled={assignCourseMutation.isPending}>
            {assignCourseMutation.isPending ? <Loader2 size={16} className="spin-icon" /> : <GraduationCap size={16} />}
            {t('director.classes.assign')}
          </button>
        </form>
        <div className="assignment-list">
          <h3>{t('director.classes.currentAssignments')}</h3>
          {classCoursesQuery.data?.map((assignment) => (
            <div className="assignment-item" key={`${assignment.class_id}-${assignment.course_id}`}>
              <strong>{assignment.course_name || t('director.classes.course')}</strong>
              <span>
                {assignment.teacher_name || t('director.classes.noTeacher')} - {t('director.classes.coefficient')} {assignment.coefficient ?? 1}
              </span>
            </div>
          ))}
          {resolvedSelectedCourseClassId && !classCoursesQuery.isLoading && (!classCoursesQuery.data || classCoursesQuery.data.length === 0) && (
            <p className="dashboard-section-copy">{t('director.classes.noAssignment')}</p>
          )}
        </div>
      </section>

      <section className="glass-card management-card">
        <h2 className="dashboard-section-title dashboard-section-title--plain">{t('director.classes.classStudentsTitle')}</h2>
        <p className="dashboard-section-copy dashboard-section-copy--spaced">{t('director.classes.classStudentsCopy')}</p>
        <div className="form-group">
          <label className="form-label" htmlFor="enrollment-class">{t('director.classes.title')}</label>
          <select
            id="enrollment-class"
            className="form-input"
            value={resolvedSelectedClassId}
            onChange={(event) => setSelectedClassId(event.target.value)}
          >
            <option value="">{t('director.classes.chooseClass')}</option>
            {classes.map((schoolClass) => (
              <option key={schoolClass.id} value={schoolClass.id}>{schoolClass.name}</option>
            ))}
          </select>
        </div>
        <div className="checkbox-list">
          {activeStudents.map((student) => (
            <label key={student.id} className="checkbox-row">
              <input
                type="checkbox"
                checked={enrollmentIds.includes(student.id)}
                onChange={(event) => {
                  setEnrollmentDraft({
                    classId: resolvedSelectedClassId,
                    ids: event.target.checked
                      ? Array.from(new Set([...enrollmentIds, student.id]))
                      : enrollmentIds.filter((studentId) => studentId !== student.id),
                  });
                }}
              />
              <span>{student.full_name}</span>
              <small>{student.student_id || '-'}</small>
            </label>
          ))}
          {activeStudents.length === 0 && <p className="dashboard-section-copy">{t('director.classes.importStudentsFirst')}</p>}
        </div>
        <button
          type="button"
          className="btn btn-primary btn-full"
          disabled={!resolvedSelectedClassId || enrollStudentsMutation.isPending}
          onClick={() => enrollStudentsMutation.mutate()}
        >
          {enrollStudentsMutation.isPending ? <Loader2 size={16} className="spin-icon" /> : <Users size={16} />}
          {t('director.classes.saveList')}
        </button>
      </section>

      <section className="glass-card management-card management-card--wide">
        <div className="dashboard-toolbar">
          <div>
            <h2 className="dashboard-section-title dashboard-section-title--plain">{t('director.semesters.title')}</h2>
            <p className="dashboard-section-copy">{t('director.semesters.copy')}</p>
          </div>
          <div className="management-actions">
            {canManageAcademicYears && (
              <button
                type="button"
                className="btn btn-secondary btn-compact"
                onClick={handleStartNextAcademicYear}
                disabled={startAcademicYearMutation.isPending}
              >
                {startAcademicYearMutation.isPending ? <Loader2 size={15} className="spin-icon" /> : <Sparkles size={15} />}
                {t('director.semesters.startNext', { year: `${nextAcademicStartYear}-${nextAcademicStartYear + 1}` })}
              </button>
            )}
            <CalendarDays size={22} color="var(--primary)" />
          </div>
        </div>
        <div className="semester-grid">
          {semesters.map((semester) => (
            <div className="semester-card" key={semester.id}>
              <div>
                <strong>
                  {[semester.academic_year, semester.name].filter(Boolean).join(' · ')}
                </strong>
                <span>{formatDate(semester.start_date, locale)} - {formatDate(semester.end_date, locale)}</span>
              </div>
              {semester.is_active ? (
                <span className="status-badge status-badge--active">{t('director.status.active')}</span>
              ) : (
                <button
                  type="button"
                  className="btn btn-secondary btn-compact"
                  onClick={() => activateSemesterMutation.mutate(semester)}
                  disabled={activateSemesterMutation.isPending}
                >
                  {t('director.semesters.activate')}
                </button>
              )}
            </div>
          ))}
          {!semestersQuery.isLoading && semesters.length === 0 && (
            <p className="dashboard-section-copy">{t('director.semesters.empty')}</p>
          )}
        </div>
      </section>
    </div>
  );
}
