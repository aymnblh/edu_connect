import { useRef, useState, type ChangeEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { ImageUp, Loader2, School, Trash2 } from 'lucide-react';
import { api } from '../lib/api';
import { useSchoolBranding } from '../lib/branding';
import { useLocale } from '../lib/i18n';

/** The director sets the logo printed on receipts, report cards and code sheets. */
export default function SchoolBrandingCard({ canEdit }: { canEdit: boolean }) {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState('');
  const branding = useSchoolBranding().data;
  const onDone = () => {
    setError('');
    void queryClient.invalidateQueries({ queryKey: ['school-branding'] });
    void queryClient.invalidateQueries({ queryKey: ['setup-status'] });
  };
  const onError = (err: unknown) => {
    const detail = isAxiosError(err) ? err.response?.data?.detail : null;
    setError(typeof detail === 'string' ? detail : t('common.errorGeneric'));
  };
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append('file', file);
      return api.put('/schools/branding/logo', form);
    },
    onSuccess: onDone,
    onError,
  });
  const removeMutation = useMutation({
    mutationFn: async () => api.delete('/schools/branding/logo'),
    onSuccess: onDone,
    onError,
  });
  const onFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) uploadMutation.mutate(file);
    event.target.value = '';
  };

  return (
    <section className="glass-card management-card school-branding" aria-labelledby="school-branding-title">
      <h2 id="school-branding-title" className="dashboard-section-title dashboard-section-title--plain">
        <School size={18} /> {t('branding.title')}
      </h2>
      <div className="school-branding-row">
        <div className="school-branding-logo">
          {branding?.logo ? <img src={branding.logo} alt={t('branding.logoAlt', { name: branding.name })} /> : <School size={28} aria-hidden="true" />}
        </div>
        <div>
          <strong>{branding?.name}</strong>
          <p className="dashboard-section-copy">{t('branding.copy')}</p>
        </div>
      </div>
      {canEdit ? (
        <div className="table-actions">
          <input ref={inputRef} type="file" className="sr-only" accept="image/png,image/jpeg,image/webp" onChange={onFile} />
          <button type="button" className="btn btn-secondary btn-compact" disabled={uploadMutation.isPending} onClick={() => inputRef.current?.click()}>
            {uploadMutation.isPending ? <Loader2 size={14} className="spin-icon" /> : <ImageUp size={14} />}
            {branding?.logo ? t('branding.replace') : t('branding.upload')}
          </button>
          {branding?.logo && (
            <button type="button" className="btn btn-danger btn-compact" disabled={removeMutation.isPending} onClick={() => removeMutation.mutate()}>
              <Trash2 size={14} /> {t('branding.remove')}
            </button>
          )}
        </div>
      ) : (
        <p className="report-card-muted">{t('branding.directorOnly')}</p>
      )}
      {error && <p className="dashboard-section-copy" role="alert">{error}</p>}
    </section>
  );
}
