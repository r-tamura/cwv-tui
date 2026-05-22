import { Box, Text } from "ink";
import React from "react";

type Binding = { keys: string; description: string };

const GLOBAL: Binding[] = [
  { keys: "?", description: "Show this help" },
  { keys: "Tab / Shift+Tab", description: "Cycle top-level modes (Dashboard / Alarms / Logs)" },
  { keys: "q", description: "Quit (at top-level view)" },
  { keys: "Esc / Backspace", description: "Back to previous screen" },
];

const NAV: Binding[] = [
  { keys: "↑ ↓ / j k", description: "Line up / down" },
  { keys: "Ctrl+D / Ctrl+U", description: "Half page down / up" },
  { keys: "Ctrl+F / Ctrl+B", description: "Full page down / up" },
  { keys: "gg / G", description: "Jump to first / last" },
  { keys: "/", description: "Filter (incremental)" },
  { keys: "Enter", description: "Drill in / confirm" },
];

const VIEW_SPECIFIC: { title: string; bindings: Binding[] }[] = [
  {
    title: "Dashboard",
    bindings: [
      { keys: "t", description: "Choose time range (15m / 1h / 6h / 24h / 7d)" },
      { keys: "r", description: "Manual refresh" },
      { keys: "p", description: "Pause / resume auto-refresh" },
      { keys: "Enter", description: "Drill into Insights for the chart's logGroups" },
      { keys: "d", description: "Switch dashboard" },
    ],
  },
  {
    title: "Alarms",
    bindings: [
      { keys: "Enter", description: "Open the alarm's underlying metric (when available)" },
    ],
  },
  {
    title: "Log Groups",
    bindings: [
      { keys: "i", description: "Open Insights for highlighted group" },
      { keys: "t", description: "Open Live Tail for highlighted group" },
    ],
  },
  {
    title: "Live Tail",
    bindings: [
      { keys: "c", description: "Clear the on-screen buffer" },
      { keys: "Esc", description: "End the session and go back" },
    ],
  },
  {
    title: "Log Events",
    bindings: [
      { keys: "Enter", description: "Expand / collapse selected event" },
      { keys: "r", description: "Reload events" },
    ],
  },
  {
    title: "Insights",
    bindings: [
      { keys: "Enter (editing)", description: "Insert a newline in the query" },
      { keys: "Ctrl+R (editing)", description: "Run query" },
      { keys: "Esc (editing)", description: "Leave Insights" },
      { keys: "e", description: "Edit query" },
      { keys: "r", description: "Re-run last query" },
      { keys: "t", description: "Choose time range (15m / 1h / 6h / 24h / 7d)" },
      { keys: "Esc (running)", description: "Stop query and return to edit" },
    ],
  },
];

function Section({ title, bindings }: { title: string; bindings: Binding[] }) {
  const colWidth = Math.max(...bindings.map((b) => b.keys.length)) + 2;
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text bold color="yellow">
        {title}
      </Text>
      {bindings.map((b) => (
        <Text key={b.keys}>
          <Text color="cyan">{b.keys.padEnd(colWidth)}</Text>
          {b.description}
        </Text>
      ))}
    </Box>
  );
}

export function HelpDialog() {
  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor="yellow"
      paddingX={2}
      paddingY={1}
    >
      <Box marginBottom={1}>
        <Text bold color="green">
          Keyboard shortcuts
        </Text>
        <Text color="gray"> (press ? again or Esc to close)</Text>
      </Box>
      <Section title="Global" bindings={GLOBAL} />
      <Section title="Lists" bindings={NAV} />
      {VIEW_SPECIFIC.map((s) => (
        <Section key={s.title} title={s.title} bindings={s.bindings} />
      ))}
    </Box>
  );
}
