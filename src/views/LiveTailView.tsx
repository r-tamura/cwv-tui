import { Box, Text, useInput } from "ink";
import React, { useMemo } from "react";
import type { CloudWatchLogsClient } from "@aws-sdk/client-cloudwatch-logs";
import { startLiveTail } from "../aws/liveTail.js";
import { useLiveTail } from "../hooks/useLiveTail.js";
import { formatTimestamp } from "../lib/format.js";
import type { LogEvent } from "../types.js";

export type LiveTailViewProps = {
  client: CloudWatchLogsClient;
  logGroupName: string;
  isActive: boolean;
  /** Optional injection for tests; if omitted, uses startLiveTail(client, ...). */
  subscribeOverride?: () => AsyncGenerator<LogEvent[], void, void>;
  /** Max events to retain in the rolling buffer. */
  max?: number;
  /** Number of recent events to render. */
  visibleRows?: number;
};

export function LiveTailView({
  client,
  logGroupName,
  isActive,
  subscribeOverride,
  max = 500,
  visibleRows = 20,
}: LiveTailViewProps) {
  const subscribe = useMemo(() => {
    if (subscribeOverride) return subscribeOverride;
    return () =>
      startLiveTail(client, {
        // log group ARN identifier is required by the SDK, but for our minimal
        // wiring we pass the group name; callers can swap in an ARN later.
        logGroupIdentifiers: [logGroupName],
      });
  }, [client, logGroupName, subscribeOverride]);

  const { events, status, error } = useLiveTail({ subscribe, max });
  const clearedAtRef = React.useRef(0);
  const [, setBumper] = React.useState(0);

  useInput(
    (input) => {
      if (input === "c") {
        // Render-only clear: hide already-seen events but keep the stream alive.
        clearedAtRef.current = events.length;
        setBumper((n) => n + 1);
      }
    },
    { isActive },
  );

  const visibleEvents = events.slice(clearedAtRef.current);
  const tail = visibleEvents.slice(Math.max(0, visibleEvents.length - visibleRows));

  return (
    <Box flexDirection="column" flexGrow={1}>
      <Box>
        <Text bold color="green">
          Live Tail
        </Text>
        <Text color="gray"> </Text>
        <Text color="cyan">{logGroupName}</Text>
        <Text color="gray"> [{status}</Text>
        {error ? <Text color="red">: {error.message}</Text> : null}
        <Text color="gray">]  </Text>
        <Text color="gray">
          {visibleEvents.length} event{visibleEvents.length === 1 ? "" : "s"}
        </Text>
      </Box>
      <Box flexDirection="column" flexGrow={1}>
        {tail.length === 0 ? (
          <Text color="gray">
            {status === "streaming"
              ? "waiting for events…"
              : status === "ended"
                ? "stream ended"
                : status === "error"
                  ? "stream error"
                  : "idle"}
          </Text>
        ) : (
          tail.map((e, i) => (
            <Text key={`${e.timestamp}-${i}`} wrap="truncate-end">
              <Text color="gray">{formatTimestamp(e.timestamp)} </Text>
              {e.message}
            </Text>
          ))
        )}
      </Box>
      <Box>
        <Text color="gray">c clear  Esc back</Text>
      </Box>
    </Box>
  );
}
