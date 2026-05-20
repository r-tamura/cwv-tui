import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import React, { useEffect, useMemo, useState } from "react";
import { useTextInputLock } from "../state/inputContext.js";
import { truncate } from "../lib/format.js";

export type FilterableListProps<T> = {
  items: readonly T[];
  getKey: (item: T) => string;
  getLabel: (item: T) => string;
  onSelect: (item: T) => void;
  onSecondary?: (item: T) => void; // bound to `i` (Insights)
  isActive: boolean;
  emptyText?: string;
  height?: number;
};

export function FilterableList<T>({
  items,
  getKey,
  getLabel,
  onSelect,
  onSecondary,
  isActive,
  emptyText = "no items",
  height = 20,
}: FilterableListProps<T>) {
  const [filter, setFilter] = useState("");
  const [filterMode, setFilterMode] = useState(false);
  const [cursor, setCursor] = useState(0);

  useTextInputLock(filterMode);

  const filtered = useMemo(() => {
    if (!filter) return items;
    const f = filter.toLowerCase();
    return items.filter((it) => getLabel(it).toLowerCase().includes(f));
  }, [items, filter, getLabel]);

  useEffect(() => {
    if (cursor >= filtered.length) {
      setCursor(Math.max(0, filtered.length - 1));
    }
  }, [filtered.length, cursor]);

  useInput(
    (input, key) => {
      if (filterMode) {
        if (key.escape) {
          setFilterMode(false);
          setFilter("");
        } else if (key.return) {
          setFilterMode(false);
        }
        return;
      }
      if (input === "/") {
        setFilterMode(true);
        return;
      }
      if (key.downArrow || input === "j") {
        setCursor((c) => Math.min(filtered.length - 1, c + 1));
      } else if (key.upArrow || input === "k") {
        setCursor((c) => Math.max(0, c - 1));
      } else if (input === "g") {
        setCursor(0);
      } else if (input === "G") {
        setCursor(Math.max(0, filtered.length - 1));
      } else if (key.return) {
        const item = filtered[cursor];
        if (item) onSelect(item);
      } else if (input === "i" && onSecondary) {
        const item = filtered[cursor];
        if (item) onSecondary(item);
      }
    },
    { isActive },
  );

  const viewportStart = Math.max(
    0,
    Math.min(cursor - Math.floor(height / 2), filtered.length - height),
  );
  const visible = filtered.slice(viewportStart, viewportStart + height);

  return (
    <Box flexDirection="column" flexGrow={1}>
      <Box>
        <Text color="magenta">/ </Text>
        {filterMode ? (
          <TextInput value={filter} onChange={setFilter} />
        ) : (
          <Text color="gray">{filter || "(press / to filter)"}</Text>
        )}
      </Box>
      <Box flexDirection="column" flexGrow={1}>
        {filtered.length === 0 ? (
          <Text color="gray">{emptyText}</Text>
        ) : (
          visible.map((item, idx) => {
            const realIdx = viewportStart + idx;
            const isSelected = realIdx === cursor && !filterMode;
            const label = getLabel(item);
            return (
              <Text
                key={getKey(item)}
                color={isSelected ? "black" : undefined}
                backgroundColor={isSelected ? "cyan" : undefined}
              >
                {truncate(label, 100)}
              </Text>
            );
          })
        )}
      </Box>
      <Box>
        <Text color="gray">
          {filtered.length} / {items.length}
          {filterMode ? "  [Esc:cancel  Enter:apply]" : ""}
        </Text>
      </Box>
    </Box>
  );
}
