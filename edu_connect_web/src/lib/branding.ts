import { useQuery } from '@tanstack/react-query';
import { api } from './api';

export interface SchoolModules {
  canteen?: boolean;
  transport?: boolean;
}

export interface SchoolBranding {
  name: string;
  logo: string | null;
  modules?: SchoolModules;
}

const SAFE_LOGO_DATA_URL_RE = /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;

export function safeBrandingLogoUrl(logo: string | null | undefined): string | null {
  if (!logo) {
    return null;
  }
  const trimmed = logo.trim();
  return SAFE_LOGO_DATA_URL_RE.test(trimmed) ? trimmed : null;
}

/** The school's name and logo (a data: URL), for printed documents. */
export function useSchoolBranding(enabled = true) {
  return useQuery<SchoolBranding>({
    queryKey: ['school-branding'],
    queryFn: async () => {
      const data = (await api.get('/schools/branding')).data as SchoolBranding;
      return {
        ...data,
        logo: safeBrandingLogoUrl(data.logo),
      };
    },
    staleTime: 10 * 60 * 1000,
    enabled,
  });
}
