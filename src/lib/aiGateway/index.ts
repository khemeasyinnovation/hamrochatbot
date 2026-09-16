import { createGoogle } from "@ai-sdk/google";
import { embed, generateText, streamText, type ModelMessage } from "ai";
import { createModelResolver } from "./modelResolver";
import { usageFetch } from "./usageFetch";
import { databaseUsageStore } from "./usageStore";
import type { AIRequestContext } from "./types";
import type { AIUsageContext, UsageStore } from "./usageTypes";

export type { AIRequestContext } from "./types";
export type { AIUsageContext } from "./usageTypes";

function managedApiKey() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Managed AI is not configured.");
  return apiKey;
}

export function createAIGateway(store: UsageStore) {
  function google(context: AIUsageContext, model: string, operation: "generation" | "embedding" | "probe") {
    if (!context || (!context.orgId && !context.userId)) throw new Error("AI requests require an accountable owner or organization");
    return createGoogle({ apiKey: managedApiKey(), fetch: usageFetch(store, { context, model, operation }) });
  }
  const resolver = createModelResolver({
    candidates: ["gemini-3.1-flash-lite", "gemini-3.5-flash"],
    probe: async () => { throw new Error("Model discovery requires request context"); },
  });

  async function resolveProvider(context: AIUsageContext) {
    managedApiKey();
    const model = await resolver.resolve(async modelId => {
      // A shared probe is attributed to the request which initiated discovery.
      await generateText({ model: google(context, modelId, "probe")(modelId), prompt: "ping", maxOutputTokens: 1 });
    });
    return { mode: "managed" as const, provider: "google" as const, model };
  }

  async function embedText(text: string, context: AIUsageContext, abortSignal?: AbortSignal): Promise<number[]> {
    const modelId = "gemini-embedding-001";
    // Same embedContent endpoint/model/vector dimension; now uses the shared traced client.
    const result = await embed({
      model: google({ ...context, task: "embedding" }, modelId, "embedding").embeddingModel(modelId),
      value: text, providerOptions: { google: { outputDimensionality: 3072 } }, maxRetries: 0, abortSignal,
    });
    return result.embedding;
  }

  function generateResponse({ provider, system, messages, context, abortSignal }: {
    provider: Awaited<ReturnType<typeof resolveProvider>>;
    system: string;
    messages: ModelMessage[];
    context: AIRequestContext;
    abortSignal?: AbortSignal;
  }) {
    if (context.task !== "generation") throw new Error("Generation requires a generation request context");
    return streamText({
      model: google(context, provider.model, "generation")(provider.model), system, messages, abortSignal,
      onError: () => {
        resolver.invalidate();
        console.error("[ai gateway] Stream failed; model cache invalidated.");
      },
      onFinish: ({ finishReason, text }) => {
        if (!text || finishReason === "content-filter") console.error("[ai gateway] Empty or filtered completion:", finishReason);
      },
    });
  }
  return { resolveProvider, embedText, generateResponse };
}

export const { resolveProvider, embedText, generateResponse } = createAIGateway(databaseUsageStore);
