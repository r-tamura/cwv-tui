import { Box, Text } from "ink";
import React from "react";
// asciichart ships no types; declare the slice we use.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — see asciichartShim below.
import asciichartRaw from "asciichart";
import type { Series } from "../types.js";

type AsciichartPlotOpts = {
  height?: number;
  min?: number;
  max?: number;
  offset?: number;
  padding?: string;
  colors?: string[];
};
type AsciichartModule = {
  plot: (series: number[] | number[][], opts?: AsciichartPlotOpts) => string;
};
const asciichart = asciichartRaw as unknown as AsciichartModule;

export type MetricChartProps = {
  title: string;
  series: Series | undefined;
  height: number;
  /** When the parent shows a refresh-in-flight indicator. */
  loading?: boolean;
  /** When true, the row is rendered with a selected indicator (▌ + accent). */
  selected?: boolean;
  /** Non-null when the most recent fetch failed; previous series is kept. */
  error?: Error;
};

const SELECTED_INDICATOR = "▌ ";
const UNSELECTED_INDICATOR = "  ";

/** Format a finite number for the stats line; fall back to em-dash for none. */
function fmt(n: number | null): string {
  return n == null || !Number.isFinite(n) ? "—" : n.toFixed(2);
}

/** Reduce a series to last / min / max / count of non-null points. */
function summarize(series: Series): {
  last: number | null;
  min: number | null;
  max: number | null;
  count: number;
} {
  let last: number | null = null;
  let min: number | null = null;
  let max: number | null = null;
  let count = 0;
  for (const { value } of series.points) {
    if (value == null || !Number.isFinite(value)) continue;
    last = value;
    if (min == null || value < min) min = value;
    if (max == null || value > max) max = value;
    count++;
  }
  return { last, min, max, count };
}

/**
 * Compute the numeric array fed to asciichart. asciichart can't represent true
 * gaps (any NaN poisons its Math.min/max), so we carry the last-known-good
 * value forward; if a series starts with nulls, we fall back to 0.
 */
function toPlotValues(series: Series): number[] {
  const out: number[] = [];
  let lastGood = 0;
  let seenGood = false;
  for (const { value } of series.points) {
    if (value != null && Number.isFinite(value)) {
      lastGood = value;
      seenGood = true;
      out.push(value);
    } else {
      out.push(seenGood ? lastGood : 0);
    }
  }
  return out;
}

/**
 * Single chart row for the metrics dashboard. Presentational only — selection
 * and keystrokes are owned by the parent view.
 *
 * Layout:
 *   {indicator}{title}  last=…  min=…  max=…  ({n} pts)   ← truncated, never wraps
 *   <asciichart body, one Text-per-line so wide chars never reflow>
 */
export function MetricChart({
  title,
  series,
  height,
  loading,
  selected,
  error,
}: MetricChartProps) {
  const indicator = selected ? SELECTED_INDICATOR : UNSELECTED_INDICATOR;

  // Pure-error state: no prior data to show.
  if (error && !series) {
    const reason = error.message ? `: ${error.message}` : "";
    return (
      <Box flexDirection="column">
        <Text wrap="truncate-end">
          <Text>{indicator}</Text>
          <Text bold={selected}>{title}</Text>
          <Text color="red">{`  [fetch failed${reason}]`}</Text>
        </Text>
      </Box>
    );
  }

  // Pure-loading state: no prior data.
  if (loading && !series) {
    return (
      <Box flexDirection="column">
        <Text wrap="truncate-end">
          <Text>{indicator}</Text>
          <Text bold={selected}>{title}</Text>
          <Text dimColor>{"  Loading…"}</Text>
        </Text>
      </Box>
    );
  }

  // From here on `series` is defined.
  if (!series) {
    // Defensive: nothing to render and no flags set.
    return (
      <Box>
        <Text wrap="truncate-end">
          {indicator}
          {title}
        </Text>
      </Box>
    );
  }

  const { last, min, max, count } = summarize(series);
  const headerStats = `  last=${fmt(last)}  min=${fmt(min)}  max=${fmt(max)}  (${count} pts)`;
  const errorSuffix = error
    ? `  [fetch failed${error.message ? `: ${error.message}` : ""}]`
    : "";

  // No usable data → header only, no chart body.
  if (count === 0) {
    return (
      <Box flexDirection="column">
        <Text wrap="truncate-end">
          <Text>{indicator}</Text>
          <Text bold={selected}>{title}</Text>
          <Text>{headerStats}</Text>
          {errorSuffix && <Text color="red">{errorSuffix}</Text>}
        </Text>
      </Box>
    );
  }

  // Render body.
  const values = toPlotValues(series);
  // asciichart's `height` option = rows - 1; clamp to ≥ 1 so we always plot.
  const plotHeight = Math.max(1, height - 1);
  const body = asciichart.plot(values, { height: plotHeight });
  const bodyLines = body.split("\n");

  return (
    <Box flexDirection="column">
      <Text wrap="truncate-end">
        <Text>{indicator}</Text>
        <Text bold={selected}>{title}</Text>
        <Text>{headerStats}</Text>
        {errorSuffix && <Text color="red">{errorSuffix}</Text>}
      </Text>
      <Box flexDirection="column">
        {bodyLines.map((line: string, i: number) => (
          <Text key={i} wrap="truncate-end">
            {line}
          </Text>
        ))}
      </Box>
    </Box>
  );
}
