import { Box, Text } from "ink";
import React from "react";
import { FilterableList } from "../components/FilterableList.js";
import { Spinner } from "../components/Spinner.js";
import { useAsync } from "../hooks/useAsync.js";
import { describeAwsError } from "../lib/errors.js";
import { formatBytes } from "../lib/format.js";
import { listLogGroups } from "../aws/logGroups.js";
import type { CloudWatchLogsClient } from "@aws-sdk/client-cloudwatch-logs";
import type { LogGroup } from "../types.js";

export type LogGroupsViewProps = {
  client: CloudWatchLogsClient;
  isActive: boolean;
  onSelect: (group: LogGroup) => void;
  onOpenInsights: (group: LogGroup) => void;
  // optional injection for tests
  initialItems?: readonly LogGroup[];
};

export function LogGroupsView({
  client,
  isActive,
  onSelect,
  onOpenInsights,
  initialItems,
}: LogGroupsViewProps) {
  const { data, loading, error } = useAsync<LogGroup[]>(
    () => (initialItems ? Promise.resolve([...initialItems]) : listLogGroups(client)),
    [client],
  );

  if (loading && !initialItems) {
    return (
      <Box>
        <Spinner label="Loading log groups…" />
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
          Log Groups
        </Text>
        <Text color="gray"> ({items.length})</Text>
      </Box>
      <FilterableList
        items={items}
        getKey={(g) => g.name}
        getLabel={(g) =>
          `${g.name.padEnd(60)}  ${formatBytes(g.storedBytes).padStart(8)}`
        }
        onSelect={onSelect}
        onSecondary={onOpenInsights}
        isActive={isActive}
        emptyText="no log groups in this region"
      />
    </Box>
  );
}
