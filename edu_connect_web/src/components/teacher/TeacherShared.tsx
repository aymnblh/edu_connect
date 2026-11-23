import { useId } from 'react';
import { isAxiosError } from 'axios';
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { getApiErrorMessage } from '../../lib/formatters';
import { useLocale } from '../../lib/i18n';
import type { SchoolClass } from './types';

export function TeacherClassSelector({
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

export function TeacherSaveFeedback({
  mutation,
  pendingMessage,
  successMessage,
}: {
  mutation: { isPending: boolean; isSuccess: boolean; isError: boolean; error: unknown };
  pendingMessage: string;
  successMessage: string;
}) {
  const { t } = useLocale();
  if (!mutation.isPending && !mutation.isSuccess && !mutation.isError) return null;

  const status = mutation.isPending ? 'pending' : mutation.isSuccess ? 'success' : 'error';
  return (
    <div
      className={`teacher-save-feedback teacher-save-feedback--${status}`}
      role={mutation.isError ? 'alert' : 'status'}
    >
      {mutation.isPending ? <Loader2 size={17} className="spin-icon" /> : mutation.isSuccess ? <CheckCircle2 size={17} /> : <AlertTriangle size={17} />}
      <span>
        {mutation.isPending
          ? pendingMessage
          : mutation.isSuccess
            ? successMessage
            : isAxiosError(mutation.error) && mutation.error.response?.status === 403 && mutation.error.response.headers?.['x-demo-read-only']
              ? t('demo.blocked')
              : getApiErrorMessage(mutation.error, t('auth.connectionError'))}
      </span>
    </div>
  );
}
