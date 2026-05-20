import { Box, Text } from "ink";
import React from "react";
import { FilterableList } from "../components/FilterableList.js";
import { Spinner } from "../components/Spinner.js";
import { useAsync } from "../hooks/useAsync.js";
import { describeAwsError } from "../lib/errors.js";
import { formatTimestamp } from "../lib/format.js";
import { listLogStreams } from "../aws/logStreams.js";
import type { CloudWatchLogsClient } from "@aws-sdk/client-cloudwatch-logs";
import type { LogStream } from "../types.js";

export type LogStreamsViewProps = {
  client: CloudWatchLogsClient;
  logGroupName: string;
  isActive: boolean;
  onSelect: (stream: LogStream) => void;
};

export function LogStreamsView({
  client,
  logGroupName,
  isActive,
  onSelect,
}: LogStreamsViewProps) {
  const { data, loading, error } = useAsync<LogStream[]>(
    () => listLogStreams(client, logGroupName),
    [client, logGroupName],
  );

  if (loading) {
    return (
      <Box>
        <Spinner label={`Loading streams for ${logGroupName}…`} />
      </Box>
    );
  }
  if (error) {
    return <Text color="red">{describeAwsError(error)}</Text>;
  }

  const items = data ?? [];

  return (
    <Box flexDirection="column" flexGrow={1}>
      <Box>
        <Text bold color="green">
          Log Streams
        </Text>
        <Text color="gray"> ({logGroupName})</Text>
      </Box>
      <FilterableList
        items={items}
        getKey={(s) => s.name}
        getLabel={(s) =>
          `${formatTimestamp(s.lastEventTime).padEnd(20)}  ${s.name}`
        }
        onSelect={onSelect}
        isActive={isActive}
        emptyText="no streams"
      />
    </Box>
  );
}
