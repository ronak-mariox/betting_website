import { apiRequest } from '../api';

type UserRef = { _id: string; name?: string; username: string } | string | null;

export type MonthPoint = { month: string; value: number };

export type ApiDashboard = {
  stats: { totalUsers: number; activeUsers: number; totalWalletBalance: number; todayTurnover: number };
  revenue: MonthPoint[];
  sports: { sport: string; value: number }[];
  /** Monthly completed deposits vs withdrawals; `value` is net inflow. */
  walletFlow: (MonthPoint & { deposits: number; withdrawals: number })[];
  commission: MonthPoint[];
  commissionTotal: number;
  liveMatches: {
    _id: string;
    sport: string;
    league: string;
    name: string;
    emoji: string;
    score?: string;
    stake: number;
    exposure: number;
  }[];
  riskAlerts: { _id: string; user: UserRef; score: number; reason: string; createdAt: string }[];
  health: { providers: number; healthyProviders: number; status: string };
  transactions: {
    _id: string;
    user: UserRef;
    type: string;
    amount: number;
    method: string;
    status: 'Pending' | 'Completed' | 'Failed';
    createdAt: string;
  }[];
  bets: {
    _id: string;
    user: UserRef;
    event: { _id: string; name: string } | string | null;
    selection: string;
    odds: number;
    amount: number;
    status: 'Pending' | 'Won' | 'Lost' | 'Void';
  }[];
  activity: {
    _id: string;
    actor: UserRef;
    actorUsername: string;
    action: string;
    status: 'success' | 'failed';
    ip: string;
    createdAt: string;
  }[];
};

export const dashboardApi = {
  get: (accessToken: string) => apiRequest<ApiDashboard>('/dashboard', { accessToken }),
};
