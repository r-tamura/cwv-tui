import { useCallback, useEffect, useRef, useState } from "react";
import type { CloudWatchLogsClient } from "@aws-sdk/client-cloudwatch-logs";
import {
  getInsightsResults,
  isTerminalStatus,
  nextPollDelay,
  startInsightsQuery,
  stopInsightsQuery,
} from "../aws/insights.js";
import type {
  InsightsRow,
  InsightsStatistics,
  InsightsStatus,
} from "../types.js";

export type InsightsRunState =
  | { phase: "idle" }
  | { phase: "starting" }
  | {
      phase: "running";
      queryId: string;
      startedAt: number;
      statistics?: InsightsStatistics;
    }
  | {
      phase: "done";
      status: InsightsStatus;
      rows: InsightsRow[];
      statistics?: InsightsStatistics;
      elapsedMs: number;
    }
  | { phase: "error"; error: Error };

export type UseInsightsQueryArgs = {
  client: CloudWatchLogsClient;
  logGroupName: string;
};

export function useInsightsQuery({ client, logGroupName }: UseInsightsQueryArgs) {
  const [state, setState] = useState<InsightsRunState>({ phase: "idle" });
  const queryIdRef = useRef<string | undefined>(undefined);
  const cancelledRef = useRef(false);

  const stop = useCallback(async () => {
    cancelledRef.current = true;
    const id = queryIdRef.current;
    if (id) {
      await stopInsightsQuery(client, id);
    }
    setState({ phase: "idle" });
  }, [client]);

  const run = useCallback(
    async (queryString: string) => {
      cancelledRef.current = false;
      setState({ phase: "starting" });
      let queryId: string;
      try {
        queryId = await startInsightsQuery(client, {
          logGroupNames: [logGroupName],
          queryString,
        });
      } catch (e: unknown) {
        setState({
          phase: "error",
          error: e instanceof Error ? e : new Error(String(e)),
        });
        return;
      }
      queryIdRef.current = queryId;
      const startedAt = Date.now();
      setState({ phase: "running", queryId, startedAt });

      while (!cancelledRef.current) {
        const elapsed = Date.now() - startedAt;
        await new Promise((r) => setTimeout(r, nextPollDelay(elapsed)));
        if (cancelledRef.current) return;
        try {
          const res = await getInsightsResults(client, queryId);
          if (isTerminalStatus(res.status)) {
            setState({
              phase: "done",
              status: res.status,
              rows: res.rows,
              statistics: res.statistics,
              elapsedMs: Date.now() - startedAt,
            });
            queryIdRef.current = undefined;
            return;
          }
          setState((prev) =>
            prev.phase === "running"
              ? { ...prev, statistics: res.statistics }
              : prev,
          );
        } catch (e: unknown) {
          setState({
            phase: "error",
            error: e instanceof Error ? e : new Error(String(e)),
          });
          return;
        }
      }
    },
    [client, logGroupName],
  );

  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      const id = queryIdRef.current;
      if (id) {
        void stopInsightsQuery(client, id);
      }
    };
  }, [client]);

  return { state, run, stop };
}
