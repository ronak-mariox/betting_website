import { CheckCircleIcon, DollarIcon, PercentIcon, UsersCogIcon } from '../../components/icons';
import type { StatCardProps } from '../../components/ui/StatCard/StatCard';
import type { RoleDefinition } from '../../config/roles';
import type { NetworkListStats } from '../../lib/api/network';
import { formatCount, formatMoney } from '../../lib/format';

/** The capability panel copy, verbatim from the design. */
export const SUPER_AGENT_CAPABILITIES = [
  'Apne sab Agents ki suchi dekh sakta hai',
  'Apne Agents ke Users ki suchi dekh sakta hai',
  'Users ka balance aur transactions dekh sakta hai',
  'Users ke liye Deposits/Withdrawals (yadi anumati ho)',
  'Apne Agents aur Users ki performance report dekh sakta hai',
  'Apna commission aur Earning report dekh sakta hai',
  'Apne Profile aur Wallet ki jankari dekh sakta hai',
] as const;

/** Only Super Admin looks across franchises; a franchise sees its own book. */
export function ownsWholeDirectory(role: RoleDefinition): boolean {
  return role.manages === 'franchise';
}

export function superAgentStats(stats: NetworkListStats | null, wholeDirectory: boolean): StatCardProps[] {
  const value = (fn: (s: NetworkListStats) => string) => (stats ? fn(stats) : '…');
  return [
    {
      label: wholeDirectory ? 'Total Super Agents' : 'My Super Agents',
      value: value((s) => formatCount(s.total)),
      caption: wholeDirectory ? 'Across all franchises' : 'Under your franchise',
      icon: UsersCogIcon,
      accent: 'blue',
    },
    {
      label: 'Active',
      value: value((s) => formatCount(s.active)),
      caption: value((s) => `${formatCount(s.suspended)} suspended`),
      icon: CheckCircleIcon,
      accent: 'green',
    },
    {
      label: 'Total Turnover',
      value: value((s) => formatMoney(s.turnover)),
      caption: value((s) => `${formatMoney(s.monthTurnover)} this month`),
      icon: DollarIcon,
      accent: 'yellow',
    },
    {
      label: 'Commission Earned',
      value: value((s) => formatMoney(s.commission)),
      caption: 'By super agents',
      icon: PercentIcon,
      accent: 'cyan',
    },
  ];
}
