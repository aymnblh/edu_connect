import { decodeJwtPayload, readWorkspaceSessionItem } from './workspace';

/** Fired when the API refuses a write because the session is the public demo. */
export const DEMO_READ_ONLY_EVENT = 'wasel_demo_read_only';

export type DemoRole = 'principal' | 'teacher' | 'parent';

export function isDemoSession(): boolean {
  return decodeJwtPayload(readWorkspaceSessionItem('access_token'))?.demo === true;
}
