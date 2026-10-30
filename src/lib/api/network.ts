import { apiRequest } from '../api';
import type { ApiUser } from '../api';

export type NetworkRole = 'franchise' | 'super-agent' | 'agent' | 'player';

export type AccountRef = {
  _id: string;
  name: string;
  username: string;
  businessName?: string;
  role: string;
  /** Commission rates this account receives — the most it can pass down (parent refs only). */
  matchCommission?: number;
  sessionCommission?: number;
};

export type AccountSummary = {
  franchises: number;
  superAgents: number;
  agents: number;
  players: number;
  bets: number;
  turnover: number;
  monthTurnover: number;
  prevMonthTurnover: number;
  exposure: number;
  openBets: number;
  won: number;
  lost: number;
  /** Percent of settled bets won, or null when nothing has settled yet. */
  winRate: number | null;
  commission: number;
  commissionPending: number;
  risk: 'low' | 'medium' | 'high';
  riskScore: number | null;
};

export type NetworkAccount = Omit<ApiUser, 'role'> & {
  role: NetworkRole | 'super-admin';
  walletBalance: number;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  businessName: string;
  /** Players and agents only. */
  referralCode?: string;
  /** Sum of the wallet balances of everyone below this account (computed by the backend). */
  creditLimit: number;
  bettingLimit: number;
  maxExposure: number;
  shareHolding: number | null;
  /** Percent this account receives from its upline for match / session commission. */
  matchCommission: number;
  sessionCommission: number;
  parent: AccountRef | null;
};

export type NetworkRow = NetworkAccount & { summary: AccountSummary };

export type Abilities = { create: boolean; edit: boolean; suspend: boolean };

export type NetworkListStats = {
  total: number;
  active: number;
  suspended: number;
  players: number;
  turnover: number;
  monthTurnover: number;
  exposure: number;
  commission: number;
  balance: number;
};

export type NetworkList = {
  items: NetworkRow[];
  total: number;
  page: number;
  limit: number;
  stats: NetworkListStats;
  abilities: Abilities;
  /** Accounts a new one of this role can be created under (empty when it goes straight under the caller). */
  parentOptions: AccountRef[];
};

type Ref = { _id: string; name?: string; username: string } | string | null;

export type DetailBet = {
  _id: string;
  event: { _id: string; name: string; sport?: string } | string | null;
  market: { _id: string; name: string } | string | null;
  /** Names saved with the bet (kept if the match is later removed). */
  eventName?: string;
  marketName?: string;
  user: Ref;
  selection: string;
  odds: number;
  amount: number;
  status: 'Pending' | 'Won' | 'Lost' | 'Void' | 'Cashed Out';
  /** What the player got back: a win's return or the cash-out amount. */
  payout?: number;
  createdAt: string;
};

export type DetailTransaction = {
  _id: string;
  user: Ref;
  type: string;
  amount: number;
  method: string;
  reference: string;
  status: 'Pending' | 'Completed' | 'Failed';
  note: string;
  createdAt: string;
};

export type DetailActivity = {
  _id: string;
  actor: Ref;
  actorUsername: string;
  action: string;
  status: 'success' | 'failed';
  ip: string;
  userAgent: string;
  /** Extra facts about a review: the amount of a wallet request, a rejection reason. */
  metadata?: { amount?: number; reason?: string; documentType?: string };
  createdAt: string;
};

export type DetailSession = { _id: string; ip: string; userAgent: string; createdAt: string; updatedAt: string };

export type NetworkDetail = {
  account: NetworkAccount;
  /** Nearest first, stopping below super-admin. */
  ancestors: AccountRef[];
  summary: AccountSummary;
  downline: Record<'superAgents' | 'agents' | 'players', { total: number; items: NetworkRow[] }>;
  wallet: { balance: number; deposited: number; withdrawn: number; commissionEarned: number; commissionPending: number };
  bets: DetailBet[];
  transactions: DetailTransaction[];
  activity: DetailActivity[];
  sessions: DetailSession[];
  abilities: Abilities;
};

export type AccountDraft = Partial<{
  name: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  dob: string;
  businessName: string;
  bettingLimit: number;
  maxExposure: number;
  shareHolding: number | null;
  matchCommission: number;
  sessionCommission: number;
}>;

export type CreateAccountPayload = AccountDraft & {
  role: NetworkRole;
  username: string;
  password: string;
  parentId?: string;
  /** Inactive ('suspended') accounts can't sign in until activated. */
  status?: 'active' | 'suspended';
};

/** How one agent in the caller's book is doing today. */
export type DashboardAgent = {
  _id: string;
  name: string;
  username: string;
  status: 'active' | 'suspended';
  walletBalance: number;
  users: number;
  todayBets: number;
  todayStake: number;
  /** Stake riding on its users' open bets. */
  exposure: number;
  /** Deposits / withdrawals waiting for a decision. */
  pendingRequests: number;
};

export type MyDashboard = {
  /** Parts held back by the Permissions page ('wallet' | 'bets' | 'commission'); their figures are null. */
  restricted?: ('wallet' | 'bets' | 'commission')[];
  /** One row per agent under the caller — empty on an agent's own dashboard. */
  agents: DashboardAgent[];
  /** One row per super agent (the sum of its agents) — only a franchise has any. */
  superAgents: (DashboardAgent & { agents: number })[];
  /** Code the agent shares so new app sign-ups land on its panel. */
  referralCode: string | null;
  /** Percent this account receives from its upline. */
  commissionRates: { match: number; session: number };
  stats: {
    totalUsers: number;
    activeToday: number;
    activeYesterday: number;
    walletBalance: number;
    todayBets: number;
    yesterdayBets: number;
    todayStake: number;
    todayCommission: number;
    yesterdayCommission: number;
    todayRevenue: number;
    yesterdayRevenue: number;
    pendingDeposits: { count: number; amount: number } | null;
    pendingWithdrawals: { count: number; amount: number } | null;
  };
  overview: {
    totalUsers: number;
    activeToday: number;
    suspended: number;
    newThisMonth: number;
    newLastMonth: number;
  };
  /** Last 7 days, oldest first; `date` is YYYY-MM-DD (IST). */
  commissionWeek: { date: string; stake: number; commission: number }[];
  activity: { kind: string; description: string; at: string }[];
  transactions: { id: string; user: string; type: string; method: string; amount: number; status: string; at: string }[];
};

/** The signed-in account's Profile page (GET /network/me/profile). */
export type MyProfile = {
  stats: { totalActions: number; loginCount: number; lastLoginAt: string | null; memberSince: string };
  activity: (DetailActivity & { target: Ref })[];
  logins: DetailActivity[];
  sessions: DetailSession[];
  currentUserAgent: string;
  /** Staff only — super-admin has no wallet. */
  wallet: (NetworkDetail['wallet'] & { transactions: DetailTransaction[] }) | null;
  /** Switches (true / false) plus `theme` ('dark' | 'light') and `language` ('en' | 'hi'). */
  preferences: Record<string, boolean | string>;
  /** The limits that apply to this account's book — own value, else the platform default. */
  limits: {
    matchCommission: number;
    sessionCommission: number;
    bettingLimit: { value: number | null; isDefault: boolean };
    minBet: number | null;
    maxExposure: number | null;
    maxUserExposure: number | null;
    creditLimit: number | null;
    walletRules: { minDeposit: number; maxDeposit: number; minWithdrawal: number; maxWithdrawal: number } | null;
  };
};

export const networkApi = {
  myProfile: (accessToken: string) => apiRequest<MyProfile>('/network/me/profile', { accessToken }),

  /** The signed-in account's own dashboard, scoped to its players. */
  myDashboard: (accessToken: string) => apiRequest<MyDashboard>('/network/dashboard', { accessToken }),

  /** Staff: in-play fixtures, or with `finished` the completed ones, each with its markets ("Events" view grant). */
  events: (accessToken: string, finished = false) =>
    apiRequest<{ events: StaffEvent[] }>(`/network/events${finished ? '?finished=1' : ''}`, { accessToken }),

  /** Staff: open markets with current prices ("Markets" view grant). */
  markets: (accessToken: string, eventId?: string) =>
    apiRequest<{ markets: StaffMarket[] }>(`/network/markets${eventId ? `?eventId=${eventId}` : ''}`, { accessToken }),

  /** Staff: the caller's own downline over the last six months ("Analytics" view grant). */
  analytics: (accessToken: string) => apiRequest<StaffAnalytics>('/network/analytics', { accessToken }),

  /** Staff: void an open bet of one of their own players ("Void Bet" edit grant). */
  voidBet: (accessToken: string, betId: string, reason?: string) =>
    apiRequest<{ bet: { _id: string; status: string } }>(`/network/bets/${betId}/void`, {
      method: 'POST',
      body: reason ? { reason } : {},
      accessToken,
    }),

  list: (
    params: { role: NetworkRole; status?: 'active' | 'suspended'; q?: string; page?: number; limit?: number },
    accessToken: string,
  ) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== '') search.set(key, String(value));
    }
    return apiRequest<NetworkList>(`/network/accounts?${search.toString()}`, { accessToken });
  },

  detail: (id: string, accessToken: string) => apiRequest<NetworkDetail>(`/network/accounts/${id}`, { accessToken }),

  create: (payload: CreateAccountPayload, accessToken: string) =>
    apiRequest<{ account: NetworkAccount }>('/accounts', { method: 'POST', body: payload, accessToken }),

  update: (id: string, payload: AccountDraft, accessToken: string) =>
    apiRequest<{ account: NetworkAccount }>(`/accounts/${id}`, { method: 'PATCH', body: payload, accessToken }),

  /** Super-admin only for other people's sessions (DELETE /auth/sessions/:id). */
  revokeSession: (sessionId: string, accessToken: string) =>
    apiRequest<unknown>(`/auth/sessions/${sessionId}`, { method: 'DELETE', accessToken }),

  setStatus: (id: string, status: 'active' | 'suspended', accessToken: string) =>
    apiRequest<{ account: NetworkAccount }>(`/accounts/${id}/status`, { method: 'PATCH', body: { status }, accessToken }),
};

/** "Name (username)" — how an account is shown in pickers. */
export const accountLabel = (ref: Pick<AccountRef, 'name' | 'username' | 'businessName'>) =>
  `${ref.businessName || ref.name || ref.username} (${ref.username})`;

/** Display name: trading name for staff when set, else the person's name, else username. */
export const displayName = (ref: Pick<AccountRef, 'name' | 'username' | 'businessName'> | null | undefined) =>
  ref ? ref.businessName || ref.name || ref.username : '—';

export type StaffEvent = {
  _id: string;
  sport: string;
  league: string;
  name: string;
  emoji: string;
  status: 'Live' | 'Upcoming' | 'Suspended' | 'Completed' | 'Settled';
  startTime: string;
  provider?: string;
  commissionSettledAt?: string | null;
  openMarkets: number;
  markets: StaffEventMarket[];
};

export type StaffEventMarket = {
  _id: string;
  name: string;
  type: string;
  status: 'Active' | 'Suspended';
  /** Set once settled ('Void' for a voided market). */
  winner: string;
  settledAt: string | null;
  bets: number;
  runners: { name: string; odds: number; active: boolean; line?: number | null; rate?: number | null }[];
};

export type StaffMarket = {
  _id: string;
  event: { _id: string; name: string; league: string; status: string; startTime: string };
  name: string;
  type: string;
  maxBet: number;
  runners: { name: string; odds: number; active: boolean }[];
};

type MonthPoint = { month: string; value: number };

export type StaffAnalytics = {
  totals: { players: number; bets: number; stake: number };
  revenue: MonthPoint[];
  volume: MonthPoint[];
  signups: MonthPoint[];
};
