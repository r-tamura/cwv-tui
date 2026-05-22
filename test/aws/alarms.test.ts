import { beforeEach, describe, expect, it } from "vitest";
import { mockClient } from "aws-sdk-client-mock";
import {
  CloudWatchClient,
  DescribeAlarmsCommand,
} from "@aws-sdk/client-cloudwatch";
import { getAlarmsSummary, listAlarms } from "../../src/aws/alarms.js";

const mock = mockClient(CloudWatchClient);

describe("listAlarms", () => {
  beforeEach(() => mock.reset());

  it("maps SDK shape into Alarm[]", async () => {
    mock.on(DescribeAlarmsCommand).resolves({
      MetricAlarms: [
        {
          AlarmName: "errors-high",
          StateValue: "ALARM",
          StateReason: "Threshold crossed",
          MetricName: "Errors",
          Namespace: "AWS/Lambda",
          StateUpdatedTimestamp: new Date(1_700_000_000_000),
        },
      ],
    });
    const out = await listAlarms(new CloudWatchClient({}));
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      name: "errors-high",
      state: "ALARM",
      reason: "Threshold crossed",
      metricName: "Errors",
      namespace: "AWS/Lambda",
      stateUpdatedAt: 1_700_000_000_000,
    });
  });

  it("sorts ALARM, then INSUFFICIENT_DATA, then OK, then by name", async () => {
    mock.on(DescribeAlarmsCommand).resolves({
      MetricAlarms: [
        { AlarmName: "z-ok", StateValue: "OK" },
        { AlarmName: "a-alarm", StateValue: "ALARM" },
        { AlarmName: "m-insuf", StateValue: "INSUFFICIENT_DATA" },
        { AlarmName: "b-alarm", StateValue: "ALARM" },
        { AlarmName: "a-ok", StateValue: "OK" },
      ],
    });
    const out = await listAlarms(new CloudWatchClient({}));
    expect(out.map((a) => a.name)).toEqual([
      "a-alarm",
      "b-alarm",
      "m-insuf",
      "a-ok",
      "z-ok",
    ]);
  });

  it("passes StateValue to the SDK when exactly one state is requested", async () => {
    mock.on(DescribeAlarmsCommand).resolves({ MetricAlarms: [] });
    await listAlarms(new CloudWatchClient({}), ["ALARM"]);
    const call = mock.commandCalls(DescribeAlarmsCommand)[0]!;
    expect(call.args[0].input.StateValue).toBe("ALARM");
  });

  it("filters client-side when multiple states are requested", async () => {
    mock.on(DescribeAlarmsCommand).resolves({
      MetricAlarms: [
        { AlarmName: "a", StateValue: "ALARM" },
        { AlarmName: "b", StateValue: "OK" },
        { AlarmName: "c", StateValue: "INSUFFICIENT_DATA" },
      ],
    });
    const out = await listAlarms(new CloudWatchClient({}), [
      "ALARM",
      "INSUFFICIENT_DATA",
    ]);
    const call = mock.commandCalls(DescribeAlarmsCommand)[0]!;
    expect(call.args[0].input.StateValue).toBeUndefined();
    expect(out.map((a) => a.name)).toEqual(["a", "c"]);
  });

  it("returns an empty list when SDK returns nothing", async () => {
    mock.on(DescribeAlarmsCommand).resolves({});
    const out = await listAlarms(new CloudWatchClient({}));
    expect(out).toEqual([]);
  });

  it("skips alarms missing a name", async () => {
    mock.on(DescribeAlarmsCommand).resolves({
      MetricAlarms: [
        { AlarmName: undefined, StateValue: "ALARM" },
        { AlarmName: "real", StateValue: "OK" },
      ],
    });
    const out = await listAlarms(new CloudWatchClient({}));
    expect(out.map((a) => a.name)).toEqual(["real"]);
  });

  it("propagates SDK errors", async () => {
    mock.on(DescribeAlarmsCommand).rejects(new Error("denied"));
    await expect(listAlarms(new CloudWatchClient({}))).rejects.toThrow("denied");
  });
});

describe("getAlarmsSummary", () => {
  beforeEach(() => mock.reset());

  it("aggregates state counts and picks up to 3 alphabetical ALARM names", async () => {
    mock.on(DescribeAlarmsCommand).resolves({
      MetricAlarms: [
        { AlarmName: "zeta", StateValue: "ALARM" },
        { AlarmName: "alpha", StateValue: "ALARM" },
        { AlarmName: "mu", StateValue: "ALARM" },
        { AlarmName: "beta", StateValue: "ALARM" },
        { AlarmName: "ok-1", StateValue: "OK" },
        { AlarmName: "ok-2", StateValue: "OK" },
        { AlarmName: "huh", StateValue: "INSUFFICIENT_DATA" },
      ],
    });
    const out = await getAlarmsSummary(new CloudWatchClient({}));
    expect(out.ok).toBe(2);
    expect(out.alarm).toBe(4);
    expect(out.insufficient).toBe(1);
    expect(out.topAlarming).toEqual(["alpha", "beta", "mu"]);
  });

  it("returns all zeros when there are no alarms", async () => {
    mock.on(DescribeAlarmsCommand).resolves({ MetricAlarms: [] });
    const out = await getAlarmsSummary(new CloudWatchClient({}));
    expect(out).toEqual({
      ok: 0,
      alarm: 0,
      insufficient: 0,
      topAlarming: [],
    });
  });

  it("issues only one DescribeAlarms call", async () => {
    mock.on(DescribeAlarmsCommand).resolves({ MetricAlarms: [] });
    await getAlarmsSummary(new CloudWatchClient({}));
    expect(mock.commandCalls(DescribeAlarmsCommand)).toHaveLength(1);
  });
});
