import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import React, { useState } from "react";
import { Spinner } from "../components/Spinner.js";
import { TimeRangePicker } from "../components/TimeRangePicker.js";
import { useInsightsQuery } from "../hooks/useInsightsQuery.js";
import { useTextInputLock } from "../state/inputContext.js";
import { describeAwsError } from "../lib/errors.js";
import { formatBytes } from "../lib/format.js";
import {
  presetById,
  rangeWindowMs,
  type RangeId,
} from "../lib/timeRange.js";
import type { CloudWatchLogsClient } from "@aws-sdk/client-cloudwatch-logs";

const DEFAULT_QUERY = "fields @timestamp, @message\n| sort @timestamp desc\n| limit 20";

export type InsightsViewProps = {
  client: CloudWatchLogsClient;
  logGroupName: string;
  isActive: boolean;
  onClose: () => void;
};

export function InsightsView({
  client,
  logGroupName,
  isActive,
  onClose,
}: InsightsViewProps) {
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [editing, setEditing] = useState(true);
  const [range, setRange] = useState<RangeId>("1h");
  const [pickerOpen, setPickerOpen] = useState(false);
  const { state, run, stop } = useInsightsQuery({ client, logGroupName });

  useTextInputLock(editing);

  const runWithRange = (q: string, id: RangeId) => {
    const { startMs, endMs } = rangeWindowMs(id);
    void run(q, { startTimeMs: startMs, endTimeMs: endMs });
  };

  useInput(
    (input, key) => {
      // The picker owns its own keys while it's open.
      if (pickerOpen) return;
      if (editing) {
        // While the App's global Esc is suppressed by the text-input lock,
        // we handle Esc here so the user can leave Insights from edit mode.
        if (key.escape) {
          onClose();
          return;
        }
        if (key.return) {
          setEditing(false);
          runWithRange(query, range);
        }
        return;
      }
      // Not editing: App handles Esc (POP). For running queries, also stop.
      if (key.escape && (state.phase === "running" || state.phase === "starting")) {
        void stop();
        // App will also POP this route; unmount cleanup will stop again (no-op).
      }
      if (input === "e") {
        setEditing(true);
      } else if (input === "r" && state.phase === "done") {
        runWithRange(query, range);
      } else if (input === "t") {
        setPickerOpen(true);
      }
    },
    { isActive },
  );

  const rangeLabel = presetById(range)?.label ?? range;

  return (
    <Box flexDirection="column" flexGrow={1}>
      <Box>
        <Text bold color="green">
          Insights
        </Text>
        <Text color="gray"> ({logGroupName}) </Text>
        <Text color="cyan">[{rangeLabel} ▼]</Text>
        {!editing && !pickerOpen && (
          <Text color="gray"> press t to change</Text>
        )}
      </Box>

      {pickerOpen && (
        <TimeRangePicker
          current={range}
          isActive={pickerOpen && isActive}
          onSelect={(id) => {
            setRange(id);
            setPickerOpen(false);
            runWithRange(query, id);
          }}
          onCancel={() => setPickerOpen(false)}
        />
      )}

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
                <Text key={i} wrap="truncate-end">{joined}</Text>
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
