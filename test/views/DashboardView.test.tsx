import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "ink-testing-library";
import React from "react";
import type { CloudWatchClient } from "@aws-sdk/client-cloudwatch";
import type {
  ChartSpec,
  DashboardSpec,
  Series,
  TimeWindow,
} from "../../src/types.js";
import { stripAnsi } from "../helpers/ansi.js";

// Mock the hook so the view doesn't actually fetch.
vi.mock("../../src/hooks/useMetricSeries.js", () => ({
  useMetricSeries: vi.fn(),
}));

// Also mock the AWS metrics module so MetricChart / hook tests don't blow up
// if it gets transitively imported via the hook module path.
vi.mock("../../src/aws/metrics.js", () => ({
  getMetricSeriesBatch: vi.fn(),
  getMetricSeries: vi.fn(),
  derivePeriodSec: vi.fn(),
}));

import { useMetricSeries } from "../../src/hooks/useMetricSeries.js";
import { DashboardView } from "../../src/views/DashboardView.js";

const mockedHook = vi.mocked(useMetricSeries);

const fakeClient = {} as unknown as CloudWatchClient;

const chartA: ChartSpec = {
  id: "m0",
  title: "Errors",
  namespace: "AWS/Lambda",
  metric: "Errors",
  dimensions: { FunctionName: "foo" },
  stat: "Sum",
  height: 6,
  logGroups: ["/aws/lambda/foo"],
};
const chartB: ChartSpec = {
  id: "m1",
  title: "Duration p99",
  namespace: "AWS/Lambda",
  metric: "Duration",
  dimensions: { FunctionName: "foo" },
  stat: "p99",
  height: 6,
  logGroups: ["/aws/lambda/foo", "/aws/lambda/foo-errors"],
};

const dashboard: DashboardSpec = {
  id: "lambda-prod",
  title: "Lambda Production",
  charts: [chartA, chartB],
};

const window: TimeWindow = {
  startMs: Date.now() - 3_600_000,
  endMs: Date.now(),
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

function fixedState() {
  return {
    seriesByChart: new Map([
      ["m0", seriesA],
      ["m1", seriesB],
    ]),
    errorByChart: new Map<string, Error>(),
    loading: false,
    lastFetchAt: Date.now(),
    reload: vi.fn(),
  };
}

function flush() {
  return new Promise<void>((r) => setImmediate(r));
}

describe("DashboardView", () => {
  beforeEach(() => {
    mockedHook.mockReset();
    mockedHook.mockReturnValue(fixedState());
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders the dashboard title and one row per chart spec", async () => {
    const { lastFrame, unmount } = render(
      <DashboardView
        client={fakeClient}
        dashboard={dashboard}
        window={window}
        isActive
        onOpenInsights={() => {}}
        onChangeWindow={() => {}}
      />,
    );
    await flush();
    const frame = stripAnsi(lastFrame());
    expect(frame).toContain("Lambda Production");
    // One MetricChart per spec — each renders its title in the header line.
    for (const c of dashboard.charts) {
      expect(frame).toContain(c.title);
    }
    // Footer hint is present.
    expect(frame).toContain("Enter→Insights");
    unmount();
  });

  it("opens the TimeRangePicker on `t`", async () => {
    const { lastFrame, stdin, unmount } = render(
      <DashboardView
        client={fakeClient}
        dashboard={dashboard}
        window={window}
        isActive
        onOpenInsights={() => {}}
        onChangeWindow={() => {}}
      />,
    );
    await flush();
    stdin.write("t");
    await flush();
    const frame = stripAnsi(lastFrame());
    expect(frame).toContain("Time range");
    unmount();
  });

  it("Enter on a chart with logGroups calls onOpenInsights", async () => {
    const onOpenInsights = vi.fn();
    const { stdin, unmount } = render(
      <DashboardView
        client={fakeClient}
        dashboard={dashboard}
        window={window}
        isActive
        onOpenInsights={onOpenInsights}
        onChangeWindow={() => {}}
      />,
    );
    await flush();
    stdin.write("\r"); // Enter on the first chart (chartA)
    await flush();
    expect(onOpenInsights).toHaveBeenCalledTimes(1);
    expect(onOpenInsights.mock.calls[0]?.[0]).toEqual(chartA.logGroups);
    expect(onOpenInsights.mock.calls[0]?.[1]).toEqual(window);
    unmount();
  });

  it("Enter on the second chart passes that chart's logGroups", async () => {
    const onOpenInsights = vi.fn();
    const { stdin, unmount } = render(
      <DashboardView
        client={fakeClient}
        dashboard={dashboard}
        window={window}
        isActive
        onOpenInsights={onOpenInsights}
        onChangeWindow={() => {}}
      />,
    );
    await flush();
    stdin.write("j"); // move cursor to chart B
    await flush();
    stdin.write("\r");
    await flush();
    expect(onOpenInsights).toHaveBeenCalledTimes(1);
    expect(onOpenInsights.mock.calls[0]?.[0]).toEqual(chartB.logGroups);
    unmount();
  });

  it("`r` triggers reload()", async () => {
    const reload = vi.fn();
    mockedHook.mockReturnValue({ ...fixedState(), reload });
    const { stdin, unmount } = render(
      <DashboardView
        client={fakeClient}
        dashboard={dashboard}
        window={window}
        isActive
        onOpenInsights={() => {}}
        onChangeWindow={() => {}}
      />,
    );
    await flush();
    stdin.write("r");
    await flush();
    expect(reload).toHaveBeenCalledTimes(1);
    unmount();
  });

  it("`d` calls onSwitchDashboard if provided", async () => {
    const onSwitchDashboard = vi.fn();
    const { stdin, unmount } = render(
      <DashboardView
        client={fakeClient}
        dashboard={dashboard}
        window={window}
        isActive
        onOpenInsights={() => {}}
        onChangeWindow={() => {}}
        onSwitchDashboard={onSwitchDashboard}
      />,
    );
    await flush();
    stdin.write("d");
    await flush();
    expect(onSwitchDashboard).toHaveBeenCalledTimes(1);
    unmount();
  });
});
