import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Activity,
  BookOpen,
  Bus,
  CalendarRange,
  FileText,
  Megaphone,
  MessageSquare,
  ScrollText,
  UserPlus,
  Users,
  Utensils,
  Wallet,
} from 'lucide-react';
import AnnouncementsPanel from '../components/AnnouncementsPanel';
import AuditLogPanel from '../components/AuditLogPanel';
import CanteenAdminPanel from '../components/CanteenAdminPanel';
import DirectMessagingPanel from '../components/DirectMessagingPanel';
import DirectorInsightsPanel from '../components/DirectorInsightsPanel';
import { StudentFileModal, TeacherHistoryModal } from '../components/DirectorRecordsPanels';
import FeesPanel from '../components/FeesPanel';
import MonthlyReportPanel from '../components/MonthlyReportPanel';
import ReferralCard from '../components/ReferralCard';
import ReportCardsAdminPanel from '../components/ReportCardsAdminPanel';
import SetupChecklist, { ParentCodesSheet } from '../components/SetupChecklist';
import TransportAdminPanel from '../components/TransportAdminPanel';
import DirectorClassesTab from '../components/director/DirectorClassesTab';
import DirectorOverviewTab from '../components/director/DirectorOverviewTab';
import DirectorStudentsTab from '../components/director/DirectorStudentsTab';
import DirectorTeamTab from '../components/director/DirectorTeamTab';
import type {
  DirectorTab,
  SchoolClass,
  StaffMember,
  Student,
  Toast,
  ToastType,
} from '../components/director/types';
import { api } from '../lib/api';
import { useSchoolBranding } from '../lib/branding';
import { copyTextToClipboard, getApiErrorMessage } from '../lib/formatters';
import { useLocale } from '../lib/i18n';
import { readWorkspaceSessionItem } from '../lib/workspace';

let toastId = 0;

const directorTabs: Array<{
  id: DirectorTab;
  labelKey: string;
  route: string;
  icon: typeof Activity;
}> = [
  { id: 'overview', labelKey: 'director.tab.overview', route: '/director', icon: Activity },
  { id: 'monthly', labelKey: 'director.tab.monthly', route: '/director/monthly-report', icon: CalendarRange },
  { id: 'students', labelKey: 'director.tab.students', route: '/director/students', icon: Users },
  { id: 'classes', labelKey: 'director.tab.classes', route: '/director/classes', icon: BookOpen },
  { id: 'fees', labelKey: 'director.tab.fees', route: '/director/fees', icon: Wallet },
  { id: 'canteen', labelKey: 'nav.canteen', route: '/director/canteen', icon: Utensils },
  { id: 'transport', labelKey: 'nav.transport', route: '/director/transport', icon: Bus },
  { id: 'team', labelKey: 'director.tab.team', route: '/director/team', icon: UserPlus },
  { id: 'reports', labelKey: 'director.tab.reports', route: '/director/report-cards', icon: FileText },
  { id: 'announcements', labelKey: 'director.tab.announcements', route: '/director/announcements', icon: Megaphone },
  { id: 'journal', labelKey: 'director.tab.journal', route: '/director/audit-log', icon: ScrollText },
  { id: 'messages', labelKey: 'director.tab.messages', route: '/director/messages', icon: MessageSquare },
];

const emptyStudents: Student[] = [];
const emptyClasses: SchoolClass[] = [];
const emptyStaffMembers: StaffMember[] = [];

function readCurrentSchoolId(): string {
  const raw = readWorkspaceSessionItem('user');
  if (!raw) return '';
  try {
    const user = JSON.parse(raw) as { school_id?: unknown };
    return typeof user.school_id === 'string' ? user.school_id : '';
  } catch {
    return '';
  }
}

function readCurrentUserRole(): string {
  const activeRole = readWorkspaceSessionItem('active_workspace_role');
  if (activeRole) return activeRole;

  const raw = readWorkspaceSessionItem('user');
  if (!raw) return '';
  try {
    const user = JSON.parse(raw) as { role?: unknown };
    return typeof user.role === 'string' ? user.role : '';
  } catch {
    return '';
  }
}

function tabFromPath(pathname: string): DirectorTab {
  if (pathname.includes('/director/monthly-report')) return 'monthly';
  if (pathname.includes('/director/fees')) return 'fees';
  if (pathname.includes('/director/canteen')) return 'canteen';
  if (pathname.includes('/director/transport')) return 'transport';
  if (pathname.includes('/director/students')) return 'students';
  if (pathname.includes('/director/classes')) return 'classes';
  if (pathname.includes('/director/team')) return 'team';
  if (pathname.includes('/director/report-cards')) return 'reports';
  if (pathname.includes('/director/announcements')) return 'announcements';
  if (pathname.includes('/director/audit-log')) return 'journal';
  if (pathname.includes('/director/messages')) return 'messages';
  return 'overview';
}

export default function DirectorDashboard() {
  const { t } = useLocale();
  const navigate = useNavigate();
  const location = useLocation();
  const activeTab = tabFromPath(location.pathname);
  const schoolId = useMemo(() => readCurrentSchoolId(), []);
  const currentUserRole = useMemo(() => readCurrentUserRole(), []);
  const schoolBranding = useSchoolBranding().data;

  const [toasts, setToasts] = useState<Toast[]>([]);
  const [fileStudentId, setFileStudentId] = useState<string | null>(null);
  const [codesSheetOpen, setCodesSheetOpen] = useState(false);
  const [historyTeacherId, setHistoryTeacherId] = useState<string | null>(null);

  const addToast = (message: string, type: ToastType = 'success') => {
    const id = ++toastId;
    setToasts((current) => [...current, { id, message, type }]);
    window.setTimeout(() => {
      setToasts((current) =>
        current.map((toast) => (toast.id === id ? { ...toast, exiting: true } : toast)),
      );
      window.setTimeout(() => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
      }, 250);
    }, 3500);
  };

  const copyText = async (value: string, successMessage: string) => {
    const copied = await copyTextToClipboard(value);
    addToast(copied ? successMessage : t('director.toast.clipboardBlocked'), copied ? 'success' : 'error');
    return copied;
  };

  const studentsQuery = useQuery<Student[]>({
    queryKey: ['director-students'],
    enabled: activeTab === 'students' || activeTab === 'classes',
    queryFn: async () => {
      const res = await api.get('/admin/students', { params: { include_archived: true } });
      return res.data;
    },
  });

  const classesQuery = useQuery<SchoolClass[]>({
    queryKey: ['director-classes'],
    enabled: activeTab === 'classes' || activeTab === 'announcements' || activeTab === 'reports' || activeTab === 'messages',
    queryFn: async () => {
      const res = await api.get('/classes/');
      return res.data;
    },
  });

  const staffQuery = useQuery<StaffMember[]>({
    queryKey: ['director-staff'],
    enabled: activeTab === 'team' || activeTab === 'journal',
    queryFn: async () => {
      const res = await api.get('/admin/staff');
      return res.data;
    },
  });

  const signOutMutation = useMutation({
    mutationFn: async (userId: string) => api.post(`/admin/users/${userId}/sign-out`),
    onSuccess: () => addToast(t('director.toast.signedOut'), 'success'),
    onError: (error) => addToast(getApiErrorMessage(error), 'error'),
  });

  const signOutUser = (userId: string, name: string) => {
    if (window.confirm(t('director.signOutConfirm', { name }))) signOutMutation.mutate(userId);
  };

  const students = studentsQuery.data ?? emptyStudents;
  const classes = classesQuery.data ?? emptyClasses;
  const staffMembers = staffQuery.data ?? emptyStaffMembers;
  const activeStudents = useMemo(
    () => students.filter((student) => !student.archived_at),
    [students],
  );

  return (
    <div className="container dashboard-page director-page animate-fade-in">
      {toasts.length > 0 && (
        <div className="toast-container" aria-live="polite">
          {toasts.map((toast) => (
            <button
              type="button"
              key={toast.id}
              className={`toast toast-${toast.type} ${toast.exiting ? 'toast-exit' : ''}`}
              onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))}
            >
              {toast.message}
            </button>
          ))}
        </div>
      )}

      <header className="dashboard-header">
        <div className="badge dashboard-eyebrow">
          <Activity size={14} /> {t('director.headerEyebrow')}
        </div>
        <h1>{t('director.title')}</h1>
        <p>{t('director.headerCopy')}</p>
      </header>

      <nav className="management-tabs" aria-label={t('director.sectionsAria')}>
        {directorTabs
          .filter((tab) => {
            if (tab.id === 'canteen') return Boolean(schoolBranding?.modules?.canteen);
            if (tab.id === 'transport') return Boolean(schoolBranding?.modules?.transport);
            return true;
          })
          .map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                type="button"
                key={tab.id}
                className={`management-tab ${active ? 'management-tab--active' : ''}`}
                aria-current={active ? 'page' : undefined}
                onClick={() => navigate(tab.route)}
              >
                <Icon size={17} />
                <span>{t(tab.labelKey)}</span>
              </button>
            );
          })}
      </nav>

      {activeTab === 'overview' && <SetupChecklist />}
      {activeTab === 'overview' && <DirectorOverviewTab addToast={addToast} />}
      {activeTab === 'monthly' && <MonthlyReportPanel />}
      {activeTab === 'fees' && <FeesPanel canChangeSettings={currentUserRole === 'principal'} />}
      {activeTab === 'canteen' && <CanteenAdminPanel canManageAdmin canEditSettings={currentUserRole === 'principal'} />}
      {activeTab === 'transport' && <TransportAdminPanel />}
      {activeTab === 'overview' && <DirectorInsightsPanel />}
      {activeTab === 'overview' && <ReferralCard />}
      {activeTab === 'students' && (
        <DirectorStudentsTab
          students={students}
          activeStudents={activeStudents}
          isLoadingStudents={studentsQuery.isLoading}
          addToast={addToast}
          copyText={copyText}
          signOutUser={signOutUser}
          isSigningOut={signOutMutation.isPending}
          onOpenCodesSheet={() => setCodesSheetOpen(true)}
          onOpenStudentFile={setFileStudentId}
        />
      )}
      {activeTab === 'classes' && (
        <DirectorClassesTab
          schoolId={schoolId}
          classes={classes}
          isLoadingClasses={classesQuery.isLoading}
          activeStudents={activeStudents}
          canManageAcademicYears={currentUserRole === 'principal'}
          addToast={addToast}
        />
      )}
      {activeTab === 'team' && (
        <DirectorTeamTab
          currentUserRole={currentUserRole}
          staffMembers={staffMembers}
          isLoadingStaff={staffQuery.isLoading}
          addToast={addToast}
          copyText={copyText}
          signOutUser={signOutUser}
          isSigningOut={signOutMutation.isPending}
          onOpenTeacherHistory={setHistoryTeacherId}
        />
      )}
      {activeTab === 'reports' && (
        <ReportCardsAdminPanel
          classes={classes.map((schoolClass) => ({ id: schoolClass.id, name: schoolClass.name }))}
        />
      )}
      {codesSheetOpen && <ParentCodesSheet onClose={() => setCodesSheetOpen(false)} />}
      {fileStudentId && <StudentFileModal studentId={fileStudentId} onClose={() => setFileStudentId(null)} />}
      {historyTeacherId && <TeacherHistoryModal teacherId={historyTeacherId} onClose={() => setHistoryTeacherId(null)} />}
      {activeTab === 'journal' && (
        <AuditLogPanel people={staffMembers.map((member) => ({ id: member.id, full_name: member.full_name }))} />
      )}
      {activeTab === 'announcements' && (
        <AnnouncementsPanel
          scopeKey="director"
          canCreate
          allowWholeSchool
          classes={classes.map((schoolClass) => ({ id: schoolClass.id, name: schoolClass.name }))}
        />
      )}
      {activeTab === 'messages' && (
        <section className="glass-card dashboard-card-pad">
          <DirectMessagingPanel
            scopeKey="director"
            classes={classes.map((schoolClass) => ({ id: schoolClass.id, name: schoolClass.name }))}
          />
        </section>
      )}
    </div>
  );
}
