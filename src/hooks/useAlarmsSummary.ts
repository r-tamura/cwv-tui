import { useCallback, useEffect, useRef, useState } from "react";
import type { CloudWatchClient } from "@aws-sdk/client-cloudwatch";
import { getAlarmsSummary } from "../aws/alarms.js";
import type { AlarmsSummary } from "../types.js";

export type UseAlarmsSummaryArgs = {
  client: CloudWatchClient;
  /** Default 60_000 (1 minute). */
  refreshMs?: number;
};

export type UseAlarmsSummaryState = {
  summary: AlarmsSummary | undefined;
  loading: boolean;
  error: Error | undefined;
  reload: () => void;
};

/**
 * Background poller for the alarms banner. Keeps state counts plus up to
 * three top alarming names; AlarmsView fetches the detailed list on demand.
 *
 * On every tick we kick off `getAlarmsSummary(client)`. A previous summary
 * stays visible across in-flight refreshes — only successful responses
 * replace it, and failures are surfaced via `error` without dropping data.
 * Stale responses (e.g. after unmount or a new refresh started) are
 * discarded via an AbortController + a per-request id.
 */
export function useAlarmsSummary({
  client,
  refreshMs = 60_000,
}: UseAlarmsSummaryArgs): UseAlarmsSummaryState {
  const [summary, setSummary] = useState<AlarmsSummary | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | undefined>(undefined);

  // The id of the most recently issued request; only that request is allowed
  // to commit its result. Anything older (e.g. an in-flight call when reload
  // races a new tick) is treated as stale.
  const activeIdRef = useRef(0);
  const mountedRef = useRef(true);
  const fetchRef = useRef<() => void>(() => {});

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      // Invalidate any in-flight responses so they don't setState post-unmount.
      activeIdRef.current++;
    };
  }, []);

  // Keep fetchRef pointing at a fresh closure over the current client.
  fetchRef.current = () => {
    const id = ++activeIdRef.current;
    setLoading(true);
    getAlarmsSummary(client)
      .then((next) => {
        if (!mountedRef.current) return;
        if (id !== activeIdRef.current) return;
        setSummary(next);
        setError(undefined);
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (!mountedRef.current) return;
        if (id !== activeIdRef.current) return;
        setError(e instanceof Error ? e : new Error(String(e)));
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchRef.current();
    if (refreshMs <= 0) return;
    const handle = setInterval(() => fetchRef.current(), refreshMs);
    return () => {
      clearInterval(handle);
    };
  }, [client, refreshMs]);

  const reload = useCallback(() => {
    fetchRef.current();
  }, []);

  return { summary, loading, error, reload };
}
