import { describe, it, expect } from "vitest";
import { render } from "ink-testing-library";
import React from "react";
import { LiveTailView } from "../../src/views/LiveTailView.js";
import type { CloudWatchLogsClient } from "@aws-sdk/client-cloudwatch-logs";
import type { LogEvent } from "../../src/types.js";
import { stripAnsi } from "../helpers/ansi.js";

const fakeClient = {} as unknown as CloudWatchLogsClient;

function flush(ms = 10) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

describe("LiveTailView", () => {
  it("renders header with status and log group name", async () => {
    async function* empty(): AsyncGenerator<LogEvent[], void, void> {
      /* no yields */
    }
    const { lastFrame, unmount } = render(
      <LiveTailView
        client={fakeClient}
        logGroupName="/aws/lambda/x"
        isActive
        subscribeOverride={() => empty()}
      />,
    );
    await flush();
    const frame = stripAnsi(lastFrame());
    expect(frame).toContain("Live Tail");
    expect(frame).toContain("/aws/lambda/x");
    unmount();
  });

  it("renders incoming event messages", async () => {
    async function* gen(): AsyncGenerator<LogEvent[], void, void> {
      yield [{ timestamp: Date.parse("2026-05-21T12:00:00Z"), message: "hello-world" }];
    }
    const { lastFrame, unmount } = render(
      <LiveTailView
        client={fakeClient}
        logGroupName="/aws/lambda/x"
        isActive
        subscribeOverride={() => gen()}
      />,
    );
    await flush(20);
    const frame = stripAnsi(lastFrame());
    expect(frame).toContain("hello-world");
    unmount();
  });
});
