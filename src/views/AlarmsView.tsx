import { Box, Text } from "ink";
import React from "react";
import type { CloudWatchClient } from "@aws-sdk/client-cloudwatch";

export type AlarmsViewProps = {
  client: CloudWatchClient;
  isActive: boolean;
  /** When the banner jumped us here for a specific alarm, focus it. */
  focusedAlarm?: string;
  /** Drill from an alarm into its underlying metric. */
  onOpenMetric?: (namespace: string, metric: string) => void;
};

/**
 * Track 0 stub. Implemented in Track D.
 *
 * Lists alarms with state-colored rows, filtering by `/` and Vim keys
 * for navigation. Enter drills into AlarmDetailView (v0.3.1) — for MVP
 * Enter is a no-op.
 */
export function AlarmsView(_props: AlarmsViewProps) {
  return (
    <Box flexDirection="column">
      <Text color="gray">[AlarmsView stub — Track D]</Text>
    </Box>
  );
}
