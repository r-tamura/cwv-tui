import { beforeEach, describe, expect, it } from "vitest";
import { render } from "ink-testing-library";
import React from "react";
import { mockClient } from "aws-sdk-client-mock";
import {
  CloudWatchLogsClient,
  GetQueryResultsCommand,
  StartQueryCommand,
  StopQueryCommand,
} from "@aws-sdk/client-cloudwatch-logs";
import { InsightsView } from "../../src/views/InsightsView.js";
import { InputProvider } from "../../src/state/inputContext.js";
import { stripAnsi } from "../helpers/ansi.js";

const mock = mockClient(CloudWatchLogsClient);

function wait(ms = 10) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

describe("InsightsView time range integration", () => {
  beforeEach(() => mock.reset());

  it("renders the current range label in the header", async () => {
    mock.on(StartQueryCommand).resolves({ queryId: "qid-1" });
    mock.on(GetQueryResultsCommand).resolves({
      status: "Running",
      results: [],
    });
    mock.on(StopQueryCommand).resolves({});

    const client = new CloudWatchLogsClient({});
    const { lastFrame, unmount } = render(
      <InputProvider>
        <InsightsView
          client={client}
          logGroupName="/aws/lambda/foo"
          isActive
          onClose={() => {}}
        />
      </InputProvider>,
    );
    await wait(20);
    const frame = stripAnsi(lastFrame());
    expect(frame).toContain("1h");
    unmount();
  });

  it("opens the picker on t (while not editing) and re-runs query on Enter", async () => {
    mock.on(StartQueryCommand).resolves({ queryId: "qid-1" });
    mock.on(GetQueryResultsCommand).resolves({
      status: "Complete",
      results: [],
      statistics: { recordsMatched: 0, recordsScanned: 0, bytesScanned: 0 },
    });
    mock.on(StopQueryCommand).resolves({});

    const client = new CloudWatchLogsClient({});
    const { stdin, lastFrame, unmount } = render(
      <InputProvider>
        <InsightsView
          client={client}
          logGroupName="/aws/lambda/foo"
          isActive
          onClose={() => {}}
        />
      </InputProvider>,
    );
    // Submit the default query so we leave editing mode.
    stdin.write("\r");
    await wait(40);
    // Now press t to open the picker.
    stdin.write("t");
    await wait(40);
    expect(stripAnsi(lastFrame())).toContain("Time range");
    // Pick the second preset (1h is current; j moves to 6h).
    stdin.write("j");
    await wait(20);
    stdin.write("\r");
    await wait(40);
    // The header should now reflect 6h.
    expect(stripAnsi(lastFrame())).toContain("6h");
    // A second StartQuery should have been issued.
    expect(
      mock.commandCalls(StartQueryCommand).length,
    ).toBeGreaterThanOrEqual(2);
    unmount();
  });
});
