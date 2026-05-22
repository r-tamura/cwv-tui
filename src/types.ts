export type LogGroup = {
  name: string;
  arn?: string;
  storedBytes?: number;
  retentionInDays?: number;
  creationTime?: number;
};

export type LogStream = {
  name: string;
  arn?: string;
  firstEventTime?: number;
  lastEventTime?: number;
  storedBytes?: number;
};

export type LogEvent = {
  timestamp: number;
  message: string;
  ingestionTime?: number;
};

export type InsightsField = {
  field: string;
  value: string;
};

export type InsightsRow = InsightsField[];

export type InsightsStatistics = {
  recordsMatched: number;
  recordsScanned: number;
  bytesScanned: number;
};

export type InsightsStatus =
  | "Scheduled"
  | "Running"
  | "Complete"
  | "Failed"
  | "Cancelled"
  | "Timeout"
  | "Unknown";

// === v0.3 Metrics & Alarms ===

export type Statistic =
  | "Sum"
  | "Average"
  | "Maximum"
  | "Minimum"
  | "SampleCount"
  | "p50"
  | "p90"
  | "p95"
  | "p99";

export type ChartSpec = {
  /** Stable id derived from chart position; used as GetMetricData metric id. */
  id: string;
  title: string;
  namespace: string;
  metric: string;
  dimensions: Record<string, string>;
  stat: Statistic;
  height: number;
  logGroups: string[];
};

export type DashboardSpec = {
  id: string;
  title: string;
  charts: ChartSpec[];
};

export type DashboardConfig = {
  defaultDashboard: string;
  dashboards: Record<string, DashboardSpec>;
};

export type SeriesPoint = {
  timestamp: number;
  /** null marks missing data so charts can render gaps instead of zeros. */
  value: number | null;
};

export type Series = {
  chartId: string;
  label: string;
  points: SeriesPoint[];
};

export type AlarmState = "OK" | "ALARM" | "INSUFFICIENT_DATA";

export type Alarm = {
  name: string;
  state: AlarmState;
  reason?: string;
  metricName?: string;
  namespace?: string;
  /** epoch ms */
  stateUpdatedAt?: number;
};

export type AlarmsSummary = {
  ok: number;
  alarm: number;
  insufficient: number;
  /** Up to 3 names of alarms currently in ALARM state for the banner. */
  topAlarming: string[];
};

export type TimeWindow = {
  /** epoch ms */
  startMs: number;
  /** epoch ms */
  endMs: number;
  periodSec: number;
};
