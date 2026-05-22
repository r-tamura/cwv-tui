import { CloudWatchClient } from "@aws-sdk/client-cloudwatch";
import type { CloudWatchLogsClient } from "@aws-sdk/client-cloudwatch-logs";
import { Box, Text, useApp, useInput } from "ink";
import React, { useEffect, useMemo, useReducer, useState } from "react";
import { AlarmsBanner } from "./components/AlarmsBanner.js";
import { HelpDialog } from "./components/HelpDialog.js";
import { StatusBar } from "./components/StatusBar.js";
import { useAlarmsSummary } from "./hooks/useAlarmsSummary.js";
import { rangeWindowMs } from "./lib/timeRange.js";
import { derivePeriodSec } from "./aws/metrics.js";
import {
  canGoBack,
  currentRoute,
  initialNavState,
  type Mode,
  navigationReducer,
} from "./state/navigation.js";
import { InputProvider, useInputContext } from "./state/inputContext.js";
import { AlarmsView } from "./views/AlarmsView.js";
import { DashboardView } from "./views/DashboardView.js";
import { InsightsView } from "./views/InsightsView.js";
import { LiveTailView } from "./views/LiveTailView.js";
import { LogEventsView } from "./views/LogEventsView.js";
import { LogGroupsView } from "./views/LogGroupsView.js";
import { LogStreamsView } from "./views/LogStreamsView.js";
import type { DashboardConfig, TimeWindow } from "./types.js";

export type AppProps = {
  client: CloudWatchLogsClient;
  /** CloudWatchClient is created here (or injected) lazily so MVP doesn't need one when there's no config. */
  metricsClient: CloudWatchClient;
  config?: DashboardConfig;
  profile?: string;
  region?: string;
};

export function App(props: AppProps) {
  return (
    <InputProvider>
      <AppInner {...props} />
    </InputProvider>
  );
}

const MODES_IN_ORDER: Mode[] = ["dashboard", "alarms", "logs"];

function nextMode(current: Mode, direction: 1 | -1): Mode {
  const idx = MODES_IN_ORDER.indexOf(current);
  const next = (idx + direction + MODES_IN_ORDER.length) % MODES_IN_ORDER.length;
  return MODES_IN_ORDER[next] ?? "logs";
}

function AppInner({
  client,
  metricsClient,
  config,
  profile,
  region,
}: AppProps) {
  const { exit } = useApp();
  const hasConfig = !!config;

  // Compute the seeded initial state. When config is present we land on the
  // dashboard mode; otherwise we keep the v0.2 logs-first experience.
  const seededInitial = useMemo(() => {
    if (!config) return initialNavState;
    return {
      ...initialNavState,
      mode: "dashboard" as Mode,
      stacks: {
        ...initialNavState.stacks,
        dashboard: [
          { kind: "dashboard" as const, dashboardId: config.defaultDashboard },
        ],
      },
    };
  }, [config]);

  const [nav, dispatch] = useReducer(navigationReducer, seededInitial);
  const [showHelp, setShowHelp] = useState(false);
  const [window, setWindow] = useState<TimeWindow>(() => {
    const { startMs, endMs } = rangeWindowMs("1h");
    return { startMs, endMs, periodSec: derivePeriodSec(startMs, endMs) };
  });
  const route = currentRoute(nav);
  const { textInputActive } = useInputContext();

  const alarmsState = useAlarmsSummary({ client: metricsClient });

  // Help-mode key intercept.
  useInput(
    (input, key) => {
      if (key.escape || input === "?") setShowHelp(false);
    },
    { isActive: showHelp },
  );

  // Global navigation/help — gated by help and text-input lock.
  useInput(
    (input, key) => {
      if (input === "?") {
        setShowHelp(true);
        return;
      }
      // Tab / Shift+Tab cycles top-level modes.
      if (key.tab) {
        dispatch({
          type: "SET_MODE",
          mode: nextMode(nav.mode, key.shift ? -1 : 1),
        });
        return;
      }
      if (input === "q" && !canGoBack(nav)) {
        exit();
        return;
      }
      if ((key.escape || key.backspace) && canGoBack(nav)) {
        dispatch({ type: "POP" });
        return;
      }
    },
    { isActive: !showHelp && !textInputActive },
  );

  // If a banner click pushed us into alarms mode from elsewhere, react to it.
  // (Reserved for future use; placeholder left intentionally.)
  useEffect(() => {}, [nav.mode]);

  if (showHelp) {
    return (
      <Box flexDirection="column" minHeight={20}>
        <HelpDialog />
        <StatusBar
          profile={profile}
          region={region}
          hints="Esc or ? to close help"
        />
      </Box>
    );
  }

  return (
    <Box flexDirection="column" minHeight={20}>
      <TabBar mode={nav.mode} hasConfig={hasConfig} />
      <AlarmsBanner
        summary={alarmsState.summary}
        loading={alarmsState.loading}
        error={alarmsState.error}
        onJump={() => dispatch({ type: "SET_MODE", mode: "alarms" })}
      />
      <Box flexGrow={1}>
        {/* DASHBOARD mode */}
        {route.kind === "dashboard" && (() => {
          const dash = config?.dashboards[route.dashboardId];
          return dash ? (
            <DashboardView
              client={metricsClient}
              dashboard={dash}
              window={window}
              isActive
              onOpenInsights={(logGroups, win) => {
                // Drill into the first matched log group's Insights view,
                // pre-filling the dashboard's time window.
                const first = logGroups[0];
                if (!first) return;
                dispatch({ type: "SET_MODE", mode: "logs" });
                dispatch({
                  type: "PUSH",
                  route: { kind: "insights", logGroupName: first },
                });
                // The window propagates through component state in InsightsView's
                // own picker; for now we drop the explicit win param. Future v0.3.1
                // can plumb it through.
                void win;
              }}
              onChangeWindow={setWindow}
            />
          ) : (
            <EmptyDashboardState hasConfig={hasConfig} />
          );
        })()}

        {/* ALARMS mode */}
        {route.kind === "alarms" && (
          <AlarmsView client={metricsClient} isActive />
        )}

        {/* LOGS mode (existing v0.2 routes) */}
        {route.kind === "groups" && (
          <LogGroupsView
            client={client}
            isActive
            onSelect={(g) =>
              dispatch({
                type: "PUSH",
                route: { kind: "streams", logGroupName: g.name },
              })
            }
            onOpenInsights={(g) =>
              dispatch({
                type: "PUSH",
                route: { kind: "insights", logGroupName: g.name },
              })
            }
            onOpenLiveTail={(g) =>
              dispatch({
                type: "PUSH",
                route: { kind: "liveTail", logGroupName: g.name },
              })
            }
          />
        )}
        {route.kind === "streams" && (
          <LogStreamsView
            client={client}
            logGroupName={route.logGroupName}
            isActive
            onSelect={(s) =>
              dispatch({
                type: "PUSH",
                route: {
                  kind: "events",
                  logGroupName: route.logGroupName,
                  logStreamName: s.name,
                },
              })
            }
          />
        )}
        {route.kind === "events" && (
          <LogEventsView
            client={client}
            logGroupName={route.logGroupName}
            logStreamName={route.logStreamName}
            isActive
          />
        )}
        {route.kind === "insights" && route.logGroupName && (
          <InsightsView
            client={client}
            logGroupName={route.logGroupName}
            isActive
            onClose={() => dispatch({ type: "POP" })}
          />
        )}
        {route.kind === "liveTail" && (
          <LiveTailView
            client={client}
            logGroupName={route.logGroupName}
            isActive
          />
        )}
      </Box>
      <StatusBar
        profile={profile}
        region={region}
        hints={hintsForRoute(route.kind)}
      />
    </Box>
  );
}

function TabBar({ mode, hasConfig }: { mode: Mode; hasConfig: boolean }) {
  const label = (m: Mode, text: string) => {
    const active = m === mode;
    const dim = !hasConfig && m === "dashboard";
    return (
      <Text
        key={m}
        bold={active}
        color={active ? "cyan" : dim ? "gray" : undefined}
        inverse={active}
      >
        {` ${text} `}
      </Text>
    );
  };
  return (
    <Box>
      {label("dashboard", "Dashboard")}
      <Text>  </Text>
      {label("alarms", "Alarms")}
      <Text>  </Text>
      {label("logs", "Logs")}
      <Text color="gray">      Tab / Shift+Tab to switch</Text>
    </Box>
  );
}

function EmptyDashboardState({ hasConfig }: { hasConfig: boolean }) {
  if (hasConfig) {
    return (
      <Box flexDirection="column">
        <Text color="yellow">Dashboard not found — check defaultDashboard in your YAML.</Text>
      </Box>
    );
  }
  return (
    <Box flexDirection="column">
      <Text bold>No dashboards configured</Text>
      <Text color="gray">
        Create ~/.config/cwv-tui/dashboards.yaml — see the README for an example.
      </Text>
      <Text color="gray">
        Press Tab to switch to Alarms or Logs.
      </Text>
    </Box>
  );
}

function hintsForRoute(kind: string): string {
  const base = "?:help  Tab:switch  ";
  switch (kind) {
    case "dashboard":
      return `${base}jk/^d/^u move  t range  r reload  p pause  Enter→Insights  d dashboards  q quit`;
    case "alarms":
      return `${base}jk/^d/^u/gg/G move  / filter  Enter open  q quit`;
    case "groups":
      return `${base}jk/^d/^u/gg/G move  / filter  Enter open  i Insights  t Live Tail  q quit`;
    case "streams":
      return `${base}jk/^d/^u/gg/G move  / filter  Enter open  Esc back`;
    case "events":
      return `${base}jk/^d/^u/gg/G move  Enter expand  r reload  Esc back`;
    case "insights":
      return `${base}Enter run  e edit  Esc stop/back`;
    case "liveTail":
      return `${base}c clear  Esc back`;
    default:
      return base;
  }
}
