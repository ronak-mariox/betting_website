/** Row shapes shared by the live dashboard's widgets. */
import type { BadgeTone } from '../../components/ui/Badge/Badge';
import type { ServerIcon } from '../../components/icons';

export type LiveMatch = {
  id: string;
  sport: string;
  title: string;
  meta: string;
  exposure: string;
  odds: string;
};

export type RiskAlert = {
  id: string;
  emoji: string;
  message: string;
  age: string;
  tone: 'danger' | 'warning' | 'info';
};

export type HealthMetric = {
  label: string;
  value: string;
  icon: typeof ServerIcon;
};

export type TransactionRow = {
  id: string;
  user: string;
  type: string;
  amount: string;
  positive: boolean;
  method: string;
  time: string;
  status: { label: string; tone: BadgeTone };
};

export type BetRow = {
  id: string;
  user: string;
  event: string;
  selection: string;
  odds: string;
  stake: string;
  status: { label: string; tone: BadgeTone };
};

export type ActivityEntry = { id: string; emoji: string; message: string; age: string };
