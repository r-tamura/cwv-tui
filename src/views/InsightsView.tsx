import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import React, { useState } from "react";
import { Spinner } from "../components/Spinner.js";
import { useInsightsQuery } from "../hooks/useInsightsQuery.js";
import { describeAwsError } from "../lib/errors.js";
import { formatBytes, truncate } from "../lib/format.js";
import type { CloudWatchLogsClient } from "@aws-sdk/client-cloudwatch-logs";

const DEFAULT_QUERY = "fields @timestamp, @message\n| sort @timestamp desc\n| limit 20";

export type InsightsViewProps = {
  client: CloudWatchLogsClient;
  logGroupName: string;
  isActive: boolean;
};

export function InsightsView({ client, logGroupName, isActive }: InsightsViewProps) {
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [editing, setEditing] = useState(true);
  const { state, run, stop } = useInsightsQuery({ client, logGroupName });

  useInput(
    (input, key) => {
      if (editing) {
        if (key.return) {
          setEditing(false);
          void run(query);
        }
        return;
      }
      if (key.escape) {
        if (state.phase === "running" || state.phase === "starting") {
          void stop();
        }
        setEditing(true);
      } else if (input === "e") {
        setEditing(true);
      } else if (input === "r" && state.phase === "done") {
        void run(query);
      }
    },
    { isActive },
  );

  const width = (process.stdout.columns ?? 100) - 25;

  return (
    <Box flexDirection="column" flexGrow={1}>
      <Box>
        <Text bold color="green">
          Insights
        </Text>
        <Text color="gray"> ({logGroupName})</Text>
      </Box>

      <Box flexDirection="column" borderStyle="single" borderColor="gray">
        <Text color="yellow">query:</Text>
        {editing ? (
          <TextInput value={query} onChange={setQuery} onSubmit={() => {
            setEditing(false);
            void run(query);
          }} />
        ) : (
          <Text>{query}</Text>
        )}
        {editing && (
          <Text color="gray">[Enter to run, Esc to cancel]</Text>
        )}
      </Box>

      {state.phase === "starting" && (
        <Spinner label="Starting query…" />
      )}

      {state.phase === "running" && (
        <Box flexDirection="column">
          <Spinner
            label={`Running… elapsed ${(
              (Date.now() - state.startedAt) /
              1000
            ).toFixed(1)}s`}
          />
          {state.statistics && (
            <Text color="gray">
              scanned {state.statistics.recordsScanned} records (
              {formatBytes(state.statistics.bytesScanned)}), matched{" "}
              {state.statistics.recordsMatched}
            </Text>
          )}
          <Text color="gray">[Esc to stop]</Text>
        </Box>
      )}

      {state.phase === "error" && (
        <Text color="red">{describeAwsError(state.error)}</Text>
      )}

      {state.phase === "done" && (
        <Box flexDirection="column" flexGrow={1}>
          <Text color={state.status === "Complete" ? "green" : "red"}>
            {state.status} in {(state.elapsedMs / 1000).toFixed(1)}s — {state.rows.length} rows
            {state.statistics &&
              ` (scanned ${state.statistics.recordsScanned}, ${formatBytes(
                state.statistics.bytesScanned,
              )})`}
          </Text>
          <Box flexDirection="column">
            {state.rows.slice(0, 30).map((row, i) => {
              const joined = row
                .filter((f) => f.field !== "@ptr")
                .map((f) => `${f.field}=${f.value}`)
                .join(" | ");
              return (
                <Text key={i}>{truncate(joined, width)}</Text>
              );
            })}
            {state.rows.length > 30 && (
              <Text color="gray">… {state.rows.length - 30} more rows</Text>
            )}
          </Box>
          <Text color="gray">[e:edit  r:rerun  Esc:edit]</Text>
        </Box>
      )}
    </Box>
  );
}
