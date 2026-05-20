import { beforeEach, describe, expect, it } from "vitest";
import { mockClient } from "aws-sdk-client-mock";
import {
  CloudWatchLogsClient,
  DescribeLogGroupsCommand,
} from "@aws-sdk/client-cloudwatch-logs";
import { listLogGroups } from "../../src/aws/logGroups.js";

const mock = mockClient(CloudWatchLogsClient);

describe("listLogGroups", () => {
  beforeEach(() => {
    mock.reset();
  });

  it("flattens pages from the paginator into LogGroup[]", async () => {
    mock
      .on(DescribeLogGroupsCommand)
      .resolvesOnce({
        logGroups: [
          { logGroupName: "/aws/lambda/a", storedBytes: 100 },
          { logGroupName: "/aws/lambda/b", storedBytes: 200 },
        ],
        nextToken: "t1",
      })
      .resolvesOnce({
        logGroups: [{ logGroupName: "/aws/lambda/c", storedBytes: 300 }],
      });

    const result = await listLogGroups(new CloudWatchLogsClient({}));

    expect(result.map((g) => g.name)).toEqual([
      "/aws/lambda/a",
      "/aws/lambda/b",
      "/aws/lambda/c",
    ]);
    expect(result[0]?.storedBytes).toBe(100);
  });

  it("skips entries with missing logGroupName", async () => {
    mock.on(DescribeLogGroupsCommand).resolves({
      logGroups: [{ logGroupName: "/keep" }, { logGroupName: undefined }],
    });

    const result = await listLogGroups(new CloudWatchLogsClient({}));
    expect(result.map((g) => g.name)).toEqual(["/keep"]);
  });

  it("propagates SDK errors", async () => {
    mock.on(DescribeLogGroupsCommand).rejects(new Error("boom"));
    await expect(listLogGroups(new CloudWatchLogsClient({}))).rejects.toThrow("boom");
  });
});
