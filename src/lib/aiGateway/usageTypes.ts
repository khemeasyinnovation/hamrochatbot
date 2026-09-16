import type { AIRequestContext } from "./types";

export type AIUsageContext = Omit<AIRequestContext, "surface" | "sessionId"> & {
  surface: "chat" | "widget" | "knowledge" | "ingestion";
  sessionId?: string;
};
export type UsageStart = {
  id: string;
  context: AIUsageContext;
  model: string;
  operation: "generation" | "embedding" | "probe";
};
export type UsageFinish = {
  status: "succeeded" | "failed" | "cancelled";
  httpStatus: number | null;
  tokensIn: number | null;
  tokensOut: number | null;
  tokensTotal: number | null;
  tokensCached: number | null;
  tokensReasoning: number | null;
};
export interface UsageStore {
  start(event: UsageStart): Promise<void>;
  finish(id: string, event: UsageFinish): Promise<void>;
}
