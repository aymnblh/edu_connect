import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { HeartPulse, Loader2, Plus, Trash2 } from 'lucide-react';
import { api } from '../lib/api';
import { useLocale } from '../lib/i18n';

interface Contact {
  name: string;
  relationship: string;
  phone: string;
}

export interface HealthRecord {
  exists: boolean;
  student_id: string;
  emergency_contacts: Contact[];
  allergies?: string | null;
  conditions?: string | null;
  medications?: string | null;
  blood_group?: string | null;
  doctor_name?: string | null;
  doctor_phone?: string | null;
  emergency_instructions?: string | null;
  teacher_alert?: string | null;
  consent_given_at?: string | null;
  consent_method?: string | null;
  updated_at?: string | null;
}

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

function errorMessage(error: unknown, fallback: string) {
  if (isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail) && typeof detail[0]?.msg === 'string') return detail[0].msg.replace(/^Value error, /, '');
  }
  return fallback;
}

type HealthRecordFormProps = {
  studentId: string;
  /** "parent" consents in the app; "school" attests a signed paper form. */
  mode: 'parent' | 'school';
  /** Record already loaded by a parent view (avoids a second audited read). */
  initial?: HealthRecord;
};

export default function HealthRecordForm({ studentId, mode, initial }: HealthRecordFormProps) {
  const { t } = useLocale();
  const recordQuery = useQuery<HealthRecord>({
    queryKey: ['health', studentId],
    enabled: !initial,
    queryFn: async () => (await api.get(`/students/${studentId}/health`)).data,
  });
  const [saved, setSaved] = useState<HealthRecord | null>(null);
  const [notice, setNotice] = useState('');
  const record = saved ?? initial ?? recordQuery.data;
  if (!record) return <p className="dashboard-section-copy">{t('common.loading')}</p>;
  // Re-created from the server copy after every save or erase.
  return (
    <HealthEditor
      key={`${record.exists}-${record.updated_at ?? ''}`}
      studentId={studentId}
      mode={mode}
      record={record}
      notice={notice}
      onSaved={(next, message) => {
        setSaved(next);
        setNotice(message);
      }}
    />
  );
}

type HealthEditorProps = {
  studentId: string;
  mode: 'parent' | 'school';
  record: HealthRecord;
  notice: string;
  onSaved: (record: HealthRecord, message: string) => void;
};

function HealthEditor({ studentId, mode, record, notice, onSaved }: HealthEditorProps) {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const queryKey = ['health', studentId];
  const [form, setForm] = useState<HealthRecord>(record);
  const [consent, setConsent] = useState(false);
  const [message, setMessage] = useState(notice);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form) return null;
      const body = {
        emergency_contacts: form.emergency_contacts.filter((c) => c.name.trim() || c.phone.trim()),
        allergies: form.allergies || null,
        conditions: form.conditions || null,
        medications: form.medications || null,
        blood_group: form.blood_group || null,
        doctor_name: form.doctor_name || null,
        doctor_phone: form.doctor_phone || null,
        emergency_instructions: form.emergency_instructions || null,
        teacher_alert: form.teacher_alert || null,
        consent,
      };
      return (await api.put<HealthRecord>(`/students/${studentId}/health`, body)).data;
    },
    onSuccess: (result) => {
      if (!result) return;
      queryClient.setQueryData(queryKey, result);
      void queryClient.invalidateQueries({ queryKey: ['student-file', studentId] });
      onSaved(result, t('health.saved'));
    },
    onError: (error) => setMessage(errorMessage(error, t('common.errorGeneric'))),
  });
  const deleteMutation = useMutation({
    mutationFn: async () => api.delete(`/students/${studentId}/health`),
    onSuccess: () => {
      const empty: HealthRecord = { exists: false, student_id: studentId, emergency_contacts: [] };
      queryClient.setQueryData(queryKey, empty);
      void queryClient.invalidateQueries({ queryKey: ['student-file', studentId] });
      onSaved(empty, t('health.deleted'));
    },
    onError: (error) => setMessage(errorMessage(error, t('common.errorGeneric'))),
  });

  const set = (patch: Partial<HealthRecord>) => setForm({ ...form, ...patch });
  const setContact = (index: number, patch: Partial<Contact>) =>
    set({ emergency_contacts: form.emergency_contacts.map((c, i) => (i === index ? { ...c, ...patch } : c)) });
  const needsConsent = !form.exists;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');
    if (needsConsent && !consent) {
      setMessage(t('health.consentRequired'));
      return;
    }
    saveMutation.mutate();
  };

  const textArea = (field: keyof HealthRecord, label: string, hint?: string) => (
    <div className="form-group">
      <label className="form-label" htmlFor={`health-${field}-${studentId}`}>{label}</label>
      <textarea
        id={`health-${field}-${studentId}`}
        className="form-input"
        rows={2}
        maxLength={2000}
        placeholder={hint}
        value={(form[field] as string | null | undefined) ?? ''}
        onChange={(e) => set({ [field]: e.target.value } as Partial<HealthRecord>)}
      />
    </div>
  );

  return (
    <form className="health-form" onSubmit={submit}>
      <h3><HeartPulse size={18} /> {t('health.title')}</h3>
      <p className="dashboard-section-copy">{mode === 'parent' ? t('health.parentIntro') : t('health.schoolIntro')}</p>
      {form.exists && form.consent_given_at && (
        <p className="report-card-muted">
          {t(form.consent_method === 'paper' ? 'health.consentPaper' : 'health.consentApp', {
            date: new Date(form.consent_given_at).toLocaleDateString(),
          })}
        </p>
      )}

      <fieldset className="health-contacts">
        <legend className="form-label">{t('health.contacts')}</legend>
        {form.emergency_contacts.map((contact, index) => (
          <div key={index} className="health-contact-row">
            <input className="form-input" aria-label={t('health.contactName')} placeholder={t('health.contactName')}
              value={contact.name} maxLength={120} onChange={(e) => setContact(index, { name: e.target.value })} />
            <input className="form-input" aria-label={t('health.relationship')} placeholder={t('health.relationship')}
              value={contact.relationship} maxLength={60} onChange={(e) => setContact(index, { relationship: e.target.value })} />
            <input className="form-input" aria-label={t('health.phone')} placeholder="0555 12 34 56" inputMode="tel"
              value={contact.phone} maxLength={25} onChange={(e) => setContact(index, { phone: e.target.value })} />
            <button type="button" className="btn btn-secondary btn-compact" aria-label={t('common.delete')}
              onClick={() => set({ emergency_contacts: form.emergency_contacts.filter((_, i) => i !== index) })}>
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {form.emergency_contacts.length < 4 && (
          <button type="button" className="btn btn-secondary btn-compact insights-table-toggle"
            onClick={() => set({ emergency_contacts: [...form.emergency_contacts, { name: '', relationship: '', phone: '' }] })}>
            <Plus size={14} /> {t('health.addContact')}
          </button>
        )}
      </fieldset>

      {textArea('allergies', t('health.allergies'), t('health.allergiesHint'))}
      {textArea('conditions', t('health.conditions'), t('health.conditionsHint'))}
      {textArea('medications', t('health.medications'))}
      <div className="announcement-date-row">
        <div className="form-group">
          <label className="form-label" htmlFor={`health-blood-${studentId}`}>{t('health.bloodGroup')}</label>
          <select id={`health-blood-${studentId}`} className="form-input" value={form.blood_group ?? ''}
            onChange={(e) => set({ blood_group: e.target.value || null })}>
            <option value="">—</option>
            {BLOOD_GROUPS.map((group) => <option key={group} value={group}>{group}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor={`health-doctor-${studentId}`}>{t('health.doctor')}</label>
          <input id={`health-doctor-${studentId}`} className="form-input" maxLength={120} value={form.doctor_name ?? ''}
            onChange={(e) => set({ doctor_name: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor={`health-doctor-phone-${studentId}`}>{t('health.doctorPhone')}</label>
          <input id={`health-doctor-phone-${studentId}`} className="form-input" inputMode="tel" maxLength={25}
            value={form.doctor_phone ?? ''} onChange={(e) => set({ doctor_phone: e.target.value })} />
        </div>
      </div>
      {textArea('emergency_instructions', t('health.instructions'), t('health.instructionsHint'))}
      <div className="form-group">
        <label className="form-label" htmlFor={`health-alert-${studentId}`}>{t('health.teacherAlert')}</label>
        <input id={`health-alert-${studentId}`} className="form-input" maxLength={200} placeholder={t('health.teacherAlertHint')}
          value={form.teacher_alert ?? ''} onChange={(e) => set({ teacher_alert: e.target.value })} />
        <p className="report-card-muted">{t('health.teacherAlertNote')}</p>
      </div>

      {needsConsent && (
        <label className="checkbox-row">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          {mode === 'parent' ? t('health.consentParent') : t('health.consentSchool')}
        </label>
      )}
      {message && <p className="dashboard-section-copy" role="status">{message}</p>}
      <div className="table-actions">
        <button type="submit" className="btn btn-primary btn-compact" disabled={saveMutation.isPending}>
          {saveMutation.isPending ? <Loader2 size={14} className="spin-icon" /> : <HeartPulse size={14} />} {t('health.save')}
        </button>
        {form.exists && (
          <button type="button" className="btn btn-danger btn-compact" disabled={deleteMutation.isPending}
            onClick={() => window.confirm(mode === 'parent' ? t('health.withdrawConfirm') : t('health.deleteConfirm')) && deleteMutation.mutate()}>
            <Trash2 size={14} /> {mode === 'parent' ? t('health.withdraw') : t('health.delete')}
          </button>
        )}
      </div>
    </form>
  );
}
