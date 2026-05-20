import { Box, Text } from "ink";
import InkSpinner from "ink-spinner";
import React from "react";

export function Spinner({ label }: { label?: string }) {
  return (
    <Box>
      <Text color="green">
        <InkSpinner type="dots" />
      </Text>
      {label && <Text> {label}</Text>}
    </Box>
  );
}
