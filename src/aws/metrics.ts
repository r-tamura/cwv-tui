import type { CloudWatchClient } from "@aws-sdk/client-cloudwatch";
import type { ChartSpec, Series, TimeWindow } from "../types.js";

/**
 * Track 0 stub. Implemented in Track A.
 *
 * Fetches one metric series via GetMetricDataCommand. Whole-dashboard batching
 * (multiple ChartSpecs per call) lives in `getMetricSeriesBatch` below.
 */
export async function getMetricSeries(
  _client: CloudWatchClient,
  _spec: ChartSpec,
  _window: TimeWindow,
): Promise<Series> {
  throw new Error("Not implemented yet (Track A)");
}

/**
 * Track 0 stub. Implemented in Track A.
 *
 * Batches up to 500 charts into a single GetMetricDataCommand and returns
 * one Series per input ChartSpec, keyed by chart.id.
 */
export async function getMetricSeriesBatch(
  _client: CloudWatchClient,
  _specs: readonly ChartSpec[],
  _window: TimeWindow,
): Promise<Series[]> {
  throw new Error("Not implemented yet (Track A)");
}

/**
 * Track 0 stub. Implemented in Track A.
 *
 * Derives a period (seconds) from a window. Refer to the design doc table.
 */
export function derivePeriodSec(_startMs: number, _endMs: number): number {
  throw new Error("Not implemented yet (Track A)");
}
