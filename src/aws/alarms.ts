import {
  type CloudWatchClient,
  DescribeAlarmsCommand,
  type StateValue,
} from "@aws-sdk/client-cloudwatch";
import type { Alarm, AlarmState, AlarmsSummary } from "../types.js";

const STATE_ORDER: Record<AlarmState, number> = {
  ALARM: 0,
  INSUFFICIENT_DATA: 1,
  OK: 2,
};

function normaliseState(raw: string | undefined): AlarmState {
  if (raw === "ALARM" || raw === "OK" || raw === "INSUFFICIENT_DATA") {
    return raw;
  }
  // CloudWatch should never return anything else, but default to OK to keep
  // the summary banner from going red for unknown states.
  return "OK";
}

/**
 * Lists CloudWatch alarms.
 *
 * When `stateFilter` contains exactly one entry we push the filter into the
 * `DescribeAlarmsCommand` itself (cheaper); otherwise we filter client-side
 * after the call. Results are sorted with ALARM first (most urgent),
 * INSUFFICIENT_DATA next, OK last, then alphabetically within each group.
 */
export async function listAlarms(
  client: CloudWatchClient,
  stateFilter?: readonly AlarmState[],
): Promise<Alarm[]> {
  const singleState =
    stateFilter && stateFilter.length === 1 ? stateFilter[0] : undefined;

  const res = await client.send(
    new DescribeAlarmsCommand({
      StateValue: singleState as StateValue | undefined,
    }),
  );

  const wanted: Set<AlarmState> | undefined =
    stateFilter && stateFilter.length > 0 && !singleState
      ? new Set(stateFilter)
      : undefined;

  const alarms: Alarm[] = [];
  for (const a of res.MetricAlarms ?? []) {
    if (!a.AlarmName) continue;
    const state = normaliseState(a.StateValue);
    if (wanted && !wanted.has(state)) continue;
    alarms.push({
      name: a.AlarmName,
      state,
      reason: a.StateReason,
      metricName: a.MetricName,
      namespace: a.Namespace,
      stateUpdatedAt: a.StateUpdatedTimestamp?.getTime(),
    });
  }

  alarms.sort((a, b) => {
    const diff = STATE_ORDER[a.state] - STATE_ORDER[b.state];
    if (diff !== 0) return diff;
    return a.name.localeCompare(b.name);
  });
  return alarms;
}

/**
 * Roll-up for the Alarms banner. Issues a single DescribeAlarms call and
 * returns state counts plus up to three alphabetical names from the ALARM
 * state (stable across refreshes so the banner doesn't flicker).
 */
export async function getAlarmsSummary(
  client: CloudWatchClient,
): Promise<AlarmsSummary> {
  const alarms = await listAlarms(client);
  let ok = 0;
  let alarm = 0;
  let insufficient = 0;
  const alarming: string[] = [];
  for (const a of alarms) {
    if (a.state === "ALARM") {
      alarm += 1;
      alarming.push(a.name);
    } else if (a.state === "INSUFFICIENT_DATA") {
      insufficient += 1;
    } else {
      ok += 1;
    }
  }
  const topAlarming = [...alarming].sort((a, b) => a.localeCompare(b)).slice(0, 3);
  return { ok, alarm, insufficient, topAlarming };
}
