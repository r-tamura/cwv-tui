import { Box, Text } from "ink";
import React from "react";

export type StatusBarProps = {
  region?: string;
  profile?: string;
  hints?: string;
  status?: string;
  error?: string;
};

export function StatusBar({
  region,
  profile,
  hints,
  status,
  error,
}: StatusBarProps) {
  return (
    <Box flexDirection="column" borderStyle="single" borderColor="gray">
      <Box justifyContent="space-between">
        <Box>
          <Text color="cyan">
            {profile ? `profile=${profile} ` : ""}
            {region ? `region=${region}` : "region=(default)"}
          </Text>
        </Box>
        <Box>
          {error ? (
            <Text color="red">{error}</Text>
          ) : status ? (
            <Text color="yellow">{status}</Text>
          ) : null}
        </Box>
      </Box>
      {hints && (
        <Box>
          <Text color="gray">{hints}</Text>
        </Box>
      )}
    </Box>
  );
}
