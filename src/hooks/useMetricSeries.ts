import { useCallback, useEffect, useRef, useState } from "react";
import type { CloudWatchClient } from "@aws-sdk/client-cloudwatch";
import { getMetricSeriesBatch } from "../aws/metrics.js";
import type { DashboardSpec, Series, TimeWindow } from "../types.js";

export type UseMetricSeriesArgs = {
  client: CloudWatchClient;
  dashboard: DashboardSpec;
  window: TimeWindow;
  refreshSec: number;
  paused: boolean;
};

export type UseMetricSeriesState = {
  /** Latest known data per chart id. Retained across refreshes. */
  seriesByChart: Map<string, Series>;
  /** Per-chart most recent error, cleared on next successful refresh. */
  errorByChart: Map<string, Error>;
  /** True while a refresh is in flight. */
  loading: boolean;
  /** Wall-clock ms of last successful fetch (any chart). */
  lastFetchAt?: number;
  /** Manual one-shot reload. */
  reload: () => void;
};

/**
 * Drives interval-based fetching for a whole dashboard. Failures are
 * batch-wide (one GetMetricData call per refresh) but surfaced per chart so
 * the UI keeps the previous series visible while reporting which charts the
 * error applies to. Stale in-flight responses are dropped via AbortController.
 */
export function useMetricSeries({
  client,
  dashboard,
  window,
  refreshSec,
  paused,
}: UseMetricSeriesArgs): UseMetricSeriesState {
  const [seriesByChart, setSeriesByChart] = useState<Map<string, Series>>(
    () => new Map(),
  );
  const [errorByChart, setErrorByChart] = useState<Map<string, Error>>(
    () => new Map(),
  );
  const [loading, setLoading] = useState(false);
  const [lastFetchAt, setLastFetchAt] = useState<number | undefined>(undefined);

  // Track the latest in-flight request so we can ignore stale resolutions
  // (e.g. when a reload fires before the previous response landed).
  const inFlightRef = useRef<AbortController | undefined>(undefined);
  // Hold a stable reference to the chart list for the failure path so we can
  // populate errorByChart for every chart in the current dashboard.
  const chartsRef = useRef(dashboard.charts);
  useEffect(() => {
    chartsRef.current = dashboard.charts;
  }, [dashboard.charts]);

  const fetchOnce = useCallback(async () => {
    // Cancel any prior in-flight request so its result is discarded.
    inFlightRef.current?.abort();
    const ctrl = new AbortController();
    inFlightRef.current = ctrl;

    setLoading(true);
    try {
      const result = await getMetricSeriesBatch(
        client,
        chartsRef.current,
        window,
      );
      if (ctrl.signal.aborted) return;
      const next = new Map<string, Series>();
      for (const s of result) next.set(s.chartId, s);
      setSeriesByChart(next);
      setErrorByChart(new Map());
      setLastFetchAt(Date.now());
    } catch (e: unknown) {
      if (ctrl.signal.aborted) return;
      const err = e instanceof Error ? e : new Error(String(e));
      // Batch failure: localize to every chart in the dashboard. Previous
      // series is intentionally kept so the UI doesn't blank out.
      const errs = new Map<string, Error>();
      for (const c of chartsRef.current) errs.set(c.id, err);
      setErrorByChart(errs);
    } finally {
      if (!ctrl.signal.aborted) {
        setLoading(false);
      }
      if (inFlightRef.current === ctrl) {
        inFlightRef.current = undefined;
      }
    }
  }, [client, window]);

  // Initial fetch + interval. Re-arms when refreshSec, paused, window, or
  // dashboard change.
  useEffect(() => {
    if (paused) return;
    void fetchOnce();
    const intervalMs = Math.max(1, refreshSec) * 1000;
    const id = setInterval(() => {
      void fetchOnce();
    }, intervalMs);
    return () => {
      clearInterval(id);
      inFlightRef.current?.abort();
      inFlightRef.current = undefined;
    };
  }, [fetchOnce, refreshSec, paused]);

  const reload = useCallback(() => {
    void fetchOnce();
  }, [fetchOnce]);

  return {
    seriesByChart,
    errorByChart,
    loading,
    lastFetchAt,
    reload,
  };
}
