import { describe, expect, it } from "vitest";
import { render } from "ink-testing-library";
import React from "react";
import { HelpDialog } from "../../src/components/HelpDialog.js";

describe("HelpDialog", () => {
  it("renders global, navigation, and view-specific shortcuts", () => {
    const { lastFrame, unmount } = render(<HelpDialog />);
    const frame = lastFrame() ?? "";
    expect(frame).toContain("Keyboard shortcuts");
    expect(frame).toContain("Global");
    expect(frame).toContain("Lists");
    expect(frame).toContain("Insights");
    // a few representative bindings
    expect(frame).toContain("?");
    expect(frame).toContain("Quit");
    expect(frame).toContain("Filter");
    expect(frame).toContain("Stop query");
    unmount();
  });
});
