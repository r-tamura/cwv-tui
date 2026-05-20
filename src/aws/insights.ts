import {
  CloudWatchLogsClient,
  GetQueryResultsCommand,
  StartQueryCommand,
  StopQueryCommand,
} from "@aws-sdk/client-cloudwatch-logs";
import type {
  InsightsRow,
  InsightsStatistics,
  InsightsStatus,
} from "../types.js";

export type StartQueryOptions = {
  logGroupNames: readonly string[];
  queryString: string;
  /** epoch ms; defaults to now - 1h */
  startTimeMs?: number;
  /** epoch ms; defaults to now */
  endTimeMs?: number;
  /** max rows (default 1000) */
  limit?: number;
};

export type QueryResult = {
  status: InsightsStatus;
  rows: InsightsRow[];
  statistics?: InsightsStatistics;
};

export async function startInsightsQuery(
  client: CloudWatchLogsClient,
  opts: StartQueryOptions,
): Promise<string> {
  const now = Date.now();
  const endMs = opts.endTimeMs ?? now;
  const startMs = opts.startTimeMs ?? now - 60 * 60 * 1000;
  const res = await client.send(
    new StartQueryCommand({
      logGroupNames: [...opts.logGroupNames],
      queryString: opts.queryString,
      // Insights uses epoch SECONDS
      startTime: Math.floor(startMs / 1000),
      endTime: Math.floor(endMs / 1000),
      limit: opts.limit ?? 1000,
    }),
  );
  if (!res.queryId) {
    throw new Error("StartQuery returned no queryId");
  }
  return res.queryId;
}

export async function getInsightsResults(
  client: CloudWatchLogsClient,
  queryId: string,
): Promise<QueryResult> {
  const res = await client.send(
    new GetQueryResultsCommand({ queryId }),
  );
  const rows: InsightsRow[] =
    res.results?.map((row) =>
      (row ?? []).map((f) => ({
        field: f.field ?? "",
        value: f.value ?? "",
      })),
    ) ?? [];
  const stats: InsightsStatistics | undefined = res.statistics
    ? {
        recordsMatched: res.statistics.recordsMatched ?? 0,
        recordsScanned: res.statistics.recordsScanned ?? 0,
        bytesScanned: res.statistics.bytesScanned ?? 0,
      }
    : undefined;
  return {
    status: (res.status as InsightsStatus) ?? "Unknown",
    rows,
    statistics: stats,
  };
}

export async function stopInsightsQuery(
  client: CloudWatchLogsClient,
  queryId: string,
): Promise<void> {
  try {
    await client.send(new StopQueryCommand({ queryId }));
  } catch {
    // best-effort
  }
}

export function isTerminalStatus(status: InsightsStatus): boolean {
  return (
    status === "Complete" ||
    status === "Failed" ||
    status === "Cancelled" ||
    status === "Timeout"
  );
}

/** Polling cadence: 1s for first 5s, then 2s, capped at 5s. */
export function nextPollDelay(elapsedMs: number): number {
  if (elapsedMs < 5_000) return 1_000;
  if (elapsedMs < 30_000) return 2_000;
  return 5_000;
}
