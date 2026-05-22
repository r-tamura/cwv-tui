import { Box, Text } from "ink";
import React from "react";
import type { CloudWatchClient } from "@aws-sdk/client-cloudwatch";
import type { DashboardSpec, TimeWindow } from "../types.js";

export type DashboardViewProps = {
  client: CloudWatchClient;
  dashboard: DashboardSpec;
  /** Shared by all charts. */
  window: TimeWindow;
  isActive: boolean;
  /** Called when the user presses Enter on a chart with logGroups attached. */
  onOpenInsights: (logGroups: readonly string[], window: TimeWindow) => void;
  /** Called when the user requests a different time range. */
  onChangeWindow: (next: TimeWindow) => void;
  /** Called when the user wants to switch to another dashboard. */
  onSwitchDashboard?: () => void;
};

/**
 * Track 0 stub. Implemented in Track C.
 *
 * Renders the dashboard: vertical stack of MetricChart components, with
 * useVimNav for cursor, TimeRangePicker bound to `t`, pause/resume on `p`,
 * manual reload on `r`, Enter to drill into Insights.
 */
export function DashboardView(_props: DashboardViewProps) {
  return (
    <Box flexDirection="column">
      <Text color="gray">[DashboardView stub — Track C]</Text>
    </Box>
  );
}
