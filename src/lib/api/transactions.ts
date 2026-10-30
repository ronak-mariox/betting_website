import { apiRequest } from '../api';

export type TransactionType = 'Deposit' | 'Withdrawal' | 'Bet Win' | 'Bet Loss' | 'Adjustment' | 'Commission' | 'Payment' | 'Referral Bonus';
export type TransactionStatus = 'Pending' | 'Completed' | 'Failed' | 'Cancelled';
export type TransactionTab = 'deposits' | 'withdrawals' | 'bets' | 'commission' | 'payments' | 'transfers' | 'adjustments';

export type ApiTransaction = {
  _id: string;
  user: { _id: string; name?: string; username: string } | string | null;
  type: TransactionType;
  /** Signed rupees — negative for money leaving the user/platform. */
  amount: number;
  method: string;
  reference: string;
  status: TransactionStatus;
  note: string;
  /** The other side: who received a debit / sent a credit; on commission, the player it was earned on. */
  counterparty?: { _id: string; name?: string; username: string } | null;
  /** Owner's wallet balance right after this entry (newer entries only). */
  balanceAfter?: number | null;
  /** Commission entries: Session or Match, and the match. */
  kind?: 'Session' | 'Match' | null;
  relatedEvent?: { _id: string; name: string } | null;
  /** Adjustments: the reason recorded with the correction. */
  reason?: string;
  createdAt: string;
};

export type TransactionsPage = { items: ApiTransaction[]; total: number; page: number; limit: number };

export const transactionsApi = {
  list: (params: { tab?: TransactionTab; q?: string; page?: number; limit?: number }, accessToken: string) => {
    const search = new URLSearchParams();
    if (params.tab) search.set('tab', params.tab);
    if (params.q) search.set('q', params.q);
    if (params.page) search.set('page', String(params.page));
    if (params.limit) search.set('limit', String(params.limit));
    const query = search.toString();
    return apiRequest<TransactionsPage>(`/transactions${query ? `?${query}` : ''}`, { accessToken });
  },
};
