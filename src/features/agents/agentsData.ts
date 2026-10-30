import { CheckCircleIcon, PercentIcon, UserIcon, UsersIcon } from '../../components/icons';
import type { BadgeTone } from '../../components/ui/Badge/Badge';
import type { StatCardProps } from '../../components/ui/StatCard/StatCard';
import type { NetworkListStats } from '../../lib/api/network';
import { formatCount, formatMoney } from '../../lib/format';

export type AgentStatus = 'Active' | 'Suspended';

export const AGENT_STATUS_TONE: Record<AgentStatus, BadgeTone> = {
  Active: 'success',
  Suspended: 'danger',
};

export function agentStats(stats: NetworkListStats | null): StatCardProps[] {
  const value = (fn: (s: NetworkListStats) => string) => (stats ? fn(stats) : '…');
  return [
    { label: 'Total Agents', value: value((s) => formatCount(s.total)), caption: 'In your network', icon: UserIcon, accent: 'blue' },
    {
      label: 'Active Agents',
      value: value((s) => formatCount(s.active)),
      caption: value((s) => `${formatCount(s.suspended)} suspended`),
      icon: CheckCircleIcon,
      accent: 'green',
    },
    { label: 'Total Users', value: value((s) => formatCount(s.players)), caption: 'Under agents', icon: UsersIcon, accent: 'cyan' },
    {
      label: 'Agent Commission',
      value: value((s) => formatMoney(s.commission)),
      caption: value((s) => `${formatMoney(s.monthTurnover)} turnover this month`),
      icon: PercentIcon,
      accent: 'yellow',
    },
  ];
}
