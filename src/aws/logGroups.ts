import {
  CloudWatchLogsClient,
  paginateDescribeLogGroups,
} from "@aws-sdk/client-cloudwatch-logs";
import type { LogGroup } from "../types.js";

export type ListLogGroupsOptions = {
  prefix?: string;
};

export async function listLogGroups(
  client: CloudWatchLogsClient,
  opts: ListLogGroupsOptions = {},
): Promise<LogGroup[]> {
  const out: LogGroup[] = [];
  const paginator = paginateDescribeLogGroups(
    { client, pageSize: 50 },
    { logGroupNamePrefix: opts.prefix },
  );
  for await (const page of paginator) {
    for (const g of page.logGroups ?? []) {
      if (!g.logGroupName) continue;
      out.push({
        name: g.logGroupName,
        arn: g.arn,
        storedBytes: g.storedBytes,
        retentionInDays: g.retentionInDays,
        creationTime: g.creationTime,
      });
    }
  }
  return out;
}
