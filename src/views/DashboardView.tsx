import { Box, Text, useInput } from "ink";
import React, { useState } from "react";
import type { CloudWatchClient } from "@aws-sdk/client-cloudwatch";
import { MetricChart } from "../components/MetricChart.js";
import { TimeRangePicker } from "../components/TimeRangePicker.js";
import { useMetricSeries } from "../hooks/useMetricSeries.js";
import { useVimNav } from "../hooks/useVimNav.js";
import { PRESETS, rangeWindowMs, type RangeId } from "../lib/timeRange.js";
import type { DashboardSpec, TimeWindow } from "../types.js";

export type DashboardViewProps = {
  client: CloudWatchClient;
  dashboard: DashboardSpec;
  /** Shared by all charts. */
  window: TimeWindow;
  isActive: boolean;
  /** Called when the user presses Enter on a chart with logGroups attached. */
  onOpenInsights: (logGroups: readonly string[], window: TimeWindow) => void;
  /** Called when the user requests a different time range. */
  onChangeWindow: (next: TimeWindow) => void;
  /** Called when the user wants to switch to another dashboard. */
  onSwitchDashboard?: () => void;
  /** Auto-refresh cadence; defaults to 30s per the design doc. */
  refreshSec?: number;
};

/** Minimum readable width per chart card. asciichart needs ~30 cells for
 * the body + axis labels to make sense; below that the chart degrades to
 * noise, so we fall back to fewer columns instead. */
const MIN_CARD_WIDTH = 32;
/** Hard cap regardless of terminal width — beyond five columns the
 * dashboard reads more like a wall than a grid. */
const MAX_COLUMNS = 5;

function pickColumnCount(terminalCols: number): number {
  const max = Math.max(1, Math.floor(terminalCols / MIN_CARD_WIDTH));
  return Math.min(MAX_COLUMNS, max);
}

/**
 * Best-effort: figure out which preset matches the current window so the
 * picker opens with its cursor on the right row. If none matches we fall
 * back to "1h" (the documented default).
 */
function inferRangeId(window: TimeWindow): RangeId {
  const span = window.endMs - window.startMs;
  let best: RangeId = "1h";
  let bestDelta = Number.POSITIVE_INFINITY;
  for (const p of PRESETS) {
    const delta = Math.abs(p.ms - span);
    if (delta < bestDelta) {
      bestDelta = delta;
      best = p.id;
    }
  }
  return best;
}

export function DashboardView({
  client,
  dashboard,
  window,
  isActive,
  onOpenInsights,
  onChangeWindow,
  onSwitchDashboard,
  refreshSec = 30,
}: DashboardViewProps) {
  const [paused, setPaused] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [cursor, setCursor] = useState(0);

  const charts = dashboard.charts;
  const { seriesByChart, errorByChart, loading, reload, lastFetchAt } =
    useMetricSeries({
      client,
      dashboard,
      window,
      refreshSec,
      paused,
    });

  // Keys are routed to either the picker or the dashboard, never both. The
  // picker uses useTextInputLock(true) internally to mute App's global Esc/q.
  const dashboardKeysActive = isActive && !pickerOpen;

  useVimNav({
    length: charts.length,
    pageSize: Math.max(1, charts.length),
    cursor,
    setCursor,
    isActive: dashboardKeysActive,
  });

  useInput(
    (input, key) => {
      if (key.return) {
        const spec = charts[cursor];
        if (spec && spec.logGroups.length > 0) {
          onOpenInsights(spec.logGroups, window);
        }
        return;
      }
      if (input === "t") {
        setPickerOpen(true);
        return;
      }
      if (input === "p") {
        setPaused((v) => !v);
        return;
      }
      if (input === "r") {
        reload();
        return;
      }
      if (input === "d") {
        onSwitchDashboard?.();
        return;
      }
    },
    { isActive: dashboardKeysActive },
  );

  const currentRange = inferRangeId(window);

  // Lay charts out left-to-right, wrapping into rows. The column count
  // tracks the terminal width so we get up to five charts side-by-side
  // on a wide monitor and gracefully fall back to a single column on
  // narrow ones. Cursor order stays linear (reading order).
  const terminalCols = process.stdout.columns ?? 100;
  const columnCount = pickColumnCount(terminalCols);
  const cardWidth = Math.max(MIN_CARD_WIDTH, Math.floor(terminalCols / columnCount));

  return (
    <Box flexDirection="column" flexGrow={1}>
      <Box>
        <Text bold color="green">
          {dashboard.title}
        </Text>
        <Text color="gray">
          {" "}
          ({charts.length} chart{charts.length === 1 ? "" : "s"}) [{currentRange}
          {paused ? " · paused" : ""}
          {loading ? " · refreshing…" : ""}
          {lastFetchAt ? "" : ""}]
        </Text>
      </Box>

      {pickerOpen ? (
        <TimeRangePicker
          current={currentRange}
          isActive={isActive && pickerOpen}
          onSelect={(id) => {
            setPickerOpen(false);
            onChangeWindow({ ...rangeWindowMs(id), periodSec: window.periodSec });
          }}
          onCancel={() => setPickerOpen(false)}
        />
      ) : null}

      {/*
        Yoga's flexbox handles the layout: each card declares its width,
        the parent flex-wraps at the terminal's edge. No manual chunking.
        Reading order (left→right, top→bottom) keeps Vim navigation linear.
      */}
      <Box flexDirection="row" flexWrap="wrap" flexGrow={1}>
        {charts.map((spec, i) => (
          <Box key={spec.id} flexDirection="column" width={cardWidth}>
            <MetricChart
              title={spec.title}
              series={seriesByChart.get(spec.id)}
              height={spec.height}
              width={cardWidth}
              loading={loading}
              selected={i === cursor}
              error={errorByChart.get(spec.id)}
            />
          </Box>
        ))}
      </Box>

      <Box>
        <Text color="gray">
          jk/^d/^u move  t range  r reload  p pause/resume  Enter→Insights  d
          dashboards
        </Text>
      </Box>
    </Box>
  );
}
