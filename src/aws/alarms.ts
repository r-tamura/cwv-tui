import type { CloudWatchClient } from "@aws-sdk/client-cloudwatch";
import type { Alarm, AlarmState, AlarmsSummary } from "../types.js";

/**
 * Track 0 stub. Implemented in Track A.
 *
 * Lists CloudWatch alarms, optionally filtered by state.
 */
export async function listAlarms(
  _client: CloudWatchClient,
  _stateFilter?: readonly AlarmState[],
): Promise<Alarm[]> {
  throw new Error("Not implemented yet (Track A)");
}

/**
 * Track 0 stub. Implemented in Track A.
 *
 * Convenience aggregator for the banner. Calls listAlarms() and rolls it up.
 */
export async function getAlarmsSummary(
  _client: CloudWatchClient,
): Promise<AlarmsSummary> {
  throw new Error("Not implemented yet (Track A)");
}
