import {
  CloudWatchLogsClient,
  DescribeLogStreamsCommand,
  GetLogEventsCommand,
} from "@aws-sdk/client-cloudwatch-logs";
import type { LogEvent, LogStream } from "../types.js";

export async function listLogStreams(
  client: CloudWatchLogsClient,
  logGroupName: string,
  limit = 50,
): Promise<LogStream[]> {
  const res = await client.send(
    new DescribeLogStreamsCommand({
      logGroupName,
      orderBy: "LastEventTime",
      descending: true,
      limit,
    }),
  );
  const out: LogStream[] = [];
  for (const s of res.logStreams ?? []) {
    if (!s.logStreamName) continue;
    out.push({
      name: s.logStreamName,
      arn: s.arn,
      firstEventTime: s.firstEventTimestamp,
      lastEventTime: s.lastEventTimestamp,
      storedBytes: s.storedBytes,
    });
  }
  return out;
}

export async function getLogEvents(
  client: CloudWatchLogsClient,
  logGroupName: string,
  logStreamName: string,
  limit = 100,
): Promise<LogEvent[]> {
  const res = await client.send(
    new GetLogEventsCommand({
      logGroupName,
      logStreamName,
      limit,
      startFromHead: false,
    }),
  );
  const out: LogEvent[] = [];
  for (const e of res.events ?? []) {
    if (e.timestamp == null || e.message == null) continue;
    out.push({
      timestamp: e.timestamp,
      message: e.message,
      ingestionTime: e.ingestionTime,
    });
  }
  return out;
}
