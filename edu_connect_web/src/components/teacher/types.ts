export interface Student {
  id: string;
  full_name: string;
  student_id?: string | null;
}

export interface SchoolClass {
  id: string;
  name: string;
  subject?: string | null;
  members?: Student[];
}

export interface ClassCourse {
  class_id: string;
  course_id: string;
  teacher_id: string;
  coefficient: number;
  course_name?: string | null;
  teacher_name?: string | null;
}

export interface Grade {
  id: string;
  class_id: string;
  student_id: string;
  student_name: string;
  course_id?: string | null;
  subject: string;
  score: number;
  max_score: number;
  coefficient?: number;
  normalized_score?: number;
  is_approved: boolean;
  approved_at?: string | null;
  date: string;
  comment?: string | null;
}

export type HomeworkKind = 'homework' | 'assignment' | 'exam';

export interface Homework {
  id: string;
  class_id: string;
  kind?: HomeworkKind | string;
  subject: string;
  lesson_content?: string | null;
  homework_content: string;
  due_date: string;
  created_by?: string | null;
  created_at: string;
}

export interface ScheduleSlot {
  id: string;
  class_id: string;
  course_name: string;
  teacher_name?: string | null;
  day_of_week: number;
  day_name: string;
  start_time: string;
  end_time: string;
  room?: string | null;
}

export interface ScheduleExam {
  id: string;
  class_id: string;
  course_id?: string | null;
  course_name: string;
  exam_date: string;
  start_time: string;
  end_time: string;
  room?: string | null;
  description?: string | null;
  created_at: string;
}

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'warning';
  exiting?: boolean;
}

export type TeacherTab =
  | 'classes'
  | 'grades'
  | 'homework'
  | 'schedule'
  | 'meetings'
  | 'announcements'
  | 'chat';

export type AddTeacherToastFn = (message: string, type: Toast['type']) => void;

export function gradeOnTwenty(grade: Grade): number {
  if (typeof grade.normalized_score === 'number') return grade.normalized_score;
  if (!grade.max_score) return grade.score;
  return (grade.score / grade.max_score) * 20;
}

export function defaultDueDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date.toISOString().slice(0, 10);
}

export function dueDateToIso(value: string): string {
  return `${value}T12:00:00.000Z`;
}

export function normalizeHomeworkKind(value: string | undefined | null): HomeworkKind {
  return value === 'assignment' || value === 'exam' ? value : 'homework';
}
