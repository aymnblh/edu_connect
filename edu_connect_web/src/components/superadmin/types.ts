export type SuperAdminTab = 'schools' | 'users' | 'broadcasts' | 'audit';

export interface School {
  id: string;
  name: string;
  student_id_prefix?: string;
  referral_code?: string | null;
  is_active: boolean;
  subscription_expires_at: string | null;
  created_at?: string | null;
  plan?: string;
  max_parents_per_student?: number;
  modules?: { canteen: boolean; transport: boolean };
  user_count: number;
  teacher_count: number;
  parent_count: number;
  principal_count: number;
  secretary_count: number;
  nurse_count?: number;
  canteen_count?: number;
  driver_count?: number;
  student_count: number;
  class_count: number;
  course_count: number;
  active_session_count: number;
  pending_parent_link_count: number;
  used_parent_link_count: number;
  grade_count: number;
  approved_grade_count: number;
  pending_grade_count: number;
  attendance_count: number;
  absence_count: number;
  homework_count: number;
  class_message_count: number;
  direct_message_count: number;
  audit_event_count_24h: number;
  failed_auth_count_24h: number;
  server_error_count_24h: number;
  payment_count: number;
  total_revenue: number;
  last_payment_amount?: number | null;
  last_payment_at?: string | null;
  last_login_at?: string | null;
  last_audit_at?: string | null;
  last_message_at?: string | null;
  last_grade_at?: string | null;
  last_attendance_at?: string | null;
  days_until_expiry?: number | null;
  health_status: 'healthy' | 'watch' | 'risk' | 'suspended' | 'subscription_expired' | string;
  health_score: number;
  role_counts?: Record<string, number>;
}

export interface AppReadiness {
  status: 'ready' | 'degraded' | string;
  checks?: Record<string, string>;
  db_pool?: Record<string, number | null>;
}

export interface SubscriptionPayment {
  id: string;
  school_id: string;
  amount: number;
  months_added: number;
  payment_method: string;
  notes?: string | null;
  created_at: string;
}

export interface SystemUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  school_id: string | null;
  school_name: string | null;
  phone: string | null;
  is_active: boolean;
  deactivated_at: string | null;
  has_password: boolean;
  active_session_count: number;
  created_at: string | null;
}

export interface PlatformBroadcast {
  id: string;
  title: string;
  body: string;
  category: string;
  audience: string;
  target_schools: string;
  school_count: number;
  recipient_count: number;
  announcements_created: number;
  school_names: string[];
  author_name: string | null;
  created_at: string;
}

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'warning';
  exiting?: boolean;
}

export type AddToastFn = (message: string, type: Toast['type']) => void;
