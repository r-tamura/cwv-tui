import { beforeEach, describe, expect, it } from "vitest";
import { mockClient } from "aws-sdk-client-mock";
import {
  CloudWatchLogsClient,
  GetQueryResultsCommand,
  StartQueryCommand,
  StopQueryCommand,
} from "@aws-sdk/client-cloudwatch-logs";
import {
  getInsightsResults,
  isTerminalStatus,
  nextPollDelay,
  startInsightsQuery,
  stopInsightsQuery,
} from "../../src/aws/insights.js";

const mock = mockClient(CloudWatchLogsClient);

describe("insights helpers", () => {
  beforeEach(() => mock.reset());

  it("startInsightsQuery passes epoch SECONDS, not ms", async () => {
    mock.on(StartQueryCommand).resolves({ queryId: "qid-123" });
    const id = await startInsightsQuery(new CloudWatchLogsClient({}), {
      logGroupNames: ["/aws/lambda/foo"],
      queryString: "fields @timestamp",
      startTimeMs: 1_700_000_000_000,
      endTimeMs: 1_700_000_010_000,
    });
    expect(id).toBe("qid-123");
    const call = mock.commandCalls(StartQueryCommand)[0]!;
    expect(call.args[0].input.startTime).toBe(1_700_000_000);
    expect(call.args[0].input.endTime).toBe(1_700_000_010);
  });

  it("getInsightsResults maps rows and statistics", async () => {
    mock.on(GetQueryResultsCommand).resolves({
      status: "Complete",
      results: [
        [
          { field: "@timestamp", value: "2026-05-20" },
          { field: "@message", value: "hello" },
        ],
      ],
      statistics: { recordsMatched: 1, recordsScanned: 100, bytesScanned: 9999 },
    });
    const res = await getInsightsResults(
      new CloudWatchLogsClient({}),
      "qid-1",
    );
    expect(res.status).toBe("Complete");
    expect(res.rows[0]?.[1]?.value).toBe("hello");
    expect(res.statistics?.bytesScanned).toBe(9999);
  });

  it("stopInsightsQuery swallows errors (best-effort)", async () => {
    mock.on(StopQueryCommand).rejects(new Error("nope"));
    await expect(
      stopInsightsQuery(new CloudWatchLogsClient({}), "q"),
    ).resolves.toBeUndefined();
  });

  it("isTerminalStatus matches all terminal states", () => {
    expect(isTerminalStatus("Complete")).toBe(true);
    expect(isTerminalStatus("Failed")).toBe(true);
    expect(isTerminalStatus("Cancelled")).toBe(true);
    expect(isTerminalStatus("Timeout")).toBe(true);
    expect(isTerminalStatus("Running")).toBe(false);
    expect(isTerminalStatus("Scheduled")).toBe(false);
  });

  it("nextPollDelay ramps from 1s → 2s → 5s", () => {
    expect(nextPollDelay(0)).toBe(1_000);
    expect(nextPollDelay(4_999)).toBe(1_000);
    expect(nextPollDelay(5_000)).toBe(2_000);
    expect(nextPollDelay(29_999)).toBe(2_000);
    expect(nextPollDelay(30_000)).toBe(5_000);
  });
});
