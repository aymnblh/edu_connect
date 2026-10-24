import { useRef, useState, type ChangeEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { Download, FileUp, Loader2, Printer } from 'lucide-react';
import { api } from '../lib/api';
import { useLocale } from '../lib/i18n';
import { Modal } from './DirectorRecordsPanels';

interface ImportResult {
  invited: Array<{ full_name: string; email: string; invite_code: string; invite_expires_at: string }>;
  skipped: Array<{ line: number; email: string; reason: 'missing' | 'invalid_email' | 'duplicate' | 'exists' }>;
}

function downloadTemplate() {
  // UTF-8 with BOM and semicolons, so Excel opens accents and Arabic correctly.
  const blob = new Blob(['﻿prenom;nom;email\nAmina;Rahmani;amina.rahmani@exemple.dz\n'], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'modele_import_enseignants.csv';
  link.click();
  URL.revokeObjectURL(url);
}

/** Invite many teachers at once from a CSV; the first-login codes are shown once, to print. */
export default function TeacherImport() {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState('');
  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append('file', file);
      return (await api.post('/admin/import/teachers', form)).data as ImportResult;
    },
    onSuccess: (data) => {
      setResult(data);
      void queryClient.invalidateQueries({ queryKey: ['director-staff'] });
    },
    onError: (err) => {
      const detail = isAxiosError(err) ? err.response?.data?.detail : null;
      setError(typeof detail === 'string' ? detail : t('common.errorGeneric'));
    },
  });
  const onFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setError('');
    if (file) importMutation.mutate(file);
    event.target.value = '';
  };

  return (
    <div className="teacher-import">
      <p className="dashboard-section-copy">{t('teacherImport.copy')}</p>
      <div className="table-actions">
        <input ref={inputRef} type="file" className="sr-only" accept=".csv,text/csv" onChange={onFile} />
        <button type="button" className="btn btn-secondary btn-compact" onClick={downloadTemplate}>
          <Download size={14} /> {t('setup.template')}
        </button>
        <button type="button" className="btn btn-secondary btn-compact" disabled={importMutation.isPending} onClick={() => inputRef.current?.click()}>
          {importMutation.isPending ? <Loader2 size={14} className="spin-icon" /> : <FileUp size={14} />} {t('teacherImport.button')}
        </button>
      </div>
      {error && <p className="dashboard-section-copy" role="alert">{error}</p>}
      {result && (
        <Modal title={t('teacherImport.resultTitle', { count: result.invited.length })} onClose={() => setResult(null)}>
          <p className="report-card-muted">{t('teacherImport.codesOnce')}</p>
          {result.invited.length > 0 && (
            <div className="teacher-codes-sheet">
              {result.invited.map((item) => (
                <article key={item.email} className="parent-code-card">
                  <header><strong>{item.full_name}</strong></header>
                  <dl>
                    <div><dt>{t('director.team.email')}</dt><dd className="teacher-code-email">{item.email}</dd></div>
                    <div><dt>{t('director.team.inviteCode')}</dt><dd className="teacher-code">{item.invite_code}</dd></div>
                  </dl>
                  <p>{t('teacherImport.instructions')}</p>
                </article>
              ))}
            </div>
          )}
          {result.skipped.length > 0 && (
            <>
              <h3 className="monthly-subtitle">{t('teacherImport.skipped', { count: result.skipped.length })}</h3>
              <ul className="teacher-import-skipped">
                {result.skipped.map((item) => (
                  <li key={`${item.line}-${item.email}`}>
                    {t('teacherImport.line', { line: item.line })} {item.email && `(${item.email})`} — {t(`teacherImport.reason.${item.reason}`)}
                  </li>
                ))}
              </ul>
            </>
          )}
          {result.invited.length > 0 && (
            <div className="table-actions">
              <button type="button" className="btn btn-primary btn-compact" onClick={() => window.print()}>
                <Printer size={14} /> {t('codes.printNow')}
              </button>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
