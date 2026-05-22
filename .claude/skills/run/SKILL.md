---
name: run
description: Launch and drive cwv-tui (CloudWatch Logs/Metrics TUI) against a real AWS account to verify a change end-to-end. Use when asked to run, start, smoke-test, or visually confirm a change works in the actual app (not just tests).
version: 1.0.0
---

# Run cwv-tui

This is an interactive Ink/React TUI that talks to live AWS CloudWatch.
It must run in a real TTY, with valid AWS credentials, against a real
account. There is no headless mode.

## Constraints

- **TTY required.** The CLI exits with `cwv-tui requires an interactive
  terminal (TTY).` when stdin isn't a TTY. Agent harnesses generally
  can't drive it — ask the user to run it in their terminal and report
  what they see, or use `--version` / `--help` to smoke-test the binary
  itself.
- **AWS credentials required.** Standard SDK v3 chain: `--profile`,
  `AWS_PROFILE`, `~/.aws/credentials`, or instance role. Without
  credentials the views render their error states.
- **Region required.** `--region` flag, `AWS_REGION`, or
  `AWS_DEFAULT_REGION`. Empty region = SDK errors on the first call.
- **Metrics dashboards are opt-in.** Without a YAML config, the
  Dashboard tab shows an empty state and the tool behaves like v0.2.

## Quick reference

```bash
# Dev (hot, no build): tsx runs src/cli.tsx directly
pnpm dev -- --profile sandbox --region ap-northeast-1

# With a metrics dashboard:
pnpm dev -- --profile sandbox --config ./examples/dashboards.yaml

# Production-shape: build first, then run dist/
pnpm build && node dist/cli.js --profile sandbox

# Smoke-test the binary (no TTY needed)
node dist/cli.js --help
node dist/cli.js --version

# Verify the npx-from-GitHub path (slow first time: prepare runs tsup)
npx github:r-tamura/cwv-tui#v0.3.0 --profile sandbox

# Project-local install path (other directory, same lockfile)
cd /tmp && npx file:/Users/r-tamura/ghq/github.com/r-tamura/cwv-tui --profile sandbox
```

## Suggested example YAML

A starter dashboard for verifying metrics drill-down. Save anywhere and
point `--config` at it.

```yaml
defaultDashboard: lambda
dashboards:
  lambda:
    title: Lambda smoke test
    charts:
      - title: Invocations
        namespace: AWS/Lambda
        metric: Invocations
        dimensions: { FunctionName: <pick-a-real-function> }
        stat: Sum
        height: 8
        logGroups: [/aws/lambda/<pick-a-real-function>]
      - title: Errors
        namespace: AWS/Lambda
        metric: Errors
        dimensions: { FunctionName: <pick-a-real-function> }
        stat: Sum
        height: 6
        logGroups: [/aws/lambda/<pick-a-real-function>]
```

## What to verify after a change

| Change area | Smoke path |
|---|---|
| Log Groups view | Open, scroll with `j/k`, filter with `/`, drill in with Enter |
| Log Streams / Events | From a group → Enter → scroll, Enter to expand a long JSON event |
| Insights | `i` from a group, Ctrl+R to run, `t` for time range, Esc to leave |
| Live Tail | `t` from a group, watch a chatty stream tick, Esc to end |
| Dashboard | Start with `--config <path>`, `t` for range, `p` to pause, `r` to refresh, Enter on a chart should jump into Insights for its `logGroups` |
| Alarms | `Tab` to alarms tab, `/` to filter, banner reflects state counts |

## When tests are enough

Don't ask to run the app for changes that are fully covered by tests
and have no UI surface impact:
- AWS-layer helpers (covered by `aws-sdk-client-mock`)
- Reducers (navigation, MultilineEditor state)
- Pure utilities (lib/format, lib/timeRange)

Reach for `pnpm test && pnpm typecheck && pnpm run build` in that case.
A green build of `dist/cli.js` plus `node dist/cli.js --help` is usually
sufficient evidence the wiring is intact.

## Failure modes

- `cwv-tui requires an interactive terminal (TTY).` — running inside a
  pipe or agent harness. Ask the user to run it themselves.
- `Could not parse cwv-tui config as YAML:` — YAML syntax error;
  message includes line/column.
- `Invalid cwv-tui dashboard config:` — Zod validation error; lists each
  failing path.
- AWS credential errors — `lib/errors.ts` rewrites the common SDK
  exception names with actionable hints (`aws sso login --profile X`,
  expired token, missing permissions, missing resource).
