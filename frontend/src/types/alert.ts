import { Conversation } from "./chat";

export type Status = "OPEN" | "CLOSED";
export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export type Alert = {
  id: string;
  name: string;
  description: string;
  openedAt: string;
  closedAt: string;
  status: Status;
  severity: Severity;
  category: string;
  comment: string;
  meetingIds: string[];
  conversation: Conversation;
};

export type ChartProps = {
  measure_name: string;
  measure_values: {
    timestamp: string;
    measure_value: number;
  }[];
}[];
