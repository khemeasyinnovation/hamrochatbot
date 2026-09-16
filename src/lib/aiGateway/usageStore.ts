import type { UsageStore } from "./usageTypes";

// Lazy imports keep the provider adapter testable without a live database.
export const databaseUsageStore: UsageStore = {
  async start(event) {
    const [{ db }, { aiUsage }] = await Promise.all([import("../../db/client"), import("../../db/schema")]);
    await db.insert(aiUsage).values({
      id: event.id, orgId: event.context.orgId, userId: event.context.userId ?? null,
      sessionId: event.context.sessionId ?? null, surface: event.context.surface,
      task: event.context.task, operation: event.operation, model: event.model,
    });
  },
  async finish(id, event) {
    const [{ db }, { aiUsage }, { eq, and }] = await Promise.all([import("../../db/client"), import("../../db/schema"), import("drizzle-orm")]);
    await db.update(aiUsage).set({ ...event, completedAt: new Date() })
      .where(and(eq(aiUsage.id, id), eq(aiUsage.status, "pending")));
  },
};
