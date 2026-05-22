import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "ink-testing-library";
import { Box, Text } from "ink";
import React from "react";
import type { CloudWatchClient } from "@aws-sdk/client-cloudwatch";
import type { AlarmsSummary } from "../../src/types.js";

vi.mock("../../src/aws/alarms.js", () => ({
  getAlarmsSummary: vi.fn(),
  listAlarms: vi.fn(),
}));

import { useAlarmsSummary } from "../../src/hooks/useAlarmsSummary.js";
import { getAlarmsSummary } from "../../src/aws/alarms.js";

type ProbeState = {
  summary: AlarmsSummary | undefined;
  loading: boolean;
  errorMessage: string;
};

const captured: { state: ProbeState | undefined; reload: () => void } = {
  state: undefined,
  reload: () => {},
};

function Probe({
  client,
  refreshMs,
}: {
  client: CloudWatchClient;
  refreshMs?: number;
}) {
  const { summary, loading, error, reload } = useAlarmsSummary({
    client,
    refreshMs,
  });
  captured.state = {
    summary,
    loading,
    errorMessage: error ? error.message : "",
  };
  captured.reload = reload;
  return (
    <Box flexDirection="column">
      <Text>loading={loading ? "1" : "0"}</Text>
      <Text>alarm={summary ? String(summary.alarm) : "-"}</Text>
      <Text>err={error ? error.message : ""}</Text>
    </Box>
  );
}

const fakeClient = {} as unknown as CloudWatchClient;

/**
 * Drains microtasks and any zero-delay timer callbacks that Ink/React rely on
 * to commit state updates. With fake timers active we must tick the timer
 * queue, not just await Promise.resolve(), or the renderer never sees the
 * post-fetch setState.
 */
async function flushMicro() {
  for (let i = 0; i < 5; i++) {
    await Promise.resolve();
  }
  await vi.advanceTimersByTimeAsync(0);
  for (let i = 0; i < 5; i++) {
    await Promise.resolve();
  }
}

describe("useAlarmsSummary", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(getAlarmsSummary).mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("loads the summary on mount", async () => {
    const summary: AlarmsSummary = {
      ok: 5,
      alarm: 2,
      insufficient: 0,
      topAlarming: ["a", "b"],
    };
    vi.mocked(getAlarmsSummary).mockResolvedValueOnce(summary);

    const { unmount } = render(<Probe client={fakeClient} />);
    await flushMicro();

    expect(captured.state?.summary).toEqual(summary);
    expect(captured.state?.loading).toBe(false);
    expect(vi.mocked(getAlarmsSummary)).toHaveBeenCalledTimes(1);
    unmount();
  });

  it("refetches on the interval tick", async () => {
    const first: AlarmsSummary = {
      ok: 5,
      alarm: 1,
      insufficient: 0,
      topAlarming: ["a"],
    };
    const second: AlarmsSummary = {
      ok: 5,
      alarm: 3,
      insufficient: 0,
      topAlarming: ["a", "b", "c"],
    };
    vi.mocked(getAlarmsSummary)
      .mockResolvedValueOnce(first)
      .mockResolvedValueOnce(second);

    const { unmount } = render(<Probe client={fakeClient} />);
    await flushMicro();
    expect(captured.state?.summary).toEqual(first);

    await vi.advanceTimersByTimeAsync(60_000);
    await flushMicro();

    expect(vi.mocked(getAlarmsSummary)).toHaveBeenCalledTimes(2);
    expect(captured.state?.summary).toEqual(second);
    unmount();
  });

  it("keeps the previous summary when a refresh fails", async () => {
    const first: AlarmsSummary = {
      ok: 1,
      alarm: 0,
      insufficient: 0,
      topAlarming: [],
    };
    vi.mocked(getAlarmsSummary)
      .mockResolvedValueOnce(first)
      .mockRejectedValueOnce(new Error("throttled"));

    const { unmount } = render(<Probe client={fakeClient} />);
    await flushMicro();
    expect(captured.state?.summary).toEqual(first);

    await vi.advanceTimersByTimeAsync(60_000);
    await flushMicro();

    expect(captured.state?.summary).toEqual(first);
    expect(captured.state?.errorMessage).toBe("throttled");
    unmount();
  });

  it("stops polling after unmount", async () => {
    vi.mocked(getAlarmsSummary).mockResolvedValue({
      ok: 0,
      alarm: 0,
      insufficient: 0,
      topAlarming: [],
    });

    const { unmount } = render(<Probe client={fakeClient} />);
    await flushMicro();
    expect(vi.mocked(getAlarmsSummary)).toHaveBeenCalledTimes(1);

    unmount();
    await vi.advanceTimersByTimeAsync(180_000);
    await flushMicro();

    expect(vi.mocked(getAlarmsSummary)).toHaveBeenCalledTimes(1);
  });

  it("reload() triggers an immediate refresh", async () => {
    const first: AlarmsSummary = {
      ok: 1,
      alarm: 0,
      insufficient: 0,
      topAlarming: [],
    };
    const second: AlarmsSummary = {
      ok: 1,
      alarm: 1,
      insufficient: 0,
      topAlarming: ["x"],
    };
    vi.mocked(getAlarmsSummary)
      .mockResolvedValueOnce(first)
      .mockResolvedValueOnce(second);

    const { unmount } = render(<Probe client={fakeClient} />);
    await flushMicro();
    expect(captured.state?.summary).toEqual(first);

    captured.reload();
    await flushMicro();

    expect(vi.mocked(getAlarmsSummary)).toHaveBeenCalledTimes(2);
    expect(captured.state?.summary).toEqual(second);
    unmount();
  });
});
