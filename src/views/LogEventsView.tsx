import { Box, Text, useInput } from "ink";
import React, { useState } from "react";
import { Spinner } from "../components/Spinner.js";
import { useAsync } from "../hooks/useAsync.js";
import { describeAwsError } from "../lib/errors.js";
import { formatTimestamp, truncate } from "../lib/format.js";
import { getLogEvents } from "../aws/logStreams.js";
import type { CloudWatchLogsClient } from "@aws-sdk/client-cloudwatch-logs";
import type { LogEvent } from "../types.js";

export type LogEventsViewProps = {
  client: CloudWatchLogsClient;
  logGroupName: string;
  logStreamName: string;
  isActive: boolean;
};

export function LogEventsView({
  client,
  logGroupName,
  logStreamName,
  isActive,
}: LogEventsViewProps) {
  const { data, loading, error, reload } = useAsync<LogEvent[]>(
    () => getLogEvents(client, logGroupName, logStreamName),
    [client, logGroupName, logStreamName],
  );

  const [cursor, setCursor] = useState(0);
  const [expanded, setExpanded] = useState(false);

  const events = data ?? [];
  // newest first
  const ordered = [...events].sort((a, b) => b.timestamp - a.timestamp);

  useInput(
    (input, key) => {
      if (key.downArrow || input === "j") {
        setCursor((c) => Math.min(ordered.length - 1, c + 1));
      } else if (key.upArrow || input === "k") {
        setCursor((c) => Math.max(0, c - 1));
      } else if (key.return) {
        setExpanded((v) => !v);
      } else if (input === "r") {
        reload();
      } else if (input === "g") {
        setCursor(0);
      } else if (input === "G") {
        setCursor(Math.max(0, ordered.length - 1));
      }
    },
    { isActive },
  );

  if (loading) {
    return (
      <Box>
        <Spinner label={`Loading events for ${logStreamName}…`} />
      </Box>
    );
  }
  if (error) {
    return <Text color="red">{describeAwsError(error)}</Text>;
  }

  const width = (process.stdout.columns ?? 80) - 30;
  const start = Math.max(0, Math.min(cursor - 8, ordered.length - 18));
  const visible = ordered.slice(start, start + 18);

  return (
    <Box flexDirection="column" flexGrow={1}>
      <Box>
        <Text bold color="green">
          Events
        </Text>
        <Text color="gray">
          {" "}
          ({logStreamName} — {ordered.length})
        </Text>
      </Box>
      <Box flexDirection="column" flexGrow={1}>
        {ordered.length === 0 ? (
          <Text color="gray">no events</Text>
        ) : (
          visible.map((e, idx) => {
            const realIdx = start + idx;
            const isSelected = realIdx === cursor;
            return (
              <Text
                key={`${e.timestamp}-${realIdx}`}
                color={isSelected ? "black" : undefined}
                backgroundColor={isSelected ? "cyan" : undefined}
              >
                {formatTimestamp(e.timestamp)}  {truncate(e.message.replace(/\n/g, " "), width)}
              </Text>
            );
          })
        )}
      </Box>
      {expanded && ordered[cursor] && (
        <Box flexDirection="column" borderStyle="round" borderColor="yellow">
          <Text bold>
            {formatTimestamp(ordered[cursor]!.timestamp)}
          </Text>
          <Text>{ordered[cursor]!.message}</Text>
        </Box>
      )}
    </Box>
  );
}
