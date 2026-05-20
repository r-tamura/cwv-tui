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
