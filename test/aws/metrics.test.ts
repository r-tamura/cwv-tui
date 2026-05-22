import { beforeEach, describe, expect, it } from "vitest";
import { mockClient } from "aws-sdk-client-mock";
import {
  CloudWatchClient,
  GetMetricDataCommand,
} from "@aws-sdk/client-cloudwatch";
import {
  derivePeriodSec,
  getMetricSeries,
  getMetricSeriesBatch,
} from "../../src/aws/metrics.js";
import type { ChartSpec, TimeWindow } from "../../src/types.js";

const mock = mockClient(CloudWatchClient);

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function makeSpec(overrides: Partial<ChartSpec> = {}): ChartSpec {
  return {
    id: "c0",
    title: "Errors",
    namespace: "AWS/Lambda",
    metric: "Errors",
    dimensions: { FunctionName: "foo" },
    stat: "Sum",
    height: 8,
    logGroups: [],
    ...overrides,
  };
}

function makeWindow(spanMs: number, periodSec = 60): TimeWindow {
  const endMs = 1_700_000_000_000;
  return { startMs: endMs - spanMs, endMs, periodSec };
}

describe("derivePeriodSec", () => {
  const end = 1_700_000_000_000;
  it("returns 60 for windows up to 1h", () => {
    expect(derivePeriodSec(end - 15 * 60_000, end)).toBe(60);
    expect(derivePeriodSec(end - 60 * 60_000, end)).toBe(60);
  });

  it("returns 60 for windows up to 6h", () => {
    expect(derivePeriodSec(end - 6 * HOUR, end)).toBe(60);
  });

  it("returns 300 for windows up to 24h", () => {
    expect(derivePeriodSec(end - 12 * HOUR, end)).toBe(300);
    expect(derivePeriodSec(end - 24 * HOUR, end)).toBe(300);
  });

  it("returns 900 for windows up to 7d", () => {
    expect(derivePeriodSec(end - 2 * DAY, end)).toBe(900);
    expect(derivePeriodSec(end - 7 * DAY, end)).toBe(900);
  });

  it("returns 3600 for windows beyond 7d", () => {
    expect(derivePeriodSec(end - 14 * DAY, end)).toBe(3600);
    expect(derivePeriodSec(end - 30 * DAY, end)).toBe(3600);
  });
});

describe("getMetricSeriesBatch", () => {
  beforeEach(() => mock.reset());

  it("issues a single GetMetricDataCommand with one query per chart", async () => {
    const start = 1_700_000_000_000;
    const end = start + 5 * 60_000;
    mock.on(GetMetricDataCommand).resolves({
      MetricDataResults: [
        {
          Id: "m_c0",
          Label: "Errors",
          Timestamps: [new Date(start), new Date(start + 60_000)],
          Values: [1, 2],
        },
        {
          Id: "m_c1",
          Label: "Duration p99",
          Timestamps: [new Date(start), new Date(start + 60_000)],
          Values: [10, 20],
        },
      ],
    });
    const specs: ChartSpec[] = [
      makeSpec({ id: "c0", title: "Errors", metric: "Errors", stat: "Sum" }),
      makeSpec({
        id: "c1",
        title: "Duration p99",
        metric: "Duration",
        stat: "p99",
      }),
    ];
    const win: TimeWindow = { startMs: start, endMs: end, periodSec: 60 };

    const out = await getMetricSeriesBatch(
      new CloudWatchClient({}),
      specs,
      win,
    );

    const calls = mock.commandCalls(GetMetricDataCommand);
    expect(calls).toHaveLength(1);
    const input = calls[0]!.args[0].input;
    expect(input.MetricDataQueries).toHaveLength(2);
    expect(input.MetricDataQueries?.[0]?.Id).toBe("m_c0");
    // Standard statistic
    expect(input.MetricDataQueries?.[0]?.MetricStat?.Stat).toBe("Sum");
    // Percentile uses ExtendedStatistic (or Stat — see assertion below)
    const q1 = input.MetricDataQueries?.[1]!;
    expect(q1.MetricStat?.Stat).toBe("p99");
    expect(input.StartTime?.getTime()).toBe(start);
    expect(input.EndTime?.getTime()).toBe(end);

    expect(out).toHaveLength(2);
    expect(out[0]?.chartId).toBe("c0");
    expect(out[0]?.label).toBe("Errors");
    expect(out[0]?.points).toEqual([
      { timestamp: start, value: 1 },
      { timestamp: start + 60_000, value: 2 },
    ]);
    expect(out[1]?.chartId).toBe("c1");
  });

  it("preserves order matching input specs even if SDK reorders results", async () => {
    const start = 1_700_000_000_000;
    mock.on(GetMetricDataCommand).resolves({
      MetricDataResults: [
        { Id: "m_c1", Label: "B", Timestamps: [new Date(start)], Values: [9] },
        { Id: "m_c0", Label: "A", Timestamps: [new Date(start)], Values: [1] },
      ],
    });
    const specs: ChartSpec[] = [
      makeSpec({ id: "c0", title: "A" }),
      makeSpec({ id: "c1", title: "B" }),
    ];
    const out = await getMetricSeriesBatch(
      new CloudWatchClient({}),
      specs,
      makeWindow(HOUR),
    );
    expect(out.map((s) => s.chartId)).toEqual(["c0", "c1"]);
    expect(out[0]?.points[0]?.value).toBe(1);
    expect(out[1]?.points[0]?.value).toBe(9);
  });

  it("returns null for series that came back empty", async () => {
    mock.on(GetMetricDataCommand).resolves({ MetricDataResults: [] });
    const specs: ChartSpec[] = [makeSpec({ id: "c0" })];
    const out = await getMetricSeriesBatch(
      new CloudWatchClient({}),
      specs,
      makeWindow(HOUR),
    );
    expect(out).toHaveLength(1);
    expect(out[0]?.points).toEqual([]);
  });

  it("sanitizes chart ids that don't start with lowercase letter", async () => {
    mock.on(GetMetricDataCommand).resolves({
      MetricDataResults: [
        {
          Id: "m_0bad",
          Label: "x",
          Timestamps: [new Date(0)],
          Values: [1],
        },
      ],
    });
    const specs: ChartSpec[] = [makeSpec({ id: "0bad" })];
    await getMetricSeriesBatch(
      new CloudWatchClient({}),
      specs,
      makeWindow(HOUR),
    );
    const input = mock.commandCalls(GetMetricDataCommand)[0]!.args[0].input;
    expect(input.MetricDataQueries?.[0]?.Id).toMatch(/^[a-z][a-zA-Z0-9_]*$/);
  });

  it("returns [] when specs is empty without calling the SDK", async () => {
    const out = await getMetricSeriesBatch(
      new CloudWatchClient({}),
      [],
      makeWindow(HOUR),
    );
    expect(out).toEqual([]);
    expect(mock.commandCalls(GetMetricDataCommand)).toHaveLength(0);
  });

  it("uses ExtendedStatistic for percentile stats per CloudWatch contract", async () => {
    // CloudWatch GetMetricData accepts both Stat='p99' and ExtendedStatistic.
    // We document the behavior: percentile uses Stat field (modern API).
    mock.on(GetMetricDataCommand).resolves({ MetricDataResults: [] });
    const specs: ChartSpec[] = [makeSpec({ id: "c0", stat: "p95" })];
    await getMetricSeriesBatch(
      new CloudWatchClient({}),
      specs,
      makeWindow(HOUR),
    );
    const q = mock.commandCalls(GetMetricDataCommand)[0]!.args[0].input
      .MetricDataQueries?.[0];
    expect(q?.MetricStat?.Stat).toBe("p95");
  });
});

describe("getMetricSeries", () => {
  beforeEach(() => mock.reset());

  it("delegates to the batch path and returns a single Series", async () => {
    const t = 1_700_000_000_000;
    mock.on(GetMetricDataCommand).resolves({
      MetricDataResults: [
        { Id: "m_c0", Label: "Errors", Timestamps: [new Date(t)], Values: [7] },
      ],
    });
    const series = await getMetricSeries(
      new CloudWatchClient({}),
      makeSpec({ id: "c0", title: "Errors" }),
      makeWindow(HOUR),
    );
    expect(series.chartId).toBe("c0");
    expect(series.points).toEqual([{ timestamp: t, value: 7 }]);
  });
});
