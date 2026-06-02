import axios, { type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios';
import { clearWorkspaceStorage, notifyWorkspaceSessionChanged } from './workspace';

const apiBaseURL = import.meta.env.VITE_API_BASE_URL?.trim();
const fallbackApiBaseURL = import.meta.env.DEV ? 'http://localhost:8000' : undefined;

if (import.meta.env.PROD && !apiBaseURL) {
  throw new Error('VITE_API_BASE_URL is required for production builds.');
}

export const api = axios.create({
  baseURL: apiBaseURL || fallbackApiBaseURL,
});

type SessionRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
  _skipAuthRefresh?: boolean;
};

let refreshPromise: Promise<string | null> | null = null;

export function storeSessionTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem('access_token', accessToken);
  localStorage.setItem('refresh_token', refreshToken);
  notifyWorkspaceSessionChanged();
}

function isAuthRefreshPath(url: string | undefined): boolean {
  return Boolean(url?.includes('/auth/login') || url?.includes('/auth/refresh'));
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) {
    clearWorkspaceStorage();
    return null;
  }

  if (!refreshPromise) {
    refreshPromise = api
      .post(
        '/auth/refresh',
        { refresh_token: refreshToken },
        { _skipAuthRefresh: true } as AxiosRequestConfig,
      )
      .then((response) => {
        const accessToken = response.data?.access_token;
        const nextRefreshToken = response.data?.refresh_token;
        if (typeof accessToken !== 'string' || typeof nextRefreshToken !== 'string') {
          clearWorkspaceStorage();
          return null;
        }
        storeSessionTokens(accessToken, nextRefreshToken);
        return accessToken;
      })
      .catch(() => {
        clearWorkspaceStorage();
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

export async function logoutSession(): Promise<void> {
  const refreshToken = localStorage.getItem('refresh_token');
  if (refreshToken) {
    try {
      await api.post(
        '/auth/logout',
        { refresh_token: refreshToken },
        { _skipAuthRefresh: true } as AxiosRequestConfig,
      );
    } catch {
      // Local logout must still complete if the network is unavailable.
    }
  }
  clearWorkspaceStorage();
}

// Interceptor to attach tokens if needed
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const activeRole = localStorage.getItem('active_workspace_role');
  if (activeRole) {
    config.headers['X-Workspace-Role'] = activeRole;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) {
      return Promise.reject(error);
    }

    const originalRequest = error.config as SessionRequestConfig | undefined;
    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      originalRequest._skipAuthRefresh ||
      isAuthRefreshPath(originalRequest.url)
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;
    const accessToken = await refreshAccessToken();
    if (!accessToken) {
      return Promise.reject(error);
    }

    originalRequest.headers.Authorization = `Bearer ${accessToken}`;
    return api(originalRequest);
  },
);
