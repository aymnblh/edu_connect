export interface AnalyticsStudent {
  student_id: string;
  student_name: string;
  class_name: string;
  average_score: number;
}

export interface ClassPerformance {
  class_name: string;
  average_score: number;
}

export interface DirectorAnalytics {
  school_avg?: number;
  absence_rate?: number;
  adoption_rate?: number;
  class_performance?: ClassPerformance[];
  subject_performance?: Array<{ subject: string; average_score: number }>;
  top_students?: AnalyticsStudent[];
  struggling_students?: AnalyticsStudent[];
}

export interface PendingAttendance {
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

export interface Student {
  id: string;
  school_id: string;
  student_id?: string | null;
  linking_pin?: string | null;
  full_name: string;
  created_at: string;
  archived_at?: string | null;
  archive_reason?: string | null;
}

export interface Teacher {
  id: string;
  full_name: string;
  email: string;
}

export interface SchoolClass {
  id: string;
  school_id: string;
  name: string;
  subject?: string | null;
  join_code: string;
  created_at: string;
  teachers: Teacher[];
  members: Student[];
}

export interface Course {
  id: string;
  name: string;
  school_id: string;
  coefficient?: number;
  created_at: string;
}

export interface Semester {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  school_id: string;
}

export interface ParentLinkAudit {
  id: string;
  label?: string | null;
  device_platform?: string | null;
  device_fingerprint?: string | null;
  ip_address?: string | null;
  used_at?: string | null;
  revoked_at?: string | null;
  parent_name?: string | null;
}

export interface ParentLinkToken {
  label: string;
  token: string;
  expires_at: string;
}

export interface GenerateTokensResponse {
  status: string;
  tokens: ParentLinkToken[];
}

export interface CreateTeacherResponse extends Teacher {
  role: string;
  invite_code?: string | null;
}

export type StaffInviteRole = 'teacher' | 'secretary' | 'nurse' | 'canteen' | 'driver';

export interface StaffMember extends Teacher {
  role: string;
  invite_code?: string | null;
  deactivated_at?: string | null;
}

export interface LinkedParent {
  id: string;
  full_name: string;
  email: string;
}

export interface ClassCourseAssignment {
  class_id: string;
  course_id: string;
  teacher_id: string;
  coefficient: number;
  course_name?: string | null;
  teacher_name?: string | null;
}

export type ToastType = 'success' | 'error' | 'warning';

export type DirectorTab =
  | 'overview'
  | 'monthly'
  | 'fees'
  | 'canteen'
  | 'transport'
  | 'students'
  | 'classes'
  | 'team'
  | 'reports'
  | 'announcements'
  | 'journal'
  | 'messages';

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
  exiting?: boolean;
}

export type AddToastFn = (message: string, type?: ToastType) => void;
export type CopyTextFn = (value: string, successMessage: string) => Promise<boolean>;
export type SignOutUserFn = (userId: string, name: string) => void;
