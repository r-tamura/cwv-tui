import { describe, it, expect, beforeEach } from "vitest";
import { mockClient } from "aws-sdk-client-mock";
import {
  CloudWatchLogsClient,
  StartLiveTailCommand,
} from "@aws-sdk/client-cloudwatch-logs";
import { startLiveTail } from "../../src/aws/liveTail.js";

const mock = mockClient(CloudWatchLogsClient);

describe("startLiveTail", () => {
  beforeEach(() => mock.reset());

  it("yields parsed event batches from the SDK stream", async () => {
    async function* fakeStream() {
      yield { sessionStart: { sessionId: "s1" } };
      yield {
        sessionUpdate: {
          sessionResults: [
            { timestamp: 1, message: "a", logStreamName: "lsa" },
            { timestamp: 2, message: "b", logStreamName: "lsb" },
          ],
        },
      };
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mock.on(StartLiveTailCommand).resolves({ responseStream: fakeStream() as any });

    const got: { timestamp: number; message: string }[] = [];
    for await (const batch of startLiveTail(new CloudWatchLogsClient({}), {
      logGroupIdentifiers: ["arn:aws:logs:::log-group:/a"],
    })) {
      got.push(...batch);
      if (got.length >= 2) break;
    }
    expect(got.map((e) => e.message)).toEqual(["a", "b"]);
  });
});
