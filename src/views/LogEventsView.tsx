import { Box, Text, useInput } from "ink";
import React, { useState } from "react";
import { Spinner } from "../components/Spinner.js";
import { useAsync } from "../hooks/useAsync.js";
import { useVimNav } from "../hooks/useVimNav.js";
import { useTextInputLock } from "../state/inputContext.js";
import { describeAwsError } from "../lib/errors.js";
import { formatTimestamp } from "../lib/format.js";
import { getLogEvents } from "../aws/logStreams.js";
import type { CloudWatchLogsClient } from "@aws-sdk/client-cloudwatch-logs";
import type { LogEvent } from "../types.js";

export type LogEventsViewProps = {
  client: CloudWatchLogsClient;
  logGroupName: string;
  logStreamName: string;
  isActive: boolean;
};

const VISIBLE_ROWS = 18;

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
  const [detailScroll, setDetailScroll] = useState(0);

  const events = data ?? [];
  // newest first
  const ordered = [...events].sort((a, b) => b.timestamp - a.timestamp);
  const selected = ordered[cursor];

  // While the detail overlay is open, suppress the App's global Esc/q so we
  // can handle Esc as "close detail" instead.
  useTextInputLock(expanded);

  useVimNav({
    length: ordered.length,
    pageSize: VISIBLE_ROWS,
    cursor,
    setCursor,
    isActive: isActive && !expanded,
  });

  useInput(
    (input, key) => {
      if (expanded) {
        if (key.escape || input === "q" || key.return) {
          setExpanded(false);
          setDetailScroll(0);
          return;
        }
        if (key.downArrow || input === "j") {
          setDetailScroll((s) => s + 1);
        } else if (key.upArrow || input === "k") {
          setDetailScroll((s) => Math.max(0, s - 1));
        } else if (input === "g") {
          setDetailScroll(0);
        } else if (input === "G") {
          setDetailScroll(Number.MAX_SAFE_INTEGER);
        }
        return;
      }
      if (key.return) {
        if (selected) {
          setExpanded(true);
          setDetailScroll(0);
        }
      } else if (input === "r") {
        reload();
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

  if (expanded && selected) {
    return <EventDetail event={selected} scroll={detailScroll} />;
  }

  const start = Math.max(
    0,
    Math.min(cursor - Math.floor(VISIBLE_ROWS / 2), ordered.length - VISIBLE_ROWS),
  );
  const visible = ordered.slice(start, start + VISIBLE_ROWS);

  return (
    <Box flexDirection="column">
      <Box>
        <Text bold color="green">
          Events
        </Text>
        <Text color="gray">
          {" "}
          ({logStreamName} — {ordered.length})
        </Text>
      </Box>
      <Box flexDirection="column">
        {ordered.length === 0 ? (
          <Text color="gray">no events</Text>
        ) : (
          visible.map((e, idx) => {
            const realIdx = start + idx;
            const isSelected = realIdx === cursor;
            const line = `${formatTimestamp(e.timestamp)}  ${e.message.replace(/\s+/g, " ")}`;
            return (
              <Text
                key={`${e.timestamp}-${realIdx}`}
                color={isSelected ? "black" : undefined}
                backgroundColor={isSelected ? "cyan" : undefined}
                wrap="truncate-end"
              >
                {line}
              </Text>
            );
          })
        )}
      </Box>
    </Box>
  );
}

function EventDetail({ event, scroll }: { event: LogEvent; scroll: number }) {
  const rows = Math.max(5, (process.stdout.rows ?? 30) - 6);
  const lines = event.message.split(/\r?\n/);
  const maxScroll = Math.max(0, lines.length - rows);
  const start = Math.min(scroll, maxScroll);
  const visible = lines.slice(start, start + rows);
  return (
    <Box flexDirection="column">
      <Box>
        <Text bold color="yellow">
          Event detail
        </Text>
        <Text color="gray">
          {"  "}
          {formatTimestamp(event.timestamp)} — {lines.length} lines
          {maxScroll > 0 ? ` (line ${start + 1}/${lines.length})` : ""}
        </Text>
      </Box>
      <Box flexDirection="column" borderStyle="round" borderColor="yellow">
        {visible.map((line, i) => (
          <Text key={`${start}-${i}`} wrap="truncate-end">
            {line || " "}
          </Text>
        ))}
      </Box>
      <Text color="gray">[Esc/Enter:close  jk/gg/G:scroll]</Text>
    </Box>
  );
}
