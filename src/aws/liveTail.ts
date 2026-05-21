import {
  CloudWatchLogsClient,
  StartLiveTailCommand,
  type StartLiveTailCommandInput,
} from "@aws-sdk/client-cloudwatch-logs";
import type { LogEvent } from "../types.js";

export type StartLiveTailOptions = {
  logGroupIdentifiers: readonly string[];
  logStreamNames?: readonly string[];
  logEventFilterPattern?: string;
};

export async function* startLiveTail(
  client: CloudWatchLogsClient,
  opts: StartLiveTailOptions,
): AsyncGenerator<LogEvent[], void, void> {
  const input: StartLiveTailCommandInput = {
    logGroupIdentifiers: [...opts.logGroupIdentifiers],
    logStreamNames: opts.logStreamNames ? [...opts.logStreamNames] : undefined,
    logEventFilterPattern: opts.logEventFilterPattern,
  };
  const res = await client.send(new StartLiveTailCommand(input));
  if (!res.responseStream) return;
  for await (const event of res.responseStream) {
    const update = event.sessionUpdate;
    if (!update?.sessionResults) continue;
    const batch: LogEvent[] = [];
    for (const e of update.sessionResults) {
      if (e.timestamp == null || e.message == null) continue;
      batch.push({ timestamp: e.timestamp, message: e.message });
    }
    if (batch.length > 0) yield batch;
  }
}
