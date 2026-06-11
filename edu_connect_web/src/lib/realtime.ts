import { api } from './api';
import { readWorkspaceSessionItem } from './workspace';

export function buildClassWebSocketUrl(classId: string): string {
  const base = api.defaults.baseURL || window.location.origin;
  const url = new URL(base, window.location.origin);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname = `/classes/${classId}/ws`;
  url.searchParams.set('token', readWorkspaceSessionItem('access_token') || '');
  return url.toString();
}
