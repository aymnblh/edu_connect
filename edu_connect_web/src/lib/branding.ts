import { useQuery } from '@tanstack/react-query';
import { api } from './api';

export interface SchoolBranding {
  name: string;
  logo: string | null;
}

/** The school's name and logo (a data: URL), for printed documents. */
export function useSchoolBranding() {
  return useQuery<SchoolBranding>({
    queryKey: ['school-branding'],
    queryFn: async () => (await api.get('/schools/branding')).data,
    staleTime: 10 * 60 * 1000,
  });
}
