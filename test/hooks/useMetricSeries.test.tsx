import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "ink-testing-library";
import { Box, Text } from "ink";
import React from "react";
import type { CloudWatchClient } from "@aws-sdk/client-cloudwatch";
import { useMetricSeries } from "../../src/hooks/useMetricSeries.js";
import type {
  ChartSpec,
  DashboardSpec,
  Series,
  TimeWindow,
} from "../../src/types.js";

vi.mock("../../src/aws/metrics.js", () => ({
  getMetricSeriesBatch: vi.fn(),
  // The hook only uses getMetricSeriesBatch, but the module exports more — stub them.
  getMetricSeries: vi.fn(),
  derivePeriodSec: vi.fn(),
}));

import { getMetricSeriesBatch } from "../../src/aws/metrics.js";

const mockedBatch = vi.mocked(getMetricSeriesBatch);

const fakeClient = {} as unknown as CloudWatchClient;

const chartA: ChartSpec = {
  id: "m0",
  title: "Errors",
  namespace: "AWS/Lambda",
  metric: "Errors",
  dimensions: { FunctionName: "foo" },
  stat: "Sum",
  height: 8,
  logGroups: ["/aws/lambda/foo"],
};
const chartB: ChartSpec = {
  id: "m1",
  title: "Duration",
  namespace: "AWS/Lambda",
  metric: "Duration",
  dimensions: { FunctionName: "foo" },
  stat: "p99",
  height: 8,
  logGroups: ["/aws/lambda/foo"],
};

const dashboard: DashboardSpec = {
  id: "lambda-prod",
  title: "Lambda Production",
  charts: [chartA, chartB],
};

const window: TimeWindow = {
  startMs: 1_000_000,
  endMs: 1_003_600,
  periodSec: 60,
};

const seriesA: Series = {
  chartId: "m0",
  label: "Errors",
  points: [{ timestamp: 1, value: 2 }],
};
const seriesB: Series = {
  chartId: "m1",
  label: "Duration",
  points: [{ timestamp: 1, value: 100 }],
};

type ProbeState = ReturnType<typeof useMetricSeries> | undefined;

function Probe({
  capture,
  paused,
  refreshSec,
}: {
  capture: (s: ProbeState) => void;
  paused: boolean;
  refreshSec: number;
}) {
  const state = useMetricSeries({
    client: fakeClient,
    dashboard,
    window,
    refreshSec,
    paused,
  });
  capture(state);
  return (
    <Box>
      <Text>{state.loading ? "loading" : "idle"}</Text>
    </Box>
  );
}

// Wait long enough for in-flight promises + React commits to settle. Using
// fake timers means `await Promise.resolve()` alone doesn't always interleave
// with Ink's render scheduling — advancing the fake clock by 0 ticks does.
async function flushMicrotasks() {
  await vi.advanceTimersByTimeAsync(0);
  await vi.advanceTimersByTimeAsync(0);
}

describe("useMetricSeries", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockedBatch.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("performs an initial fetch and stores per-chart series", async () => {
    mockedBatch.mockResolvedValueOnce([seriesA, seriesB]);

    let last: ProbeState;
    const { unmount } = render(
      <Probe
        paused={false}
        refreshSec={30}
        capture={(s) => {
          last = s;
        }}
      />,
    );

    await flushMicrotasks();

    expect(mockedBatch).toHaveBeenCalledTimes(1);
    expect(mockedBatch).toHaveBeenCalledWith(fakeClient, dashboard.charts, window);
    expect(last?.seriesByChart.get("m0")).toEqual(seriesA);
    expect(last?.seriesByChart.get("m1")).toEqual(seriesB);
    expect(last?.errorByChart.size).toBe(0);
    expect(last?.loading).toBe(false);
    expect(last?.lastFetchAt).toBeTypeOf("number");

    unmount();
  });

  it("re-fetches on the refresh interval", async () => {
    mockedBatch.mockResolvedValue([seriesA, seriesB]);

    let last: ProbeState;
    const { unmount } = render(
      <Probe
        paused={false}
        refreshSec={30}
        capture={(s) => {
          last = s;
        }}
      />,
    );

    await flushMicrotasks();
    expect(mockedBatch).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(30_000);
    await flushMicrotasks();
    expect(mockedBatch).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(30_000);
    await flushMicrotasks();
    expect(mockedBatch).toHaveBeenCalledTimes(3);

    expect(last?.seriesByChart.get("m0")).toEqual(seriesA);

    unmount();
  });

  it("retains previous series on rejection and populates errorByChart", async () => {
    const err = new Error("boom");
    mockedBatch
      .mockResolvedValueOnce([seriesA, seriesB])
      .mockRejectedValueOnce(err);

    let last: ProbeState;
    const { unmount } = render(
      <Probe
        paused={false}
        refreshSec={30}
        capture={(s) => {
          last = s;
        }}
      />,
    );
    await flushMicrotasks();
    expect(last?.seriesByChart.size).toBe(2);

    await vi.advanceTimersByTimeAsync(30_000);
    await flushMicrotasks();

    expect(mockedBatch).toHaveBeenCalledTimes(2);
    // Previous series retained
    expect(last?.seriesByChart.get("m0")).toEqual(seriesA);
    expect(last?.seriesByChart.get("m1")).toEqual(seriesB);
    // Error populated for every chart in the dashboard
    expect(last?.errorByChart.get("m0")).toBe(err);
    expect(last?.errorByChart.get("m1")).toBe(err);
    expect(last?.loading).toBe(false);

    unmount();
  });

  it("does not fetch when paused=true", async () => {
    mockedBatch.mockResolvedValue([seriesA, seriesB]);

    const { unmount } = render(
      <Probe paused={true} refreshSec={30} capture={() => {}} />,
    );
    await flushMicrotasks();
    await vi.advanceTimersByTimeAsync(60_000);
    await flushMicrotasks();

    expect(mockedBatch).toHaveBeenCalledTimes(0);
    unmount();
  });

  it("clears the interval on unmount", async () => {
    mockedBatch.mockResolvedValue([seriesA, seriesB]);

    const { unmount } = render(
      <Probe paused={false} refreshSec={30} capture={() => {}} />,
    );
    await flushMicrotasks();
    expect(mockedBatch).toHaveBeenCalledTimes(1);

    unmount();

    await vi.advanceTimersByTimeAsync(120_000);
    await flushMicrotasks();
    // No further calls after unmount.
    expect(mockedBatch).toHaveBeenCalledTimes(1);
  });

  it("reload() triggers an immediate out-of-band fetch", async () => {
    mockedBatch.mockResolvedValue([seriesA, seriesB]);

    let last: ProbeState;
    const { unmount } = render(
      <Probe
        paused={false}
        refreshSec={30}
        capture={(s) => {
          last = s;
        }}
      />,
    );
    await flushMicrotasks();
    expect(mockedBatch).toHaveBeenCalledTimes(1);

    last?.reload();
    await flushMicrotasks();
    expect(mockedBatch).toHaveBeenCalledTimes(2);

    unmount();
  });
});
