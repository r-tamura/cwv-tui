import { Box, Text } from "ink";
import React from "react";
import type { AlarmsSummary } from "../types.js";

export type AlarmsBannerProps = {
  summary: AlarmsSummary | undefined;
  loading: boolean;
  error: Error | undefined;
  onJump: () => void;
};

/**
 * A single-line banner under the tab bar that gives a fast read on whether
 * anything is currently red. Color-coded:
 *   - red    when any ALARM
 *   - yellow when any INSUFFICIENT_DATA but no ALARM
 *   - green  when everything is OK
 *
 * The `onJump` callback is currently unused at the keyboard layer (the
 * banner is non-interactive in MVP); App-level Tab still gets users to the
 * Alarms tab. We accept the prop now so a later v0.3.1 can wire Enter on
 * the banner without a breaking API change.
 */
export function AlarmsBanner({
  summary,
  loading,
  error,
  onJump,
}: AlarmsBannerProps) {
  void onJump; // reserved for v0.3.1
  if (error) {
    return (
      <Box>
        <Text color="gray">Alarms: </Text>
        <Text color="red">unable to fetch ({error.message})</Text>
      </Box>
    );
  }
  if (!summary) {
    return (
      <Box>
        <Text color="gray">
          Alarms: {loading ? "loading…" : "—"}
        </Text>
      </Box>
    );
  }
  const { ok, alarm, insufficient, topAlarming } = summary;
  if (alarm === 0 && insufficient === 0) {
    return (
      <Box>
        <Text color="green">● All clear</Text>
        <Text color="gray"> ({ok} OK)</Text>
      </Box>
    );
  }
  if (alarm > 0) {
    const names = topAlarming.length > 0 ? topAlarming.join(", ") : "";
    const overflow = alarm > topAlarming.length ? ` (+${alarm - topAlarming.length} more)` : "";
    return (
      <Box>
        <Text color="red">● Active alarms: {alarm}</Text>
        {names && (
          <Text color="gray">
            {" "}
            — {names}
            {overflow}
          </Text>
        )}
        {insufficient > 0 && (
          <Text color="gray">  · insufficient: {insufficient}</Text>
        )}
      </Box>
    );
  }
  // Only INSUFFICIENT_DATA present.
  return (
    <Box>
      <Text color="yellow">● Insufficient data: {insufficient}</Text>
      <Text color="gray"> ({ok} OK)</Text>
    </Box>
  );
}
