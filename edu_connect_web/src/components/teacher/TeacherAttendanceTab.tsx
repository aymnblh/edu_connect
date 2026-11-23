import { useState, type RefObject } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, CheckCheck, Loader2, UserCheck, X } from 'lucide-react';
import { api } from '../../lib/api';
import { useLocale } from '../../lib/i18n';
import { TeacherClassSelector, TeacherSaveFeedback } from './TeacherShared';
import type { SchoolClass, Student } from './types';

interface TeacherAttendanceTabProps {
  classes: SchoolClass[];
  selectedClass: SchoolClass;
  students: Student[];
  attendanceSectionRef: RefObject<HTMLDivElement | null>;
  onSelectClass: (schoolClass: SchoolClass) => void;
}

export default function TeacherAttendanceTab({
  classes,
  selectedClass,
  students,
  attendanceSectionRef,
  onSelectClass,
}: TeacherAttendanceTabProps) {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const [attendanceState, setAttendanceState] = useState<Record<string, 'present' | 'absent'>>({});

  const markedAttendanceCount = students.filter((student) => Boolean(attendanceState[student.id])).length;
  const attendanceProgress = students.length > 0 ? (markedAttendanceCount / students.length) * 100 : 0;

  const saveAttendanceMutation = useMutation({
    mutationFn: async () => {
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
      void queryClient.invalidateQueries({ queryKey: ['teacher', 'students', selectedClass.id] });
    },
  });

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

  return (
    <div className="animate-fade-in dashboard-split" role="tabpanel">
      <TeacherClassSelector classes={classes} selectedClass={selectedClass} onSelect={onSelectClass} />

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

            <TeacherSaveFeedback
              mutation={saveAttendanceMutation}
              pendingMessage={t('teacher.attendanceSaving')}
              successMessage={t('teacher.toastSaved')}
            />

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
  );
}
