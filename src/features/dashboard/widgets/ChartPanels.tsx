import { useState } from 'react';
import { AreaChart } from '../../../components/charts/AreaChart';
import { BarChart, ChartLegend } from '../../../components/charts/BarChart';
import type { BarGroup, BarSeries } from '../../../components/charts/BarChart';
import type { ChartPoint } from '../../../components/charts/AreaChart';
import { DonutChart } from '../../../components/charts/DonutChart';
import type { DonutSlice } from '../../../components/charts/DonutChart';
import { ProgressBar } from '../../../components/ui/ProgressBar/ProgressBar';
import { SectionCard } from '../../../components/ui/SectionCard/SectionCard';
import { Tabs } from '../../../components/ui/Tabs/Tabs';
import styles from './widgets.module.css';

const REVENUE_TABS = ['Revenue', 'Wallet', 'Commission'] as const;
type RevenueTab = (typeof REVENUE_TABS)[number];

/** Each tab reads the same series through a different lens. */
const TAB_FACTOR: Record<RevenueTab, number> = { Revenue: 1, Wallet: 1.6, Commission: 0.24 };

export type RevenuePanelProps = {
  data: ChartPoint[];
  /** Real per-tab series (super-admin); without it each tab rescales `data`. */
  series?: Record<RevenueTab, ChartPoint[]>;
  subtitle?: string;
};

export function RevenuePanel({ data, series, subtitle = 'Jan–Jul 2024' }: RevenuePanelProps) {
  const [tab, setTab] = useState<RevenueTab>('Revenue');
  const scaled = series ? series[tab] : data.map((point) => ({ ...point, value: point.value * TAB_FACTOR[tab] }));

  return (
    <SectionCard
      title="Revenue Overview"
      subtitle={subtitle}
      action={<Tabs items={REVENUE_TABS} value={tab} onChange={setTab} aria-label="Revenue series" />}
    >
      <AreaChart data={scaled} />
    </SectionCard>
  );
}

export function SportSplitPanel({ data }: { data: DonutSlice[] }) {
  return (
    <SectionCard title="Betting by Sport" subtitle="Exposure distribution">
      <DonutChart data={data} />
    </SectionCard>
  );
}

const WALLET_SERIES: BarSeries[] = [
  { name: 'Deposits', color: 'var(--color-success)' },
  { name: 'Withdrawals', color: 'var(--color-danger)' },
];

export function WalletFlowPanel({ data, subtitle = 'Deposits vs Withdrawals this week' }: { data: BarGroup[]; subtitle?: string }) {
  return (
    <SectionCard
      title="Wallet Flow"
      subtitle={subtitle}
      action={<ChartLegend series={WALLET_SERIES} />}
    >
      <BarChart data={data} series={WALLET_SERIES} />
    </SectionCard>
  );
}

export type CommissionRow = { label: string; percent: number; color: string };

export function CommissionPanel({
  rows,
  total,
  totalLabel = 'Total Commission Today',
}: {
  rows: CommissionRow[];
  total: string;
  totalLabel?: string;
}) {
  return (
    <SectionCard title="Commission Split" subtitle="By hierarchy level">
      <div className={styles.meters}>
        {rows.map((row) => (
          <ProgressBar key={row.label} label={row.label} percent={row.percent} color={row.color} />
        ))}
      </div>
      <div className={styles.commissionTotal}>
        <p className={styles.commissionTotalLabel}>{totalLabel}</p>
        <p className={styles.commissionTotalValue}>{total}</p>
      </div>
    </SectionCard>
  );
}
