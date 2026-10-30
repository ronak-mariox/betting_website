import { apiRequest } from '../api';
import type { ApiRole, ApiUser } from '../api';

export type AccountsPage = { items: ApiUser[]; total: number; page: number; limit: number };

export const accountsApi = {
  list: (params: { role?: ApiRole; limit?: number; page?: number }, accessToken: string) => {
    const search = new URLSearchParams();
    if (params.role) search.set('role', params.role);
    search.set('limit', String(params.limit ?? 100));
    if (params.page) search.set('page', String(params.page));
    return apiRequest<AccountsPage>(`/accounts?${search.toString()}`, { accessToken });
  },
};
