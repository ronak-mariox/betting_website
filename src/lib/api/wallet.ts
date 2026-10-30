import { apiRequest } from '../api';

export type WalletUserRef = { _id: string; name?: string; username: string; email?: string; role?: string };

export type WalletStats = {
  pendingDeposits: number;
  pendingWithdrawals: number;
  totalWalletBalance: number;
  todayVolume: number;
  todayTransactionCount: number;
};

export type WalletRequestKind = 'deposit' | 'withdrawal';
export type WalletRequestStatus = 'Pending' | 'Approved' | 'Rejected';

export type ApiWalletRequest = {
  _id: string;
  user: WalletUserRef | string | null;
  kind: WalletRequestKind;
  amount: number;
  method: string;
  reference: string;
  status: WalletRequestStatus;
  reviewedBy: WalletUserRef | string | null;
  reviewedAt: string | null;
  /** Set on rejected requests; shown to the player in the app. */
  rejectionReason?: string;
  /** Deposits: the payment screenshot's details (the image itself is fetched with `walletApi.proof`). */
  proof?: { name: string; mime: string; size: number } | null;
  createdAt: string;
};

export type WalletRequestProof = { name: string; mime: string; size: number; data: string };

export type ApiPayment = {
  _id: string;
  recipientType: 'User' | 'Partner';
  /** Not populated server-side — resolve against a user/partner list. */
  recipient: string;
  paymentType: string;
  method: string;
  amount: number;
  note: string;
  status: 'Pending' | 'Completed' | 'Failed';
  createdAt: string;
};

export type Paginated<T> = { items: T[]; total: number; page: number; limit: number };

export type ManualEntryAction = 'Credit' | 'Debit' | 'Adjustment' | 'Transfer';

export type ManualEntryPayload = {
  userId: string;
  action: ManualEntryAction;
  amount: number;
  toUserId?: string;
  /** Required: the reason is kept on the ledger entry. */
  note: string;
  /** Adjustment only: which way it moves the balance (default credit). */
  direction?: 'credit' | 'debit';
};

export type NewPaymentPayload = {
  recipientType: 'User' | 'Partner';
  recipientId: string;
  paymentType: string;
  method: string;
  amount: number;
  note?: string;
};

const qs = (params: Record<string, string | number | undefined>) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value));
  }
  const out = search.toString();
  return out ? `?${out}` : '';
};

export const walletApi = {
  stats: (accessToken: string) => apiRequest<{ stats: WalletStats }>('/wallet/stats', { accessToken }),

  requests: (
    params: { kind?: WalletRequestKind; status?: WalletRequestStatus; page?: number; limit?: number },
    accessToken: string,
  ) => apiRequest<Paginated<ApiWalletRequest>>(`/wallet/requests${qs(params)}`, { accessToken }),

  approve: (id: string, accessToken: string) =>
    apiRequest<{ request: ApiWalletRequest }>(`/wallet/requests/${id}/approve`, { method: 'POST', accessToken }),

  /** Moves money from the caller's own wallet to an account in its network ("Fund Transfer" grant). */
  transfer: (payload: { toUserId: string; amount: number; note?: string; idempotencyKey?: string }, accessToken: string) =>
    apiRequest<{ reference: string; amount: number; balance: number; duplicate?: boolean }>('/wallet/transfer', {
      method: 'POST',
      body: payload,
      accessToken,
    }),

  /** Transfer history (failed and cancelled attempts included): own sent / received, or `all` in the network. */
  transfers: (params: { all?: boolean; status?: FundTransferStatus; page?: number; limit?: number }, accessToken: string) =>
    apiRequest<Paginated<ApiFundTransfer>>(
      `/wallet/transfers${qs({ ...params, all: params.all ? '1' : undefined })}`,
      { accessToken },
    ),

  /** The payment screenshot the player attached to a deposit. */
  proof: (id: string, accessToken: string) =>
    apiRequest<{ proof: WalletRequestProof }>(`/wallet/requests/${id}/proof`, { accessToken }),

  reject: (id: string, accessToken: string, reason = '') =>
    apiRequest<{ request: ApiWalletRequest }>(`/wallet/requests/${id}/reject`, {
      method: 'POST',
      body: { reason },
      accessToken,
    }),

  manualEntry: (payload: ManualEntryPayload, accessToken: string) =>
    apiRequest<unknown>('/wallet/manual-entry', { method: 'POST', body: payload, accessToken }),

  payments: (params: { page?: number; limit?: number }, accessToken: string) =>
    apiRequest<Paginated<ApiPayment>>(`/wallet/payments${qs(params)}`, { accessToken }),

  createPayment: (payload: NewPaymentPayload, accessToken: string) =>
    apiRequest<{ payment: ApiPayment }>('/wallet/payments', { method: 'POST', body: payload, accessToken }),
};

export type FundTransferStatus = 'Pending' | 'Completed' | 'Failed' | 'Cancelled';

type TransferParty = { _id: string; name?: string; username: string; role: string } | null;

/** One wallet-to-wallet transfer attempt (GET /wallet/transfers). */
export type ApiFundTransfer = {
  _id: string;
  /** Transaction ID shown everywhere, e.g. "TRF4F2A91C0". */
  reference: string;
  amount: number;
  status: FundTransferStatus;
  failureReason: string;
  note: string;
  from: TransferParty;
  to: TransferParty;
  /** Sender's balance after the debit (Completed only). */
  balanceAfter: number | null;
  createdAt: string;
  completedAt: string | null;
};
