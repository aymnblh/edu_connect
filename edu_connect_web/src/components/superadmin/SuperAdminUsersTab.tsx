import { useState } from 'react';
import { isAxiosError } from 'axios';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Edit3,
  KeyRound,
  LogOut,
  Search,
  UserCheck,
  UserPlus,
  UserX,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useLocale } from '../../lib/i18n';
import type { AddToastFn, School, SystemUser } from './types';

const ALL_ROLES = [
  'system_admin',
  'principal',
  'secretary',
  'teacher',
  'nurse',
  'canteen',
  'driver',
  'parent',
] as const;

export default function SuperAdminUsersTab({
  schools,
  addToast,
}: {
  schools: School[];
  addToast: AddToastFn;
}) {
  const { t } = useLocale();
  const queryClient = useQueryClient();

  const [schoolFilter, setSchoolFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'deactivated'>('all');
  const [search, setSearch] = useState('');

  // Create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<string>('principal');
  const [newSchoolId, setNewSchoolId] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Edit modal
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRole, setEditRole] = useState('principal');
  const [editSchoolId, setEditSchoolId] = useState('');
  const [editActive, setEditActive] = useState(true);

  // Reset password modal
  const [resetUser, setResetUser] = useState<SystemUser | null>(null);
  const [resetPassword, setResetPassword] = useState('');

  const usersQuery = useQuery<SystemUser[]>({
    queryKey: ['system-users', { schoolFilter, roleFilter, statusFilter, search }],
    queryFn: async () => {
      const res = await api.get('/system/users', {
        params: {
          school_id: schoolFilter || undefined,
          role: roleFilter || undefined,
          status: statusFilter,
          search: search.trim() || undefined,
          limit: 200,
        },
      });
      return res.data;
    },
  });

  const handleError = (err: unknown) => {
    const message = isAxiosError(err) ? err.response?.data?.detail || err.message : t('auth.connectionError');
    addToast(`${t('common.errorGeneric')}: ${message}`, 'error');
  };

  const createMutation = useMutation({
    mutationFn: async () =>
      api.post('/system/users', {
        email: newEmail.trim(),
        full_name: newName.trim(),
        role: newRole,
        school_id: newRole === 'system_admin' ? null : newSchoolId || null,
        phone: newPhone.trim() || null,
        password: newPassword,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-users'] });
      queryClient.invalidateQueries({ queryKey: ['schools'] });
      setCreateOpen(false);
      setNewEmail('');
      setNewName('');
      setNewPhone('');
      setNewPassword('');
      addToast(t('superadmin.users.toastCreated'), 'success');
    },
    onError: handleError,
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: {
      id: string;
      data: Record<string, unknown>;
    }) => api.patch(`/system/users/${payload.id}`, payload.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-users'] });
      queryClient.invalidateQueries({ queryKey: ['schools'] });
      setEditingUser(null);
      addToast(t('superadmin.users.toastUpdated'), 'success');
    },
    onError: handleError,
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (payload: { id: string; password: string }) =>
      api.post(`/system/users/${payload.id}/reset-password`, { password: payload.password }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-users'] });
      setResetUser(null);
      setResetPassword('');
      addToast(t('superadmin.users.toastPasswordReset'), 'success');
    },
    onError: handleError,
  });

  const revokeSessionsMutation = useMutation({
    mutationFn: async (id: string) => api.post(`/system/users/${id}/revoke-sessions`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-users'] });
      queryClient.invalidateQueries({ queryKey: ['schools'] });
      addToast(t('superadmin.users.toastSessionsRevoked'), 'success');
    },
    onError: handleError,
  });

  const openEditModal = (user: SystemUser) => {
    setEditingUser(user);
    setEditName(user.full_name);
    setEditEmail(user.email);
    setEditPhone(user.phone || '');
    setEditRole(user.role);
    setEditSchoolId(user.school_id || '');
    setEditActive(user.is_active);
  };

  const users = usersQuery.data ?? [];

  return (
    <section className="glass-card dashboard-card-pad">
      <div className="dashboard-toolbar">
        <div>
          <h2 className="dashboard-section-title dashboard-section-title--plain">{t('superadmin.users.title')}</h2>
          <p className="dashboard-section-copy">{t('superadmin.users.copy')}</p>
        </div>
        <button
          type="button"
          className="btn btn-primary btn-compact"
          onClick={() => {
            setNewSchoolId(schoolFilter && schoolFilter !== '__platform__' ? schoolFilter : schools[0]?.id || '');
            setCreateOpen(true);
          }}
        >
          <UserPlus size={16} /> {t('superadmin.users.create')}
        </button>
      </div>

      <div className="superadmin-filter-row">
        <div className="superadmin-search-box">
          <Search size={16} />
          <input
            type="search"
            className="input-field"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('superadmin.users.searchPlaceholder')}
          />
        </div>

        <select
          className="form-input"
          aria-label={t('superadmin.audit.schoolFilter')}
          value={schoolFilter}
          onChange={(e) => setSchoolFilter(e.target.value)}
        >
          <option value="">{t('superadmin.audit.allSchools')}</option>
          <option value="__platform__">{t('superadmin.audit.platformOnly')}</option>
          {schools.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>

        <select
          className="form-input"
          aria-label={t('superadmin.users.roleLabel')}
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="">{t('superadmin.users.allRoles')}</option>
          {ALL_ROLES.map((role) => (
            <option key={role} value={role}>{t(`role.${role}`)}</option>
          ))}
        </select>

        <select
          className="form-input"
          aria-label={t('superadmin.users.statusLabel')}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
        >
          <option value="all">{t('superadmin.users.statusAll')}</option>
          <option value="active">{t('superadmin.statusActive')}</option>
          <option value="deactivated">{t('superadmin.users.statusDeactivated')}</option>
        </select>
      </div>

      {usersQuery.isLoading && <p className="dashboard-section-copy">{t('common.loading')}</p>}
      {!usersQuery.isLoading && users.length === 0 && (
        <p className="dashboard-section-copy">{t('superadmin.users.empty')}</p>
      )}

      {users.length > 0 && (
        <div className="premium-table-wrapper">
          <table className="premium-table">
            <thead>
              <tr>
                <th>{t('superadmin.users.colUser')}</th>
                <th>{t('superadmin.users.colRole')}</th>
                <th>{t('superadmin.users.colSchool')}</th>
                <th>{t('superadmin.users.colStatus')}</th>
                <th>{t('superadmin.users.colSessions')}</th>
                <th>{t('superadmin.users.colActions')}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <strong>{u.full_name}</strong>
                    <div className="report-card-muted">{u.email}</div>
                    {u.phone && <div className="report-card-muted">{u.phone}</div>}
                  </td>
                  <td>
                    <span className="badge badge-info">{t(`role.${u.role}`)}</span>
                  </td>
                  <td>{u.school_name || t('superadmin.audit.platformBadge')}</td>
                  <td>
                    <span className={`status-badge ${u.is_active ? 'status-badge--active' : 'status-badge--danger'}`}>
                      {u.is_active ? t('superadmin.statusActive') : t('superadmin.users.statusDeactivated')}
                    </span>
                  </td>
                  <td>{u.active_session_count}</td>
                  <td>
                    <div className="superadmin-row-actions">
                      <button
                        type="button"
                        className="btn btn-outline btn-compact"
                        title={t('superadmin.users.edit')}
                        onClick={() => openEditModal(u)}
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline btn-compact"
                        title={t('superadmin.users.resetPassword')}
                        onClick={() => {
                          setResetUser(u);
                          setResetPassword('');
                        }}
                      >
                        <KeyRound size={14} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline btn-compact"
                        title={t('superadmin.users.revokeSessions')}
                        onClick={() => {
                          if (window.confirm(t('superadmin.users.confirmRevoke', { name: u.full_name }))) {
                            revokeSessionsMutation.mutate(u.id);
                          }
                        }}
                      >
                        <LogOut size={14} />
                      </button>
                      <button
                        type="button"
                        className={`btn btn-compact ${u.is_active ? 'btn-danger' : 'btn-success'}`}
                        title={u.is_active ? t('superadmin.users.deactivate') : t('superadmin.users.reactivate')}
                        onClick={() => {
                          if (
                            !u.is_active ||
                            window.confirm(t('superadmin.users.confirmDeactivate', { name: u.full_name }))
                          ) {
                            updateMutation.mutate({ id: u.id, data: { is_active: !u.is_active } });
                          }
                        }}
                      >
                        {u.is_active ? <UserX size={14} /> : <UserCheck size={14} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create User Modal */}
      {createOpen && (
        <div
          className="workspace-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setCreateOpen(false);
          }}
        >
          <div className="workspace-modal" role="dialog" aria-modal="true" aria-labelledby="sa-create-user-title">
            <h2 id="sa-create-user-title" className="payment-modal-title">{t('superadmin.users.createTitle')}</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate();
              }}
            >
              <div className="form-group">
                <label className="form-label" htmlFor="sa-new-name">{t('superadmin.users.fullNameLabel')}</label>
                <input
                  id="sa-new-name"
                  type="text"
                  className="input-field"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="sa-new-email">{t('superadmin.users.emailLabel')}</label>
                <input
                  id="sa-new-email"
                  type="email"
                  className="input-field"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  required
                />
              </div>
              <div className="superadmin-form-grid">
                <div className="form-group">
                  <label className="form-label" htmlFor="sa-new-role">{t('superadmin.users.roleLabel')}</label>
                  <select
                    id="sa-new-role"
                    className="form-input"
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                  >
                    {ALL_ROLES.map((role) => (
                      <option key={role} value={role}>{t(`role.${role}`)}</option>
                    ))}
                  </select>
                </div>
                {newRole !== 'system_admin' && (
                  <div className="form-group">
                    <label className="form-label" htmlFor="sa-new-school">{t('superadmin.users.schoolLabel')}</label>
                    <select
                      id="sa-new-school"
                      className="form-input"
                      value={newSchoolId}
                      onChange={(e) => setNewSchoolId(e.target.value)}
                      required
                    >
                      <option value="">—</option>
                      {schools.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <div className="superadmin-form-grid">
                <div className="form-group">
                  <label className="form-label" htmlFor="sa-new-phone">{t('superadmin.users.phoneLabel')}</label>
                  <input
                    id="sa-new-phone"
                    type="text"
                    className="input-field"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="sa-new-password">{t('superadmin.users.passwordLabel')}</label>
                  <input
                    id="sa-new-password"
                    type="password"
                    className="input-field"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    minLength={8}
                    required
                  />
                </div>
              </div>
              <div className="payment-actions">
                <button type="button" className="btn btn-outline" onClick={() => setCreateOpen(false)}>
                  {t('superadmin.cancelPayment')}
                </button>
                <button type="submit" className="btn btn-primary" disabled={createMutation.isPending}>
                  <UserPlus size={16} /> {t('superadmin.users.createSubmit')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div
          className="workspace-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingUser(null);
          }}
        >
          <div className="workspace-modal" role="dialog" aria-modal="true" aria-labelledby="sa-edit-user-title">
            <h2 id="sa-edit-user-title" className="payment-modal-title">{t('superadmin.users.editTitle')}</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateMutation.mutate({
                  id: editingUser.id,
                  data: {
                    full_name: editName.trim(),
                    email: editEmail.trim(),
                    phone: editPhone.trim() || null,
                    role: editRole,
                    school_id: editRole === 'system_admin' ? null : editSchoolId || null,
                    is_active: editActive,
                  },
                });
              }}
            >
              <div className="form-group">
                <label className="form-label" htmlFor="sa-edit-name">{t('superadmin.users.fullNameLabel')}</label>
                <input
                  id="sa-edit-name"
                  type="text"
                  className="input-field"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="sa-edit-email">{t('superadmin.users.emailLabel')}</label>
                <input
                  id="sa-edit-email"
                  type="email"
                  className="input-field"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  required
                />
              </div>
              <div className="superadmin-form-grid">
                <div className="form-group">
                  <label className="form-label" htmlFor="sa-edit-role">{t('superadmin.users.roleLabel')}</label>
                  <select
                    id="sa-edit-role"
                    className="form-input"
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                  >
                    {ALL_ROLES.map((role) => (
                      <option key={role} value={role}>{t(`role.${role}`)}</option>
                    ))}
                  </select>
                </div>
                {editRole !== 'system_admin' && (
                  <div className="form-group">
                    <label className="form-label" htmlFor="sa-edit-school">{t('superadmin.users.schoolLabel')}</label>
                    <select
                      id="sa-edit-school"
                      className="form-input"
                      value={editSchoolId}
                      onChange={(e) => setEditSchoolId(e.target.value)}
                      required
                    >
                      <option value="">—</option>
                      {schools.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="sa-edit-phone">{t('superadmin.users.phoneLabel')}</label>
                <input
                  id="sa-edit-phone"
                  type="text"
                  className="input-field"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                />
              </div>
              <label className="checkbox-row" style={{ marginBottom: '1rem' }}>
                <input type="checkbox" checked={editActive} onChange={(e) => setEditActive(e.target.checked)} />
                <span>{t('superadmin.users.accountActive')}</span>
              </label>
              <div className="payment-actions">
                <button type="button" className="btn btn-outline" onClick={() => setEditingUser(null)}>
                  {t('superadmin.cancelPayment')}
                </button>
                <button type="submit" className="btn btn-primary" disabled={updateMutation.isPending}>
                  {t('superadmin.saveChanges')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetUser && (
        <div
          className="workspace-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setResetUser(null);
          }}
        >
          <div className="workspace-modal" role="dialog" aria-modal="true" aria-labelledby="sa-reset-pw-title">
            <h2 id="sa-reset-pw-title" className="payment-modal-title">{t('superadmin.users.resetPasswordTitle')}</h2>
            <p className="payment-school-copy">
              <strong>{resetUser.full_name}</strong> ({resetUser.email})
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                resetPasswordMutation.mutate({ id: resetUser.id, password: resetPassword });
              }}
            >
              <div className="form-group">
                <label className="form-label" htmlFor="sa-reset-pw-input">{t('superadmin.users.newPasswordLabel')}</label>
                <input
                  id="sa-reset-pw-input"
                  type="password"
                  className="input-field"
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  minLength={8}
                  required
                />
              </div>
              <div className="payment-actions">
                <button type="button" className="btn btn-outline" onClick={() => setResetUser(null)}>
                  {t('superadmin.cancelPayment')}
                </button>
                <button type="submit" className="btn btn-primary" disabled={resetPasswordMutation.isPending}>
                  <KeyRound size={16} /> {t('superadmin.users.resetPasswordSubmit')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
