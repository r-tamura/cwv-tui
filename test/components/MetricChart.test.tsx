import { describe, expect, it } from "vitest";
import { render } from "ink-testing-library";
import React from "react";
import { MetricChart } from "../../src/components/MetricChart.js";
import type { Series, SeriesPoint } from "../../src/types.js";
import { stripAnsi } from "../helpers/ansi.js";

function pointsOf(values: Array<number | null>): SeriesPoint[] {
  const base = 1_700_000_000_000;
  return values.map((value, i) => ({ timestamp: base + i * 60_000, value }));
}

describe("MetricChart", () => {
  it("renders a loading row when series is undefined and loading is true", () => {
    const { lastFrame, unmount } = render(
      <MetricChart
        title="Errors"
        series={undefined}
        height={6}
        loading
      />,
    );
    const frame = stripAnsi(lastFrame());
    expect(frame).toContain("Errors");
    expect(frame).toContain("Loading");
    // No chart body axis glyph yet.
    expect(frame).not.toContain("┤");
    unmount();
  });

  it("renders a fetch-failed row when there is no prior series", () => {
    const { lastFrame, unmount } = render(
      <MetricChart
        title="Errors"
        series={undefined}
        height={6}
        error={new Error("AccessDenied")}
      />,
    );
    const frame = stripAnsi(lastFrame());
    expect(frame).toContain("Errors");
    expect(frame).toContain("fetch failed");
    expect(frame).toContain("AccessDenied");
    expect(frame).not.toContain("┤");
    unmount();
  });

  it("renders title, stat-derived header values, and an asciichart body for a 10-point series", () => {
    const series: Series = {
      chartId: "c1",
      label: "Errors p99",
      points: pointsOf([1, 2, 3, 4, 5, 4, 3, 2, 1, 5]),
    };
    const { lastFrame, unmount } = render(
      <MetricChart title="Errors" series={series} height={6} />,
    );
    const frame = stripAnsi(lastFrame() ?? "");
    // Header pieces.
    expect(frame).toContain("Errors");
    expect(frame).toContain("last=5.00");
    expect(frame).toContain("min=1.00");
    expect(frame).toContain("max=5.00");
    expect(frame).toContain("10 pts");
    // Body has at least one asciichart axis glyph.
    expect(frame).toMatch(/[┼┤]/);
    unmount();
  });

  it("handles mixed nulls without crashing and produces height-many body lines", () => {
    const series: Series = {
      chartId: "c2",
      label: "Mixed",
      points: pointsOf([1, null, 3, null, 5]),
    };
    const height = 5;
    const { lastFrame, unmount } = render(
      <MetricChart title="Errors" series={series} height={height} />,
    );
    const frame = (lastFrame() ?? "").trimEnd();
    const lines = frame.split("\n");
    // 1 header line + `height` body lines.
    expect(lines.length).toBeGreaterThanOrEqual(height + 1);
    expect(stripAnsi(frame)).toContain("Errors");
    unmount();
  });

  it("shows the selected indicator when selected is true", () => {
    const series: Series = {
      chartId: "c3",
      label: "Sel",
      points: pointsOf([1, 2, 3, 4, 5]),
    };
    const { lastFrame: framedSelected, unmount: unmountA } = render(
      <MetricChart title="Errors" series={series} height={5} selected />,
    );
    const { lastFrame: framedUnselected, unmount: unmountB } = render(
      <MetricChart title="Errors" series={series} height={5} />,
    );
    const selected = stripAnsi(framedSelected() ?? "");
    const unselected = stripAnsi(framedUnselected() ?? "");
    expect(selected).toContain("▌");
    expect(unselected).not.toContain("▌");
    unmountA();
    unmountB();
  });
});
