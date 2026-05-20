import { CloudWatchLogsClient } from "@aws-sdk/client-cloudwatch-logs";

export type ClientOptions = {
  profile?: string;
  region?: string;
};

/**
 * Create a CloudWatchLogsClient honoring `--profile` / `--region`.
 *
 * Profile resolution piggybacks on AWS_PROFILE so we don't pull in a separate
 * @aws-sdk/credential-providers dependency. Region is passed via client config.
 */
export function createClient(opts: ClientOptions = {}): CloudWatchLogsClient {
  if (opts.profile) {
    process.env.AWS_PROFILE = opts.profile;
  }
  return new CloudWatchLogsClient({
    region: opts.region ?? process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION,
  });
}
