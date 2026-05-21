import { describe, expect, it, vi } from "vitest";
import { render } from "ink-testing-library";
import React from "react";
import { TimeRangePicker } from "../../src/components/TimeRangePicker.js";
import { stripAnsi } from "../helpers/ansi.js";

function flush(ms = 0) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

describe("TimeRangePicker", () => {
  it("renders all preset labels", async () => {
    const { lastFrame, unmount } = render(
      <TimeRangePicker
        current="1h"
        isActive
        onSelect={() => {}}
        onCancel={() => {}}
      />,
    );
    await flush();
    const frame = stripAnsi(lastFrame());
    expect(frame).toContain("15 minutes");
    expect(frame).toContain("1 hour");
    expect(frame).toContain("6 hours");
    expect(frame).toContain("24 hours");
    expect(frame).toContain("7 days");
    unmount();
  });

  it("starts with the cursor on the current preset", async () => {
    const { lastFrame, unmount } = render(
      <TimeRangePicker
        current="6h"
        isActive
        onSelect={() => {}}
        onCancel={() => {}}
      />,
    );
    await flush();
    const frame = stripAnsi(lastFrame());
    // The selected row is prefixed with a caret. The current preset row
    // should be the one that is highlighted.
    const sixHourLine = frame
      .split("\n")
      .find((line) => line.includes("6 hours"));
    expect(sixHourLine).toBeDefined();
    // After stripping ANSI the line still has the box border (│) and padding.
    expect(sixHourLine).toMatch(/>\s+6 hours/);
    unmount();
  });

  it("calls onSelect with the highlighted preset on Enter", async () => {
    const onSelect = vi.fn();
    const { stdin, unmount } = render(
      <TimeRangePicker
        current="15m"
        isActive
        onSelect={onSelect}
        onCancel={() => {}}
      />,
    );
    await flush();
    stdin.write("j"); // move from 15m → 1h
    await flush();
    stdin.write("\r"); // Enter
    await flush();
    expect(onSelect).toHaveBeenCalledWith("1h");
    unmount();
  });

  it("calls onCancel on Esc", async () => {
    const onCancel = vi.fn();
    const { stdin, unmount } = render(
      <TimeRangePicker
        current="1h"
        isActive
        onSelect={() => {}}
        onCancel={onCancel}
      />,
    );
    await flush();
    stdin.write("\x1B"); // Esc
    await flush(20);
    expect(onCancel).toHaveBeenCalled();
    unmount();
  });

  it("ignores keys when inactive", async () => {
    const onSelect = vi.fn();
    const onCancel = vi.fn();
    const { stdin, unmount } = render(
      <TimeRangePicker
        current="1h"
        isActive={false}
        onSelect={onSelect}
        onCancel={onCancel}
      />,
    );
    await flush();
    stdin.write("\r");
    stdin.write("\x1B");
    await flush(20);
    expect(onSelect).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
    unmount();
  });
});
