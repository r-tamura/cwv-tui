import { describe, it, expect } from "vitest";
import { render } from "ink-testing-library";
import { Box, Text } from "ink";
import React from "react";
import { useLiveTail } from "../../src/hooks/useLiveTail.js";
import type { LogEvent } from "../../src/types.js";

function flush(ms = 0) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

function Probe({
  subscribe,
}: {
  subscribe: () => AsyncGenerator<LogEvent[], void, void>;
}) {
  const { events, status } = useLiveTail({ subscribe, max: 10 });
  return (
    <Box flexDirection="column">
      <Text>{status}</Text>
      {events.map((e, i) => (
        <Text key={i}>{e.message}</Text>
      ))}
    </Box>
  );
}

describe("useLiveTail", () => {
  it("appends arriving batches up to max", async () => {
    async function* gen() {
      yield [{ timestamp: 1, message: "a" }];
      yield [{ timestamp: 2, message: "b" }];
    }
    const { lastFrame, unmount } = render(<Probe subscribe={() => gen()} />);
    await flush(20);
    const f = lastFrame() ?? "";
    expect(f).toContain("a");
    expect(f).toContain("b");
    unmount();
  });
});
