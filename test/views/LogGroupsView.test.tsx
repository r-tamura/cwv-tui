import { describe, expect, it, vi } from "vitest";
import { render } from "ink-testing-library";
import React from "react";
import { LogGroupsView } from "../../src/views/LogGroupsView.js";
import type { CloudWatchLogsClient } from "@aws-sdk/client-cloudwatch-logs";
import type { LogGroup } from "../../src/types.js";
import { stripAnsi } from "../helpers/ansi.js";

// We never call the real client because initialItems is provided.
const fakeClient = {} as unknown as CloudWatchLogsClient;

const ENTER = "\r";

function flush() {
  return new Promise<void>((r) => setImmediate(r));
}

describe("LogGroupsView", () => {
  const items: LogGroup[] = [
    { name: "/aws/lambda/foo-api", storedBytes: 1024 },
    { name: "/aws/lambda/bar-worker", storedBytes: 2048 },
    { name: "/aws/lambda/baz-cron", storedBytes: 512 },
  ];

  it("renders all items by default", async () => {
    const onSelect = vi.fn();
    const onOpenInsights = vi.fn();
    const { lastFrame, unmount } = render(
      <LogGroupsView
        client={fakeClient}
        isActive
        onSelect={onSelect}
        onOpenInsights={onOpenInsights}
        initialItems={items}
      />,
    );
    await flush();
    const frame = stripAnsi(lastFrame());
    expect(frame).toContain("foo-api");
    expect(frame).toContain("bar-worker");
    expect(frame).toContain("baz-cron");
    expect(frame).toContain("3 / 3");
    unmount();
  });

  it("filters via / input", async () => {
    const onSelect = vi.fn();
    const onOpenInsights = vi.fn();
    const { lastFrame, stdin, unmount } = render(
      <LogGroupsView
        client={fakeClient}
        isActive
        onSelect={onSelect}
        onOpenInsights={onOpenInsights}
        initialItems={items}
      />,
    );
    await flush();

    stdin.write("/");
    await flush();
    stdin.write("bar");
    await flush();

    const frame = stripAnsi(lastFrame());
    expect(frame).toContain("bar-worker");
    expect(frame).not.toContain("foo-api");
    expect(frame).not.toContain("baz-cron");
    unmount();
  });

  it("invokes onSelect for the highlighted item on Enter", async () => {
    const onSelect = vi.fn();
    const onOpenInsights = vi.fn();
    const { stdin, unmount } = render(
      <LogGroupsView
        client={fakeClient}
        isActive
        onSelect={onSelect}
        onOpenInsights={onOpenInsights}
        initialItems={items}
      />,
    );
    await flush();
    stdin.write(ENTER);
    await flush();
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0]?.[0]?.name).toBe("/aws/lambda/foo-api");
    unmount();
  });

  it("invokes onOpenInsights on `i`", async () => {
    const onSelect = vi.fn();
    const onOpenInsights = vi.fn();
    const { stdin, unmount } = render(
      <LogGroupsView
        client={fakeClient}
        isActive
        onSelect={onSelect}
        onOpenInsights={onOpenInsights}
        initialItems={items}
      />,
    );
    await flush();
    stdin.write("i");
    await flush();
    expect(onOpenInsights).toHaveBeenCalledTimes(1);
    expect(onOpenInsights.mock.calls[0]?.[0]?.name).toBe("/aws/lambda/foo-api");
    unmount();
  });
});
