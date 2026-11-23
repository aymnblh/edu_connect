import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import {
  ClipboardCopy,
  FileText,
  FileUp,
  FolderOpen,
  KeyRound,
  Link2Off,
  Loader2,
  LogOut,
  Printer,
  QrCode,
  Search,
  Share2,
  X,
} from 'lucide-react';
import { api } from '../../lib/api';
import { downloadStudentTemplate } from '../../lib/downloads';
import { formatDate, formatDateTime, getApiErrorMessage } from '../../lib/formatters';
import { useLocale } from '../../lib/i18n';
import type {
  AddToastFn,
  CopyTextFn,
  GenerateTokensResponse,
  LinkedParent,
  ParentLinkAudit,
  ParentLinkToken,
  SignOutUserFn,
  StaffMember,
  Student,
} from './types';

interface DirectorStudentsTabProps {
  students: Student[];
  activeStudents: Student[];
  isLoadingStudents: boolean;
  addToast: AddToastFn;
  copyText: CopyTextFn;
  signOutUser: SignOutUserFn;
  isSigningOut: boolean;
  onOpenCodesSheet: () => void;
  onOpenStudentFile: (studentId: string) => void;
}

export default function DirectorStudentsTab({
  students,
  activeStudents,
  isLoadingStudents,
  addToast,
  copyText,
  signOutUser,
  isSigningOut,
  onOpenCodesSheet,
  onOpenStudentFile,
}: DirectorStudentsTabProps) {
  const { t, locale } = useLocale();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [linkLabel, setLinkLabel] = useState('parent');
  const [qrModal, setQrModal] = useState<{ student: Student; token: ParentLinkToken } | null>(null);
  const [parentResetCode, setParentResetCode] = useState<{ name: string; code: string } | null>(null);

  const resolvedSelectedStudentId = selectedStudentId ?? students[0]?.id ?? null;
  const selectedStudent = students.find((student) => student.id === resolvedSelectedStudentId) ?? null;

  const filteredStudents = useMemo(() => {
    const search = studentSearch.trim().toLowerCase();
    if (!search) return students;
    return students.filter((student) =>
      [student.full_name, student.student_id, student.linking_pin]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search)),
    );
  }, [studentSearch, students]);

  const linkedParentsQuery = useQuery<LinkedParent[]>({
    queryKey: ['student-parents', resolvedSelectedStudentId],
    enabled: Boolean(resolvedSelectedStudentId),
    queryFn: async () => {
      const res = await api.get(`/admin/students/${resolvedSelectedStudentId}/parents`);
      return res.data;
    },
  });

  const linkAuditQuery = useQuery<ParentLinkAudit[]>({
    queryKey: ['student-links', resolvedSelectedStudentId],
    enabled: Boolean(resolvedSelectedStudentId),
    queryFn: async () => {
      const res = await api.get(`/admin/students/${resolvedSelectedStudentId}/links`);
      return res.data;
    },
  });

  const importStudentsMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/admin/import/students', formData);
      return res.data as { imported: number; skipped: number; assigned?: number; unknown_classes?: string[] };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['director-students'] });
      queryClient.invalidateQueries({ queryKey: ['director-analytics'] });
      addToast(t('director.toast.importedStudents', { imported: result.imported, skipped: result.skipped }), 'success');
      if (result.assigned) addToast(t('director.toast.importedAssigned', { count: result.assigned }), 'success');
      if (result.unknown_classes?.length) {
        addToast(t('director.toast.importedUnknownClasses', { classes: result.unknown_classes.join(', ') }), 'error');
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    onError: (error) => addToast(getApiErrorMessage(error), 'error'),
  });

  const generateTokenMutation = useMutation({
    mutationFn: async ({ student, label }: { student: Student; label: string }) => {
      const res = await api.post<GenerateTokensResponse>(`/admin/students/${student.id}/generate-link-tokens`, {
        labels: [label],
        expires_in_hours: 168,
      });
      return { student, token: res.data.tokens[0] };
    },
    onSuccess: ({ student, token }) => {
      queryClient.invalidateQueries({ queryKey: ['student-links', student.id] });
      setQrModal({ student, token });
      addToast(t('director.toast.parentQrGenerated'), 'success');
    },
    onError: (error) => addToast(getApiErrorMessage(error), 'error'),
  });

  const regeneratePinMutation = useMutation({
    mutationFn: async (student: Student) => {
      const res = await api.post(`/admin/students/${student.id}/regenerate-pin`, { notify: false });
      return { student, newPin: String(res.data.new_pin) };
    },
    onSuccess: ({ student, newPin }) => {
      queryClient.invalidateQueries({ queryKey: ['director-students'] });
      addToast(t('director.toast.pinRegenerated', { student: student.full_name, pin: newPin }), 'success');
    },
    onError: (error) => addToast(getApiErrorMessage(error), 'error'),
  });

  const revokeLinkMutation = useMutation({
    mutationFn: async ({ studentId, linkId }: { studentId: string; linkId: string }) => {
      await api.post(`/admin/students/${studentId}/revoke-link/${linkId}`);
      return { studentId };
    },
    onSuccess: ({ studentId }) => {
      queryClient.invalidateQueries({ queryKey: ['student-links', studentId] });
      addToast(t('director.toast.linkRevoked'), 'success');
    },
    onError: (error) => addToast(getApiErrorMessage(error), 'error'),
  });

  const resetParentAccessMutation = useMutation({
    mutationFn: async (parent: LinkedParent) => {
      const res = await api.post<StaffMember>(`/admin/parents/${parent.id}/reset-access`);
      return res.data;
    },
    onSuccess: (parent) => {
      if (parent.invite_code) setParentResetCode({ name: parent.full_name, code: parent.invite_code });
      addToast(t('director.toast.parentAccessReset'), 'success');
    },
    onError: (error) => addToast(getApiErrorMessage(error), 'error'),
  });

  const resetParentAccess = (parent: LinkedParent) => {
    if (!window.confirm(t('director.parents.resetConfirm', { name: parent.full_name }))) return;
    resetParentAccessMutation.mutate(parent);
  };

  const handleStudentImport = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) importStudentsMutation.mutate(file);
  };

  const parentLinkLabel = (label?: string | null) => {
    const normalized = label?.trim().toLowerCase();
    const labelKeyByValue: Record<string, string> = {
      mother: 'mother',
      mere: 'mother',
      'mère': 'mother',
      'mã¨re': 'mother',
      father: 'father',
      pere: 'father',
      'père': 'father',
      'pã¨re': 'father',
      tuteur: 'guardian',
      guardian: 'guardian',
      parent: 'parent',
    };
    const labelKey = normalized ? labelKeyByValue[normalized] : 'parent';
    return labelKey ? t(`director.parentLink.${labelKey}`) : label || t('director.parentLink.parent');
  };

  const getQrShareText = () => {
    if (!qrModal) return '';
    return [
      t('common.appName'),
      t('director.qr.student', { name: qrModal.student.full_name }),
      t('director.qr.parentToken', { token: qrModal.token.token }),
      `${t('director.qr.expiresOn', { date: formatDateTime(qrModal.token.expires_at, locale) })}`,
      t('director.qr.shareInstructions'),
    ].join('\n');
  };

  const shareQrToken = async () => {
    if (!qrModal) return;
    const text = getQrShareText();

    if (navigator.share) {
      try {
        await navigator.share({ title: t('director.qr.shareTitle'), text });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
      }
    }

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    const opened = window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    if (!opened) {
      window.location.href = whatsappUrl;
    }
    void copyText(text, t('director.toast.shareFallback'));
  };

  const shareQrBySms = () => {
    const text = getQrShareText();
    void copyText(text, t('director.toast.smsCopied'));
    window.location.href = `sms:?&body=${encodeURIComponent(text)}`;
  };

  return (
    <>
      <div className="director-management-grid">
        <section className="glass-card management-card management-card--wide">
          <div className="dashboard-toolbar">
            <div>
              <h2 className="dashboard-section-title dashboard-section-title--plain">{t('director.students.title')}</h2>
              <p className="dashboard-section-copy">{t('director.students.copy')}</p>
            </div>
            <div className="management-actions">
              <input
                ref={fileInputRef}
                type="file"
                className="sr-only"
                accept=".csv,text/csv"
                onChange={handleStudentImport}
              />
              <button
                type="button"
                className="btn btn-secondary btn-compact"
                onClick={() => void downloadStudentTemplate().catch(() => addToast(t('common.errorGeneric'), 'error'))}
              >
                <FileText size={15} />
                {t('setup.template')}
              </button>
              <button type="button" className="btn btn-secondary btn-compact" onClick={onOpenCodesSheet}>
                <Printer size={15} />
                {t('codes.print')}
              </button>
              <button
                type="button"
                className="btn btn-primary btn-compact"
                onClick={() => fileInputRef.current?.click()}
                disabled={importStudentsMutation.isPending}
              >
                {importStudentsMutation.isPending ? <Loader2 size={15} className="spin-icon" /> : <FileUp size={15} />}
                {t('director.students.importCsv')}
              </button>
            </div>
          </div>

          <div className="student-filter-bar">
            <Search size={17} />
            <input
              value={studentSearch}
              onChange={(event) => setStudentSearch(event.target.value)}
              placeholder={t('director.students.search')}
              aria-label={t('director.students.search')}
            />
          </div>

          <div className="director-stat-strip">
            <div>
              <span>{t('director.students.active')}</span>
              <strong>{activeStudents.length}</strong>
            </div>
            <div>
              <span>{t('director.students.archives')}</span>
              <strong>{students.length - activeStudents.length}</strong>
            </div>
            <div>
              <span>{t('director.students.qrIssued')}</span>
              <strong>{linkAuditQuery.data?.length ?? '-'}</strong>
            </div>
          </div>

          <div className="premium-table-wrapper">
            <table className="premium-table">
              <thead>
                <tr>
                  <th>{t('director.students.student')}</th>
                  <th>{t('director.students.identifier')}</th>
                  <th>PIN</th>
                  <th>{t('director.students.status')}</th>
                  <th>{t('director.students.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingStudents && (
                  <tr>
                    <td colSpan={5}>{t('director.students.loading')}</td>
                  </tr>
                )}
                {!isLoadingStudents && filteredStudents.map((student) => (
                  <tr key={student.id} className={resolvedSelectedStudentId === student.id ? 'table-row-selected' : ''}>
                    <td>
                      <button
                        type="button"
                        className="table-link-button"
                        onClick={() => setSelectedStudentId(student.id)}
                      >
                        {student.full_name}
                      </button>
                      <div className="table-cell-muted">{formatDate(student.created_at, locale)}</div>
                    </td>
                    <td>{student.student_id || '-'}</td>
                    <td>
                      <span className="token-inline">{student.linking_pin || '-'}</span>
                    </td>
                    <td>
                      {student.archived_at ? (
                        <span className="status-badge status-badge--expired">
                          {t('director.students.archives')} - {t(`director.archive.${student.archive_reason || 'other'}`)}
                        </span>
                      ) : (
                        <span className="status-badge status-badge--active">{t('director.status.active')}</span>
                      )}
                    </td>
                    <td>
                      <div className="table-actions">
                        <button
                          type="button"
                          className="btn btn-secondary btn-compact"
                          onClick={() => {
                            setSelectedStudentId(student.id);
                            generateTokenMutation.mutate({ student, label: linkLabel.trim() || 'parent' });
                          }}
                          disabled={Boolean(student.archived_at) || generateTokenMutation.isPending}
                        >
                          <QrCode size={14} />
                          QR
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-compact"
                          onClick={() => regeneratePinMutation.mutate(student)}
                          disabled={Boolean(student.archived_at) || regeneratePinMutation.isPending}
                        >
                          <KeyRound size={14} />
                          PIN
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!isLoadingStudents && filteredStudents.length === 0 && (
                  <tr>
                    <td colSpan={5}>{t('director.students.empty')}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="glass-card management-card">
          <h2 className="dashboard-section-title dashboard-section-title--plain">{t('director.parentLink.title')}</h2>
          <p className="dashboard-section-copy dashboard-section-copy--spaced">{t('director.parentLink.copy')}</p>

          <label className="form-label" htmlFor="link-label">{t('director.parentLink.label')}</label>
          <select
            id="link-label"
            className="form-input"
            value={linkLabel}
            onChange={(event) => setLinkLabel(event.target.value)}
          >
            <option value="mother">{t('director.parentLink.mother')}</option>
            <option value="father">{t('director.parentLink.father')}</option>
            <option value="guardian">{t('director.parentLink.guardian')}</option>
            <option value="parent">{t('director.parentLink.parent')}</option>
          </select>

          {selectedStudent ? (
            <div className="selected-student-panel">
              <div className="selected-student-avatar">
                {selectedStudent.full_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <strong>{selectedStudent.full_name}</strong>
                <span>{selectedStudent.student_id || t('director.parentLink.undefinedId')}</span>
              </div>
            </div>
          ) : (
            <div className="empty-state">{t('director.parentLink.selectStudent')}</div>
          )}

          <button
            type="button"
            className="btn btn-secondary btn-full"
            disabled={!selectedStudent}
            onClick={() => selectedStudent && onOpenStudentFile(selectedStudent.id)}
          >
            <FolderOpen size={16} /> {t('records.openFile')}
          </button>

          <button
            type="button"
            className="btn btn-primary btn-full"
            disabled={!selectedStudent || Boolean(selectedStudent?.archived_at) || generateTokenMutation.isPending}
            onClick={() => selectedStudent && generateTokenMutation.mutate({ student: selectedStudent, label: linkLabel })}
          >
            {generateTokenMutation.isPending ? <Loader2 size={16} className="spin-icon" /> : <QrCode size={16} />}
            {t('director.parentLink.generateQr')}
          </button>

          <div className="link-audit-list">
            <h3>{t('director.parents.title')}</h3>
            {linkedParentsQuery.isLoading && <p className="dashboard-section-copy">{t('common.loading')}</p>}
            {linkedParentsQuery.data?.map((parent) => (
              <div key={parent.id} className="link-audit-item">
                <div>
                  <strong>{parent.full_name}</strong>
                  <span>{parent.email}</span>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-compact"
                  onClick={() => resetParentAccess(parent)}
                  disabled={resetParentAccessMutation.isPending}
                >
                  <KeyRound size={14} />
                  {t('director.team.resetAccess')}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-compact"
                  aria-label={t('director.signOut')}
                  title={t('director.signOut')}
                  onClick={() => signOutUser(parent.id, parent.full_name)}
                  disabled={isSigningOut}
                >
                  <LogOut size={14} />
                </button>
              </div>
            ))}
            {selectedStudent && !linkedParentsQuery.isLoading && (linkedParentsQuery.data?.length ?? 0) === 0 && (
              <p className="dashboard-section-copy">{t('director.parents.empty')}</p>
            )}
            {parentResetCode && (
              <div className="notice-box">
                <strong>{t('director.team.inviteCode')}</strong>
                <button type="button" className="token-code" onClick={() => copyText(parentResetCode.code, t('director.toast.inviteCopied'))}>
                  {parentResetCode.code}
                </button>
                <span>{t('director.parents.shareCode', { name: parentResetCode.name })}</span>
              </div>
            )}
          </div>

          <div className="link-audit-list">
            <h3>{t('director.parentLink.history')}</h3>
            {linkAuditQuery.isLoading && <p className="dashboard-section-copy">{t('common.loading')}</p>}
            {linkAuditQuery.data?.map((link) => (
              <div key={link.id} className="link-audit-item">
                <div>
                  <strong>{parentLinkLabel(link.label)}</strong>
                  <span>
                    {link.parent_name
                      ? t('director.parentLink.usedBy', { name: link.parent_name })
                      : link.revoked_at
                        ? t('director.parentLink.revokedOn', { date: formatDateTime(link.revoked_at, locale) })
                        : link.used_at
                          ? t('director.parentLink.usedOn', { date: formatDateTime(link.used_at, locale) })
                          : t('director.status.pending')}
                  </span>
                </div>
                {!link.revoked_at && (
                  <button
                    type="button"
                    className="btn btn-danger btn-compact"
                    onClick={() =>
                      resolvedSelectedStudentId &&
                      revokeLinkMutation.mutate({ studentId: resolvedSelectedStudentId, linkId: link.id })
                    }
                    disabled={revokeLinkMutation.isPending}
                  >
                    <Link2Off size={14} />
                    {t('director.parentLink.revoke')}
                  </button>
                )}
              </div>
            ))}
            {selectedStudent && !linkAuditQuery.isLoading && (!linkAuditQuery.data || linkAuditQuery.data.length === 0) && (
              <p className="dashboard-section-copy">{t('director.parentLink.empty')}</p>
            )}
          </div>
        </aside>
      </div>

      {qrModal && (
        <div className="workspace-modal-backdrop" role="presentation">
          <section
            className="workspace-modal qr-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="qr-modal-title"
          >
            <button
              type="button"
              className="modal-close-btn"
              aria-label={t('director.qr.close')}
              onClick={() => setQrModal(null)}
            >
              <X size={18} />
            </button>
            <div className="workspace-modal-header">
              <h2 id="qr-modal-title">{t('director.qr.title')}</h2>
              <p>{qrModal.student.full_name} - {t('director.qr.expiresOn', { date: formatDateTime(qrModal.token.expires_at, locale) })}</p>
            </div>

            <div className="director-print-sheet">
              <div className="qr-panel">
                <img src="/wasel-edu-logo.svg" alt={t('common.appName')} />
                <QRCodeSVG value={qrModal.token.token} size={220} level="M" includeMargin />
                <h3>{qrModal.student.full_name}</h3>
                <p>{t('director.qr.scanCopy')}</p>
                <div className="token-code">{qrModal.token.token}</div>
                <span>{t('director.qr.validUntil', { date: formatDateTime(qrModal.token.expires_at, locale) })}</span>
              </div>
            </div>

            <div className="payment-actions">
              <button type="button" className="btn btn-secondary" onClick={() => copyText(qrModal.token.token, t('director.toast.qrCopied'))}>
                <ClipboardCopy size={16} />
                {t('director.qr.copy')}
              </button>
              <button type="button" className="btn btn-secondary" onClick={shareQrToken}>
                <Share2 size={16} />
                {t('director.qr.share')}
              </button>
              <button type="button" className="btn btn-secondary" onClick={shareQrBySms}>
                <Share2 size={16} />
                SMS
              </button>
              <button type="button" className="btn btn-primary" onClick={() => window.print()}>
                <QrCode size={16} />
                {t('director.qr.print')}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
