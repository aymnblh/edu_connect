import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { History, KeyRound, Loader2, LogOut, UserPlus, UserX } from 'lucide-react';
import SchoolBrandingCard from '../SchoolBrandingCard';
import TeacherImport from '../TeacherImport';
import { api } from '../../lib/api';
import { getApiErrorMessage } from '../../lib/formatters';
import { useLocale } from '../../lib/i18n';
import type {
  AddToastFn,
  CopyTextFn,
  CreateTeacherResponse,
  SignOutUserFn,
  StaffInviteRole,
  StaffMember,
} from './types';

interface DirectorTeamTabProps {
  currentUserRole: string;
  staffMembers: StaffMember[];
  isLoadingStaff: boolean;
  addToast: AddToastFn;
  copyText: CopyTextFn;
  signOutUser: SignOutUserFn;
  isSigningOut: boolean;
  onOpenTeacherHistory: (teacherId: string) => void;
}

export default function DirectorTeamTab({
  currentUserRole,
  staffMembers,
  isLoadingStaff,
  addToast,
  copyText,
  signOutUser,
  isSigningOut,
  onOpenTeacherHistory,
}: DirectorTeamTabProps) {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const [staffForm, setStaffForm] = useState({
    full_name: '',
    email: '',
    role: 'teacher' as StaffInviteRole,
  });
  const [staffInvite, setStaffInvite] = useState<CreateTeacherResponse | null>(null);

  const createStaffMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post<CreateTeacherResponse>('/admin/create-staff', staffForm);
      return res.data;
    },
    onSuccess: (staffMember) => {
      queryClient.invalidateQueries({ queryKey: ['director-staff'] });
      if (staffMember.role === 'teacher') {
        queryClient.invalidateQueries({ queryKey: ['director-teachers'] });
      }
      setStaffInvite(staffMember);
      setStaffForm({ full_name: '', email: '', role: 'teacher' });
      addToast(t('director.toast.teacherCreated'), 'success');
    },
    onError: (error) => addToast(getApiErrorMessage(error), 'error'),
  });

  const resetStaffAccessMutation = useMutation({
    mutationFn: async (member: StaffMember) => {
      const res = await api.post<CreateTeacherResponse>(`/admin/staff/${member.id}/reset-access`);
      return res.data;
    },
    onSuccess: (staffMember) => {
      queryClient.invalidateQueries({ queryKey: ['director-staff'] });
      setStaffInvite(staffMember);
      addToast(t('director.toast.staffAccessReset'), 'success');
    },
    onError: (error) => addToast(getApiErrorMessage(error), 'error'),
  });

  const deactivateStaffMutation = useMutation({
    mutationFn: async (member: StaffMember) => {
      const res = await api.post<StaffMember>(`/admin/staff/${member.id}/deactivate`);
      return res.data;
    },
    onSuccess: (staffMember) => {
      queryClient.invalidateQueries({ queryKey: ['director-staff'] });
      queryClient.invalidateQueries({ queryKey: ['director-teachers'] });
      if (staffInvite?.id === staffMember.id) setStaffInvite(null);
      addToast(t('director.toast.staffDeactivated'), 'success');
    },
    onError: (error) => addToast(getApiErrorMessage(error), 'error'),
  });

  const resetStaffAccess = (member: StaffMember) => {
    if (!window.confirm(t('director.team.resetAccessConfirm', { name: member.full_name }))) return;
    resetStaffAccessMutation.mutate(member);
  };

  const deactivateStaff = (member: StaffMember) => {
    if (!window.confirm(t('director.team.deactivateConfirm', { name: member.full_name }))) return;
    deactivateStaffMutation.mutate(member);
  };

  const handleStaffSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    createStaffMutation.mutate();
  };

  return (
    <div className="director-management-grid">
      <SchoolBrandingCard canEdit={currentUserRole === 'principal'} />
      <section className="glass-card management-card">
        <h2 className="dashboard-section-title dashboard-section-title--plain">{t('director.team.inviteTitle')}</h2>
        <p className="dashboard-section-copy dashboard-section-copy--spaced">{t('director.team.inviteCopy')}</p>
        <form className="stacked-form" onSubmit={handleStaffSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="staff-role">{t('director.team.role')}</label>
            <select
              id="staff-role"
              className="form-input"
              value={staffForm.role}
              onChange={(event) =>
                setStaffForm((current) => ({ ...current, role: event.target.value as StaffInviteRole }))
              }
            >
              <option value="teacher">{t('director.team.roleTeacher')}</option>
              {currentUserRole === 'principal' && (
                <option value="secretary">{t('director.team.roleSecretary')}</option>
              )}
              {currentUserRole === 'principal' && (
                <option value="nurse">{t('role.nurse')}</option>
              )}
              {currentUserRole === 'principal' && (
                <option value="canteen">{t('role.canteen')}</option>
              )}
              {currentUserRole === 'principal' && (
                <option value="driver">{t('role.driver')}</option>
              )}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="staff-name">{t('director.team.fullName')}</label>
            <input
              id="staff-name"
              className="form-input"
              value={staffForm.full_name}
              onChange={(event) => setStaffForm((current) => ({ ...current, full_name: event.target.value }))}
              placeholder={t('director.team.fullNamePlaceholder')}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="staff-email">{t('director.team.email')}</label>
            <input
              id="staff-email"
              className="form-input"
              type="email"
              value={staffForm.email}
              onChange={(event) => setStaffForm((current) => ({ ...current, email: event.target.value }))}
              placeholder="samir@ecole.dz"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary btn-full" disabled={createStaffMutation.isPending}>
            {createStaffMutation.isPending ? <Loader2 size={16} className="spin-icon" /> : <UserPlus size={16} />}
            {t('director.team.createInvite')}
          </button>
        </form>

        {staffInvite?.invite_code && (
          <div className="notice-box">
            <strong>{t('director.team.inviteCode')}</strong>
            <button type="button" className="token-code" onClick={() => copyText(staffInvite.invite_code || '', t('director.toast.inviteCopied'))}>
              {staffInvite.invite_code}
            </button>
            <span>{t('director.team.shareInvite', { name: staffInvite.full_name })}</span>
          </div>
        )}
        <TeacherImport />
      </section>

      <section className="glass-card management-card management-card--wide">
        <div className="dashboard-toolbar">
          <div>
            <h2 className="dashboard-section-title dashboard-section-title--plain">{t('director.team.title')}</h2>
            <p className="dashboard-section-copy">{t('director.team.copy')}</p>
          </div>
          <span className="status-badge status-badge--active">{t('director.team.count', { count: staffMembers.length })}</span>
        </div>
        <div className="premium-table-wrapper">
          <table className="premium-table">
            <thead>
              <tr>
                <th>{t('director.team.fullName')}</th>
                <th>{t('director.team.email')}</th>
                <th>{t('director.team.role')}</th>
                <th>{t('director.team.status')}</th>
                <th aria-label={t('director.team.actions')} />
              </tr>
            </thead>
            <tbody>
              {isLoadingStaff && (
                <tr><td colSpan={5}>{t('director.team.loading')}</td></tr>
              )}
              {!isLoadingStaff && staffMembers.map((member) => (
                <tr key={member.id}>
                  <td>{member.full_name}</td>
                  <td>{member.email}</td>
                  <td>{t(`role.${member.role}`)}</td>
                  <td>
                    {member.deactivated_at ? (
                      <span className="status-badge status-badge--danger">{t('director.team.deactivated')}</span>
                    ) : member.invite_code ? (
                      <span className="status-badge status-badge--warning">{t('director.team.pendingActivation')}</span>
                    ) : (
                      <span className="status-badge status-badge--active">{t('director.team.activeAccount')}</span>
                    )}
                  </td>
                  <td>
                    {(member.role === 'teacher' || (['secretary', 'nurse', 'canteen', 'driver'].includes(member.role) && currentUserRole === 'principal')) && (
                      <div className="table-actions">
                        {member.role === 'teacher' && (
                          <button
                            type="button"
                            className="btn btn-secondary btn-compact"
                            onClick={() => onOpenTeacherHistory(member.id)}
                          >
                            <History size={14} /> {t('records.history')}
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn btn-secondary btn-compact"
                          onClick={() => resetStaffAccess(member)}
                          disabled={resetStaffAccessMutation.isPending}
                        >
                          <KeyRound size={14} />
                          {member.deactivated_at ? t('director.team.reactivate') : t('director.team.resetAccess')}
                        </button>
                        {!member.deactivated_at && (
                          <button
                            type="button"
                            className="btn btn-danger btn-compact"
                            onClick={() => deactivateStaff(member)}
                            disabled={deactivateStaffMutation.isPending}
                          >
                            <UserX size={14} /> {t('director.team.deactivate')}
                          </button>
                        )}
                        {!member.deactivated_at && !member.invite_code && (
                          <button
                            type="button"
                            className="btn btn-secondary btn-compact"
                            onClick={() => signOutUser(member.id, member.full_name)}
                            disabled={isSigningOut}
                          >
                            <LogOut size={14} /> {t('director.signOut')}
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {!isLoadingStaff && staffMembers.length === 0 && (
                <tr><td colSpan={5}>{t('director.team.empty')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
