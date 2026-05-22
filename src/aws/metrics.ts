import {
  type CloudWatchClient,
  GetMetricDataCommand,
  type MetricDataQuery,
} from "@aws-sdk/client-cloudwatch";
import type { ChartSpec, Series, SeriesPoint, TimeWindow } from "../types.js";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/**
 * Derives an appropriate CloudWatch `Period` (seconds) from a time window.
 * The mapping follows the design doc and stays well inside CloudWatch's
 * "must be a multiple of 60/300/3600 once start > N days ago" guard rails.
 */
export function derivePeriodSec(startMs: number, endMs: number): number {
  const span = endMs - startMs;
  if (span <= HOUR_MS) return 60;
  if (span <= 6 * HOUR_MS) return 60;
  if (span <= DAY_MS) return 300;
  if (span <= 7 * DAY_MS) return 900;
  return 3600;
}

/**
 * CloudWatch requires MetricDataQuery `Id` to match `^[a-z][a-zA-Z0-9_]*$`.
 * We always prefix with `m_` so any chart id (digits, dashes, etc.) becomes
 * a valid query id. Non-conforming chars are replaced with `_`.
 */
function toQueryId(chartId: string): string {
  const sanitized = chartId.replace(/[^a-zA-Z0-9_]/g, "_");
  return `m_${sanitized}`;
}

/**
 * Fetch metric series for many charts in a single GetMetricData request.
 * CloudWatch accepts up to 500 `MetricDataQueries` per call; we trust the
 * caller not to exceed that.
 *
 * The result preserves input order even if CloudWatch returns results in a
 * different order, and returns an empty `points` array when a query yields
 * no data points.
 */
export async function getMetricSeriesBatch(
  client: CloudWatchClient,
  specs: readonly ChartSpec[],
  window: TimeWindow,
): Promise<Series[]> {
  if (specs.length === 0) return [];

  const queries: MetricDataQuery[] = specs.map((spec) => ({
    Id: toQueryId(spec.id),
    Label: spec.title,
    MetricStat: {
      Metric: {
        Namespace: spec.namespace,
        MetricName: spec.metric,
        Dimensions: Object.entries(spec.dimensions).map(([Name, Value]) => ({
          Name,
          Value,
        })),
      },
      Period: window.periodSec,
      // CloudWatch's modern GetMetricData `Stat` field accepts both standard
      // statistics ("Sum", "Average", ...) and extended statistics ("p99").
      Stat: spec.stat,
    },
    ReturnData: true,
  }));

  const res = await client.send(
    new GetMetricDataCommand({
      MetricDataQueries: queries,
      StartTime: new Date(window.startMs),
      EndTime: new Date(window.endMs),
      ScanBy: "TimestampAscending",
    }),
  );

  const byId = new Map<string, { Label?: string; points: SeriesPoint[] }>();
  for (const r of res.MetricDataResults ?? []) {
    if (!r.Id) continue;
    const stamps = r.Timestamps ?? [];
    const values = r.Values ?? [];
    const points: SeriesPoint[] = stamps.map((ts, i) => ({
      timestamp: ts instanceof Date ? ts.getTime() : new Date(ts).getTime(),
      value: i < values.length ? (values[i] ?? null) : null,
    }));
    byId.set(r.Id, { Label: r.Label, points });
  }

  return specs.map((spec) => {
    const found = byId.get(toQueryId(spec.id));
    return {
      chartId: spec.id,
      label: found?.Label ?? spec.title,
      points: found?.points ?? [],
    };
  });
}

/**
 * Single-chart convenience that delegates to the batch path.
 */
export async function getMetricSeries(
  client: CloudWatchClient,
  spec: ChartSpec,
  window: TimeWindow,
): Promise<Series> {
  const [series] = await getMetricSeriesBatch(client, [spec], window);
  if (!series) {
    // getMetricSeriesBatch returns one Series per spec; this is unreachable
    // but keeps the type narrow.
    return { chartId: spec.id, label: spec.title, points: [] };
  }
  return series;
}
