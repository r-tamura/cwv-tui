import { render, Text } from "ink";
import React from "react";
import { App } from "./app.js";
import { createClient } from "./aws/client.js";
import { HELP_TEXT, parseArgs } from "./lib/args.js";

async function main(): Promise<number> {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    process.stdout.write(HELP_TEXT);
    return 0;
  }
  if (args.version) {
    process.stdout.write("cwv-tui 0.1.0\n");
    return 0;
  }

  if (!process.stdin.isTTY) {
    process.stderr.write(
      "cwv-tui requires an interactive terminal (TTY). Run from a terminal directly.\n",
    );
    return 1;
  }

  const client = createClient({
    profile: args.profile,
    region: args.region,
  });

  const region =
    args.region ??
    process.env.AWS_REGION ??
    process.env.AWS_DEFAULT_REGION;
  const profile = args.profile ?? process.env.AWS_PROFILE;

  const { waitUntilExit } = render(
    <App client={client} profile={profile} region={region} />,
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
