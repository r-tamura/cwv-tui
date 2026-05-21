import { Box, Text, useInput } from "ink";
import React, { useState } from "react";
import { PRESETS, type RangeId } from "../lib/timeRange.js";
import { useVimNav } from "../hooks/useVimNav.js";
import { useTextInputLock } from "../state/inputContext.js";

export type TimeRangePickerProps = {
  /** Currently selected preset; cursor opens on this row. */
  current: RangeId;
  /** Only handle keys when active (matches the rest of the codebase pattern). */
  isActive: boolean;
  /** Called when Enter is pressed on a row. */
  onSelect: (id: RangeId) => void;
  /** Called when Esc is pressed. */
  onCancel: () => void;
};

export function TimeRangePicker({
  current,
  isActive,
  onSelect,
  onCancel,
}: TimeRangePickerProps) {
  const initialIndex = Math.max(
    0,
    PRESETS.findIndex((p) => p.id === current),
  );
  const [cursor, setCursor] = useState(initialIndex);

  // Suppress App's global Esc/q handler while the picker is open.
  useTextInputLock(isActive);

  useVimNav({
    length: PRESETS.length,
    pageSize: PRESETS.length,
    cursor,
    setCursor,
    isActive,
  });

  useInput(
    (_, key) => {
      if (key.return) {
        const picked = PRESETS[cursor];
        if (picked) onSelect(picked.id);
        return;
      }
      if (key.escape) {
        onCancel();
      }
    },
    { isActive },
  );

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="cyan"
      paddingX={1}
    >
      <Text bold color="cyan">
        Time range
      </Text>
      {PRESETS.map((p, i) => {
        const selected = i === cursor;
        const prefix = selected ? "> " : "  ";
        return (
          <Text key={p.id} color={selected ? "cyan" : undefined}>
            {prefix}
            {p.description}
          </Text>
        );
      })}
      <Text color="gray">[j/k move, Enter select, Esc cancel]</Text>
    </Box>
  );
}
