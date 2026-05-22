import { Box, Text } from "ink";
import React from "react";
import type { Series } from "../types.js";

export type MetricChartProps = {
  title: string;
  series: Series | undefined;
  height: number;
  /** When the parent shows a refresh-in-flight indicator. */
  loading?: boolean;
  /** When true, the row is rendered with a selected indicator (▌ + accent). */
  selected?: boolean;
  /** Non-null when the most recent fetch failed; previous series is kept. */
  error?: Error;
};

/**
 * Track 0 stub. Implemented in Track B.
 *
 * Renders one chart row: header (title, stat, last value, min/max) +
 * the asciichart body wrapped in a Text node with truncate-end.
 */
export function MetricChart(_props: MetricChartProps) {
  return (
    <Box>
      <Text color="gray">[MetricChart stub — Track B]</Text>
    </Box>
  );
}
