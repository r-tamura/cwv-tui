import type { CloudWatchClient } from "@aws-sdk/client-cloudwatch";
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
 * Track 0 stub. Implemented in Track D.
 *
 * Background poller for the banner. Lightweight — only state counts and
 * up to 3 top alarming names. AlarmsView fetches details on demand.
 */
export function useAlarmsSummary(_args: UseAlarmsSummaryArgs): UseAlarmsSummaryState {
  throw new Error("Not implemented yet (Track D)");
}
