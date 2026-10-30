import { apiRequest } from '../api';

export type ApiPartnerStatus = 'Active' | 'Inactive' | 'Pending';

export type ApiRevenueEntry = { month: string; value: number };

export type ApiPartner = {
  _id: string;
  name: string;
  /** Free string — the backend doesn't enforce an enum. */
  type: string;
  /** Percent, e.g. 20 = 20%. */
  revShare: number;
  monthlyFee: number;
  /** Stake by this partner's players (voided bets excluded), all time — computed server-side. */
  betVolume: number;
  /** Players who signed up with `referralCode`. */
  playerCount: number;
  /** Sign-up code players enter to join through this partner. */
  referralCode: string;
  status: ApiPartnerStatus;
  since: string;
  contact: string;
  email: string;
  website: string;
  /** Masked server-side (`maskKey`) — never the raw key. */
  apiKey: string;
  notes: string;
  revenueHistory: ApiRevenueEntry[];
  createdAt: string;
  updatedAt: string;
};

export type CreatePartnerPayload = {
  name: string;
  type?: string;
  revShare?: number;
  monthlyFee?: number;
  email?: string;
  contact?: string;
  website?: string;
  apiKey?: string;
  notes?: string;
  status?: ApiPartnerStatus;
};

export type UpdatePartnerPayload = Partial<CreatePartnerPayload>;

/** `partnership.service.js#getRevenue` — a trimmed partner list plus a per-month total across all partners. */
export type ApiRevenue = {
  partners: Array<{
    _id: string;
    name: string;
    revenueHistory: ApiRevenueEntry[];
    betVolume: number;
    revShare: number;
  }>;
  totalByMonth: Record<string, number>;
};

/** The partner ref on a settlement (`.populate('partner', 'name type')`). */
export type ApiSettlementPartnerRef = {
  _id: string;
  name: string;
  type: string;
};

export type ApiPartnerSettlement = {
  _id: string;
  partner: string | ApiSettlementPartnerRef;
  period: string;
  amount: number;
  status: 'Pending' | 'Paid';
  paidAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export const partnershipApi = {
  listPartners: (accessToken?: string | null) =>
    apiRequest<{ partners: ApiPartner[] }>('/partnership/partners', { accessToken }),

  createPartner: (payload: CreatePartnerPayload, accessToken?: string | null) =>
    apiRequest<{ partner: ApiPartner }>('/partnership/partners', { method: 'POST', body: payload, accessToken }),

  updatePartner: (id: string, payload: UpdatePartnerPayload, accessToken?: string | null) =>
    apiRequest<{ partner: ApiPartner }>(`/partnership/partners/${id}`, {
      method: 'PATCH',
      body: payload,
      accessToken,
    }),

  updateStatus: (id: string, status: ApiPartnerStatus, accessToken?: string | null) =>
    apiRequest<{ partner: ApiPartner }>(`/partnership/partners/${id}/status`, {
      method: 'PATCH',
      body: { status },
      accessToken,
    }),

  revenue: (accessToken?: string | null) => apiRequest<ApiRevenue>('/partnership/revenue', { accessToken }),

  settlements: (accessToken?: string | null) =>
    apiRequest<{ settlements: ApiPartnerSettlement[] }>('/partnership/settlements', { accessToken }),

  /** Marks a finished month's revenue share as paid out. */
  paySettlement: (id: string, accessToken?: string | null) =>
    apiRequest<{ settlement: ApiPartnerSettlement }>(`/partnership/settlements/${id}/pay`, { method: 'POST', accessToken }),
};
