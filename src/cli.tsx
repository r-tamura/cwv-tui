import { CloudWatchClient } from "@aws-sdk/client-cloudwatch";
import { render, Text } from "ink";
import React from "react";
import { App } from "./app.js";
import { createClient } from "./aws/client.js";
import { HELP_TEXT, parseArgs } from "./lib/args.js";
import { loadConfig } from "./lib/config.js";

async function main(): Promise<number> {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    process.stdout.write(HELP_TEXT);
    return 0;
  }
  if (args.version) {
    process.stdout.write("cwv-tui 0.3.0\n");
    return 0;
  }

  if (!process.stdin.isTTY) {
    process.stderr.write(
      "cwv-tui requires an interactive terminal (TTY). Run from a terminal directly.\n",
    );
    return 1;
  }

  // Load YAML dashboard config if present. Schema/parse failures are fatal
  // (the user explicitly wrote a YAML); a missing file is fine and drops us
  // back to v0.2's logs-only experience.
  let config;
  try {
    config = await loadConfig(args.configPath);
  } catch (e) {
    process.stderr.write(`${e instanceof Error ? e.message : String(e)}\n`);
    return 2;
  }

  const region =
    args.region ?? process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION;
  const profile = args.profile ?? process.env.AWS_PROFILE;

  if (profile) process.env.AWS_PROFILE = profile;

  const client = createClient({ profile: args.profile, region: args.region });
  const metricsClient = new CloudWatchClient({ region });

  const { waitUntilExit } = render(
    <App
      client={client}
      metricsClient={metricsClient}
      config={config}
      profile={profile}
      region={region}
    />,
  );
  await waitUntilExit();
  return 0;
}

main().then(
  (code) => {
    process.exit(code);
  },
  (err) => {
    render(<Text color="red">{String(err?.message ?? err)}</Text>);
    process.exit(1);
  },
);
