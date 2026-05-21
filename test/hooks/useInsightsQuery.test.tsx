import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "ink-testing-library";
import { Text } from "ink";
import React, { useEffect, useRef } from "react";
import { mockClient } from "aws-sdk-client-mock";
import {
  CloudWatchLogsClient,
  GetQueryResultsCommand,
  StartQueryCommand,
} from "@aws-sdk/client-cloudwatch-logs";
import { useInsightsQuery } from "../../src/hooks/useInsightsQuery.js";

const mock = mockClient(CloudWatchLogsClient);

function wait(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

type RunOpts = { startTimeMs?: number; endTimeMs?: number };

function Probe({
  client,
  logGroupName,
  query,
  opts,
}: {
  client: CloudWatchLogsClient;
  logGroupName: string;
  query: string;
  opts?: RunOpts;
}) {
  const { run } = useInsightsQuery({ client, logGroupName });
  const firedRef = useRef(false);
  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    void run(query, opts);
  }, [run, query, opts]);
  return <Text>probe</Text>;
}

describe("useInsightsQuery.run", () => {
  beforeEach(() => mock.reset());

  it("forwards startTimeMs/endTimeMs to StartQueryCommand", async () => {
    mock.on(StartQueryCommand).resolves({ queryId: "qid-1" });
    mock.on(GetQueryResultsCommand).resolves({
      status: "Complete",
      results: [],
      statistics: { recordsMatched: 0, recordsScanned: 0, bytesScanned: 0 },
    });

    const client = new CloudWatchLogsClient({});
    const { unmount } = render(
      <Probe
        client={client}
        logGroupName="/aws/lambda/foo"
        query="fields @timestamp"
        opts={{ startTimeMs: 1_700_000_000_000, endTimeMs: 1_700_000_010_000 }}
      />,
    );
    await wait(50);
    const calls = mock.commandCalls(StartQueryCommand);
    expect(calls.length).toBeGreaterThanOrEqual(1);
    const input = calls[0]!.args[0].input;
    expect(input.startTime).toBe(1_700_000_000);
    expect(input.endTime).toBe(1_700_000_010);
    unmount();
  });

  it("defaults to a 1-hour window when no opts are passed", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-21T12:00:00Z"));
    mock.on(StartQueryCommand).resolves({ queryId: "qid-2" });
    mock.on(GetQueryResultsCommand).resolves({
      status: "Complete",
      results: [],
    });

    const client = new CloudWatchLogsClient({});
    const { unmount } = render(
      <Probe
        client={client}
        logGroupName="/aws/lambda/bar"
        query="fields @timestamp"
      />,
    );
    await vi.advanceTimersByTimeAsync(50);
    const calls = mock.commandCalls(StartQueryCommand);
    expect(calls.length).toBeGreaterThanOrEqual(1);
    const input = calls[0]!.args[0].input;
    const nowSec = Math.floor(Date.parse("2026-05-21T12:00:00Z") / 1000);
    expect(input.endTime).toBe(nowSec);
    expect(input.startTime).toBe(nowSec - 3600);
    vi.useRealTimers();
    unmount();
  });
});
