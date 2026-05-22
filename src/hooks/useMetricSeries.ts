import type { CloudWatchClient } from "@aws-sdk/client-cloudwatch";
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
 * Track 0 stub. Implemented in Track C.
 *
 * Drives interval-based fetching for a whole dashboard. Failures are
 * localized per chart; previous series stays visible during in-flight
 * refresh; cleared on unmount or `paused` flip.
 */
export function useMetricSeries(_args: UseMetricSeriesArgs): UseMetricSeriesState {
  throw new Error("Not implemented yet (Track C)");
}
