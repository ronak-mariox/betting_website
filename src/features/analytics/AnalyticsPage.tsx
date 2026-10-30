import { Loader } from '../../components/ui/Loader/Loader';
import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { AreaChart } from '../../components/charts/AreaChart';
import type { ChartPoint } from '../../components/charts/AreaChart';
import { PillTabs } from '../../components/ui/PillTabs/PillTabs';
import { StatCard } from '../../components/ui/StatCard/StatCard';
import { useAuth } from '../auth/authContext';
import { ApiRequestError } from '../../lib/api';
import { analyticsApi } from '../../lib/api/analytics';
import type { AnalyticsGrowth } from '../../lib/api/analytics';
import {
  ANALYTICS_DIMENSION_BY_TAB,
  analyticsStats,
  ANALYTICS_TABS,
  buildHighlightCards,
  toChartPoints,
} from './analyticsData';
import type { AnalyticsHighlightCard } from './analyticsData';
import styles from './AnalyticsPage.module.css';

const TABS = ANALYTICS_TABS.map((label) => ({ label }));

type Tab = (typeof ANALYTICS_TABS)[number];

const errorMessage = (err: unknown) =>
  err instanceof ApiRequestError ? err.message : 'Unable to reach the server.';

/** Analytics console — node 112:8897. */
export function AnalyticsPage() {
  const { accessToken } = useAuth();
  const [tab, setTab] = useState<Tab>(ANALYTICS_TABS[0]);

  const [series, setSeries] = useState<ChartPoint[]>([]);
  const [seriesLoading, setSeriesLoading] = useState(true);
  const [seriesError, setSeriesError] = useState<string | null>(null);

  const [highlights, setHighlights] = useState<AnalyticsHighlightCard[]>([]);
  const [growth, setGrowth] = useState<AnalyticsGrowth | null>(null);
  const [highlightsError, setHighlightsError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    const dimension = ANALYTICS_DIMENSION_BY_TAB[tab];
    setSeriesLoading(true);
    analyticsApi
      .series(dimension, accessToken)
      .then((res) => {
        if (cancelled) return;
        setSeries(toChartPoints(dimension, res.series));
        setSeriesError(null);
      })
      .catch((err) => {
        if (!cancelled) setSeriesError(errorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setSeriesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, tab]);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    analyticsApi
      .growth(accessToken)
      .then((res) => {
        if (!cancelled) setGrowth(res.growth);
      })
      .catch(() => {
        if (!cancelled) setGrowth(null);
      });
    analyticsApi
      .highlights(accessToken)
      .then((res) => {
        if (cancelled) return;
        setHighlights(buildHighlightCards(res.highlights));
        setHighlightsError(null);
      })
      .catch((err) => {
        if (!cancelled) setHighlightsError(errorMessage(err));
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  return (
    <div className={styles.page}>
      <div className={styles.stats}>
        {analyticsStats(growth).map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <section className={styles.card}>
        <PillTabs
          items={TABS}
          value={tab}
          label="Analytics series"
          onChange={(value) => setTab(value as Tab)}
        />

        <div className={styles.chart}>
          {seriesError ? (
            <p className={styles.chartStatus}>{seriesError}</p>
          ) : seriesLoading && series.length === 0 ? (
            <Loader block />
          ) : series.length === 0 ? (
            <p className={styles.chartStatus}>No data for this period yet.</p>
          ) : (
            <AreaChart data={series} height={260} />
          )}
        </div>

        {highlightsError && <p className={styles.chartStatus}>{highlightsError}</p>}
        <div className={styles.highlights}>
          {highlights.map((item) => (
            <div
              key={item.label}
              className={styles.highlight}
              style={{ '--highlight-rgb': item.rgb } as CSSProperties}
            >
              <p className={styles.highlightLabel}>{item.label}</p>
              <p className={styles.highlightValue}>{item.value}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
