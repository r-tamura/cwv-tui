import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "ink-testing-library";
import React from "react";
import type { CloudWatchClient } from "@aws-sdk/client-cloudwatch";
import type { Alarm } from "../../src/types.js";
import { stripAnsi } from "../helpers/ansi.js";

vi.mock("../../src/aws/alarms.js", () => ({
  listAlarms: vi.fn(),
  getAlarmsSummary: vi.fn(),
}));

import { AlarmsView } from "../../src/views/AlarmsView.js";
import { listAlarms } from "../../src/aws/alarms.js";

const fakeClient = {} as unknown as CloudWatchClient;

const SAMPLE: Alarm[] = [
  {
    name: "lambda-errors-high",
    state: "ALARM",
    namespace: "AWS/Lambda",
    metricName: "Errors",
  },
  {
    name: "api-latency-ok",
    state: "OK",
    namespace: "AWS/ApiGateway",
    metricName: "Latency",
  },
  {
    name: "sqs-depth-insufficient",
    state: "INSUFFICIENT_DATA",
    namespace: "AWS/SQS",
    metricName: "ApproximateNumberOfMessagesVisible",
  },
];

const ENTER = "\r";

function flush() {
  return new Promise<void>((r) => setImmediate(r));
}

describe("AlarmsView", () => {
  beforeEach(() => {
    vi.mocked(listAlarms).mockReset();
  });

  it("renders all alarm names after the list loads", async () => {
    vi.mocked(listAlarms).mockResolvedValueOnce(SAMPLE);

    const { lastFrame, unmount } = render(
      <AlarmsView client={fakeClient} isActive />,
    );
    await flush();
    await flush();

    const frame = stripAnsi(lastFrame());
    expect(frame).toContain("lambda-errors-high");
    expect(frame).toContain("api-latency-ok");
    expect(frame).toContain("sqs-depth-insufficient");
    unmount();
  });

  it("filters via / input", async () => {
    vi.mocked(listAlarms).mockResolvedValueOnce(SAMPLE);

    const { lastFrame, stdin, unmount } = render(
      <AlarmsView client={fakeClient} isActive />,
    );
    await flush();
    await flush();

    stdin.write("/");
    await flush();
    stdin.write("latency");
    await flush();

    const frame = stripAnsi(lastFrame());
    expect(frame).toContain("api-latency-ok");
    expect(frame).not.toContain("lambda-errors-high");
    expect(frame).not.toContain("sqs-depth-insufficient");
    unmount();
  });

  it("calls onOpenMetric with namespace and metric on Enter", async () => {
    vi.mocked(listAlarms).mockResolvedValueOnce(SAMPLE);
    const onOpenMetric = vi.fn();

    const { stdin, unmount } = render(
      <AlarmsView
        client={fakeClient}
        isActive
        onOpenMetric={onOpenMetric}
      />,
    );
    await flush();
    await flush();
    // Cursor starts on the first row; the ALARM-state row sorts first.
    stdin.write(ENTER);
    await flush();

    expect(onOpenMetric).toHaveBeenCalledTimes(1);
    expect(onOpenMetric).toHaveBeenCalledWith("AWS/Lambda", "Errors");
    unmount();
  });

  it("is a no-op on Enter when onOpenMetric is not provided", async () => {
    vi.mocked(listAlarms).mockResolvedValueOnce(SAMPLE);

    const { stdin, unmount } = render(
      <AlarmsView client={fakeClient} isActive />,
    );
    await flush();
    await flush();
    // Should not throw.
    stdin.write(ENTER);
    await flush();
    unmount();
  });

  it("shows the loading spinner before data arrives", async () => {
    let resolveFn: ((alarms: Alarm[]) => void) | undefined;
    vi.mocked(listAlarms).mockImplementationOnce(
      () =>
        new Promise<Alarm[]>((resolve) => {
          resolveFn = resolve;
        }),
    );

    const { lastFrame, unmount } = render(
      <AlarmsView client={fakeClient} isActive />,
    );
    await flush();

    expect(stripAnsi(lastFrame())).toContain("Loading alarms");
    resolveFn?.(SAMPLE);
    unmount();
  });

  it("renders the AWS error description when the list fetch fails", async () => {
    vi.mocked(listAlarms).mockRejectedValueOnce(
      Object.assign(new Error("denied"), { name: "AccessDeniedException" }),
    );

    const { lastFrame, unmount } = render(
      <AlarmsView client={fakeClient} isActive />,
    );
    await flush();
    await flush();

    const frame = stripAnsi(lastFrame());
    expect(frame).toContain("denied");
    expect(frame).toContain("Hint:");
    unmount();
  });
});
