import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Circle, Download, Printer, Rocket, X } from 'lucide-react';
import { api } from '../lib/api';
import { useSchoolBranding } from '../lib/branding';
import { downloadStudentTemplate } from '../lib/downloads';
import { useLocale } from '../lib/i18n';
import { Modal } from './DirectorRecordsPanels';

interface SetupStep {
  key: 'logo' | 'trimesters' | 'classes' | 'subjects' | 'students' | 'teachers' | 'assignments' | 'parents';
  done: boolean;
  count: number;
  total?: number;
  pending?: number;
}

interface SetupStatus {
  dismissed: boolean;
  completed: number;
  total: number;
  steps: SetupStep[];
}

const STEP_ROUTES: Record<SetupStep['key'], string> = {
  logo: '/director/team',
  trimesters: '/director/classes',
  classes: '/director/classes',
  subjects: '/director/classes',
  students: '/director/students',
  teachers: '/director/team',
  assignments: '/director/classes',
  parents: '/director/students',
};

function stepDetail(step: SetupStep, t: (key: string, params?: Record<string, string | number>) => string) {
  if (step.key === 'students' && step.pending) return t('setup.students.unplaced', { count: step.pending });
  if (step.key === 'teachers' && step.pending) return t('setup.teachers.pending', { count: step.count, pending: step.pending });
  if (step.total !== undefined) return t(`setup.${step.key}.progress`, { count: step.count, total: step.total });
  return t(`setup.${step.key}.count`, { count: step.count });
}

/** The director's first-days checklist, shown on the overview until done or hidden. */
export default function SetupChecklist() {
  const { t } = useLocale();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [codesOpen, setCodesOpen] = useState(false);
  const statusQuery = useQuery<SetupStatus>({
    queryKey: ['setup-status'],
    queryFn: async () => (await api.get('/admin/setup-status')).data,
  });
  const dismissMutation = useMutation({
    mutationFn: async () => api.post('/admin/setup-status/dismiss', { dismissed: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['setup-status'] }),
  });

  const status = statusQuery.data;
  if (!status || status.dismissed || status.completed === status.total) {
    return codesOpen ? <ParentCodesSheet onClose={() => setCodesOpen(false)} /> : null;
  }
  const percent = Math.round((status.completed / status.total) * 100);
  const nextStep = status.steps.find((step) => !step.done);

  return (
    <section className="glass-card setup-checklist animate-fade-in" aria-labelledby="setup-title">
      <div className="dashboard-toolbar">
        <div>
          <h2 id="setup-title" className="dashboard-section-title dashboard-section-title--plain">
            <Rocket size={18} /> {t('setup.title')}
          </h2>
          <p className="dashboard-section-copy">{t('setup.copy', { percent })}</p>
        </div>
        <button
          type="button"
          className="btn btn-secondary btn-compact"
          onClick={() => dismissMutation.mutate()}
          disabled={dismissMutation.isPending}
        >
          <X size={14} /> {t('setup.dismiss')}
        </button>
      </div>
      <div
        className="setup-progress"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={status.total}
        aria-valuenow={status.completed}
        aria-label={t('setup.progressLabel', { done: status.completed, total: status.total })}
      >
        <span style={{ width: `${percent}%` }} />
      </div>
      <ol className="setup-steps">
        {status.steps.map((step) => (
          <li key={step.key} className={`setup-step ${step.done ? 'setup-step--done' : ''} ${step === nextStep ? 'setup-step--next' : ''}`}>
            {step.done ? <CheckCircle2 size={18} aria-hidden="true" /> : <Circle size={18} aria-hidden="true" />}
            <div className="setup-step-body">
              <strong>{t(`setup.${step.key}.title`)}</strong>
              <span>{step.done ? stepDetail(step, t) : t(`setup.${step.key}.hint`)}</span>
              {!step.done && step.count > 0 && <span className="setup-step-detail">{stepDetail(step, t)}</span>}
            </div>
            <div className="setup-step-actions">
              {step.key === 'students' && (
                <button type="button" className="btn btn-secondary btn-compact" onClick={() => void downloadStudentTemplate()}>
                  <Download size={14} /> {t('setup.template')}
                </button>
              )}
              {step.key === 'parents' && (
                <button type="button" className="btn btn-secondary btn-compact" onClick={() => setCodesOpen(true)}>
                  <Printer size={14} /> {t('codes.print')}
                </button>
              )}
              {!step.done && (
                <button type="button" className="btn btn-primary btn-compact" onClick={() => navigate(STEP_ROUTES[step.key])}>
                  {t('setup.go')}
                </button>
              )}
            </div>
          </li>
        ))}
      </ol>
      {codesOpen && <ParentCodesSheet onClose={() => setCodesOpen(false)} />}
    </section>
  );
}

/* ── Parent codes ─────────────────────────────────────────────────────── */

interface ParentCode {
  student_id: string;
  student_name: string;
  student_code: string | null;
  linking_pin: string | null;
  class_id: string | null;
  class_name: string | null;
  parents_linked: number;
}

/** One cut-out card per student with the identifier and PIN a parent needs. */
export function ParentCodesSheet({ onClose }: { onClose: () => void }) {
  const { t } = useLocale();
  const [classId, setClassId] = useState('');
  const [onlyUnlinked, setOnlyUnlinked] = useState(true);
  const branding = useSchoolBranding().data;
  const classesQuery = useQuery<Array<{ id: string; name: string }>>({
    queryKey: ['director-classes'],
    queryFn: async () => (await api.get('/classes/')).data,
  });
  const codesQuery = useQuery<ParentCode[]>({
    queryKey: ['parent-codes', classId],
    queryFn: async () => (await api.get('/admin/parent-codes', { params: classId ? { class_id: classId } : {} })).data,
  });
  const codes = (codesQuery.data ?? []).filter((code) => !onlyUnlinked || code.parents_linked === 0);

  return (
    <Modal title={t('codes.title')} onClose={onClose}>
      <div className="parent-codes-toolbar">
        <select className="form-input" value={classId} onChange={(e) => setClassId(e.target.value)} aria-label={t('codes.class')}>
          <option value="">{t('codes.allClasses')}</option>
          {(classesQuery.data ?? []).map((cls) => <option key={cls.id} value={cls.id}>{cls.name}</option>)}
        </select>
        <label className="checkbox-row">
          <input type="checkbox" checked={onlyUnlinked} onChange={(e) => setOnlyUnlinked(e.target.checked)} />
          {t('codes.onlyUnlinked')}
        </label>
        <button type="button" className="btn btn-primary btn-compact" onClick={() => window.print()} disabled={codes.length === 0}>
          <Printer size={14} /> {t('codes.printNow')}
        </button>
      </div>
      <p className="report-card-muted">{t('codes.privacy')}</p>
      {codesQuery.isLoading && <p className="dashboard-section-copy">{t('common.loading')}</p>}
      {!codesQuery.isLoading && codes.length === 0 && <p className="dashboard-section-copy">{t('codes.empty')}</p>}
      <div className="parent-codes-sheet">
        {codes.map((code) => (
          <article key={code.student_id} className="parent-code-card">
            {branding && (
              <div className="printed-school">
                {branding.logo && <img src={branding.logo} alt="" />}
                <span>{branding.name}</span>
              </div>
            )}
            <header>
              <strong>{code.student_name}</strong>
              {code.class_name && <span>{code.class_name}</span>}
            </header>
            <dl>
              <div><dt>{t('codes.studentId')}</dt><dd>{code.student_code ?? '—'}</dd></div>
              <div><dt>{t('codes.pin')}</dt><dd>{code.linking_pin ?? '—'}</dd></div>
            </dl>
            <p>{t('codes.instructions')}</p>
          </article>
        ))}
      </div>
    </Modal>
  );
}
