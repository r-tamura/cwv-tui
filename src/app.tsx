import { Box, useApp, useInput } from "ink";
import React, { useReducer, useState } from "react";
import { HelpDialog } from "./components/HelpDialog.js";
import { StatusBar } from "./components/StatusBar.js";
import { InsightsView } from "./views/InsightsView.js";
import { LiveTailView } from "./views/LiveTailView.js";
import { LogEventsView } from "./views/LogEventsView.js";
import { LogGroupsView } from "./views/LogGroupsView.js";
import { LogStreamsView } from "./views/LogStreamsView.js";
import {
  canGoBack,
  currentRoute,
  initialNavState,
  navigationReducer,
} from "./state/navigation.js";
import { InputProvider, useInputContext } from "./state/inputContext.js";
import type { CloudWatchLogsClient } from "@aws-sdk/client-cloudwatch-logs";

export type AppProps = {
  client: CloudWatchLogsClient;
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

function AppInner({ client, profile, region }: AppProps) {
  const { exit } = useApp();
  const [nav, dispatch] = useReducer(navigationReducer, initialNavState);
  const [showHelp, setShowHelp] = useState(false);
  const route = currentRoute(nav);
  const { textInputActive } = useInputContext();

  // While help dialog is open, intercept keys here only.
  useInput(
    (input, key) => {
      if (key.escape || input === "?") {
        setShowHelp(false);
      }
    },
    { isActive: showHelp },
  );

  // Global navigation/help — disabled while help is shown OR a text input is capturing.
  useInput(
    (input, key) => {
      if (input === "?") {
        setShowHelp(true);
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
      <Box flexGrow={1}>
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

function hintsForRoute(kind: string): string {
  const base = "?:help  ";
  switch (kind) {
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
