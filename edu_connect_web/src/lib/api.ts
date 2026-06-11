import axios, { type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios';
import {
  clearWorkspaceStorage,
  getCurrentSessionPersistence,
  notifyWorkspaceSessionChanged,
  readWorkspaceSessionItem,
  setRememberDevicePreference,
  storeWorkspaceSessionItem,
} from './workspace';

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

export function storeSessionTokens(
  accessToken: string,
  refreshToken: string,
  rememberDevice = getCurrentSessionPersistence(),
): void {
  setRememberDevicePreference(rememberDevice);
  storeWorkspaceSessionItem('access_token', accessToken, rememberDevice);
  storeWorkspaceSessionItem('refresh_token', refreshToken, rememberDevice);
  notifyWorkspaceSessionChanged();
}

function isAuthRefreshPath(url: string | undefined): boolean {
  return Boolean(url?.includes('/auth/login') || url?.includes('/auth/refresh'));
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = readWorkspaceSessionItem('refresh_token');
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
        storeSessionTokens(accessToken, nextRefreshToken, getCurrentSessionPersistence());
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
  const refreshToken = readWorkspaceSessionItem('refresh_token');
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
  const token = readWorkspaceSessionItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const activeRole = readWorkspaceSessionItem('active_workspace_role');
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
