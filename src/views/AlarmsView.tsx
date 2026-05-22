import { Box, Text } from "ink";
import React, { useMemo } from "react";
import type { CloudWatchClient } from "@aws-sdk/client-cloudwatch";
import { FilterableList } from "../components/FilterableList.js";
import { Spinner } from "../components/Spinner.js";
import { useAsync } from "../hooks/useAsync.js";
import { describeAwsError } from "../lib/errors.js";
import { listAlarms } from "../aws/alarms.js";
import type { Alarm, AlarmState } from "../types.js";

export type AlarmsViewProps = {
  client: CloudWatchClient;
  isActive: boolean;
  /** When the banner jumped us here for a specific alarm, focus it. */
  focusedAlarm?: string;
  /** Drill from an alarm into its underlying metric. */
  onOpenMetric?: (namespace: string, metric: string) => void;
};

// State badge prefixes. FilterableList renders one <Text> per row, so we
// can't color a single character mid-row; we accept monochrome rows for MVP
// and use textual badges instead. This keeps state visually obvious and
// preserves filterability ("/" on "ALARM" narrows to red alarms).
const STATE_BADGE: Record<AlarmState, string> = {
  ALARM: "[ALARM] ",
  INSUFFICIENT_DATA: "[INSUF] ",
  OK: "[OK]    ",
};

// Sort by severity so the first row is the most actionable alarm — also
// gives us a stable initial cursor target when `focusedAlarm` is set.
const STATE_RANK: Record<AlarmState, number> = {
  ALARM: 0,
  INSUFFICIENT_DATA: 1,
  OK: 2,
};

function getLabel(alarm: Alarm): string {
  const namespace = alarm.namespace ?? "?";
  const metric = alarm.metricName ?? "?";
  return `${STATE_BADGE[alarm.state]}${alarm.name}  (${namespace}/${metric})`;
}

export function AlarmsView({
  client,
  isActive,
  focusedAlarm,
  onOpenMetric,
}: AlarmsViewProps) {
  const { data, loading, error } = useAsync<Alarm[]>(
    () => listAlarms(client),
    [client],
  );

  const items = useMemo(() => {
    const list = [...(data ?? [])];
    list.sort((a, b) => {
      const ra = STATE_RANK[a.state];
      const rb = STATE_RANK[b.state];
      if (ra !== rb) return ra - rb;
      return a.name.localeCompare(b.name);
    });
    // If we were asked to focus a specific alarm, hoist it to the top so
    // FilterableList's initial cursor (index 0) lands on it.
    if (focusedAlarm) {
      const idx = list.findIndex((a) => a.name === focusedAlarm);
      if (idx > 0) {
        const [target] = list.splice(idx, 1);
        if (target) list.unshift(target);
      }
    }
    return list;
  }, [data, focusedAlarm]);

  if (loading) {
    return (
      <Box>
        <Spinner label="Loading alarms…" />
      </Box>
    );
  }
  if (error) {
    return <Text color="red">{describeAwsError(error)}</Text>;
  }

  const handleSelect = (alarm: Alarm) => {
    if (!onOpenMetric) return;
    if (!alarm.namespace || !alarm.metricName) return;
    onOpenMetric(alarm.namespace, alarm.metricName);
  };

  return (
    <Box flexDirection="column" flexGrow={1}>
      <Box>
        <Text bold color="green">
          Alarms
        </Text>
        <Text color="gray"> ({items.length})</Text>
      </Box>
      <FilterableList
        items={items}
        getKey={(a) => a.name}
        getLabel={getLabel}
        onSelect={handleSelect}
        isActive={isActive}
        emptyText="no alarms in this region"
      />
    </Box>
  );
}
