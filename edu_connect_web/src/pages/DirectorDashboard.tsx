import { useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '../lib/api';
import { t as translate, useLocale, type Locale } from '../lib/i18n';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import {
  Activity,
  Award,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardCopy,
  FileUp,
  GraduationCap,
  KeyRound,
  Link2Off,
  Loader2,
  Plus,
  QrCode,
  Search,
  Share2,
  Sparkles,
  TrendingDown,
  TrendingUp,
  UserPlus,
  Users,
  X,
} from 'lucide-react';

interface AnalyticsStudent {
  student_id: string;
  student_name: string;
  class_name: string;
  average_score: number;
}

interface ClassPerformance {
  class_name: string;
  average_score: number;
}

interface DirectorAnalytics {
  school_avg?: number;
  absence_rate?: number;
  adoption_rate?: number;
  class_performance?: ClassPerformance[];
  subject_performance?: Array<{ subject: string; average_score: number }>;
  top_students?: AnalyticsStudent[];
  struggling_students?: AnalyticsStudent[];
}

interface PendingAttendance {
  id: string;
  class_id: string;
  class_name: string;
  student_id: string;
  student_name: string;
  status: 'absent' | 'late';
  date: string;
  note?: string | null;
  is_justified: boolean;
  justification_text?: string | null;
  justification_attachment_url?: string | null;
}

interface Student {
  id: string;
  school_id: string;
  student_id?: string | null;
  linking_pin?: string | null;
  full_name: string;
  created_at: string;
  archived_at?: string | null;
  archive_reason?: string | null;
}

interface Teacher {
  id: string;
  full_name: string;
  email: string;
}

interface SchoolClass {
  id: string;
  school_id: string;
  name: string;
  subject?: string | null;
  join_code: string;
  created_at: string;
  teachers: Teacher[];
  members: Student[];
}

interface Course {
  id: string;
  name: string;
  school_id: string;
  coefficient?: number;
  created_at: string;
}

interface Semester {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  school_id: string;
}

interface ParentLinkAudit {
  id: string;
  label?: string | null;
  device_platform?: string | null;
  device_fingerprint?: string | null;
  ip_address?: string | null;
  used_at?: string | null;
  revoked_at?: string | null;
  parent_name?: string | null;
}

interface ParentLinkToken {
  label: string;
  token: string;
  expires_at: string;
}

interface GenerateTokensResponse {
  status: string;
  tokens: ParentLinkToken[];
}

interface CreateTeacherResponse extends Teacher {
  role: string;
  invite_code?: string | null;
}

interface ClassCourseAssignment {
  class_id: string;
  course_id: string;
  teacher_id: string;
  coefficient: number;
  course_name?: string | null;
  teacher_name?: string | null;
}

type ToastType = 'success' | 'error' | 'warning';
type DirectorTab = 'overview' | 'students' | 'classes' | 'team';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
  exiting?: boolean;
}

interface ClassPerformanceTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    payload: ClassPerformance;
  }>;
}

let toastId = 0;

const directorTabs: Array<{
  id: DirectorTab;
  labelKey: string;
  route: string;
  icon: typeof Activity;
}> = [
  { id: 'overview', labelKey: 'director.tab.overview', route: '/director', icon: Activity },
  { id: 'students', labelKey: 'director.tab.students', route: '/director/students', icon: Users },
  { id: 'classes', labelKey: 'director.tab.classes', route: '/director/classes', icon: BookOpen },
  { id: 'team', labelKey: 'director.tab.team', route: '/director/team', icon: UserPlus },
];

const emptyStudents: Student[] = [];
const emptyClasses: SchoolClass[] = [];
const emptyTeachers: Teacher[] = [];
const emptyCourses: Course[] = [];
const emptySemesters: Semester[] = [];

function readCurrentSchoolId(): string {
  const raw = localStorage.getItem('user');
  if (!raw) return '';
  try {
    const user = JSON.parse(raw) as { school_id?: unknown };
    return typeof user.school_id === 'string' ? user.school_id : '';
  } catch {
    return '';
  }
}

function tabFromPath(pathname: string): DirectorTab {
  if (pathname.includes('/director/students')) return 'students';
  if (pathname.includes('/director/classes')) return 'classes';
  if (pathname.includes('/director/team')) return 'team';
  return 'overview';
}

function localeToIntl(locale: Locale) {
  if (locale === 'ar') return 'ar-DZ';
  if (locale === 'en') return 'en-US';
  return 'fr-DZ';
}

function formatDate(value?: string | null, locale: Locale = 'fr') {
  if (!value) return '-';
  return new Intl.DateTimeFormat(localeToIntl(locale), {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function formatDateTime(value?: string | null, locale: Locale = 'fr') {
  if (!value) return '-';
  return new Intl.DateTimeFormat(localeToIntl(locale), {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatAttendanceDate(value?: string | null, locale: Locale = 'fr') {
  if (!value) return '-';
  return new Intl.DateTimeFormat(localeToIntl(locale), {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  }).format(new Date(value));
}

function attendanceStatusLabel(status: PendingAttendance['status'], locale: Locale) {
  return translate(
    status === 'late' ? 'director.attendance.late' : 'director.attendance.absent',
    undefined,
    locale,
  );
}

function getErrorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { data?: { detail?: unknown } } }).response;
    const detail = response?.data?.detail;
    if (typeof detail === 'string') return detail;
    if (detail) return JSON.stringify(detail);
  }
  if (error instanceof Error) return error.message;
  return translate('common.errorGeneric');
}

function copyTextFallback(value: string) {
  const textArea = document.createElement('textarea');
  textArea.value = value;
  textArea.setAttribute('readonly', '');
  textArea.style.position = 'fixed';
  textArea.style.insetInlineStart = '-9999px';
  textArea.style.top = '0';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  textArea.setSelectionRange(0, value.length);

  try {
    return document.execCommand('copy');
  } finally {
    document.body.removeChild(textArea);
  }
}

const CustomTooltip = ({ active, payload }: ClassPerformanceTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="tooltip-card">
        <p className="tooltip-title">
          {payload[0].payload.class_name}
        </p>
        <p className="tooltip-value">
          {translate('director.tooltipAverage', { score: payload[0].value.toFixed(2) })}
        </p>
      </div>
    );
  }
  return null;
};

export default function DirectorDashboard() {
  const { t, locale } = useLocale();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const activeTab = tabFromPath(location.pathname);
  const schoolId = useMemo(() => readCurrentSchoolId(), []);

  const [toasts, setToasts] = useState<Toast[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [linkLabel, setLinkLabel] = useState('parent');
  const [qrModal, setQrModal] = useState<{ student: Student; token: ParentLinkToken } | null>(null);
  const [teacherForm, setTeacherForm] = useState({ full_name: '', email: '' });
  const [teacherInvite, setTeacherInvite] = useState<CreateTeacherResponse | null>(null);
  const [classForm, setClassForm] = useState({ name: '', subject: '' });
  const [courseName, setCourseName] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedCourseClassId, setSelectedCourseClassId] = useState('');
  const [assignmentForm, setAssignmentForm] = useState({ course_id: '', teacher_id: '', coefficient: '1' });
  const [enrollmentDraft, setEnrollmentDraft] = useState<{ classId: string; ids: string[] } | null>(null);
  const [approvalDrafts, setApprovalDrafts] = useState<Record<string, string>>({});

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

  const analyticsQuery = useQuery<DirectorAnalytics>({
    queryKey: ['director-analytics'],
    enabled: activeTab === 'overview',
    queryFn: async () => {
      const res = await api.get('/admin/analytics/overview');
      return res.data;
    },
  });

  const pendingAttendanceQuery = useQuery<PendingAttendance[]>({
    queryKey: ['director-pending-attendance'],
    enabled: activeTab === 'overview',
    queryFn: async () => {
      const res = await api.get('/admin/attendance/pending');
      return res.data;
    },
  });

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
    enabled: activeTab === 'classes',
    queryFn: async () => {
      const res = await api.get('/classes/');
      return res.data;
    },
  });

  const teachersQuery = useQuery<Teacher[]>({
    queryKey: ['director-teachers'],
    enabled: activeTab === 'classes' || activeTab === 'team',
    queryFn: async () => {
      const res = await api.get('/classes/teachers/all');
      return res.data;
    },
  });

  const coursesQuery = useQuery<Course[]>({
    queryKey: ['director-courses'],
    enabled: activeTab === 'classes',
    queryFn: async () => {
      const res = await api.get('/admin/courses');
      return res.data;
    },
  });

  const semestersQuery = useQuery<Semester[]>({
    queryKey: ['director-semesters'],
    enabled: activeTab === 'classes',
    queryFn: async () => {
      const res = await api.get('/admin/semesters');
      return res.data;
    },
  });

  const students = studentsQuery.data ?? emptyStudents;
  const classes = classesQuery.data ?? emptyClasses;
  const teachers = teachersQuery.data ?? emptyTeachers;
  const courses = coursesQuery.data ?? emptyCourses;
  const semesters = semestersQuery.data ?? emptySemesters;
  const pendingAttendances = pendingAttendanceQuery.data ?? [];
  const resolvedSelectedStudentId =
    selectedStudentId ?? (activeTab === 'students' ? students[0]?.id ?? null : null);
  const resolvedSelectedClassId =
    selectedClassId || (activeTab === 'classes' ? classes[0]?.id ?? '' : '');
  const resolvedSelectedCourseClassId =
    selectedCourseClassId || (activeTab === 'classes' ? classes[0]?.id ?? '' : '');
  const selectedStudent = students.find((student) => student.id === resolvedSelectedStudentId) ?? null;
  const selectedClass = classes.find((schoolClass) => schoolClass.id === resolvedSelectedClassId) ?? null;
  const activeStudents = useMemo(
    () => students.filter((student) => !student.archived_at),
    [students],
  );
  const selectedClassMemberIds = useMemo(
    () => selectedClass?.members?.map((student) => student.id) ?? [],
    [selectedClass],
  );
  const enrollmentIds =
    enrollmentDraft?.classId === resolvedSelectedClassId ? enrollmentDraft.ids : selectedClassMemberIds;
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

  const linkAuditQuery = useQuery<ParentLinkAudit[]>({
    queryKey: ['student-links', resolvedSelectedStudentId],
    enabled: activeTab === 'students' && Boolean(resolvedSelectedStudentId),
    queryFn: async () => {
      const res = await api.get(`/admin/students/${resolvedSelectedStudentId}/links`);
      return res.data;
    },
  });

  const classCoursesQuery = useQuery<ClassCourseAssignment[]>({
    queryKey: ['class-courses', resolvedSelectedCourseClassId],
    enabled: activeTab === 'classes' && Boolean(resolvedSelectedCourseClassId),
    queryFn: async () => {
      const res = await api.get(`/classes/${resolvedSelectedCourseClassId}/courses`);
      return res.data;
    },
  });

  const filteredStudents = useMemo(() => {
    const search = studentSearch.trim().toLowerCase();
    if (!search) return students;
    return students.filter((student) =>
      [student.full_name, student.student_id, student.linking_pin]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search)),
    );
  }, [studentSearch, students]);

  const acceptAttendanceMutation = useMutation({
    mutationFn: async ({ item, justification }: { item: PendingAttendance; justification: string }) => {
      const res = await api.patch(`/classes/${item.class_id}/attendance/${item.id}/justify`, {
        justification,
        ...(item.justification_attachment_url ? { attachment_url: item.justification_attachment_url } : {}),
      });
      return { item, attendance: res.data as { is_justified?: boolean } };
    },
    onSuccess: ({ item, attendance }) => {
      setApprovalDrafts((current) => {
        const next = { ...current };
        delete next[item.id];
        return next;
      });
      if (attendance.is_justified) {
        queryClient.setQueryData<PendingAttendance[]>(
          ['director-pending-attendance'],
          (current) => current?.filter((pending) => pending.id !== item.id) ?? [],
        );
      }
      queryClient.invalidateQueries({ queryKey: ['director-pending-attendance'] });
      queryClient.invalidateQueries({ queryKey: ['director-analytics'] });
      addToast(t('director.toast.justificationApproved'), 'success');
    },
    onError: (error) => addToast(getErrorMessage(error), 'error'),
  });

  const importStudentsMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/admin/import/students', formData);
      return res.data as { imported: number; skipped: number };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['director-students'] });
      queryClient.invalidateQueries({ queryKey: ['director-analytics'] });
      addToast(t('director.toast.importedStudents', { imported: result.imported, skipped: result.skipped }), 'success');
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    onError: (error) => addToast(getErrorMessage(error), 'error'),
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
    onError: (error) => addToast(getErrorMessage(error), 'error'),
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
    onError: (error) => addToast(getErrorMessage(error), 'error'),
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
    onError: (error) => addToast(getErrorMessage(error), 'error'),
  });

  const createTeacherMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post<CreateTeacherResponse>('/admin/create-teacher', teacherForm);
      return res.data;
    },
    onSuccess: (teacher) => {
      queryClient.invalidateQueries({ queryKey: ['director-teachers'] });
      setTeacherInvite(teacher);
      setTeacherForm({ full_name: '', email: '' });
      addToast(t('director.toast.teacherCreated'), 'success');
    },
    onError: (error) => addToast(getErrorMessage(error), 'error'),
  });

  const createClassMutation = useMutation({
    mutationFn: async () => {
      if (!schoolId) throw new Error(t('director.error.missingSchoolId'));
      const res = await api.post('/classes/', {
        name: classForm.name,
        subject: classForm.subject || null,
        school_id: schoolId,
      });
      return res.data as SchoolClass;
    },
    onSuccess: (schoolClass) => {
      queryClient.invalidateQueries({ queryKey: ['director-classes'] });
      setEnrollmentDraft(null);
      setSelectedClassId(schoolClass.id);
      setSelectedCourseClassId(schoolClass.id);
      setClassForm({ name: '', subject: '' });
      addToast(t('director.toast.classCreated', { name: schoolClass.name }), 'success');
    },
    onError: (error) => addToast(getErrorMessage(error), 'error'),
  });

  const createCourseMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/admin/courses', { name: courseName });
      return res.data as Course;
    },
    onSuccess: (course) => {
      queryClient.invalidateQueries({ queryKey: ['director-courses'] });
      setCourseName('');
      setAssignmentForm((current) => ({
        ...current,
        course_id: course.id,
        coefficient: String(course.coefficient ?? 1),
      }));
      addToast(t('director.toast.courseAdded', { name: course.name }), 'success');
    },
    onError: (error) => addToast(getErrorMessage(error), 'error'),
  });

  const assignCourseMutation = useMutation({
    mutationFn: async () => {
      if (!resolvedSelectedCourseClassId) throw new Error(t('director.error.chooseClass'));
      const coefficient = Number.parseFloat(assignmentForm.coefficient);
      const res = await api.post(`/classes/${resolvedSelectedCourseClassId}/courses`, {
        course_id: assignmentForm.course_id,
        teacher_id: assignmentForm.teacher_id,
        coefficient: Number.isFinite(coefficient) && coefficient > 0 ? coefficient : 1,
      });
      return res.data as ClassCourseAssignment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-courses', resolvedSelectedCourseClassId] });
      queryClient.invalidateQueries({ queryKey: ['director-classes'] });
      addToast(t('director.toast.courseAssigned'), 'success');
    },
    onError: (error) => addToast(getErrorMessage(error), 'error'),
  });

  const enrollStudentsMutation = useMutation({
    mutationFn: async () => {
      if (!resolvedSelectedClassId) throw new Error(t('director.error.chooseClass'));
      await api.put(`/classes/${resolvedSelectedClassId}/students`, { student_ids: enrollmentIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['director-classes'] });
      addToast(t('director.toast.classListSaved'), 'success');
    },
    onError: (error) => addToast(getErrorMessage(error), 'error'),
  });

  const activateSemesterMutation = useMutation({
    mutationFn: async (semester: Semester) => {
      const res = await api.put(`/admin/semesters/${semester.id}`, { is_active: true });
      return res.data as Semester;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['director-semesters'] });
      addToast(t('director.toast.semesterActivated'), 'success');
    },
    onError: (error) => addToast(getErrorMessage(error), 'error'),
  });

  const handleStudentImport = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) importStudentsMutation.mutate(file);
  };

  const handleTeacherSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    createTeacherMutation.mutate();
  };

  const handleClassSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    createClassMutation.mutate();
  };

  const handleCourseSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    createCourseMutation.mutate();
  };

  const handleAssignmentSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    assignCourseMutation.mutate();
  };

  const copyText = async (value: string, successMessage: string) => {
    try {
      if (window.isSecureContext && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else if (!copyTextFallback(value)) {
        throw new Error('Clipboard fallback failed.');
      }
      addToast(successMessage, 'success');
      return true;
    } catch {
      try {
        if (!copyTextFallback(value)) {
          throw new Error('Clipboard fallback failed.');
        }
        addToast(successMessage, 'success');
        return true;
      } catch {
        addToast(t('director.toast.clipboardBlocked'), 'error');
        return false;
      }
    }
  };

  const acceptAttendance = (item: PendingAttendance) => {
    const justification = (approvalDrafts[item.id] ?? item.justification_text ?? '').trim();
    if (!justification) {
      addToast(t('director.toast.justificationRequired'), 'warning');
      return;
    }
    acceptAttendanceMutation.mutate({ item, justification });
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

  const copyCsvTemplate = () => {
    copyText('full_name\nAmina Benali\nYacine Haddad\nNour Bensaid', t('director.toast.csvCopied'));
  };

  const renderToasts = () => (
    toasts.length > 0 && (
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
    )
  );

  const renderPageTabs = () => (
    <nav className="management-tabs" aria-label={t('director.sectionsAria')}>
      {directorTabs.map((tab) => {
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
  );

  const renderPendingAttendance = () => (
    <section className="glass-card animate-fade-in delay-2 pending-attendance-panel">
      <div className="dashboard-toolbar dashboard-toolbar--spacious">
        <div>
          <h3 className="dashboard-section-title dashboard-section-title--plain">{t('director.pending.title')}</h3>
          <p className="dashboard-section-copy">
            {t('director.pending.copy')}
          </p>
        </div>
        <span className={`status-badge ${pendingAttendances.length > 0 ? 'status-badge--danger' : 'status-badge--active'}`}>
          {t('director.pending.count', { count: pendingAttendances.length })}
        </span>
      </div>

      {pendingAttendanceQuery.isLoading && (
        <div className="pending-attendance-empty">
          <Loader2 size={18} className="spin-icon" />
          {t('director.pending.loading')}
        </div>
      )}

      {!pendingAttendanceQuery.isLoading && pendingAttendanceQuery.error && (
        <div className="pending-attendance-empty pending-attendance-empty--error">
          {t('director.pending.error')}
        </div>
      )}

      {!pendingAttendanceQuery.isLoading && !pendingAttendanceQuery.error && pendingAttendances.length === 0 && (
        <div className="pending-attendance-empty">
          <CheckCircle2 size={18} />
          {t('director.pending.empty')}
        </div>
      )}

      {!pendingAttendanceQuery.isLoading && !pendingAttendanceQuery.error && pendingAttendances.length > 0 && (
        <div className="pending-attendance-list">
          {pendingAttendances.map((item) => {
            const draft = approvalDrafts[item.id] ?? item.justification_text ?? '';
            const canApprove = draft.trim().length > 0;
            const isSaving = acceptAttendanceMutation.isPending;
            return (
              <article className="pending-attendance-row" key={item.id}>
                <div className="pending-attendance-main">
                  <div className="pending-attendance-title">
                    <strong>{item.student_name}</strong>
                    <span className={`status-badge ${item.status === 'absent' ? 'status-badge--danger' : 'status-badge--warning'}`}>
                      {attendanceStatusLabel(item.status, locale)}
                    </span>
                  </div>
                  <div className="pending-attendance-meta">
                    <span>{item.class_name}</span>
                    <span>{formatAttendanceDate(item.date, locale)}</span>
                  </div>
                  {item.note && <p className="pending-attendance-note">{item.note}</p>}
                </div>

                <label className="pending-attendance-approval">
                  <span>
                    {item.justification_text ? t('director.pending.justificationReceived') : t('director.pending.adminJustification')}
                  </span>
                  <textarea
                    value={draft}
                    onChange={(event) =>
                      setApprovalDrafts((current) => ({ ...current, [item.id]: event.target.value }))
                    }
                    placeholder={t('director.pending.placeholder')}
                    rows={2}
                  />
                </label>

                <button
                  type="button"
                  className="btn btn-primary btn-compact pending-attendance-action"
                  disabled={!canApprove || isSaving}
                  onClick={() => acceptAttendance(item)}
                >
                  {isSaving ? <Loader2 size={15} className="spin-icon" /> : <CheckCircle2 size={15} />}
                  {t('director.pending.validate')}
                </button>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );

  const renderOverview = () => {
    if (analyticsQuery.isLoading) {
      return (
        <div className="loading-spinner screen-min-height">
          <div className="spinner" />
          <p>{t('director.loading')}</p>
        </div>
      );
    }

    if (analyticsQuery.error) {
      return (
        <div className="error-state screen-min-height">
          <TrendingDown size={48} className="dashboard-icon-spaced" />
          <h3>{t('director.loadError')}</h3>
        </div>
      );
    }

    const data = analyticsQuery.data;

    return (
      <>
        <div className="grid-2 director-grid-section">
          <div className="glass-card animate-fade-in delay-1 director-kpi-card">
            <div className="director-icon-box director-icon-box--primary">
              <TrendingUp size={36} />
            </div>
            <div>
              <p className="director-kpi-label">{t('director.schoolAverage')}</p>
              <h2 className="director-kpi-value">
                {data?.school_avg?.toFixed(2) || '0.00'}
                <span className="director-kpi-suffix">/20</span>
              </h2>
            </div>
          </div>

          <div className="glass-card animate-fade-in delay-1 director-kpi-card">
            <div className="director-icon-box director-icon-box--danger">
              <Users size={36} />
            </div>
            <div>
              <p className="director-kpi-label">{t('director.absenceRate')}</p>
              <h2 className="director-kpi-value">{data?.absence_rate?.toFixed(1) || '0.0'}%</h2>
            </div>
          </div>
        </div>

        {renderPendingAttendance()}

        <div className="glass-card animate-fade-in delay-2 analytics-card">
          <div className="dashboard-toolbar dashboard-toolbar--spacious">
            <div>
              <h3 className="dashboard-section-title dashboard-section-title--plain">{t('director.performanceTitle')}</h3>
              <p className="dashboard-section-copy">{t('director.performanceCopy')}</p>
            </div>
            <div className="realtime-pill">
              <Sparkles size={12} color="var(--primary)" /> {t('director.realtime')}
            </div>
          </div>

          <div className="chart-panel chart-panel--large" role="img" aria-label={t('director.chartAria')}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.class_performance}>
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={1} />
                    <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0.2} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="class_name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                <YAxis domain={[0, 20]} stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} dx={-10} />
                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.02)' }} content={<CustomTooltip />} />
                <Bar dataKey="average_score" fill="url(#barGradient)" radius={[8, 8, 0, 0]} barSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid-2">
          <div className="glass-card animate-fade-in delay-3 dashboard-card-pad">
            <div className="student-list-header">
              <div className="director-icon-box--success-sm">
                <Award size={20} />
              </div>
              <h3 className="dashboard-section-title dashboard-section-title--plain">{t('director.topStudents')}</h3>
            </div>
            <div className="dashboard-list">
              {data?.top_students?.map((student, idx) => (
                <div key={student.student_id} className="student-list-item hover-success">
                  <div className="student-row-main">
                    <div className="student-rank student-rank--success">{idx + 1}</div>
                    <div>
                      <div className="student-name">{student.student_name}</div>
                      <div className="student-class">{student.class_name}</div>
                    </div>
                  </div>
                  <div className="student-score student-score--success">{student.average_score.toFixed(2)}</div>
                </div>
              ))}
              {(!data?.top_students || data.top_students.length === 0) && (
                <p className="empty-list-copy">{t('director.emptyGrades')}</p>
              )}
            </div>
          </div>

          <div className="glass-card animate-fade-in delay-3 dashboard-card-pad">
            <div className="student-list-header">
              <div className="director-icon-box--danger-sm">
                <TrendingDown size={20} />
              </div>
              <h3 className="dashboard-section-title dashboard-section-title--plain">{t('director.strugglingStudents')}</h3>
            </div>
            <div className="dashboard-list">
              {data?.struggling_students?.map((student, idx) => (
                <div key={student.student_id} className="student-list-item hover-danger">
                  <div className="student-row-main">
                    <div className="student-rank student-rank--danger">{idx + 1}</div>
                    <div>
                      <div className="student-name">{student.student_name}</div>
                      <div className="student-class">{student.class_name}</div>
                    </div>
                  </div>
                  <div className="student-score student-score--danger">{student.average_score.toFixed(2)}</div>
                </div>
              ))}
              {(!data?.struggling_students || data.struggling_students.length === 0) && (
                <p className="empty-list-copy">{t('director.emptyStruggling')}</p>
              )}
            </div>
          </div>
        </div>
      </>
    );
  };

  const renderStudents = () => (
    <div className="director-management-grid">
      <section className="glass-card management-card management-card--wide">
        <div className="dashboard-toolbar">
          <div>
            <h2 className="dashboard-section-title dashboard-section-title--plain">{t('director.students.title')}</h2>
            <p className="dashboard-section-copy">
              {t('director.students.copy')}
            </p>
          </div>
          <div className="management-actions">
            <input
              ref={fileInputRef}
              type="file"
              className="sr-only"
              accept=".csv,text/csv"
              onChange={handleStudentImport}
            />
            <button type="button" className="btn btn-secondary btn-compact" onClick={copyCsvTemplate}>
              <ClipboardCopy size={15} />
              {t('director.students.csvTemplate')}
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
              {studentsQuery.isLoading && (
                <tr>
                  <td colSpan={5}>{t('director.students.loading')}</td>
                </tr>
              )}
              {!studentsQuery.isLoading && filteredStudents.map((student) => (
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
              {!studentsQuery.isLoading && filteredStudents.length === 0 && (
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
        <p className="dashboard-section-copy dashboard-section-copy--spaced">
          {t('director.parentLink.copy')}
        </p>

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
          className="btn btn-primary btn-full"
          disabled={!selectedStudent || Boolean(selectedStudent?.archived_at) || generateTokenMutation.isPending}
          onClick={() => selectedStudent && generateTokenMutation.mutate({ student: selectedStudent, label: linkLabel })}
        >
          {generateTokenMutation.isPending ? <Loader2 size={16} className="spin-icon" /> : <QrCode size={16} />}
          {t('director.parentLink.generateQr')}
        </button>

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
  );

  const renderClasses = () => (
    <div className="director-management-grid director-management-grid--balanced">
      <section className="glass-card management-card">
        <h2 className="dashboard-section-title dashboard-section-title--plain">{t('director.classes.createTitle')}</h2>
        <p className="dashboard-section-copy dashboard-section-copy--spaced">
          {t('director.classes.createCopy')}
        </p>
        <form className="stacked-form" onSubmit={handleClassSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="class-name">{t('director.classes.className')}</label>
            <input
              id="class-name"
              className="form-input"
              value={classForm.name}
              onChange={(event) => setClassForm((current) => ({ ...current, name: event.target.value }))}
              placeholder={t('director.classes.classNamePlaceholder')}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="class-subject">{t('director.classes.specialty')}</label>
            <input
              id="class-subject"
              className="form-input"
              value={classForm.subject}
              onChange={(event) => setClassForm((current) => ({ ...current, subject: event.target.value }))}
              placeholder={t('director.classes.specialtyPlaceholder')}
            />
          </div>
          <button type="submit" className="btn btn-primary btn-full" disabled={createClassMutation.isPending}>
            {createClassMutation.isPending ? <Loader2 size={16} className="spin-icon" /> : <Plus size={16} />}
            {t('director.classes.createButton')}
          </button>
        </form>
      </section>

      <section className="glass-card management-card">
        <h2 className="dashboard-section-title dashboard-section-title--plain">{t('director.classes.addCourseTitle')}</h2>
        <p className="dashboard-section-copy dashboard-section-copy--spaced">
          {t('director.classes.addCourseCopy')}
        </p>
        <form className="stacked-form" onSubmit={handleCourseSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="course-name">{t('director.classes.courseName')}</label>
            <input
              id="course-name"
              className="form-input"
              value={courseName}
              onChange={(event) => setCourseName(event.target.value)}
              placeholder={t('director.classes.courseNamePlaceholder')}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary btn-full" disabled={createCourseMutation.isPending}>
            {createCourseMutation.isPending ? <Loader2 size={16} className="spin-icon" /> : <Plus size={16} />}
            {t('director.classes.add')}
          </button>
        </form>
      </section>

      <section className="glass-card management-card management-card--wide">
        <div className="dashboard-toolbar">
          <div>
            <h2 className="dashboard-section-title dashboard-section-title--plain">{t('director.classes.title')}</h2>
            <p className="dashboard-section-copy">{t('director.classes.copy')}</p>
          </div>
          <span className="status-badge status-badge--active">{t('director.classes.count', { count: classes.length })}</span>
        </div>
        <div className="premium-table-wrapper">
          <table className="premium-table">
            <thead>
              <tr>
                <th>{t('director.classes.title')}</th>
                <th>{t('director.classes.code')}</th>
                <th>{t('director.classes.teachers')}</th>
                <th>{t('director.classes.students')}</th>
                <th>{t('director.students.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {classesQuery.isLoading && (
                <tr><td colSpan={5}>{t('director.classes.loading')}</td></tr>
              )}
              {!classesQuery.isLoading && classes.map((schoolClass) => (
                <tr key={schoolClass.id}>
                  <td>
                    <strong>{schoolClass.name}</strong>
                    <div className="table-cell-muted">{schoolClass.subject || t('director.classes.noSpecialty')}</div>
                  </td>
                  <td><span className="token-inline">{schoolClass.join_code}</span></td>
                  <td>{schoolClass.teachers?.map((teacher) => teacher.full_name).join(', ') || '-'}</td>
                  <td>{schoolClass.members?.length ?? 0}</td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-secondary btn-compact"
                      onClick={() => {
                        setSelectedClassId(schoolClass.id);
                        setSelectedCourseClassId(schoolClass.id);
                      }}
                    >
                      {t('director.classes.manage')}
                    </button>
                  </td>
                </tr>
              ))}
              {!classesQuery.isLoading && classes.length === 0 && (
                <tr><td colSpan={5}>{t('director.classes.empty')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="glass-card management-card">
        <h2 className="dashboard-section-title dashboard-section-title--plain">{t('director.classes.assignTitle')}</h2>
        <p className="dashboard-section-copy dashboard-section-copy--spaced">
          {t('director.classes.assignCopy')}
        </p>
        <form className="stacked-form" onSubmit={handleAssignmentSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="assignment-class">{t('director.classes.title')}</label>
            <select
              id="assignment-class"
              className="form-input"
              value={resolvedSelectedCourseClassId}
              onChange={(event) => setSelectedCourseClassId(event.target.value)}
              required
            >
              <option value="">{t('director.classes.chooseClass')}</option>
              {classes.map((schoolClass) => (
                <option key={schoolClass.id} value={schoolClass.id}>{schoolClass.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="assignment-course">{t('director.classes.course')}</label>
            <select
              id="assignment-course"
              className="form-input"
              value={assignmentForm.course_id}
              onChange={(event) => {
                const course = courses.find((candidate) => candidate.id === event.target.value);
                setAssignmentForm((current) => ({
                  ...current,
                  course_id: event.target.value,
                  coefficient: String(course?.coefficient ?? current.coefficient),
                }));
              }}
              required
            >
              <option value="">{t('director.classes.chooseCourse')}</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>{course.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="assignment-coefficient">{t('director.classes.coefficient')}</label>
            <input
              id="assignment-coefficient"
              className="form-input"
              type="number"
              min="0.1"
              step="0.1"
              value={assignmentForm.coefficient}
              onChange={(event) => setAssignmentForm((current) => ({ ...current, coefficient: event.target.value }))}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="assignment-teacher">{t('director.classes.teacher')}</label>
            <select
              id="assignment-teacher"
              className="form-input"
              value={assignmentForm.teacher_id}
              onChange={(event) => setAssignmentForm((current) => ({ ...current, teacher_id: event.target.value }))}
              required
            >
              <option value="">{t('director.classes.chooseTeacher')}</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>{teacher.full_name}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn btn-primary btn-full" disabled={assignCourseMutation.isPending}>
            {assignCourseMutation.isPending ? <Loader2 size={16} className="spin-icon" /> : <GraduationCap size={16} />}
            {t('director.classes.assign')}
          </button>
        </form>
        <div className="assignment-list">
          <h3>{t('director.classes.currentAssignments')}</h3>
          {classCoursesQuery.data?.map((assignment) => (
            <div className="assignment-item" key={`${assignment.class_id}-${assignment.course_id}`}>
              <strong>{assignment.course_name || t('director.classes.course')}</strong>
              <span>
                {assignment.teacher_name || t('director.classes.noTeacher')} - {t('director.classes.coefficient')} {assignment.coefficient ?? 1}
              </span>
            </div>
          ))}
          {resolvedSelectedCourseClassId && !classCoursesQuery.isLoading && (!classCoursesQuery.data || classCoursesQuery.data.length === 0) && (
            <p className="dashboard-section-copy">{t('director.classes.noAssignment')}</p>
          )}
        </div>
      </section>

      <section className="glass-card management-card">
        <h2 className="dashboard-section-title dashboard-section-title--plain">{t('director.classes.classStudentsTitle')}</h2>
        <p className="dashboard-section-copy dashboard-section-copy--spaced">
          {t('director.classes.classStudentsCopy')}
        </p>
        <div className="form-group">
          <label className="form-label" htmlFor="enrollment-class">{t('director.classes.title')}</label>
          <select
            id="enrollment-class"
            className="form-input"
            value={resolvedSelectedClassId}
            onChange={(event) => setSelectedClassId(event.target.value)}
          >
            <option value="">{t('director.classes.chooseClass')}</option>
            {classes.map((schoolClass) => (
              <option key={schoolClass.id} value={schoolClass.id}>{schoolClass.name}</option>
            ))}
          </select>
        </div>
        <div className="checkbox-list">
          {activeStudents.map((student) => (
            <label key={student.id} className="checkbox-row">
              <input
                type="checkbox"
                checked={enrollmentIds.includes(student.id)}
                onChange={(event) => {
                  setEnrollmentDraft({
                    classId: resolvedSelectedClassId,
                    ids: event.target.checked
                      ? Array.from(new Set([...enrollmentIds, student.id]))
                      : enrollmentIds.filter((studentId) => studentId !== student.id),
                  });
                }}
              />
              <span>{student.full_name}</span>
              <small>{student.student_id || '-'}</small>
            </label>
          ))}
          {activeStudents.length === 0 && <p className="dashboard-section-copy">{t('director.classes.importStudentsFirst')}</p>}
        </div>
        <button
          type="button"
          className="btn btn-primary btn-full"
          disabled={!resolvedSelectedClassId || enrollStudentsMutation.isPending}
          onClick={() => enrollStudentsMutation.mutate()}
        >
          {enrollStudentsMutation.isPending ? <Loader2 size={16} className="spin-icon" /> : <Users size={16} />}
          {t('director.classes.saveList')}
        </button>
      </section>

      <section className="glass-card management-card management-card--wide">
        <div className="dashboard-toolbar">
          <div>
            <h2 className="dashboard-section-title dashboard-section-title--plain">{t('director.semesters.title')}</h2>
            <p className="dashboard-section-copy">{t('director.semesters.copy')}</p>
          </div>
          <CalendarDays size={22} color="var(--primary)" />
        </div>
        <div className="semester-grid">
          {semesters.map((semester) => (
            <div className="semester-card" key={semester.id}>
              <div>
                <strong>{semester.name}</strong>
                <span>{formatDate(semester.start_date, locale)} - {formatDate(semester.end_date, locale)}</span>
              </div>
              {semester.is_active ? (
                <span className="status-badge status-badge--active">{t('director.status.active')}</span>
              ) : (
                <button
                  type="button"
                  className="btn btn-secondary btn-compact"
                  onClick={() => activateSemesterMutation.mutate(semester)}
                  disabled={activateSemesterMutation.isPending}
                >
                  {t('director.semesters.activate')}
                </button>
              )}
            </div>
          ))}
          {!semestersQuery.isLoading && semesters.length === 0 && (
            <p className="dashboard-section-copy">{t('director.semesters.empty')}</p>
          )}
        </div>
      </section>
    </div>
  );

  const renderTeam = () => (
    <div className="director-management-grid">
      <section className="glass-card management-card">
        <h2 className="dashboard-section-title dashboard-section-title--plain">{t('director.team.inviteTitle')}</h2>
        <p className="dashboard-section-copy dashboard-section-copy--spaced">
          {t('director.team.inviteCopy')}
        </p>
        <form className="stacked-form" onSubmit={handleTeacherSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="teacher-name">{t('director.team.fullName')}</label>
            <input
              id="teacher-name"
              className="form-input"
              value={teacherForm.full_name}
              onChange={(event) => setTeacherForm((current) => ({ ...current, full_name: event.target.value }))}
              placeholder={t('director.team.fullNamePlaceholder')}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="teacher-email">{t('director.team.email')}</label>
            <input
              id="teacher-email"
              className="form-input"
              type="email"
              value={teacherForm.email}
              onChange={(event) => setTeacherForm((current) => ({ ...current, email: event.target.value }))}
              placeholder="samir@ecole.dz"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary btn-full" disabled={createTeacherMutation.isPending}>
            {createTeacherMutation.isPending ? <Loader2 size={16} className="spin-icon" /> : <UserPlus size={16} />}
            {t('director.team.createInvite')}
          </button>
        </form>

        {teacherInvite?.invite_code && (
          <div className="notice-box">
            <strong>{t('director.team.inviteCode')}</strong>
            <button type="button" className="token-code" onClick={() => copyText(teacherInvite.invite_code || '', t('director.toast.inviteCopied'))}>
              {teacherInvite.invite_code}
            </button>
            <span>{t('director.team.shareInvite', { name: teacherInvite.full_name })}</span>
          </div>
        )}
      </section>

      <section className="glass-card management-card management-card--wide">
        <div className="dashboard-toolbar">
          <div>
            <h2 className="dashboard-section-title dashboard-section-title--plain">{t('director.team.title')}</h2>
            <p className="dashboard-section-copy">{t('director.team.copy')}</p>
          </div>
          <span className="status-badge status-badge--active">{t('director.team.count', { count: teachers.length })}</span>
        </div>
        <div className="premium-table-wrapper">
          <table className="premium-table">
            <thead>
              <tr>
                <th>{t('director.team.fullName')}</th>
                <th>{t('director.team.email')}</th>
                <th>{t('director.students.identifier')}</th>
              </tr>
            </thead>
            <tbody>
              {teachersQuery.isLoading && (
                <tr><td colSpan={3}>{t('director.team.loading')}</td></tr>
              )}
              {!teachersQuery.isLoading && teachers.map((teacher) => (
                <tr key={teacher.id}>
                  <td>{teacher.full_name}</td>
                  <td>{teacher.email}</td>
                  <td><span className="token-inline">{teacher.id.slice(0, 8)}</span></td>
                </tr>
              ))}
              {!teachersQuery.isLoading && teachers.length === 0 && (
                <tr><td colSpan={3}>{t('director.team.empty')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );

  return (
    <div className="container animate-fade-in">
      {renderToasts()}

      <header className="dashboard-header">
        <div className="badge dashboard-eyebrow">
          <Activity size={14} /> {t('director.headerEyebrow')}
        </div>
        <h1>{t('director.title')}</h1>
        <p>
          {t('director.headerCopy')}
        </p>
      </header>

      {renderPageTabs()}

      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'students' && renderStudents()}
      {activeTab === 'classes' && renderClasses()}
      {activeTab === 'team' && renderTeam()}

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
    </div>
  );
}
